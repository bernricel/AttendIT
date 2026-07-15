import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

import AdminPanel from "../components/admin/AdminPanel";
import SessionBrowser from "../components/admin/SessionBrowser";
import { DataError } from "../components/admin/DataState";
import LayoutPageMeta from "../components/layout/LayoutPageMeta";
import { ROUTES, buildAdminQrPresentationRoute } from "../constants/routes";
import { useSessionQrStatus } from "../hooks/useSessionQrStatus";
import {
  deleteAttendanceSession,
  endAttendanceSession,
  lookupManualAttendanceUser,
  recordManualAttendance,
} from "../services/attendanceApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/dateTime";
import styles from "./AdminQrDisplayPage.module.css";
import common from "../styles/common.module.css";

const MANUAL_ACTION_LABELS = {
  "check-in": "Check In",
  "check-out": "Check Out",
};

function buildManualUser(data, fallbackUser = null) {
  const hasCheckedIn = Boolean(data.has_checked_in);
  const hasCheckedOut = Boolean(data.has_checked_out);
  const attendanceCompleted = Boolean(data.attendance_completed || (hasCheckedIn && hasCheckedOut));
  const nextAction = data.next_action || data.next_valid_action || "";
  return {
    ...(data.user || fallbackUser || {}),
    next_action: nextAction,
    next_valid_action: data.next_valid_action || nextAction,
    attendance_completed: attendanceCompleted,
    has_checked_in: hasCheckedIn,
    has_checked_out: hasCheckedOut,
    action_message: data.action_message || data.message || "",
  };
}

function getManualActionLabel(user) {
  if (!user) return "";
  if (user.attendance_completed) return "Completed";
  return MANUAL_ACTION_LABELS[user.next_action] || "Unavailable";
}

function getManualActionClass(user) {
  if (!user) return "";
  if (user.attendance_completed) return styles.completedAction;
  if (user.next_action === "check-out") return styles.checkOutAction;
  if (user.next_action === "check-in") return styles.checkInAction;
  return "";
}

