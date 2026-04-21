import styles from './FormField.module.css'
import common from '../styles/common.module.css'

export default function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  options,
  disabled = false,
}) {
  return (
    <label className={`${common.fieldBlock} ${styles.fieldBlock}`.trim()} htmlFor={id}>
      <span className={`${common.fieldLabel} ${styles.fieldLabel}`.trim()}>{label}</span>
      {options ? (
        <select
          id={id}
          className={`${common.inputControl} ${styles.inputControl}`.trim()}
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={`${common.inputControl} ${styles.inputControl}`.trim()}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    </label>
  )
}
