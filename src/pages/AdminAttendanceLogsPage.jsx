import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiFileText } from "react-icons/fi";

import AdminPanel from "../components/admin/AdminPanel";
import SessionBrowser from "../components/admin/SessionBrowser";
import { DataEmpty, DataError, DataLoading } from "../components/admin/DataState";
import LayoutPageMeta from "../components/layout/LayoutPageMeta";
import { exportAdminAttendanceSheetCsv, getAdminAttendanceSheet } from "../services/attendanceApi";
import { getAdminDepartments } from "../services/departmentsApi";
import common from "../styles/common.module.css";
import { getApiErrorMessage } from "../utils/apiError";
import { exportAttendanceLogsPdf } from "../utils/attendancePdf";
import { formatDateTime } from "../utils/dateTime";
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

const LATE_STATUS_OPTIONS = [
  { value: "", label: "All late statuses" },
  { value: "on_time", label: "On Time" },
  { value: "late", label: "Late" },
];

const SORT_BY_OPTIONS = [
  { value: "time_in", label: "Time In" },
  { value: "time_out", label: "Time Out" },
  { value: "attendance_status", label: "Attendance Status" },
  { value: "signature_status", label: "Signature Status" },
  { value: "session", label: "Session" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "faculty", label: "Faculty" },
  { value: "student", label: "Student" },
];

function getProgramsForDepartment(departments, departmentId) {
  const department = departments.find((item) => String(item.id) === String(departmentId));
  return Array.isArray(department?.programs) ? department.programs : [];
}

function getSectionsForProgram(programs, programId) {
  const program = programs.find((item) => String(item.id) === String(programId));
  return Array.isArray(program?.sections) ? program.sections : [];
}

function normalizeFilename(contentDisposition) {
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition || "");
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
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function getSessionStatus(session) {
  if (session?.lifecycle_status) return session.lifecycle_status;
  return session?.is_active ? "Active" : "Ended";
}

function getLateStatusLabel(row) {
  const directLateStatus = normalizeStatus(
    row.late_status || row.late_status_label || row.status_label,
  );
  if (directLateStatus === "late") return "Late";
  if (directLateStatus === "on_time") return "On Time";
  const normalizedStatus = normalizeStatus(row.attendance_status);
  if (normalizedStatus === "late") return "Late";
  if (normalizedStatus === "on_time") return "On Time";
  return "Incomplete";
}

