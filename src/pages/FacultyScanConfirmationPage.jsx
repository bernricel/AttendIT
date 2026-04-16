import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import MessageBanner from '../components/MessageBanner'
import { ROUTES } from '../constants/routes'
import { getFacultySessionPreview, scanAttendance } from '../services/attendanceApi'
import { getStoredAuth } from '../services/authStorage'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/dateTime'

export default function FacultyScanConfirmationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const { token } = getStoredAuth()

  const qrToken = useMemo(
    // Token may come from route param (/scan/:qrToken) or query string (?token=...).
    () => params.qrToken || searchParams.get('token') || '',
    [params.qrToken, searchParams],
  )

  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // QR links can be opened directly; redirect to login if user is not authenticated.
    if (!token) {
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: { from: `${location.pathname}${location.search}` },
      })
    }
  }, [location.pathname, location.search, navigate, token])

  useEffect(() => {
    const loadSession = async () => {
      if (!token) return
      if (!qrToken) {
        setError('Missing QR token. Please scan a valid QR link.')
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError('')
      setWarning('')
      try {
        // Preview call validates token/session state before final confirmation.
        const data = await getFacultySessionPreview(qrToken)
        setSession(data.session)
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Unable to load session details.'))
      } finally {
        setIsLoading(false)
      }
    }
    loadSession()
  }, [qrToken, token])

  const handleConfirm = async () => {
    if (!qrToken || !session) return
    setIsConfirming(true)
    setError('')
    setWarning('')
    setSuccess('')
    try {
      // Let the backend resolve check-in vs check-out from the active rule windows.
      // This POST is the actual attendance record action for the scanned QR.
      const data = await scanAttendance(qrToken)
      setSuccess(data?.message || 'Attendance recorded successfully.')
    } catch (apiError) {
      const apiMessage = getApiErrorMessage(apiError, 'Unable to process attendance request.')
      const statusCode = apiError?.response?.status

      // Keep duplicate-check prevention behavior, but show a clear user-facing warning.
      if (statusCode === 409) {
        setWarning(
          apiMessage || 'You have already checked in for this session.',
        )
      } else {
        setError(apiMessage)
      }
    } finally {
      setIsConfirming(false)
    }
  }
  // Disable action if backend indicates session is no longer accepting attendance.
  const isSessionClosed = session?.can_accept_attendance === false || session?.lifecycle_status === 'ENDED'
  const checkInWindowLabel = useMemo(() => {
    if (!session) return ''
    if (!session.enable_check_in_window) return 'Anytime while session is active'
    const startLabel = formatDateTime(session.check_in_start_time)
    const endLabel = session.check_in_end_time ? formatDateTime(session.check_in_end_time) : 'No end time'
    return `${startLabel} to ${endLabel}`
  }, [session])
  const checkOutWindowLabel = useMemo(() => {
    if (!session) return ''
    if (!session.enable_check_out_window) return 'Anytime while session is active'
    const startLabel = formatDateTime(session.check_out_start_time)
    const endLabel = session.check_out_end_time ? formatDateTime(session.check_out_end_time) : 'No end time'
    return `${startLabel} to ${endLabel}`
  }, [session])

  return (
    <>
      <LayoutPageMeta
        title="Attendance Confirmation"
        subtitle="Review session details before confirming your attendance."
        actions={
          <Link className="ghost-btn compact link-button" to={ROUTES.FACULTY_HISTORY}>
            View My History
          </Link>
        }
      />
      <section className="faculty-panel">
        {isLoading ? <p className="data-state loading">Loading session details...</p> : null}
        {!isLoading && warning ? <p className="data-state error">{warning}</p> : null}
        {!isLoading && error ? <MessageBanner type="error" message={error} /> : null}
        {!isLoading && success ? <MessageBanner type="info" message={success} /> : null}

        {!isLoading && session ? (
          <div className="scan-confirm-grid">
            <div className="summary-grid">
              <div className="summary-item">
                <span>Session Name</span>
                <strong>{session.name}</strong>
              </div>
              <div className="summary-item">
                <span>Department</span>
                <strong>{session.department || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Scheduled Start</span>
                <strong>{formatDateTime(session.start_time)}</strong>
              </div>
              <div className="summary-item">
                <span>Scheduled End</span>
                <strong>{formatDateTime(session.end_time)}</strong>
              </div>
              <div className="summary-item">
                <span>Check-in Window</span>
                <strong>{checkInWindowLabel}</strong>
              </div>
              <div className="summary-item">
                <span>Check-out Window</span>
                <strong>{checkOutWindowLabel}</strong>
              </div>
              <div className="summary-item">
                <span>Status</span>
                <strong>{session.lifecycle_status || 'UNKNOWN'}</strong>
              </div>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirm}
              disabled={isConfirming || Boolean(success) || isSessionClosed}
            >
              {isSessionClosed
                ? 'Session Closed'
                : isConfirming
                  ? 'Confirming...'
                  : success
                    ? 'Attendance Confirmed'
                    : 'Confirm Attendance'}
            </button>
          </div>
        ) : null}
      </section>
    </>
  )
}
