export default function AuthCard({ title, description, children, className = '' }) {
  return (
    <article className={`auth-card ${className}`.trim()}>
      <header className="auth-card-header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {/* Dedicated body wrapper keeps spacing rules contained to card content only. */}
      <div className="auth-card-body">{children}</div>
    </article>
  )
}
