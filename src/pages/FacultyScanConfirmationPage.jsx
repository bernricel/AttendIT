import { useEffect, useMemo, useRef, useState } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import {
  FiCalendar,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiInfo,
  FiMapPin,
  FiRefreshCw,
} from "react-icons/fi"

import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import { ROUTES } from "../constants/routes"
import { getFacultySessionPreview, scanAttendance } from "../services/attendanceApi"
import { getStoredAuth } from "../services/authStorage"
import common from "../styles/common.module.css"
import { getApiErrorMessage } from "../utils/apiError"
import { formatDateTime, formatIsoDate } from "../utils/dateTime"
import styles from "./FacultyScanConfirmationPage.module.css"

function normalizeOption(option) {
  if (!option || option.id === undefined || option.id === null) {
    return null
  }
  return {
    value: String(option.id),
    label: option.name || option.section_name || `Section ${option.id}`,
  }
}

function getSectionOptions(session, user) {
  const userProgramId = user?.program_id ? String(user.program_id) : ""
  const candidateLists = [
    session?.available_sections,
    session?.sections,
  ]
  const nextOptions = candidateLists
    .flatMap((list) => (Array.isArray(list) ? list : []))
    .filter((section) => {
      if (!userProgramId) return true
      if (section?.program_id === undefined || section?.program_id === null) return true
      return String(section.program_id) === userProgramId
    })
    .map(normalizeOption)
    .filter(Boolean)

  const seen = new Set()
  return nextOptions.filter((option) => {
    if (seen.has(option.value)) {
      return false
    }
    seen.add(option.value)
    return true
  })
}

function getProgramLabel(session, user) {
  return (
    session?.program_name ||
    session?.program?.name ||
    user?.program_name ||
    user?.program?.name ||
    "N/A"
  )
}

function getDepartmentLabel(session, user) {
  return (
    session?.department ||
    session?.department_name ||
    session?.department?.name ||
    user?.department ||
    user?.department_name ||
    user?.department?.name ||
    "N/A"
  )
}

function isQrProblem(apiError) {
  const message = getApiErrorMessage(apiError, "").toLowerCase()
  return (
    [400, 404, 410].includes(apiError?.response?.status) ||
    message.includes("qr") ||
    message.includes("token") ||
    message.includes("session not found") ||
    message.includes("expired") ||
    message.includes("invalid")
  )
}

function extractQrToken(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  try {
    const parsed = new URL(raw)
    const parts = parsed.pathname.split("/").filter(Boolean)
    return parts.at(-1) || ""
  } catch {
    const parts = raw.split("/").filter(Boolean)
    return parts.at(-1) || raw
  }
}

