import { useState } from 'react'
import './TopBar.scss'
import { ORG_SWITCH_NEEDS_PASSWORD, type OrgInfo } from '../auth/AuthContext'
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
  orgs: OrgInfo[]
  currentOrg: OrgInfo | null
  canSwitchOrg: boolean
  /** Resolves only on failure — a successful switch reloads the page. */
  onSwitchOrg: (orgId: number, password?: string) => Promise<void>
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
  orgs,
  currentOrg,
  canSwitchOrg,
  onSwitchOrg,
}: Props) {
  const userFirst = (userName || 'User').split(' ')[0]
  const userInitials = initials(userName)

  const [themeMode, setThemeMode] = useState<ThemeMode>(storedThemeMode)

  const [orgListOpen, setOrgListOpen] = useState(false)
  /** The Org awaiting a password — set only when the backend asks for one. */
  const [pendingOrg, setPendingOrg] = useState<OrgInfo | null>(null)
  const [orgPassword, setOrgPassword] = useState('')
  const [orgBusy, setOrgBusy] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)

  function chooseTheme(next: ThemeMode) {
    setThemeMode(next)
    setStoredThemeMode(next)
    applyThemeMode(next)
  }

  /**
   * A successful switch reloads the page, so nothing after `await` runs on the
   * happy path — every branch below is a failure. `ORG_SWITCH_NEEDS_PASSWORD` is
   * the backend saying it can mint the token but needs the credential first.
   */
  async function switchTo(org: OrgInfo, password?: string) {
    setOrgBusy(true)
    setOrgError(null)
    try {
      await onSwitchOrg(org.id, password)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message === ORG_SWITCH_NEEDS_PASSWORD) {
        setPendingOrg(org)
      } else {
        setPendingOrg(null)
        setOrgError(message)
      }
    } finally {
      setOrgBusy(false)
    }
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
            {canSwitchOrg && (
              <>
                <div className="tb-menu-sep" />
                <div className="tb-menu-org">
                  <Typography variant="footnote" color="secondary" as="span">
                    Organization
                  </Typography>
                  <button
                    className="tb-org-current"
                    onClick={() => setOrgListOpen((o) => !o)}
                    aria-expanded={orgListOpen}
                    disabled={orgBusy}
                  >
                    <span className="tb-org-name">{currentOrg?.name ?? 'Unknown'}</span>
                    <svg
                      className={'tb-org-caret' + (orgListOpen ? ' tb-org-caret-open' : '')}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {orgListOpen && (
                    <div className="tb-org-list">
                      {orgs.map((org) => {
                        const on = org.id === currentOrg?.id
                        return (
                          <button
                            key={org.id}
                            className={'tb-org-item' + (on ? ' tb-org-item-on' : '')}
                            onClick={() => {
                              if (!on) void switchTo(org)
                            }}
                            disabled={orgBusy || on}
                          >
                            <span className="tb-org-check">{on ? '\u2713' : ''}</span>
                            <span className="tb-org-item-name">{org.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Only reachable without TS_SECRET_KEY: the token backend holds no
                      password, and a token session cannot switch Org on its own. */}
                  {pendingOrg && (
                    <form
                      className="tb-org-auth"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void switchTo(pendingOrg, orgPassword)
                      }}
                    >
                      <Typography variant="footnote" color="secondary" as="span">
                        Confirm your password to sign in to {pendingOrg.name}
                      </Typography>
                      <input
                        className="tb-org-password"
                        type="password"
                        autoComplete="current-password"
                        value={orgPassword}
                        onChange={(e) => setOrgPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                      />
                      <div className="tb-org-auth-actions">
                        <button
                          type="button"
                          className="tb-org-cancel"
                          onClick={() => {
                            setPendingOrg(null)
                            setOrgPassword('')
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="tb-org-confirm" disabled={orgBusy || !orgPassword}>
                          {orgBusy ? 'Switching\u2026' : 'Switch'}
                        </button>
                      </div>
                    </form>
                  )}

                  {orgError && <div className="tb-org-error">{orgError}</div>}
                </div>
              </>
            )}
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
