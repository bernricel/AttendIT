import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import AdminPanel from "../components/admin/AdminPanel";
import SessionBrowser from "../components/admin/SessionBrowser";
import { DataError } from "../components/admin/DataState";
import LayoutPageMeta from "../components/layout/LayoutPageMeta";
import { buildAdminQrPresentationRoute } from "../constants/routes";
import { useSessionQrStatus } from "../hooks/useSessionQrStatus";
import { deleteAttendanceSession, endAttendanceSession } from "../services/attendanceApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/dateTime";
import styles from "./AdminQrDisplayPage.module.css";
import common from "../styles/common.module.css";

export default function AdminQrDisplayPage() {
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
  const { qrStatus, qrError, secondsRemaining } = useSessionQrStatus(selectedId);

  useEffect(() => {
    if (!selectedSession || !qrStatus) {
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
  }, [qrStatus, selectedSession]);

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
              onSessionSelect={(session) => {
                setSelectedSession(session);
                setSelectedId(String(session.id));
              }}
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
    </>
  );
}
