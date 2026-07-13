import { describe, expect, it } from 'vitest'

import { getLineAndColumn, getSelectionStats } from './textMetrics'

describe('getLineAndColumn', () => {
  it('returns line 1, column 1 for an empty document', () => {
    expect(getLineAndColumn('', 0)).toEqual({ column: 1, line: 1 })
  })

  it('finds the row and column of an offset on a later line', () => {
    expect(getLineAndColumn('one\ntwo\nthree', 9)).toEqual({
      column: 2,
      line: 3,
    })
  })

  it('clamps an offset past the end of the text', () => {
    expect(getLineAndColumn('abc', 99)).toEqual({ column: 4, line: 1 })
  })
})

describe('getSelectionStats', () => {
  it('returns null when there is no selection', () => {
    expect(getSelectionStats('hello world', 4, 4)).toBeNull()
  })

  it('counts characters and lines within a single-line selection', () => {
    expect(getSelectionStats('hello world', 0, 5)).toEqual({
      charCount: 5,
      lineCount: 1,
    })
  })

  it('counts lines spanned by a multi-line selection', () => {
    expect(getSelectionStats('one\ntwo\nthree', 0, 9)).toEqual({
      charCount: 9,
      lineCount: 3,
    })
  })
})
