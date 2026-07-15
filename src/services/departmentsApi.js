import api from "./api"

export async function getAdminDepartments(params = {}) {
  const response = await api.get("/admin/departments", { params })
  return response.data
}

export async function getAdminDepartment(departmentId) {
  const response = await api.get(`/admin/departments/${departmentId}`)
  return response.data
}

export async function createAdminDepartment(payload) {
  const response = await api.post("/admin/departments", payload)
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
