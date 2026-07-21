import styles from "./AuthLayout.module.css";

export default function AuthLayout({ title, subtitle, children, sideNote }) {
  return (
    <main className={styles.authPage}>
      <section className={styles.authBrandPanel}>
        <img
          src="/syncin-icon.png"
          alt="Sync In logo"
          className={styles.brandLogo}
        />
        <span className={styles.brandTag}>Sync In Attendance Portal</span>

        <h1>{title}</h1>
        <p>{subtitle}</p>
        {sideNote ? (
          <div className={styles.brandSideNote}>{sideNote}</div>
        ) : null}
        <footer className={styles.publicCredits} aria-label="Development team">
          <strong>Development Team</strong>
          <div>
            <span>Bern Ricel B. Musngi</span>
            <small>Backend & Web Application Developer</small>
          </div>
          <div>
            <span>Joshua O. Parungao</span>
            <small>Mobile & Desktop Application Developer</small>
            <small>Contributing Backend Developer</small>
          </div>
          <div>
            <span>Lance Kyle A. Musngi</span>
            <small>Contributing Web Application Developer</small>
          </div>
        </footer>
      </section>
      <section className={styles.authFormPanel}>{children}</section>
    </main>
  );
}
