import { useEffect, useMemo, useState } from "react"

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
} from "../services/attendanceApi"
import { getApiErrorMessage } from "../utils/apiError"
import styles from "./AdminDepartmentsPage.module.css"

function emptyForm() {
  return { name: "", is_active: true }
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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
      setForm(emptyForm())
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
      name: department.name,
      is_active: department.is_active,
    })
    setSuccess("")
    setError("")
  }

  const toggleStatus = async (department) => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      await updateAdminDepartment(department.id, {
        is_active: !department.is_active,
      })
      setSuccess(`Department ${department.is_active ? "disabled" : "enabled"} successfully.`)
      await loadDepartments()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Failed to update department status."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <LayoutPageMeta
        title="Departments"
        subtitle="Manage department options for users and attendance sessions."
      />
      <AdminPanel>
        <div className={styles.layout}>
          <form className={styles.formCard} onSubmit={handleSubmit}>
            <h3>{heading}</h3>
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
              <button className={common.primaryBtn} type="submit" disabled={isSaving || !form.name.trim()}>
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Department"}
              </button>
              {editingId ? (
                <button
                  className={common.ghostBtn}
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyForm())
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
              <FormField
                id="department_search"
                label="Search Departments"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search departments"
                disabled={isLoading}
              />
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
              <div className={common.tableWrap}>
                <table className={common.adminTable}>
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Users</th>
                      <th>Sessions</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((department) => (
                      <tr key={department.id}>
                        <td>{department.name}</td>
                        <td>{department.user_count || 0}</td>
                        <td>{department.session_count || 0}</td>
                        <td>{department.is_active ? "Active" : "Disabled"}</td>
                        <td className={styles.actionsCell}>
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
                            onClick={() => toggleStatus(department)}
                            disabled={isSaving}
                          >
                            {department.is_active ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </AdminPanel>
    </>
  )
}
