/**
 * Where every property of a JSON document starts and ends.
 *
 * The per-key copy control needs two things no editor API gives it: which keys
 * enclose the line under the pointer, and how far each of their values runs. Under
 * CodeMirror that came from the parser's syntax tree; Monaco keeps its parse inside
 * a worker and hands back diagnostics rather than a tree, so the document is scanned
 * here instead.
 *
 * The scan is deliberately a scan and not `JSON.parse`: offsets are the whole point,
 * and `JSON.parse` throws them away. Invalid input yields whatever was read before
 * the break, which is the right answer for a response that is still streaming in or
 * a body being typed.
 */

export interface JsonProp {
  /** 1-based line the key opens on — where the control is drawn. */
  line: number
  /** 1-based line the value ends on. */
  endLine: number
  /** Offsets of the whole `"key": value` span. */
  from: number
  to: number
  /** Offsets of the value alone. */
  valueFrom: number
  valueTo: number
  /** An object or an array; it copies as itself, where a scalar copies with its key. */
  container: boolean
}

const SCALAR = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/

export function jsonOutline(text: string): JsonProp[] {
  const props: JsonProp[] = []
  const lineAt = lineIndexer(text)
  let i = 0

  function ws() {
    while (i < text.length && /\s/.test(text[i])) i++
  }

  function string(): boolean {
    if (text[i] !== '"') return false
    i++
    while (i < text.length) {
      const ch = text[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      i++
      if (ch === '"') return true
    }
    return false
  }

  function value(): boolean {
    ws()
    const ch = text[i]
    if (ch === '{') return object()
    if (ch === '[') return array()
    if (ch === '"') return string()
    const m = SCALAR.exec(text.slice(i, i + 32))
    if (!m) return false
    i += m[0].length
    return true
  }

  function array(): boolean {
    i++
    for (;;) {
      ws()
      if (text[i] === ']') return (i++, true)
      if (!value()) return false
      ws()
      if (text[i] === ',') {
        i++
        continue
      }
      if (text[i] === ']') return (i++, true)
      return false
    }
  }

  function object(): boolean {
    i++
    for (;;) {
      ws()
      if (text[i] === '}') return (i++, true)
      const from = i
      if (!string()) return false
      ws()
      if (text[i] !== ':') return false
      i++
      ws()
      const valueFrom = i
      const container = text[i] === '{' || text[i] === '['
      if (!value()) return false
      props.push({
        line: lineAt(from),
        endLine: lineAt(Math.max(valueFrom, i - 1)),
        from,
        to: i,
        valueFrom,
        valueTo: i,
        container,
      })
      ws()
      if (text[i] === ',') {
        i++
        continue
      }
      if (text[i] === '}') return (i++, true)
      return false
    }
  }

  value()
  return props
}

/** Every property whose value spans the given line, innermost last. */
export function propsAtLine(props: JsonProp[], line: number): JsonProp[] {
  return props.filter((p) => line >= p.line && line <= p.endLine)
}

/** Offset to 1-based line, by binary search over the line starts. */
function lineIndexer(text: string): (offset: number) => number {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}
