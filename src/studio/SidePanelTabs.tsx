export type SidePanelTab = 'config' | 'events' | 'log'

/** Full names, for the tooltip on each tab — the strip itself shows short ones. */
export const PANEL_TAB_LABEL: Record<SidePanelTab, string> = {
  config: 'Embed config',
  events: 'Host events',
  log: 'Embed event log',
}

/** Short in the strip: three tabs have to fit the panel at its narrowest. */
const TABS: { id: SidePanelTab; label: string }[] = [
  { id: 'config', label: 'Config' },
  { id: 'events', label: 'Host events' },
  { id: 'log', label: 'Log' },
]

/**
 * Tab strip shared by the three left-panel tools, which are separate components
 * because they own very different state but occupy the same slot.
 *
 * Rendered once around them rather than by each of them, so the strip and the
 * collapse control — both of which act on the panel, not on whatever tab is open —
 * exist in one place.
 *
 * The log's row count rides on its tab, since events keep arriving while one of
 * the other tabs is open and would otherwise be invisible.
 */
export default function SidePanelTabs({
  active,
  onSwitch,
  onCollapse,
  logCount = 0,
}: {
  active: SidePanelTab
  onSwitch: (tab: SidePanelTab) => void
  onCollapse: () => void
  logCount?: number
}) {
  return (
    <div className="spt-strip" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={'spt-tab' + (active === tab.id ? ' on' : '')}
          onClick={() => onSwitch(tab.id)}
          title={PANEL_TAB_LABEL[tab.id]}
        >
          {/* Own element so the label can ellipsize without taking the badge with it. */}
          <span className="spt-tab-label">{tab.label}</span>
          {tab.id === 'log' && logCount > 0 && <span className="spt-badge">{logCount}</span>}
        </button>
      ))}
      <button className="spt-collapse" onClick={onCollapse} title="Collapse panel">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="11 17 6 12 11 7" />
          <polyline points="18 17 13 12 18 7" />
        </svg>
      </button>
    </div>
  )
}
