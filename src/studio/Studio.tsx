import { useEffect, useMemo, useRef, useState } from 'react'
import './Studio.scss'
import { useAuth } from '../auth/AuthContext'
import { embedConfig } from './config'
import {
  SAMPLE,
  allowedHostEvents,
  colorOf,
  jstr,
  type EmbedType,
  type LogDir,
  type LogRow,
  type Reaction,
} from './constants'
import { useStudioEmbed, type EmbedEventInfo } from './useStudioEmbed'
import TopBar from './TopBar'
import ComposerPanel from './ComposerPanel'
import EmbedSurface from './EmbedSurface'
import EventConsole, { type ConsoleState } from './EventConsole'
import ProfileView from './ProfileView'
import Toast, { type ToastData } from './Toast'

const LOG_CAP = 400

interface TriggerMeta {
  viaReaction?: string
}

export default function Studio() {
  const { username, displayName, profile, logout } = useAuth()

  // ── core view state ──
  const [embedType, setEmbedType] = useState<EmbedType>('app')
  const [view, setView] = useState<'workspace' | 'profile'>('workspace')
  const [avatarOpen, setAvatarOpen] = useState(false)

  // ── composer ──
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [composerKey, setComposerKey] = useState('UpdateRuntimeFilters')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerSearch, setComposerSearch] = useState('')
  const [paramDrafts, setParamDrafts] = useState<Record<string, string>>({})

  // ── console / log ──
  const [log, setLog] = useState<LogRow[]>([])
  const [paused, setPaused] = useState(false)
  const [logFilter, setLogFilter] = useState('')
  const [consoleState, setConsoleState] = useState<ConsoleState>('collapsed')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Reaction[]>([])

  // ── profile (local edits, seeded from the session) ──
  const [userName, setUserName] = useState(displayName ?? username ?? 'User')
  const [userEmail, setUserEmail] = useState(username ?? '')

  // ── toast ──
  const [toast, setToast] = useState<ToastData | null>(null)

  const uidRef = useRef(1)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactFiredRef = useRef<Record<string, number>>({})
  const consoleElRef = useRef<HTMLDivElement | null>(null)
  const reactionsRef = useRef(reactions)
  reactionsRef.current = reactions
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  // Mirror the session's full display name / username into the profile as soon
  // as they're available (they may not be on the first render after a reload).
  useEffect(() => {
    if (displayName) setUserName(displayName)
  }, [displayName])
  useEffect(() => {
    if (username) setUserEmail(username)
  }, [username])

  const hostShort = useMemo(() => embedConfig.host.replace(/^https?:\/\//, ''), [])
  const allowed = allowedHostEvents(embedType)
  const effectiveKey = allowed.includes(composerKey) ? composerKey : allowed[0]
  const draft = paramDrafts[effectiveKey] ?? jstr(SAMPLE[effectiveKey] ?? {})

  function showToast(text: string, sub: string, color: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ text, sub, color })
    toastTimerRef.current = setTimeout(() => setToast(null), 2600)
  }

  // ── the live embed: streams real EmbedEvents into the log ──
  function onEmbedEvent(e: EmbedEventInfo) {
    addLog('embed', e.name, e.payload)
  }
  const { containerRef, status, trigger } = useStudioEmbed(embedType, onEmbedEvent)

  function addLog(dir: LogDir, name: string, payload: unknown, meta?: TriggerMeta) {
    if (pausedRef.current) return
    const row: LogRow = {
      id: 'L' + uidRef.current++,
      ts: Date.now(),
      dir,
      name,
      payload: payload ?? {},
      viaReaction: meta?.viaReaction || '',
    }

    // An embed event that has reactions configured auto-fires host events.
    if (dir === 'embed' && !meta?.viaReaction) {
      const matched = reactionsRef.current.filter((r) => r.embedEvent === name)
      if (matched.length) {
        row.reactedWith = matched.map((r) => r.hostEvent).join(', ')
        const now = Date.now()
        matched.forEach((r) => {
          const k = `${r.embedEvent}>${r.hostEvent}`
          if (now - (reactFiredRef.current[k] || 0) > 1500) {
            reactFiredRef.current[k] = now
            setTimeout(() => {
              triggerHost(r.hostEvent, SAMPLE[r.hostEvent] ?? {}, { viaReaction: name })
            }, 450)
          }
        })
      }
    }

    setLog((prev) => {
      const next = [...prev, row]
      if (next.length > LOG_CAP) next.splice(0, next.length - LOG_CAP)
      return next
    })
  }

  function triggerHost(key: string, params: unknown, meta?: TriggerMeta) {
    addLog('host', key, params ?? {}, meta)
    showToast(
      'HostEvent.' + key,
      meta?.viaReaction ? 'reaction · on ' + meta.viaReaction : 'embed.trigger() dispatched',
      colorOf(key),
    )
    trigger(key, params).catch((err) => {
      console.warn('[Studio] trigger failed:', key, err)
    })
  }

  // Autoscroll the console to the newest event (unless paused).
  useEffect(() => {
    if (consoleElRef.current && !paused) {
      consoleElRef.current.scrollTop = consoleElRef.current.scrollHeight
    }
  }, [log, paused])

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  // ── composer actions ──
  function seedDraft(k: string, drafts: Record<string, string>): Record<string, string> {
    if (drafts[k] === undefined) return { ...drafts, [k]: jstr(SAMPLE[k] ?? {}) }
    return drafts
  }
  function pickEvent(k: string) {
    setParamDrafts((d) => seedDraft(k, d))
    setComposerKey(k)
    setComposerOpen(false)
    setComposerSearch('')
  }
  function onDraftChange(v: string) {
    setParamDrafts((d) => ({ ...d, [effectiveKey]: v }))
  }
  function onReset() {
    setParamDrafts((d) => ({ ...d, [effectiveKey]: jstr(SAMPLE[effectiveKey] ?? {}) }))
  }
  function onComposerTrigger() {
    const raw = paramDrafts[effectiveKey]
    let params: unknown
    if (raw !== undefined && raw.trim() !== '') {
      try {
        params = JSON.parse(raw)
      } catch {
        showToast('Invalid JSON in params', 'Fix the JSON to trigger ' + effectiveKey, '#EF4444')
        return
      }
    } else {
      params = SAMPLE[effectiveKey] ?? {}
    }
    triggerHost(effectiveKey, params)
  }

  // ── console actions ──
  function onCycleConsole() {
    const order: ConsoleState[] = ['collapsed', 'short', 'normal', 'tall']
    setConsoleState((s) => order[(order.indexOf(s) + 1) % order.length])
  }
  function onClear() {
    setLog([])
    setExpandedId(null)
    setReactPickerFor(null)
  }
  function onExport() {
    const data = log.map((r) => ({
      time: new Date(r.ts).toISOString(),
      direction: r.dir,
      event: r.name,
      payload: r.payload,
    }))
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'thoughtspot-embed-events.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 500)
    } catch {
      /* download blocked */
    }
    showToast('Exported ' + data.length + ' events', 'thoughtspot-embed-events.json', '#34D399')
  }
  function onToggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id))
    setReactPickerFor(null)
  }
  function onOpenReactPicker(id: string) {
    setReactPickerFor((cur) => (cur === id ? null : id))
    setExpandedId(null)
  }
  function onAddReaction(embedEvent: string, hostEvent: string) {
    setReactions((rs) =>
      rs.some((r) => r.embedEvent === embedEvent && r.hostEvent === hostEvent)
        ? rs
        : [...rs, { embedEvent, hostEvent }],
    )
    setReactPickerFor(null)
    if (consoleState === 'collapsed') setConsoleState('normal')
    showToast('Reaction saved', embedEvent + ' → ' + hostEvent, '#FAB005')
  }

  // ── avatar / profile ──
  function onSwitchEmbed(t: EmbedType) {
    setAvatarOpen(false)
    setView('workspace')
    setEmbedType(t)
  }
  async function onSignOut() {
    setAvatarOpen(false)
    setLog([])
    setReactions([])
    await logout()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7' }}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F4F5F7', overflow: 'hidden' }}>
        <TopBar
          embedType={embedType}
          onSwitchEmbed={onSwitchEmbed}
          hostShort={hostShort}
          userName={userName}
          userEmail={userEmail}
          avatarOpen={avatarOpen}
          onToggleAvatar={() => setAvatarOpen((o) => !o)}
          onOpenProfile={() => {
            setView('profile')
            setAvatarOpen(false)
          }}
          onSignOut={onSignOut}
        />

        {view === 'workspace' ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <ComposerPanel
              collapsed={panelCollapsed}
              onTogglePanel={() => {
                setPanelCollapsed((c) => !c)
                setComposerOpen(false)
              }}
              embedType={embedType}
              composerKey={effectiveKey}
              onPickEvent={pickEvent}
              composerOpen={composerOpen}
              onToggleComposer={() => {
                setComposerOpen((o) => !o)
                setComposerSearch('')
              }}
              onCloseComposer={() => setComposerOpen(false)}
              composerSearch={composerSearch}
              onComposerSearch={setComposerSearch}
              draft={draft}
              onDraftChange={onDraftChange}
              onReset={onReset}
              onTrigger={onComposerTrigger}
            />

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <EmbedSurface embedType={embedType} status={status} containerRef={containerRef} />

              <EventConsole
                consoleState={consoleState}
                onCycleConsole={onCycleConsole}
                log={log}
                logFilter={logFilter}
                onLogFilter={setLogFilter}
                paused={paused}
                onPause={() => setPaused((p) => !p)}
                onClear={onClear}
                onExport={onExport}
                reactions={reactions}
                onRemoveReaction={(idx) => setReactions((rs) => rs.filter((_, i) => i !== idx))}
                expandedId={expandedId}
                onToggleExpand={onToggleExpand}
                reactPickerFor={reactPickerFor}
                onOpenReactPicker={onOpenReactPicker}
                onAddReaction={onAddReaction}
                setConsoleEl={(el) => {
                  consoleElRef.current = el
                }}
              />
            </div>
          </div>
        ) : (
          <ProfileView
            userName={userName}
            userEmail={userEmail}
            hostShort={hostShort}
            profile={profile}
            onBack={() => setView('workspace')}
            onSignOut={onSignOut}
          />
        )}
      </div>

      <Toast toast={toast} />
    </div>
  )
}
