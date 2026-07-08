import { useEffect, useState } from "react";
import { FiCalendar, FiSearch } from "react-icons/fi";

import { DataEmpty, DataError, DataLoading } from "./DataState";
import { getAdminSessions } from "../../services/attendanceApi";
import common from "../../styles/common.module.css";
import { getApiErrorMessage } from "../../utils/apiError";
import styles from "./SessionBrowser.module.css";

const SESSION_PAGE_SIZE = 6;

function formatLongDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getSessionStatus(session) {
  if (session?.lifecycle_status) return session.lifecycle_status;
  return session?.is_active ? "Active" : "Ended";
}

export default function SessionBrowser({
  title,
  subtitle,
  searchInput,
  onSearchInputChange,
  dateFilter,
  onDateFilterChange,
  page,
  onPageChange,
  onSessionSelect,
}) {
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total_sessions: 0,
    has_previous: false,
    has_next: false,
    start_index: 0,
    end_index: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = {
          page,
          page_size: SESSION_PAGE_SIZE,
        };
        const normalizedSearch = searchInput.trim().toLowerCase();
        if (normalizedSearch) {
          params.search = normalizedSearch;
        }
        if (dateFilter) {
          params.date = dateFilter;
        }

        const data = await getAdminSessions(params);
        setSessions(data.sessions || []);
        setPagination(
          data.pagination || {
            page: 1,
            total_pages: 1,
            total_sessions: 0,
            has_previous: false,
            has_next: false,
            start_index: 0,
            end_index: 0,
          },
        );
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Failed to load session browser."));
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [dateFilter, page, searchInput]);

  return (
    <section className={styles.browserSection}>
      <div className={styles.browserHeader}>
        <div>
          <p className={styles.eyebrow}>Attendance Sessions</p>
          <h2 className={styles.browserTitle}>{title}</h2>
          <p className={styles.browserSubtitle}>{subtitle}</p>
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
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>
        </label>

        <label className={common.fieldBlock} htmlFor="session_date_filter">
          <span className={common.fieldLabel}>Date Filter</span>
          <div className={styles.inputWithIcon}>
            <FiCalendar aria-hidden="true" />
            <input
              id="session_date_filter"
              className={common.inputControl}
              type="date"
              value={dateFilter}
              onChange={(event) => onDateFilterChange(event.target.value)}
            />
          </div>
        </label>
      </div>

      <div className={styles.browserMetaRow}>
        <p className={styles.browserMeta}>
          Showing {pagination.start_index}-{pagination.end_index} of {pagination.total_sessions} sessions
        </p>
        <p className={styles.browserMeta}>
          Page {pagination.page} of {pagination.total_pages}
        </p>
      </div>

      {isLoading ? <DataLoading message="Loading session browser..." /> : null}
      {error ? <DataError message={error} /> : null}

      {!isLoading && !error ? (
        sessions.length > 0 ? (
          <>
            <div className={styles.sessionGrid}>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={styles.sessionCard}
                  onClick={() => onSessionSelect(session)}
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
                    <h3 className={styles.sessionCardTitle}>{session.name}</h3>
                    <p className={styles.sessionCardDate}>{formatLongDate(session.start_time)}</p>
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

            <div className={styles.browserMetaRow}>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={!pagination.has_previous}
              >
                Previous
              </button>
              <p className={styles.browserMeta}>
                Page {pagination.page} of {pagination.total_pages}
              </p>
              <button
                type="button"
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                onClick={() => onPageChange(Math.min(pagination.total_pages, page + 1))}
                disabled={!pagination.has_next}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <DataEmpty message="No sessions match the current search and date filters." />
        )
      ) : null}
    </section>
  );
}
