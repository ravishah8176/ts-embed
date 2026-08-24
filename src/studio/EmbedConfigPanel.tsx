import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import './EmbedConfigPanel.scss'
import type { EmbedType } from './constants'
import { EMBED_CLASS_NAME, jstr } from './constants'
import SdkVersionSwitcher from './SdkVersionSwitcher'
import Button from './Button'
import type { EditorCompletion } from './CodeEditor'
import type { ViewConfigValues } from './embeds'
import { configToCode, diffKeys } from './embeds/configStore'
import { codeToConfig } from './embeds/codeToConfig'
import { VIEW_CONFIG_SCHEMA, VIEW_CONFIG_TYPE_NAME } from './embeds/viewConfigSchema.generated'

interface Props {
  embedType: EmbedType
  /** Being edited; only becomes the live config on Apply. */
  draft: ViewConfigValues
  /** What the mounted embed was actually built with. */
  applied: ViewConfigValues
  onDraftChange: (next: ViewConfigValues) => void
  onApply: () => void
  onRevert: () => void
  onResetDefaults: () => void
}

type Mode = 'json' | 'code'

/** Identity of a draft for one embed, so an editor can tell its own edit from an outside one. */
function draftKey(type: EmbedType, values: ViewConfigValues): string {
  return `${type}\u0000${JSON.stringify(values)}`
}

/**
 * The editor is a third of the app's JavaScript, and nothing before sign-in needs
 * it, so it is fetched when the panel first renders rather than up front. Both tabs
 * share it, so the Code tab costs nothing extra.
 */
const CodeEditor = lazy(() => import('./CodeEditor'))

/**
 * Edits the view config of the live embed, from the browser.
 *
 * The app is deployed as an embed sandbox, so trying a prop must not mean editing
 * `src/studio/embeds/*.ts` and redeploying. The config is edited as JSON — the same
 * object the SDK is handed — which keeps every prop of every SDK version reachable,
 * including props newer than the app itself.
 *
 * Two things this panel is careful about:
 *   • Edits are a draft. A view config cannot change on a live embed, so applying
 *     tears the iframe down and builds a new one — too disruptive to do per
 *     keystroke.
 *   • Absence means unset. A prop left out of the JSON is left out of the config, so
 *     the SDK applies its own default; that is not the same as sending `false`.
 *
 * The Code tab is the same config as source for the user's own app, naming enum
 * values (`Action.Save`) rather than their wire values — and it is editable both
 * ways: source typed or pasted there is parsed back into the config, so an existing
 * app's embed call can be dropped in and run as-is.
 *
 * The editor completes prop names from the generated schema, which is the one thing
 * a raw JSON field cannot do for a config with a hundred possible props.
 */
