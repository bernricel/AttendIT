import styles from './AdminStatCard.module.css'

export default function AdminStatCard({ label, value, tone = 'blue', hint }) {
  return (
    <article className={`${styles.adminStatCard} ${styles[tone] || ''}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  )
}
