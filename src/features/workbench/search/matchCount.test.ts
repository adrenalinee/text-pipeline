import { SearchQuery } from '@codemirror/search'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { countMatches } from './matchCount'

function makeState(doc: string, selection?: { anchor: number; head: number }) {
  return EditorState.create({
    doc,
    selection: selection
      ? EditorSelection.single(selection.anchor, selection.head)
      : undefined,
  })
}

function makeQuery(spec: {
  caseSensitive?: boolean
  regexp?: boolean
  search: string
}) {
  return new SearchQuery({ literal: true, ...spec })
}

describe('countMatches', () => {
  it('counts plain string matches, case-insensitive by default', () => {
    const state = makeState('foo bar Foo')

    expect(countMatches(state, makeQuery({ search: 'foo' }))).toEqual({
      capped: false,
      current: 0,
      total: 2,
    })
  })

  it('respects case sensitivity', () => {
    const state = makeState('foo bar Foo')
    const query = makeQuery({ caseSensitive: true, search: 'foo' })

    expect(countMatches(state, query).total).toBe(1)
  })

  it('counts regexp matches', () => {
    const state = makeState('a1 b2 c')
    const query = makeQuery({ regexp: true, search: '[a-z]\\d' })

    expect(countMatches(state, query).total).toBe(2)
  })

  it('reports the 1-based index of the match under the selection', () => {
    const state = makeState('foo bar foo', { anchor: 8, head: 11 })

    expect(countMatches(state, makeQuery({ search: 'foo' })).current).toBe(2)
  })

  it('reports current 0 when the selection is not exactly on a match', () => {
    const state = makeState('foo bar foo', { anchor: 4, head: 7 })

    expect(countMatches(state, makeQuery({ search: 'foo' })).current).toBe(0)
  })

  it('stops counting at the limit and reports capped', () => {
    const state = makeState('a a a a a')

    expect(
      countMatches(state, makeQuery({ search: 'a' }), { limit: 3 }),
    ).toEqual({ capped: true, current: 0, total: 3 })
  })

  it('returns zeros for an invalid regexp', () => {
    const state = makeState('anything')
    const query = makeQuery({ regexp: true, search: '(' })

    expect(countMatches(state, query)).toEqual({
      capped: false,
      current: 0,
      total: 0,
    })
  })

  it('returns zeros for an empty search string', () => {
    const state = makeState('anything')

    expect(countMatches(state, makeQuery({ search: '' }))).toEqual({
      capped: false,
      current: 0,
      total: 0,
    })
  })
})
