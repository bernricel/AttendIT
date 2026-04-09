export const recurrenceOptions = [
  { value: 'weekdays', label: 'Monday to Friday' },
  { value: 'mwf', label: 'MWF' },
  { value: 'tth', label: 'TTH' },
  { value: 'custom', label: 'Custom weekdays' },
]

export const customWeekdayOptions = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

function resolveWeekdays(recurrencePattern, customWeekdays) {
  if (recurrencePattern === 'weekdays') return new Set([0, 1, 2, 3, 4])
  if (recurrencePattern === 'mwf') return new Set([0, 2, 4])
  if (recurrencePattern === 'tth') return new Set([1, 3])
  return new Set(customWeekdays)
}

function ensureTimeOrder(startTime, endTime, label) {
  if (!startTime || !endTime) {
    return `Please provide ${label} start and end times.`
  }
  if (startTime >= endTime) {
    return `${label} end time must be later than ${label} start time.`
  }
  return ''
}

export function validateSessionForm(form) {
  if (!form.title.trim()) {
    return 'Session title is required.'
  }

  const interval = Number(form.qr_refresh_interval_seconds)
  if (!Number.isInteger(interval) || interval < 1) {
    return 'QR refresh interval must be a whole number greater than 0.'
  }

  const scheduledError = ensureTimeOrder(form.scheduled_start_time, form.scheduled_end_time, 'Scheduled')
  if (scheduledError) return scheduledError

  const checkInError = ensureTimeOrder(form.check_in_start_time, form.check_in_end_time, 'Check-in')
  if (checkInError) return checkInError

  const checkOutError = ensureTimeOrder(form.check_out_start_time, form.check_out_end_time, 'Check-out')
  if (checkOutError) return checkOutError

  if (
    form.late_threshold_time < form.check_in_start_time ||
    form.late_threshold_time > form.check_in_end_time
  ) {
    return 'Late threshold must be within the check-in window.'
  }

  if (!form.is_recurring) {
    if (!form.session_date) {
      return 'Please provide a session date.'
    }
    return ''
  }

  if (!form.recurrence_start_date || !form.recurrence_end_date) {
    return 'Please complete recurrence date range fields.'
  }

  if (form.recurrence_start_date > form.recurrence_end_date) {
    return 'Recurring end date must be on or after recurring start date.'
  }

  if (form.recurrence_pattern === 'custom' && form.recurrence_days.length === 0) {
    return 'Select at least one weekday for custom recurrence.'
  }

  return ''
}

export function buildSessionPayload(form) {
  const basePayload = {
    title: form.title,
    scheduled_start_time: `${form.scheduled_start_time}:00`,
    scheduled_end_time: `${form.scheduled_end_time}:00`,
    check_in_start_time: `${form.check_in_start_time}:00`,
    check_in_end_time: `${form.check_in_end_time}:00`,
    late_threshold_time: `${form.late_threshold_time}:00`,
    check_out_start_time: `${form.check_out_start_time}:00`,
    check_out_end_time: `${form.check_out_end_time}:00`,
    is_active: form.is_active,
    qr_refresh_interval_seconds: Number(form.qr_refresh_interval_seconds),
  }

  if (!form.is_recurring) {
    return {
      ...basePayload,
      is_recurring: false,
      session_date: form.session_date,
    }
  }

  return {
    ...basePayload,
    is_recurring: true,
    recurrence_pattern: form.recurrence_pattern,
    recurrence_days: form.recurrence_pattern === 'custom' ? form.recurrence_days : [],
    recurrence_start_date: form.recurrence_start_date,
    recurrence_end_date: form.recurrence_end_date,
  }
}

export function getRecurringPreviewCount(form) {
  if (!form.is_recurring || !form.recurrence_start_date || !form.recurrence_end_date) return 0

  const weekdays = resolveWeekdays(form.recurrence_pattern, form.recurrence_days)
  if (weekdays.size === 0) return 0

  const startDate = new Date(`${form.recurrence_start_date}T00:00:00`)
  const endDate = new Date(`${form.recurrence_end_date}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return 0
  }

  let count = 0
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const weekday = (cursor.getDay() + 6) % 7
    if (weekdays.has(weekday)) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}
