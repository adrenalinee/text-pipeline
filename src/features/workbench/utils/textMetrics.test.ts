import { describe, expect, it } from 'vitest'

import {
  getLineAndColumn,
  getOffsetForLineAndColumn,
  getSelectionStats,
} from './textMetrics'

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

describe('getOffsetForLineAndColumn', () => {
  it('returns offset 0 for line 1, column 1', () => {
    expect(getOffsetForLineAndColumn('one\ntwo', 1, 1)).toBe(0)
  })

  it('finds the offset of a column on a later line', () => {
    expect(getOffsetForLineAndColumn('one\ntwo\nthree', 3, 2)).toBe(9)
  })

  it('is the inverse of getLineAndColumn', () => {
    const text = 'alpha\r\nbeta\ngamma'
    const offset = 12
    const { line, column } = getLineAndColumn(text, offset)
    expect(getOffsetForLineAndColumn(text, line, column)).toBe(offset)
  })

  it('clamps a column past the end of the line', () => {
    expect(getOffsetForLineAndColumn('abc\ndef', 1, 99)).toBe(3)
  })

  it('clamps a line past the end of the document', () => {
    expect(getOffsetForLineAndColumn('abc\ndef', 99, 1)).toBe(4)
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
