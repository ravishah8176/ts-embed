import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import './EmbedConfigPanel.scss'
import type { EmbedType } from './constants'
import { EMBED_CLASS_NAME, VIEW_CONFIG_TYPE_NAME } from './constants'
import SdkVersionSwitcher from './SdkVersionSwitcher'
import Button from './Button'
import { runConfigSource, type AppliedSource } from './embeds/embedSource'
import { starterSource } from './embeds/starterSource'

interface Props {
  embedType: EmbedType
  /** What the mounted embed was built from, or null if nothing has been applied yet. */
  applied: AppliedSource | null
  onApply: (entry: AppliedSource) => void
}

/**
 * Monaco is a third of the app's JavaScript, and nothing before sign-in needs it, so
 * it is fetched when the panel first renders rather than up front.
 */
const CodeEditor = lazy(() => import('./CodeEditor'))

/**
 * Edits the source the live embed is built from.
 *
 * The app is deployed as an embed sandbox, so trying a prop must not mean editing
 * `src/studio/embeds/*.ts` and redeploying.
 *
 * There is one code block, the same one the ThoughtSpot Developer Playground shows
 * and in the same editor. The source is not a preview and not a format to be parsed:
 * applying *executes* it (see `embedSource.ts`), so a snippet copied out of the
 * playground or out of the app being built runs unedited, expressions and callbacks
 * included, and the embed is rebuilt from whatever it constructed. That reaches
 * configs no data format can hold — an id read off the URL, a `customActions`
 * handler, a value behind a ternary.
 *
 * Two things this panel is careful about:
 *   - Source runs on Apply, never on a keystroke. Half-typed source would fire
 *     whatever side effects it contains, on every character. Apply is the only
 *     trigger there is: a separate Run would be the same button twice.
 *   - Absence means unset. A prop the source never sets is left out of the config,
 *     so the SDK applies its own default; that is not the same as sending `false`.
 *
 * The editor's text is this component's own, not the Studio's. Only applied source
 * is worth lifting: it is what the embed was built from and what is stored, while an
 * unapplied edit means nothing to anything outside this panel.
 */
export default function EmbedConfigPanel({ embedType, applied, onApply }: Props) {
  /** What "unapplied" is measured against, and what a fresh embed opens with. */
  const baseline = applied?.code ?? starterSource(embedType)

  const [codeText, setCodeText] = useState(baseline)
  const [error, setError] = useState('')
  /** So applied source arriving from outside — a reload's stored entry — lands here. */
  const seen = useRef(baseline)

  useEffect(() => {
    if (seen.current === baseline) return
    seen.current = baseline
    setCodeText(baseline)
    setError('')
  }, [baseline])

  const dirty = codeText !== baseline
  const propCount = Object.keys(applied?.config ?? {}).length

  function applyNow() {
    try {
      const config = runConfigSource(codeText)
      setError('')
      seen.current = codeText
      onApply({ code: codeText, config })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run this source')
    }
  }

  const status = error
    ? 'failed to run'
    : dirty
      ? 'edited'
      : applied
        ? `${propCount} prop${propCount === 1 ? '' : 's'}`
        : 'not applied'

  return (
    <>
      <div className="ecp-header">
        <div className="ecp-title">
          {EMBED_CLASS_NAME[embedType]} config
          {dirty && <span className="ecp-dirty-dot" title="Unapplied changes" />}
        </div>

        <code className="ecp-type">{VIEW_CONFIG_TYPE_NAME[embedType]}</code>

        <div className="ecp-meta">
          <SdkVersionSwitcher sdk="embed" align="left" layout="block" withHint />
        </div>
      </div>

      <div className="tss ecp-body">
        <div className="ecp-code-pane">
          <div className="ecp-source-head">
            <span className="ecp-label">Source</span>
            <span className={'ecp-status' + (error ? ' bad' : '')} title={error || undefined}>
              {status}
            </span>
          </div>
          <div className="ecp-exec-note">
            Runs as JavaScript in this page when the embed is applied.
          </div>
          <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
            <CodeEditor value={codeText} language="typescript" onChange={setCodeText} />
          </Suspense>
        </div>
      </div>

      <div className="ecp-footer">
        <div className="ecp-footer-row">
          <span className="ecp-dirty">
            {error
              ? error
              : dirty
                ? 'Source not applied'
                : applied
                  ? 'Embed matches this source'
                  : 'Nothing applied yet'}
          </span>
        </div>
        <div className="ecp-actions">
          <Button variant="primary" size="m" truncate onClick={applyNow} disabled={!dirty}>
            Apply &amp; reload embed
          </Button>
        </div>
      </div>
    </>
  )
}
