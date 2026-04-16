import api from './api'

export async function createAttendanceSession(payload) {
  // Admin creates a new attendance session (single or recurring).
  const response = await api.post('/admin/create-session', payload)
  return response.data
}

export async function getAdminSessions() {
  // Fetch session list for admin dashboards and QR screens.
  const response = await api.get('/admin/sessions')
  return response.data
}

export async function getAdminSessionQrStatus(sessionId) {
  // Fetch live QR token status for one session (token, expiry, countdown).
  const response = await api.get(`/admin/sessions/${sessionId}/qr-status`)
  return response.data
}

export async function getAttendanceByDate(date) {
  const response = await api.get('/admin/attendance-by-date', { params: { date } })
  return response.data
}

export async function getFacultyAttendanceRecords(facultyId = '') {
  const params = {}
  if (facultyId) {
    params.faculty_id = facultyId
  }
  const response = await api.get('/admin/faculty-attendance', { params })
  return response.data
}

export async function deleteAttendanceSession(sessionId, password) {
  const response = await api.delete(`/admin/sessions/${sessionId}`, {
    data: { password },
  })
  return response.data
}

export async function endAttendanceSession(sessionId) {
  const response = await api.post(`/admin/sessions/${sessionId}/end`)
  return response.data
}

export async function verifyAttendanceSignature(attendanceRecordId) {
  // Calls backend DSA verification endpoint for one attendance record.
  // Response includes: { is_valid: true/false }.
  const response = await api.post('/admin/verify-signature', {
    attendance_record_id: attendanceRecordId,
  })
  return response.data
}

export async function getFacultySessionPreview(qrToken) {
  // Preview endpoint: validate scanned token and return session details.
  const response = await api.get('/attendance/session-preview', {
    params: { qr_token: qrToken },
  })
  return response.data
}

export async function scanAttendance(qrToken, attendanceType = '') {
  // Final scan submit endpoint: records attendance for the scanned token.
  const payload = { qr_token: qrToken }
  if (attendanceType) {
    payload.attendance_type = attendanceType
  }
  const response = await api.post('/attendance/scan', payload)
  return response.data
}

export async function getMyAttendanceRecords() {
  // Faculty history endpoint for "My Attendance" page.
  const response = await api.get('/attendance/my-records')
  return response.data
}
