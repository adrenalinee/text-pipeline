import { describe, expect, it } from 'vitest'

import { cropToSelection } from './cropSelection'

describe('cropToSelection', () => {
  it('keeps only the selected range', () => {
    expect(cropToSelection('hello world', 6, 11)).toBe('world')
  })

  it('normalizes a reversed selection', () => {
    expect(cropToSelection('hello world', 11, 6)).toBe('world')
  })

  it('clamps a selection that runs past the end of the text', () => {
    expect(cropToSelection('abc', 1, 99)).toBe('bc')
  })

  it('preserves newlines and whitespace inside the selection', () => {
    expect(cropToSelection('one\n  two\nthree', 4, 9)).toBe('  two')
  })

  it('throws when the selection is empty', () => {
    expect(() => cropToSelection('hello', 2, 2)).toThrow(
      'Select text in the editor before cropping.',
    )
  })
})
