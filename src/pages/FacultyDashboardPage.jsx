import { Link } from 'react-router-dom'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { ROUTES } from '../constants/routes'
import { getStoredAuth } from '../services/authStorage'
import { getDisplayName } from '../utils/userName'
import styles from './FacultyDashboardPage.module.css'
import common from '../styles/common.module.css'

export default function FacultyDashboardPage() {
  const { user } = getStoredAuth()

  return (
    <>
      <LayoutPageMeta
        title=""
        subtitle=""
      />
      <section className={styles.facultyWelcomeCard}>
        <div>
          <h2>Welcome, {getDisplayName(user, 'User')}</h2>
          <p>
            Your attendance interactions are secured with role checks and digital signatures.
          </p>
        </div>
      </section>

      <div className={common.facultyTwoCol}>
        <section className={styles.facultyPanel}>
          <h3>Profile Summary</h3>
          <div className={common.summaryGrid}>
            <div className={common.summaryItem}>
              <span>Email</span>
              <strong>{user?.email || '-'}</strong>
            </div>
            <div className={common.summaryItem}>
              <span>School ID</span>
              <strong>{user?.school_id || '-'}</strong>
            </div>
          </div>
        </section>

        <section className={styles.facultyPanel}>
          <h3>Quick Actions</h3>
          <div className={common.quickActionsGrid}>
            <Link className={common.quickActionCard} to={ROUTES.FACULTY_HISTORY}>
              <strong>View Attendance History</strong>
              <span>Check your recorded check-ins and check-outs.</span>
            </Link>
            <Link className={common.quickActionCard} to={ROUTES.FACULTY_SCAN}>
              <strong>Scan QR Code</strong>
              <span>Open the camera scanner and confirm your attendance.</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