export default function EmbedConfigPanel(props: Props) {
  const {
    embedType,
    draft,
    applied,
    onDraftChange,
    onApply,
    onRevert,
    onResetDefaults,
  } = props

  const [mode, setMode] = useState<Mode>('json')
  const [jsonText, setJsonText] = useState(() => jstr(draft))
  const [jsonError, setJsonError] = useState('')
  const [codeText, setCodeText] = useState(() => configToCode(embedType, draft))
  const [codeError, setCodeError] = useState('')
  /** What each editor last put into the draft, so its own text is never reformatted. */
  const jsonCommitted = useRef(draftKey(embedType, draft))
  const codeCommitted = useRef(draftKey(embedType, draft))

  const changed = useMemo(() => diffKeys(draft, applied), [draft, applied])
  const propCount = Object.keys(draft).length

  const completions: EditorCompletion[] = useMemo(
    () => VIEW_CONFIG_SCHEMA[embedType].map((spec) => ({ label: spec.name, detail: spec.enumName ?? spec.kind })),
    [embedType],
  )

  function commitJson(text: string) {
    setJsonText(text)
    if (!text.trim()) {
      setJsonError('')
      jsonCommitted.current = draftKey(embedType, {})
      onDraftChange({})
      return
    }
    try {
      const parsed = JSON.parse(text) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('The config must be a JSON object.')
        return
      }
      setJsonError('')
      jsonCommitted.current = draftKey(embedType, parsed as ViewConfigValues)
      onDraftChange(parsed as ViewConfigValues)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  function commitCode(text: string) {
    setCodeText(text)
    if (!text.trim()) {
      setCodeError('')
      codeCommitted.current = draftKey(embedType, {})
      onDraftChange({})
      return
    }
    try {
      const parsed = codeToConfig(text)
      setCodeError('')
      codeCommitted.current = draftKey(embedType, parsed)
      onDraftChange(parsed)
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : 'Could not read this source')
    }
  }

  /**
   * Reflect draft changes that came from somewhere else — Revert, or Reset to
   * defaults — into the editor.
   *
   * Guarded on what the editor last committed, so the user's own formatting and
   * half-finished lines are never reformatted underneath them as they type.
   */
  useEffect(() => {
    const incoming = draftKey(embedType, draft)
    if (incoming !== jsonCommitted.current) {
      jsonCommitted.current = incoming
      setJsonText(jstr(draft))
      setJsonError('')
    }
    if (incoming !== codeCommitted.current) {
      codeCommitted.current = incoming
      setCodeText(configToCode(embedType, draft))
      setCodeError('')
    }
  }, [draft, embedType])

  /**
   * The editor marks the offending range inline, so the header only needs to say
   * which line to look at; the parser's full sentence is too long for it and is kept
   * as the tooltip.
   */
  const error = mode === 'json' ? jsonError : codeError
  const errorLine = /line (\d+)/.exec(error)?.[1]
  const status = error
    ? `${mode === 'json' ? 'invalid JSON' : 'cannot read'}${errorLine ? ` · line ${errorLine}` : ''}`
    : mode === 'json'
      ? 'valid JSON'
      : 'config read'

  return (
    <>
      <div className="ecp-header">
        <div className="ecp-title">
          {EMBED_CLASS_NAME[embedType]} config
          {changed.length > 0 && <span className="ecp-dirty-dot" title="Unapplied changes" />}
        </div>

        <code className="ecp-type">{VIEW_CONFIG_TYPE_NAME[embedType]}</code>

        <div className="ecp-meta">
          <SdkVersionSwitcher sdk="embed" align="left" layout="block" withHint />
        </div>

        <div className="ecp-modes">
          {(['json', 'code'] as Mode[]).map((m) => (
            <button
              key={m}
              className={'ecp-mode' + (mode === m ? ' on' : '')}
              onClick={() => setMode(m)}
            >
              {m === 'json' ? 'JSON' : 'Code'}
            </button>
          ))}
        </div>
      </div>

      <div className="tss ecp-body">
        {mode === 'json' ? (
          <div className="ecp-json-pane">
            <div className="ecp-json-head">
              <span className="ecp-label">
                View config · {propCount} prop{propCount === 1 ? '' : 's'}
              </span>
              <div className="ecp-json-tools">
                <button
                  className="link-btn ecp-copy"
                  onClick={() => commitJson(jstr(draft))}
                  disabled={!!jsonError}
                  title="Re-indent the config"
                >
                  Format
                </button>
                <span
                  className={'ecp-json-status' + (jsonError ? ' bad' : '')}
                  title={jsonError || undefined}
                >
                  {status}
                </span>
              </div>
            </div>
            <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
              <CodeEditor
                value={jsonText}
                language="json"
                onChange={commitJson}
                completions={completions}
              />
            </Suspense>
          </div>
        ) : (
          <div className="ecp-code-pane">
            <div className="ecp-json-head">
              <span className="ecp-label">Source</span>
              <div className="ecp-json-tools">
                <button
                  className="link-btn ecp-copy"
                  onClick={() => navigator.clipboard?.writeText(codeText)}
                >
                  Copy
                </button>
                <button
                  className="link-btn ecp-copy"
                  onClick={() => commitCode(configToCode(embedType, draft))}
                  title="Reprint from the current config"
                >
                  Format
                </button>
                <span
                  className={'ecp-json-status' + (codeError ? ' bad' : '')}
                  title={codeError || undefined}
                >
                  {status}
                </span>
              </div>
            </div>
            <Suspense fallback={<div className="ce-host ce-loading">Loading editor…</div>}>
              <CodeEditor value={codeText} language="typescript" onChange={commitCode} />
            </Suspense>
          </div>
        )}
      </div>

      <div className="ecp-footer">
        <div className="ecp-footer-row">
          <span className="ecp-dirty">
            {changed.length
              ? `${changed.length} unapplied change${changed.length === 1 ? '' : 's'}`
              : 'Embed matches this config'}
          </span>
          <button className="link-btn ecp-link" onClick={onResetDefaults}>
            Reset to defaults
          </button>
        </div>
        <div className="ecp-actions">
          <Button variant="secondary" size="m" truncate onClick={onRevert} disabled={!changed.length}>
            Revert
          </Button>
          <Button
            variant="primary"
            size="m"
            truncate
            onClick={onApply}
            disabled={!changed.length || !!error}
          >
            Apply &amp; reload embed
          </Button>
        </div>
      </div>
    </>
  )
}
