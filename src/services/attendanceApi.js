import api from './api'

export async function createAttendanceSession(payload) {
  const response = await api.post('/admin/create-session', payload)
  return response.data
}

export async function getAdminSessions() {
  const response = await api.get('/admin/sessions')
  return response.data
}

export async function getAdminSessionQrStatus(sessionId) {
  const response = await api.get(`/admin/sessions/${sessionId}/qr-status`)
  return response.data
}

export async function getAttendanceByDate(date) {
  const response = await api.get('/admin/attendance-by-date', { params: { date } })
  return response.data
}

export async function verifyAttendanceSignature(attendanceRecordId) {
  const response = await api.post('/admin/verify-signature', {
    attendance_record_id: attendanceRecordId,
  })
  return response.data
}

export async function getFacultySessionPreview(qrToken) {
  const response = await api.get('/attendance/session-preview', {
    params: { qr_token: qrToken },
  })
  return response.data
}

export async function scanAttendance(qrToken, attendanceType = '') {
  const payload = { qr_token: qrToken }
  if (attendanceType) {
    payload.attendance_type = attendanceType
  }
  const response = await api.post('/attendance/scan', payload)
  return response.data
}

export async function getMyAttendanceRecords() {
  const response = await api.get('/attendance/my-records')
  return response.data
}
