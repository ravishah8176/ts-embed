import { initials } from './constants'

interface Props {
  userName: string
  userEmail: string
  hostShort: string
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onBack: () => void
  onSignOut: () => void
}

const fieldCardStyle = { border: '1px solid #EEF0F3', borderRadius: 12, padding: 15 } as const
const fieldLabelStyle = { fontSize: 12, fontWeight: 600, color: '#9AA4B2', marginBottom: 6 } as const

export default function ProfileView({ userName, userEmail, hostShort, onNameChange, onEmailChange, onBack, onSignOut }: Props) {
  return (
    <div className="tss" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', color: '#5A6573', fontSize: 13, fontWeight: 600, padding: '6px 0', marginBottom: 18 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to workspace
        </button>

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
                {initials(userName)}
              </span>
              <div style={{ paddingBottom: 6, minWidth: 0 }}>
                <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.02em' }}>{userName}</div>
                <div style={{ fontSize: 14, color: '#7A8694' }}>{userEmail}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 26 }}>
              <div style={fieldCardStyle}>
                <div style={fieldLabelStyle}>Full name</div>
                <input className="ts-input" value={userName} onChange={(e) => onNameChange(e.target.value)} style={{ padding: '9px 11px', borderRadius: 9 }} />
              </div>
              <div style={fieldCardStyle}>
                <div style={fieldLabelStyle}>Email</div>
                <input className="ts-input" value={userEmail} onChange={(e) => onEmailChange(e.target.value)} style={{ padding: '9px 11px', borderRadius: 9 }} />
              </div>
              <div style={fieldCardStyle}>
                <div style={fieldLabelStyle}>Authenticated cluster</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 9 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#12875A', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: '#3A4452', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {hostShort}
                  </span>
                </div>
              </div>
            </div>

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
