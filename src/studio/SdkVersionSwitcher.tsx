import { useEffect, useState } from 'react'
import './SdkVersionSwitcher.scss'
import Button from './Button'
import SdkVersionPicker from './SdkVersionPicker'
import {
  SNAPSHOT_VERSIONS,
  defaultSdkVersions,
  CDN_NAME,
  NPM_PACKAGE,
  displayVersion,
  isModuleUrl,
  isPrBuild,
  loadedVersion,
  markSdkSwitch,
  setStoredSdkVersions,
  storedSdkVersions,
  verifySdkSource,
  type SdkName,
} from '../thoughtspot/sdkLoader'

interface Props {
  sdk: SdkName
  align?: 'left' | 'right'
  /**
   * `block` is the full-width control used where this is the header's main action;
   * `chip` is the compact form for a toolbar row that already has other controls.
   */
  layout?: 'chip' | 'block'
  /** Prints the one-line explanation under the chip; for headers with room for it. */
  withHint?: boolean
  /** The version in effect, when the caller owns it (the REST SDK does). */
  value?: string
  /** Called with the picked version for an SDK that switches without a reload. */
  onApplied?: (version: string) => void
}

const CHIP_LABEL: Record<SdkName, string> = { embed: 'SDK', rest: 'REST SDK' }

/** Spelled out in the block form, where there is room for the package's real name. */
const FULL_LABEL: Record<SdkName, string> = {
  embed: 'Visual Embed SDK',
  rest: 'REST API SDK',
}

/** Named on the chip, so what it is showing needs no hover to work out. */
const STATE_LABEL = {
  snapshot: 'snapshot',
  latest: 'latest',
  custom: 'custom URL',
  prbuild: 'PR build',
  pending: 'reload',
} as const

/** The `cdn` state is labelled with the CDN that package actually comes from. */
function stateLabel(state: string, sdk: SdkName): string {
  return state === 'cdn' ? CDN_NAME[sdk] : STATE_LABEL[state as keyof typeof STATE_LABEL]
}

/** How long the hint stays up on its own before getting out of the way. */
const HINT_VISIBLE_MS = 12000

const HINT_DISMISSED_KEY = 'ts_embed_sdk_hint_dismissed_v1'

/**
 * Whether the hint has been read already.
 *
 * It explains what the chip does, which is worth saying once and then never again —
 * so dismissing it is remembered, and even undismissed it retires after a few
 * seconds rather than sitting under the chip for the life of the session.
 */
function hintDismissed(sdk: SdkName): boolean {
  try {
    return (localStorage.getItem(HINT_DISMISSED_KEY) ?? '').split(',').includes(sdk)
  } catch {
    return false
  }
}

function dismissHint(sdk: SdkName) {
  try {
    const seen = new Set((localStorage.getItem(HINT_DISMISSED_KEY) ?? '').split(',').filter(Boolean))
    seen.add(sdk)
    localStorage.setItem(HINT_DISMISSED_KEY, [...seen].join(','))
  } catch {
    /* empty */
  }
}

/** One line under the chip, telling the user what changing it will do. */
const CHIP_HINT: Record<SdkName, string> = {
  embed:
    'Run this embed against another Visual Embed SDK release, a module URL, or a pkg.pr.new PR build — ' +
    'switching reloads the Studio, saved configs are kept.',
  rest: 'Call another REST API SDK release — takes effect on the next request, nothing else is disturbed.',
}

/**
 * Shows which version of one SDK is in use, and switches it.
 *
 * The two SDKs switch differently, which is why this takes an `sdk` rather than
 * offering both at once:
 *   • The Visual Embed SDK keeps module-level state — `init()`'s config, every live
 *     embed's iframe — so its version can only change on a fresh page. Switching
 *     persists the choice and reloads; applied embed configs are stored, so they
 *     survive.
 *   • The REST SDK is only a client object, rebuilt per call site, so a new version
 *     takes effect immediately and the caller is handed the new value.
 */
