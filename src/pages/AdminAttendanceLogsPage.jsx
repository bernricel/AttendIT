import { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiFileText, FiSearch } from "react-icons/fi";

import AdminPanel from "../components/admin/AdminPanel";
import {
  DataEmpty,
  DataError,
  DataLoading,
} from "../components/admin/DataState";
import LayoutPageMeta from "../components/layout/LayoutPageMeta";
import {
  exportAdminAttendanceSheetCsv,
  getAdminAttendanceSheet,
  getAdminSessions,
} from "../services/attendanceApi";
import common from "../styles/common.module.css";
import { getApiErrorMessage } from "../utils/apiError";
import { exportAttendanceLogsPdf } from "../utils/attendancePdf";
import { formatDateTime, formatIsoDate } from "../utils/dateTime";
import styles from "./AdminAttendanceLogsPage.module.css";

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "", label: "All attendance statuses" },
  { value: "on_time", label: "On Time" },
  { value: "late", label: "Late" },
  { value: "checked_out", label: "Checked Out" },
  { value: "incomplete", label: "Incomplete" },
];

const SIGNATURE_STATUS_OPTIONS = [
  { value: "", label: "All signature statuses" },
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
];

const SORT_BY_OPTIONS = [
  { value: "time_in", label: "Time In" },
  { value: "time_out", label: "Time Out" },
  { value: "attendance_status", label: "Attendance Status" },
  { value: "signature_status", label: "Signature Status" },
  { value: "session", label: "Session" },
];

