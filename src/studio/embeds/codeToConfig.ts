import { enumMemberValue } from './sdkEnums'
import type { ViewConfigValues } from './index'

/**
 * Reads a view config back out of the source the Code tab prints.
 *
 * The Code tab used to be print-only, which made it the one place in the panel
 * where a config could be read but not changed — awkward, because pasted source
 * from a real app is exactly what a user arrives with. Parsing it back means both
 * tabs edit the same config, and a paste becomes a running embed.
 *
 * Only the object literal in the `new SomethingEmbed(container, { … })` call is
 * read; the import line, the variable name and the `render()` call are the
 * surrounding shape and are ignored. Enum references are resolved through the
 * loaded SDK, so `Action.Save` comes back as the `'save'` the embed is given.
 *
 * This is a JS-literal parser rather than `eval` or `JSON.parse`: the printed
 * source has unquoted keys, single quotes, trailing commas and enum member paths,
 * none of which are JSON — and running the text would let a paste run anything.
 */

const IDENT_START = /[A-Za-z_$]/
const IDENT = /[A-Za-z_$][\w$]*/y
const NUMBER = /[+-]?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y

const ESCAPES: Record<string, string> = {
  n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0',
}

class Parser {
  i = 0
  constructor(readonly src: string) {}

  fail(message: string): never {
    throw new Error(`${message} (line ${this.src.slice(0, this.i).split('\n').length})`)
  }

  /** Whitespace and both comment forms; the printed source has neither, pasted source often does. */
  skip() {
    for (;;) {
      while (this.i < this.src.length && /\s/.test(this.src[this.i])) this.i++
      if (this.src.startsWith('//', this.i)) {
        const end = this.src.indexOf('\n', this.i)
        this.i = end === -1 ? this.src.length : end + 1
        continue
      }
      if (this.src.startsWith('/*', this.i)) {
        const end = this.src.indexOf('*/', this.i + 2)
        if (end === -1) this.fail('Unterminated comment')
        this.i = end + 2
        continue
      }
      return
    }
  }

  at(ch: string): boolean {
    this.skip()
    return this.src[this.i] === ch
  }

  expect(ch: string) {
    if (!this.at(ch)) this.fail(`Expected ${ch}`)
    this.i++
  }

  match(re: RegExp): string | null {
    re.lastIndex = this.i
    const hit = re.exec(this.src)
    if (!hit) return null
    this.i = re.lastIndex
    return hit[0]
  }

  value(): unknown {
    this.skip()
    const ch = this.src[this.i]
    if (ch === undefined) this.fail('Unexpected end of config')
    if (ch === '{') return this.object()
    if (ch === '[') return this.array()
    if (ch === '"' || ch === "'" || ch === '`') return this.string()
    if (ch === '(') this.fail('Functions and expressions cannot be applied from this panel')
    if (/[\d.+-]/.test(ch)) {
      const raw = this.match(NUMBER)
      if (raw === null) this.fail('Invalid number')
      return Number(raw)
    }
    if (IDENT_START.test(ch)) return this.reference()
    this.fail(`Unexpected ${JSON.stringify(ch)}`)
  }

  object(): Record<string, unknown> {
    this.expect('{')
    const out: Record<string, unknown> = {}
    while (!this.at('}')) {
      if (this.src.startsWith('...', this.i)) this.fail('Spreads cannot be resolved here — write the props out')
      const key = this.key()
      this.expect(':')
      const value = this.value()
      if (value !== undefined) out[key] = value
      if (this.at(',')) this.i++
      else break
    }
    this.expect('}')
    return out
  }

  key(): string {
    this.skip()
    const ch = this.src[this.i]
    if (ch === '"' || ch === "'") return this.string()
    if (ch === '[') this.fail('Computed keys cannot be resolved here')
    const ident = this.match(IDENT)
    if (ident === null) this.fail('Expected a prop name')
    return ident
  }

