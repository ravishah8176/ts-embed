import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initTheme } from './theme/userThemePreference'
import { resolveDefaultSdkVersions } from './thoughtspot/sdkLoader'

// Before the first render: applying the stored theme from inside a component
// would paint light and then flip.
initTheme()

/**
 * Also before the first render: which SDK version counts as the default is read
 * synchronously all over the app (sign-in loads the embed SDK straight away, the REST
 * tab seeds its picker from it), so it has to be settled before anything reads it.
 * It resolves against its own timeout and never rejects, so a slow network delays the
 * first paint rather than blocking it.
 */
resolveDefaultSdkVersions().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
