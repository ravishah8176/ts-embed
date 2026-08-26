import { useEffect, useState } from 'react'
import { isDarkModeActive } from './userThemePreference'

/**
 * Whether the dark palette is currently active.
 *
 * Components should almost never need this — colours resolve through
 * `--rd-sys-color-*`, so CSS handles the flip on its own. It exists for the
 * cases CSS cannot reach: a value that has to be computed in JS, or a prop
 * handed to a third-party widget that takes a colour rather than inheriting one.
 *
 * It watches the attribute rather than subscribing to a store, so it stays
 * correct no matter who set the theme — the preference UI, `initTheme` on load,
 * or an OS-level change while the mode is 'system'. That also means there is no
 * context to thread through the tree.
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(isDarkModeActive)

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(isDarkModeActive()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // The attribute may have changed between the initial render and this effect.
    setIsDark(isDarkModeActive())

    return () => observer.disconnect()
  }, [])

  return isDark
}
