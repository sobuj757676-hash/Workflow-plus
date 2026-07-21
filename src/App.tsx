import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ToastContainer } from '@/components/Toast'

// Auth pages (loaded eagerly - first thing user sees)
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

// Lazy-loaded pages for code splitting
const OfficeDashboardPage = lazy(() => import('@/pages/office/DashboardPage').then(m => ({ default: m.OfficeDashboardPage })))
const WorkersPage = lazy(() => import('@/pages/office/WorkersPage').then(m => ({ default: m.WorkersPage })))
const WorkerFormPage = lazy(() => import('@/pages/office/WorkerFormPage').then(m => ({ default: m.WorkerFormPage })))
const WorkerDetailPage = lazy(() => import('@/pages/office/WorkerDetailPage').then(m => ({ default: m.WorkerDetailPage })))
const WorkerAssignmentPage = lazy(() => import('@/pages/office/WorkerAssignmentPage').then(m => ({ default: m.WorkerAssignmentPage })))
const SupervisorsPage = lazy(() => import('@/pages/office/SupervisorsPage').then(m => ({ default: m.SupervisorsPage })))
const SupervisorFormPage = lazy(() => import('@/pages/office/SupervisorFormPage').then(m => ({ default: m.SupervisorFormPage })))
const TeamPage = lazy(() => import('@/pages/office/TeamPage').then(m => ({ default: m.TeamPage })))
const SitesPage = lazy(() => import('@/pages/office/SitesPage').then(m => ({ default: m.SitesPage })))
const SiteFormPage = lazy(() => import('@/pages/office/SiteFormPage').then(m => ({ default: m.SiteFormPage })))
const OfficeAttendancePage = lazy(() => import('@/pages/office/AttendancePage').then(m => ({ default: m.OfficeAttendancePage })))
const PayrollPage = lazy(() => import('@/pages/office/PayrollPage').then(m => ({ default: m.PayrollPage })))
const PayrollDetailPage = lazy(() => import('@/pages/office/PayrollDetailPage').then(m => ({ default: m.PayrollDetailPage })))
const PayslipManagementPage = lazy(() => import('@/pages/office/PayslipManagementPage').then(m => ({ default: m.PayslipManagementPage })))
const OfficeDocumentsPage = lazy(() => import('@/pages/office/DocumentsPage').then(m => ({ default: m.OfficeDocumentsPage })))
const OfficePPEPage = lazy(() => import('@/pages/office/PPEPage').then(m => ({ default: m.OfficePPEPage })))
const OfficeReportsPage = lazy(() => import('@/pages/office/ReportsPage').then(m => ({ default: m.OfficeReportsPage })))
const AuditLogPage = lazy(() => import('@/pages/office/AuditLogPage').then(m => ({ default: m.AuditLogPage })))
const SettingsPage = lazy(() => import('@/pages/office/SettingsPage').then(m => ({ default: m.SettingsPage })))

const SupervisorDashboardPage = lazy(() => import('@/pages/supervisor/DashboardPage').then(m => ({ default: m.SupervisorDashboardPage })))
const SupervisorAttendancePage = lazy(() => import('@/pages/supervisor/AttendancePage').then(m => ({ default: m.SupervisorAttendancePage })))
const RecordAttendancePage = lazy(() => import('@/pages/supervisor/RecordAttendancePage').then(m => ({ default: m.RecordAttendancePage })))
const SupervisorWorkRecordCardPage = lazy(() => import('@/pages/supervisor/WorkRecordCardPage').then(m => ({ default: m.SupervisorWorkRecordCardPage })))
const OTConsentPage = lazy(() => import('@/pages/supervisor/OTConsentPage').then(m => ({ default: m.OTConsentPage })))
const CorrectionRequestPage = lazy(() => import('@/pages/supervisor/CorrectionRequestPage').then(m => ({ default: m.CorrectionRequestPage })))
const SupervisorPPEPage = lazy(() => import('@/pages/supervisor/PPEPage').then(m => ({ default: m.SupervisorPPEPage })))

const WorkerDashboardPage = lazy(() => import('@/pages/worker/DashboardPage').then(m => ({ default: m.WorkerDashboardPage })))
const WorkerAttendancePage = lazy(() => import('@/pages/worker/AttendancePage').then(m => ({ default: m.WorkerAttendancePage })))
const WorkerPayslipsPage = lazy(() => import('@/pages/worker/PayslipsPage').then(m => ({ default: m.WorkerPayslipsPage })))
const WorkerDocumentsPage = lazy(() => import('@/pages/worker/DocumentsPage').then(m => ({ default: m.WorkerDocumentsPage })))
const WorkerOTConsentsPage = lazy(() => import('@/pages/worker/OTConsentsPage').then(m => ({ default: m.WorkerOTConsentsPage })))
const WorkerPPEPage = lazy(() => import('@/pages/worker/PPEPage').then(m => ({ default: m.WorkerPPEPage })))

const NotificationsPage = lazy(() => import('@/pages/shared/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const TenantsPage = lazy(() => import('@/pages/admin/TenantsPage').then(m => ({ default: m.TenantsPage })))

// Public pages
const VerifyPayslipPage = lazy(() => import('@/pages/public/VerifyPayslipPage').then(m => ({ default: m.VerifyPayslipPage })))

// Loading fallback for lazy routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}

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
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
