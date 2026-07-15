import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminPanel from '../components/admin/AdminPanel'
import AdminStatCard from '../components/admin/AdminStatCard'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import { ROUTES } from '../constants/routes'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getAdminSessions, getAttendanceByDate } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime, formatIsoDate, toIsoDate } from '../utils/dateTime'
import styles from './AdminDashboardPage.module.css'
import common from '../styles/common.module.css'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [todayRecords, setTodayRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [sessionData, attendanceData] = await Promise.all([
          getAdminSessions(),
          getAttendanceByDate({ date: toIsoDate() }),
        ])
        setSessions(sessionData.sessions || [])
        setTodayRecords(attendanceData.records || [])
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Failed to load dashboard data.'))
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.lifecycle_status === 'ACTIVE').length,
    [sessions],
  )
  const checkInsToday = useMemo(
    () => todayRecords.filter((record) => record.attendance_type === 'check-in').length,
    [todayRecords],
  )
  const checkOutsToday = useMemo(
    () => todayRecords.filter((record) => record.attendance_type === 'check-out').length,
    [todayRecords],
  )
  const recentSessions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 6),
    [sessions],
  )
  const openQrSession = (session) => {
    navigate(`${ROUTES.ADMIN_QR_DISPLAY}?sessionId=${session.id}`, {
      state: { selectedSession: session },
    })
  }

  return (
    <div className={styles.dashboardContainer}>
      <LayoutPageMeta
        title="Admin Dashboard"
        subtitle="Overview of attendance sessions and activity today."
      />

      {isLoading ? (
        <div className={styles.stateWrapper}>
          <DataLoading message="Loading dashboard data..." />
        </div>
      ) : null}

      {error ? (
        <div className={`${styles.stateWrapper} ${styles.errorText}`}>
          <DataError message={error} />
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          <section className={styles.adminStatsGrid}>
            <AdminStatCard label="TOTAL SESSIONS" value={sessions.length} />
            <AdminStatCard label="ACTIVE SESSIONS" value={activeSessions} tone="yellow" />
            <AdminStatCard label="TODAY'S CHECK-INS" value={checkInsToday} />
            <AdminStatCard label="TODAY'S CHECK-OUTS" value={checkOutsToday} tone="red" />
          </section>

          <div className={common.adminTwoCol}>
            
            <AdminPanel title="Recent Attendance Sessions" subtitle="Latest 6 sessions">
              {recentSessions.length === 0 ? (
                <div className={styles.panelStateWrapper}>
                  <DataEmpty message="No attendance sessions yet." />
                </div>
              ) : (
                <div className={styles.recordsList}>
                  {recentSessions.map((session) => (
                    <article
                      key={session.id}
                      className={`${styles.dashboardItem} ${styles.clickableSessionCard}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openQrSession(session)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openQrSession(session)
                        }
                      }}
                    >
                      <div className={styles.itemInfo}>
                        <h4 className={styles.itemTitle}>
                          {session.name} <span className={styles.sessionDate}>({formatIsoDate(session.start_time)})</span>
                        </h4>
                        <p className={styles.itemSubtitle}>{session.session_type || 'Mixed'}</p>
                      </div>
                      
                      <span
                        className={`${common.chip} ${
                          session.lifecycle_status === 'ACTIVE'
                            ? common.ok
                            : session.lifecycle_status === 'UPCOMING'
                              ? ''
                              : common.muted
                        }`}
                      >
                        {session.lifecycle_status || 'UNKNOWN'}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Recent Attendance Records" subtitle="Latest 6 records for today">
              {todayRecords.length === 0 ? (
                <div className={styles.panelStateWrapper}>
                  <DataEmpty message="No attendance records for today yet." />
                </div>
              ) : (
                <div className={styles.recordsList}>
                  {todayRecords.slice(0, 6).map((record) => (
                    <article key={record.id} className={styles.dashboardItem}>
                      <div className={styles.itemInfo}>
                        <h4 className={styles.itemTitle}>
                          {record.user_first_name} {record.user_last_name}
                        </h4>
                        <p className={styles.itemSubtitle}>{record.session_name}</p>
                      </div>
                      <span className={styles.timestampChip}>
                        {formatDateTime(record.check_time)}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </AdminPanel>

          </div>
        </>
      ) : null}
    </div>
  )
}
