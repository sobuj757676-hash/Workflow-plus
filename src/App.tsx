import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ToastContainer } from '@/components/Toast'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

// Office Staff pages
import { OfficeDashboardPage } from '@/pages/office/DashboardPage'
import { WorkersPage } from '@/pages/office/WorkersPage'
import { WorkerFormPage } from '@/pages/office/WorkerFormPage'
import { WorkerDetailPage } from '@/pages/office/WorkerDetailPage'
import { WorkerAssignmentPage } from '@/pages/office/WorkerAssignmentPage'
import { SupervisorsPage } from '@/pages/office/SupervisorsPage'
import { SupervisorFormPage } from '@/pages/office/SupervisorFormPage'
import { TeamPage } from '@/pages/office/TeamPage'
import { SitesPage } from '@/pages/office/SitesPage'
import { SiteFormPage } from '@/pages/office/SiteFormPage'
import { OfficeAttendancePage } from '@/pages/office/AttendancePage'
import { PayrollPage } from '@/pages/office/PayrollPage'
import { PayrollDetailPage } from '@/pages/office/PayrollDetailPage'
import { PayslipManagementPage } from '@/pages/office/PayslipManagementPage'
import { OfficeDocumentsPage } from '@/pages/office/DocumentsPage'
import { OfficePPEPage } from '@/pages/office/PPEPage'
import { OfficeReportsPage } from '@/pages/office/ReportsPage'
import { AuditLogPage } from '@/pages/office/AuditLogPage'
import { SettingsPage } from '@/pages/office/SettingsPage'

// Supervisor pages
import { SupervisorDashboardPage } from '@/pages/supervisor/DashboardPage'
import { SupervisorAttendancePage } from '@/pages/supervisor/AttendancePage'
import { RecordAttendancePage } from '@/pages/supervisor/RecordAttendancePage'
import { SupervisorWorkRecordCardPage } from '@/pages/supervisor/WorkRecordCardPage'
import { OTConsentPage } from '@/pages/supervisor/OTConsentPage'
import { CorrectionRequestPage } from '@/pages/supervisor/CorrectionRequestPage'
import { SupervisorPPEPage } from '@/pages/supervisor/PPEPage'

// Worker pages
import { WorkerDashboardPage } from '@/pages/worker/DashboardPage'
import { WorkerAttendancePage } from '@/pages/worker/AttendancePage'
import { WorkerPayslipsPage } from '@/pages/worker/PayslipsPage'
import { WorkerDocumentsPage } from '@/pages/worker/DocumentsPage'
import { WorkerOTConsentsPage } from '@/pages/worker/OTConsentsPage'
import { WorkerPPEPage } from '@/pages/worker/PPEPage'

// Shared pages
import { NotificationsPage } from '@/pages/shared/NotificationsPage'

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/DashboardPage'
import { TenantsPage } from '@/pages/admin/TenantsPage'

// Public pages
import { VerifyPayslipPage } from '@/pages/public/VerifyPayslipPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify/:code" element={<VerifyPayslipPage />} />

            {/* Office Staff routes */}
            <Route element={<ProtectedRoute allowedRoles={['office_staff', 'super_admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/office" element={<OfficeDashboardPage />} />
                <Route path="/office/workers" element={<WorkersPage />} />
                <Route path="/office/workers/new" element={<WorkerFormPage />} />
                <Route path="/office/workers/assign" element={<WorkerAssignmentPage />} />
                <Route path="/office/workers/:id" element={<WorkerDetailPage />} />
                <Route path="/office/workers/:id/edit" element={<WorkerFormPage />} />
                <Route path="/office/supervisors" element={<SupervisorsPage />} />
                <Route path="/office/supervisors/new" element={<SupervisorFormPage />} />
                <Route path="/office/supervisors/:id/edit" element={<SupervisorFormPage />} />
                <Route path="/office/team" element={<TeamPage />} />
                <Route path="/office/sites" element={<SitesPage />} />
                <Route path="/office/sites/new" element={<SiteFormPage />} />
                <Route path="/office/sites/:id/edit" element={<SiteFormPage />} />
                <Route path="/office/attendance" element={<OfficeAttendancePage />} />
                <Route path="/office/ot-consents" element={<div className="text-[var(--color-text-muted)]">OT Consents - coming soon</div>} />
                <Route path="/office/payroll" element={<PayrollPage />} />
                <Route path="/office/payroll/:runId" element={<PayrollDetailPage />} />
                <Route path="/office/payslips" element={<PayslipManagementPage />} />
                <Route path="/office/documents" element={<OfficeDocumentsPage />} />
                <Route path="/office/ppe" element={<OfficePPEPage />} />
                <Route path="/office/reports" element={<OfficeReportsPage />} />
                <Route path="/office/audit" element={<AuditLogPage />} />
                <Route path="/office/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Supervisor routes */}
            <Route element={<ProtectedRoute allowedRoles={['supervisor']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/supervisor" element={<SupervisorDashboardPage />} />
                <Route path="/supervisor/attendance" element={<SupervisorAttendancePage />} />
                <Route path="/supervisor/attendance/:workerId" element={<RecordAttendancePage />} />
                <Route path="/supervisor/attendance/card/:workerId" element={<SupervisorWorkRecordCardPage />} />
                <Route path="/supervisor/ot-consents" element={<OTConsentPage />} />
                <Route path="/supervisor/corrections" element={<CorrectionRequestPage />} />
                <Route path="/supervisor/workers" element={<div className="text-[var(--color-text-muted)]">My Workers - coming soon</div>} />
                <Route path="/supervisor/ppe" element={<SupervisorPPEPage />} />
              </Route>
            </Route>

            {/* Worker routes */}
            <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/worker" element={<WorkerDashboardPage />} />
                <Route path="/worker/attendance" element={<WorkerAttendancePage />} />
                <Route path="/worker/payslips" element={<WorkerPayslipsPage />} />
                <Route path="/worker/documents" element={<WorkerDocumentsPage />} />
                <Route path="/worker/ot-consents" element={<WorkerOTConsentsPage />} />
                <Route path="/worker/ppe" element={<WorkerPPEPage />} />
              </Route>
            </Route>

            {/* Super Admin routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/tenants" element={<TenantsPage />} />
              </Route>
            </Route>

            {/* Shared routes (all authenticated roles) */}
            <Route element={<ProtectedRoute allowedRoles={['office_staff', 'super_admin', 'supervisor', 'worker']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
