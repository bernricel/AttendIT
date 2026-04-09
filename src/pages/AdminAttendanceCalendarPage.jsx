import { useEffect, useMemo, useState } from 'react'
import AdminPanel from '../components/admin/AdminPanel'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getAttendanceByDate } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime, monthMatrix, toIsoDate } from '../utils/dateTime'

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AdminAttendanceCalendarPage() {
  const [monthDate, setMonthDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toIsoDate())
  const [dailyCountMap, setDailyCountMap] = useState({})
  const [selectedRecords, setSelectedRecords] = useState([])
  const [isMonthLoading, setIsMonthLoading] = useState(true)
  const [isDayLoading, setIsDayLoading] = useState(true)
  const [error, setError] = useState('')

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const cells = useMemo(() => monthMatrix(year, month), [year, month])

  useEffect(() => {
    const loadMonth = async () => {
      setIsMonthLoading(true)
      setError('')
      try {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const queries = []
        for (let day = 1; day <= daysInMonth; day += 1) {
          const date = new Date(year, month, day)
          const iso = toIsoDate(date)
          queries.push(
            getAttendanceByDate(iso)
              .then((result) => [iso, result.total_records || 0])
              .catch(() => [iso, 0]),
          )
        }
        const monthResults = await Promise.all(queries)
        setDailyCountMap(Object.fromEntries(monthResults))
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Failed to load monthly attendance data.'))
      } finally {
        setIsMonthLoading(false)
      }
    }
    loadMonth()
  }, [month, year])

  useEffect(() => {
    const loadDay = async () => {
      setIsDayLoading(true)
      try {
        const result = await getAttendanceByDate(selectedDate)
        setSelectedRecords(result.records || [])
      } catch {
        setSelectedRecords([])
      } finally {
        setIsDayLoading(false)
      }
    }
    loadDay()
  }, [selectedDate])

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <LayoutPageMeta
        title="Attendance Calendar"
        subtitle="Monthly view of attendance activity. Click any day for records."
        actions={
          <div className="calendar-actions">
            <button
              type="button"
              className="ghost-btn compact"
              onClick={() => setMonthDate(new Date(year, month - 1, 1))}
            >
              Prev
            </button>
            <span className="month-label">{monthLabel}</span>
            <button
              type="button"
              className="ghost-btn compact"
              onClick={() => setMonthDate(new Date(year, month + 1, 1))}
            >
              Next
            </button>
          </div>
        }
      />
      {error ? <DataError message={error} /> : null}
      <div className="admin-two-col calendar-layout">
        <AdminPanel title="Monthly Calendar">
          {isMonthLoading ? (
            <DataLoading message="Loading month view..." />
          ) : (
            <div className="calendar-grid">
              {weekdayLabels.map((label) => (
                <div key={label} className="calendar-cell weekday">
                  {label}
                </div>
              ))}
              {cells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="calendar-cell empty" />
                }
                const iso = toIsoDate(cell)
                const count = dailyCountMap[iso] || 0
                const isSelected = iso === selectedDate
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`calendar-cell day${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedDate(iso)}
                  >
                    <span>{cell.getDate()}</span>
                    {count > 0 ? <small>{count} records</small> : null}
                  </button>
                )
              })}
            </div>
          )}
        </AdminPanel>

        <AdminPanel title={`Records for ${selectedDate}`}>
          {isDayLoading ? <DataLoading message="Loading day records..." /> : null}
          {!isDayLoading && selectedRecords.length === 0 ? (
            <DataEmpty message="No records on this day." />
          ) : null}
          {!isDayLoading && selectedRecords.length > 0 ? (
            <div className="session-list">
              {selectedRecords.map((record) => (
                <article key={record.id} className="session-item">
                  <div>
                    <h3>
                      {record.user_first_name} {record.user_last_name}
                    </h3>
                    <p>
                      {record.session_name} | {record.attendance_type}
                    </p>
                  </div>
                  <div className="chip">{formatDateTime(record.check_time)}</div>
                </article>
              ))}
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </>
  )
}
