import styles from './DataState.module.css'
import common from '../../styles/common.module.css'

export function DataLoading({ message = 'Loading...' }) {
  return <p className={`${common.dataState} ${common.loading} ${styles.dataState} ${styles.loading}`.trim()}>{message}</p>
}

export function DataEmpty({ message = 'No data available.' }) {
  return <p className={`${common.dataState} ${common.empty} ${styles.dataState} ${styles.empty}`.trim()}>{message}</p>
}

export function DataError({ message = 'Something went wrong.' }) {
  return <p className={`${common.dataState} ${common.error} ${styles.dataState} ${styles.error}`.trim()}>{message}</p>
}
