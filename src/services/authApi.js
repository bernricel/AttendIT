import api from './api'

export async function loginWithGoogle(payload) {
  const response = await api.post('/auth/google-login/', payload)
  return response.data
}

export async function loginAdmin(payload) {
  const response = await api.post('/auth/admin-login/', payload)
  return response.data
}

export async function completeProfile(payload) {
  const response = await api.post('/auth/complete-profile/', payload)
  return response.data
}
