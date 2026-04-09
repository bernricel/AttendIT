import { useMemo, useState } from 'react'
import AdminPanel from '../components/admin/AdminPanel'
import FormField from '../components/FormField'
import LayoutPageMeta from '../components/layout/LayoutPageMeta'
import MessageBanner from '../components/MessageBanner'
import { createAttendanceSession } from '../services/attendanceApi'
import { getApiErrorMessage } from '../utils/apiError'
import {
  buildSessionPayload,
  customWeekdayOptions,
  getRecurringPreviewCount,
  recurrenceOptions,
  validateSessionForm,
} from '../utils/attendanceValidation'

export default function AdminCreateSessionPage() {
  const [form, setForm] = useState({
    title: '',
    session_date: '',
    scheduled_start_time: '',
    scheduled_end_time: '',
    check_in_start_time: '',
    check_in_end_time: '',
    late_threshold_time: '',
    check_out_start_time: '',
    check_out_end_time: '',
    is_active: true,
    qr_refresh_interval_seconds: 30,
    is_recurring: false,
    recurrence_pattern: 'weekdays',
    recurrence_days: [],
    recurrence_start_date: '',
    recurrence_end_date: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creationSummary, setCreationSummary] = useState(null)

  const updateField = (field) => (event) => {
    const value = field === 'is_active' || field === 'is_recurring' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleRecurringWeekday = (weekdayValue) => {
    setForm((prev) => {
      const exists = prev.recurrence_days.includes(weekdayValue)
      return {
        ...prev,
        recurrence_days: exists
          ? prev.recurrence_days.filter((value) => value !== weekdayValue)
          : [...prev.recurrence_days, weekdayValue].sort((a, b) => a - b),
      }
    })
  }

  const recurringPreviewCount = useMemo(() => getRecurringPreviewCount(form), [form])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')
    setCreationSummary(null)

    try {
      const validationMessage = validateSessionForm(form)
      if (validationMessage) {
        throw new Error(validationMessage)
      }

      const payload = buildSessionPayload(form)
      const data = await createAttendanceSession(payload)

      if (data.is_recurring) {
        setSuccess('Recurring sessions created successfully.')
        setCreationSummary(data.generation_summary || null)
      } else {
        setSuccess('Attendance session created successfully.')
      }

      // Keep recurrence mode and activation preferences, but clear generated rule values for the next entry.
      setForm((prev) => ({
        ...prev,
        title: '',
        session_date: '',
        scheduled_start_time: '',
        scheduled_end_time: '',
        check_in_start_time: '',
        check_in_end_time: '',
        late_threshold_time: '',
        check_out_start_time: '',
        check_out_end_time: '',
        recurrence_start_date: '',
        recurrence_end_date: '',
        recurrence_days: [],
      }))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to create session.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <LayoutPageMeta
        title="Create Attendance Session"
        subtitle="Create rule-based attendance sessions with check-in/check-out windows and recurrence."
      />
      <AdminPanel>
        <form className="profile-form" onSubmit={handleSubmit}>
          <FormField
            id="session_title"
            label="Session Title"
            value={form.title}
            onChange={updateField('title')}
            placeholder="Example: Faculty Daily Attendance"
            disabled={isSubmitting}
          />

          <label className="toggle-field" htmlFor="is_recurring">
            <input
              id="is_recurring"
              type="checkbox"
              checked={form.is_recurring}
              onChange={updateField('is_recurring')}
              disabled={isSubmitting}
            />
            <span>Recurring Session</span>
          </label>

          {!form.is_recurring ? (
            <FormField
              id="session_date"
              label="Session Date"
              type="date"
              value={form.session_date}
              onChange={updateField('session_date')}
              disabled={isSubmitting}
            />
          ) : null}

          <FormField
            id="scheduled_start_time"
            label="Scheduled Start Time"
            type="time"
            value={form.scheduled_start_time}
            onChange={updateField('scheduled_start_time')}
            disabled={isSubmitting}
          />
          <FormField
            id="scheduled_end_time"
            label="Scheduled End Time"
            type="time"
            value={form.scheduled_end_time}
            onChange={updateField('scheduled_end_time')}
            disabled={isSubmitting}
          />
          <FormField
            id="check_in_start_time"
            label="Check-in Start Time"
            type="time"
            value={form.check_in_start_time}
            onChange={updateField('check_in_start_time')}
            disabled={isSubmitting}
          />
          <FormField
            id="check_in_end_time"
            label="Check-in End Time"
            type="time"
            value={form.check_in_end_time}
            onChange={updateField('check_in_end_time')}
            disabled={isSubmitting}
          />
          <FormField
            id="late_threshold_time"
            label="Late Threshold Time"
            type="time"
            value={form.late_threshold_time}
            onChange={updateField('late_threshold_time')}
            disabled={isSubmitting}
          />
          <FormField
            id="check_out_start_time"
            label="Check-out Start Time"
            type="time"
            value={form.check_out_start_time}
            onChange={updateField('check_out_start_time')}
            disabled={isSubmitting}
          />
          <FormField
            id="check_out_end_time"
            label="Check-out End Time"
            type="time"
            value={form.check_out_end_time}
            onChange={updateField('check_out_end_time')}
            disabled={isSubmitting}
          />

          {form.is_recurring ? (
            <>
              <FormField
                id="recurrence_pattern"
                label="Recurrence Pattern"
                value={form.recurrence_pattern}
                onChange={updateField('recurrence_pattern')}
                options={recurrenceOptions}
                disabled={isSubmitting}
              />

              {form.recurrence_pattern === 'custom' ? (
                <label className="field-block">
                  <span className="field-label">Custom Weekdays</span>
                  <div className="calendar-actions">
                    {customWeekdayOptions.map((weekday) => (
                      <label key={weekday.value} className="toggle-field">
                        <input
                          type="checkbox"
                          checked={form.recurrence_days.includes(weekday.value)}
                          onChange={() => toggleRecurringWeekday(weekday.value)}
                          disabled={isSubmitting}
                        />
                        <span>{weekday.label}</span>
                      </label>
                    ))}
                  </div>
                </label>
              ) : null}

              <FormField
                id="recurrence_start_date"
                label="Recurrence Start Date"
                type="date"
                value={form.recurrence_start_date}
                onChange={updateField('recurrence_start_date')}
                disabled={isSubmitting}
              />
              <FormField
                id="recurrence_end_date"
                label="Recurrence End Date"
                type="date"
                value={form.recurrence_end_date}
                onChange={updateField('recurrence_end_date')}
                disabled={isSubmitting}
              />

              <p className="subtle-note">
                This will create approximately {recurringPreviewCount} scheduled occurrence
                {recurringPreviewCount === 1 ? '' : 's'} in the selected date range.
              </p>
            </>
          ) : null}

          <FormField
            id="qr_refresh_interval_seconds"
            label="QR Refresh Interval (seconds)"
            type="number"
            value={form.qr_refresh_interval_seconds}
            onChange={updateField('qr_refresh_interval_seconds')}
            placeholder="30"
            disabled={isSubmitting}
          />

          <label className="toggle-field" htmlFor="is_active">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={updateField('is_active')}
              disabled={isSubmitting}
            />
            <span>Activate session immediately</span>
          </label>

          <MessageBanner type="error" message={error} />
          <MessageBanner type="info" message={success} />

          {creationSummary ? (
            <p className="subtle-note">
              Created: {creationSummary.created_count} | Skipped duplicates: {creationSummary.skipped_duplicates}
            </p>
          ) : null}

          <p className="subtle-note">Department is fixed to CIT for this deployment.</p>

          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : form.is_recurring ? 'Create Recurring Sessions' : 'Create Session'}
          </button>
        </form>
      </AdminPanel>
    </>
  )
}
