-- ============================================================================
-- Production User Management: invitations + role management (NO SQL needed after this)
-- Run ONCE in Supabase SQL Editor. Safe to run on an existing database.
--
-- After this:
--   * Office staff "invite" supervisors/office-staff by email (no service_role)
--   * Invited people sign up normally and AUTOMATICALLY get the right role
--   * Office staff change roles / activate-deactivate from the app UI
--   * No more manual SQL role changes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INVITATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('office_staff', 'supervisor', 'worker')),
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- One active invitation per email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_tenant_email ON invitations(tenant_id, email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_office ON invitations;
CREATE POLICY invitations_office ON invitations
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.get_user_role() IN ('office_staff', 'super_admin')
  );

-- ----------------------------------------------------------------------------
-- 2. UPDATED SIGNUP FUNCTION  (invitation-aware)
--    Called by the app right after signup. Assigns role based on:
--      a) a matching pending invitation, else
--      b) office_staff if this is the very first user (bootstrap), else
--      c) worker (default)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setup_new_user(p_full_name TEXT DEFAULT NULL)
RETURNS public.users AS $$
DECLARE
  demo_tenant UUID := '11111111-1111-1111-1111-111111111111';
  caller UUID := auth.uid();
  caller_email TEXT;
  existing_count INT;
  assigned_role TEXT;
  assigned_name TEXT;
  invite RECORD;
  result_row public.users;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Idempotent: return existing profile if present.
  SELECT * INTO result_row FROM public.users WHERE id = caller;
  IF FOUND THEN
    RETURN result_row;
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = caller;

  -- a) Look for a pending invitation for this email.
  SELECT * INTO invite
  FROM invitations
  WHERE tenant_id = demo_tenant
    AND lower(email) = lower(caller_email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    assigned_role := invite.role;
    assigned_name := COALESCE(NULLIF(p_full_name, ''), invite.full_name, split_part(caller_email, '@', 1));
    UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = invite.id;
  ELSE
    -- b) First user bootstrap, else c) default worker.
    SELECT COUNT(*) INTO existing_count FROM public.users WHERE tenant_id = demo_tenant;
    IF existing_count = 0 THEN
      assigned_role := 'office_staff';
    ELSE
      assigned_role := 'worker';
    END IF;
    assigned_name := COALESCE(NULLIF(p_full_name, ''), split_part(caller_email, '@', 1));
  END IF;

  INSERT INTO public.users (id, tenant_id, role, email, full_name, status)
  VALUES (caller, demo_tenant, assigned_role, caller_email, assigned_name, 'active')
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.setup_new_user(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. INVITE A USER  (office staff / super admin only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_invite_user(
  p_email TEXT,
  p_role TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS invitations AS $$
DECLARE
  caller_role TEXT;
  caller_tenant UUID;
  result_row invitations;
BEGIN
  SELECT role, tenant_id INTO caller_role, caller_tenant FROM public.users WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('office_staff', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to invite users';
  END IF;
  IF p_role NOT IN ('office_staff', 'supervisor', 'worker') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  INSERT INTO invitations (tenant_id, email, role, full_name, status, created_by)
  VALUES (caller_tenant, lower(p_email), p_role, p_full_name, 'pending', auth.uid())
  ON CONFLICT (tenant_id, email)
  DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name,
                status = 'pending', created_by = auth.uid(), created_at = NOW()
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_invite_user(TEXT, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. CHANGE A USER'S ROLE  (office staff / super admin only)
--    The existing trigger propagates role into the JWT (app_metadata).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_role(p_target UUID, p_role TEXT)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
  caller_tenant UUID;
  target_tenant UUID;
BEGIN
  SELECT role, tenant_id INTO caller_role, caller_tenant FROM public.users WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('office_staff', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_role NOT IN ('office_staff', 'supervisor', 'worker', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT tenant_id INTO target_tenant FROM public.users WHERE id = p_target;
  IF caller_role <> 'super_admin' AND target_tenant IS DISTINCT FROM caller_tenant THEN
    RAISE EXCEPTION 'Cannot modify a user in another company';
  END IF;

  UPDATE public.users SET role = p_role WHERE id = p_target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. ACTIVATE / DEACTIVATE A USER  (office staff / super admin only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_target UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
  caller_tenant UUID;
  target_tenant UUID;
BEGIN
  SELECT role, tenant_id INTO caller_role, caller_tenant FROM public.users WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('office_staff', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT tenant_id INTO target_tenant FROM public.users WHERE id = p_target;
  IF caller_role <> 'super_admin' AND target_tenant IS DISTINCT FROM caller_tenant THEN
    RAISE EXCEPTION 'Cannot modify a user in another company';
  END IF;

  UPDATE public.users SET status = p_status WHERE id = p_target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_set_user_status(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Let office staff read all users in their tenant (for the Team page)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_office_read ON public.users;
CREATE POLICY users_office_read ON public.users
  FOR SELECT USING (
    tenant_id = public.get_tenant_id()
    AND public.get_user_role() IN ('office_staff', 'super_admin')
  );

-- ============================================================================
-- DONE. No more manual SQL role changes needed — manage everything in the app.
-- ============================================================================
