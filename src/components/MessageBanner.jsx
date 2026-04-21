import styles from './MessageBanner.module.css'

export default function MessageBanner({ type = 'info', message }) {
  if (!message) {
    return null
  }

  return <p className={`${styles.messageBanner} ${styles[type] || ''}`.trim()}>{message}</p>
}
