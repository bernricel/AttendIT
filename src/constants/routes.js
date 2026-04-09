export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN_LOGIN: '/admin/login',
  COMPLETE_PROFILE: '/complete-profile',

  FACULTY_DASHBOARD: '/faculty/dashboard',
  FACULTY_HISTORY: '/faculty/history',
  FACULTY_SCAN: '/faculty/scan',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_CREATE_SESSION: '/admin/create-session',
  ADMIN_QR_DISPLAY: '/admin/qr-display',
  ADMIN_QR_PRESENTATION: '/qr-display/:sessionId',
  ADMIN_LOGS: '/admin/logs',
  ADMIN_CALENDAR: '/admin/calendar',
}

export function buildAdminQrPresentationRoute(sessionId) {
  return `/qr-display/${sessionId}`
}