export default function AdminQrDisplayPage() {
  const location = useLocation();
  const isQrDisplayRoute = location.pathname === ROUTES.ADMIN_QR_DISPLAY;
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [sessionSearchInput, setSessionSearchInput] = useState("");
  const [sessionDateFilter, setSessionDateFilter] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [error, setError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSchoolId, setManualSchoolId] = useState("");
  const [manualUser, setManualUser] = useState(null);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [isManualLoading, setIsManualLoading] = useState(false);
  const { qrStatus, qrError, secondsRemaining } = useSessionQrStatus(isQrDisplayRoute ? selectedId : "");
  const openSession = (session) => {
    setSelectedSession(session);
    setSelectedId(String(session.id));
  };

  useEffect(() => {
    if (!isQrDisplayRoute) {
      setSelectedSession(null);
      setSelectedId("");
      setIsDeleteModalOpen(false);
      setIsManualModalOpen(false);
    }

    return () => {
      setSelectedSession(null);
      setSelectedId("");
      setIsDeleteModalOpen(false);
      setIsManualModalOpen(false);
    };
  }, [isQrDisplayRoute]);

  useEffect(() => {
    const routedSession = location.state?.selectedSession;
    if (!isQrDisplayRoute || !routedSession || selectedId === String(routedSession.id)) {
      return;
    }
    openSession(routedSession);
  }, [isQrDisplayRoute, location.state, selectedId]);

  useEffect(() => {
    if (!isQrDisplayRoute || !selectedId || !qrStatus) {
      return;
    }

    setSelectedSession((prev) =>
      prev
        ? {
            ...prev,
            qr_token: qrStatus.qr_token,
            qr_url: qrStatus.qr_url,
            qr_refresh_interval_seconds: qrStatus.qr_refresh_interval_seconds,
            lifecycle_status: qrStatus.lifecycle_status,
            can_accept_attendance: qrStatus.can_accept_attendance,
          }
        : prev,
    );
  }, [isQrDisplayRoute, qrStatus, selectedId]);

  const currentQrToken = qrStatus?.qr_token || selectedSession?.qr_token || "";
  const qrUrl = qrStatus?.qr_url || selectedSession?.qr_url || "";
  const separateDisplayUrl = selectedSession ? buildAdminQrPresentationRoute(selectedSession.id) : "";
  const sessionLifecycleStatus = qrStatus?.lifecycle_status || selectedSession?.lifecycle_status || "UNKNOWN";
  const canAcceptAttendance =
    qrStatus?.can_accept_attendance ?? selectedSession?.can_accept_attendance ?? false;

  const handleDeleteSession = async () => {
    if (!selectedSession) {
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");
    try {
      const response = await deleteAttendanceSession(selectedSession.id, deletePassword);
      setDeleteSuccess(
        `${response.session_name} was deleted. ${response.deleted_attendance_records} related attendance record(s) were removed.`,
      );
      setSelectedSession(null);
      setSelectedId("");
      setDeletePassword("");
      setIsDeleteModalOpen(false);
    } catch (apiError) {
      setDeleteError(getApiErrorMessage(apiError, "Failed to delete the session."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEndSession = async () => {
    if (!selectedSession) {
      return;
    }
    setIsEnding(true);
    setError("");
    setDeleteSuccess("");
    try {
      const response = await endAttendanceSession(selectedSession.id);
      setSelectedSession((prev) =>
        prev
          ? {
              ...prev,
              ...response.session,
              lifecycle_status: response.session?.lifecycle_status || "ENDED",
              can_accept_attendance: false,
            }
          : prev,
      );
      setDeleteSuccess(`${response.session?.name || selectedSession.name} was ended. Attendance is now closed.`);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to end the session."));
    } finally {
      setIsEnding(false);
    }
  };

  const resetManualModal = () => {
    setManualSchoolId("");
    setManualUser(null);
    setManualError("");
    setManualSuccess("");
  };

  const handleManualLookup = async (event) => {
    event.preventDefault();
    if (!selectedSession || !manualSchoolId.trim()) return;
    setIsManualLoading(true);
    setManualError("");
    setManualSuccess("");
    setManualUser(null);
    try {
      const data = await lookupManualAttendanceUser(selectedSession.id, manualSchoolId.trim());
      setManualUser(buildManualUser(data));
    } catch (apiError) {
      setManualError(getApiErrorMessage(apiError, "School ID was not found."));
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleManualRecord = async () => {
    if (!selectedSession || !manualUser) return;
    setIsManualLoading(true);
    setManualError("");
    setManualSuccess("");
    try {
      const data = await recordManualAttendance(selectedSession.id, {
        school_id: manualUser.school_id,
      });
      setManualSuccess(data.message || "Manual attendance recorded successfully.");
      setManualUser(buildManualUser(data, manualUser));
    } catch (apiError) {
      setManualError(getApiErrorMessage(apiError, "Failed to record manual attendance."));
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <>
      <LayoutPageMeta
        title="QR Display"
        subtitle="Select a session and display a full-size QR for faculty scanning."
      />
      <AdminPanel>
        {error ? <DataError message={error} /> : null}
        {qrError ? <DataError message={qrError} /> : null}
        {deleteSuccess ? <p className={`${common.dataState} ${common.loading}`.trim()}>{deleteSuccess}</p> : null}

        {!selectedSession ? (
          <div className={`${styles.browserWrapper} clean-session-browser-root`.trim()}>
            <SessionBrowser
              title="Session Browser"
              subtitle="Search sessions, filter by date, and open one session to display its live QR code."
              searchInput={sessionSearchInput}
              onSearchInputChange={(value) => {
                setSessionSearchInput(value);
                setSessionPage(1);
              }}
              dateFilter={sessionDateFilter}
              onDateFilterChange={(value) => {
                setSessionDateFilter(value);
                setSessionPage(1);
              }}
              page={sessionPage}
              onPageChange={setSessionPage}
              onSessionSelect={openSession}
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`${common.ghostBtn} ${common.compact}`.trim()}
              onClick={() => {
                setSelectedSession(null);
                setSelectedId("");
              }}
              style={{ marginBottom: "16px", fontWeight: 600, color: "#1e293b" }}
            >
              Back to Session Browser
            </button>

            <div className={styles.qrStage}>
              <div className={styles.qrBox}>
                {canAcceptAttendance && qrUrl ? (
                  <QRCodeCanvas value={qrUrl} size={320} level="H" includeMargin />
                ) : (
                  <div className={styles.endedNotice}>
                    <strong>QR is not accessible</strong>
                    <span>
                      This session has already ended, so attendance scanning is closed.
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.qrMeta}>
                <h3>{selectedSession.name}</h3>
                {selectedSession.department ? <p><strong>Department:</strong> {selectedSession.department}</p> : null}
                <p><strong>Type:</strong> {selectedSession.session_type}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: canAcceptAttendance ? "#ecfdf5" : "#fef2f2",
                    color: canAcceptAttendance ? "#047857" : "#b91c1c"
                  }}>
                    {sessionLifecycleStatus}
                  </span>
                </p>
                <p><strong>Start:</strong> {formatDateTime(selectedSession.start_time)}</p>
                <p><strong>End:</strong> {formatDateTime(selectedSession.session_end_time || selectedSession.end_time)}</p>
                {canAcceptAttendance ? <p><strong>QR Token:</strong> <code>{currentQrToken}</code></p> : null}
                <p>
                  <strong>Refresh Interval:</strong> {qrStatus?.qr_refresh_interval_seconds ?? selectedSession.qr_refresh_interval_seconds ?? 30}s
                </p>
                <p style={{ color: canAcceptAttendance ? "#0284c7" : "#64748b", fontWeight: 600 }}>
                  Next Rotation In: {canAcceptAttendance ? `${secondsRemaining}s` : "Closed"}
                </p>
                <div className={styles.qrMetaActions}>
                  <a
                    className={`${common.ghostBtn} ${common.linkButton} ${styles.qrMetaActionBtn}`.trim()}
                    href={separateDisplayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Separate QR Display
                  </a>
                  <button
                    className={`${common.ghostBtn} ${styles.qrMetaActionBtn}`.trim()}
                    type="button"
                    onClick={() => {
                      resetManualModal();
                      setIsManualModalOpen(true);
                    }}
                    disabled={!canAcceptAttendance}
                  >
                    Manual Attendance
                  </button>
                  <button
                    className={`${common.ghostBtn} ${styles.qrMetaActionBtn}`.trim()}
                    type="button"
                    onClick={handleEndSession}
                    disabled={isEnding || !canAcceptAttendance}
                  >
                    {isEnding ? "Ending..." : "End Session"}
                  </button>
                  <button
                    className={`${common.ghostBtn} ${styles.qrMetaActionBtn} ${styles.dangerBtn}`.trim()}
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setDeletePassword("");
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    Delete Session
                  </button>
                </div>
                <p className={common.subtleNote}>
                  Rotating QR codes improve security by limiting reuse of old screenshots.
                </p>
              </div>
            </div>
          </>
        )}
      </AdminPanel>

      {isDeleteModalOpen ? (
        <div className={styles.confirmModalBackdrop} role="presentation">
          <div className={styles.confirmModal} role="dialog" aria-modal="true" aria-labelledby="delete_modal_title">
            <h3 id="delete_modal_title">Confirm Session Deletion</h3>
            <p className={styles.dangerText}>This action is permanent.</p>
            <p className={styles.dangerText}>
              Deleting this session will also delete all related attendance records.
            </p>
            <label className={common.fieldBlock} htmlFor="admin_delete_password">
              <span className={common.fieldLabel} style={{ color: "#475569", fontWeight: 600 }}>Enter your admin password to continue</span>
              <input
                id="admin_delete_password"
                className={common.inputControl}
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Admin password"
                disabled={isDeleting}
                style={{ marginTop: "6px" }}
              />
            </label>
            {deleteError ? <DataError message={deleteError} /> : null}
            <div className={styles.confirmModalActions}>
              <button
                className={common.ghostBtn}
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={`${common.primaryBtn} ${styles.dangerConfirmBtn}`.trim()}
                type="button"
                onClick={handleDeleteSession}
                disabled={isDeleting || !deletePassword.trim()}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isManualModalOpen ? (
        <div className={styles.confirmModalBackdrop} role="presentation">
          <div className={styles.confirmModal} role="dialog" aria-modal="true" aria-labelledby="manual_modal_title">
            <h3 id="manual_modal_title">Manual Attendance</h3>
            <p className={common.subtleNote}>Enter the user's School ID Number to confirm their identity before recording attendance.</p>
            <form className={styles.manualLookupForm} onSubmit={handleManualLookup}>
              <label className={common.fieldBlock} htmlFor="manual_school_id">
                <span className={common.fieldLabel} style={{ color: "#475569", fontWeight: 700 }}>School ID Number</span>
                <input
                  id="manual_school_id"
                  className={common.inputControl}
                  value={manualSchoolId}
                  onChange={(event) => setManualSchoolId(event.target.value)}
                  placeholder="Enter School ID"
                  disabled={isManualLoading}
                />
              </label>
              <button className={`${common.primaryBtn} ${common.compact}`.trim()} type="submit" disabled={isManualLoading || !manualSchoolId.trim()}>
                {isManualLoading ? "Checking..." : "Find User"}
              </button>
            </form>
            {manualError ? <DataError message={manualError} /> : null}
            {manualSuccess ? <p className={`${common.dataState} ${common.loading}`.trim()}>{manualSuccess}</p> : null}
            {manualUser ? (
              <>
                <div className={styles.manualUserCard}>
                  <span><strong>Full Name:</strong> {manualUser.name}</span>
                  <span><strong>School ID:</strong> {manualUser.school_id}</span>
                  <span><strong>Department:</strong> {manualUser.department || "No department"}</span>
                  {manualUser.program ? <span><strong>Program:</strong> {manualUser.program}</span> : null}
                </div>
                <div className={`${styles.manualActionCard} ${getManualActionClass(manualUser)}`.trim()}>
                  <span>Next Action</span>
                  <strong><i aria-hidden="true" /> {getManualActionLabel(manualUser)}</strong>
                  {manualUser.action_message ? <p>{manualUser.action_message}</p> : null}
                </div>
              </>
            ) : null}
            <div className={styles.confirmModalActions}>
              <button
                className={common.ghostBtn}
                type="button"
                onClick={() => {
                  setIsManualModalOpen(false);
                  resetManualModal();
                }}
                disabled={isManualLoading}
              >
                Cancel
              </button>
              <button
                className={common.primaryBtn}
                type="button"
                onClick={handleManualRecord}
                disabled={isManualLoading || !manualUser || manualUser.attendance_completed || !manualUser.next_action}
              >
                {isManualLoading ? "Recording..." : manualUser?.attendance_completed ? "Attendance Completed" : MANUAL_ACTION_LABELS[manualUser?.next_action] || "Unavailable"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
