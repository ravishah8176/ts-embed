import './TopBar.scss'
import type { StudioTab } from './constants'
import { initials } from './constants'

interface Props {
  activeTab: StudioTab | null
  onSwitchEmbed: (t: StudioTab) => void
  onHome: () => void
  hostShort: string
  userName: string
  userEmail: string
  avatarOpen: boolean
  onToggleAvatar: () => void
  onOpenProfile: () => void
  onSignOut: () => void
}

const TAB_DEFS: { id: StudioTab; label: string; dot: string }[] = [
  { id: 'app', label: 'Full App', dot: '#2B5BF4' },
  { id: 'liveboard', label: 'Liveboard', dot: '#12B886' },
  { id: 'search', label: 'Search', dot: '#7C5CFC' },
  { id: 'spotter', label: 'Spotter', dot: '#EC4899' },
  { id: 'rest', label: 'REST API', dot: '#F59E0B' },
]

export default function TopBar({
  activeTab,
  onSwitchEmbed,
  onHome,
  hostShort,
  userName,
  userEmail,
  avatarOpen,
  onToggleAvatar,
  onOpenProfile,
  onSignOut,
}: Props) {
  const userFirst = (userName || 'User').split(' ')[0]
  const userInitials = initials(userName)

  return (
    <header className="tb-header">
      <button className="hover-soft tb-home" onClick={onHome} title="Go to home">
        <div className="tb-logo">
          <div className="tb-logo-dot" />
        </div>
        <div className="tb-brand">
          ThoughtSpot <span className="tb-brand-sub">Embed Studio</span>
        </div>
      </button>

      {/* Hidden on the landing page (no tab active) — the Welcome screen drives selection. */}
      {activeTab !== null && (
        <div className="tb-tabs">
          {TAB_DEFS.map((t) => {
            const on = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onSwitchEmbed(t.id)}
                className={'tb-tab' + (on ? ' tb-tab-on' : '')}
              >
                <span className="tb-tab-dot" style={{ ['--tb-dot' as never]: t.dot }} />
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="tb-spacer" />

      <div className="tb-host">
        <span className="tb-host-pulse" />
        <span className="tb-host-text">{hostShort}</span>
      </div>

      <div className="tb-avatar-wrap">
        <button className="hover-soft tb-avatar-btn" onClick={onToggleAvatar}>
          <span className="tb-avatar-name">{userFirst}</span>
          <span className="tb-avatar">{userInitials}</span>
        </button>

        {avatarOpen && (
          <div className="anim-fade tb-menu">
            <div className="tb-menu-head">
              <span className="tb-menu-avatar">{userInitials}</span>
              <div className="tb-menu-id">
                <div className="tb-menu-name">{userName}</div>
                <div className="tb-menu-email">{userEmail}</div>
              </div>
            </div>
            <div className="tb-menu-sep" />
            <button className="menu-item tb-menu-item" onClick={onOpenProfile}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
              </svg>
              Profile
            </button>
            <button className="menu-item danger tb-menu-item tb-menu-item-danger" onClick={onSignOut}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
