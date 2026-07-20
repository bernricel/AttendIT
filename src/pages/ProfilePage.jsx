import { useEffect, useMemo, useState } from "react"

import FormField from "../components/FormField"
import LayoutPageMeta from "../components/layout/LayoutPageMeta"
import MessageBanner from "../components/MessageBanner"
import { getActiveDepartments, getActivePrograms, getProfile, updateProfile } from "../services/authApi"
import { updateStoredUser } from "../services/authStorage"
import common from "../styles/common.module.css"
import { getAccountType } from "../utils/accountType"
import { getApiErrorMessage } from "../utils/apiError"
import styles from "./ProfilePage.module.css"

function getFullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ department_id: "", program_id: "" })
  const [departmentOptions, setDepartmentOptions] = useState([{ value: "", label: "Select a department" }])
  const [programOptions, setProgramOptions] = useState([{ value: "", label: "Select a program" }])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isProgramsLoading, setIsProgramsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isStudent = profile?.role === "student"
  const displayName = useMemo(() => getFullName(profile) || profile?.email || "", [profile])
  const accountType = useMemo(() => getAccountType(profile?.email), [profile?.email])

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      setError("")
      try {
        const [profileData, departmentData] = await Promise.all([getProfile(), getActiveDepartments()])
        const user = profileData.user || profileData
        setProfile(user)
        setForm({
          department_id: user.department_id ? String(user.department_id) : "",
          program_id: user.program_id ? String(user.program_id) : "",
        })
        setDepartmentOptions([
          { value: "", label: "Select a department" },
          ...(departmentData.departments || []).map((department) => ({
            value: String(department.id),
            label: department.name,
          })),
        ])
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Could not load profile."))
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    const loadPrograms = async () => {
      if (!isStudent || !form.department_id) {
        setProgramOptions([{ value: "", label: "Select a program" }])
        return
      }
      setIsProgramsLoading(true)
      try {
        const data = await getActivePrograms(form.department_id)
        setProgramOptions([
          { value: "", label: "Select a program" },
          ...(data.programs || []).map((program) => ({
            value: String(program.id),
            label: `${program.code} - ${program.name}`,
          })),
        ])
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Could not load programs."))
      } finally {
        setIsProgramsLoading(false)
      }
    }
    loadPrograms()
  }, [form.department_id, isStudent])

  const updateField = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
      ...(field === "department_id" ? { program_id: "" } : null),
    }))
  }

  const isValid = Boolean(form.department_id) && (!isStudent || Boolean(form.program_id))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      const payload = { department_id: Number(form.department_id) }
      if (isStudent) payload.program_id = Number(form.program_id)
      const data = await updateProfile(payload)
      const user = data.user || data
      setProfile(user)
      updateStoredUser(user)
      setSuccess("Profile updated.")
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Could not update profile."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <LayoutPageMeta title="Profile" subtitle="Review your account and update your academic assignment." />
      <section className={styles.profilePanel}>
        {isLoading ? <p className={`${common.dataState} ${common.loading}`.trim()}>Loading profile...</p> : null}
        {!isLoading && error ? <MessageBanner type="error" message={error} /> : null}
        {!isLoading && profile ? (
          <form className={styles.profileForm} onSubmit={handleSubmit}>
            <div className={styles.readonlyGrid}>
              <FormField id="profile_name" label="Name" value={displayName} readOnly disabled />
              <FormField id="profile_email" label="Email" value={profile.email || ""} readOnly disabled />
              <div className={styles.accountTypeDisplay}>
                <span>Account Type</span>
                <strong>{accountType}</strong>
              </div>
              <FormField id="profile_school_id" label="School ID" value={profile.school_id || ""} readOnly disabled />
            </div>
            <div className={styles.editGrid}>
              <FormField
                id="profile_department"
                label="Department"
                value={form.department_id}
                onChange={updateField("department_id")}
                options={departmentOptions}
                disabled={isSaving}
              />
              {isStudent ? (
                <FormField
                  id="profile_program"
                  label="Program"
                  value={form.program_id}
                  onChange={updateField("program_id")}
                  options={programOptions}
                  disabled={isSaving || isProgramsLoading || !form.department_id}
                />
              ) : null}
            </div>
            <MessageBanner type="info" message={success} />
            <button className={common.primaryBtn} type="submit" disabled={isSaving || !isValid}>
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        ) : null}
      </section>
    </>
  )
}
