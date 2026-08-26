/**
 * Theme mode: the user's choice, and the DOM state it resolves to.
 *
 * Radiant's contract is a single attribute — `data-theme="dark"` on the <html>
 * element, absent for light. Every colour in the app is a `--rd-sys-color-*`
 * custom property, and `src/styles/_theme-init.scss` declares both palettes, so
 * toggling that one attribute re-resolves the whole app. Nothing else needs to
 * know a theme changed.
 *
 * The attribute goes on <html> rather than <body> because that is what the
 * stylesheet selector targets, and because anything portalled outside #root
 * still inherits from it.
 *
 * Note this controls the Studio's own chrome only. Embedded ThoughtSpot content
 * renders in an iframe with its own document, and is themed through the Visual
 * Embed SDK's customisation options instead.
 */
export type ThemeMode = 'light' | 'dark' | 'system'

const STORE_KEY = 'ts_embed_theme_v1'
const MODES: ThemeMode[] = ['light', 'dark', 'system']

/** Default is 'system' so a first-time user gets whatever their OS already says. */
const DEFAULT_MODE: ThemeMode = 'system'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Local, not session: an appearance choice should outlive the tab that made it. */
export function storedThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return MODES.includes(raw as ThemeMode) ? (raw as ThemeMode) : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

/** Swallows its error the same way workspacePrefs does: with site data disabled the choice just doesn't persist. */
export function setStoredThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(STORE_KEY, mode)
  } catch {
    /* empty */
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches
  } catch {
    return false
  }
}

export function resolveEffectiveDark(mode: ThemeMode): boolean {
  return mode === 'system' ? prefersDark() : mode === 'dark'
}

/** Writes the one attribute the stylesheet keys off. Removing it is what "light" means. */
export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  if (resolveEffectiveDark(mode)) {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }
}

export function isDarkModeActive(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

/**
 * Applies the stored choice and keeps it honest afterwards.
 *
 * Called from main.tsx before the first render so the correct palette is in
 * place on the initial paint — applying it inside a component would flash light
 * first. The media listener only matters while the mode is 'system'; it is
 * registered once for the life of the document rather than added and removed as
 * the mode changes.
 */
export function initTheme() {
  applyThemeMode(storedThemeMode())

  try {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (storedThemeMode() === 'system') applyThemeMode('system')
    })
  } catch {
    /* empty */
  }
}
