/**
 * Downloads a published SDK package so the generators can read its files.
 *
 * Neither SDK is a dependency of this app — every version is fetched at runtime from a
 * CDN — so there is no `node_modules` copy to generate from. This fetches the npm
 * tarball for whatever version `sdk-versions.json` pins (or one named on the command
 * line), unpacks it under `node_modules/.cache`, and hands back the directory. The
 * cache is keyed by spec, so re-running a generator costs nothing after the first go.
 *
 * A spec can be a URL instead of a version, which is how a `pkg.pr.new` per-commit
 * build is generated against: those serve a tarball directly, so only resolving the
 * download differs.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const CACHE_ROOT = 'node_modules/.cache/sdk-sources'
const PINS_FILE = 'scripts/sdk-versions.json'

/** The version each generated artifact is built from, and the app's fallback. */
export function readPins() {
  return JSON.parse(fs.readFileSync(PINS_FILE, 'utf8'))
}

const isUrl = (spec) => /^https?:\/\//i.test(spec)

async function tarballUrl(pkg, spec) {
  if (isUrl(spec)) return spec
  const resp = await fetch(`https://registry.npmjs.org/${pkg}/${spec}`)
  if (!resp.ok) throw new Error(`${pkg}@${spec} is not on npm (${resp.status})`)
  return (await resp.json()).dist.tarball
}

/**
 * Fetches and unpacks one package, returning its root directory (the `package/` inside
 * the tarball) and the version its own `package.json` declares — which is the version
 * the app must fall back to, and is not derivable from a URL spec.
 */
export async function fetchSdkPackage(pkg, spec) {
  const dir = path.join(CACHE_ROOT, `${pkg.replace(/[@/]/g, '_')}__${spec.replace(/[^\w.-]/g, '_')}`)
  const root = path.join(dir, 'package')

  if (!fs.existsSync(root)) {
    const url = await tarballUrl(pkg, spec)
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Could not download ${url} (${resp.status})`)

    fs.mkdirSync(dir, { recursive: true })
    const tgz = path.join(dir, 'package.tgz')
    fs.writeFileSync(tgz, Buffer.from(await resp.arrayBuffer()))
    execFileSync('tar', ['-xzf', tgz, '-C', dir])
    fs.rmSync(tgz)
  }

  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
  return { root, version }
}