function normalizeFilename(contentDisposition) {
  const match = /filename="?([^\"]+)"?/i.exec(contentDisposition || "");
  return match ? match[1] : "attendance_sheet.csv";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatLongDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getSessionStatus(session) {
  if (session?.lifecycle_status) return session.lifecycle_status;
  return session?.is_active ? "Active" : "Ended";
}

function matchesSession(session, searchTerm, dateFilter) {
  const sessionName = String(session?.name || "").toLowerCase();
  const matchesSearch = !searchTerm || sessionName.includes(searchTerm);
  const matchesDate =
    !dateFilter || formatIsoDate(session?.start_time) === dateFilter;
  return matchesSearch && matchesDate;
}

function getLateStatusLabel(row) {
  const normalizedStatus = normalizeStatus(row.attendance_status);
  if (normalizedStatus === "late") return "Late";
  if (normalizedStatus === "on_time") return "On Time";
  return "N/A";
}

export default function AdminAttendanceLogsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionSearchInput, setSessionSearchInput] = useState("");
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [sessionDateFilter, setSessionDateFilter] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [signatureStatusFilter, setSignatureStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("time_in");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rows, setRows] = useState([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [isRowsLoading, setIsRowsLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [rowsError, setRowsError] = useState("");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const browserScrollYRef = useRef(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSessionSearchTerm(sessionSearchInput.trim().toLowerCase());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [sessionSearchInput]);

  useEffect(() => {
    const loadMetadata = async () => {
      setIsSessionsLoading(true);
      setSessionError("");
      try {
        const sessionsData = await getAdminSessions();
        setSessions(sessionsData.sessions || []);
      } catch (apiError) {
        setSessionError(
          getApiErrorMessage(apiError, "Failed to load session browser."),
        );
      } finally {
        setIsSessionsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setRows([]);
      setRowsError("");
      setIsRowsLoading(false);
      return;
    }

    const loadAttendanceSheet = async () => {
      setIsRowsLoading(true);
      setRowsError("");
      try {
        const params = {
          session_id: selectedSessionId,
          sort_by: sortBy,
          sort_order: sortOrder,
        };
        if (attendanceStatusFilter) {
          params.attendance_status = attendanceStatusFilter;
        }
        if (signatureStatusFilter) {
          params.signature_status = signatureStatusFilter;
        }

        const data = await getAdminAttendanceSheet(params);
        setRows(data.rows || []);
      } catch (apiError) {
        setRows([]);
        setRowsError(
          getApiErrorMessage(apiError, "Failed to load attendance sheet."),
        );
      } finally {
        setIsRowsLoading(false);
      }
    };

    loadAttendanceSheet();
  }, [
    selectedSessionId,
    attendanceStatusFilter,
    signatureStatusFilter,
    sortBy,
    sortOrder,
  ]);

  const selectedSession = useMemo(
    () =>
      sessions.find(
        (session) => String(session.id) === String(selectedSessionId),
      ) || null,
    [sessions, selectedSessionId],
  );

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        matchesSession(session, sessionSearchTerm, sessionDateFilter),
      ),
    [sessions, sessionSearchTerm, sessionDateFilter],
  );

  const hasRows = rows.length > 0;
  const isShowingBrowser = !selectedSessionId;

  useEffect(() => {
    if (!isShowingBrowser || browserScrollYRef.current == null) return;

    const scrollY = browserScrollYRef.current;
    browserScrollYRef.current = null;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
    });
  }, [isShowingBrowser]);

  const handleExportCsv = async () => {
    if (!selectedSessionId) return;

    setIsExportingCsv(true);
    setRowsError("");
    try {
      const params = {
        session_id: selectedSessionId,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (attendanceStatusFilter) {
        params.attendance_status = attendanceStatusFilter;
      }
      if (signatureStatusFilter) {
        params.signature_status = signatureStatusFilter;
      }

      const result = await exportAdminAttendanceSheetCsv(params);
      downloadBlob(result.blob, normalizeFilename(result.contentDisposition));
    } catch (apiError) {
      setRowsError(getApiErrorMessage(apiError, "Failed to export CSV."));
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedSession) return;

    setIsExportingPdf(true);
    setRowsError("");
    try {
      exportAttendanceLogsPdf({
        session: selectedSession,
        rows,
        filters: {
          attendanceStatus:
            ATTENDANCE_STATUS_OPTIONS.find(
              (option) => option.value === attendanceStatusFilter,
            )?.label || "",
          signatureStatus:
            SIGNATURE_STATUS_OPTIONS.find(
              (option) => option.value === signatureStatusFilter,
            )?.label || "",
          sortBy:
            SORT_BY_OPTIONS.find((option) => option.value === sortBy)?.label ||
            sortBy,
          sortOrder,
        },
      });
    } catch (apiError) {
      setRowsError(getApiErrorMessage(apiError, "Failed to export PDF."));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const applyQuickFilter = (filterName) => {
    if (filterName === "late") {
      setAttendanceStatusFilter("late");
      return;
    }
    if (filterName === "on_time") {
      setAttendanceStatusFilter("on_time");
      return;
    }
    if (filterName === "missing_checkout") {
      setAttendanceStatusFilter("incomplete");
      return;
    }
    if (filterName === "valid_signature") {
      setSignatureStatusFilter("valid");
    }
  };

  const resetSecondaryFilters = () => {
    setAttendanceStatusFilter("");
    setSignatureStatusFilter("");
    setSortBy("time_in");
    setSortOrder("asc");
  };

  const handleSelectSession = (sessionId) => {
    browserScrollYRef.current = window.scrollY;
    setSelectedSessionId(String(sessionId));
  };

  const handleBackToBrowser = () => {
    setSelectedSessionId("");
  };

  return (
    <>
      <LayoutPageMeta
        title="Attendance Logs"
        subtitle="Search sessions, review attendance records, and export session logs."
      />
      <AdminPanel>
        {isShowingBrowser ? (
          <section className={styles.browserSection}>
            <div className={styles.browserHeader}>
              <div>
                <p className={styles.eyebrow}>Attendance Logs</p>
                <h2 className={styles.browserTitle}>Session Browser</h2>
                <p className={styles.browserSubtitle}>
                  Search by session title, narrow by date, and open one session
                  at a time for detailed attendance review.
                </p>
              </div>
            </div>

            <div className={styles.searchRow}>
              <label className={common.fieldBlock} htmlFor="session_search">
                <span className={common.fieldLabel}>Search Sessions</span>
                <div className={styles.inputWithIcon}>
                  <FiSearch aria-hidden="true" />
                  <input
                    id="session_search"
                    className={common.inputControl}
                    type="search"
                    placeholder="Search sessions..."
                    value={sessionSearchInput}
                    onChange={(event) =>
                      setSessionSearchInput(event.target.value)
                    }
                  />
                </div>
              </label>

              <label
                className={common.fieldBlock}
                htmlFor="session_date_filter"
              >
                <span className={common.fieldLabel}>Date Filter</span>
                <div className={styles.inputWithIcon}>
                  <FiCalendar aria-hidden="true" />
                  <input
                    id="session_date_filter"
                    className={common.inputControl}
                    type="date"
                    value={sessionDateFilter}
                    onChange={(event) =>
                      setSessionDateFilter(event.target.value)
                    }
                  />
                </div>
              </label>
            </div>

            <div className={styles.browserMetaRow}>
              <p className={styles.browserMeta}>
                {filteredSessions.length} session
                {filteredSessions.length === 1 ? "" : "s"} found
              </p>
            </div>

            {isSessionsLoading ? (
              <DataLoading message="Loading session browser..." />
            ) : null}
            {sessionError ? <DataError message={sessionError} /> : null}

            {!isSessionsLoading && !sessionError ? (
              filteredSessions.length > 0 ? (
                <div className={styles.sessionGrid}>
                  {filteredSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={styles.sessionCard}
                      onClick={() => handleSelectSession(session.id)}
                    >
                      <div className={styles.sessionCardTop}>
                        <span
                          className={`${styles.statusBadge} ${session.is_active ? styles.statusActive : styles.statusEnded}`.trim()}
                        >
                          {getSessionStatus(session)}
                        </span>
                        <span className={styles.sessionCount}>
                          {session.attendance_count || 0} records
                        </span>
                      </div>

                      <div className={styles.sessionCardBody}>
                        <h3 className={styles.sessionCardTitle}>
                          {session.name}
                        </h3>
                        <p className={styles.sessionCardDate}>
                          {formatLongDate(session.start_time)}
                        </p>
                      </div>

                      <dl className={styles.sessionCardMeta}>
                        <div>
                          <dt>Department</dt>
                          <dd>{session.department || "-"}</dd>
                        </div>
                        <div>
                          <dt>Session ID</dt>
                          <dd>{session.id}</dd>
                        </div>
                      </dl>
                    </button>
                  ))}
                </div>
              ) : (
                <DataEmpty message="No sessions match the current search and date filters." />
              )
            ) : null}
          </section>
        ) : null}

        {selectedSession ? (
          <section className={styles.selectedSection}>
            <div className={styles.summaryPanel}>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={handleBackToBrowser}
              >
                Back to Session Browser
              </button>
              <div>
                <p className={styles.eyebrow}>Selected Session</p>
                <h2 className={styles.summaryTitle}>{selectedSession.name}</h2>
                <p className={styles.summaryDate}>
                  {formatLongDate(selectedSession.start_time)}
                </p>
              </div>

              <div className={styles.summaryStats}>
                <div className={styles.summaryStat}>
                  <span>Attendance Records</span>
                  <strong>{selectedSession.attendance_count || 0}</strong>
                </div>
                <div className={styles.summaryStat}>
                  <span>Status</span>
                  <strong>{getSessionStatus(selectedSession)}</strong>
                </div>
                <div className={styles.summaryStat}>
                  <span>Department</span>
                  <strong>{selectedSession.department || "-"}</strong>
                </div>
              </div>
            </div>

            <div className={styles.controlsWrap}>
              <div className={styles.secondaryFilters}>
                <label
                  className={common.fieldBlock}
                  htmlFor="attendance_status_filter"
                >
                  <span className={common.fieldLabel}>Attendance Status</span>
                  <select
                    id="attendance_status_filter"
                    className={common.inputControl}
                    value={attendanceStatusFilter}
                    onChange={(event) =>
                      setAttendanceStatusFilter(event.target.value)
                    }
                  >
                    {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  className={common.fieldBlock}
                  htmlFor="signature_status_filter"
                >
                  <span className={common.fieldLabel}>Signature Status</span>
                  <select
                    id="signature_status_filter"
                    className={common.inputControl}
                    value={signatureStatusFilter}
                    onChange={(event) =>
                      setSignatureStatusFilter(event.target.value)
                    }
                  >
                    {SIGNATURE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="sort_by_filter">
                  <span className={common.fieldLabel}>Sort</span>
                  <select
                    id="sort_by_filter"
                    className={common.inputControl}
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    {SORT_BY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={common.fieldBlock}>
                  <span className={common.fieldLabel}>Order</span>
                  <div className={styles.orderToggle}>
                    <button
                      type="button"
                      className={`${common.ghostBtn} ${common.compact} ${sortOrder === "asc" ? styles.orderActive : ""}`.trim()}
                      onClick={() => setSortOrder("asc")}
                    >
                      Ascending
                    </button>
                    <button
                      type="button"
                      className={`${common.ghostBtn} ${common.compact} ${sortOrder === "desc" ? styles.orderActive : ""}`.trim()}
                      onClick={() => setSortOrder("desc")}
                    >
                      Descending
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.actionsRow}>
                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className={`${common.ghostBtn} ${common.compact}`.trim()}
                    onClick={resetSecondaryFilters}
                  >
                    Reset filters
                  </button>
                  <button
                    type="button"
                    className={`${common.ghostBtn} ${common.compact}`.trim()}
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || isRowsLoading || !hasRows}
                  >
                    <FiFileText aria-hidden="true" />
                    {isExportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
                  <button
                    type="button"
                    className={`${common.primaryBtn} ${common.compact}`.trim()}
                    onClick={handleExportCsv}
                    disabled={isExportingCsv || isRowsLoading}
                  >
                    {isExportingCsv ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </div>
            </div>

            {isRowsLoading ? (
              <DataLoading message="Loading attendance sheet..." />
            ) : null}
            {rowsError ? <DataError message={rowsError} /> : null}
            {!isRowsLoading && !rowsError && !hasRows ? (
              <DataEmpty message="No attendance records match the selected session and filters." />
            ) : null}

            {!isRowsLoading && !rowsError && hasRows ? (
              <div className={styles.responsiveBlock}>
                <div className={styles.desktopOnly}>
                  <div className={common.tableWrap}>
                    <table className={common.adminTable}>
                      <thead>
                        <tr>
                          <th>Faculty Name</th>
                          <th>Session</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Attendance Status</th>
                          <th>Signature Status</th>
                          <th>Late Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={`${row.session_id}-${row.faculty_id}`}>
                            <td>
                              <p className={styles.facultyName}>
                                {row.faculty_name}
                              </p>
                              <p className={styles.facultyEmail}>{row.email}</p>
                            </td>
                            <td>
                              <p className={styles.sessionName}>
                                {row.session_name}
                              </p>
                              <p className={styles.sessionDate}>{row.date}</p>
                            </td>
                            <td>{formatDateTime(row.time_in)}</td>
                            <td>{formatDateTime(row.time_out)}</td>
                            <td>
                              <span
                                className={`${common.chip} ${styles[normalizeStatus(row.attendance_status)] || ""}`.trim()}
                              >
                                {row.attendance_status}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${common.chip} ${common[row.signature_status] || ""}`.trim()}
                              >
                                {row.signature_status}
                              </span>
                            </td>
                            <td>{getLateStatusLabel(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.mobileOnly}>
                  <div className={styles.mobileCards}>
                    {rows.map((row) => (
                      <article
                        key={`${row.session_id}-${row.faculty_id}`}
                        className={styles.mobileCard}
                      >
                        <p className={styles.cardTitle}>{row.faculty_name}</p>
                        <p className={styles.cardMeta}>{row.email}</p>
                        <p className={styles.cardMeta}>{row.session_name}</p>
                        <p className={styles.cardMeta}>{row.date}</p>
                        <div className={styles.cardDetailGrid}>
                          <p>
                            <strong>Time In:</strong>{" "}
                            {formatDateTime(row.time_in)}
                          </p>
                          <p>
                            <strong>Time Out:</strong>{" "}
                            {formatDateTime(row.time_out)}
                          </p>
                          <p>
                            <strong>Attendance Status:</strong>{" "}
                            {row.attendance_status}
                          </p>
                          <p>
                            <strong>Signature Status:</strong>{" "}
                            {row.signature_status}
                          </p>
                          <p>
                            <strong>Late Status:</strong>{" "}
                            {getLateStatusLabel(row)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </AdminPanel>
    </>
  );
}
