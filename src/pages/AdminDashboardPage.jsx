import { useEffect, useMemo, useState } from 'react'
import AdminPanel from '../components/admin/AdminPanel'
import AdminStatCard from '../components/admin/AdminStatCard'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getAdminSessions, getAttendanceByDate } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime, toIsoDate } from '../utils/dateTime'

export default function AdminDashboardPage() {
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
          getAttendanceByDate(toIsoDate()),
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

  return (
    <>
      <LayoutPageMeta
        title="Admin Dashboard"
        subtitle="Overview of attendance sessions and activity today."
      />
      {isLoading ? <DataLoading message="Loading dashboard..." /> : null}
      {error ? <DataError message={error} /> : null}

      {!isLoading && !error ? (
        <>
          <section className="admin-stats-grid">
            <AdminStatCard label="Total Sessions" value={sessions.length} />
            <AdminStatCard label="Active Sessions" value={activeSessions} tone="yellow" />
            <AdminStatCard label="Today's Check-ins" value={checkInsToday} />
            <AdminStatCard label="Today's Check-outs" value={checkOutsToday} tone="red" />
          </section>

          <div className="admin-two-col">
            <AdminPanel title="Recent Attendance Sessions" subtitle="Latest 6 sessions">
              {sessions.length === 0 ? (
                <DataEmpty message="No attendance sessions yet." />
              ) : (
                <div className="session-list">
                  {sessions.slice(0, 6).map((session) => (
                    <article key={session.id} className="session-item">
                      <div>
                        <h3>{session.name}</h3>
                        <p>{session.session_type}</p>
                      </div>
                      <div
                        className={`chip ${
                          session.lifecycle_status === 'ACTIVE'
                            ? 'ok'
                            : session.lifecycle_status === 'UPCOMING'
                              ? ''
                              : 'muted'
                        }`}
                      >
                        {session.lifecycle_status || 'UNKNOWN'}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Recent Attendance Records" subtitle="Latest 6 records for today">
              {todayRecords.length === 0 ? (
                <DataEmpty message="No attendance records for today yet." />
              ) : (
                <div className="session-list">
                  {todayRecords.slice(0, 6).map((record) => (
                    <article key={record.id} className="session-item">
                      <div>
                        <h3>
                          {record.user_first_name} {record.user_last_name}
                        </h3>
                        <p>{record.session_name}</p>
                      </div>
                      <div className="chip">{formatDateTime(record.check_time)}</div>
                    </article>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>
        </>
      ) : null}
    </>
  )
}
