import 'monaco-editor/esm/vs/editor/editor.all.js'
/* Colourisation. The `language/*` contributions below bring the language *services*
   — diagnostics, completions, formatting — but the tokenizer that actually paints a
   keyword blue lives in `basic-languages`, and without it every line renders as one
   undifferentiated token. JSON carries its own tokenizer, TypeScript does not. */
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import {
  SNAPSHOT_EMBED_SDK_VERSION,
  isModuleUrl,
  loadedVersion,
  storedSdkVersions,
} from '../thoughtspot/sdkLoader'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

/**
 * The one-time Monaco wiring every editor on the page shares: its workers, its
 * theme, and how much the TypeScript service is allowed to complain about.
 *
 * This is the Developer Playground's editor, matched deliberately: the code a user
 * copies out of the playground and the code they edit here should look like the same
 * surface, because it is the same code. That means Monaco rather than a lighter
 * editor — the playground's inline diagnostics and IntelliSense come from the real
 * TypeScript language service, and nothing else reproduces them.
 *
 * Monaco is taken from the ESM build so Vite can split and lazy-load it, and its
 * workers are declared here because a worker registered any other way is fetched
 * from a CDN this app never talks to.
 */

let started = false

/** Idempotent: every editor calls it, the first call does the work. */
export function setupMonaco(): typeof monaco {
  if (started) return monaco
  started = true

  window.MonacoEnvironment = {
    getWorker(_id, label) {
      if (label === 'json') return new JsonWorker()
      if (label === 'typescript' || label === 'javascript') return new TsWorker()
      return new EditorWorker()
    },
  }

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    noEmit: true,
  })
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: FRAGMENT_NOISE,
  })
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas: [],
  })

  monaco.languages.typescript.typescriptDefaults.addExtraLib(SCOPE_LIB, SCOPE_LIB_PATH)
  void loadSdkTypes()

  return monaco
}

const SDK_PACKAGE = '@thoughtspot/visual-embed-sdk'
const SDK_TYPES_PATH = `file:///node_modules/${SDK_PACKAGE}/index.d.ts`
const SCOPE_LIB_PATH = 'file:///studio-scope.d.ts'

/**
 * The names the panel's source is run with that no package declares.
 *
 * `embedSource.ts` injects them, so without this the editor marks correct source as
 * undefined names, and `container` completes to nothing where it is the argument the
 * constructor actually takes.
 */
const SCOPE_LIB = [
  'declare const container: HTMLElement',
  'declare function getTokenService(): Promise<string>',
  'declare function debounceFunc<T extends (...args: never[]) => unknown>(fn: T, wait?: number): T',
].join('\n')

/**
 * Teaches the TypeScript service what the SDK is, which is what turns the editor from
 * a text box into the playground's.
 *
 * Without it every SDK name is an unresolved import: no prop completion inside a view
 * config, no signature help on a constructor, no hover. The type definitions are not a
 * dependency of this app — no version of the SDK is — so they are fetched the same way
 * the SDK itself is, from the CDN, as the single bundled `.d.ts` the package ships.
 *
 * The types are the loaded version's whenever that is a published one. A PR build or a
 * tarball URL has no CDN types to fetch, so the pinned snapshot's stand in: props from
 * a nearby version are a far better guess than no props at all, and what actually
 * validates a config is the SDK at render, not this.
 *
 * Failure is silent by design. This is an editor affordance — the app works without it,
 * and a CDN that is down should cost completions, not the panel.
 */
async function loadSdkTypes(): Promise<void> {
  const loaded = loadedVersion('embed') ?? storedSdkVersions().embed
  const version = !loaded || isModuleUrl(loaded) ? SNAPSHOT_EMBED_SDK_VERSION : loaded
  const url = `https://cdn.jsdelivr.net/npm/${SDK_PACKAGE}@${version}/dist/visual-embed-sdk.d.ts`
  try {
    const response = await fetch(url)
    if (!response.ok) return
    const types = await response.text()
    monaco.languages.typescript.typescriptDefaults.addExtraLib(types, SDK_TYPES_PATH)
  } catch {
    /* empty */
  }
}


export { monaco }

/**
 * Monaco's own two themes, which the app's appearance picks between.
 *
 * `vs-dark` is VS Code Dark+, the theme the playground's editor runs; `vs` is its
 * light counterpart. Using the pair rather than pinning the dark one means a code
 * block on a light page is a light code block — the editor is part of this app's
 * surface, not a window cut through it.
 *
 * A theme in Monaco is global, not per-editor: setting it re-themes every editor on
 * the page at once, which is what should happen anyway.
 */
export const EDITOR_THEME_DARK = 'vs-dark'
export const EDITOR_THEME_LIGHT = 'vs'

/**
 * Diagnostics that are true of every snippet here and mean nothing.
 *
 * The panels hold fragments, not programs: an embed's SDK is loaded at runtime and
 * never resolves to a module on disk, a `Resulting call` preview names an `embed`
 * declared somewhere off screen, and every model the service sees shares one program,
 * so two panels declaring `embed` are a redeclaration to it and nothing to anyone
 * else. Left on, each would paint a red squiggle under correct code.
 *
 * The unknown-property errors are ignored for a different reason: the type
 * definitions are one published version's, while the SDK actually loaded may be
 * newer, so a prop that exists is not always a prop the types know. Completion still
 * offers everything the types do have — the list is a help, not a verdict.
 *
 * What is deliberately kept is the unused-import hint — the playground shows it, it
 * is right about pasted code, and it never accuses working code of being broken.
 */
const FRAGMENT_NOISE = [
  2304, // Cannot find name
  2307, // Cannot find module
  2339, // Property does not exist on type
  2300, // Duplicate identifier
  2451, // Cannot redeclare block-scoped variable
  2393, // Duplicate function implementation
  2353, // Object literal may only specify known properties
  2561, // ...did you mean to write this instead
  7006, // Parameter implicitly has an 'any' type
  7016, // Could not find a declaration file for module
  1375, // Top-level await needs module esnext
]

/**
 * The playground's own editor options, matched to `embed-code-editor.tsx`.
 *
 * Both apps take Monaco's built-in themes rather than registering their own, so the
 * colours are the same VS Code palette rather than a copy of it — which also keeps
 * every colour out of this file and inside Monaco, where a `var(--rd-…)` token could
 * not reach anyway. The theme is passed per editor, since it follows the app's
 * appearance; everything below is fixed.
 *
 * Differences from the playground, all deliberate: it pins the dark theme where this
 * follows the app, it lays out manually from a resize handle where this uses
 * `automaticLayout`, and it leaves `wordWrap` to the caller where this is always on —
 * a 400px side panel has no room to scroll sideways.
 */
export const BASE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontFamily: "Menlo, Monaco, 'Courier New', monospace",
  fontSize: 14,
  lineHeight: 21,
  fontLigatures: true,
  tabSize: 2,
  minimap: { enabled: false },
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  renderLineHighlight: 'none',
  glyphMargin: false,
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 8,
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  automaticLayout: true,
  fixedOverflowWidgets: true,
  autoClosingBrackets: 'never',
  wordBasedSuggestions: 'off',
  tabCompletion: 'on',
  showDeprecated: true,
  suggest: { showDeprecated: false, preview: true },
  padding: { top: 0, bottom: 0 },
  /* Off, so an editor inside a scrolling list hands the wheel back at its own end. */
  scrollbar: { verticalScrollbarSize: 14, horizontalScrollbarSize: 14, alwaysConsumeMouseWheel: false },
}
