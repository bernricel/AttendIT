import { useEffect, useMemo, useState } from 'react'
import AdminPanel from '../components/admin/AdminPanel'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getAttendanceByDate, verifyAttendanceSignature } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime, toIsoDate } from '../utils/dateTime'

function buildFacultyName(record) {
  return `${record.user_first_name || ''} ${record.user_last_name || ''}`.trim() || 'Unknown'
}

export default function AdminAttendanceLogsPage() {
  const [selectedDate, setSelectedDate] = useState(toIsoDate())
  const [records, setRecords] = useState([])
  const [verificationMap, setVerificationMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLogs = async (date) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAttendanceByDate(date)
      const fetchedRecords = data.records || []
      setRecords(fetchedRecords)

      const verifications = await Promise.all(
        fetchedRecords.map(async (record) => {
          try {
            const result = await verifyAttendanceSignature(record.id)
            return [record.id, result.is_valid ? 'valid' : 'invalid']
          } catch {
            return [record.id, 'unknown']
          }
        }),
      )
      setVerificationMap(Object.fromEntries(verifications))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load attendance logs.'))
      setRecords([])
      setVerificationMap({})
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs(selectedDate)
  }, [selectedDate])

  const hasData = useMemo(() => records.length > 0, [records])

  return (
    <>
      <LayoutPageMeta
        title="Attendance Logs"
        subtitle="Daily attendance records with digital signature status."
        actions={
          <label className="field-block logs-date-picker" htmlFor="logs_date">
            <span className="field-label">Date</span>
            <input
              id="logs_date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        }
      />
      <AdminPanel>
        {isLoading ? <DataLoading message="Loading attendance logs..." /> : null}
        {error ? <DataError message={error} /> : null}
        {!isLoading && !error && !hasData ? (
          <DataEmpty message="No attendance logs for this date." />
        ) : null}

        {!isLoading && !error && hasData ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Session</th>
                  <th>Attendance Type</th>
                  <th>Time</th>
                  <th>Signature Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{buildFacultyName(record)}</td>
                    <td>{record.session_name}</td>
                    <td>{record.attendance_type}</td>
                    <td>{formatDateTime(record.check_time)}</td>
                    <td>
                      <span className={`chip ${verificationMap[record.id] || 'muted'}`}>
                        {verificationMap[record.id] || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>
    </>
  )
}
