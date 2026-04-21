import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import MessageBanner from '../components/MessageBanner'
import { ROUTES } from '../constants/routes'
import { loginAdmin } from '../services/authApi'
import { clearAuthSession, getDefaultRouteForUser, getStoredAuth, storeAuthSession } from '../services/authStorage'
import { getApiErrorMessage } from '../utils/apiError'
import styles from './AdminLoginPage.module.css'
import common from '../styles/common.module.css'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const continueTo = location.state?.from || null
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resolveAdminRoute = useCallback(() => {
    if (continueTo?.startsWith('/admin')) {
      return continueTo
    }
    return ROUTES.ADMIN_DASHBOARD
  }, [continueTo])

  const isFormValid = useMemo(
    () => Boolean(form.identifier.trim()) && Boolean(form.password),
    [form.identifier, form.password],
  )

  useEffect(() => {
    const { token, user } = getStoredAuth()
    if (!token || !user) {
      return
    }
    const destination = user.role === 'admin' ? resolveAdminRoute() : getDefaultRouteForUser(user)
    navigate(destination, { replace: true })
  }, [navigate, resolveAdminRoute])

  const updateField = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isFormValid || isLoading) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await loginAdmin({
        identifier: form.identifier.trim(),
        password: form.password,
      })
      storeAuthSession({ token: data.token, user: data.user })
      navigate(resolveAdminRoute(), { replace: true })
    } catch (apiError) {
      clearAuthSession()
      setError(getApiErrorMessage(apiError, 'Admin login failed. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="CIT Faculty Attendance Portal"
      subtitle="Administrative access for authorized personnel."
      sideNote={<p>Use your assigned admin credentials to continue.</p>}
    >
      <AuthCard title="Admin Login" description="Authorized administrators only.">
        <form className={common.profileForm} onSubmit={handleSubmit}>
          {/* Identifier accepts either admin email or configured admin username. */}
          <FormField
            id="admin_identifier"
            label="Email or Username"
            value={form.identifier}
            onChange={updateField('identifier')}
            placeholder="Enter admin email or username"
            disabled={isLoading}
          />
          <FormField
            id="admin_password"
            label="Password"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          <MessageBanner type="error" message={error} />
          <button className={common.primaryBtn} type="submit" disabled={!isFormValid || isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.authDivider} role="presentation">
          <span>faculty or staff</span>
        </div>
        <Link className={`${common.ghostBtn} ${common.authLinkBtn}`.trim()} to={ROUTES.LOGIN}>
          Back to Faculty Login
        </Link>
      </AuthCard>
    </AuthLayout>
  )
}
