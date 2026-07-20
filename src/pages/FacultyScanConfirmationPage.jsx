import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import jsQR from "jsqr"
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
  FiCamera,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiExternalLink,
  FiInfo,
  FiMapPin,
  FiRefreshCw,
  FiUpload,
} from "react-icons/fi"

import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import { ROUTES } from "../constants/routes"
import { getFacultySessionPreview, scanAttendance } from "../services/attendanceApi"
import { getStoredAuth } from "../services/authStorage"
import common from "../styles/common.module.css"
import { getApiErrorMessage } from "../utils/apiError"
import { formatDateTime, formatIsoDate } from "../utils/dateTime"
import { buildSyncInScanUrl } from "../utils/qr"
import styles from "./FacultyScanConfirmationPage.module.css"

const CAMERA_FAILURE_MESSAGE =
  "Camera could not start. You can still continue by pasting the QR link/token or uploading a QR screenshot."
const CAMERA_SECURE_CONTEXT_MESSAGE =
  "Camera access requires HTTPS. Please open Sync In using the secure site link."

function isCameraSecureContext() {
  if (typeof window === "undefined") return false
  const { hostname, protocol } = window.location
  const isLocalDevelopmentHost = hostname === "localhost" || hostname === "127.0.0.1"
  return window.isSecureContext && (protocol === "https:" || isLocalDevelopmentHost)
}

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

function getNestedValue(source, path) {
  return path.reduce((value, key) => {
    if (value === undefined || value === null) return undefined
    return value[key]
  }, source)
}

function getCandidateSectionId(value) {
  if (value === undefined || value === null || value === "") return ""
  if (typeof value === "object") {
    return getCandidateSectionId(value.id ?? value.section_id ?? value.sectionId)
  }
  return String(value)
}

