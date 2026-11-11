'use client'

import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

// Ported from Botcamp. This site has no ThemeProvider: the theme lives in
// `data-theme` on <html> (set pre-paint by the root layout, flipped by the
// site's ThemeToggle), so the hook just follows that attribute.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

// Botcamp's useTheme returns dark during server render and before mount.
function getServerSnapshot(): Theme {
  return 'dark'
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { theme, toggleTheme: () => {} }
}
