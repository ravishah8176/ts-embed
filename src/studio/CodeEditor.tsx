import { useEffect, useRef } from 'react'
import './CodeEditor.scss'
import { useIsDarkMode } from '../theme/useIsDarkMode'
import { BASE_OPTIONS, EDITOR_THEME_DARK, EDITOR_THEME_LIGHT, monaco, setupMonaco } from './monacoSetup'
import { jsonOutline, propsAtLine, type JsonProp } from './jsonOutline'

interface Props {
  value: string
  language: 'json' | 'typescript'
  /** Omitted for a read-only view, which is then not editable at all. */
  onChange?: (next: string) => void
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
   * fiddly part, and it is exactly the part a parse of the document already knows.
   */
  copyValues?: boolean
}

/**
 * The Studio's code surfaces: the view config a user edits, and the generated source
 * previews beside it.
 *
 * This is Monaco, set up as the ThoughtSpot Developer Playground sets it up — the same
 * editor, the same VS Code palette, the same Menlo-on-21px metrics (see
 * `monacoSetup.ts`). Code moves between the two apps constantly, so it reads as the
 * same surface in both, and the TypeScript service that marks a real mistake inline is
 * the playground's own. The one place it differs is the theme, which follows this
 * app's appearance rather than pinning the dark one.
 *
 * Without `onChange` it becomes a read-only, non-editable view that still highlights,
 * scrolls, folds and selects — which is all a preview needs.
 *
 * The editor owns its document; `value` is only pushed in when it differs from what
 * the editor already has, which is how an external change (Revert, Reset to defaults,
 * switching embeds) lands without fighting the user's cursor mid-type. That is also
 * why the editor is built once and `value` is not a dependency of its setup effect —
 * it changes on every keystroke.
 */
export default function CodeEditor({
  value,
  language,
  onChange,
  autoHeight,
  maxHeight,
  copyValues,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  /** Set while `value` is being pushed in, so that edit is not reported back as one. */
  const pushingRef = useRef(false)
  const editable = !!onChange
  const isDark = useIsDarkMode()
  const themeRef = useRef(isDark)
  themeRef.current = isDark

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const m = setupMonaco()
    /**
     * The document needs a `file:///` URI, not Monaco's default `inmemory://`.
     *
     * The TypeScript service resolves an import by walking up directories from the
     * file that wrote it, and the SDK's type definitions are registered under
     * `file:///node_modules/…`. A model outside that tree resolves nothing: the
     * import silently becomes `any`, and an editor with no types is an editor with
     * no prop completion, which is most of what makes this one worth having.
     */
    const model = m.editor.createModel(
      value,
      language,
      m.Uri.parse(`file:///studio/source-${modelSeq++}.${language === 'json' ? 'json' : 'ts'}`),
    )
    const editor = m.editor.create(host, {
      ...BASE_OPTIONS,
      model,
      theme: themeRef.current ? EDITOR_THEME_DARK : EDITOR_THEME_LIGHT,
      readOnly: !editable,
      domReadOnly: !editable,
      /* A preview has nothing to complete against and no error of its own to fix. */
      quickSuggestions: editable,
      renderValidationDecorations: editable ? 'editable' : 'off',
    })
    editorRef.current = editor

    const disposers: monaco.IDisposable[] = [
      editor.onDidChangeModelContent(() => {
        if (pushingRef.current) return
        onChangeRef.current?.(editor.getValue())
      }),
    ]

    if (autoHeight) {
      const cap = maxHeight ? parseFloat(maxHeight) : Infinity
      const fit = () => {
        const height = Math.min(editor.getContentHeight(), cap)
        host.style.height = `${height}px`
        editor.layout({ width: host.clientWidth, height })
      }
      disposers.push(editor.onDidContentSizeChange(fit))
      fit()
    }

    if (language === 'json' && copyValues) disposers.push(copyControls(editor))

    return () => {
      for (const d of disposers) d.dispose()
      editor.getModel()?.dispose()
      editor.dispose()
      editorRef.current = null
    }
  }, [language, editable, autoHeight, maxHeight, copyValues])

  /* Monaco themes are global, so this re-themes every editor on the page at once. */
  useEffect(() => {
    setupMonaco().editor.setTheme(isDark ? EDITOR_THEME_DARK : EDITOR_THEME_LIGHT)
  }, [isDark])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || editor.getValue() === value) return
    /* Not `setValue`: that drops the undo stack and the cursor with it. */
    pushingRef.current = true
    try {
      editor.executeEdits('external', [
        { range: editor.getModel()!.getFullModelRange(), text: value, forceMoveMarkers: true },
      ])
    } finally {
      pushingRef.current = false
    }
  }, [value])

  return (
    <div
      className={'ce-host' + (editable ? '' : ' ce-readonly') + (autoHeight ? ' ce-auto' : '')}
      ref={hostRef}
    />
  )
}

