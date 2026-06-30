import { useMemo } from 'react'
import type { LogRow, Reaction } from './constants'
import { CATS, REACT_CHOICES, categoryOf, colorOf, fmtTime, humanize, jstr } from './constants'

export type ConsoleState = 'collapsed' | 'short' | 'normal' | 'tall'

interface Props {
  consoleState: ConsoleState
  onCycleConsole: () => void
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

const CONSOLE_HEIGHTS: Record<ConsoleState, number> = { collapsed: 43, short: 150, normal: 248, tall: 372 }

export default function EventConsole(props: Props) {
  const {
    consoleState,
    onCycleConsole,
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

  const collapsed = consoleState === 'collapsed'
  const consoleH = CONSOLE_HEIGHTS[consoleState]

  const rows = useMemo(() => {
    const q = logFilter.trim().toLowerCase()
    return log.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || humanize(r.name).toLowerCase().includes(q),
    )
  }, [log, logFilter])

  const liveDot = paused ? '#FAB005' : '#34D399'
  const liveGlow = paused ? 'rgba(250,176,5,.18)' : 'rgba(52,211,153,.18)'
  const reactionsVisible = reactions.length > 0 && !collapsed

  return (
    <section
      style={{
        flexShrink: 0,
        background: '#0B0E14',
        borderTop: '1px solid #1C2230',
        display: 'flex',
        flexDirection: 'column',
        height: consoleH,
        transition: 'height .22s ease',
      }}
    >
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 13px', height: 43, borderBottom: '1px solid #1C2230' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: liveDot, boxShadow: `0 0 0 3px ${liveGlow}` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#E6E9EF' }}>Embed event log</span>
          <span style={{ fontSize: 11, color: '#8A94A2', background: '#161B26', borderRadius: 6, padding: '2px 8px' }}>
            {rows.length} / {log.length}
          </span>
        </div>

        {!collapsed && (
          <div style={{ position: 'relative', width: 172 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A6473" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 9, top: 7 }}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              className="ts-dark-input"
              value={logFilter}
              onChange={(e) => onLogFilter(e.target.value)}
              placeholder="Filter events…"
              style={{ width: '100%', padding: '5px 8px 5px 28px', fontSize: 12 }}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {!collapsed && (
          <>
            <button
              onClick={onPause}
              title="Pause / resume capture"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: paused ? 'rgba(250,176,5,.14)' : '#161B26',
                border: '1px solid #232A38',
                borderRadius: 7,
                padding: '5px 10px',
                color: paused ? '#FAB005' : '#AEB6C2',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {paused ? '▶ Resume' : '❚❚ Pause'}
            </button>
            <button className="ts-dark-btn" onClick={onExport} title="Export log as JSON" style={{ padding: '6px 9px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </button>
            <button className="ts-dark-btn" onClick={onClear} title="Clear log" style={{ padding: '6px 9px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </>
        )}
        <button className="ts-dark-btn" onClick={onCycleConsole} title="Resize / collapse log" style={{ padding: '6px 9px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={consoleState === 'tall' ? '6 9 12 15 18 9' : '6 15 12 9 18 15'} />
          </svg>
        </button>
      </div>

      {/* Reactions bar */}
      {reactionsVisible && (
        <div
          className="tssd"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderBottom: '1px solid #1C2230', overflowX: 'auto' }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#6B7686', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#FAB005" stroke="none">
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
            </svg>
            Reactions
          </span>
          {reactions.map((r, i) => (
            <div
              key={`${r.embedEvent}-${r.hostEvent}-${i}`}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, background: '#161B26', border: '1px solid #2A3344', borderRadius: 999, padding: '4px 7px 4px 11px', fontSize: 12, color: '#D6DBE4' }}
            >
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
                {r.embedEvent} → {r.hostEvent}
              </span>
              <button onClick={() => onRemoveReaction(i)} style={{ background: 'transparent', border: 'none', color: '#6B7686', lineHeight: 0, padding: 2 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log body */}
      {!collapsed && (
        <div className="tssd" ref={setConsoleEl} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 0' }}>
          {rows.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#4A5365', padding: 24, textAlign: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <div style={{ fontSize: 13 }}>No events match — interact with the embed or trigger a host event.</div>
            </div>
          ) : (
            rows.map((r) => {
              const isEmbed = r.dir === 'embed'
              const pre = isEmbed ? 'EmbedEvent.' : 'HostEvent.'
              const color = colorOf(r.name)
              const catLabel = CATS[categoryOf(r.name)].label
              const expanded = expandedId === r.id
              const reactOpen = reactPickerFor === r.id
              return (
                <div key={r.id} style={{ animation: 'tsRow .22s ease backwards' }}>
                  <div
                    className="log-row"
                    onClick={() => onToggleExpand(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 13px', borderLeft: `3px solid ${color}`, cursor: 'pointer' }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#5A6473', flexShrink: 0, width: 84 }}>
                      {fmtTime(r.ts)}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '.04em',
                        borderRadius: 4,
                        padding: '2px 6px',
                        background: isEmbed ? 'rgba(16,185,129,.14)' : 'rgba(43,91,244,.18)',
                        color: isEmbed ? '#34D399' : '#7AA0FF',
                      }}
                    >
                      {isEmbed ? 'EMBED' : 'HOST'}
                    </span>
                    <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#E6E9EF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 240,
                      }}
                    >
                      {pre}
                      {r.name}
                    </span>
                    {r.reactedWith && (
                      <span style={{ flexShrink: 0, fontSize: 10.5, color: '#FAB005', whiteSpace: 'nowrap' }}>⚡ {r.reactedWith}</span>
                    )}
                    {r.viaReaction && (
                      <span style={{ flexShrink: 0, fontSize: 10.5, color: '#6B7686', whiteSpace: 'nowrap' }}>via {r.viaReaction}</span>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ flexShrink: 0, fontSize: 10.5, color: '#5A6473' }}>{catLabel}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isEmbed) onOpenReactPicker(r.id)
                      }}
                      title="React with a host event"
                      style={{ flexShrink: 0, background: 'transparent', border: 'none', color: isEmbed ? (r.reactedWith ? '#FAB005' : '#3A4456') : '#1c2330', lineHeight: 0, padding: 3 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={r.reactedWith ? '#FAB005' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
                      </svg>
                    </button>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A6473" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {reactOpen && (
                    <div style={{ padding: '8px 13px 11px 50px', background: '#0E121B' }}>
                      <div style={{ fontSize: 11, color: '#8A94A2', marginBottom: 8 }}>
                        When <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#E6E9EF' }}>{r.name}</span> fires → auto-trigger a host event:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {REACT_CHOICES.map((h) => (
                          <button
                            key={h}
                            className="react-chip"
                            onClick={() => onAddReaction(r.name, h)}
                            style={{ background: '#161B26', border: '1px solid #2A3344', borderRadius: 7, padding: '5px 10px', color: '#D6DBE4', fontSize: 12, fontWeight: 500 }}
                          >
                            → {humanize(h)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div style={{ padding: '4px 13px 12px 50px', background: '#0E121B' }}>
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 11.5,
                          lineHeight: 1.55,
                          color: '#9FD0A8',
                          background: '#0A0D14',
                          border: '1px solid #1C2230',
                          borderRadius: 8,
                          padding: '11px 13px',
                          overflowX: 'auto',
                          whiteSpace: 'pre',
                        }}
                      >
                        {`// ${pre}${r.name}\n${jstr(r.payload)}`}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </section>
  )
}
