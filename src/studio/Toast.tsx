import './Toast.scss'

export interface ToastData {
  text: string
  sub: string
  color: string
}

export default function Toast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null
  return (
    <div
      className="anim-fade"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#0E1116',
        color: '#fff',
        borderRadius: 11,
        padding: '11px 16px',
        boxShadow: '0 12px 34px rgba(14,17,22,.32)',
        maxWidth: 540,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: toast.color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.text}</span>
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 11.5,
          color: 'rgba(255,255,255,.55)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {toast.sub}
      </span>
    </div>
  )
}