export default function AdminAttendanceLogsPage() {
  const [isBrowsingSessions, setIsBrowsingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionSearchInput, setSessionSearchInput] = useState("");
  const [sessionDateFilter, setSessionDateFilter] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [signatureStatusFilter, setSignatureStatusFilter] = useState("");
  const [lateStatusFilter, setLateStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [sortBy, setSortBy] = useState("time_in");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rows, setRows] = useState([]);
  const [isRowsLoading, setIsRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState("");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [departments, setDepartments] = useState([]);
  const browserScrollYRef = useRef(null);
  const attendanceParamsRef = useRef(null);

  const programs = useMemo(
    () => getProgramsForDepartment(departments, departmentFilter),
    [departments, departmentFilter],
  );
  const sections = useMemo(
    () => getSectionsForProgram(programs, programFilter),
    [programs, programFilter],
  );

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await getAdminDepartments({ active_only: 1 });
        setDepartments(data.departments || []);
      } catch {
        setDepartments([]);
      }
    };
    loadDepartments();
  }, []);

  const loadAttendanceSheet = useCallback(async ({ showLoading = false } = {}) => {
    const params = attendanceParamsRef.current;
    if (!params?.session_id) {
      setRows([]);
      setRowsError("");
      setIsRowsLoading(false);
      return;
    }

    if (showLoading) setIsRowsLoading(true);
    try {
      const data = await getAdminAttendanceSheet(params);
      const nextRows = data.rows || [];
      setRows(nextRows);
      setRowsError("");
      setSelectedSession((prev) =>
        prev ? { ...prev, attendance_count: data.total_records ?? data.total_count ?? nextRows.length } : prev,
      );
    } catch (apiError) {
      setRows([]);
      setRowsError(getApiErrorMessage(apiError, "Failed to load attendance sheet."));
    } finally {
      if (showLoading) setIsRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = selectedSessionId
      ? {
          session_id: selectedSessionId,
          sort_by: sortBy,
          sort_order: sortOrder,
        }
      : null;
    if (params) {
      if (attendanceStatusFilter) params.attendance_status = attendanceStatusFilter;
      if (signatureStatusFilter) params.signature_status = signatureStatusFilter;
      if (roleFilter) params.role = roleFilter;
      if (departmentFilter) params.department_id = departmentFilter;
      if (programFilter) params.program_id = programFilter;
      if (sectionFilter) params.section_id = sectionFilter;
    }

    attendanceParamsRef.current = params;
    loadAttendanceSheet({ showLoading: true });
  }, [
    selectedSessionId,
    attendanceStatusFilter,
    signatureStatusFilter,
    roleFilter,
    departmentFilter,
    programFilter,
    sectionFilter,
    sortBy,
    sortOrder,
    loadAttendanceSheet,
  ]);

  useEffect(() => {
    if (isBrowsingSessions || !selectedSessionId) return undefined;

    const intervalId = window.setInterval(() => {
      loadAttendanceSheet();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isBrowsingSessions, loadAttendanceSheet, selectedSessionId]);

  useEffect(() => {
    if (!isBrowsingSessions || browserScrollYRef.current == null) return;

    const scrollY = browserScrollYRef.current;
    browserScrollYRef.current = null;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
    });
  }, [isBrowsingSessions]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const lateStatus = normalizeStatus(getLateStatusLabel(row));
      const searchValue = recordSearch.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        String(row.faculty_name || "").toLowerCase().includes(searchValue) ||
        String(row.email || "").toLowerCase().includes(searchValue) ||
        String(row.session_name || "").toLowerCase().includes(searchValue);
      const matchesLateStatus =
        !lateStatusFilter ||
        lateStatus === lateStatusFilter;
      return matchesSearch && matchesLateStatus;
    });
  }, [lateStatusFilter, recordSearch, rows]);

  const hasRows = filteredRows.length > 0;

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
      if (roleFilter) params.role = roleFilter;
      if (departmentFilter) params.department_id = departmentFilter;
      if (programFilter) params.program_id = programFilter;
      if (sectionFilter) params.section_id = sectionFilter;

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
        rows: filteredRows,
        filters: {
          attendanceStatus:
            ATTENDANCE_STATUS_OPTIONS.find((option) => option.value === attendanceStatusFilter)?.label || "",
          signatureStatus:
            SIGNATURE_STATUS_OPTIONS.find((option) => option.value === signatureStatusFilter)?.label || "",
          lateStatus:
            LATE_STATUS_OPTIONS.find((option) => option.value === lateStatusFilter)?.label || "",
          search: recordSearch,
          sortBy: SORT_BY_OPTIONS.find((option) => option.value === sortBy)?.label || sortBy,
          sortOrder,
        },
      });
    } catch (apiError) {
      setRowsError(getApiErrorMessage(apiError, "Failed to export PDF."));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const resetSecondaryFilters = () => {
    setAttendanceStatusFilter("");
    setSignatureStatusFilter("");
    setLateStatusFilter("");
    setRoleFilter("");
    setDepartmentFilter("");
    setProgramFilter("");
    setSectionFilter("");
    setRecordSearch("");
    setSortBy("time_in");
    setSortOrder("asc");
  };

  return (
    <>
      <LayoutPageMeta
        title="Attendance Logs"
        subtitle="Search sessions, review attendance records, and export session logs."
      />
      <AdminPanel>
        {isBrowsingSessions ? (
          <div className={styles.browserWrapper}>
            <SessionBrowser
              title="Session Browser"
              subtitle="Search by session title, narrow by date, and open one session at a time for detailed attendance review."
              excludedSessionId={selectedSessionId}
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
                browserScrollYRef.current = window.scrollY;
                setSelectedSession(session);
                setSelectedSessionId(String(session.id));
                setIsBrowsingSessions(false);
              }}
            />
          </div>
        ) : null}

        {selectedSession && !isBrowsingSessions ? (
          <section className={styles.selectedSection}>
            <div className={styles.summaryPanel}>
              <div>
                <button
                  type="button"
                  style={{ 
                    border: '1px solid #cbd5e1', 
                    background: '#ffffff', 
                    color: '#0f172a', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.88rem'
                  }}
                  onClick={() => setIsBrowsingSessions(true)}
                >
                  ← Back to Session Browser
                </button>
              </div>
              <div style={{ marginTop: '10px' }}>
                <p className={styles.eyebrow}>Selected Session</p>
                <h2 className={styles.summaryTitle}>{selectedSession.name}</h2>
                <p className={styles.summaryDate}>{formatLongDate(selectedSession.start_time)}</p>
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
                <label className={common.fieldBlock} htmlFor="record_search">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Search Records</span>
                  <input
                    id="record_search"
                    className={common.inputControl}
                    type="text"
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                    placeholder="Faculty, email, or session"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                  />
                </label>

                <label className={common.fieldBlock} htmlFor="attendance_status_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Attendance Status</span>
                  <select
                    id="attendance_status_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={attendanceStatusFilter}
                    onChange={(event) => setAttendanceStatusFilter(event.target.value)}
                  >
                    {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="role_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Role</span>
                  <select
                    id="role_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="department_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Department</span>
                  <select
                    id="department_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={departmentFilter}
                    onChange={(event) => {
                      setDepartmentFilter(event.target.value);
                      setProgramFilter("");
                      setSectionFilter("");
                    }}
                  >
                    <option value="">All departments</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="program_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Program</span>
                  <select
                    id="program_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={programFilter}
                    onChange={(event) => {
                      setProgramFilter(event.target.value);
                      setSectionFilter("");
                    }}
                    disabled={!departmentFilter}
                  >
                    <option value="">All programs</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.code ? `${program.code} - ${program.name}` : program.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="section_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Section</span>
                  <select
                    id="section_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={sectionFilter}
                    onChange={(event) => setSectionFilter(event.target.value)}
                    disabled={!programFilter}
                  >
                    <option value="">All sections</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="late_status_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Late Status</span>
                  <select
                    id="late_status_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={lateStatusFilter}
                    onChange={(event) => setLateStatusFilter(event.target.value)}
                  >
                    {LATE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="signature_status_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Signature Status</span>
                  <select
                    id="signature_status_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
                    value={signatureStatusFilter}
                    onChange={(event) => setSignatureStatusFilter(event.target.value)}
                  >
                    {SIGNATURE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={common.fieldBlock} htmlFor="sort_by_filter">
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Sort By</span>
                  <select
                    id="sort_by_filter"
                    style={{ border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', width: '100%', padding: '8px 12px', borderRadius: '8px' }}
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
                  <span className={common.fieldLabel} style={{ color: '#475569', fontWeight: '700' }}>Order</span>
                  <div className={styles.orderToggle}>
                    <button
                      type="button"
                      style={{ border: sortOrder === "asc" ? '2px solid #004b87' : '1px solid #cbd5e1', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px' }}
                      className={`${common.ghostBtn} ${common.compact} ${sortOrder === "asc" ? styles.orderActive : ""}`.trim()}
                      onClick={() => setSortOrder("asc")}
                    >
                      Ascending
                    </button>
                    <button
                      type="button"
                      style={{ border: sortOrder === "desc" ? '2px solid #004b87' : '1px solid #cbd5e1', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px' }}
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
                    style={{ border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', fontWeight: '600' }}
                    className={`${common.ghostBtn} ${common.compact}`.trim()}
                    onClick={resetSecondaryFilters}
                  >
                    Reset filters
                  </button>
                  <button
                    type="button"
                    style={{ border: '1px solid #cbd5e1', color: '#0f172a', background: '#ffffff', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', fontWeight: '600' }}
                    className={`${common.ghostBtn} ${common.compact}`.trim()}
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || isRowsLoading || !hasRows}
                  >
                    <FiFileText aria-hidden="true" />
                    {isExportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
                  <button
                    type="button"
                    style={{ background: '#004b87', color: '#ffffff', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', border: 'none' }}
                    className={`${common.primaryBtn} ${common.compact}`.trim()}
                    onClick={handleExportCsv}
                    disabled={isExportingCsv || isRowsLoading}
                  >
                    {isExportingCsv ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </div>
            </div>

            {isRowsLoading ? <DataLoading message="Loading attendance sheet..." /> : null}
            {rowsError ? <DataError message={rowsError} /> : null}
            {!isRowsLoading && !rowsError && !hasRows ? (
              <DataEmpty message="No attendance records match the selected session and filters." />
            ) : null}

            {!isRowsLoading && !rowsError && hasRows ? (
              <div className={styles.responsiveBlock}>
                <div className={styles.desktopOnly}>
                  <div className={common.tableWrap} style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table className={common.adminTable}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ color: '#334155', fontWeight: '700', padding: '14px' }}>Faculty Name</th>
                          <th style={{ color: '#334155', fontWeight: '700' }}>Session</th>
                          <th style={{ color: '#334155', fontWeight: '700' }}>Time In</th>
                          <th style={{ color: '#334155', fontWeight: '700' }}>Time Out</th>
                          <th style={{ color: '#334155', fontWeight: '700' }}>Attendance Status</th>
                          <th style={{ color: '#334155', fontWeight: '700' }}>Signature Status</th>
                          <th style={{ color: '#334155', fontWeight: '700' }}>Late Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={`${row.session_id}-${row.faculty_id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px' }}>
                              <p className={styles.facultyName} style={{ color: '#0f172a', fontWeight: '700' }}>{row.faculty_name}</p>
                              <p className={styles.facultyEmail} style={{ color: '#64748b' }}>{row.email}</p>
                            </td>
                            <td>
                              <p className={styles.sessionName} style={{ color: '#0f172a', fontWeight: '700' }}>{row.session_name}</p>
                              <p className={styles.sessionDate} style={{ color: '#64748b' }}>{row.date}</p>
                            </td>
                            <td style={{ color: '#334155', fontWeight: '600' }}>{formatDateTime(row.time_in)}</td>
                            <td style={{ color: '#334155', fontWeight: '600' }}>{formatDateTime(row.time_out)}</td>
                            <td>
                              <span className={`${common.chip} ${styles[normalizeStatus(row.attendance_status)] || ""}`.trim()}>
                                {row.attendance_status}
                              </span>
                            </td>
                            <td>
                              <span 
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  background: row.signature_status === 'valid' ? '#d1fae5' : '#fee2e2',
                                  color: row.signature_status === 'valid' ? '#065f46' : '#991b1b',
                                  border: row.signature_status === 'valid' ? '1px solid #a7f3d0' : '1px solid #fca5a5'
                                }}
                              >
                                {row.signature_status}
                              </span>
                            </td>
                            <td style={{ color: '#0f172a', fontWeight: '700' }}>{getLateStatusLabel(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.mobileOnly}>
                  <div className={styles.mobileCards}>
                    {filteredRows.map((row) => (
                      <article key={`${row.session_id}-${row.faculty_id}`} className={styles.mobileCard}>
                        <p className={styles.cardTitle}>{row.faculty_name}</p>
                        <p className={styles.cardMeta}>{row.email}</p>
                        <p className={styles.cardMeta}>{row.session_name}</p>
                        <p className={styles.cardMeta}>{row.date}</p>
                        <div className={styles.cardDetailGrid}>
                          <p><strong style={{ color: '#475569' }}>Time In:</strong> {formatDateTime(row.time_in)}</p>
                          <p><strong style={{ color: '#475569' }}>Time Out:</strong> {formatDateTime(row.time_out)}</p>
                          <p><strong style={{ color: '#475569' }}>Attendance Status:</strong> {row.attendance_status}</p>
                          <p><strong style={{ color: '#475569' }}>Signature Status:</strong> {row.signature_status}</p>
                          <p><strong style={{ color: '#475569' }}>Late Status:</strong> {getLateStatusLabel(row)}</p>
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
