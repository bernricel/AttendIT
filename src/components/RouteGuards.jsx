import { Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { getDefaultRouteForUser, getStoredAuth } from '../services/authStorage'

export function RequireAuth({ children }) {
  const location = useLocation()
  const { token } = getStoredAuth()
  if (!token) {
    const isAdminPath =
      location.pathname.startsWith('/admin') || location.pathname.startsWith('/qr-display')
    return (
      <Navigate
        to={isAdminPath ? ROUTES.ADMIN_LOGIN : ROUTES.LOGIN}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  return children
}

export function RequireCompleteProfile({ children }) {
  const { user } = getStoredAuth()
  if (!user?.is_profile_complete) {
    return <Navigate to={ROUTES.COMPLETE_PROFILE} replace />
  }
  return children
}

export function RequireIncompleteProfile({ children }) {
  const { user } = getStoredAuth()
  if (user?.is_profile_complete) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />
  }
  return children
}

export function RequireAdminRole({ children }) {
  const { user } = getStoredAuth()
  if (user?.role !== 'admin') {
    return <Navigate to={user ? getDefaultRouteForUser(user) : ROUTES.ADMIN_LOGIN} replace />
  }
  return children
}

export function RequireFacultyRole({ children }) {
  const { user } = getStoredAuth()
  if (user?.role !== 'faculty') {
    return <Navigate to={getDefaultRouteForUser(user)} replace />
  }
  return children
}