function getPreviousSectionId(session) {
  const sources = [session, session?.preview].filter(Boolean)
  const candidatePaths = [
    ["checked_in_section_id"],
    ["check_in_section_id"],
    ["previous_section_id"],
    ["current_section_id"],
    ["existing_section_id"],
    ["selected_section_id"],
    ["section_id"],
    ["checked_in_section"],
    ["check_in_section"],
    ["previous_section"],
    ["current_section"],
    ["existing_section"],
    ["selected_section"],
    ["section"],
    ["current_attendance", "section_id"],
    ["current_attendance", "section"],
    ["attendance", "section_id"],
    ["attendance", "section"],
    ["attendance_record", "section_id"],
    ["attendance_record", "section"],
    ["user_attendance", "section_id"],
    ["user_attendance", "section"],
    ["my_attendance", "section_id"],
    ["my_attendance", "section"],
    ["record", "section_id"],
    ["record", "section"],
  ]

  for (const source of sources) {
    for (const path of candidatePaths) {
      const sectionId = getCandidateSectionId(getNestedValue(source, path))
      if (sectionId) return sectionId
    }
  }

  return ""
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
  const frameRef = useRef(0)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const scannerActiveRef = useRef(false)

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
  const [isScannerStarting, setIsScannerStarting] = useState(false)
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isImageDecoding, setIsImageDecoding] = useState(false)

  const sectionOptions = useMemo(
    () => getSectionOptions(session, user),
    [session, user],
  )
  const isStudent = user?.role === "student"
  const previousSectionId = useMemo(() => getPreviousSectionId(session), [session])
  const isCheckOutAction = session?.next_valid_action === "check-out"
  const isSectionRequiredForAction =
    isStudent &&
    (sectionOptions.length > 0 || session?.requires_section) &&
    Boolean(session?.next_valid_action)
  const resolvedSectionId =
    isCheckOutAction && previousSectionId ? previousSectionId : selectedSectionId
  const requiresSectionSelection =
    isSectionRequiredForAction && !resolvedSectionId
  const showSectionPicker =
    isSectionRequiredForAction &&
    (!isCheckOutAction || !previousSectionId)
  const selectedSectionLabel = useMemo(() => {
    const sectionId = resolvedSectionId
    return sectionOptions.find((option) => option.value === sectionId)?.label || ""
  }, [resolvedSectionId, sectionOptions])
  const normalizedManualToken = extractQrToken(manualQrValue)
  const manualOpenUrl = buildSyncInScanUrl({ qrToken: normalizedManualToken })

  const stopScanner = useCallback(() => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    scannerActiveRef.current = false
    setIsScannerActive(false)
  }, [])

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
        setSession({ ...(data.session || data), preview: data })
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

  useEffect(() => () => stopScanner(), [stopScanner])

  useEffect(() => {
    if (qrToken) {
      stopScanner()
    }
  }, [qrToken, stopScanner])

  useEffect(() => {
    if (isCheckOutAction && previousSectionId) {
      setSelectedSectionId(previousSectionId)
    } else if (sectionOptions.length === 1) {
      setSelectedSectionId(sectionOptions[0].value)
    }
  }, [isCheckOutAction, previousSectionId, sectionOptions])

  const scanVideoFrame = () => {
    const video = videoRef.current
    if (!video || !canvasRef.current || !scannerActiveRef.current) return

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && video.videoWidth && video.videoHeight) {
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext("2d", { willReadFrequently: true })
      if (!context) return
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      const tokenValue = extractQrToken(code?.data)
      if (tokenValue) {
        stopScanner()
        navigate(`${ROUTES.FACULTY_SCAN}/${tokenValue}`, { replace: true })
        return
      }
    }

    frameRef.current = window.requestAnimationFrame(scanVideoFrame)
  }

  const startScanner = async () => {
    if (!token || qrToken || isScannerStarting || isScannerActive) return
    setIsScannerStarting(true)
    setScannerError("")
    stopScanner()
    if (!isCameraSecureContext()) {
      setScannerError(CAMERA_SECURE_CONTEXT_MESSAGE)
      setIsScannerStarting(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError(CAMERA_FAILURE_MESSAGE)
      setIsScannerStarting(false)
      return
    }

    const attempts = [
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: true, audio: false },
    ]

    let stream = null
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        break
      } catch {
        stream = null
      }
    }

    if (!stream) {
      setScannerError(CAMERA_FAILURE_MESSAGE)
      setIsScannerStarting(false)
      return
    }

    streamRef.current = stream
    try {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        videoRef.current.muted = true
        await videoRef.current.play()
      }
      scannerActiveRef.current = true
      setIsScannerActive(true)
      frameRef.current = window.requestAnimationFrame(scanVideoFrame)
    } catch {
      stopScanner()
      setScannerError(CAMERA_FAILURE_MESSAGE)
    } finally {
      setIsScannerStarting(false)
    }
  }

  const handleConfirm = async () => {
    if (!qrToken || !session?.next_valid_action) return
    if (requiresSectionSelection && !resolvedSectionId) {
      setError(
        isCheckOutAction
          ? "Select your section before checking out."
          : "Select your section before checking in.",
      )
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
        isSectionRequiredForAction ? resolvedSectionId : "",
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

  const decodeUploadedQrImage = async (file) => {
    const objectUrl = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.decoding = "async"
      const loadedImage = await new Promise((resolve, reject) => {
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = objectUrl
      })
      const canvas = canvasRef.current || document.createElement("canvas")
      canvas.width = loadedImage.naturalWidth
      canvas.height = loadedImage.naturalHeight
      const context = canvas.getContext("2d", { willReadFrequently: true })
      if (!context) return ""
      context.drawImage(loadedImage, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      return extractQrToken(code?.data)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  const handleQrImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImageDecoding(true)
    setScannerError("")
    try {
      const tokenValue = await decodeUploadedQrImage(file)
      if (!tokenValue) {
        setScannerError("Could not read a QR code from that image. Try another screenshot or paste the QR link/token.")
        return
      }
      stopScanner()
      navigate(`${ROUTES.FACULTY_SCAN}/${tokenValue}`, { replace: true })
    } catch {
      setScannerError("Could not read a QR code from that image. Try another screenshot or paste the QR link/token.")
    } finally {
      setIsImageDecoding(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
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
    (requiresSectionSelection && !resolvedSectionId)
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
  const sectionRequirementHelper =
    isSectionRequiredForAction && !resolvedSectionId
      ? isCheckOutAction
        ? "Select your section before checking out."
        : "Select your section before checking in."
      : ""
  const actionHelperText =
    session?.next_valid_action === "check-out"
      ? "Use this before leaving."
      : "Use this when you arrive."

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
            <button
              type="button"
              className={`${common.primaryBtn} ${styles.scanAgainButton}`.trim()}
              onClick={startScanner}
              disabled={isScannerStarting || isScannerActive}
            >
              <FiCamera aria-hidden="true" />
              {isScannerStarting ? "Starting Camera..." : isScannerActive ? "Camera Started" : "Start Camera"}
            </button>
            <div className={styles.scannerFrame}>
              <video ref={videoRef} muted playsInline autoPlay aria-label="QR scanner camera preview" />
              {!isScannerActive ? <span>Camera preview appears here</span> : null}
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
            <div className={styles.fallbackActions}>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                id="qr_image_upload"
                type="file"
                accept="image/*"
                onChange={handleQrImageUpload}
              />
              <button
                type="button"
                className={`${common.ghostBtn} ${styles.fallbackButton}`.trim()}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImageDecoding}
              >
                <FiUpload aria-hidden="true" />
                {isImageDecoding ? "Reading Image..." : "Upload QR Screenshot"}
              </button>
              {manualOpenUrl ? (
                <a
                  className={`${common.ghostBtn} ${common.linkButton} ${styles.fallbackButton}`.trim()}
                  href={manualOpenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FiExternalLink aria-hidden="true" />
                  Open in Sync In App
                </a>
              ) : null}
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />
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
                  {showSectionPicker ? (
                    <label className={styles.selectField} htmlFor="section_id">
                      <span>Select your section</span>
                      <select
                        id="section_id"
                        value={selectedSectionId}
                        onChange={(event) => setSelectedSectionId(event.target.value)}
                        disabled={isConfirming || isSessionClosed || !sectionOptions.length}
                      >
                        <option value="">
                          {sectionOptions.length ? "Choose your section" : "No sections available"}
                        </option>
                        {sectionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {sectionRequirementHelper ? <small>{sectionRequirementHelper}</small> : null}
                    </label>
                  ) : isSectionRequiredForAction && previousSectionId ? (
                    <div className={`${styles.selectField} ${styles.reusedSectionNotice}`.trim()}>
                      <span>Section</span>
                      <strong>Section: {selectedSectionLabel || `Section ${previousSectionId}`}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <p className={styles.actionHelper}>{actionHelperText}</p>
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
