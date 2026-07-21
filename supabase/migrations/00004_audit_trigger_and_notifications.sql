-- ============================================================================
-- Audit Trigger Function + Notification Helper
-- Automatically logs INSERT/UPDATE/DELETE on key tables to audit_logs
-- ============================================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  action_name TEXT;
  actor UUID;
  t_id UUID;
BEGIN
  actor := COALESCE(
    (current_setting('request.jwt.claims', TRUE)::jsonb ->> 'sub')::UUID,
    NULL
  );

  IF (TG_OP = 'DELETE') THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
    action_name := 'delete';
    t_id := OLD.tenant_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    action_name := 'update';
    t_id := NEW.tenant_id;
  ELSIF (TG_OP = 'INSERT') THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
    action_name := 'create';
    t_id := NEW.tenant_id;
  END IF;

  INSERT INTO audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (t_id, actor, action_name, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), old_data, new_data);

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger to key tables
CREATE TRIGGER audit_workers AFTER INSERT OR UPDATE OR DELETE ON workers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON attendance_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_payroll_runs AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_payroll_items AFTER INSERT OR UPDATE ON payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_ot_consents AFTER INSERT OR UPDATE ON ot_consents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_sites AFTER INSERT OR UPDATE OR DELETE ON sites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_worker_assignments AFTER INSERT OR UPDATE ON worker_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_correction_requests AFTER INSERT OR UPDATE ON correction_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_settings AFTER INSERT OR UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================================
-- Notification creation helper (callable from app or other functions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS notifications AS $$
DECLARE
  t_id UUID;
  result_row notifications;
BEGIN
  SELECT tenant_id INTO t_id FROM public.users WHERE id = p_user_id;

  INSERT INTO notifications (tenant_id, user_id, type, title, body, data, channel)
  VALUES (t_id, p_user_id, p_type, p_title, p_body, p_data, 'in_app')
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- Payslip public verification function (no auth required)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_payslip(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  slip RECORD;
  worker_name TEXT;
BEGIN
  SELECT p.*, pi.net_pay, pi.working_days, pr.period_start, pr.period_end
  INTO slip
  FROM payslips p
  JOIN payroll_items pi ON p.payroll_item_id = pi.id
  JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
  WHERE p.verification_code = p_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Payslip not found');
  END IF;

  SELECT full_name INTO worker_name FROM workers WHERE id = slip.worker_id;

  RETURN jsonb_build_object(
    'valid', true,
    'status', slip.status,
    'employee_name', worker_name,
    'period_start', slip.period_start,
    'period_end', slip.period_end,
    'net_pay_masked', CASE
      WHEN slip.status = 'issued' THEN concat('$***', substring(slip.net_pay::text from '\..*'))
      ELSE NULL
    END,
    'issued_at', slip.issued_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow anonymous (public) access for payslip verification
GRANT EXECUTE ON FUNCTION public.verify_payslip(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_payslip(TEXT) TO authenticated;

-- ============================================================================
-- Insert policy for audit_logs (allow system to insert)
-- ============================================================================
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);