/** Every model needs its own URI; two editors sharing one would share its content. */
let modelSeq = 0

const COPY_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="9" width="11" height="11" rx="2" />' +
  '<path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>'

/**
 * Puts a copy control at the end of the line of every key that encloses the pointer.
 *
 * Every enclosing property counts, not just the innermost one: pointing at a leaf deep
 * in a response reveals the control on each key on the way out to the root, so the
 * branch wanted can be taken at whichever level it happens to sit. A control belongs to
 * its key, so the line it appears on is the line that key opens — which is nowhere near
 * the pointer once a value runs over several lines.
 *
 * They are content widgets rather than decorations because each one is a real control
 * with its own hover and click; only the handful covering the pointer exist at a time,
 * so a response of any size costs the same.
 */
function copyControls(editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable {
  let props = jsonOutline(editor.getValue())
  let shown = new Map<number, monaco.editor.IContentWidget>()
  let hovered = -1

  function clear() {
    for (const widget of shown.values()) editor.removeContentWidget(widget)
    shown = new Map()
  }

  function show(line: number) {
    if (line === hovered) return
    hovered = line
    clear()
    /* Several keys can open on one line; the outermost owns it, as the widest take. */
    const owners = new Map<number, JsonProp>()
    for (const prop of propsAtLine(props, line)) {
      const held = owners.get(prop.line)
      if (!held || prop.from < held.from) owners.set(prop.line, prop)
    }
    for (const [propLine, prop] of owners) {
      const widget = copyWidget(editor, prop)
      shown.set(propLine, widget)
      editor.addContentWidget(widget)
    }
  }

  const disposers = [
    editor.onDidChangeModelContent(() => {
      props = jsonOutline(editor.getValue())
      hovered = -1
      clear()
    }),
    editor.onMouseMove((e) => {
      const line = e.target.position?.lineNumber
      if (line) show(line)
    }),
    editor.onMouseLeave(() => {
      hovered = -1
      clear()
    }),
  ]

  return {
    dispose() {
      clear()
      for (const d of disposers) d.dispose()
    },
  }
}

/**
 * One control, for one key.
 *
 * What it copies depends on what the value is, because what is useful differs. An
 * object or an array copies as itself, braces included and key left off: it is already
 * a complete document, and a key would have to be stripped before it could be parsed,
 * diffed or posted back. A scalar copies with its key, because `10` or `true` on its
 * own says nothing about what it was — `"record_size": 10` is the paste that carries
 * its own meaning.
 */
function copyWidget(
  editor: monaco.editor.IStandaloneCodeEditor,
  prop: JsonProp,
): monaco.editor.IContentWidget {
  const label = prop.container ? 'Copy this value' : 'Copy this key and value'
  const node = document.createElement('span')
  node.className = 'ce-copy-value shown'
  node.title = label
  node.setAttribute('role', 'button')
  node.setAttribute('aria-label', label)
  node.innerHTML = COPY_SVG
  node.addEventListener('mousedown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const text = editor.getValue()
    const from = prop.container ? prop.valueFrom : prop.from
    const to = prop.container ? prop.valueTo : prop.to
    void navigator.clipboard?.writeText(text.slice(from, to))
    /* Confirmation on the control that was pressed, so nothing else on screen moves. */
    node.classList.add('copied')
    setTimeout(() => node.classList.remove('copied'), 900)
  })

  return {
    getId: () => `ce-copy-${prop.line}`,
    getDomNode: () => node,
    getPosition: () => ({
      position: { lineNumber: prop.line, column: Number.MAX_SAFE_INTEGER },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    }),
  }
}
