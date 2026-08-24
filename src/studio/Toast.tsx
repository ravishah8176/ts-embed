import './Toast.scss'

export interface ToastData {
  text: string
  sub: string
  color: string
}

/**
 * Auto-hides on a timer the caller owns; the close button is for the impatient, and
 * for the case where it lands over something the user was reading.
 */
export default function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  if (!toast) return null
  return (
    <div className="anim-fade toast-bar" role="status">
      <span className="toast-dot" style={{ background: toast.color }} />
      <span className="toast-text">{toast.text}</span>
      <span className="toast-sub">{toast.sub}</span>
      <button className="toast-close" onClick={onClose} title="Dismiss" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
