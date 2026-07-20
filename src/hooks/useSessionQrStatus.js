import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminSessionQrStatus } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'

function getSecondsUntilExpiry(expiresAt = '') {
  const expiresAtMs = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresAtMs)) return 0
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
}

function formatCountdown(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function useSessionQrStatus(sessionId) {
  const [qrStatus, setQrStatus] = useState(null)
  const [qrError, setQrError] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isRefreshingQr, setIsRefreshingQr] = useState(false)
  const isRefreshingRef = useRef(false)

  const refreshQrStatus = useCallback(async () => {
    // Guard: no session selected, reset QR state.
    if (!sessionId) {
      setQrStatus(null)
      setSecondsRemaining(0)
      setQrError('')
      return null
    }

    if (isRefreshingRef.current) {
      return null
    }
    isRefreshingRef.current = true
    setIsRefreshingQr(true)
    setQrError('')
    try {
      // Pull current token/status from backend QR status endpoint.
      const data = await getAdminSessionQrStatus(sessionId)
      setQrStatus(data)
      setSecondsRemaining(
        data.qr_token_expires_at
          ? getSecondsUntilExpiry(data.qr_token_expires_at)
          : data.seconds_until_rotation ?? 0,
      )
      return data
    } catch (apiError) {
      setQrError(getApiErrorMessage(apiError, 'Failed to refresh QR token status.'))
      return null
    } finally {
      isRefreshingRef.current = false
      setIsRefreshingQr(false)
    }
  }, [sessionId])

  useEffect(() => {
    // Initial load and reload whenever selected session changes.
    refreshQrStatus()
  }, [refreshQrStatus])

  useEffect(() => {
    if (!sessionId || !qrStatus?.qr_token_expires_at || qrStatus?.can_accept_attendance === false) {
      return undefined
    }

    const tick = () => {
      const remainingSeconds = getSecondsUntilExpiry(qrStatus.qr_token_expires_at)
      setSecondsRemaining((prev) => (prev === remainingSeconds ? prev : remainingSeconds))

      if (remainingSeconds <= 0 && !isRefreshingRef.current) {
        // Auto-refresh when countdown reaches zero to fetch the rotated token.
        refreshQrStatus()
      }
    }

    tick()
    // Keep both the dashboard and dedicated QR screen synchronized with token rotations.
    const timerId = window.setInterval(tick, 1000)

    return () => window.clearInterval(timerId)
  }, [qrStatus?.can_accept_attendance, qrStatus?.qr_token_expires_at, refreshQrStatus, sessionId])

  return {
    qrStatus,
    qrError,
    secondsRemaining,
    countdownLabel: formatCountdown(secondsRemaining),
    isRefreshingQr,
    refreshQrStatus,
  }
}
