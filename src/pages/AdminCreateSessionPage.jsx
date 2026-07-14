import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import AdminPanel from "../components/admin/AdminPanel"
import FormField from "../components/FormField"
import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import { ROUTES } from "../constants/routes"
import { createAttendanceSession, getAdminDepartments } from "../services/attendanceApi"
import common from "../styles/common.module.css"
import { getApiErrorMessage } from "../utils/apiError"
import {
  buildSessionPayload,
  customWeekdayOptions,
  getRecurringPreviewCount,
  recurrenceOptions,
  validateSessionForm,
} from "../utils/attendanceValidation"
import styles from "./AdminCreateSessionPage.module.css"

function getProgramsForDepartment(departments, departmentId) {
  const matchedDepartment = departments.find(
    (department) => String(department.id) === String(departmentId),
  )
  return Array.isArray(matchedDepartment?.programs) ? matchedDepartment.programs : []
}

function getSectionsForProgram(programs, programId) {
  const matchedProgram = programs.find(
    (program) => String(program.id) === String(programId),
  )
  return Array.isArray(matchedProgram?.sections) ? matchedProgram.sections : []
}

export default function AdminCreateSessionPage() {
  const [isAttendanceRulesOpen, setIsAttendanceRulesOpen] = useState(false)
  const [isAudienceRulesOpen, setIsAudienceRulesOpen] = useState(true)
  const [form, setForm] = useState({
    title: "",
    department_id: "",
    program_id: "",
    section_id: "",
    session_date: "",
    scheduled_start_time: "",
    check_in_start_time: "",
    check_in_end_time: "",
    late_threshold_time: "",
    check_out_start_time: "",
    check_out_end_time: "",
    enable_check_in_window: false,
    enable_check_out_window: false,
    session_end_time: "",
    is_active: true,
    qr_refresh_interval_seconds: 30,
    is_recurring: false,
    recurrence_pattern: "weekdays",
    recurrence_days: [],
    recurrence_start_date: "",
    recurrence_end_date: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([
    { value: "", label: "All Departments" },
  ])
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [creationSummary, setCreationSummary] = useState(null)

  const programs = useMemo(
    () => getProgramsForDepartment(departments, form.department_id),
    [departments, form.department_id],
  )
  const sections = useMemo(
    () => getSectionsForProgram(programs, form.program_id),
    [programs, form.program_id],
  )
  const programOptions = useMemo(
    () => [
      { value: "", label: "All Programs" },
      ...programs.map((program) => ({
        value: String(program.id),
        label: `${program.code || "Program"} - ${program.name}`,
      })),
    ],
    [programs],
  )
  const sectionOptions = useMemo(
    () => [
      { value: "", label: "All Sections" },
      ...sections.map((section) => ({
        value: String(section.id),
        label: section.name,
      })),
    ],
    [sections],
  )

  const updateField = (field) => (event) => {
    const booleanFields = [
      "is_active",
      "is_recurring",
      "enable_check_in_window",
      "enable_check_out_window",
    ]
    const value = booleanFields.includes(field)
      ? event.target.checked
      : event.target.value

    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "department_id" ? { program_id: "", section_id: "" } : null),
      ...(field === "program_id" ? { section_id: "" } : null),
    }))
  }

  const toggleRecurringWeekday = (weekdayValue) => {
    setForm((prev) => {
      const exists = prev.recurrence_days.includes(weekdayValue)
      return {
        ...prev,
        recurrence_days: exists
          ? prev.recurrence_days.filter((value) => value !== weekdayValue)
          : [...prev.recurrence_days, weekdayValue].sort((a, b) => a - b),
      }
    })
  }

  const recurringPreviewCount = useMemo(
    () => getRecurringPreviewCount(form),
    [form],
  )

  useEffect(() => {
    const loadDepartments = async () => {
      setIsDepartmentsLoading(true)
      try {
        const data = await getAdminDepartments({ active_only: 1 })
        const departmentList = data.departments || []
        setDepartments(departmentList)
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...departmentList.map((department) => ({
            value: String(department.id),
            label: department.name,
          })),
        ])
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Failed to load departments."))
      } finally {
        setIsDepartmentsLoading(false)
      }
    }

    loadDepartments()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")
    setCreationSummary(null)

    try {
      const validationMessage = validateSessionForm(form)
      if (validationMessage) {
        throw new Error(validationMessage)
      }

      const payload = buildSessionPayload(form)
      if (form.program_id) {
        payload.program_id = Number(form.program_id)
      }
      if (form.section_id) {
        payload.section_id = Number(form.section_id)
      }

      const data = await createAttendanceSession(payload)

      if (data.is_recurring) {
        setSuccess("Recurring sessions created successfully.")
        setCreationSummary(data.generation_summary || null)
      } else {
        setSuccess("Attendance session created successfully.")
      }

      setForm((prev) => ({
        ...prev,
        title: "",
        session_date: "",
        scheduled_start_time: "",
        check_in_start_time: "",
        check_in_end_time: "",
        late_threshold_time: "",
        check_out_start_time: "",
        check_out_end_time: "",
        session_end_time: "",
        recurrence_start_date: "",
        recurrence_end_date: "",
        recurrence_days: [],
        program_id: "",
        section_id: "",
      }))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to create session."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <LayoutPageMeta
        title="Create Attendance Session"
        subtitle="Build sessions with clear timing controls and audience rules without overwhelming the setup flow."
      />
      <AdminPanel>
        <form className={styles.sessionForm} onSubmit={handleSubmit}>
          <section className={styles.primaryColumn}>
            <div className={styles.formCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.kicker}>Core Details</p>
                  <h2>Session Setup</h2>
                </div>
                <Link className={styles.manageLink} to={ROUTES.ADMIN_DEPARTMENTS}>
                  Manage Departments
                </Link>
              </div>

              <div className={styles.formGrid}>
                <FormField
                  id="session_title"
                  label="Session Title"
                  value={form.title}
                  onChange={updateField("title")}
                  placeholder="Example: Faculty Daily Attendance"
                  disabled={isSubmitting}
                />

                <FormField
                  id="department_id"
                  label="Department"
                  value={form.department_id}
                  onChange={updateField("department_id")}
                  options={departmentOptions}
                  disabled={isSubmitting || isDepartmentsLoading}
                />

                {!form.is_recurring ? (
                  <FormField
                    id="session_date"
                    label="Session Date"
                    type="date"
                    value={form.session_date}
                    onChange={updateField("session_date")}
                    disabled={isSubmitting}
                  />
                ) : null}

                <FormField
                  id="scheduled_start_time"
                  label="Scheduled Start Time"
                  type="time"
                  value={form.scheduled_start_time}
                  onChange={updateField("scheduled_start_time")}
                  disabled={isSubmitting}
                />

                <FormField
                  id="session_end_time"
                  label="Session End Time (Optional)"
                  type="time"
                  value={form.session_end_time}
                  onChange={updateField("session_end_time")}
                  disabled={isSubmitting}
                />

                <FormField
                  id="qr_refresh_interval_seconds"
                  label="QR Refresh Interval (seconds)"
                  type="number"
                  value={form.qr_refresh_interval_seconds}
                  onChange={updateField("qr_refresh_interval_seconds")}
                  placeholder="30"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.formCard}>
              <button
                type="button"
                className={styles.ruleToggle}
                onClick={() => setIsAudienceRulesOpen((prev) => !prev)}
                aria-expanded={isAudienceRulesOpen}
              >
                <div>
                  <p className={styles.kicker}>Audience Rules</p>
                  <h2>Who can attend?</h2>
                </div>
                <span>{isAudienceRulesOpen ? "Hide" : "Show"}</span>
              </button>

              {isAudienceRulesOpen ? (
                <div className={styles.formGrid}>
                  <FormField
                    id="program_id"
                    label="Program (Optional)"
                    value={form.program_id}
                    onChange={updateField("program_id")}
                    options={programOptions}
                    disabled={isSubmitting || !form.department_id}
                    helperText="Leave blank to allow all programs in the selected department."
                  />

                  <FormField
                    id="section_id"
                    label="Section (Optional)"
                    value={form.section_id}
                    onChange={updateField("section_id")}
                    options={sectionOptions}
                    disabled={isSubmitting || !form.program_id}
                    helperText="Leave blank to allow all sections in the selected program."
                  />
                </div>
              ) : null}
            </div>

            <div className={styles.formCard}>
              <div className={styles.switchRow}>
                <label className={common.switchField} htmlFor="is_recurring">
                  <input
                    id="is_recurring"
                    className={common.switchInput}
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={updateField("is_recurring")}
                    disabled={isSubmitting}
                  />
                  <span className={common.switchControl} aria-hidden="true">
                    <span className={common.switchThumb} />
                  </span>
                  <span className={common.switchText}>Recurring Session</span>
                </label>
                <label className={common.switchField} htmlFor="is_active">
                  <input
                    id="is_active"
                    className={common.switchInput}
                    type="checkbox"
                    checked={form.is_active}
                    onChange={updateField("is_active")}
                    disabled={isSubmitting}
                  />
                  <span className={common.switchControl} aria-hidden="true">
                    <span className={common.switchThumb} />
                  </span>
                  <span className={common.switchText}>Activate immediately</span>
                </label>
              </div>

              {form.is_recurring ? (
                <div className={styles.formGrid}>
                  <FormField
                    id="recurrence_pattern"
                    label="Recurrence Pattern"
                    value={form.recurrence_pattern}
                    onChange={updateField("recurrence_pattern")}
                    options={recurrenceOptions}
                    disabled={isSubmitting}
                  />

                  <FormField
                    id="recurrence_start_date"
                    label="Recurrence Start Date"
                    type="date"
                    value={form.recurrence_start_date}
                    onChange={updateField("recurrence_start_date")}
                    disabled={isSubmitting}
                  />

                  <FormField
                    id="recurrence_end_date"
                    label="Recurrence End Date"
                    type="date"
                    value={form.recurrence_end_date}
                    onChange={updateField("recurrence_end_date")}
                    disabled={isSubmitting}
                  />
                </div>
              ) : null}

              {form.is_recurring && form.recurrence_pattern === "custom" ? (
                <div className={styles.weekdayWrap}>
                  {customWeekdayOptions.map((weekday) => (
                    <label key={weekday.value} className={styles.weekdayChip}>
                      <input
                        type="checkbox"
                        checked={form.recurrence_days.includes(weekday.value)}
                        onChange={() => toggleRecurringWeekday(weekday.value)}
                        disabled={isSubmitting}
                      />
                      <span>{weekday.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {form.is_recurring ? (
                <p className={styles.previewNote}>
                  This setup will create about {recurringPreviewCount} occurrence
                  {recurringPreviewCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>
          </section>

          <aside className={styles.secondaryColumn}>
            <div className={styles.formCard}>
              <button
                type="button"
                className={styles.ruleToggle}
                onClick={() => setIsAttendanceRulesOpen((prev) => !prev)}
                aria-expanded={isAttendanceRulesOpen}
              >
                <div>
                  <p className={styles.kicker}>Attendance Rules</p>
                  <h2>Timing Windows</h2>
                </div>
                <span>{isAttendanceRulesOpen ? "Hide" : "Show"}</span>
              </button>

              {isAttendanceRulesOpen ? (
                <div className={styles.ruleStack}>
                  <div className={styles.ruleBlock}>
                    <label className={common.switchField} htmlFor="enable_check_in_window">
                      <input
                        id="enable_check_in_window"
                        className={common.switchInput}
                        type="checkbox"
                        checked={form.enable_check_in_window}
                        onChange={updateField("enable_check_in_window")}
                        disabled={isSubmitting}
                      />
                      <span className={common.switchControl} aria-hidden="true">
                        <span className={common.switchThumb} />
                      </span>
                      <span className={common.switchText}>Enable Check-in Window</span>
                    </label>

                    {form.enable_check_in_window ? (
                      <div className={styles.ruleFields}>
                        <FormField
                          id="check_in_start_time"
                          label="Check-in Start Time"
                          type="time"
                          value={form.check_in_start_time}
                          onChange={updateField("check_in_start_time")}
                          disabled={isSubmitting}
                        />
                        <FormField
                          id="check_in_end_time"
                          label="Check-in End Time (Optional)"
                          type="time"
                          value={form.check_in_end_time}
                          onChange={updateField("check_in_end_time")}
                          disabled={isSubmitting}
                        />
                        <FormField
                          id="late_threshold_time"
                          label="Late Threshold Time (Optional)"
                          type="time"
                          value={form.late_threshold_time}
                          onChange={updateField("late_threshold_time")}
                          disabled={isSubmitting}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.ruleBlock}>
                    <label className={common.switchField} htmlFor="enable_check_out_window">
                      <input
                        id="enable_check_out_window"
                        className={common.switchInput}
                        type="checkbox"
                        checked={form.enable_check_out_window}
                        onChange={updateField("enable_check_out_window")}
                        disabled={isSubmitting}
                      />
                      <span className={common.switchControl} aria-hidden="true">
                        <span className={common.switchThumb} />
                      </span>
                      <span className={common.switchText}>Enable Check-out Window</span>
                    </label>

                    {form.enable_check_out_window ? (
                      <div className={styles.ruleFields}>
                        <FormField
                          id="check_out_start_time"
                          label="Check-out Start Time"
                          type="time"
                          value={form.check_out_start_time}
                          onChange={updateField("check_out_start_time")}
                          disabled={isSubmitting}
                        />
                        <FormField
                          id="check_out_end_time"
                          label="Check-out End Time (Optional)"
                          type="time"
                          value={form.check_out_end_time}
                          onChange={updateField("check_out_end_time")}
                          disabled={isSubmitting}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.formCard}>
              <p className={styles.kicker}>Review</p>
              <h2 className={styles.reviewTitle}>{form.title || "Untitled Session"}</h2>
              <div className={styles.reviewList}>
                <p>
                  <strong>Department:</strong>{" "}
                  {departmentOptions.find((option) => option.value === form.department_id)?.label ||
                    "All Departments"}
                </p>
                <p>
                  <strong>Program:</strong>{" "}
                  {programOptions.find((option) => option.value === form.program_id)?.label ||
                    "All Programs"}
                </p>
                <p>
                  <strong>Section:</strong>{" "}
                  {sectionOptions.find((option) => option.value === form.section_id)?.label ||
                    "All Sections"}
                </p>
              </div>

              <MessageBanner type="error" message={error} />
              <MessageBanner type="info" message={success} />

              {creationSummary ? (
                <p className={styles.previewNote}>
                  Created: {creationSummary.created_count} | Skipped duplicates:{" "}
                  {creationSummary.skipped_duplicates}
                </p>
              ) : null}

              <button className={common.primaryBtn} type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Creating..."
                  : form.is_recurring
                    ? "Create Recurring Sessions"
                    : "Create Session"}
              </button>
            </div>
          </aside>
        </form>
      </AdminPanel>
    </>
  )
}
