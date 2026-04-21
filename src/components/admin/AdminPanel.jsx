import styles from './AdminPanel.module.css'

export default function AdminPanel({ title, subtitle, children }) {
  return (
    <section className={styles.adminPanel}>
      {(title || subtitle) && (
        <header className={styles.adminPanelHeader}>
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  )
}
