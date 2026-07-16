export function getAccountType(email) {
  const normalized = String(email || '').trim().toLowerCase()

  if (normalized.includes('.student@ua.edu.ph') || normalized.endsWith('.student@ua.edu.ph')) {
    return 'Student'
  }

  if (normalized.endsWith('@ua.edu.ph')) {
    return 'Employee'
  }

  return 'User'
}
