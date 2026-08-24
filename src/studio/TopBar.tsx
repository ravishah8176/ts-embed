import { useState } from 'react'
import './TopBar.scss'
import type { StudioTab } from './constants'
import { initials } from './constants'
import HostChip from './HostChip'
import Typography from './Typography'
import {
  applyThemeMode,
  setStoredThemeMode,
  storedThemeMode,
  type ThemeMode,
} from '../theme/userThemePreference'

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

/* 'Auto' rather than 'System' — it sits in a 3-up control where the label has to
   stay short, and it reads as "follows the OS" either way. */
const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'Auto' },
  { id: 'dark', label: 'Dark' },
]

const TAB_DEFS: { id: StudioTab; label: string }[] = [
  { id: 'app', label: 'Full App' },
  { id: 'liveboard', label: 'Liveboard' },
  { id: 'search', label: 'Search' },
  { id: 'spotter', label: 'Spotter' },
  { id: 'rest', label: 'REST API' },
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

  const [themeMode, setThemeMode] = useState<ThemeMode>(storedThemeMode)

  function chooseTheme(next: ThemeMode) {
    setThemeMode(next)
    setStoredThemeMode(next)
    applyThemeMode(next)
  }

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
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="tb-spacer" />

      <HostChip host={hostShort} />

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
            <div className="tb-menu-theme">
              <Typography variant="footnote" color="secondary" as="span">
                Appearance
              </Typography>
              <div className="tb-theme-seg">
                {THEME_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    className={'tb-theme-btn' + (themeMode === o.id ? ' tb-theme-btn-on' : '')}
                    onClick={() => chooseTheme(o.id)}
                    aria-pressed={themeMode === o.id}
                  >
                    {o.label}
                  </button>
                ))}
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
