import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './Studio.scss'
import { useAuth } from '../auth/AuthContext'
import {
  EMBED_CLASS_NAME,
  SAMPLE,
  allowedHostEvents,
  jstr,
  type EmbedType,
  type StudioTab,
  type LogDir,
  type LogRow,
  type Reaction,
} from './constants'
import { useStudioEmbed, type EmbedEventInfo } from './useStudioEmbed'
import TopBar from './TopBar'
import ComposerPanel from './ComposerPanel'
import EmbedConfigPanel from './EmbedConfigPanel'
import PanelRail from './PanelRail'
import SidePanel from './SidePanel'
import SidePanelTabs, { type SidePanelTab } from './SidePanelTabs'
import { usePanelWidth } from './usePanelWidth'
import EmbedSurface from './EmbedSurface'
import EventConsole from './EventConsole'
import ProfileView from './ProfileView'
import RestTab from './rest/RestTab'
import Welcome from './Welcome'
import Toast, { type ToastData } from './Toast'
import { embedDefaults, type ViewConfigValues } from './embeds'
import { clearConfig, loadConfig, saveConfig } from './embeds/configStore'
import { setStoredWorkspace, storedWorkspace } from './workspacePrefs'
import { NPM_PACKAGE, takeSdkSwitch } from '../thoughtspot/sdkLoader'

/** How far off the bottom still counts as "following the tail", in px. */
const LOG_TAIL_SLACK = 48

interface TriggerMeta {
  viaReaction?: string
}

