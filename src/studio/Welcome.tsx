import './Welcome.scss'
import HostChip from './HostChip'
import type { StudioTab } from './constants'

interface Props {
  userName: string
  hostShort: string
  onSelect: (t: StudioTab) => void
}

interface Card {
  id: StudioTab
  label: string
  desc: string
}

const CARDS: Card[] = [
  {
    id: 'app',
    label: 'Full App',
    desc: 'Embed the entire ThoughtSpot experience — search, Liveboards, data, and navigation.',
  },
  {
    id: 'liveboard',
    label: 'Liveboard',
    desc: 'Embed a single Liveboard with its visualizations, tabs, and runtime filters.',
  },
  {
    id: 'viz',
    label: 'Visualization',
    desc: 'Embed one visualization out of a Liveboard, by its viz ID.',
  },
  {
    id: 'search',
    label: 'Search',
    desc: 'Embed the Search experience bound to a worksheet or model data source.',
  },
  {
    id: 'answer',
    label: 'Answer',
    desc: 'Embed a saved Answer, by its ID, in the Search experience it was saved from.',
  },
  {
    id: 'spotter',
    label: 'Spotter',
    desc: 'Embed the conversational AI assistant for natural-language analytics.',
  },
  {
    id: 'rest',
    label: 'REST API',
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
        <h1 className="welcome-title">Welcome, {first}.</h1>
        <p className="welcome-lede">
          This studio embeds ThoughtSpot into a host app and lets you drive it live — fire host
          events, watch the event stream, and exercise the REST API. Pick an experience to embed to
          get started.
        </p>
        {hostShort && <HostChip host={hostShort} label="Connected to" className="welcome-host" />}

        <div className="welcome-grid">
          {CARDS.map((c) => (
            <button key={c.id} className="welcome-card" onClick={() => onSelect(c.id)}>
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
      </div>
    </div>
  )
}
