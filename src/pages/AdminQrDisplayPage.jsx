import { useEffect, useMemo, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import AdminPanel from '../components/admin/AdminPanel'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { buildAdminQrPresentationRoute } from '../constants/routes'
import { useSessionQrStatus } from '../hooks/useSessionQrStatus'
import { deleteAttendanceSession, endAttendanceSession, getAdminSessions } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/dateTime'

export default function AdminQrDisplayPage() {
  const [sessions, setSessions] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteSuccess, setDeleteSuccess] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const { qrStatus, qrError, secondsRemaining } = useSessionQrStatus(selectedId)

  useEffect(() => {
    const loadSessions = async () => {
      // Load all sessions so admin can choose which QR to display.
      setIsLoading(true)
      setError('')
      setDeleteSuccess('')
      try {
        const data = await getAdminSessions()
        setSessions(data.sessions || [])
        if (data.sessions?.length) {
          // Default selection: first available session.
          setSelectedId(String(data.sessions[0].id))
        }
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Failed to load sessions.'))
      } finally {
        setIsLoading(false)
      }
    }
    loadSessions()
  }, [])

  useEffect(() => {
    if (!selectedId || !qrStatus) {
      return
    }

    // Keep selected session row in sync with latest token/status from polling hook.
    setSessions((prev) =>
      prev.map((session) =>
        String(session.id) === String(selectedId)
          ? {
              ...session,
              qr_token: qrStatus.qr_token,
              qr_refresh_interval_seconds: qrStatus.qr_refresh_interval_seconds,
              lifecycle_status: qrStatus.lifecycle_status,
              can_accept_attendance: qrStatus.can_accept_attendance,
            }
          : session,
      ),
    )
  }, [qrStatus, selectedId])

  const selectedSession = useMemo(
    // Resolve selected session object for rendering details and QR metadata.
    () => sessions.find((session) => String(session.id) === String(selectedId)),
    [sessions, selectedId],
  )
  const currentQrToken = qrStatus?.qr_token || selectedSession?.qr_token || ''
  const qrUrl = currentQrToken
    // Faculty scans this URL; token is embedded in the route.
    ? `${window.location.origin}/faculty/scan/${currentQrToken}`
    : ''
  const separateDisplayUrl = selectedSession
    ? buildAdminQrPresentationRoute(selectedSession.id)
    : ''
  const sessionLifecycleStatus = qrStatus?.lifecycle_status || selectedSession?.lifecycle_status || 'UNKNOWN'
  const canAcceptAttendance =
    qrStatus?.can_accept_attendance ?? selectedSession?.can_accept_attendance ?? false

  const handleDeleteSession = async () => {
    if (!selectedSession) {
      return
    }
    setIsDeleting(true)
    setDeleteError('')
    setDeleteSuccess('')
    try {
      const response = await deleteAttendanceSession(selectedSession.id, deletePassword)
      setSessions((prev) => prev.filter((session) => session.id !== selectedSession.id))
      setDeleteSuccess(
        `${response.session_name} was deleted. ${response.deleted_attendance_records} related attendance record(s) were removed.`,
      )
      const remainingSessions = sessions.filter((session) => session.id !== selectedSession.id)
      setSelectedId(remainingSessions.length > 0 ? String(remainingSessions[0].id) : '')
      setDeletePassword('')
      setIsDeleteModalOpen(false)
    } catch (apiError) {
      setDeleteError(getApiErrorMessage(apiError, 'Failed to delete the session.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEndSession = async () => {
    if (!selectedSession) {
      return
    }
    setIsEnding(true)
    setError('')
    setDeleteSuccess('')
    try {
      const response = await endAttendanceSession(selectedSession.id)
      setSessions((prev) =>
        prev.map((session) =>
          session.id === selectedSession.id
            ? {
                ...session,
                ...response.session,
                lifecycle_status: response.session?.lifecycle_status || 'ENDED',
                can_accept_attendance: false,
              }
            : session,
        ),
      )
      setDeleteSuccess(`${response.session?.name || selectedSession.name} was ended. Attendance is now closed.`)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to end the session.'))
    } finally {
      setIsEnding(false)
    }
  }

  return (
    <>
      <LayoutPageMeta
        title="QR Display"
        subtitle="Select a CIT session and display a full-size QR for faculty scanning."
      />
      <AdminPanel>
        {isLoading ? <DataLoading message="Loading sessions..." /> : null}
        {error ? <DataError message={error} /> : null}
        {qrError ? <DataError message={qrError} /> : null}
        {deleteSuccess ? <p className="data-state loading">{deleteSuccess}</p> : null}
        {!isLoading && !error && sessions.length === 0 ? (
          <DataEmpty message="No sessions available. Create a session first." />
        ) : null}

        {!isLoading && !error && sessions.length > 0 ? (
          <>
            <label className="field-block" htmlFor="session_picker">
              <span className="field-label">Attendance Session</span>
              <select
                id="session_picker"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedSession ? (
              <div className="qr-stage">
                <div className="qr-box">
                  {canAcceptAttendance ? (
                    <QRCodeCanvas
                      // Render QR from the scan URL that includes the current token.
                      value={qrUrl}
                      size={320}
                      level="H"
                      includeMargin
                    />
                  ) : (
                    <p className="subtle-note">Session Ended. Attendance is closed.</p>
                  )}
                </div>
                <div className="qr-meta">
                  <h3>{selectedSession.name}</h3>
                  {selectedSession.department ? <p>Department: {selectedSession.department}</p> : null}
                  <p>Type: {selectedSession.session_type}</p>
                  <p>Status: {sessionLifecycleStatus}</p>
                  <p>Start: {formatDateTime(selectedSession.start_time)}</p>
                  <p>End: {formatDateTime(selectedSession.session_end_time || selectedSession.end_time)}</p>
                  {canAcceptAttendance ? <p>QR Token: {currentQrToken}</p> : null}
                  <p>
                    Refresh Interval:{' '}
                    {qrStatus?.qr_refresh_interval_seconds ??
                      selectedSession.qr_refresh_interval_seconds ??
                      30}
                    s
                  </p>
                  <p>Next Rotation In: {canAcceptAttendance ? `${secondsRemaining}s` : 'Closed'}</p>
                  <div className="qr-meta-actions">
                    {/* Dedicated admin-protected route can be shown on another screen without dashboard controls. */}
                    <a
                      className="ghost-btn link-button"
                      href={separateDisplayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Separate QR Display
                    </a>
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={handleEndSession}
                      disabled={isEnding || !canAcceptAttendance}
                    >
                      {isEnding ? 'Ending...' : 'End Session'}
                    </button>
                    <button
                      className="ghost-btn danger-btn"
                      type="button"
                      onClick={() => {
                        setDeleteError('')
                        setDeletePassword('')
                        setIsDeleteModalOpen(true)
                      }}
                    >
                      Delete Session
                    </button>
                  </div>
                  <p className="subtle-note">
                    Rotating QR codes improve security by limiting reuse of old screenshots.
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </AdminPanel>

      {isDeleteModalOpen ? (
        <div className="confirm-modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete_modal_title">
            <h3 id="delete_modal_title">Confirm Session Deletion</h3>
            <p className="danger-text">This action is permanent.</p>
            <p className="danger-text">
              Deleting this session will also delete all related attendance records.
            </p>
            <label className="field-block" htmlFor="admin_delete_password">
              <span className="field-label">Enter your admin password to continue</span>
              <input
                id="admin_delete_password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Admin password"
                disabled={isDeleting}
              />
            </label>
            {deleteError ? <DataError message={deleteError} /> : null}
            <div className="confirm-modal-actions">
              <button
                className="ghost-btn"
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeletePassword('')
                  setDeleteError('')
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="primary-btn danger-confirm-btn"
                type="button"
                onClick={handleDeleteSession}
                disabled={isDeleting || !deletePassword.trim()}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
