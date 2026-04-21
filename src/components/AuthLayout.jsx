import styles from './AuthLayout.module.css'

export default function AuthLayout({ title, subtitle, children, sideNote }) {
  return (
    <main className={styles.authPage}>
      <section className={styles.authBrandPanel}>
        <span className={styles.brandTag}>Faculty Attendance System</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {sideNote ? <div className={styles.brandSideNote}>{sideNote}</div> : null}
      </section>
      <section className={styles.authFormPanel}>{children}</section>
    </main>
  )
}
