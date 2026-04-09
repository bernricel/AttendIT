import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

export default function LayoutPageMeta({ title, subtitle = '', actions = null }) {
  const { setPageMeta } = useOutletContext() || {}

  useEffect(() => {
    if (!setPageMeta) {
      return
    }

    // Each page pushes its title/subtitle/actions to the persistent shared layout.
    setPageMeta({ title, subtitle, actions })
  }, [actions, setPageMeta, subtitle, title])

  return null
}
