import { useEffect, useState } from 'react'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getMyAttendanceRecords } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'

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
      <section className="faculty-panel">
        {isLoading ? <p className="data-state loading">Loading attendance history...</p> : null}
        {!isLoading && error ? <p className="data-state error">{error}</p> : null}
        {!isLoading && !error && records.length === 0 ? (
          <p className="data-state empty">No attendance records found.</p>
        ) : null}

        {!isLoading && !error && records.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
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
                        <span className="chip ok">{record.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  )
}
