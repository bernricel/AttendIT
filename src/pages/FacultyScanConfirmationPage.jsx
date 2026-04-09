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
    () => params.qrToken || searchParams.get('token') || '',
    [params.qrToken, searchParams],
  )

  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
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
      try {
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
    setSuccess('')
    try {
      // Let the backend resolve check-in vs check-out from the active rule windows.
      const data = await scanAttendance(qrToken)
      setSuccess(data?.message || 'Attendance recorded successfully.')
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to process attendance request.'))
    } finally {
      setIsConfirming(false)
    }
  }
  const isSessionClosed = session?.can_accept_attendance === false || session?.lifecycle_status === 'ENDED'

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
                <strong>
                  {formatDateTime(session.check_in_start_time)} to {formatDateTime(session.check_in_end_time)}
                </strong>
              </div>
              <div className="summary-item">
                <span>Check-out Window</span>
                <strong>
                  {formatDateTime(session.check_out_start_time)} to {formatDateTime(session.check_out_end_time)}
                </strong>
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
