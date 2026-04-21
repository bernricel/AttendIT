import styles from './AuthCard.module.css'

export default function AuthCard({ title, description, children, className = '' }) {
  return (
    <article className={`${styles.authCard} ${className}`.trim()}>
      <header className={styles.authCardHeader}>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {/* Dedicated body wrapper keeps spacing rules contained to card content only. */}
      <div className={styles.authCardBody}>{children}</div>
    </article>
  )
}
