/**
 * Fails on colour literals in TypeScript, which stylelint cannot see.
 *
 * The SCSS side is guarded by `color-no-hex` in stylelint.config.js, but a
 * hardcoded colour in a `.tsx` inline style or a CodeMirror theme object is
 * exactly as broken — it cannot respond to `data-theme`, so it silently opts
 * that element out of dark mode. That class of bug is how the whole editor
 * surface stayed light after the first migration pass.
 *
 * Colours in TS reference the custom properties directly:
 *   'var(--rd-sys-color-background-base)'
 *
 * A genuine categorical palette is the one legitimate exception — Radiant has
 * six accent hues and the REST catalogue needs twenty-four distinguishable
 * ones. Mark those with a `categorical-palette` comment on, or within three
 * lines above, the literal. The marker is deliberately explicit: an exception
 * should be a decision someone wrote down, not a filename on an allowlist.
 */
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const HEX = /#[0-9a-fA-F]{3,8}\b/g
const MARKER = 'categorical-palette'

/**
 * A marker covers the whole declaration that follows it, however many lines the
 * palette runs to — it opens on the marker and closes when braces balance again.
 * A marker with no braces on the following line covers that one line only.
 */
const OPEN_SEARCH = 8

function markedRanges(lines) {
  const ranges = []

  lines.forEach((line, i) => {
    if (!line.includes(MARKER)) return

    // The marker usually sits in a doc comment, so the declaration it describes
    // can be several lines below it — find where the block actually opens.
    let start = -1
    for (let j = i; j < Math.min(lines.length, i + OPEN_SEARCH); j++) {
      if (/[{[]/.test(lines[j])) {
        start = j
        break
      }
    }

    if (start === -1) return void ranges.push([i, i])

    let depth = 0
    for (let j = start; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{' || ch === '[') depth++
        else if (ch === '}' || ch === ']') depth--
      }
      if (depth <= 0) return void ranges.push([i, j])
    }

    ranges.push([i, lines.length - 1])
  })

  return ranges
}

const files = globSync('src/**/*.{ts,tsx}')
const findings = []

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const marked = markedRanges(lines)

  lines.forEach((line, i) => {
    // Skip anything that is only describing a colour rather than setting one.
    const code = line.replace(/\/\/.*$/, '')
    const matches = code.match(HEX)
    if (!matches) return

    if (marked.some(([from, to]) => i >= from && i <= to)) return

    findings.push(`${file}:${i + 1}  ${matches.join(' ')}  ${line.trim()}`)
  })
}

if (findings.length) {
  console.error(`\nColour literals found in TypeScript (${findings.length}):\n`)
  for (const f of findings) console.error(`  ${f}`)
  console.error(
    `\nUse 'var(--rd-sys-color-<token>)', or 'currentColor' for an icon that should` +
      `\ntrack its text colour. If this really is a categorical data palette, add a` +
      `\n'${MARKER}' comment above it.\n`,
  )
  process.exit(1)
}

console.log(`No colour literals in ${files.length} TypeScript files.`)