  array(): unknown[] {
    this.expect('[')
    const out: unknown[] = []
    while (!this.at(']')) {
      if (this.src.startsWith('...', this.i)) this.fail('Spreads cannot be resolved here — write the values out')
      out.push(this.value())
      if (this.at(',')) this.i++
      else break
    }
    this.expect(']')
    return out
  }

  string(): string {
    const quote = this.src[this.i++]
    if (quote === '`' && this.src.slice(this.i).includes('${')) {
      this.fail('Template placeholders cannot be resolved here')
    }
    let out = ''
    while (this.i < this.src.length) {
      const ch = this.src[this.i++]
      if (ch === quote) return out
      if (ch !== '\\') {
        if (ch === '\n' && quote !== '`') this.fail('Unterminated string')
        out += ch
        continue
      }
      const esc = this.src[this.i++]
      if (esc === undefined) this.fail('Unterminated string')
      if (esc === 'u' || esc === 'x') {
        const braced = esc === 'u' && this.src[this.i] === '{'
        const digits = braced
          ? this.src.slice(this.i + 1, this.src.indexOf('}', this.i))
          : this.src.substr(this.i, esc === 'u' ? 4 : 2)
        const code = Number.parseInt(digits, 16)
        if (Number.isNaN(code)) this.fail('Invalid escape')
        this.i += braced ? digits.length + 2 : digits.length
        out += String.fromCodePoint(code)
        continue
      }
      if (esc === '\n') continue
      out += ESCAPES[esc] ?? esc
    }
    this.fail('Unterminated string')
  }

  /** A bare word: a literal, or an `Enum.Member` path resolved against the loaded SDK. */
  reference(): unknown {
    const start = this.i
    const parts: string[] = [this.match(IDENT) as string]
    while (this.src[this.i] === '.') {
      this.i++
      const next = this.match(IDENT)
      if (next === null) this.fail('Expected a member name after "."')
      parts.push(next)
    }
    const path = parts.join('.')

    if (parts.length === 1) {
      if (path === 'true') return true
      if (path === 'false') return false
      if (path === 'null') return null
      if (path === 'undefined') return undefined
      this.i = start
      this.fail(`\`${path}\` is not a value — only literals and SDK enum members can be applied`)
    }
    if (parts.length > 2) {
      this.i = start
      this.fail(`\`${path}\` cannot be resolved`)
    }

    const resolved = enumMemberValue(parts[0], parts[1])
    if (resolved === null) {
      this.i = start
      this.fail(`\`${path}\` is not a member of \`${parts[0]}\` in the loaded SDK`)
    }
    return resolved
  }
}

/** Index of the config literal's `{`, skipping strings so a brace inside one is not it. */
function findConfigBrace(code: string, from: number): number {
  for (let i = from; i < code.length; i++) {
    const ch = code[i]
    if (ch === '{') return i
    if (ch === '"' || ch === "'" || ch === '`') {
      i++
      while (i < code.length && code[i] !== ch) i += code[i] === '\\' ? 2 : 1
      continue
    }
    if (code.startsWith('//', i)) {
      const end = code.indexOf('\n', i)
      i = end === -1 ? code.length : end
      continue
    }
    if (code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i + 2)
      if (end === -1) return -1
      i = end + 1
    }
  }
  return -1
}

/** Throws an `Error` whose message names the line, which is what the panel shows. */
export function codeToConfig(code: string): ViewConfigValues {
  const call = [...code.matchAll(/\bnew\s+[A-Za-z_$][\w$]*\s*\(/g)].pop()
  const imports = [...code.matchAll(/^[ \t]*import\b[^\n]*\n/gm)].pop()
  const from = call ? call.index + call[0].length : imports ? imports.index + imports[0].length : 0

  const start = findConfigBrace(code, from)
  if (start === -1) {
    throw new Error(
      call
        ? 'No config object in the embed call'
        : 'Expected a `new SomethingEmbed(container, { … })` call, or a config object on its own',
    )
  }

  const parser = new Parser(code)
  parser.i = start
  return parser.object() as ViewConfigValues
}
