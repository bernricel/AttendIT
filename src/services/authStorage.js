import { ROUTES } from '../constants/routes'
import { isAdminUser } from '../utils/accountType'

export { isAdminUser } from '../utils/accountType'

const AUTH_TOKEN_KEY = 'fas_auth_token'
const AUTH_USER_KEY = 'fas_auth_user'

export function getStoredAuth() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const rawUser = localStorage.getItem(AUTH_USER_KEY)

  let user = null
  if (rawUser) {
    try {
      user = JSON.parse(rawUser)
    } catch {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }

  return { token, user }
}

export function storeAuthSession({ token, user }) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  }
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  }
}

export function updateStoredUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function getDefaultRouteForUser(user) {
  if (isAdminUser(user)) {
    return ROUTES.ADMIN_DASHBOARD
  }
  return ROUTES.FACULTY_DASHBOARD
}
