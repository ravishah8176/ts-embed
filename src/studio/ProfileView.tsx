import './ProfileView.scss'
import type { CSSProperties, ReactNode } from 'react'
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

const fieldCardStyle: CSSProperties = { border: '1px solid #EEF0F3', borderRadius: 12, padding: 15 }
const fieldLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#9AA4B2', marginBottom: 6 }
const valueStyle: CSSProperties = { fontSize: 14, color: '#1B2530', fontWeight: 600, wordBreak: 'break-word' }
const monoStyle: CSSProperties = { fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 500 }

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
    <div style={fieldCardStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ ...valueStyle, paddingTop: 3 }}>{children}</div>
    </div>
  )
}

function ChipCard({ label, items, mono }: { label: string; items: unknown[]; mono?: boolean }) {
  return (
    <div style={{ ...fieldCardStyle, marginTop: 14 }}>
      <div style={fieldLabelStyle}>{`${label} (${items.length})`}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 4 }}>
        {items.map((it, i) => (
          <span
            key={i}
            style={{
              fontSize: mono ? 11.5 : 12.5,
              fontWeight: 600,
              fontFamily: mono ? "'JetBrains Mono',monospace" : undefined,
              color: '#3A4452',
              background: '#F4F5F7',
              border: '1px solid #E4E7EC',
              borderRadius: 7,
              padding: '4px 10px',
            }}
          >
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
    <div className="tss" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <button className="sheet-close" onClick={onBack} aria-label="Close profile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ height: 104, background: 'linear-gradient(120deg, #0E1116, var(--accent-strong) 135%)' }} />
          <div style={{ padding: '0 28px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: -44 }}>
              <span
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, var(--accent), #7C5CFC)',
                  color: '#fff',
                  fontSize: 32,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #fff',
                  boxShadow: '0 8px 24px rgba(14,17,22,.16)',
                  flexShrink: 0,
                }}
              >
                {initials(displayName)}
              </span>
              <div style={{ paddingBottom: 6, minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.02em' }}>{displayName}</div>
                  {status && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '.03em',
                        textTransform: 'uppercase',
                        color: statusActive ? '#12875A' : '#B36B00',
                        background: statusActive ? '#E7F6EE' : '#FFF3E0',
                        borderRadius: 6,
                        padding: '3px 8px',
                      }}
                    >
                      {prettyEnum(status)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: '#7A8694' }}>{email}</div>
              </div>
            </div>

            {/* Connection (app-level, not part of the user object) */}
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9AA4B2', margin: '34px 0 12px' }}>
              Connection
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={fieldCardStyle}>
                <div style={fieldLabelStyle}>Authenticated cluster</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#12875A', flexShrink: 0 }} />
                  <span style={{ ...monoStyle, color: '#3A4452', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {hostShort}
                  </span>
                </div>
              </div>
              <ReadOnlyCard label="Authentication">Trusted Auth · Cookieless</ReadOnlyCard>
            </div>

            {/* Every scalar field from the session user */}
            {scalars.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9AA4B2', margin: '24px 0 12px' }}>
                  Account &amp; session
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {scalars.map(([k, v]) => {
                    const mono = /(^id$|_id$)/.test(k) || k === 'email'
                    return (
                      <ReadOnlyCard key={k} label={labelFor(k)}>
                        <span style={mono ? monoStyle : undefined}>{formatScalar(k, v)}</span>
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
                          <span style={{ ...monoStyle, color: '#9AA4B2', marginLeft: 8 }}>#{String(o.id)}</span>
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
                <div key={k} style={{ ...fieldCardStyle, marginTop: 14 }}>
                  <div style={fieldLabelStyle}>{labelFor(k)}</div>
                  <pre style={{ margin: 0, ...monoStyle, color: '#3A4452', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(o, null, 2)}
                  </pre>
                </div>
              ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
              <button
                className="menu-item danger"
                onClick={onSignOut}
                style={{ width: 'auto', background: '#fff', color: '#C0392B', border: '1px solid #F1C9C4', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700 }}
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
