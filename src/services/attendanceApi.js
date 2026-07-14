import api from './api'

export async function createAttendanceSession(payload) {
  // Admin creates a new attendance session (single or recurring).
  const response = await api.post('/admin/create-session', payload)
  return response.data
}

export async function getAdminSessions(params = {}) {
  // Fetch session list for admin dashboards and QR screens.
  const response = await api.get('/admin/sessions', { params })
  return response.data
}

export async function getAdminDepartments(params = {}) {
  const response = await api.get('/admin/departments', { params })
  return response.data
}

export async function createAdminDepartment(payload) {
  const response = await api.post('/admin/departments', payload)
  return response.data
}

export async function updateAdminDepartment(departmentId, payload) {
  const response = await api.patch(`/admin/departments/${departmentId}`, payload)
  return response.data
}

export async function createAdminProgram(departmentId, payload) {
  const response = await api.post(`/admin/departments/${departmentId}/programs`, payload)
  return response.data
}

export async function updateAdminProgram(programId, payload) {
  const response = await api.patch(`/admin/programs/${programId}`, payload)
  return response.data
}

export async function deleteAdminProgram(programId) {
  const response = await api.delete(`/admin/programs/${programId}`)
  return response.data
}

export async function createAdminSection(programId, payload) {
  const response = await api.post(`/admin/programs/${programId}/sections`, payload)
  return response.data
}

export async function updateAdminSection(sectionId, payload) {
  const response = await api.patch(`/admin/sections/${sectionId}`, payload)
  return response.data
}

export async function deleteAdminSection(sectionId) {
  const response = await api.delete(`/admin/sections/${sectionId}`)
  return response.data
}

export async function getAdminSessionQrStatus(sessionId) {
  // Fetch live QR token status for one session (token, expiry, countdown).
  const response = await api.get(`/admin/sessions/${sessionId}/qr-status`)
  return response.data
}

export async function getAttendanceByDate(params) {
  const response = await api.get('/admin/attendance-by-date', { params })
  return response.data
}

export async function getAdminAttendanceSheet(params = {}) {
  const response = await api.get('/admin/attendance-sheet', { params })
  return response.data
}

export async function exportAdminAttendanceSheetCsv(params = {}) {
  const response = await api.get('/admin/attendance-sheet/export-csv', {
    params,
    responseType: 'blob',
  })
  return {
    blob: response.data,
    contentDisposition: response.headers['content-disposition'] || '',
  }
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
  const response = await api.post('/attendance/preview/', {
    qr_token: qrToken,
  })
  return response.data
}

export async function scanAttendance(qrToken, attendanceType = '', sectionId = '') {
  // Final scan submit endpoint: records attendance for the scanned token.
  const payload = { qr_token: qrToken }
  if (attendanceType) {
    payload.attendance_type = attendanceType
  }
  if (sectionId) {
    payload.section_id = Number(sectionId)
  }
  const response = await api.post('/attendance/scan/', payload)
  return response.data
}

export async function getMyAttendanceRecords() {
  // Faculty history endpoint for "My Attendance" page.
  const response = await api.get('/attendance/my-records')
  return response.data
}
