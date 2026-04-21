import { useEffect, useMemo, useState } from 'react'
import AdminPanel from '../components/admin/AdminPanel'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import {
  getAttendanceByDate,
  getFacultyAttendanceRecords,
  verifyAttendanceSignature,
} from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime, toIsoDate } from '../utils/dateTime'
import common from '../styles/common.module.css'
import styles from './AdminAttendanceLogsPage.module.css'

function buildFacultyName(record) {
  return `${record.user_first_name || ''} ${record.user_last_name || ''}`.trim() || 'Unknown'
}

export default function AdminAttendanceLogsPage() {
  const [selectedDate, setSelectedDate] = useState(toIsoDate())
  const [records, setRecords] = useState([])
  const [verificationMap, setVerificationMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [faculties, setFaculties] = useState([])
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [facultyRecords, setFacultyRecords] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [isFacultyLoading, setIsFacultyLoading] = useState(true)
  const [facultyError, setFacultyError] = useState('')
  const [expandedDailyCardId, setExpandedDailyCardId] = useState(null)
  const [expandedFacultyCardKey, setExpandedFacultyCardKey] = useState('')

  const loadLogs = async (date) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAttendanceByDate(date)
      const fetchedRecords = data.records || []
      setRecords(fetchedRecords)

      // For each record, ask backend to verify DSA signature integrity.
      const verifications = await Promise.all(
        fetchedRecords.map(async (record) => {
          try {
            const result = await verifyAttendanceSignature(record.id)
            // Map backend boolean to UI-friendly status chip text.
            return [record.id, result.is_valid ? 'valid' : 'invalid']
          } catch {
            // Network/server issue while verifying this specific row.
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

  useEffect(() => {
    const loadFacultyOptions = async () => {
      setIsFacultyLoading(true)
      setFacultyError('')
      try {
        const data = await getFacultyAttendanceRecords()
        const options = data.faculties || []
        setFaculties(options)
        if (options.length > 0) {
          setSelectedFacultyId(String(options[0].id))
        }
      } catch (apiError) {
        setFacultyError(getApiErrorMessage(apiError, 'Failed to load faculty members.'))
      } finally {
        setIsFacultyLoading(false)
      }
    }

    loadFacultyOptions()
  }, [])

  useEffect(() => {
    if (!selectedFacultyId) {
      setFacultyRecords([])
      setSelectedFaculty(null)
      return
    }

    const loadFacultyHistory = async () => {
      setIsFacultyLoading(true)
      setFacultyError('')
      try {
        const data = await getFacultyAttendanceRecords(selectedFacultyId)
        setFacultyRecords(data.records || [])
        setSelectedFaculty(data.faculty || null)
      } catch (apiError) {
        setFacultyError(getApiErrorMessage(apiError, 'Failed to load faculty attendance history.'))
        setFacultyRecords([])
        setSelectedFaculty(null)
      } finally {
        setIsFacultyLoading(false)
      }
    }

    loadFacultyHistory()
  }, [selectedFacultyId])

  const hasData = useMemo(() => records.length > 0, [records])
  const hasFacultyData = useMemo(() => facultyRecords.length > 0, [facultyRecords])

  return (
    <>
      <LayoutPageMeta
        title="Attendance Logs"
        subtitle="Daily attendance records with digital signature status."
        actions={
          <label className={`${common.fieldBlock} ${common.logsDatePicker} ${styles.logsDatePicker}`.trim()} htmlFor="logs_date">
            <span className={common.fieldLabel}>Date</span>
            <input
              id="logs_date"
              className={common.inputControl}
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
          <div className={styles.responsiveBlock}>
            <div className={styles.desktopOnly}>
              <div className={common.tableWrap}>
                <table className={common.adminTable}>
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
                          <span className={`${common.chip} ${common[verificationMap[record.id] || 'muted'] || ''}`.trim()}>
                            {verificationMap[record.id] || 'unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.mobileOnly}>
              <div className={styles.mobileCards}>
                {records.map((record) => {
                  const status = verificationMap[record.id] || 'unknown'
                  const isExpanded = expandedDailyCardId === record.id
                  return (
                    <article key={record.id} className={styles.mobileCard}>
                      <button
                        type="button"
                        className={styles.mobileCardToggle}
                        onClick={() => setExpandedDailyCardId(isExpanded ? null : record.id)}
                        aria-expanded={isExpanded}
                      >
                        <p className={styles.cardTitle}>{buildFacultyName(record)}</p>
                        <p className={styles.cardMeta}>
                          {record.session_name} {'\u2022'} {record.attendance_type}
                        </p>
                        <div className={styles.cardSummaryRow}>
                          <span className={styles.cardTime}>{formatDateTime(record.check_time)}</span>
                          <span className={`${common.chip} ${common[status] || ''}`.trim()}>{status}</span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className={styles.cardDetail}>
                          <p>
                            <strong>Faculty Name:</strong> {buildFacultyName(record)}
                          </p>
                          <p>
                            <strong>Session:</strong> {record.session_name}
                          </p>
                          <p>
                            <strong>Attendance Type:</strong> {record.attendance_type}
                          </p>
                          <p>
                            <strong>Time:</strong> {formatDateTime(record.check_time)}
                          </p>
                          <p>
                            <strong>Signature Status:</strong> {status}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </AdminPanel>

      <AdminPanel title="Faculty Attendance Records" subtitle="Select a faculty member to browse attendance history.">
        {isFacultyLoading ? <DataLoading message="Loading faculty records..." /> : null}
        {facultyError ? <DataError message={facultyError} /> : null}

        {!isFacultyLoading && !facultyError && faculties.length === 0 ? (
          <DataEmpty message="No faculty accounts found." />
        ) : null}

        {!isFacultyLoading && !facultyError && faculties.length > 0 ? (
          <>
            <label className={`${common.fieldBlock} ${common.logsDatePicker} ${styles.logsDatePicker}`.trim()} htmlFor="faculty_picker">
              <span className={common.fieldLabel}>Faculty Member</span>
              <select
                id="faculty_picker"
                className={common.inputControl}
                value={selectedFacultyId}
                onChange={(event) => setSelectedFacultyId(event.target.value)}
              >
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.full_name}
                  </option>
                ))}
              </select>
            </label>

            {selectedFaculty ? <p className={common.subtleNote}>Viewing history for {selectedFaculty.full_name}</p> : null}

            {!hasFacultyData ? (
              <DataEmpty message="No attendance records found for this faculty member." />
            ) : (
              <div className={styles.responsiveBlock}>
                <div className={styles.desktopOnly}>
                  <div className={common.tableWrap}>
                    <table className={common.adminTable}>
                      <thead>
                        <tr>
                          <th>Faculty Name</th>
                          <th>Department</th>
                          <th>Session</th>
                          <th>Date</th>
                          <th>Check-in Time</th>
                          <th>Check-out Time</th>
                          <th>Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facultyRecords.map((record) => (
                          <tr key={`${record.session_id}-${record.date}`}>
                            <td>{selectedFaculty?.full_name || 'Unknown'}</td>
                            <td>{record.department || '-'}</td>
                            <td>{record.session_name}</td>
                            <td>{record.date}</td>
                            <td>{formatDateTime(record.check_in_time)}</td>
                            <td>{formatDateTime(record.check_out_time)}</td>
                            <td>{record.attendance_status || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.mobileOnly}>
                  <div className={styles.mobileCards}>
                    {facultyRecords.map((record) => {
                      const cardKey = `${record.session_id}-${record.date}`
                      const isExpanded = expandedFacultyCardKey === cardKey
                      const attendanceType = record.attendance_type || record.attendance_status || '-'
                      const signatureStatus = record.signature_status || 'N/A'
                      return (
                        <article key={cardKey} className={styles.mobileCard}>
                          <button
                            type="button"
                            className={styles.mobileCardToggle}
                            onClick={() => setExpandedFacultyCardKey(isExpanded ? '' : cardKey)}
                            aria-expanded={isExpanded}
                          >
                            <p className={styles.cardTitle}>{selectedFaculty?.full_name || 'Unknown'}</p>
                            <p className={styles.cardMeta}>
                              {record.session_name} {'\u2022'} {attendanceType}
                            </p>
                            <div className={styles.cardSummaryRow}>
                              <span className={styles.cardTime}>
                                {formatDateTime(record.check_in_time)} {'\u2022'} {formatDateTime(record.check_out_time)}
                              </span>
                              <span className={`${common.chip} ${common.muted}`.trim()}>{record.attendance_status || '-'}</span>
                            </div>
                          </button>

                          {isExpanded ? (
                            <div className={styles.cardDetail}>
                              <p>
                                <strong>Faculty Name:</strong> {selectedFaculty?.full_name || 'Unknown'}
                              </p>
                              <p>
                                <strong>Session:</strong> {record.session_name}
                              </p>
                              <p>
                                <strong>Attendance Type:</strong> {attendanceType}
                              </p>
                              <p>
                                <strong>Time:</strong> {formatDateTime(record.check_in_time)} {'\u2022'} {formatDateTime(record.check_out_time)}
                              </p>
                              <p>
                                <strong>Signature Status:</strong> {signatureStatus}
                              </p>
                              <p>
                                <strong>Date:</strong> {record.date}
                              </p>
                              <p>
                                <strong>Department:</strong> {record.department || '-'}
                              </p>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </AdminPanel>
    </>
  )
}
