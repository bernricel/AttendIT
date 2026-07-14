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
  multiple = false,
  readOnly = false,
  helperText = '',
}) {
  return (
    <label className={`${common.fieldBlock} ${styles.fieldBlock}`.trim()} htmlFor={id}>
      <span className={`${common.fieldLabel} ${styles.fieldLabel}`.trim()}>{label}</span>
      {options ? (
        <select
          id={id}
          className={`${common.inputControl} ${common.selectControl} ${styles.inputControl}`.trim()}
          value={value}
          onChange={onChange}
          disabled={disabled}
          multiple={multiple}
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
          readOnly={readOnly}
        />
      )}
      {helperText ? <small>{helperText}</small> : null}
    </label>
  )
}
