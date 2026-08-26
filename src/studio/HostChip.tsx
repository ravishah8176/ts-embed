import './HostChip.scss'

/**
 * The connected-host indicator, at Radiant's chip spec.
 *
 * Existed twice — the top bar's `.tb-host` and the Welcome screen's
 * `.welcome-host` — as two copies of one pill carrying two copies of the status
 * dot. One component instead, because the fact being shown is the same fact.
 *
 * Radiant ships no bold status *background* token, so the dot's fill is the
 * `$rd-ref-green-60` primitive — the documented resolution for that gap.
 */
interface Props {
  host: string
  /** Sits before the name, where there is room to say what the host is. */
  label?: string
  /** Layout only — margin, placement. Appearance belongs to the chip. */
  className?: string
}

export default function HostChip({ host, label, className }: Props) {
  return (
    <div className={'ts-host-chip' + (className ? ' ' + className : '')} title={host}>
      <span className="ts-host-chip-dot" />
      {label && <span className="ts-host-chip-label">{label}</span>}
      <span className="ts-host-chip-name">{host}</span>
    </div>
  )
}
