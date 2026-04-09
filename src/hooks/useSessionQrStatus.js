import { useCallback, useEffect, useState } from 'react'
import { getAdminSessionQrStatus } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'

export function useSessionQrStatus(sessionId) {
  const [qrStatus, setQrStatus] = useState(null)
  const [qrError, setQrError] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isRefreshingQr, setIsRefreshingQr] = useState(false)

  const refreshQrStatus = useCallback(async () => {
    if (!sessionId) {
      setQrStatus(null)
      setSecondsRemaining(0)
      setQrError('')
      return null
    }

    setIsRefreshingQr(true)
    setQrError('')
    try {
      const data = await getAdminSessionQrStatus(sessionId)
      setQrStatus(data)
      setSecondsRemaining(data.seconds_until_rotation ?? 0)
      return data
    } catch (apiError) {
      setQrError(getApiErrorMessage(apiError, 'Failed to refresh QR token status.'))
      return null
    } finally {
      setIsRefreshingQr(false)
    }
  }, [sessionId])

  useEffect(() => {
    refreshQrStatus()
  }, [refreshQrStatus])

  useEffect(() => {
    if (!sessionId || !qrStatus?.qr_token_expires_at || qrStatus?.can_accept_attendance === false) {
      return undefined
    }

    // Keep both the dashboard and dedicated QR screen synchronized with token rotations.
    const timerId = window.setInterval(() => {
      const expiresAtMs = new Date(qrStatus.qr_token_expires_at).getTime()
      const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
      setSecondsRemaining(remainingSeconds)

      if (remainingSeconds <= 0 && !isRefreshingQr) {
        refreshQrStatus()
      }
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isRefreshingQr, qrStatus?.qr_token_expires_at, refreshQrStatus, sessionId])

  return {
    qrStatus,
    qrError,
    secondsRemaining,
    isRefreshingQr,
    refreshQrStatus,
  }
}
