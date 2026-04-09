import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import MessageBanner from '../components/MessageBanner'
import { ROUTES } from '../constants/routes'
import { completeProfile } from '../services/authApi'
import { clearAuthSession, updateStoredUser } from '../services/authStorage'
import { getApiErrorMessage } from '../utils/apiError'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    school_id: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isValid = useMemo(
    () =>
      form.first_name.trim() &&
      form.last_name.trim() &&
      form.school_id.trim(),
    [form],
  )

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!isValid) {
      setError('Please complete all fields before continuing.')
      return
    }

    setIsSubmitting(true)

    try {
      const data = await completeProfile(form)
      updateStoredUser(data.user)
      navigate(ROUTES.FACULTY_DASHBOARD, { replace: true })
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        clearAuthSession()
        navigate(ROUTES.LOGIN, { replace: true })
        return
      }
      setError(getApiErrorMessage(apiError, 'Could not complete profile. Please review your fields and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Profile Completion"
      subtitle="One more step before entering the CIT Faculty Attendance System."
      sideNote={<p>This information will be used across attendance records and reporting.</p>}
    >
      <AuthCard title="Complete Your Profile">
        <form className="profile-form" onSubmit={handleSubmit}>
          <FormField
            id="first_name"
            label="First Name"
            value={form.first_name}
            onChange={updateField('first_name')}
            placeholder="Enter your first name"
            disabled={isSubmitting}
          />

          <FormField
            id="last_name"
            label="Last Name"
            value={form.last_name}
            onChange={updateField('last_name')}
            placeholder="Enter your last name"
            disabled={isSubmitting}
          />

          <FormField
            id="school_id"
            label="School ID"
            value={form.school_id}
            onChange={updateField('school_id')}
            placeholder="Enter your school ID"
            disabled={isSubmitting}
          />

          <MessageBanner type="error" message={error} />

          <button className="primary-btn" type="submit" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Saving Profile...' : 'Save and Continue'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}
