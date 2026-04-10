export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  // Utility: extract a user-friendly message from common API error shapes.
  const responseData = error?.response?.data
  const serializerErrors = responseData?.errors || responseData

  if (serializerErrors && typeof serializerErrors === 'object') {
    const firstKey = Object.keys(serializerErrors)[0]
    if (firstKey) {
      const value = serializerErrors[firstKey]
      if (Array.isArray(value) && value.length > 0) {
        return `${firstKey}: ${value[0]}`
      }
      if (typeof value === 'string') {
        return `${firstKey}: ${value}`
      }
    }
  }

  return (
    // Fallback chain keeps error display consistent across all pages/services.
    responseData?.message ||
    responseData?.detail ||
    error?.message ||
    fallback
  )
}
