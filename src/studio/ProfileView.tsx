import './ProfileView.scss'
import type { ReactNode } from 'react'
import type { SessionUser } from '../auth/AuthContext'
import { initials } from './constants'

interface Props {
  userName: string
  userEmail: string
  hostShort: string
  profile: SessionUser | null
  onBack: () => void
  onSignOut: () => void
}

/** Friendlier labels for known keys; everything else is humanized from snake_case. */
const LABELS: Record<string, string> = {
  id: 'User GUID',
  name: 'Username',
  display_name: 'Display name',
  email: 'Email',
  account_type: 'Account type',
  account_status: 'Account status',
  visibility: 'Visibility',
  super_user: 'Super user',
  system_user: 'System user',
  external: 'External user',
  preferred_locale: 'Locale',
  use_browser_language: 'Use browser language',
  tenant_id: 'Tenant ID',
  author_id: 'Author ID',
  owner_id: 'Owner ID',
  modifier_id: 'Modifier ID',
  parent_type: 'Parent type',
  can_change_password: 'Can change password',
  is_first_login: 'Is first login',
  notify_on_share: 'Notify on share',
  onboarding_experience_completed: 'Onboarding completed',
  show_onboarding_experience: 'Show onboarding',
  welcome_email_sent: 'Welcome email sent',
  group_mask: 'Group mask',
  current_org: 'Current org',
  home_liveboard: 'Home Liveboard',
  orgs: 'Organizations',
  user_groups: 'Groups',
  user_inherited_groups: 'Inherited groups',
  privileges: 'Privileges',
  tags: 'Tags',
  favorite_metadata: 'Favorites',
}

const WORD_OVERRIDES: Record<string, string> = {
  id: 'ID', guid: 'GUID', url: 'URL', tml: 'TML', org: 'Org', ai: 'AI', saml: 'SAML', api: 'API',
}

// Show key fields first; anything else falls in afterwards, alphabetically.
const ORDER = [
  'display_name', 'name', 'email', 'id', 'account_type', 'account_status', 'visibility',
  'super_user', 'system_user', 'external', 'preferred_locale', 'tenant_id', 'parent_type',
]

function isMillis(key: string): boolean {
  return /_in_millis$/.test(key) || /time.*millis/i.test(key)
}

function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return String(ms)
  }
}