export default function Studio() {
  const { username, displayName, profile, host, restAuthMode, logout } = useAuth()

  // ── core view state ──
  /**
   * A first visit starts on the Welcome screen; a reload comes back to whatever was
   * open, which is what makes switching the SDK version (a reload, necessarily)
   * feel like a switch rather than a restart.
   */
  const restored = useRef(storedWorkspace()).current
  const [embedType, setEmbedType] = useState<EmbedType | null>(restored.embedType)
  // The REST API SDK explorer is a top-bar tab too, but it's not an iframe embed,
  // so it overlays the workspace rather than swapping the live embed.
  const [restMode, setRestMode] = useState(restored.restMode)
  const [view, setView] = useState<'workspace' | 'profile'>('workspace')
  const [avatarOpen, setAvatarOpen] = useState(false)

  // ── left panel: embed config + host event composer + embed event log ──
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [panelTab, setPanelTab] = useState<SidePanelTab>(restored.panelTab)
  const panel = usePanelWidth()

  /**
   * View configs, per embed type.
   *
   * `applied` is what the mounted embed was built with — its object identity is the
   * signal that rebuilds the iframe, so it changes only on Apply. `drafts` is what
   * the panel is editing. Both are seeded from the store (the user's saved config,
   * or the built-in defaults) the first time an embed is opened.
   */
  const [appliedConfigs, setAppliedConfigs] = useState<Partial<Record<EmbedType, ViewConfigValues>>>({})
  const [configDrafts, setConfigDrafts] = useState<Partial<Record<EmbedType, ViewConfigValues>>>({})
  const [composerKey, setComposerKey] = useState('UpdateRuntimeFilters')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerSearch, setComposerSearch] = useState('')
  const [paramDrafts, setParamDrafts] = useState<Record<string, string>>({})

  // ── console / log ──
  const [log, setLog] = useState<LogRow[]>([])
  const [paused, setPaused] = useState(false)
  const [logFilter, setLogFilter] = useState('')
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

  useEffect(() => {
    setStoredWorkspace({ embedType, restMode, panelTab })
  }, [embedType, restMode, panelTab])

  /** Say so once, on the far side of an SDK-version reload — it is not a restart. */
  useEffect(() => {
    const switched = takeSdkSwitch()
    if (switched) {
      showToast(`Loaded ${NPM_PACKAGE[switched.sdk]}`, `version ${switched.version}`, 'var(--rd-sys-color-content-success)')
    }
  }, [])

  useEffect(() => {
    if (!embedType || appliedConfigs[embedType]) return
    const stored = loadConfig(embedType)
    setAppliedConfigs((c) => ({ ...c, [embedType]: stored }))
    setConfigDrafts((d) => ({ ...d, [embedType]: stored }))
  }, [embedType, appliedConfigs])

  const hostShort = useMemo(() => (host ?? '').replace(/^https?:\/\//, ''), [host])
  const allowed = embedType ? allowedHostEvents(embedType) : []
  const effectiveKey = allowed.includes(composerKey) ? composerKey : (allowed[0] ?? composerKey)
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
  const appliedConfig = embedType ? (appliedConfigs[embedType] ?? null) : null
  const draftConfig = embedType ? (configDrafts[embedType] ?? appliedConfig ?? {}) : {}
  const { containerRef, status, error: embedError, trigger } = useStudioEmbed(embedType, appliedConfig, onEmbedEvent)

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

    setLog((prev) => [...prev, row])
  }

  function triggerHost(key: string, params: unknown, meta?: TriggerMeta) {
    addLog('host', key, params ?? {}, meta)
    showToast(
      'HostEvent.' + key,
      meta?.viaReaction ? 'reaction · on ' + meta.viaReaction : 'embed.trigger() dispatched',
      'var(--rd-sys-color-content-brand)',
    )
    trigger(key, params).catch((err) => {
      console.warn('[Studio] trigger failed:', key, err)
    })
  }

  /**
   * Follow the newest event, the way a tailed log does — but only while the user is
   * already at the bottom. Someone scrolled up reading an expanded payload is not
   * yanked away from it by the next event.
   */
  useEffect(() => {
    const el = consoleElRef.current
    if (!el || pausedRef.current) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= LOG_TAIL_SLACK) {
      el.scrollTop = el.scrollHeight
    }
  }, [log])

  /**
   * Stable on purpose: an inline callback here is a new function every render, which
   * makes React detach and re-attach the ref — and this used to scroll the log to the
   * bottom on every state change, expanding a row included.
   */
  const attachConsoleEl = useCallback((el: HTMLDivElement | null) => {
    consoleElRef.current = el
    // Coming back to the tab should land on the newest event, not where it left.
    if (el && !pausedRef.current) el.scrollTop = el.scrollHeight
  }, [])

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
        showToast('Invalid JSON in params', 'Fix the JSON to trigger ' + effectiveKey, 'var(--rd-sys-color-content-failure)')
        return
      }
    } else {
      params = SAMPLE[effectiveKey] ?? {}
    }
    triggerHost(effectiveKey, params)
  }

  // ── embed config actions ──
  function onConfigDraftChange(next: ViewConfigValues) {
    if (!embedType) return
    setConfigDrafts((d) => ({ ...d, [embedType]: next }))
  }
  /** Rebuilds the embed with the draft, and remembers it for the next page load. */
  function onApplyConfig() {
    if (!embedType) return
    const next = { ...draftConfig }
    saveConfig(embedType, next)
    setAppliedConfigs((c) => ({ ...c, [embedType]: next }))
    showToast('Config applied', EMBED_CLASS_NAME[embedType] + ' rebuilt', 'var(--rd-sys-color-content-brand)')
  }
  function onRevertConfig() {
    if (!embedType || !appliedConfig) return
    setConfigDrafts((d) => ({ ...d, [embedType]: appliedConfig }))
  }
  function onResetConfigDefaults() {
    if (!embedType) return
    clearConfig(embedType)
    setConfigDrafts((d) => ({ ...d, [embedType]: embedDefaults(embedType) }))
    showToast('Defaults restored', 'Apply to rebuild the embed', 'var(--rd-sys-color-content-warning)')
  }
  function onCollapsePanel() {
    setPanelCollapsed(true)
    setComposerOpen(false)
  }

  // ── console actions ──
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
    showToast('Exported ' + data.length + ' events', 'thoughtspot-embed-events.json', 'var(--rd-sys-color-content-success)')
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
    showToast('Reaction saved', embedEvent + ' → ' + hostEvent, 'var(--rd-sys-color-content-warning)')
  }

  // ── avatar / profile ──
  function onGoHome() {
    setAvatarOpen(false)
    setView('workspace')
    setRestMode(false)
    setEmbedType(null)
  }
  function onSwitchTab(t: StudioTab) {
    setAvatarOpen(false)
    setView('workspace')
    if (t === 'rest') {
      setRestMode(true)
    } else {
      setRestMode(false)
      setEmbedType(t)
    }
  }
  async function onSignOut() {
    setAvatarOpen(false)
    setLog([])
    setReactions([])
    await logout()
  }

  return (
    <div className="studio-root">
      <div className="studio-shell">
        <TopBar
          activeTab={restMode ? 'rest' : embedType}
          onSwitchEmbed={onSwitchTab}
          onHome={onGoHome}
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

        {/*
          The workspace stays mounted at all times so the live embed iframe is
          never torn down. The profile renders as an overlay *above* it — going
          back simply hides the overlay, leaving the embed exactly as it was
          (no re-render, no infinite loading spinner).
        */}
        <div className="studio-body">
          <div className="studio-workspace">
            {embedType === null ? (
              <Welcome userName={userName} hostShort={hostShort} onSelect={onSwitchTab} />
            ) : (
            <>
            {panelCollapsed ? (
              <PanelRail onExpand={() => setPanelCollapsed(false)} />
            ) : (
              <SidePanel width={panel.width} resizing={panel.resizing} handleProps={panel.handleProps}>
                {/* The strip and the collapse control act on the panel, not on the open tab. */}
                <SidePanelTabs
                  active={panelTab}
                  onSwitch={setPanelTab}
                  onCollapse={onCollapsePanel}
                  logCount={log.length}
                />
                {panelTab === 'config' ? (
                  <EmbedConfigPanel
                    key={embedType}
                    embedType={embedType}
                    draft={draftConfig}
                    applied={appliedConfig ?? {}}
                    onDraftChange={onConfigDraftChange}
                    onApply={onApplyConfig}
                    onRevert={onRevertConfig}
                    onResetDefaults={onResetConfigDefaults}
                  />
                ) : panelTab === 'log' ? (
                  <EventConsole
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
                    setConsoleEl={attachConsoleEl}
                  />
                ) : (
                  <ComposerPanel
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
                )}
              </SidePanel>
            )}

            <div className="studio-embed-col">
              <EmbedSurface
                embedType={embedType}
                status={status}
                error={embedError}
                containerRef={containerRef}
              />
            </div>
            </>
            )}
          </div>

          {/*
            REST API tab (SDK explorer + embedded playground) overlays the
            workspace, keeping the live embed iframe mounted underneath. Profile
            sits above it via higher z-index.
          */}
          {restMode && <RestTab host={host ?? ''} authMode={restAuthMode} />}

          {view === 'profile' && (
            <>
              <div
                className="profile-backdrop"
                onClick={() => setView('workspace')}
                aria-hidden
              />
              <div className="profile-sheet" role="dialog" aria-label="Profile">
                <ProfileView
                  userName={userName}
                  userEmail={userEmail}
                  hostShort={hostShort}
                  profile={profile}
                  onBack={() => setView('workspace')}
                  onSignOut={onSignOut}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <Toast
        toast={toast}
        onClose={() => {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
          setToast(null)
        }}
      />
    </div>
  )
}
