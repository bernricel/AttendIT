import { useEffect, useMemo, useState } from 'react'
import AdminPanel from '../components/admin/AdminPanel'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { getAttendanceByDate } from '../services/attendanceApi'
import { getAdminDepartments } from '../services/departmentsApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime, monthMatrix, toIsoDate } from '../utils/dateTime'
import styles from './AdminAttendanceCalendarPage.module.css'
import common from '../styles/common.module.css'

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'student', label: 'Student' },
]

function getProgramsForDepartment(departments, departmentId) {
  const department = departments.find((item) => String(item.id) === String(departmentId))
  return Array.isArray(department?.programs) ? department.programs : []
}

function getSectionsForProgram(programs, programId) {
  const program = programs.find((item) => String(item.id) === String(programId))
  return Array.isArray(program?.sections) ? program.sections : []
}

export default function AdminAttendanceCalendarPage() {
  const [monthDate, setMonthDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toIsoDate())
  const [dailyCountMap, setDailyCountMap] = useState({})
  const [selectedRecords, setSelectedRecords] = useState([])
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({
    role: '',
    department_id: '',
    program_id: '',
    section_id: '',
  })
  const [isMonthLoading, setIsMonthLoading] = useState(true)
  const [isDayLoading, setIsDayLoading] = useState(true)
  const [error, setError] = useState('')

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const cells = useMemo(() => monthMatrix(year, month), [year, month])
  const programs = useMemo(
    () => getProgramsForDepartment(departments, filters.department_id),
    [departments, filters.department_id],
  )
  const sections = useMemo(
    () => getSectionsForProgram(programs, filters.program_id),
    [programs, filters.program_id],
  )

  const queryFilters = useMemo(() => {
    const next = {}
    if (filters.role) next.role = filters.role
    if (filters.department_id) next.department_id = filters.department_id
    if (filters.program_id) next.program_id = filters.program_id
    if (filters.section_id) next.section_id = filters.section_id
    return next
  }, [filters])

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await getAdminDepartments({ active_only: 1 })
        setDepartments(data.departments || [])
      } catch {
        setDepartments([])
      }
    }
    loadDepartments()
  }, [])

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
            getAttendanceByDate({ date: iso, ...queryFilters })
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
  }, [month, queryFilters, year])

  useEffect(() => {
    const loadDay = async () => {
      setIsDayLoading(true)
      try {
        const result = await getAttendanceByDate({ date: selectedDate, ...queryFilters })
        setSelectedRecords(result.records || [])
      } catch {
        setSelectedRecords([])
      } finally {
        setIsDayLoading(false)
      }
    }
    loadDay()
  }, [queryFilters, selectedDate])

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
          <div className={common.calendarActions}>
            <button
              type="button"
              className={`${common.ghostBtn} ${common.compact}`.trim()}
              onClick={() => setMonthDate(new Date(year, month - 1, 1))}
            >
              Prev
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button
              type="button"
              className={`${common.ghostBtn} ${common.compact}`.trim()}
              onClick={() => setMonthDate(new Date(year, month + 1, 1))}
            >
              Next
            </button>
          </div>
        }
      />
      {error ? <DataError message={error} /> : null}
      <AdminPanel title="Filters">
        <div className={common.filterGrid}>
          <label className={common.fieldBlock} htmlFor="calendar_role">
            <span className={common.fieldLabel}>Role</span>
            <select
              id="calendar_role"
              className={`${common.inputControl} ${common.selectControl}`.trim()}
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className={common.fieldBlock} htmlFor="calendar_department">
            <span className={common.fieldLabel}>Department</span>
            <select
              id="calendar_department"
              className={`${common.inputControl} ${common.selectControl}`.trim()}
              value={filters.department_id}
              onChange={(event) => setFilters((prev) => ({
                ...prev,
                department_id: event.target.value,
                program_id: '',
                section_id: '',
              }))}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label className={common.fieldBlock} htmlFor="calendar_program">
            <span className={common.fieldLabel}>Program</span>
            <select
              id="calendar_program"
              className={`${common.inputControl} ${common.selectControl}`.trim()}
              value={filters.program_id}
              onChange={(event) => setFilters((prev) => ({
                ...prev,
                program_id: event.target.value,
                section_id: '',
              }))}
              disabled={!filters.department_id}
            >
              <option value="">All programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code ? `${program.code} - ${program.name}` : program.name}
                </option>
              ))}
            </select>
          </label>
          <label className={common.fieldBlock} htmlFor="calendar_section">
            <span className={common.fieldLabel}>Section</span>
            <select
              id="calendar_section"
              className={`${common.inputControl} ${common.selectControl}`.trim()}
              value={filters.section_id}
              onChange={(event) => setFilters((prev) => ({ ...prev, section_id: event.target.value }))}
              disabled={!filters.program_id}
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </label>
        </div>
      </AdminPanel>
      <div className={`${common.adminTwoCol} ${styles.calendarLayout}`.trim()}>
        <AdminPanel title="Monthly Calendar">
          {isMonthLoading ? (
            <DataLoading message="Loading month view..." />
          ) : (
            <div className={styles.calendarGrid}>
              {weekdayLabels.map((label) => (
                <div key={label} className={`${styles.calendarCell} ${styles.weekday}`.trim()}>
                  {label}
                </div>
              ))}
              {cells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className={`${styles.calendarCell} ${styles.empty}`.trim()} />
                }
                const iso = toIsoDate(cell)
                const count = dailyCountMap[iso] || 0
                const isSelected = iso === selectedDate
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`${styles.calendarCell} ${styles.day} ${isSelected ? styles.selected : ''}`.trim()}
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
            <div>
              {selectedRecords.map((record) => (
                <article key={record.id} className={common.sessionItem}>
                  <div>
                    <h3>
                      {record.user_first_name} {record.user_last_name}
                    </h3>
                    <p>
                      {record.session_name} | {record.attendance_type}
                    </p>
                  </div>
                  <div className={common.chip}>{formatDateTime(record.check_time)}</div>
                </article>
              ))}
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </>
  )
}