export default function FacultyScanConfirmationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const { token, user } = getStoredAuth()
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const qrToken = useMemo(
    () => params.qrToken || searchParams.get("token") || "",
    [params.qrToken, searchParams],
  )

  const [session, setSession] = useState(null)
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [success, setSuccess] = useState("")
  const [alreadyRecorded, setAlreadyRecorded] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [qrProblem, setQrProblem] = useState(false)
  const [scannerError, setScannerError] = useState("")
  const [manualQrValue, setManualQrValue] = useState("")

  const sectionOptions = useMemo(
    () => getSectionOptions(session, user),
    [session, user],
  )
  const isStudent = user?.role === "student"
  const requiresSectionSelection =
    isStudent &&
    (sectionOptions.length > 0 || session?.requires_section) &&
    session?.next_valid_action === "check-in"

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
        setQrProblem(false)
        setAlreadyRecorded(false)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError("")
      setWarning("")
      setQrProblem(false)
      setAlreadyRecorded(false)
      setSelectedSectionId("")
      try {
        const data = await getFacultySessionPreview(qrToken)
        setSession(data.session)
        setAlreadyRecorded(Boolean(data.already_recorded))
      } catch (apiError) {
        if (isQrProblem(apiError)) {
          setQrProblem(true)
        } else {
          setError(getApiErrorMessage(apiError, "Unable to load session details."))
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadSession()
  }, [qrToken, token])

  useEffect(() => {
    if (!token || qrToken || isLoading) return undefined
    let isCancelled = false
    let frameId = 0

    const stopScanner = () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const startScanner = async () => {
      setScannerError("")
      if (!("BarcodeDetector" in window)) {
        setScannerError("Camera scanning is not supported on this browser. You can paste the QR link below.")
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] })
        const scanFrame = async () => {
          if (isCancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const tokenValue = extractQrToken(codes[0]?.rawValue)
            if (tokenValue) {
              stopScanner()
              navigate(`${ROUTES.FACULTY_SCAN}/${tokenValue}`, { replace: true })
              return
            }
          } catch {
            setScannerError("Unable to read the QR code. Please try again or paste the QR link below.")
          }
          frameId = window.requestAnimationFrame(scanFrame)
        }
        frameId = window.requestAnimationFrame(scanFrame)
      } catch {
        setScannerError("Camera access was blocked. Allow camera access or paste the QR link below.")
      }
    }

    startScanner()
    return () => {
      isCancelled = true
      stopScanner()
    }
  }, [isLoading, navigate, qrToken, token])

  useEffect(() => {
    if (sectionOptions.length === 1) {
      setSelectedSectionId(sectionOptions[0].value)
    }
  }, [sectionOptions])

  const handleConfirm = async () => {
    if (!qrToken || !session?.next_valid_action) return
    if (requiresSectionSelection && !selectedSectionId) {
      setError("Select your section before confirming attendance.")
      return
    }

    setIsConfirming(true)
    setError("")
    setWarning("")
    setSuccess("")
    try {
      await scanAttendance(
        qrToken,
        session.next_valid_action,
        requiresSectionSelection ? selectedSectionId : "",
      )
      const isCheckInAction = session.next_valid_action === "check-in"
      setAlreadyRecorded(true)
      setSuccess(
        isCheckInAction
          ? "Check-in recorded successfully. Please scan again when you are ready to check out."
          : "Check-out recorded successfully. You have already completed attendance for this session.",
      )
    } catch (apiError) {
      const apiMessage = getApiErrorMessage(
        apiError,
        "Unable to process attendance request.",
      )
      const statusCode = apiError?.response?.status

      if (statusCode === 409) {
        setWarning(apiMessage || "You have already checked in for this session.")
      } else if (isQrProblem(apiError)) {
        setQrProblem(true)
      } else {
        setError(apiMessage)
      }
    } finally {
      setIsConfirming(false)
    }
  }

  const handleManualQrSubmit = (event) => {
    event.preventDefault()
    const tokenValue = extractQrToken(manualQrValue)
    if (!tokenValue) {
      setScannerError("Enter a valid QR link or token.")
      return
    }
    navigate(`${ROUTES.FACULTY_SCAN}/${tokenValue}`, { replace: true })
  }

  const isSessionClosed =
    session?.can_accept_attendance === false ||
    session?.lifecycle_status === "ENDED"
  const actionLabel =
    session?.next_valid_action === "check-out" ? "Check Out" : "Check In"
  const hasAction = Boolean(session?.next_valid_action)
  const isActionDisabled =
    isConfirming ||
    Boolean(success) ||
    isSessionClosed ||
    !hasAction ||
    (requiresSectionSelection && !selectedSectionId)
  const confirmButtonText = isSessionClosed
    ? "Session Closed"
    : isConfirming
      ? `${actionLabel}...`
      : success
        ? "Attendance Confirmed"
        : hasAction
          ? actionLabel
          : "Attendance Complete"
  const attendanceStatusLabel = success
    ? "Attendance Confirmed"
    : session?.already_checked_out || alreadyRecorded
      ? "Already Recorded"
      : session?.already_checked_in
        ? "Already Checked In"
        : hasAction
          ? `Ready to ${actionLabel}`
          : "No Action Available"
  const promptText = isSessionClosed
    ? "This session is no longer accepting attendance."
    : success
      ? "Attendance has been recorded."
      : hasAction
        ? `Ready to ${actionLabel.toLowerCase()}?`
        : "No additional attendance action is available."

  const checkInWindowLabel = useMemo(() => {
    if (!session) return ""
    if (!session.enable_check_in_window) return "Anytime while session is active"
    const startLabel = formatDateTime(session.check_in_start_time)
    const endLabel = session.check_in_end_time
      ? formatDateTime(session.check_in_end_time)
      : "No end time"
    return `${startLabel} to ${endLabel}`
  }, [session])

  const checkOutWindowLabel = useMemo(() => {
    if (!session) return ""
    if (!session.enable_check_out_window) return "Anytime while session is active"
    const startLabel = formatDateTime(session.check_out_start_time)
    const endLabel = session.check_out_end_time
      ? formatDateTime(session.check_out_end_time)
      : "No end time"
    return `${startLabel} to ${endLabel}`
  }, [session])

  return (
    <>
      <LayoutPageMeta
        title="Attendance Confirmation"
        subtitle="Review session details before confirming your attendance."
        actions={
          <Link
            className={`${common.ghostBtn} ${common.compact} ${common.linkButton}`.trim()}
            to={ROUTES.FACULTY_HISTORY}
          >
            View My History
          </Link>
        }
      />
      <section className={styles.facultyPanel}>
        {isLoading ? (
          <p className={`${common.dataState} ${common.loading}`.trim()}>
            Loading session details...
          </p>
        ) : null}
        {!isLoading && warning ? (
          <p className={`${common.dataState} ${common.error}`.trim()}>{warning}</p>
        ) : null}
        {!isLoading && error && !qrProblem ? <MessageBanner type="error" message={error} /> : null}
        {!isLoading && session?.action_message ? (
          <MessageBanner type="info" message={session.action_message} />
        ) : null}
        {!isLoading && success ? <MessageBanner type="info" message={success} /> : null}

        {!isLoading && qrProblem ? (
          <div className={styles.expiredState}>
            <div className={styles.expiredIcon}>
              <FiAlertTriangle aria-hidden="true" />
            </div>
            <h2>QR Code Expired</h2>
            <p>
              This QR code is no longer valid. Please scan the latest QR code displayed by the facilitator or administrator to continue.
            </p>
            <button
              type="button"
              className={`${common.primaryBtn} ${styles.scanAgainButton}`.trim()}
              onClick={() => navigate(ROUTES.FACULTY_SCAN, { replace: true })}
            >
              <FiRefreshCw aria-hidden="true" />
              Scan Another QR
            </button>
          </div>
        ) : null}

        {!isLoading && !qrToken && !qrProblem ? (
          <div className={styles.scannerState}>
            <h2>Scan QR Code</h2>
            <p>Point your camera at the attendance QR code displayed by the facilitator.</p>
            <div className={styles.scannerFrame}>
              <video ref={videoRef} muted playsInline aria-label="QR scanner camera preview" />
            </div>
            {scannerError ? <MessageBanner type="error" message={scannerError} /> : null}
            <form className={styles.manualQrForm} onSubmit={handleManualQrSubmit}>
              <label htmlFor="manual_qr_value">Paste QR link or token</label>
              <input
                id="manual_qr_value"
                value={manualQrValue}
                onChange={(event) => setManualQrValue(event.target.value)}
                placeholder="https://.../scan/token"
              />
              <button className={`${common.primaryBtn} ${styles.scanAgainButton}`.trim()} type="submit">
                Continue
              </button>
            </form>
          </div>
        ) : null}

        {!isLoading && session && !qrProblem ? (
          <div className={styles.scanConfirmStack}>
            <div className={styles.confirmPanel}>
              <p className={styles.confirmEyebrow}>Attendance Action</p>
              <div className={styles.actionHeader}>
                <h2>{isSessionClosed ? "Attendance Closed" : actionLabel}</h2>
                <span
                  className={`${styles.statusPill} ${
                    isSessionClosed ? styles.statusClosed : styles.statusOpen
                  }`.trim()}
                >
                  {attendanceStatusLabel}
                </span>
              </div>
              <div className={styles.essentialBlock}>
                <div className={styles.summaryLine}>
                  <FiInfo aria-hidden="true" />
                  <div>
                    <span>Session</span>
                    <strong>{session.name}</strong>
                  </div>
                </div>
                <p className={styles.promptText}>{promptText}</p>
              </div>

              {isStudent ? (
                <div className={styles.studentFields}>
                  {sectionOptions.length ? (
                    <label className={styles.selectField} htmlFor="section_id">
                      <span>Select Section</span>
                      <select
                        id="section_id"
                        value={selectedSectionId}
                        onChange={(event) => setSelectedSectionId(event.target.value)}
                        disabled={isConfirming || isSessionClosed}
                      >
                        <option value="">Choose your section</option>
                        {sectionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                className={`${common.primaryBtn} ${styles.inlineConfirmButton}`.trim()}
                onClick={handleConfirm}
                disabled={isActionDisabled}
              >
                {confirmButtonText}
              </button>
            </div>

            <div className={styles.detailsCard}>
              <button
                type="button"
                className={styles.detailsToggle}
                onClick={() => setIsDetailsOpen((prev) => !prev)}
                aria-expanded={isDetailsOpen}
              >
                <span>Session Details</span>
                <FiChevronDown className={isDetailsOpen ? styles.chevronOpen : ""} aria-hidden="true" />
              </button>
              {isDetailsOpen ? (
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span>Date</span>
                    <p><FiCalendar aria-hidden="true" /> {formatIsoDate(session.start_time)}</p>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Time</span>
                    <p><FiClock aria-hidden="true" /> {formatDateTime(session.start_time)} to {formatDateTime(session.end_time)}</p>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Department</span>
                    <p><FiMapPin aria-hidden="true" /> {getDepartmentLabel(session, user)}</p>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Check-in Window</span>
                    <p className={styles.windowValue}>{checkInWindowLabel}</p>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Check-out Window</span>
                    <p className={styles.windowValue}>{checkOutWindowLabel}</p>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Session Status</span>
                    <p><FiCheckCircle aria-hidden="true" /> {session.lifecycle_status || "UNKNOWN"}</p>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Already Recorded</span>
                    <p>{alreadyRecorded ? "Yes" : "No"}</p>
                  </div>
                  {isStudent ? (
                    <div className={styles.summaryItem}>
                      <span>Program</span>
                      <p>{getProgramLabel(session, user)}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

          </div>
        ) : null}
      </section>
    </>
  )
}
