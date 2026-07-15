import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"

import AdminPanel from "../components/admin/AdminPanel"
import { DataError, DataLoading } from "../components/admin/DataState"
import FormField from "../components/FormField"
import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import common from "../styles/common.module.css"
import {
  createAdminProgram,
  createAdminSection,
  deleteAdminProgram,
  deleteAdminSection,
  getAdminDepartment,
  updateAdminDepartment,
  updateAdminProgram,
  updateAdminSection,
} from "../services/departmentsApi"
import { getApiErrorMessage } from "../utils/apiError"
import styles from "./AdminDepartmentsPage.module.css"

const programBlank = { name: "", code: "", is_active: true }
const sectionBlank = { name: "", is_active: true }

function statusLabel(item) {
  if (item.is_archived) return "Archived"
  return item.is_active ? "Active" : "Disabled"
}

function SectionList({ program, sections, onReload, setError, setSuccess, isSaving, setIsSaving }) {
  const [draft, setDraft] = useState(sectionBlank)
  const [edits, setEdits] = useState({})

  const saveSection = async (sectionId = "") => {
    const values = sectionId ? edits[sectionId] : draft
    if (!values?.name?.trim()) return
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      if (sectionId) {
        await updateAdminSection(sectionId, { name: values.name.trim(), is_active: values.is_active !== false })
        setEdits((prev) => ({ ...prev, [sectionId]: null }))
      } else {
        await createAdminSection(program.id, { name: values.name.trim(), is_active: values.is_active !== false })
        setDraft(sectionBlank)
      }
      setSuccess("Section saved.")
      await onReload()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to save section."))
    } finally {
      setIsSaving(false)
    }
  }

  const action = async (section, kind) => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      if (kind === "delete") await deleteAdminSection(section.id)
      else await updateAdminSection(section.id, kind === "archive" ? { is_archived: true } : { is_active: kind === "enable" })
      setSuccess("Section updated.")
      await onReload()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to update section."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.sectionList}>
      <div className={styles.inlineGrid}>
        <FormField id={`new_section_${program.id}`} label="Add Section" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} disabled={isSaving} />
        <button className={`${common.primaryBtn} ${common.compact}`.trim()} type="button" onClick={() => saveSection()} disabled={isSaving || !draft.name.trim()}>Add Section</button>
      </div>
      {sections.map((section) => {
        const edit = edits[section.id]
        return (
          <article key={section.id} className={styles.sectionCard}>
            {edit ? (
              <div className={styles.inlineGrid}>
                <FormField id={`section_${section.id}`} label="Section Name" value={edit.name} onChange={(e) => setEdits((p) => ({ ...p, [section.id]: { ...edit, name: e.target.value } }))} disabled={isSaving} />
                <button className={`${common.primaryBtn} ${common.compact}`.trim()} type="button" onClick={() => saveSection(section.id)} disabled={isSaving || !edit.name.trim()}>Save</button>
              </div>
            ) : (
              <div className={styles.sectionRow}>
                <strong>{section.name}</strong>
                <div className={styles.inlineActionRow}>
                  <span className={section.is_active && !section.is_archived ? styles.badgeActive : styles.badgeDisabled}>{statusLabel(section)}</span>
                  <button type="button" onClick={() => setEdits((p) => ({ ...p, [section.id]: { name: section.name, is_active: section.is_active !== false } }))}>Rename</button>
                  <button type="button" onClick={() => action(section, section.is_active ? "disable" : "enable")} disabled={isSaving || section.is_archived}>{section.is_active ? "Disable" : "Enable"}</button>
                  <button type="button" onClick={() => action(section, "archive")} disabled={isSaving || section.is_archived}>Archive</button>
                  <button type="button" onClick={() => action(section, "delete")} disabled={isSaving}>Delete</button>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function ProgramAccordion({ program, open, onToggle, onReload, setError, setSuccess, isSaving, setIsSaving }) {
  const [edit, setEdit] = useState(null)
  const sections = Array.isArray(program.sections) ? program.sections : []

  const saveProgram = async () => {
    if (!edit?.name?.trim() || !edit?.code?.trim()) return
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await updateAdminProgram(program.id, { name: edit.name.trim(), code: edit.code.trim(), is_active: edit.is_active !== false })
      setEdit(null)
      setSuccess("Program saved.")
      await onReload()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to save program."))
    } finally {
      setIsSaving(false)
    }
  }

  const action = async (kind) => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      if (kind === "delete") await deleteAdminProgram(program.id)
      else await updateAdminProgram(program.id, kind === "archive" ? { is_archived: true } : { is_active: kind === "enable" })
      setSuccess("Program updated.")
      await onReload()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to update program."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className={styles.programAccordion}>
      <button className={styles.accordionHeader} type="button" onClick={onToggle} aria-expanded={open}>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>›</span>
        <strong>{program.code} <span>{program.name}</span></strong>
        <small>{sections.length} Sections</small>
        <span className={program.is_active && !program.is_archived ? styles.badgeActive : styles.badgeDisabled}>{statusLabel(program)}</span>
      </button>
      <div className={`${styles.accordionBody} ${open ? styles.accordionOpen : ""}`}>
        <div className={styles.accordionInner}>
          {edit ? (
            <div className={styles.inlineGrid}>
              <FormField id={`program_code_${program.id}`} label="Program Code" value={edit.code} onChange={(e) => setEdit((p) => ({ ...p, code: e.target.value }))} disabled={isSaving} />
              <FormField id={`program_name_${program.id}`} label="Program Name" value={edit.name} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} disabled={isSaving} />
              <button className={`${common.primaryBtn} ${common.compact}`.trim()} type="button" onClick={saveProgram} disabled={isSaving}>Save Program</button>
              <button className={`${common.ghostBtn} ${common.compact}`.trim()} type="button" onClick={() => setEdit(null)} disabled={isSaving}>Cancel</button>
            </div>
          ) : (
            <div className={styles.inlineActionRow}>
              <button type="button" onClick={() => setEdit({ name: program.name, code: program.code, is_active: program.is_active !== false })}>Rename Program</button>
              <button type="button" onClick={() => action(program.is_active ? "disable" : "enable")} disabled={isSaving || program.is_archived}>{program.is_active ? "Disable" : "Enable"}</button>
              <button type="button" onClick={() => action("archive")} disabled={isSaving || program.is_archived}>Archive</button>
              <button type="button" onClick={() => action("delete")} disabled={isSaving}>Delete</button>
            </div>
          )}
          <h4 className={styles.sectionTitle}>Sections</h4>
          <SectionList program={program} sections={sections} onReload={onReload} setError={setError} setSuccess={setSuccess} isSaving={isSaving} setIsSaving={setIsSaving} />
        </div>
      </div>
    </article>
  )
}

export default function AdminDepartmentDetailPage() {
  const { departmentId } = useParams()
  const [department, setDepartment] = useState(null)
  const [programDraft, setProgramDraft] = useState(programBlank)
  const [openProgramId, setOpenProgramId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [departmentEdit, setDepartmentEdit] = useState(null)

  const programs = useMemo(() => (Array.isArray(department?.programs) ? department.programs : []), [department])

  const loadDepartment = async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getAdminDepartment(departmentId)
      setDepartment(data.department || data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to load department."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDepartment()
  }, [departmentId])

  const addProgram = async (event) => {
    event.preventDefault()
    if (!programDraft.name.trim() || !programDraft.code.trim()) return
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await createAdminProgram(departmentId, { name: programDraft.name.trim(), code: programDraft.code.trim(), is_active: true })
      setProgramDraft(programBlank)
      setSuccess("Program added.")
      await loadDepartment()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to add program."))
    } finally {
      setIsSaving(false)
    }
  }

  const saveDepartmentName = async () => {
    if (!departmentEdit?.name?.trim()) {
      setError("Department name cannot be empty.")
      return
    }
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      const data = await updateAdminDepartment(departmentId, { name: departmentEdit.name.trim() })
      setDepartment(data.department || data)
      setDepartmentEdit(null)
      setSuccess("Department name updated.")
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to update department name."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <LayoutPageMeta
        title={department?.name || "Department"}
        subtitle="Manage programs and sections."
        actions={<Link className={`${common.ghostBtn} ${common.compact}`.trim()} to="/admin/departments">Back to Departments</Link>}
      />
      <AdminPanel>
        <div className={styles.detailPage}>
          {isLoading ? <DataLoading message="Loading department..." /> : null}
          {error ? <DataError message={error} /> : null}
          <MessageBanner type="info" message={success} />
          {department ? (
            <>
              <section className={styles.detailHero}>
                <div>
                  <span>Department</span>
                  {departmentEdit ? (
                    <div className={styles.departmentEditBlock}>
                      <FormField id="department_name" label="Department Name" value={departmentEdit.name} onChange={(e) => setDepartmentEdit({ name: e.target.value })} disabled={isSaving} />
                      <div className={styles.inlineActionRow}>
                        <button className={`${common.primaryBtn} ${common.compact}`.trim()} type="button" onClick={saveDepartmentName} disabled={isSaving || !departmentEdit.name.trim()}>Save Changes</button>
                        <button className={`${common.ghostBtn} ${common.compact}`.trim()} type="button" onClick={() => setDepartmentEdit(null)} disabled={isSaving}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.departmentTitleRow}>
                      <h2>{department.name}</h2>
                      <button type="button" onClick={() => setDepartmentEdit({ name: department.name })} disabled={isSaving}>Edit</button>
                    </div>
                  )}
                </div>
                <span className={department.is_active ? styles.badgeActive : styles.badgeDisabled}>{department.is_active ? "Active" : "Disabled"}</span>
              </section>

              <form className={styles.inlineComposer} onSubmit={addProgram}>
                <div className={styles.inlineHeader}>
                  <h4>Add Program</h4>
                  <p>Create a program under {department.name}.</p>
                </div>
                <div className={styles.inlineGrid}>
                  <FormField id="program_code" label="Program Code" value={programDraft.code} onChange={(e) => setProgramDraft((p) => ({ ...p, code: e.target.value }))} disabled={isSaving} />
                  <FormField id="program_name" label="Program Name" value={programDraft.name} onChange={(e) => setProgramDraft((p) => ({ ...p, name: e.target.value }))} disabled={isSaving} />
                </div>
                <button className={`${common.primaryBtn} ${common.compact}`.trim()} type="submit" disabled={isSaving || !programDraft.name.trim() || !programDraft.code.trim()}>Add Program</button>
              </form>

              <div className={styles.programList}>
                {programs.map((program) => (
                  <ProgramAccordion
                    key={program.id}
                    program={program}
                    open={String(openProgramId) === String(program.id)}
                    onToggle={() => setOpenProgramId((prev) => (String(prev) === String(program.id) ? "" : program.id))}
                    onReload={loadDepartment}
                    setError={setError}
                    setSuccess={setSuccess}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </AdminPanel>
    </>
  )
}
