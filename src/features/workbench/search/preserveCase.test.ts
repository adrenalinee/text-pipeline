import { describe, expect, it } from 'vitest'

import { adaptReplacementCase, expandRegExpReplacement } from './preserveCase'

describe('adaptReplacementCase', () => {
  it('upper-cases the replacement for an all-uppercase match', () => {
    expect(adaptReplacementCase('FOO', 'bar')).toBe('BAR')
  })

  it('capitalizes the replacement for a capitalized match', () => {
    expect(adaptReplacementCase('Foo', 'bar')).toBe('Bar')
  })

  it('keeps the replacement as typed for a lowercase match', () => {
    expect(adaptReplacementCase('foo', 'Bar')).toBe('Bar')
  })

  it('keeps the replacement as typed for a mixed-case match', () => {
    expect(adaptReplacementCase('fooBar', 'baz')).toBe('baz')
  })

  it('treats a single uppercase letter as capitalized, not all-caps', () => {
    expect(adaptReplacementCase('F', 'bar')).toBe('Bar')
  })

  it('ignores non-letter characters when detecting the case style', () => {
    expect(adaptReplacementCase('FOO_BAR', 'baz qux')).toBe('BAZ QUX')
  })

  it('returns the replacement unchanged when the match has no letters', () => {
    expect(adaptReplacementCase('123', 'Bar')).toBe('Bar')
  })

  it('returns an empty replacement unchanged', () => {
    expect(adaptReplacementCase('FOO', '')).toBe('')
  })
})

describe('expandRegExpReplacement', () => {
  const match = 'foo123'.match(/(foo)(\d+)/)

  if (!match) {
    throw new Error('test fixture regexp did not match')
  }

  it('expands numbered group references', () => {
    expect(expandRegExpReplacement('$2-$1', match)).toBe('123-foo')
  })

  it('expands escaped control characters', () => {
    expect(expandRegExpReplacement('\\n\\r\\t', match)).toBe('\n\r\t')
  })

  it('expands an escaped backslash without consuming following text', () => {
    expect(expandRegExpReplacement('\\\\n', match)).toBe('\\n')
  })

  it('keeps unsupported escape sequences as typed', () => {
    expect(expandRegExpReplacement('\\x', match)).toBe('\\x')
  })

  it('expands $& to the whole match', () => {
    expect(expandRegExpReplacement('$&!', match)).toBe('foo123!')
  })

  it('expands $$ to a literal dollar sign', () => {
    expect(expandRegExpReplacement('$$1', match)).toBe('$1')
  })

  it('keeps out-of-range group references as-is', () => {
    expect(expandRegExpReplacement('$9', match)).toBe('$9')
  })

  it('falls back to a shorter group number plus trailing digits', () => {
    expect(expandRegExpReplacement('$12', match)).toBe('foo2')
  })

  it('expands non-participating groups to an empty string', () => {
    const optional = 'ab'.match(/(a)(x)?(b)/)

    if (!optional) {
      throw new Error('test fixture regexp did not match')
    }

    expect(expandRegExpReplacement('[$2]', optional)).toBe('[]')
  })
})
