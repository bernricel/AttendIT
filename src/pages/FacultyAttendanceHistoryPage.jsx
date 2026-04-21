import { useEffect, useState } from 'react'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getMyAttendanceRecords } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import styles from './FacultyAttendanceHistoryPage.module.css'
import common from '../styles/common.module.css'

export default function FacultyAttendanceHistoryPage() {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await getMyAttendanceRecords()
        setRecords(data.records || [])
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Failed to load attendance history.'))
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()
  }, [])

  return (
    <>
      <LayoutPageMeta
        title="My Attendance History"
        subtitle="Your personal attendance records across sessions."
      />
      <section className={styles.facultyPanel}>
        {isLoading ? <p className={`${common.dataState} ${common.loading}`.trim()}>Loading attendance history...</p> : null}
        {!isLoading && error ? <p className={`${common.dataState} ${common.error}`.trim()}>{error}</p> : null}
        {!isLoading && !error && records.length === 0 ? (
          <p className={`${common.dataState} ${common.empty}`.trim()}>No attendance records found.</p>
        ) : null}

        {!isLoading && !error && records.length > 0 ? (
          <div className={styles.responsiveBlock}>
            <div className={styles.desktopOnly}>
              <div className={common.tableWrap}>
                <table className={common.adminTable}>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Attendance Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const dateTime = new Date(record.check_time)
                      return (
                        <tr key={record.id}>
                          <td>{record.session_name}</td>
                          <td>{dateTime.toLocaleDateString()}</td>
                          <td>{dateTime.toLocaleTimeString()}</td>
                          <td>{record.attendance_type}</td>
                          <td>
                            <span className={`${common.chip} ${common.ok}`.trim()}>{record.status}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.mobileOnly}>
              <div className={styles.mobileCards}>
                {records.map((record) => {
                  const dateTime = new Date(record.check_time)
                  return (
                    <article key={record.id} className={styles.mobileCard}>
                      <p className={styles.cardTitle}>{record.session_name}</p>
                      <p className={styles.cardMeta}>
                        {dateTime.toLocaleDateString()} {'\u2022'} {dateTime.toLocaleTimeString()}
                      </p>
                      <p className={styles.cardLine}>{record.attendance_type}</p>
                      <div>
                        <span className={`${common.chip} ${common.ok}`.trim()}>{record.status}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
