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
          
          {/* Add/Edit Form Panel */}
          <form className={styles.formCard} onSubmit={handleSubmit}>
            <h3 style={{ color: "#1e293b", margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
              {heading}
            </h3>
            
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

            <label className={common.switchField} htmlFor="department_is_active" style={{ display: "flex", alignItems: "center", margin: "8px 0" }}>
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
              <span className={common.switchText} style={{ color: "#1e293b", fontWeight: 600, marginLeft: "10px" }}>
                Department is active
              </span>
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

          {/* Departments List Workspace Panel */}
          <div className={styles.listCard}>
            <div className={styles.toolbar}>
              <div style={{ flex: 1, minWidth: "200px" }}>
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
                style={{ height: "42px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                Search
              </button>
            </div>

            <MessageBanner type="info" message={success} />
            {error ? <DataError message={error} /> : null}
            {isLoading ? <DataLoading message="Loading departments..." /> : null}

            {!isLoading ? (
              /* UI FIXED: Changed container class to use our new responsive styles */
              <div className={styles.responsiveTableWrap}>
                <table className={styles.responsiveTable}>
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
                        {/* data-label attributes are used to display labels on mobile card view */}
                        <td data-label="Department Name" className={styles.deptNameCell}>
                          {department.name}
                        </td>
                        <td data-label="Users" className={styles.numericCell}>
                          {department.user_count || 0}
                        </td>
                        <td data-label="Sessions" className={styles.numericCell}>
                          {department.session_count || 0}
                        </td>
                        <td data-label="Status" className={styles.statusCell}>
                          <span className={department.is_active ? styles.badgeActive : styles.badgeDisabled}>
                            {department.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td data-label="Actions" className={styles.actionsCell}>
                          <button
                            className={`${common.ghostBtn} ${common.compact}`.trim()}
                            type="button"
                            onClick={() => startEdit(department)}
                            style={{ padding: "6px 12px", fontSize: "0.8rem", fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button
                            className={`${common.ghostBtn} ${common.compact}`.trim()}
                            type="button"
                            onClick={() => toggleStatus(department)}
                            disabled={isSaving}
                            style={{ 
                              padding: "6px 12px", 
                              fontSize: "0.8rem", 
                              fontWeight: 600, 
                              color: department.is_active ? "#b91c1c" : "#047857",
                              borderColor: department.is_active ? "#fecaca" : "#a7f3d0",
                              backgroundColor: department.is_active ? "#fff5f5" : "#f0fdf4"
                            }}
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