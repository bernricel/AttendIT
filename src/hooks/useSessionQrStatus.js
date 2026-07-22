import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminSessionQrStatus } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'

function getSecondsUntilExpiry(expiresAt = '') {
  const expiresAtMs = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresAtMs)) return 0
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
}

function getFirstNonNegativeNumber(...values) {
  for (const value of values) {
    if (value === '' || value == null) continue
    const number = Number(value)
    if (Number.isFinite(number) && number >= 0) return Math.ceil(number)
  }
  return null
}

function getRotationInterval(status) {
  return getFirstNonNegativeNumber(
    status?.qr_refresh_interval_seconds,
    status?.refresh_interval_seconds,
    status?.rotation_interval_seconds,
  )
}

function getExpiryTimestamp(status) {
  return (
    status?.qr_token_expires_at ||
    status?.qr_expires_at ||
    status?.expires_at ||
    status?.next_rotation_at ||
    ''
  )
}

function getInitialSecondsRemaining(status) {
  const backendRemaining = getFirstNonNegativeNumber(
    status?.seconds_until_rotation,
    status?.seconds_remaining,
    status?.remaining_seconds,
    status?.expires_in,
  )
  if (backendRemaining != null) return backendRemaining

  const expiresAt = getExpiryTimestamp(status)
  if (expiresAt) return getSecondsUntilExpiry(expiresAt)

  return getRotationInterval(status) ?? 0
}

function isSessionClosed(status) {
  if (status?.can_accept_attendance === false || status?.is_active === false) return true
  const lifecycleStatus = String(status?.lifecycle_status || '').trim().toLowerCase()
  return ['ended', 'closed', 'inactive'].includes(lifecycleStatus)
}

function formatCountdown(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  return `${safeSeconds}s`
}

export function useSessionQrStatus(sessionId) {
  const [qrStatus, setQrStatus] = useState(null)
  const [qrError, setQrError] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isRefreshingQr, setIsRefreshingQr] = useState(false)
  const isRefreshingRef = useRef(false)
  const secondsRemainingRef = useRef(0)

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
      const nextSecondsRemaining = isSessionClosed(data) ? 0 : getInitialSecondsRemaining(data)
      secondsRemainingRef.current = nextSecondsRemaining
      setSecondsRemaining(nextSecondsRemaining)
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
    if (!sessionId || !qrStatus || isSessionClosed(qrStatus)) {
      return undefined
    }

    const expiresAt = getExpiryTimestamp(qrStatus)
    const tick = () => {
      const remainingSeconds = expiresAt
        ? getSecondsUntilExpiry(expiresAt)
        : Math.max(0, secondsRemainingRef.current - 1)
      secondsRemainingRef.current = remainingSeconds
      setSecondsRemaining((prev) => (prev === remainingSeconds ? prev : remainingSeconds))

      if (remainingSeconds <= 0 && !isRefreshingRef.current) {
        // Auto-refresh when countdown reaches zero to fetch the rotated token.
        refreshQrStatus()
      }
    }

    // Keep both the dashboard and dedicated QR screen synchronized with token rotations.
    const timerId = window.setInterval(tick, 1000)

    return () => window.clearInterval(timerId)
  }, [qrStatus, refreshQrStatus, sessionId])

  return {
    qrStatus,
    qrError,
    secondsRemaining,
    countdownLabel: formatCountdown(secondsRemaining),
    rotationInterval: getRotationInterval(qrStatus),
    isSessionClosed: isSessionClosed(qrStatus),
    isRefreshingQr,
    refreshQrStatus,
  }
}
