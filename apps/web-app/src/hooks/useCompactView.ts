import { useEffect, useState } from 'react'

const COMPACT_VIEW_KEY = 'workflow_compact_view'

export function useCompactView() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COMPACT_VIEW_KEY) === 'true'
    } catch {
      return false
    }
  })

  const toggleCompact = (value?: boolean) => {
    setIsCompact((prev) => {
      const next = value !== undefined ? value : !prev
      try {
        localStorage.setItem(COMPACT_VIEW_KEY, String(next))
        if (next) {
          document.documentElement.classList.add('compact-mode')
        } else {
          document.documentElement.classList.remove('compact-mode')
        }
      } catch {
        // silent
      }
      return next
    })
  }

  useEffect(() => {
    if (isCompact) {
      document.documentElement.classList.add('compact-mode')
    } else {
      document.documentElement.classList.remove('compact-mode')
    }
  }, [isCompact])

  return { isCompact, toggleCompact }
}
