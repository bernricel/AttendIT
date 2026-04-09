import { Navigate, Route, Routes } from 'react-router-dom'
import {
  RequireAdminRole,
  RequireAuth,
  RequireCompleteProfile,
  RequireFacultyRole,
  RequireIncompleteProfile,
} from './components/RouteGuards'
import AdminAttendanceCalendarPage from './pages/AdminAttendanceCalendarPage'
import AdminAttendanceLogsPage from './pages/AdminAttendanceLogsPage'
import AdminCreateSessionPage from './pages/AdminCreateSessionPage'
import { getDefaultRouteForUser, getStoredAuth } from './services/authStorage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminQrPresentationPage from './pages/AdminQrPresentationPage'
import AdminQrDisplayPage from './pages/AdminQrDisplayPage'
import { ROUTES } from './constants/routes'
import CompleteProfilePage from './pages/CompleteProfilePage'
import FacultyAttendanceHistoryPage from './pages/FacultyAttendanceHistoryPage'
import FacultyDashboardPage from './pages/FacultyDashboardPage'
import FacultyScanConfirmationPage from './pages/FacultyScanConfirmationPage'
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminLayout from './components/admin/AdminLayout'
import FacultyLayout from './components/faculty/FacultyLayout'

function HomeRedirect() {
  const { token, user } = getStoredAuth()
  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (!user?.is_profile_complete) {
    return <Navigate to={ROUTES.COMPLETE_PROFILE} replace />
  }

  return <Navigate to={getDefaultRouteForUser(user)} replace />
}

function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<HomeRedirect />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />
      <Route
        path={ROUTES.COMPLETE_PROFILE}
        element={
          <RequireAuth>
            <RequireIncompleteProfile>
              <CompleteProfilePage />
            </RequireIncompleteProfile>
          </RequireAuth>
        }
      />
      <Route
        path="/faculty"
        element={
          <RequireAuth>
            <RequireCompleteProfile>
              <RequireFacultyRole>
                {/* Shared faculty layout stays mounted while child routes render via Outlet. */}
                <FacultyLayout />
              </RequireFacultyRole>
            </RequireCompleteProfile>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<FacultyDashboardPage />} />
        <Route path="history" element={<FacultyAttendanceHistoryPage />} />
        <Route path="scan" element={<FacultyScanConfirmationPage />} />
        <Route path="scan/:qrToken" element={<FacultyScanConfirmationPage />} />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireCompleteProfile>
              <RequireAdminRole>
                {/* Shared admin layout stays mounted while child routes render via Outlet. */}
                <AdminLayout />
              </RequireAdminRole>
            </RequireCompleteProfile>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="create-session" element={<AdminCreateSessionPage />} />
        <Route path="qr-display" element={<AdminQrDisplayPage />} />
        <Route path="logs" element={<AdminAttendanceLogsPage />} />
        <Route path="calendar" element={<AdminAttendanceCalendarPage />} />
      </Route>
      <Route
        path={ROUTES.ADMIN_QR_PRESENTATION}
        element={
          <RequireAuth>
            <RequireCompleteProfile>
              <RequireAdminRole>
                <AdminQrPresentationPage />
              </RequireAdminRole>
            </RequireCompleteProfile>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  )
}

export default App
