import { useEffect, useRef } from 'react'
import './CodeEditor.scss'
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, indentUnit, syntaxHighlighting, syntaxTree } from '@codemirror/language'
import { linter } from '@codemirror/lint'
import {
  EditorState,
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
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
  /**
   * Grow to the document's height instead of filling the parent.
   *
   * For output read inside a list that already scrolls: a fixed-height editor there
   * would nest a second scrollbar into the first even for two lines of JSON.
   */
  autoHeight?: boolean
  /**
   * With `autoHeight`, where growing stops and the editor scrolls instead.
   *
   * Growing without a limit is not an option for output of unknown size: a few
   * thousand lines of JSON reach tens of thousands of pixels, and every row after it
   * in the list is then off past all of that. Below the cap nothing nests, which is
   * the common case; above it, one bounded scroller beats an unbounded row.
   */
  maxHeight?: string
  /**
   * JSON only: a copy control on every key, revealed when its row is hovered, which
   * copies that key's value — the scalar for a leaf, the whole subtree for an object
   * or an array.
   *
   * Reading a response means wanting one branch of it: the object under a key, not the
   * envelope around it. Selecting that by hand across a screenful of nesting is the
   * fiddly part, and it is exactly the part the syntax tree already knows.
   */
  copyValues?: boolean
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
export default function CodeEditor({
  value,
  language,
  onChange,
  completions,
  autoHeight,
  maxHeight,
  copyValues,
}: Props) {
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

    /* After `editorTheme`, so this wins the `height` it sets on the same selector. */
    if (autoHeight) {
      extensions.push(
        EditorView.theme({
          '&': { height: 'auto' },
          ...(maxHeight ? { '.cm-scroller': { maxHeight } } : {}),
        }),
      )
    }

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
      if (copyValues) extensions.push(hoverPos, hoverTracker, copyValuePlugin)
    }

    const view = new EditorView({ parent, doc: value, extensions })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, editable, autoHeight, maxHeight, copyValues])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  return (
    <div
      className={'ce-host' + (editable ? '' : ' ce-readonly') + (autoHeight ? ' ce-auto' : '')}
      ref={hostRef}
    />
  )
}

const COPY_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="9" width="11" height="11" rx="2" />' +
  '<path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>'

/**
 * The copy control that sits at the end of one property's line.
 *
 * It carries the range it copies rather than looking it up on click: the widget is
 * rebuilt whenever the document or the viewport changes, so the range it was built
 * with is the range that is still under it.
 */
class CopyValueWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly shown: boolean,
    readonly label: string,
  ) {
    super()
  }

  eq(other: CopyValueWidget) {
    return (
      other.from === this.from &&
      other.to === this.to &&
      other.shown === this.shown &&
      other.label === this.label
    )
  }

  /** The widget handles its own clicks; the editor should not also treat them as its own. */
  ignoreEvent() {
    return true
  }

  toDOM(view: EditorView) {
    const el = document.createElement('span')
    el.className = 'ce-copy-value' + (this.shown ? ' shown' : '')
    el.title = this.label
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', this.label)
    el.innerHTML = COPY_SVG
    el.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      void navigator.clipboard?.writeText(view.state.doc.sliceString(this.from, this.to))
      /* Confirmation on the control that was pressed, so nothing else on screen moves. */
      el.classList.add('copied')
      setTimeout(() => el.classList.remove('copied'), 900)
    })
    return el
  }
}

/** The document position the pointer is over, or null when it has left the content. */
const setHoverPos = StateEffect.define<number | null>()

const hoverPos = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setHoverPos)) return effect.value
    return value
  },
})

/**
 * Line numbers whose key should be showing its copy control, for a hovered position.
 *
 * Every enclosing property counts, not just the innermost one: pointing at a leaf deep
 * in a response reveals the control on each key on the way out to the root, so the
 * branch wanted can be taken at whichever level it happens to sit. A control belongs to
 * its key, so the line it appears on is the line that key opens — which is nowhere near
 * the pointer once a value runs over several lines.
 *
 * The tree is read at the line's first non-space character, not under the pointer: deep
 * indentation is a wide target that parses as nothing, so pointing at it would drop the
 * row's own key and reveal only its ancestors. A row reads as one thing, so anywhere
 * along it resolves the same.
 */
function keyLinesFor(state: EditorState, pos: number | null): Set<number> {
  const lines = new Set<number>()
  if (pos === null) return lines
  const line = state.doc.lineAt(pos)
  const indent = line.text.length - line.text.trimStart().length
  let node = syntaxTree(state).resolveInner(line.from + indent, 1)
  for (;;) {
    if (node.name === 'Property') lines.add(state.doc.lineAt(node.from).number)
    const parent = node.parent
    if (!parent) return lines
    node = parent
  }
}

/**
 * One copy control per property, at the end of the line the property opens on.
 *
 * What it copies depends on what the value is, because what is useful differs. An
 * object or an array copies as itself, braces included and key left off: it is already
 * a complete document, and a key would have to be stripped before it could be parsed,
 * diffed or posted back. A scalar copies with its key, because `10` or `true` on its
 * own says nothing about what it was — `"record_size": 10` is the paste that carries
 * its own meaning.
 *
 * Either way the range comes from the syntax tree: the end of a nested value is nowhere
 * near the key that names it. Built only across `visibleRanges`, so a response of any
 * size costs the same.
 */
function buildCopyWidgets(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  const shownOn = keyLinesFor(view.state, view.state.field(hoverPos))
  let lastLine = -1

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'Property') return
        const value = node.node.lastChild
        if (!value) return
        const line = doc.lineAt(node.from)
        /* One per line, and in ascending order — what RangeSetBuilder requires. */
        if (line.number <= lastLine) return
        lastLine = line.number

        const nested = value.name === 'Object' || value.name === 'Array'
        const range = nested ? value : node
        const label = nested
          ? `Copy this ${value.name === 'Array' ? 'array' : 'object'}`
          : 'Copy this key and value'
        builder.add(
          line.to,
          line.to,
          Decoration.widget({
            widget: new CopyValueWidget(range.from, range.to, shownOn.has(line.number), label),
            side: 1,
          }),
        )
      },
    })
  }
  return builder.finish()
}

/**
 * Reports the pointer's position, but only when it crosses into a different line.
 *
 * Every report rebuilds the decorations, so reporting per pixel would rebuild per
 * pixel for a result that only ever changes per line.
 */
const hoverTracker = EditorView.domEventHandlers({
  mousemove(event, view) {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    const current = view.state.field(hoverPos, false) ?? null
    const sameLine =
      pos !== null &&
      current !== null &&
      view.state.doc.lineAt(pos).number === view.state.doc.lineAt(current).number
    if (sameLine || (pos === null && current === null)) return false
    view.dispatch({ effects: setHoverPos.of(pos) })
    return false
  },
  mouseleave(_event, view) {
    if (view.state.field(hoverPos, false) == null) return false
    view.dispatch({ effects: setHoverPos.of(null) })
    return false
  },
})

const copyValuePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildCopyWidgets(view)
    }

    update(update: ViewUpdate) {
      const hoverMoved =
        update.startState.field(hoverPos, false) !== update.state.field(hoverPos, false)
      if (update.docChanged || update.viewportChanged || hoverMoved) {
        this.decorations = buildCopyWidgets(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
)

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
