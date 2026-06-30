import './Welcome.scss'
import type { StudioTab } from './constants'

interface Props {
  userName: string
  hostShort: string
  onSelect: (t: StudioTab) => void
}

interface Card {
  id: StudioTab
  label: string
  dot: string
  desc: string
}

const CARDS: Card[] = [
  {
    id: 'app',
    label: 'Full App',
    dot: '#2B5BF4',
    desc: 'Embed the entire ThoughtSpot experience — search, Liveboards, data, and navigation.',
  },
  {
    id: 'liveboard',
    label: 'Liveboard',
    dot: '#12B886',
    desc: 'Embed a single Liveboard with its visualizations, tabs, and runtime filters.',
  },
  {
    id: 'search',
    label: 'Search',
    dot: '#7C5CFC',
    desc: 'Embed the Search experience bound to a worksheet or model data source.',
  },
  {
    id: 'spotter',
    label: 'Spotter',
    dot: '#EC4899',
    desc: 'Embed the conversational AI assistant for natural-language analytics.',
  },
  {
    id: 'rest',
    label: 'REST API',
    dot: '#F59E0B',
    desc: 'Explore and test the v2 REST API — the TypeScript SDK or the hosted playground.',
  },
]

/**
 * Landing screen shown until the user picks something to embed. No embed is
 * mounted on load — the user chooses an experience here, which selects the tab.
 */
export default function Welcome({ userName, hostShort, onSelect }: Props) {
  const first = (userName || 'there').split(' ')[0]

  return (
    <div className="welcome tss">
      <div className="welcome-inner">
        <div className="welcome-badge">ThoughtSpot Embed Studio</div>
        <h1 className="welcome-title">Welcome, {first}.</h1>
        <p className="welcome-lede">
          This studio embeds ThoughtSpot into a host app and lets you drive it live — fire host
          events, watch the event stream, and exercise the REST API. Pick an experience to embed to
          get started.
        </p>
        {hostShort && (
          <div className="welcome-host">
            <span className="welcome-host-dot" />
            Connected to <span className="welcome-host-name">{hostShort}</span>
          </div>
        )}

        <div className="welcome-grid">
          {CARDS.map((c) => (
            <button key={c.id} className="welcome-card" onClick={() => onSelect(c.id)}>
              <span className="welcome-card-dot" style={{ background: c.dot }} />
              <span className="welcome-card-label">
                {c.label}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
              <span className="welcome-card-desc">{c.desc}</span>
            </button>
          ))}
        </div>

        <div className="welcome-hint">
          You can switch experiences anytime from the tabs in the top bar.
        </div>
      </div>
    </div>
  )
}
