import './TopBar.scss'
import type { EmbedType } from './constants'
import { initials } from './constants'

interface Props {
  embedType: EmbedType
  onSwitchEmbed: (t: EmbedType) => void
  hostShort: string
  userName: string
  userEmail: string
  avatarOpen: boolean
  onToggleAvatar: () => void
  onOpenProfile: () => void
  onSignOut: () => void
}

const TAB_DEFS: { id: EmbedType; label: string; dot: string }[] = [
  { id: 'app', label: 'Full App', dot: '#2B5BF4' },
  { id: 'liveboard', label: 'Liveboard', dot: '#12B886' },
  { id: 'search', label: 'Search', dot: '#7C5CFC' },
  { id: 'spotter', label: 'Spotter', dot: '#EC4899' },
]

export default function TopBar({
  embedType,
  onSwitchEmbed,
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
    <header
      style={{
        height: 57,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '0 16px',
        background: '#fff',
        borderBottom: '1px solid #E4E7EC',
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: '#0E1116',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff' }} />
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-.02em' }}>
          ThoughtSpot <span style={{ fontWeight: 500, color: '#9AA4B2' }}>Embed Studio</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 3,
          background: '#F0F1F4',
          border: '1px solid #E4E7EC',
          borderRadius: 10,
          padding: 3,
          marginLeft: 6,
        }}
      >
        {TAB_DEFS.map((t) => {
          const on = embedType === t.id
          return (
            <button
              key={t.id}
              onClick={() => onSwitchEmbed(t.id)}
              style={{
                border: 'none',
                background: on ? '#fff' : 'transparent',
                color: on ? '#0E1116' : '#6B7686',
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: on ? '0 1px 2px rgba(14,17,22,.14)' : 'none',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 2, background: t.dot }} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: '#F4F5F7',
          border: '1px solid #E4E7EC',
          borderRadius: 9,
          padding: '6px 11px',
          fontSize: 12.5,
          color: '#3A4452',
          maxWidth: 300,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#12875A',
            boxShadow: '0 0 0 3px rgba(18,135,90,.16)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {hostShort}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          className="hover-soft"
          onClick={onToggleAvatar}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: '1px solid #E4E7EC',
            borderRadius: 999,
            padding: '4px 6px 4px 11px',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3A4452' }}>{userFirst}</span>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7C5CFC)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {userInitials}
          </span>
        </button>

        {avatarOpen && (
          <div
            className="anim-fade"
            style={{
              position: 'absolute',
              right: 0,
              top: 46,
              width: 236,
              background: '#fff',
              border: '1px solid #E4E7EC',
              borderRadius: 12,
              boxShadow: '0 16px 40px rgba(14,17,22,.16)',
              padding: 7,
              zIndex: 40,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 9px 11px' }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), #7C5CFC)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName}
                </div>
                <div style={{ fontSize: 12, color: '#7A8694', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userEmail}
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: '#EEF0F3', margin: '3px 0' }} />
            <button
              className="menu-item"
              onClick={onOpenProfile}
              style={{ padding: '9px 10px', fontSize: 13.5, fontWeight: 500, color: '#3A4452' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
              </svg>
              Profile
            </button>
            <button
              className="menu-item danger"
              onClick={onSignOut}
              style={{ padding: '9px 10px', fontSize: 13.5, fontWeight: 500, color: '#C0392B' }}
            >
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
