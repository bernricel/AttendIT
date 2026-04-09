import { useCallback, useEffect, useState } from 'react'

const MOBILE_MEDIA_QUERY = '(max-width: 860px)'

export function useResponsiveSidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches
  })

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handleMediaQueryChange = (event) => {
      setIsMobileViewport(event.matches)
    }

    setIsMobileViewport(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleMediaQueryChange)

    return () => mediaQuery.removeEventListener('change', handleMediaQueryChange)
  }, [])

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined
    }

    // Keep keyboard UX accessible by allowing Escape to close the mobile drawer.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSidebarOpen])

  return {
    isMobileViewport,
    isSidebarOpen,
    closeSidebar,
    toggleSidebar,
  }
}
