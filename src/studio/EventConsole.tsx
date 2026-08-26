import { useLayoutEffect, useMemo, useRef } from 'react'
import './EventConsole.scss'
import type { LogRow, Reaction } from './constants'
import { REACT_CHOICES, fmtTime, humanize, jstr } from './constants'
import Button from './Button'

interface Props {
  log: LogRow[]
  logFilter: string
  onLogFilter: (v: string) => void
  paused: boolean
  onPause: () => void
  onClear: () => void
  onExport: () => void
  reactions: Reaction[]
  onRemoveReaction: (idx: number) => void
  expandedId: string | null
  onToggleExpand: (id: string) => void
  reactPickerFor: string | null
  onOpenReactPicker: (id: string) => void
  onAddReaction: (embedEvent: string, hostEvent: string) => void
  setConsoleEl: (el: HTMLDivElement | null) => void
}

/**
 * Everything the embed emitted, newest last.
 *
 * It shares the left panel with the config editor and the host-event composer
 * rather than sitting opposite them: reacting to an event with a host event, and
 * changing the config that produced it, are the same piece of work, and the embed
 * itself gets the rest of the window.
 *
 * Being one of three tabs, it is built from the same parts as the other two — the
 * title/meta header, the scrolling middle, and the footer where the actions live.
 * Capture control sits in that footer rather than the header, which is where each
 * tab keeps the thing it primarily does.
 *
 * A row expands in place: the payload is part of the row's own card, not an editor
 * mounted beside it. Rows come and go as events arrive, and a payload is read, not
 * edited — so it stays plain text that costs nothing to open and close.
 *
 * Opening or closing one also holds the clicked row still: the scroll position moves
 * by exactly the height that appeared or disappeared, so rows below shift and
 * everything the user was looking at stays where it was. Without that, expanding a
 * row while scrolled down slides the whole list under the cursor.
 */
