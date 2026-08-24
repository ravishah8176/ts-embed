/**
 * Imports an ES module out of an npm tarball, in the browser.
 *
 * `pkg.pr.new` publishes a build per commit as a `.tgz` — the usual way to try a PR
 * of the SDK, and a version the picker accepts as a URL. `npm i <url>`
 * unpacks it at install time; this app never installs the SDK at all, and a browser cannot
 * `import()` a tarball, so the unpacking happens here instead: fetch, gunzip, read
 * the tar, and hand the entry module to `import()` as a blob URL.
 *
 * The wrinkle is that the SDK's browser bundle code-splits — its entry does
 * `import('./index-<hash>.js')`. A blob URL has no directory to resolve that
 * against, so every relative specifier is rewritten to the blob URL of the file it
 * names, deepest-first, before the entry is imported.
 */

/** Only the built browser bundles are kept; the tarball also carries src and cjs. */
const KEEP = /^package\/dist\/[^/]+\.(?:js|mjs)$/

const TAR_BLOCK = 512

interface TarEntry {
  name: string
  bytes: Uint8Array
}

function readString(block: Uint8Array, offset: number, length: number): string {
  let out = ''
  for (let i = offset; i < offset + length; i++) {
    if (block[i] === 0) break
    out += String.fromCharCode(block[i])
  }
  return out
}

/**
 * Reads the entries this loader cares about out of an uncompressed tar.
 *
 * Long-name entries (GNU 'L', pax 'x') are skipped along with their payload: they
 * only ever describe the deep `src/` paths, never the flat `dist/` names wanted
 * here, so resolving them would be work for files that are then discarded.
 */
function parseTar(buffer: ArrayBuffer): TarEntry[] {
  const view = new Uint8Array(buffer)
  const entries: TarEntry[] = []
  let offset = 0

  while (offset + TAR_BLOCK <= view.length) {
    const header = view.subarray(offset, offset + TAR_BLOCK)
    const name = readString(header, 0, 100)
    if (!name) break

    const size = Number.parseInt(readString(header, 124, 12).trim() || '0', 8)
    const typeFlag = String.fromCharCode(header[156] || 0x30)
    const dataStart = offset + TAR_BLOCK
    const padded = Math.ceil(size / TAR_BLOCK) * TAR_BLOCK

    if ((typeFlag === '0' || typeFlag === '\0') && KEEP.test(name)) {
      entries.push({ name, bytes: view.subarray(dataStart, dataStart + size) })
    }
    offset = dataStart + padded
  }
  return entries
}

/** Relative specifiers in one module: `from './x.js'` and `import('./x.js')`. */
const SPECIFIER = /(from\s*|import\s*\(\s*)(['"])(\.\/[^'"]+?)\2/g

/**
 * Builds a blob URL per file, rewriting relative imports to point at each other.
 *
 * Depth-first with a visiting set, so a cycle between two chunks degrades to
 * leaving that one specifier unrewritten rather than recursing forever. Rollup does
 * not emit cyclic chunks, but a broken bundle should not hang the page.
 */
function blobUrlFor(
  path: string,
  sources: Map<string, string>,
  built: Map<string, string>,
  visiting: Set<string>,
): string | null {
  const existing = built.get(path)
  if (existing) return existing

  const source = sources.get(path)
  if (source === undefined || visiting.has(path)) return null

  visiting.add(path)
  const rewritten = source.replace(SPECIFIER, (whole, head: string, quote: string, spec: string) => {
    const target = new URL(spec, `file:///${path}`).pathname.replace(/^\//, '')
    const url = blobUrlFor(target, sources, built, visiting)
    return url ? `${head}${quote}${url}${quote}` : whole
  })
  visiting.delete(path)

  const url = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }))
  built.set(path, url)
  return url
}

export interface TarballBundle {
  /** Paths present under `dist/`, for reporting when the entry is missing. */
  files: string[]
  /** Blob URL of the entry module, ready to `import()`. */
  entryUrl: string | null
}

/**
 * Parsed tarballs are kept for the life of the page: verifying a version and then
 * loading it would otherwise download the same 2MB twice.
 */
const cache = new Map<string, TarballBundle>()

export async function readTarballBundle(url: string, entryPath: string): Promise<TarballBundle> {
  const cached = cache.get(url)
  if (cached) return cached

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress a tarball (no DecompressionStream).')
  }

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`${url} returned ${resp.status}.`)
  if (!resp.body) throw new Error(`${url} returned no body.`)

  const plain = await new Response(resp.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  const entries = parseTar(plain)

  const sources = new Map<string, string>()
  const decoder = new TextDecoder()
  for (const entry of entries) sources.set(entry.name, decoder.decode(entry.bytes))

  const entryName = `package/${entryPath}`
  const built = new Map<string, string>()
  const bundle: TarballBundle = {
    files: [...sources.keys()].map((f) => f.replace(/^package\//, '')),
    entryUrl: sources.has(entryName) ? blobUrlFor(entryName, sources, built, new Set()) : null,
  }
  cache.set(url, bundle)
  return bundle
}

export async function importFromTarball(url: string, entryPath: string): Promise<unknown> {
  const bundle = await readTarballBundle(url, entryPath)
  if (!bundle.entryUrl) {
    throw new Error(
      `${url} has no ${entryPath} — this loader needs the built ES bundle. ` +
        `The tarball carries: ${bundle.files.slice(0, 6).join(', ') || 'no dist/ modules'}.`,
    )
  }
  return await import(/* @vite-ignore */ bundle.entryUrl)
}
