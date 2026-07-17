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

export function isAdminUser(user) {
  const role = String(user?.role || '').toLowerCase()
  return Boolean(
    user &&
      (role === 'admin' ||
        role === 'superadmin' ||
        user.is_staff === true ||
        user.is_superuser === true ||
        user.is_admin === true),
  )
}