export default function EventConsole(props: Props) {
  const {
    log,
    logFilter,
    onLogFilter,
    paused,
    onPause,
    onClear,
    onExport,
    reactions,
    onRemoveReaction,
    expandedId,
    onToggleExpand,
    reactPickerFor,
    onOpenReactPicker,
    onAddReaction,
    setConsoleEl,
  } = props

  const rows = useMemo(() => {
    const q = logFilter.trim().toLowerCase()
    return log.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || humanize(r.name).toLowerCase().includes(q),
    )
  }, [log, logFilter])

  const filtering = logFilter.trim().length > 0

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  /** Where the toggled row sat in the viewport, so it can be put back after relayout. */
  const anchorRef = useRef<{ id: string; offset: number } | null>(null)

  function toggleWithAnchor(id: string, row: HTMLElement | null, act: (id: string) => void) {
    const scroller = scrollerRef.current
    const wrap = row?.closest<HTMLElement>('.ec-row-wrap')
    anchorRef.current = scroller && wrap ? { id, offset: wrap.offsetTop - scroller.scrollTop } : null
    act(id)
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const anchor = anchorRef.current
    anchorRef.current = null
    if (!scroller || !anchor) return
    const wrap = scroller.querySelector<HTMLElement>(`[data-row="${anchor.id}"]`)
    if (wrap) scroller.scrollTop = wrap.offsetTop - anchor.offset
  }, [expandedId, reactPickerFor])

  return (
    <>
      <div className="ec-header">
        <div className="ec-title">
          Embed event log
          <span className={'ec-live-dot' + (paused ? ' paused' : '')} />
        </div>

        <div className="ec-meta">
          <code className="ec-meta-text">embed.on(EmbedEvent.*)</code>
          <span className={'ec-status' + (paused ? ' paused' : '')}>{paused ? 'paused' : 'capturing'}</span>
        </div>

        <div className="ts-search ec-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ts-search-icon" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            className="ts-input"
            value={logFilter}
            onChange={(e) => onLogFilter(e.target.value)}
            placeholder="Filter events…"
          />
        </div>
      </div>

      {reactions.length > 0 && (
        <div className="ec-reactions">
          <span className="ec-reactions-label">Reactions</span>
          {reactions.map((r, i) => (
            <div key={`${r.embedEvent}-${r.hostEvent}-${i}`} className="ec-reaction-chip">
              <span className="ec-reaction-text">
                {r.embedEvent} → {r.hostEvent}
              </span>
              <button
                onClick={() => onRemoveReaction(i)}
                className="ec-reaction-remove"
                title="Remove reaction"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ec-list-head">
        <span className="ec-label">
          {filtering ? `${rows.length} of ${log.length}` : `${log.length}`} event{log.length === 1 && !filtering ? '' : 's'}
        </span>
        <span className="ec-hint-inline">newest last</span>
      </div>

      <div
        className="tss ec-body"
        ref={(el) => {
          scrollerRef.current = el
          setConsoleEl(el)
        }}
      >
        {rows.length === 0 ? (
          <div className="ec-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            <div className="ec-empty-text">
              {filtering
                ? `Nothing matches “${logFilter.trim()}”.`
                : 'Interact with the embed, or trigger a host event, to see traffic here.'}
            </div>
          </div>
        ) : (
          rows.map((r) => {
            const isEmbed = r.dir === 'embed'
            const pre = isEmbed ? 'EmbedEvent.' : 'HostEvent.'
            const expanded = expandedId === r.id
            const reactOpen = reactPickerFor === r.id
            const payload = `// ${pre}${r.name}\n${jstr(r.payload)}`
            return (
              <div
                key={r.id}
                data-row={r.id}
                className={'ec-row-wrap' + (expanded ? ' open' : '')}
              >
                <button
                  className={'ec-row' + (isEmbed ? ' embed' : ' host') + (expanded ? ' open' : '')}
                  onClick={(e) => toggleWithAnchor(r.id, e.currentTarget, onToggleExpand)}
                >
                  <span className="ec-row-time">{fmtTime(r.ts)}</span>
                  <span className="ec-row-badge">{isEmbed ? 'EMBED' : 'HOST'}</span>
                  {/* The badge already says which side it came from, so the row shows the bare name. */}
                  <span className="ec-row-name">{r.name}</span>
                  {r.reactedWith && <span className="ec-row-reacted">⚡ {r.reactedWith}</span>}
                  {r.viaReaction && <span className="ec-row-via">via {r.viaReaction}</span>}
                  <span className="ec-row-spacer" />
                  {isEmbed && (
                    <span
                      role="button"
                      tabIndex={-1}
                      className={'ec-row-react' + (r.reactedWith ? ' on' : '')}
                      title="React with a host event"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWithAnchor(r.id, e.currentTarget, onOpenReactPicker)
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={r.reactedWith ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
                      </svg>
                    </span>
                  )}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ec-row-chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {reactOpen && (
                  <div className="ec-react-panel">
                    <div className="ec-react-prompt">
                      When <span className="ec-react-prompt-name">{r.name}</span> fires → auto-trigger:
                    </div>
                    <div className="ec-react-choices">
                      {REACT_CHOICES.map((h) => (
                        <button key={h} className="ec-react-choice" onClick={() => onAddReaction(r.name, h)}>
                          → {humanize(h)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {expanded && <pre className="ec-payload">{payload}</pre>}
              </div>
            )
          })
        )}
      </div>

      <div className="ec-footer">
        <div className="ec-footer-row">
          <span className="ec-footer-note">
            {log.length ? `${log.length} captured this session` : 'Nothing captured yet'}
          </span>
          <button className="link-btn ec-link" onClick={onClear} disabled={!log.length}>
            Clear log
          </button>
        </div>
        <div className="ec-actions">
          <Button variant="secondary" size="m" truncate onClick={onExport} disabled={!log.length}>
            Export JSON
          </Button>
          <Button variant="primary" size="m" truncate onClick={onPause}>
            {paused ? 'Resume capture' : 'Pause capture'}
          </Button>
        </div>
      </div>
    </>
  )
}
