import './Toast.scss'

export interface ToastData {
  text: string
  sub: string
  color: string
}

export default function Toast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null
  return (
    <div className="anim-fade toast-bar">
      <span className="toast-dot" style={{ background: toast.color }} />
      <span className="toast-text">{toast.text}</span>
      <span className="toast-sub">{toast.sub}</span>
    </div>
  )
}
