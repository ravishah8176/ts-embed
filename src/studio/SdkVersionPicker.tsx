import { useEffect, useMemo, useState } from 'react'
import './SdkVersionPicker.scss'
import {
  SNAPSHOT_VERSIONS,
  CDN_NAME,
  displayVersion,
  fetchPublishedVersions,
  isModuleUrl,
  isPrBuild,
  isSupportedVersion,
  unsupportedReason,
  verifySdkSource,
  type SdkName,
} from '../thoughtspot/sdkLoader'

interface Props {
  sdk: SdkName
  value: string
  onChange: (version: string) => void
  disabled?: boolean
}

const MAX_ROWS = 60
const isPrerelease = (v: string) => /-/.test(v)

/** Long enough that a check is not fired at every keystroke of a pasted URL. */
const CHECK_DEBOUNCE_MS = 450

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'bad'; message: string }

/**
 * Picks the version of one ThoughtSpot SDK to load — the value row inside the
 * switcher's popover, which is what names the package.
 *
 * The list comes from jsDelivr's registry metadata; the module itself is fetched from
 * whichever CDN suits that package (see `CDN_NAME`), so anything offered here is known
 * to be published. Typing is always
 * allowed on top of the list: pre-release builds are the versions people most often
 * need to test against, and they are not always what the registry returns first.
 *
 * A URL can be typed instead of a version — the way to reach a build that is not on
 * npm. Either a built ES module, or a `pkg.pr.new` per-commit tarball, which is
 * unpacked in the browser. Both are checked here before they can be picked.
 */
export default function SdkVersionPicker({ sdk, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [versions, setVersions] = useState<string[]>([])
  const [latest, setLatest] = useState<string | null>(null)
  const [listError, setListError] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [check, setCheck] = useState<CheckState>({ status: 'idle' })

  useEffect(() => {
    if (!open || versions.length || loadingList) return
    setLoadingList(true)
    fetchPublishedVersions(sdk)
      .then((r) => {
        setVersions(r.versions)
        setLatest(r.latest)
      })
      .catch((e: unknown) => setListError(e instanceof Error ? e.message : 'Could not list versions'))
      .finally(() => setLoadingList(false))
  }, [open, sdk, versions.length, loadingList])

  /** Versions the app cannot drive are left out rather than offered and then refused. */
  const usable = useMemo(() => versions.filter((v) => isSupportedVersion(sdk, v)), [versions, sdk])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pool = q ? usable.filter((v) => v.toLowerCase().includes(q)) : usable.filter((v) => !isPrerelease(v))
    return pool.slice(0, MAX_ROWS)
  }, [usable, search])

  const typed = search.trim()
  /** A version known to be below the floor is not offered at all, typed or listed. */
  const typedReason = typed ? unsupportedReason(sdk, typed) : null
  const canUseTyped = typed.length > 0 && !rows.includes(typed) && !typedReason
  const snapshot = SNAPSHOT_VERSIONS[sdk]

  /**
   * Checks a typed version or URL as it is typed, so it is known to be loadable
   * before it is picked — a version off the list is already known to exist, a typed
   * one is a guess until something fetches it.
   *
   * A stale result is dropped rather than aborted: the check is a one-byte range
   * request, and the sequence guard is simpler than plumbing an AbortController
   * through the loader.
   */
  useEffect(() => {
    if (!canUseTyped) {
      setCheck({ status: 'idle' })
      return
    }
    setCheck({ status: 'checking' })
    let live = true
    const timer = setTimeout(() => {
      verifySdkSource(sdk, typed)
        .then(() => live && setCheck({ status: 'ok' }))
        .catch((e: unknown) =>
          live && setCheck({ status: 'bad', message: e instanceof Error ? e.message : 'Not loadable' }),
        )
    }, CHECK_DEBOUNCE_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [sdk, typed, canUseTyped])

  function pick(version: string) {
    onChange(version)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="svp-root" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className="svp-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {/* The popover above already names the package; this row is the value. */}
        <span className="svp-pkg">Version</span>
        <span className="svp-version" title={value}>
          {displayVersion(value)}
        </span>
        <span className={'svp-source' + (value === snapshot ? ' svp-source-snapshot' : '')}>
          {value === snapshot
            ? 'snapshot'
            : isPrBuild(value)
              ? 'PR build'
              : isModuleUrl(value)
                ? 'URL'
                : CDN_NAME[sdk]}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--rd-sys-color-content-tertiary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="svp-chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="svp-overlay" onClick={() => setOpen(false)} />
          <div className="svp-dropdown anim-fade">
            <div className="svp-head">
              <input
                className="svp-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Version, module URL, or pkg.pr.new link…"
                autoFocus
                spellCheck={false}
              />
              <div className="svp-hint">
                {loadingList
                  ? 'Loading published versions…'
                  : listError
                    ? listError
                    : search.trim()
                      ? `${rows.length} match${rows.length === 1 ? '' : 'es'}`
                      : 'Stable releases · type to find pre-releases'}
              </div>
            </div>

            {typedReason ? (
              <p className="svp-check-error">{typedReason}</p>
            ) : (
              canUseTyped && check.status === 'bad' && <p className="svp-check-error">{check.message}</p>
            )}

            <div className="tss svp-list" role="listbox">
              {canUseTyped && (
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={'svp-opt svp-opt-typed' + (check.status === 'bad' ? ' bad' : '')}
                  onClick={() => pick(typed)}
                  disabled={check.status !== 'ok'}
                  title={check.status === 'bad' ? check.message : undefined}
                >
                  <span className="svp-opt-version">{typed}</span>
                  {check.status === 'checking' && (
                    <span className="svp-opt-tag">{isPrBuild(typed) ? 'unpacking…' : 'checking…'}</span>
                  )}
                  {check.status === 'ok' && (
                    <span className="svp-opt-tag svp-opt-tag-ok">
                      ✓{' '}
                      {isPrBuild(typed)
                        ? 'PR build ready'
                        : isModuleUrl(typed)
                          ? 'module found'
                          : 'version exists'}
                    </span>
                  )}
                  {check.status === 'bad' && <span className="svp-opt-tag svp-opt-tag-bad">not loadable</span>}
                </button>
              )}
              {value !== snapshot && !rows.includes(snapshot) && (
                <button type="button" role="option" aria-selected={false} className="svp-opt" onClick={() => pick(snapshot)}>
                  <span className="svp-opt-version">{snapshot}</span>
                  <span className="svp-opt-tag">snapshot</span>
                </button>
              )}
              {rows.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="option"
                  aria-selected={v === value}
                  className={'svp-opt' + (v === value ? ' selected' : '')}
                  onClick={() => pick(v)}
                >
                  <span className="svp-opt-version">{v}</span>
                  {v === snapshot && <span className="svp-opt-tag">snapshot</span>}
                  {v === latest && <span className="svp-opt-tag svp-opt-tag-latest">latest</span>}
                  {v === value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
              {!rows.length && !canUseTyped && !loadingList && !typedReason && (
                <div className="svp-empty">No versions to show.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
