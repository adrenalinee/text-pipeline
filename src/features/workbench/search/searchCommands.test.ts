import { SearchQuery } from '@codemirror/search'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { buildReplaceAllChanges, buildSingleReplace } from './searchCommands'

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
  replace: string
  search: string
}) {
  return new SearchQuery({ literal: true, ...spec })
}

function applyChanges(
  state: EditorState,
  changes: Array<{ from: number; insert: string; to: number }>,
) {
  return state.update({ changes }).state.doc.toString()
}

describe('buildReplaceAllChanges', () => {
  it('replaces every match literally', () => {
    const state = makeState('foo bar foo')
    const query = makeQuery({ replace: 'baz', search: 'foo' })
    const { changes, occurrences } = buildReplaceAllChanges(state, query, {
      preserveCase: false,
    })

    expect(occurrences).toBe(2)
    expect(applyChanges(state, changes)).toBe('baz bar baz')
  })

  it('adapts each replacement to the matched case when preserve case is on', () => {
    const state = makeState('foo Foo FOO')
    const query = makeQuery({ replace: 'bar', search: 'foo' })
    const { changes } = buildReplaceAllChanges(state, query, {
      preserveCase: true,
    })

    expect(applyChanges(state, changes)).toBe('bar Bar BAR')
  })

  it('expands regexp group references', () => {
    const state = makeState('a=1;b=2')
    const query = makeQuery({
      regexp: true,
      replace: '$2:$1',
      search: '(\\w)=(\\d)',
    })
    const { changes, occurrences } = buildReplaceAllChanges(state, query, {
      preserveCase: false,
    })

    expect(occurrences).toBe(2)
    expect(applyChanges(state, changes)).toBe('1:a;2:b')
  })

  it('respects case sensitivity', () => {
    const state = makeState('foo Foo')
    const query = makeQuery({
      caseSensitive: true,
      replace: 'bar',
      search: 'foo',
    })
    const { changes, occurrences } = buildReplaceAllChanges(state, query, {
      preserveCase: false,
    })

    expect(occurrences).toBe(1)
    expect(applyChanges(state, changes)).toBe('bar Foo')
  })

  it('returns no changes for an invalid regexp', () => {
    const state = makeState('anything')
    const query = makeQuery({ regexp: true, replace: 'x', search: '(' })

    expect(
      buildReplaceAllChanges(state, query, { preserveCase: false }),
    ).toEqual({ changes: [], occurrences: 0 })
  })
})

describe('buildSingleReplace', () => {
  it('replaces only when the selection sits exactly on a match', () => {
    const state = makeState('foo bar foo', { anchor: 8, head: 11 })
    const query = makeQuery({ replace: 'baz', search: 'foo' })
    const change = buildSingleReplace(state, query, { preserveCase: false })

    expect(change).toEqual({ from: 8, insert: 'baz', to: 11 })
  })

  it('returns null when the selection is not on a match', () => {
    const state = makeState('foo bar foo', { anchor: 4, head: 7 })
    const query = makeQuery({ replace: 'baz', search: 'foo' })

    expect(buildSingleReplace(state, query, { preserveCase: false })).toBeNull()
  })

  it('returns null for an empty selection', () => {
    const state = makeState('foo bar foo', { anchor: 0, head: 0 })
    const query = makeQuery({ replace: 'baz', search: 'foo' })

    expect(buildSingleReplace(state, query, { preserveCase: false })).toBeNull()
  })

  it('preserves the matched case when preserve case is on', () => {
    const state = makeState('say FOO', { anchor: 4, head: 7 })
    const query = makeQuery({ replace: 'bar', search: 'foo' })

    expect(buildSingleReplace(state, query, { preserveCase: true })).toEqual({
      from: 4,
      insert: 'BAR',
      to: 7,
    })
  })

  it('expands regexp groups in the single replacement', () => {
    const state = makeState('a=1', { anchor: 0, head: 3 })
    const query = makeQuery({
      regexp: true,
      replace: '$2:$1',
      search: '(\\w)=(\\d)',
    })

    expect(buildSingleReplace(state, query, { preserveCase: false })).toEqual({
      from: 0,
      insert: '1:a',
      to: 3,
    })
  })
})
