import { useEffect, useMemo, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import AdminPanel from '../components/admin/AdminPanel'
import { DataEmpty, DataError, DataLoading } from '../components/admin/DataState'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import { buildAdminQrPresentationRoute } from '../constants/routes'
import { useSessionQrStatus } from '../hooks/useSessionQrStatus'
import { getAdminSessions } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/dateTime'

export default function AdminQrDisplayPage() {
  const [sessions, setSessions] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { qrStatus, qrError, secondsRemaining } = useSessionQrStatus(selectedId)

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await getAdminSessions()
        setSessions(data.sessions || [])
        if (data.sessions?.length) {
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
    () => sessions.find((session) => String(session.id) === String(selectedId)),
    [sessions, selectedId],
  )
  const currentQrToken = qrStatus?.qr_token || selectedSession?.qr_token || ''
  const qrUrl = currentQrToken
    ? `${window.location.origin}/faculty/scan/${currentQrToken}`
    : ''
  const separateDisplayUrl = selectedSession
    ? buildAdminQrPresentationRoute(selectedSession.id)
    : ''
  const sessionLifecycleStatus = qrStatus?.lifecycle_status || selectedSession?.lifecycle_status || 'UNKNOWN'
  const canAcceptAttendance =
    qrStatus?.can_accept_attendance ?? selectedSession?.can_accept_attendance ?? false

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
                  <p>End: {formatDateTime(selectedSession.end_time)}</p>
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
    </>
  )
}
