import { useEffect, useMemo, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useParams } from 'react-router-dom'
import { DataError, DataLoading } from '../components/admin/DataState'
import { useSessionQrStatus } from '../hooks/useSessionQrStatus'
import { getAdminSessions } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import styles from './AdminQrPresentationPage.module.css'

export default function AdminQrPresentationPage() {
  const { sessionId = '' } = useParams()
  const [sessionLookup, setSessionLookup] = useState({
    isLoading: true,
    error: '',
    session: null,
  })
  const { qrStatus, qrError, secondsRemaining } = useSessionQrStatus(sessionId)

  useEffect(() => {
    let isActive = true

    const loadSession = async () => {
      // Load session metadata by ID for this clean full-screen presentation route.
      setSessionLookup({ isLoading: true, error: '', session: null })

      try {
        const data = await getAdminSessions()
        const matchedSession = (data.sessions || []).find(
          (session) => String(session.id) === String(sessionId),
        )

        if (!isActive) {
          return
        }

        if (!matchedSession) {
          setSessionLookup({
            isLoading: false,
            error: 'Session not found or no longer available.',
            session: null,
          })
          return
        }

        setSessionLookup({ isLoading: false, error: '', session: matchedSession })
      } catch (apiError) {
        if (!isActive) {
          return
        }
        setSessionLookup({
          isLoading: false,
          error: getApiErrorMessage(apiError, 'Failed to load session details.'),
          session: null,
        })
      }
    }

    loadSession()

    return () => {
      isActive = false
    }
  }, [sessionId])

  const currentQrToken = qrStatus?.qr_token || sessionLookup.session?.qr_token || ''
  const qrUrl = currentQrToken
    // This QR URL is scanned by faculty devices.
    ? `${window.location.origin}/faculty/scan/${currentQrToken}`
    : ''
  const refreshInterval = useMemo(
    // Prefer live interval from polling endpoint, fallback to session data/default.
    () => qrStatus?.qr_refresh_interval_seconds ?? sessionLookup.session?.qr_refresh_interval_seconds ?? 30,
    [qrStatus?.qr_refresh_interval_seconds, sessionLookup.session?.qr_refresh_interval_seconds],
  )
  const sessionLifecycleStatus = qrStatus?.lifecycle_status || sessionLookup.session?.lifecycle_status || 'UNKNOWN'
  const canAcceptAttendance =
    qrStatus?.can_accept_attendance ?? sessionLookup.session?.can_accept_attendance ?? false

  return (
    <main className={styles.qrDisplayScreen} role="main" aria-label="Attendance QR presentation screen">
      {sessionLookup.isLoading ? (
        <DataLoading message="Loading QR display..." />
      ) : null}
      {sessionLookup.error ? <DataError message={sessionLookup.error} /> : null}
      {qrError ? <DataError message={qrError} /> : null}

      {!sessionLookup.isLoading && !sessionLookup.error && sessionLookup.session ? (
        <section className={styles.qrDisplayCard}>
          <p className={styles.qrDisplayKicker}>Attendance QR</p>
          <h1>{sessionLookup.session.name}</h1>
          {sessionLookup.session.department ? <p className={styles.qrDisplayInstruction}>{sessionLookup.session.department}</p> : null}
          <p className={styles.qrDisplayInstruction}>
            {canAcceptAttendance ? 'Scan this QR to check in.' : 'Session Ended. Attendance is closed.'}
          </p>

          {/* Large QR surface keeps scanning reliable for monitor, kiosk, and projector setups. */}
          {canAcceptAttendance ? (
            <div className={styles.qrDisplayCodeWrap}>
              {/* High-error-correction QR for projector/large-screen readability. */}
              <QRCodeCanvas value={qrUrl} size={380} level="H" includeMargin />
            </div>
          ) : null}

          <div className={styles.qrDisplayMeta}>
            <p>Status: {sessionLifecycleStatus}</p>
            <p>Rotation Interval: {refreshInterval}s</p>
            <p>Next Rotation In: {canAcceptAttendance ? `${secondsRemaining}s` : 'Closed'}</p>
          </div>
        </section>
      ) : null}
    </main>
  )
}
