import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"

import AdminPanel from "../components/admin/AdminPanel"
import FormField from "../components/FormField"
import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import { ROUTES } from "../constants/routes"
import { createAttendanceSession } from "../services/attendanceApi"
import { getAdminDepartments } from "../services/departmentsApi"
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

function uniqueById(items) {
  return Array.from(new Map(items.map((item) => [String(item.id), item])).values())
}

function getOptionLabel(options, id) {
  return options.find((option) => String(option.id) === String(id))?.label || "Unknown"
}

function cleanSectionName(section, program) {
  const name = String(section?.name || "").trim()
  const code = String(program?.code || "").trim()
  if (!code) return name
  return name.replace(new RegExp(`^${code}\\s*-\\s*`, "i"), "").trim()
}

function formatPayloadTime(value) {
  if (!value) return "Not set"
  const [hours, minutes] = value.split(":")
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function ChipPicker({ id, label, allLabel, addLabel, all, onAllChange, selectedIds, options, onAdd, onRemove, disabled, openPicker, setOpenPicker, floating = false }) {
  const [search, setSearch] = useState("")
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const pickerRef = useRef(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const open = openPicker === id
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({ top: rect.bottom + 8, left: rect.left, width: rect.width })
  }

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target) && !dropdownRef.current?.contains(event.target)) {
        setOpenPicker("")
      }
    }
    const handleReposition = () => updatePosition()
    document.addEventListener("pointerdown", handlePointerDown)
    if (floating) {
      window.addEventListener("scroll", handleReposition, true)
      window.addEventListener("resize", handleReposition)
      updatePosition()
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      if (floating) {
        window.removeEventListener("scroll", handleReposition, true)
        window.removeEventListener("resize", handleReposition)
      }
    }
  }, [floating, open, setOpenPicker])

  const dropdown = (
    <div
      ref={dropdownRef}
      className={`${styles.searchPicker} ${floating ? styles.floatingPicker : styles.inlinePicker}`.trim()}
      style={floating ? { top: position.top, left: position.left, width: position.width } : undefined}
    >
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${label}...`} disabled={disabled} />
      <div className={styles.optionList}>
        {visibleOptions.map((option) => {
          const checked = selectedIds.includes(String(option.id))
          return (
            <label key={option.id}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => (checked ? onRemove(String(option.id)) : onAdd(String(option.id)))}
                disabled={disabled}
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className={`${styles.pickerBlock} ${open ? styles.pickerOpen : ""}`.trim()} ref={pickerRef}>
      <div className={styles.pickerHeader}>
        <span>{label}</span>
        <label className={styles.allToggle}>
          <input type="checkbox" checked={all} onChange={(event) => onAllChange(event.target.checked)} disabled={disabled} />
          {allLabel}
        </label>
      </div>
      {!all ? (
        <>
          <div className={styles.chipRow} ref={triggerRef}>
            {selectedIds.map((selectedId) => (
              <span key={selectedId} className={styles.chip}>
                {getOptionLabel(options, selectedId)}
              </span>
            ))}
            <button className={styles.addChip} type="button" onClick={() => (open ? setOpenPicker("") : (floating && updatePosition(), setOpenPicker(id)))} disabled={disabled}>
              + {addLabel}
            </button>
          </div>
          {open ? (floating ? createPortal(dropdown, document.body) : dropdown) : null}
        </>
      ) : null}
    </div>
  )
}

export default function AdminCreateSessionPage() {
  const [isAttendanceRulesOpen, setIsAttendanceRulesOpen] = useState(false)
  const [isAudienceRulesOpen, setIsAudienceRulesOpen] = useState(true)
  const [openAudiencePicker, setOpenAudiencePicker] = useState("")
  const [form, setForm] = useState({
    title: "",
    allowed_roles: "both",
    all_departments: true,
    department_ids: [],
    all_programs: true,
    program_ids: [],
    all_sections: true,
    section_ids: [],
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
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [creationSummary, setCreationSummary] = useState(null)

  const departmentOptions = useMemo(
    () => departments.map((department) => ({ ...department, label: department.name })),
    [departments],
  )
  const programs = useMemo(() => {
    const scopedDepartments = form.all_departments
      ? departments
      : departments.filter((department) => form.department_ids.includes(String(department.id)))
    return uniqueById(scopedDepartments.flatMap((department) => department.programs || []))
  }, [departments, form.all_departments, form.department_ids])
  const programOptions = useMemo(
    () => programs.map((program) => ({ ...program, label: program.name })),
    [programs],
  )
  const sections = useMemo(() => {
    const scopedPrograms = form.all_programs
      ? programs
      : programs.filter((program) => form.program_ids.includes(String(program.id)))
    return uniqueById(scopedPrograms.flatMap((program) => program.sections || []))
  }, [form.all_programs, form.program_ids, programs])
  const sectionOptions = useMemo(
    () => sections.map((section) => {
      const program = programs.find((item) => String(item.id) === String(section.program_id))
      const code = program?.code || "Program"
      return { ...section, label: `${code} - ${cleanSectionName(section, program)}` }
    }),
    [programs, sections],
  )

  useEffect(() => {
    setForm((prev) => {
      const validProgramIds = new Set(programs.map((program) => String(program.id)))
      const validSectionIds = new Set(sections.map((section) => String(section.id)))
      const program_ids = prev.program_ids.filter((id) => validProgramIds.has(id))
      const section_ids = prev.section_ids.filter((id) => validSectionIds.has(id))
      if (program_ids.length === prev.program_ids.length && section_ids.length === prev.section_ids.length) {
        return prev
      }
      return { ...prev, program_ids, section_ids }
    })
  }, [programs, sections])

  const updateField = (field) => (event) => {
    const booleanFields = [
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
      ...(field === "allowed_roles" && value === "faculty"
        ? { all_programs: true, program_ids: [], all_sections: true, section_ids: [] }
        : null),
    }))
  }

  const setAudienceAll = (field, checked) => {
    setForm((prev) => {
      const next = { ...prev, [field]: checked }
      if (field === "all_departments") {
        next.department_ids = checked ? [] : prev.department_ids
        next.all_programs = true
        next.program_ids = []
        next.all_sections = true
        next.section_ids = []
      }
      if (field === "all_programs") {
        next.program_ids = checked ? [] : prev.program_ids
        next.all_sections = true
        next.section_ids = []
      }
      if (field === "all_sections") next.section_ids = checked ? [] : prev.section_ids
      return next
    })
  }

  const addAudienceId = (field, id) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].includes(id) ? prev[field] : [...prev[field], id] }))
  }

  const removeAudienceId = (field, id) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((value) => value !== id) }))
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
  const reviewPayload = useMemo(() => buildSessionPayload(form), [form])

  useEffect(() => {
    const loadDepartments = async () => {
      setIsDepartmentsLoading(true)
      try {
        const data = await getAdminDepartments({ active_only: 1 })
        setDepartments(data.departments || [])
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
        all_departments: true,
        department_ids: [],
        all_programs: true,
        program_ids: [],
        all_sections: true,
        section_ids: [],
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
                <div className={styles.audienceGrid}>
                  <FormField
                    id="allowed_roles"
                    label="Roles"
                    value={form.allowed_roles}
                    onChange={updateField("allowed_roles")}
                    options={[
                      { value: "both", label: "Faculty and Students" },
                      { value: "faculty", label: "Faculty" },
                      { value: "student", label: "Students" },
                    ]}
                    disabled={isSubmitting}
                  />

                  <ChipPicker
                    id="departments"
                    label="Departments"
                    allLabel="All Departments"
                    addLabel="Add Department"
                    all={form.all_departments}
                    onAllChange={(checked) => setAudienceAll("all_departments", checked)}
                    selectedIds={form.department_ids}
                    options={departmentOptions}
                    onAdd={(id) => addAudienceId("department_ids", id)}
                    onRemove={(id) => removeAudienceId("department_ids", id)}
                    disabled={isSubmitting || isDepartmentsLoading}
                    openPicker={openAudiencePicker}
                    setOpenPicker={setOpenAudiencePicker}
                    floating
                  />

                  <ChipPicker
                    id="programs"
                    label="Programs"
                    allLabel="All Programs"
                    addLabel="Add Program"
                    all={form.all_programs}
                    onAllChange={(checked) => setAudienceAll("all_programs", checked)}
                    selectedIds={form.program_ids}
                    options={programOptions}
                    onAdd={(id) => addAudienceId("program_ids", id)}
                    onRemove={(id) => removeAudienceId("program_ids", id)}
                    disabled={isSubmitting || form.allowed_roles === "faculty" || (!form.all_departments && !form.department_ids.length)}
                    openPicker={openAudiencePicker}
                    setOpenPicker={setOpenAudiencePicker}
                  />

                  <ChipPicker
                    id="sections"
                    label="Sections"
                    allLabel="All Sections"
                    addLabel="Add Section"
                    all={form.all_sections}
                    onAllChange={(checked) => setAudienceAll("all_sections", checked)}
                    selectedIds={form.section_ids}
                    options={sectionOptions}
                    onAdd={(id) => addAudienceId("section_ids", id)}
                    onRemove={(id) => removeAudienceId("section_ids", id)}
                    disabled={isSubmitting || form.allowed_roles === "faculty" || (!form.all_programs && !form.program_ids.length)}
                    openPicker={openAudiencePicker}
                    setOpenPicker={setOpenAudiencePicker}
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
                  <strong>Roles:</strong>{" "}
                  {form.allowed_roles === "both"
                    ? "Faculty and Students"
                    : form.allowed_roles === "faculty"
                      ? "Faculty"
                      : "Students"}
                </p>
                <p>
                  <strong>Start:</strong> {formatPayloadTime(reviewPayload.scheduled_start_time)}
                </p>
                <p>
                  <strong>End:</strong> {formatPayloadTime(reviewPayload.session_end_time)}
                </p>
                <p>
                  <strong>Departments:</strong>{" "}
                  {form.all_departments ? "All Departments" : form.department_ids.map((id) => getOptionLabel(departmentOptions, id)).join(", ") || "None selected"}
                </p>
                <p>
                  <strong>Programs:</strong>{" "}
                  {form.all_programs ? "All Programs" : form.program_ids.map((id) => getOptionLabel(programOptions, id)).join(", ") || "None selected"}
                </p>
                <p>
                  <strong>Sections:</strong>{" "}
                  {form.all_sections ? "All Sections" : form.section_ids.map((id) => getOptionLabel(sectionOptions, id)).join(", ") || "None selected"}
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
