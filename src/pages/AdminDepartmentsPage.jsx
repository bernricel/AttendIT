import { useEffect, useMemo, useState } from "react"

import AdminPanel from "../components/admin/AdminPanel"
import { DataError, DataLoading } from "../components/admin/DataState"
import FormField from "../components/FormField"
import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import common from "../styles/common.module.css"
import {
  createAdminDepartment,
  createAdminProgram,
  createAdminSection,
  deleteAdminProgram,
  deleteAdminSection,
  getAdminDepartments,
  updateAdminDepartment,
  updateAdminProgram,
  updateAdminSection,
} from "../services/attendanceApi"
import { getApiErrorMessage } from "../utils/apiError"
import styles from "./AdminDepartmentsPage.module.css"

function emptyDepartmentForm() {
  return { name: "", is_active: true }
}

function emptyProgramForm() {
  return { name: "", code: "", is_active: true }
}

function emptySectionForm() {
  return { name: "", year_level: "", is_active: true }
}

function getPrograms(department) {
  return Array.isArray(department?.programs) ? department.programs : []
}

function getSections(program) {
  return Array.isArray(program?.sections) ? program.sections : []
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyDepartmentForm())
  const [expandedDepartmentId, setExpandedDepartmentId] = useState(null)
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [programDrafts, setProgramDrafts] = useState({})
  const [sectionDrafts, setSectionDrafts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const loadDepartments = async (searchValue = search) => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getAdminDepartments({ search: searchValue })
      const departmentList = data.departments || []
      setDepartments(departmentList)
      if (
        expandedDepartmentId &&
        !departmentList.some(
          (department) => String(department.id) === String(expandedDepartmentId),
        )
      ) {
        setExpandedDepartmentId(null)
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to load departments."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true)
      setError("")
      try {
        const data = await getAdminDepartments({ search: "" })
        setDepartments(data.departments || [])
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Failed to load departments."))
      } finally {
        setIsLoading(false)
      }
    }

    initialLoad()
  }, [])

  const heading = useMemo(
    () => (editingId ? "Edit Department" : "Add Department"),
    [editingId],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      if (editingId) {
        await updateAdminDepartment(editingId, form)
        setSuccess("Department updated successfully.")
      } else {
        await createAdminDepartment(form)
        setSuccess("Department created successfully.")
      }
      setForm(emptyDepartmentForm())
      setEditingId(null)
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to save department."))
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (department) => {
    setEditingId(department.id)
    setForm({
      name: department.name || "",
      is_active: department.is_active !== false,
    })
    setSuccess("")
    setError("")
  }

  const toggleDepartmentStatus = async (department) => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await updateAdminDepartment(department.id, {
        is_active: !department.is_active,
      })
      setSuccess(
        `Department ${department.is_active ? "disabled" : "enabled"} successfully.`,
      )
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to update department status."))
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramDraft = (key, field, value) => {
    setProgramDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || emptyProgramForm()),
        [field]: value,
      },
    }))
  }

  const updateSectionDraft = (key, field, value) => {
    setSectionDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || emptySectionForm()),
        [field]: value,
      },
    }))
  }

  const handleProgramSave = async (departmentId, draftKey, programId = null) => {
    const draft = programDrafts[draftKey] || emptyProgramForm()
    if (!draft.name.trim() || !draft.code.trim()) {
      setError("Program name and code are required.")
      return
    }

    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      const payload = {
        name: draft.name.trim(),
        code: draft.code.trim(),
        is_active: draft.is_active !== false,
      }
      if (programId) {
        await updateAdminProgram(programId, payload)
        setSuccess("Program updated successfully.")
      } else {
        await createAdminProgram(departmentId, payload)
        setSuccess("Program created successfully.")
      }
      setEditingProgramId(null)
      setProgramDrafts((prev) => ({ ...prev, [draftKey]: emptyProgramForm() }))
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to save program."))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSectionSave = async (programId, draftKey, sectionId = null) => {
    const draft = sectionDrafts[draftKey] || emptySectionForm()
    if (!draft.name.trim()) {
      setError("Section name is required.")
      return
    }

    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      const payload = {
        name: draft.name.trim(),
        is_active: draft.is_active !== false,
      }
      if (draft.year_level !== "") {
        payload.year_level = Number(draft.year_level)
      }
      if (sectionId) {
        await updateAdminSection(sectionId, payload)
        setSuccess("Section updated successfully.")
      } else {
        await createAdminSection(programId, payload)
        setSuccess("Section created successfully.")
      }
      setEditingSectionId(null)
      setSectionDrafts((prev) => ({ ...prev, [draftKey]: emptySectionForm() }))
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to save section."))
    } finally {
      setIsSaving(false)
    }
  }

  const startProgramEdit = (program) => {
    const draftKey = `program-${program.id}`
    setEditingProgramId(program.id)
    setProgramDrafts((prev) => ({
      ...prev,
      [draftKey]: {
        name: program.name || "",
        code: program.code || "",
        is_active: program.is_active !== false,
      },
    }))
  }

  const startSectionEdit = (section) => {
    const draftKey = `section-${section.id}`
    setEditingSectionId(section.id)
    setSectionDrafts((prev) => ({
      ...prev,
      [draftKey]: {
        name: section.name || "",
        year_level:
          section.year_level === null || section.year_level === undefined
            ? ""
            : String(section.year_level),
        is_active: section.is_active !== false,
      },
    }))
  }

  const handleProgramDelete = async (programId) => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await deleteAdminProgram(programId)
      setSuccess("Program deleted successfully.")
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to delete program."))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSectionDelete = async (sectionId) => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await deleteAdminSection(sectionId)
      setSuccess("Section deleted successfully.")
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to delete section."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <LayoutPageMeta
        title="Departments"
        subtitle="Manage departments, programs, and sections used across profile setup and session targeting."
      />
      <AdminPanel>
        <div className={styles.layout}>
          <form className={styles.formCard} onSubmit={handleSubmit}>
            <h3 className={styles.cardTitle}>{heading}</h3>

            <FormField
              id="department_name"
              label="Department Name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Enter department name"
              disabled={isSaving}
            />

            <label className={common.switchField} htmlFor="department_is_active">
              <input
                id="department_is_active"
                className={common.switchInput}
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
                disabled={isSaving}
              />
              <span className={common.switchControl} aria-hidden="true">
                <span className={common.switchThumb} />
              </span>
              <span className={common.switchText}>Department is active</span>
            </label>

            <div className={styles.formActions}>
              <button
                className={common.primaryBtn}
                type="submit"
                disabled={isSaving || !form.name.trim()}
              >
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Department"}
              </button>
              {editingId ? (
                <button
                  className={common.ghostBtn}
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyDepartmentForm())
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className={styles.listCard}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarField}>
                <FormField
                  id="department_search"
                  label="Search Departments"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search departments"
                  disabled={isLoading}
                />
              </div>
              <button
                className={`${common.ghostBtn} ${common.compact}`.trim()}
                type="button"
                onClick={() => loadDepartments(search)}
                disabled={isLoading}
              >
                Search
              </button>
            </div>

            <MessageBanner type="info" message={success} />
            {error ? <DataError message={error} /> : null}
            {isLoading ? <DataLoading message="Loading departments..." /> : null}

            {!isLoading ? (
              <div className={styles.departmentList}>
                {departments.map((department) => {
                  const isExpanded =
                    String(expandedDepartmentId) === String(department.id)
                  const programs = getPrograms(department)
                  const newProgramKey = `new-program-${department.id}`
                  const newProgramDraft =
                    programDrafts[newProgramKey] || emptyProgramForm()

                  return (
                    <article key={department.id} className={styles.departmentCard}>
                      <div className={styles.departmentHeader}>
                        <div className={styles.departmentIdentity}>
                          <button
                            type="button"
                            className={styles.expandButton}
                            onClick={() =>
                              setExpandedDepartmentId((prev) =>
                                String(prev) === String(department.id)
                                  ? null
                                  : department.id,
                              )
                            }
                            aria-expanded={isExpanded}
                          >
                            <span>{isExpanded ? "Hide" : "Show"}</span>
                            <strong>{department.name}</strong>
                          </button>
                          <div className={styles.departmentStats}>
                            <span>{department.user_count || 0} users</span>
                            <span>{department.session_count || 0} sessions</span>
                            <span>{programs.length} programs</span>
                          </div>
                        </div>
                        <div className={styles.departmentActions}>
                          <span
                            className={
                              department.is_active
                                ? styles.badgeActive
                                : styles.badgeDisabled
                            }
                          >
                            {department.is_active ? "Active" : "Disabled"}
                          </span>
                          <button
                            className={`${common.ghostBtn} ${common.compact}`.trim()}
                            type="button"
                            onClick={() => startEdit(department)}
                          >
                            Edit
                          </button>
                          <button
                            className={`${common.ghostBtn} ${common.compact}`.trim()}
                            type="button"
                            onClick={() => toggleDepartmentStatus(department)}
                            disabled={isSaving}
                          >
                            {department.is_active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className={styles.nestedWorkspace}>
                          <section className={styles.inlineComposer}>
                            <div className={styles.inlineHeader}>
                              <h4>Programs</h4>
                              <p>Create and manage programs under this department.</p>
                            </div>
                            <div className={styles.inlineGrid}>
                              <FormField
                                id={`new_program_code_${department.id}`}
                                label="Program Code"
                                value={newProgramDraft.code}
                                onChange={(event) =>
                                  updateProgramDraft(
                                    newProgramKey,
                                    "code",
                                    event.target.value,
                                  )
                                }
                                placeholder="BSIT"
                                disabled={isSaving}
                              />
                              <FormField
                                id={`new_program_name_${department.id}`}
                                label="Program Name"
                                value={newProgramDraft.name}
                                onChange={(event) =>
                                  updateProgramDraft(
                                    newProgramKey,
                                    "name",
                                    event.target.value,
                                  )
                                }
                                placeholder="Bachelor of Science in Information Technology"
                                disabled={isSaving}
                              />
                            </div>
                            <div className={styles.inlineFooter}>
                              <label className={common.switchField}>
                                <input
                                  className={common.switchInput}
                                  type="checkbox"
                                  checked={newProgramDraft.is_active}
                                  onChange={(event) =>
                                    updateProgramDraft(
                                      newProgramKey,
                                      "is_active",
                                      event.target.checked,
                                    )
                                  }
                                  disabled={isSaving}
                                />
                                <span className={common.switchControl} aria-hidden="true">
                                  <span className={common.switchThumb} />
                                </span>
                                <span className={common.switchText}>Program is active</span>
                              </label>
                              <button
                                className={`${common.primaryBtn} ${common.compact}`.trim()}
                                type="button"
                                onClick={() =>
                                  handleProgramSave(department.id, newProgramKey)
                                }
                                disabled={
                                  isSaving ||
                                  !newProgramDraft.name.trim() ||
                                  !newProgramDraft.code.trim()
                                }
                              >
                                Add Program
                              </button>
                            </div>
                          </section>

                          <div className={styles.programList}>
                            {programs.length ? (
                              programs.map((program) => {
                                const programDraftKey = `program-${program.id}`
                                const programDraft =
                                  programDrafts[programDraftKey] || emptyProgramForm()
                                const sections = getSections(program)
                                const newSectionKey = `new-section-${program.id}`
                                const newSectionDraft =
                                  sectionDrafts[newSectionKey] || emptySectionForm()
                                const isProgramEditing =
                                  String(editingProgramId) === String(program.id)

                                return (
                                  <article key={program.id} className={styles.programCard}>
                                    <div className={styles.programHeader}>
                                      <div>
                                        <h4>
                                          {program.code || "Program"}{" "}
                                          <span>{program.name}</span>
                                        </h4>
                                        <p>{sections.length} sections</p>
                                      </div>
                                      <div className={styles.inlineActionRow}>
                                        <span
                                          className={
                                            program.is_active
                                              ? styles.badgeActive
                                              : styles.badgeDisabled
                                          }
                                        >
                                          {program.is_active ? "Active" : "Disabled"}
                                        </span>
                                        <button
                                          className={`${common.ghostBtn} ${common.compact}`.trim()}
                                          type="button"
                                          onClick={() =>
                                            isProgramEditing
                                              ? setEditingProgramId(null)
                                              : startProgramEdit(program)
                                          }
                                        >
                                          {isProgramEditing ? "Cancel" : "Edit"}
                                        </button>
                                        <button
                                          className={`${common.ghostBtn} ${common.compact}`.trim()}
                                          type="button"
                                          onClick={() => handleProgramDelete(program.id)}
                                          disabled={isSaving}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>

                                    {isProgramEditing ? (
                                      <div className={styles.inlineEditor}>
                                        <div className={styles.inlineGrid}>
                                          <FormField
                                            id={`program_code_${program.id}`}
                                            label="Program Code"
                                            value={programDraft.code}
                                            onChange={(event) =>
                                              updateProgramDraft(
                                                programDraftKey,
                                                "code",
                                                event.target.value,
                                              )
                                            }
                                            disabled={isSaving}
                                          />
                                          <FormField
                                            id={`program_name_${program.id}`}
                                            label="Program Name"
                                            value={programDraft.name}
                                            onChange={(event) =>
                                              updateProgramDraft(
                                                programDraftKey,
                                                "name",
                                                event.target.value,
                                              )
                                            }
                                            disabled={isSaving}
                                          />
                                        </div>
                                        <div className={styles.inlineFooter}>
                                          <label className={common.switchField}>
                                            <input
                                              className={common.switchInput}
                                              type="checkbox"
                                              checked={programDraft.is_active}
                                              onChange={(event) =>
                                                updateProgramDraft(
                                                  programDraftKey,
                                                  "is_active",
                                                  event.target.checked,
                                                )
                                              }
                                              disabled={isSaving}
                                            />
                                            <span
                                              className={common.switchControl}
                                              aria-hidden="true"
                                            >
                                              <span className={common.switchThumb} />
                                            </span>
                                            <span className={common.switchText}>
                                              Program is active
                                            </span>
                                          </label>
                                          <button
                                            className={`${common.primaryBtn} ${common.compact}`.trim()}
                                            type="button"
                                            onClick={() =>
                                              handleProgramSave(
                                                department.id,
                                                programDraftKey,
                                                program.id,
                                              )
                                            }
                                            disabled={
                                              isSaving ||
                                              !programDraft.name.trim() ||
                                              !programDraft.code.trim()
                                            }
                                          >
                                            Save Program
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}

                                    <section className={styles.sectionsBlock}>
                                      <div className={styles.sectionsHeader}>
                                        <h5>Sections</h5>
                                        <p>Manage available student sections for this program.</p>
                                      </div>

                                      <div className={styles.inlineGrid}>
                                        <FormField
                                          id={`section_name_${program.id}`}
                                          label="Section Name"
                                          value={newSectionDraft.name}
                                          onChange={(event) =>
                                            updateSectionDraft(
                                              newSectionKey,
                                              "name",
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Section A"
                                          disabled={isSaving}
                                        />
                                        <FormField
                                          id={`section_year_${program.id}`}
                                          label="Year Level (Optional)"
                                          type="number"
                                          value={newSectionDraft.year_level}
                                          onChange={(event) =>
                                            updateSectionDraft(
                                              newSectionKey,
                                              "year_level",
                                              event.target.value,
                                            )
                                          }
                                          placeholder="1"
                                          disabled={isSaving}
                                        />
                                      </div>
                                      <div className={styles.inlineFooter}>
                                        <label className={common.switchField}>
                                          <input
                                            className={common.switchInput}
                                            type="checkbox"
                                            checked={newSectionDraft.is_active}
                                            onChange={(event) =>
                                              updateSectionDraft(
                                                newSectionKey,
                                                "is_active",
                                                event.target.checked,
                                              )
                                            }
                                            disabled={isSaving}
                                          />
                                          <span
                                            className={common.switchControl}
                                            aria-hidden="true"
                                          >
                                            <span className={common.switchThumb} />
                                          </span>
                                          <span className={common.switchText}>
                                            Section is active
                                          </span>
                                        </label>
                                        <button
                                          className={`${common.primaryBtn} ${common.compact}`.trim()}
                                          type="button"
                                          onClick={() =>
                                            handleSectionSave(program.id, newSectionKey)
                                          }
                                          disabled={isSaving || !newSectionDraft.name.trim()}
                                        >
                                          Add Section
                                        </button>
                                      </div>

                                      <div className={styles.sectionList}>
                                        {sections.length ? (
                                          sections.map((section) => {
                                            const sectionDraftKey = `section-${section.id}`
                                            const sectionDraft =
                                              sectionDrafts[sectionDraftKey] ||
                                              emptySectionForm()
                                            const isSectionEditing =
                                              String(editingSectionId) ===
                                              String(section.id)

                                            return (
                                              <div
                                                key={section.id}
                                                className={styles.sectionCard}
                                              >
                                                <div className={styles.sectionRow}>
                                                  <div>
                                                    <strong>{section.name}</strong>
                                                    <p>
                                                      Year Level:{" "}
                                                      {section.year_level || "Not set"}
                                                    </p>
                                                  </div>
                                                  <div className={styles.inlineActionRow}>
                                                    <span
                                                      className={
                                                        section.is_active
                                                          ? styles.badgeActive
                                                          : styles.badgeDisabled
                                                      }
                                                    >
                                                      {section.is_active
                                                        ? "Active"
                                                        : "Disabled"}
                                                    </span>
                                                    <button
                                                      className={`${common.ghostBtn} ${common.compact}`.trim()}
                                                      type="button"
                                                      onClick={() =>
                                                        isSectionEditing
                                                          ? setEditingSectionId(null)
                                                          : startSectionEdit(section)
                                                      }
                                                    >
                                                      {isSectionEditing ? "Cancel" : "Edit"}
                                                    </button>
                                                    <button
                                                      className={`${common.ghostBtn} ${common.compact}`.trim()}
                                                      type="button"
                                                      onClick={() =>
                                                        handleSectionDelete(section.id)
                                                      }
                                                      disabled={isSaving}
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                </div>

                                                {isSectionEditing ? (
                                                  <div className={styles.inlineEditor}>
                                                    <div className={styles.inlineGrid}>
                                                      <FormField
                                                        id={`edit_section_name_${section.id}`}
                                                        label="Section Name"
                                                        value={sectionDraft.name}
                                                        onChange={(event) =>
                                                          updateSectionDraft(
                                                            sectionDraftKey,
                                                            "name",
                                                            event.target.value,
                                                          )
                                                        }
                                                        disabled={isSaving}
                                                      />
                                                      <FormField
                                                        id={`edit_section_year_${section.id}`}
                                                        label="Year Level (Optional)"
                                                        type="number"
                                                        value={sectionDraft.year_level}
                                                        onChange={(event) =>
                                                          updateSectionDraft(
                                                            sectionDraftKey,
                                                            "year_level",
                                                            event.target.value,
                                                          )
                                                        }
                                                        disabled={isSaving}
                                                      />
                                                    </div>
                                                    <div className={styles.inlineFooter}>
                                                      <label className={common.switchField}>
                                                        <input
                                                          className={common.switchInput}
                                                          type="checkbox"
                                                          checked={sectionDraft.is_active}
                                                          onChange={(event) =>
                                                            updateSectionDraft(
                                                              sectionDraftKey,
                                                              "is_active",
                                                              event.target.checked,
                                                            )
                                                          }
                                                          disabled={isSaving}
                                                        />
                                                        <span
                                                          className={common.switchControl}
                                                          aria-hidden="true"
                                                        >
                                                          <span
                                                            className={common.switchThumb}
                                                          />
                                                        </span>
                                                        <span className={common.switchText}>
                                                          Section is active
                                                        </span>
                                                      </label>
                                                      <button
                                                        className={`${common.primaryBtn} ${common.compact}`.trim()}
                                                        type="button"
                                                        onClick={() =>
                                                          handleSectionSave(
                                                            program.id,
                                                            sectionDraftKey,
                                                            section.id,
                                                          )
                                                        }
                                                        disabled={
                                                          isSaving ||
                                                          !sectionDraft.name.trim()
                                                        }
                                                      >
                                                        Save Section
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : null}
                                              </div>
                                            )
                                          })
                                        ) : (
                                          <p className={styles.emptyState}>
                                            No sections added yet.
                                          </p>
                                        )}
                                      </div>
                                    </section>
                                  </article>
                                )
                              })
                            ) : (
                              <p className={styles.emptyState}>
                                No programs added yet for this department.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      </AdminPanel>
    </>
  )
}