function prettyEnum(v: string): string {
  return v
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function humanizeKey(key: string): string {
  const base = key.endsWith('_in_millis') ? key.slice(0, -'_in_millis'.length) : key
  return base
    .split(/[_\s]+/)
    .map((w) => WORD_OVERRIDES[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function labelFor(key: string): string {
  return LABELS[key] ?? humanizeKey(key)
}

function formatScalar(key: string, val: string | number | boolean): string {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number' && isMillis(key)) return fmtDate(val)
  if (typeof val === 'string' && /^[A-Z][A-Z0-9_]+$/.test(val)) return prettyEnum(val)
  return String(val)
}

/** Best-effort label for an array/object entry shown as a chip. */
function chipLabel(item: unknown): string {
  if (item === null || item === undefined) return '—'
  if (typeof item === 'object') {
    const o = item as Record<string, unknown>
    if (typeof o.name === 'string' && o.name) return o.name
    if (typeof o.id === 'string' || typeof o.id === 'number') return String(o.id)
    return JSON.stringify(o)
  }
  return String(item)
}

function ReadOnlyCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pv-field-card">
      <div className="pv-field-label">{label}</div>
      <div className="pv-field-value">{children}</div>
    </div>
  )
}

function ChipCard({ label, items, mono }: { label: string; items: unknown[]; mono?: boolean }) {
  return (
    <div className="pv-field-card pv-card-spaced">
      <div className="pv-field-label">{`${label} (${items.length})`}</div>
      <div className="pv-chip-row">
        {items.map((it, i) => (
          <span key={i} className={mono ? 'pv-chip pv-chip-mono' : 'pv-chip'}>
            {chipLabel(it)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ProfileView({ userName, userEmail, hostShort, profile, onBack, onSignOut }: Props) {
  const u: SessionUser = profile ?? {}

  const displayName = (typeof u.display_name === 'string' && u.display_name) || userName
  const email = (typeof u.email === 'string' && u.email) || userEmail
  const status = typeof u.account_status === 'string' ? u.account_status : ''
  const statusActive = status === 'ACTIVE'

  // Classify every field of the raw user object so nothing is dropped.
  const scalars: [string, string | number | boolean][] = []
  const objects: [string, Record<string, unknown>][] = []
  const arrays: [string, unknown[]][] = []
  for (const [k, v] of Object.entries(u)) {
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v)) {
      if (v.length) arrays.push([k, v])
    } else if (typeof v === 'object') {
      objects.push([k, v as Record<string, unknown>])
    } else {
      scalars.push([k, v as string | number | boolean])
    }
  }
  scalars.sort((a, b) => {
    const ai = ORDER.indexOf(a[0])
    const bi = ORDER.indexOf(b[0])
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a[0].localeCompare(b[0])
  })

  return (
    <div className="tss pv-root">
      <div className="pv-container">
        <div className="pv-close-row">
          <button className="sheet-close" onClick={onBack} aria-label="Close profile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        <div className="pv-card">
          <div className="pv-banner" />
          <div className="pv-card-body">
            <div className="pv-header">
              <span className="pv-avatar">
                {initials(displayName)}
              </span>
              <div className="pv-header-text">
                <div className="pv-header-name-row">
                  <div className="pv-name">{displayName}</div>
                  {status && (
                    <span className={statusActive ? 'pv-status pv-status-active' : 'pv-status pv-status-inactive'}>
                      {prettyEnum(status)}
                    </span>
                  )}
                </div>
                <div className="pv-email">{email}</div>
              </div>
            </div>

            {/* Connection (app-level, not part of the user object) */}
            <div className="pv-section-title">
              Connection
            </div>
            <div className="pv-grid">
              <div className="pv-field-card">
                <div className="pv-field-label">Authenticated cluster</div>
                <div className="pv-cluster-row">
                  <span className="pv-cluster-dot" />
                  <span className="pv-mono pv-cluster-host">
                    {hostShort}
                  </span>
                </div>
              </div>
              <ReadOnlyCard label="Authentication">Trusted Auth · Cookieless</ReadOnlyCard>
            </div>

            {/* Every scalar field from the session user */}
            {scalars.length > 0 && (
              <>
                <div className="pv-section-title pv-section-title-tight">
                  Account &amp; session
                </div>
                <div className="pv-grid">
                  {scalars.map(([k, v]) => {
                    const mono = /(^id$|_id$)/.test(k) || k === 'email'
                    return (
                      <ReadOnlyCard key={k} label={labelFor(k)}>
                        <span className={mono ? 'pv-mono' : undefined}>{formatScalar(k, v)}</span>
                      </ReadOnlyCard>
                    )
                  })}
                  {/* Single nested objects (current_org, home_liveboard, …) as name (#id) */}
                  {objects
                    .filter(([, o]) => typeof o.name === 'string')
                    .map(([k, o]) => (
                      <ReadOnlyCard key={k} label={labelFor(k)}>
                        {String(o.name)}
                        {o.id != null && (
                          <span className="pv-mono pv-obj-id">#{String(o.id)}</span>
                        )}
                      </ReadOnlyCard>
                    ))}
                </div>
              </>
            )}

            {/* Array fields as chip lists (orgs, groups, privileges, tags, favorites, …) */}
            {arrays.map(([k, items]) => (
              <ChipCard key={k} label={labelFor(k)} items={items} mono={k === 'privileges'} />
            ))}

            {/* Any nested object without a name — show raw so nothing is hidden */}
            {objects
              .filter(([, o]) => typeof o.name !== 'string')
              .map(([k, o]) => (
                <div key={k} className="pv-field-card pv-card-spaced">
                  <div className="pv-field-label">{labelFor(k)}</div>
                  <pre className="pv-mono pv-raw-json">
                    {JSON.stringify(o, null, 2)}
                  </pre>
                </div>
              ))}

            <div className="pv-signout-row">
              <button
                className="menu-item danger pv-signout-btn"
                onClick={onSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
