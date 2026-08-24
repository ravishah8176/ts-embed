import { useEffect, useRef } from 'react'
import './CodeEditor.scss'
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { linter } from '@codemirror/lint'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { indentWithTab } from '@codemirror/commands'
import { tags } from '@lezer/highlight'

export interface EditorCompletion {
  /** Prop name inserted on accept. */
  label: string
  /** Shown greyed beside the label — the prop's type. */
  detail?: string
}

interface Props {
  value: string
  language: 'json' | 'typescript'
  /** Omitted for a read-only view, which is then not editable at all. */
  onChange?: (next: string) => void
  /** JSON only: prop names offered while typing a key, from the generated schema. */
  completions?: EditorCompletion[]
}

/**
 * The Studio's code surfaces: the editable view config, and the generated source
 * preview beside it.
 *
 * A textarea and a `<pre>` made these the least pleasant part of the panel: no line
 * numbers to match a parse error against, no bracket help on deeply nested config,
 * nothing to tell a key from a value at a glance. This is CodeMirror with the pieces
 * that pay for themselves here — line numbers, highlighting, bracket matching and
 * auto-close, inline lint marks, undo, search, and Tab that indents instead of
 * leaving the field.
 *
 * Without `onChange` it becomes a read-only, non-editable view that still highlights,
 * scrolls, folds and selects — which is all the code preview needs.
 *
 * The editor owns its document; `value` is only pushed in when it differs from what
 * the editor already has, which is how an external change (Revert, Reset to
 * defaults, switching embeds) lands without fighting the user's cursor mid-type.
 * That is also why the editor is built once and `value` is not a dependency of its
 * setup effect — it changes on every keystroke.
 */
export default function CodeEditor({ value, language, onChange, completions }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const completionsRef = useRef(completions)
  completionsRef.current = completions
  const editable = !!onChange

  useEffect(() => {
    const parent = hostRef.current
    if (!parent) return

    /**
     * Completes view-config prop names.
     *
     * Only fires where a key can go — after `{` or a comma — so it never offers
     * prop names while a string value is being typed. Reads the list through a ref
     * so switching embed type re-targets it without rebuilding the editor.
     */
    function completeProps(context: CompletionContext): CompletionResult | null {
      const list = completionsRef.current
      if (!list?.length) return null

      const word = context.matchBefore(/"?[\w]*/)
      if (!word) return null
      const before = context.state.doc.sliceString(Math.max(0, word.from - 200), word.from)
      const opener = before.replace(/\s*"?$/, '').trimEnd().slice(-1)
      if (opener !== '{' && opener !== ',') return null

      return {
        from: word.from,
        options: list.map((c) => ({
          label: word.text.startsWith('"') ? `"${c.label}"` : `"${c.label}": `,
          displayLabel: c.label,
          detail: c.detail,
          type: 'property',
        })),
        validFor: /^"?[\w]*$/,
      }
    }

    const extensions: Extension[] = [
      /* Ahead of basicSetup's own highlighter, which is the one that wins otherwise. */
      Prec.highest(syntaxHighlighting(radiantHighlight)),
      basicSetup,
      language === 'json' ? json() : javascript({ typescript: true }),
      indentUnit.of('  '),
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
      EditorState.readOnly.of(!editable),
      EditorView.editable.of(editable),
      editorTheme,
    ]

    if (editable) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
        }),
      )
    }
    if (language === 'json') {
      extensions.push(autocompletion({ override: [completeProps], icons: false }))
      if (editable) extensions.push(linter(jsonParseLinter()))
    }

    const view = new EditorView({ parent, doc: value, extensions })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, editable])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  return <div className={'ce-host' + (editable ? '' : ' ce-readonly')} ref={hostRef} />
}

/**
 * Syntax colours on the content tokens, so they follow the theme.
 *
 * `basicSetup` bundles CodeMirror's `defaultHighlightStyle`, whose colours are
 * fixed light-theme hexes — a near-black navy for keywords and property names, a
 * dark maroon for strings — which are close to unreadable on the dark surface.
 * These are the same roles on `content-*` tokens, which step to the lighter -50
 * ramp under `[data-theme='dark']`.
 *
 * Registered at `Prec.highest`: CodeMirror resolves a tag against the
 * highest-precedence style that covers it, so anything lower loses to basicSetup's.
 */
const radiantHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.self, tags.null], color: 'var(--rd-sys-color-content-accent-purple)' },
  { tag: [tags.controlKeyword, tags.operatorKeyword], color: 'var(--rd-sys-color-content-accent-purple)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--rd-sys-color-content-success)' },
  { tag: [tags.number, tags.bool, tags.atom], color: 'var(--rd-sys-color-content-warning)' },
  /* JSON keys and object properties — the blue that started this. */
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: 'var(--rd-sys-color-content-brand)' },
  { tag: [tags.variableName, tags.definition(tags.variableName)], color: 'var(--rd-sys-color-content-primary)' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--rd-sys-color-content-accent-blue)' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: 'var(--rd-sys-color-content-accent-blue)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--rd-sys-color-content-tertiary)', fontStyle: 'italic' },
  { tag: [tags.punctuation, tags.bracket, tags.separator, tags.operator], color: 'var(--rd-sys-color-content-secondary)' },
  { tag: tags.invalid, color: 'var(--rd-sys-color-content-failure)' },
  { tag: [tags.link, tags.url], color: 'var(--rd-sys-color-content-brand)', textDecoration: 'underline' },
])

/** Matches the Studio's surfaces; CodeMirror's own defaults are too generic here. */
const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    backgroundColor: 'var(--rd-sys-color-background-on-base)',
    border: '1px solid var(--rd-sys-color-border-subtle)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px color-mix(in srgb, var(--rd-sys-color-border-focus) 12%, transparent)',
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: '1.55',
    padding: '8px 0',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--rd-sys-color-background-on-base)',
    border: 'none',
    borderRight: '1px solid var(--rd-sys-color-border-subtle)',
    color: 'var(--rd-sys-color-content-tertiary)',
    fontSize: '10.5px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--rd-sys-color-background-secondary-action)',
    color: 'var(--rd-sys-color-content-secondary)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--rd-sys-color-content-brand) 5%, transparent)',
  },
  '.cm-content': { caretColor: 'var(--rd-sys-color-content-primary)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--rd-sys-color-background-ghost-highlight) !important' },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--rd-sys-color-background-ghost-highlight)',
    outline: '1px solid var(--rd-sys-color-border-focus)',
  },
  '.cm-tooltip': {
    border: '1px solid var(--rd-sys-color-border-subtle)',
    borderRadius: '9px',
    backgroundColor: 'var(--rd-sys-color-background-base)',
    boxShadow: 'var(--rd-sys-color-shadow-menu)',
    fontFamily: 'Optimo-Plain, "helvetica neue", helvetica, arial, sans-serif',
    fontSize: '12px',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete ul li': {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11.5px',
    padding: '4px 9px',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--rd-sys-color-background-ghost-highlight)',
    color: 'var(--rd-sys-color-content-primary)',
  },
  '.cm-completionDetail': {
    color: 'var(--rd-sys-color-content-tertiary)',
    fontStyle: 'normal',
    marginLeft: '10px',
  },
  '.cm-lintRange-error': { backgroundImage: 'none', borderBottom: '2px dotted var(--rd-sys-color-border-failure)' },
  '.cm-panels': {
    border: 'none',
    borderTop: '1px solid var(--rd-sys-color-border-subtle)',
    backgroundColor: 'var(--rd-sys-color-background-base)',
  },
})