export default function SdkVersionSwitcher({
  sdk,
  align = 'right',
  layout = 'chip',
  withHint,
  value,
  onApplied,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(() => value ?? storedSdkVersions()[sdk])
  const [checking, setChecking] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [hintOpen, setHintOpen] = useState(() => !!withHint && !hintDismissed(sdk))

  useEffect(() => {
    if (!hintOpen) return
    const timer = setTimeout(() => setHintOpen(false), HINT_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [hintOpen])

  const stored = storedSdkVersions()[sdk]
  const loaded = loadedVersion(sdk)
  const inUse = value ?? loaded ?? stored
  const reloads = sdk === 'embed'

  /**
   * Which of three things the chip is showing, since "1.50.1" alone does not say
   * whether that came out of the app bundle, off a CDN, or is only a saved choice
   * the page has yet to load.
   */
  const snapshot = inUse === SNAPSHOT_VERSIONS[sdk]
  /** The default is npm's latest, resolved at startup — worth saying, not just "jsDelivr". */
  const latest = !snapshot && inUse === defaultSdkVersions()[sdk]
  const awaitingReload = reloads && loaded !== null && loaded !== stored
  const state = awaitingReload
    ? 'pending'
    : snapshot
      ? 'snapshot'
      : isPrBuild(inUse)
        ? 'prbuild'
        : isModuleUrl(inUse)
          ? 'custom'
          : latest
            ? 'latest'
            : 'cdn'
  const source = awaitingReload
    ? `saved — reload to load ${stored}`
    : snapshot
      ? 'the version this build\u2019s generated code matches'
      : state === 'prbuild'
        ? 'pkg.pr.new tarball, unpacked in the browser'
        : state === 'custom'
          ? 'imported from this URL'
          : state === 'latest'
            ? `latest on npm, fetched from ${CDN_NAME[sdk]}`
            : `fetched from ${CDN_NAME[sdk]}`

  /**
   * Verified before it is stored. A version that cannot load is only discoverable by
   * loading it, and for the embed SDK that means a reload that comes back signed out
   * — so the round trip happens here, while the popover can still show what is wrong.
   */
  async function apply() {
    setChecking(true)
    setApplyError('')
    try {
      await verifySdkSource(sdk, pending)
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'That version could not be loaded.')
      setChecking(false)
      return
    }
    setStoredSdkVersions({ [sdk]: pending })
    if (reloads) {
      markSdkSwitch(sdk, pending)
      window.location.reload()
      return
    }
    setChecking(false)
    onApplied?.(pending)
    setOpen(false)
  }

  const openPopover = () => {
    setPending(inUse)
    setOpen((o) => !o)
  }
  const title = `${NPM_PACKAGE[sdk]} ${inUse} — ${source}. Click to change.`

  return (
    <div className={'svs-root' + (layout === 'block' ? ' svs-root-block' : '')}>
      {layout === 'block' ? (
        <button
          className={'svs-block' + (open ? ' on' : '')}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openPopover}
          title={title}
        >
          <span className="svs-block-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
              <path d="M3 7.5 12 12l9-4.5M12 12v9" />
            </svg>
          </span>
          <span className="svs-block-text">
            <span className="svs-block-label">{FULL_LABEL[sdk]}</span>
            <span className="svs-block-version">
              {displayVersion(inUse)}
              <span className={'svs-chip-state ' + state}>{stateLabel(state, sdk)}</span>
            </span>
          </span>
          <span className="svs-block-action">
            Change
            <svg className="svs-chip-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          className={'svs-chip' + (open ? ' on' : '')}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openPopover}
          title={title}
        >
          <span className="svs-chip-label">{CHIP_LABEL[sdk]}</span>
          <span className="svs-chip-version">{displayVersion(inUse)}</span>
          <span className={'svs-chip-state ' + state}>{stateLabel(state, sdk)}</span>
          <svg className="svs-chip-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {withHint && hintOpen && (
        <div className="svs-hint anim-fade">
          <p className="svs-hint-text">{CHIP_HINT[sdk]}</p>
          <button
            className="svs-hint-close"
            title="Dismiss"
            aria-label="Dismiss"
            onClick={() => {
              dismissHint(sdk)
              setHintOpen(false)
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="svs-overlay" onClick={() => setOpen(false)} />
          <div className={'svs-pop anim-fade svs-pop-' + align}>
            <div className="svs-pop-head">
              <span className="svs-block-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
                  <path d="M3 7.5 12 12l9-4.5M12 12v9" />
                </svg>
              </span>
              <div className="svs-pop-head-text">
                <div className="svs-title">{FULL_LABEL[sdk]} version</div>
                <code className="svs-current-pkg">{NPM_PACKAGE[sdk]}</code>
              </div>
              <span className={'svs-chip-state ' + state}>{stateLabel(state, sdk)}</span>
            </div>
            <p className="svs-current-note">In use: {source}.</p>
            <SdkVersionPicker
              sdk={sdk}
              value={pending}
              onChange={(v) => {
                setApplyError('')
                setPending(v)
              }}
              disabled={checking}
            />
            {applyError && <p className="svs-error">{applyError}</p>}
            <p className="svs-note">
              {reloads
                ? 'The SDK loads once per page, so switching reloads the Studio. Saved embed configs are kept; the event log is not.'
                : 'Takes effect on the next call — nothing else on the page is disturbed.'}
            </p>
            <Button
              variant="primary"
              size="m"
              className="svs-btn"
              disabled={pending === inUse || checking}
              onClick={apply}
              icon={
                checking ? undefined : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {reloads ? (
                      <>
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <polyline points="21 4 21 9 16 9" />
                      </>
                    ) : (
                      <polyline points="20 6 9 17 4 12" />
                    )}
                  </svg>
                )
              }
            >
              {checking ? 'Checking…' : reloads ? 'Reload with this version' : 'Use this version'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
