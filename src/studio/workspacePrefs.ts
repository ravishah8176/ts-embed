import type { EmbedType } from './constants'
import type { SidePanelTab } from './SidePanelTabs'

/**
 * Which embed the user was looking at, kept across a page load.
 *
 * Switching the Visual Embed SDK reloads the page — the SDK holds module-level
 * state, so a version can only change on a fresh document. Without this, that
 * reload dropped the user back on the Welcome screen and they had to re-open the
 * embed they were testing, which is most of the cost of trying another version.
 *
 * Session storage, not local: reopening the app in a new tab still starts at
 * Welcome, while a reload — deliberate or ours — comes back where it was.
 */
const STORE_KEY = 'ts_embed_workspace_v1'

export interface Workspace {
  embedType: EmbedType | null
  restMode: boolean
  panelTab: SidePanelTab
}

const EMPTY: Workspace = { embedType: null, restMode: false, panelTab: 'config' }

const EMBED_TYPES: EmbedType[] = ['liveboard', 'search', 'app', 'spotter']
const PANEL_TABS: SidePanelTab[] = ['config', 'events', 'log']

/** Both accessors swallow their errors: with site data disabled the app just always starts at Welcome. */
export function storedWorkspace(): Workspace {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<Workspace>
    return {
      embedType: EMBED_TYPES.includes(parsed.embedType as EmbedType) ? (parsed.embedType as EmbedType) : null,
      restMode: parsed.restMode === true,
      panelTab: PANEL_TABS.includes(parsed.panelTab as SidePanelTab) ? (parsed.panelTab as SidePanelTab) : 'config',
    }
  } catch {
    return { ...EMPTY }
  }
}

export function setStoredWorkspace(next: Workspace) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    /* empty */
  }
}
