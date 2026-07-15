import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import AdminPanel from "../components/admin/AdminPanel"
import { DataError, DataLoading } from "../components/admin/DataState"
import FormField from "../components/FormField"
import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import common from "../styles/common.module.css"
import {
  createAdminDepartment,
  getAdminDepartments,
  updateAdminDepartment,
} from "../services/departmentsApi"
import { getApiErrorMessage } from "../utils/apiError"
import styles from "./AdminDepartmentsPage.module.css"

function emptyForm() {
  return { name: "", is_active: true }
}

function BulkConfirmModal({ action, count, onCancel, onConfirm, isSaving }) {
  if (!action) return null
  const verb = action === "disable" ? "Disable" : action === "enable" ? "Enable" : "Archive"
  return (
    <div className={styles.modalBackdrop}>
      <section className={styles.confirmModal}>
        <h3>{verb} {count} Department{count === 1 ? "" : "s"}?</h3>
        <p>
          {action === "archive"
            ? "Department archiving is not supported by the current backend endpoint."
            : `${verb}d Departments cannot be selected when creating accounts or sessions.`}
        </p>
        <div className={styles.modalActions}>
          <button className={common.ghostBtn} type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
          <button className={common.primaryBtn} type="button" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Working..." : verb}
          </button>
        </div>
      </section>
    </div>
  )
}

function DepartmentCard({ department, selected, onSelect, onOpen }) {
  const programs = Array.isArray(department.programs) ? department.programs : []
  return (
    <article
      className={styles.departmentCard}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <label className={styles.selectBox} onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onSelect} />
      </label>
      <div className={styles.departmentIdentity}>
        <strong>{department.name}</strong>
        <div className={styles.departmentStats}>
          <span>{department.user_count || 0} Users</span>
          <span>{department.session_count || 0} Sessions</span>
          <span>{programs.length} Programs</span>
        </div>
      </div>
      <div className={styles.departmentActions}>
        <span className={department.is_active ? styles.badgeActive : styles.badgeDisabled}>
          {department.is_active ? "Active" : "Disabled"}
        </span>
        <span className={styles.manageHint}>Manage Programs <span aria-hidden="true">›</span></span>
      </div>
    </article>
  )
}

export default function AdminDepartmentsPage() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState("")
  const [search, setSearch] = useState("")
  const [form, setForm] = useState(emptyForm())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const selectedDepartments = useMemo(
    () => departments.filter((item) => selectedIds.includes(String(item.id))),
    [departments, selectedIds],
  )

  const loadDepartments = async (searchValue = search) => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getAdminDepartments({ search: searchValue })
      setDepartments(data.departments || [])
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to load departments."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments("")
  }, [])

  const submitDepartment = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await createAdminDepartment({ name: form.name.trim(), is_active: form.is_active })
      setForm(emptyForm())
      setSuccess("Department created successfully.")
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to create department."))
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSelected = (departmentId) => {
    const id = String(departmentId)
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const runBulkAction = async () => {
    if (bulkAction === "archive") {
      setBulkAction("")
      setError("Department archiving is not supported by the current backend.")
      return
    }
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await Promise.all(
        selectedDepartments.map((department) =>
          updateAdminDepartment(department.id, { is_active: bulkAction === "enable" }),
        ),
      )
      setSuccess(`${bulkAction === "enable" ? "Enabled" : "Disabled"} selected departments.`)
      setSelectedIds([])
      setBulkAction("")
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to update selected departments."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <LayoutPageMeta title="Departments" subtitle="Manage the Department > Programs > Sections hierarchy." />
      <AdminPanel>
        <div className={styles.layout}>
          <form className={styles.formCard} onSubmit={submitDepartment}>
            <h3 className={styles.cardTitle}>Add Department</h3>
            <FormField
              id="department_name"
              label="Department Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Enter department name"
              disabled={isSaving}
            />
            <label className={common.switchField}>
              <input
                className={common.switchInput}
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                disabled={isSaving}
              />
              <span className={common.switchControl} aria-hidden="true"><span className={common.switchThumb} /></span>
              <span className={common.switchText}>Department is active</span>
            </label>
            <button className={common.primaryBtn} type="submit" disabled={isSaving || !form.name.trim()}>
              {isSaving ? "Saving..." : "Add Department"}
            </button>
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
              <button className={`${common.ghostBtn} ${common.compact}`.trim()} type="button" onClick={() => loadDepartments(search)}>
                Search
              </button>
            </div>

            {selectedIds.length ? (
              <div className={styles.bulkToolbar}>
                <strong>{selectedIds.length} selected</strong>
                <button type="button" onClick={() => setBulkAction("disable")}>Disable Selected</button>
                <button type="button" onClick={() => setBulkAction("enable")}>Enable Selected</button>
                <button type="button" onClick={() => setBulkAction("archive")}>Archive Selected</button>
              </div>
            ) : null}

            <MessageBanner type="info" message={success} />
            {error ? <DataError message={error} /> : null}
            {isLoading ? <DataLoading message="Loading departments..." /> : null}

            {!isLoading ? (
              <div className={styles.departmentList}>
                {departments.map((department) => (
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    selected={selectedIds.includes(String(department.id))}
                    onSelect={() => toggleSelected(department.id)}
                    onOpen={() => navigate(`/admin/departments/${department.id}`)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </AdminPanel>
      <BulkConfirmModal
        action={bulkAction}
        count={selectedIds.length}
        isSaving={isSaving}
        onCancel={() => setBulkAction("")}
        onConfirm={runBulkAction}
      />
    </>
  )
}
