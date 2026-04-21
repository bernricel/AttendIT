import { useEffect, useMemo, useState } from "react";
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
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime, formatIsoDate } from "../utils/dateTime";
import common from "../styles/common.module.css";
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

function toSessionLabel(session) {
  const startDate = formatIsoDate(session.start_time);
  return `${session.name} (${startDate})`;
}

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

export default function AdminAttendanceLogsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [signatureStatusFilter, setSignatureStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("time_in");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoading(true);
      setError("");
      try {
        const sessionsData = await getAdminSessions();

        const fetchedSessions = sessionsData.sessions || [];
        setSessions(fetchedSessions);

        if (fetchedSessions.length > 0) {
          setSelectedSessionId(String(fetchedSessions[0].id));
        }
      } catch (apiError) {
        setError(
          getApiErrorMessage(
            apiError,
            "Failed to load session options.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      return;
    }

    const loadAttendanceSheet = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = {
          sort_by: sortBy,
          sort_order: sortOrder,
        };
        if (selectedSessionId) params.session_id = selectedSessionId;
        if (attendanceStatusFilter)
          params.attendance_status = attendanceStatusFilter;
        if (signatureStatusFilter)
          params.signature_status = signatureStatusFilter;

        const data = await getAdminAttendanceSheet(params);
        setRows(data.rows || []);
      } catch (apiError) {
        setRows([]);
        setError(
          getApiErrorMessage(apiError, "Failed to load attendance sheet."),
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendanceSheet();
  }, [
    selectedSessionId,
    attendanceStatusFilter,
    signatureStatusFilter,
    sortBy,
    sortOrder,
    sessions.length,
  ]);

  const selectedSession = useMemo(
    () =>
      sessions.find(
        (session) => String(session.id) === String(selectedSessionId),
      ) || null,
    [sessions, selectedSessionId],
  );

  const hasRows = rows.length > 0;

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    try {
      const params = {
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (selectedSessionId) params.session_id = selectedSessionId;
      if (attendanceStatusFilter)
        params.attendance_status = attendanceStatusFilter;
      if (signatureStatusFilter)
        params.signature_status = signatureStatusFilter;

      const result = await exportAdminAttendanceSheetCsv(params);
      downloadBlob(result.blob, normalizeFilename(result.contentDisposition));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to export CSV."));
    } finally {
      setIsExporting(false);
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

  return (
    <>
      <LayoutPageMeta
        title="Attendance Logs"
        subtitle="Session-based attendance sheet with export-ready records."
      />
      <AdminPanel>
        <div className={styles.controlsWrap}>
          <div className={styles.primaryFilter}>
            <label className={common.fieldBlock} htmlFor="session_picker">
              <span className={common.fieldLabel}>Session</span>
              <select
                id="session_picker"
                className={common.inputControl}
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
              >
                <option value="">All sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {toSessionLabel(session)}
                  </option>
                ))}
              </select>
            </label>
            {selectedSession ? (
              <p className={styles.sessionHint}>
                Reviewing: {toSessionLabel(selectedSession)}
              </p>
            ) : (
              <p className={styles.sessionHint}>Showing all sessions.</p>
            )}
          </div>

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
            <div className={styles.quickFilterRow}>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={() => applyQuickFilter("late")}
              >
                Late only
              </button>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={() => applyQuickFilter("on_time")}
              >
                On time only
              </button>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={() => applyQuickFilter("missing_checkout")}
              >
                Missing check-out
              </button>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={() => applyQuickFilter("valid_signature")}
              >
                Valid signature only
              </button>
            </div>
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
                className={`${common.primaryBtn} ${common.compact}`.trim()}
                onClick={handleExport}
                disabled={isExporting || isLoading}
              >
                {isExporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <DataLoading message="Loading attendance sheet..." />
        ) : null}
        {error ? <DataError message={error} /> : null}
        {!isLoading && !error && !hasRows ? (
          <DataEmpty
            message={
              selectedSessionId
                ? "No attendance records match the selected session and filters."
                : "No attendance records found for the selected filters."
            }
          />
        ) : null}

        {!isLoading && !error && hasRows ? (
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
                            className={`${common.chip} ${styles[row.attendance_status.toLowerCase().replace(" ", "_")] || ""}`.trim()}
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
                        <strong>Time In:</strong> {formatDateTime(row.time_in)}
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
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </AdminPanel>
    </>
  );
}
