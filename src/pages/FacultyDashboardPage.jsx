import { Link } from 'react-router-dom'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { ROUTES } from '../constants/routes'
import { getStoredAuth } from '../services/authStorage'
import { getDisplayName } from '../utils/userName'

export default function FacultyDashboardPage() {
  const { user } = getStoredAuth()

  return (
    <>
      <LayoutPageMeta
        title="Faculty Dashboard"
        subtitle="Access your attendance actions and personal logs."
      />
      <section className="faculty-welcome-card">
        <h2>Welcome, {getDisplayName(user, 'Faculty')}</h2>
        <p>
          Your attendance interactions are secured with role checks and digital signatures.
        </p>
      </section>

      <div className="faculty-two-col">
        <section className="faculty-panel">
          <h3>Profile Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Email</span>
              <strong>{user?.email || '-'}</strong>
            </div>
            <div className="summary-item">
              <span>School ID</span>
              <strong>{user?.school_id || '-'}</strong>
            </div>
          </div>
        </section>

        <section className="faculty-panel">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <Link className="quick-action-card" to={ROUTES.FACULTY_HISTORY}>
              <strong>View Attendance History</strong>
              <span>Check your recorded check-ins and check-outs.</span>
            </Link>
            <Link className="quick-action-card" to={ROUTES.FACULTY_SCAN}>
              <strong>Open Scan Confirmation</strong>
              <span>Use this page when opening a QR attendance link.</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
