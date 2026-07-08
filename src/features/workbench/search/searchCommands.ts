import { findNext } from '@codemirror/search'
import type { SearchQuery } from '@codemirror/search'
import { EditorSelection } from '@codemirror/state'
import type { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { adaptReplacementCase, expandRegExpReplacement } from './preserveCase'

/**
 * The shape of the values produced by `SearchQuery.getCursor`. The public
 * typing only exposes `from`/`to`; regexp cursors also carry the match array
 * and string cursors a `precise` flag (false when the range covers content
 * that is not part of the actual normalized match).
 */
type SearchMatch = {
  from: number
  to: number
  match?: RegExpMatchArray
  precise?: boolean
}

export type ReplaceOutcome = {
  afterText: string
  beforeText: string
  changed: boolean
  occurrences: number
}

export type ReplaceOptions = {
  preserveCase: boolean
}

/**
 * Custom replace commands are used instead of the built-in
 * `replaceNext`/`replaceAll` because those support neither preserve-case nor
 * reporting the before/after text needed for history commits. Queries are
 * expected to be built with `literal: true`, so `query.replace` is taken
 * verbatim apart from regexp group expansion.
 */
function buildReplacement(
  state: EditorState,
  query: SearchQuery,
  match: SearchMatch,
  preserveCase: boolean,
) {
  const base =
    query.regexp && match.match
      ? expandRegExpReplacement(query.replace, match.match)
      : query.replace

  if (!preserveCase) {
    return base
  }

  return adaptReplacementCase(state.sliceDoc(match.from, match.to), base)
}

function nextCursorMatch(
  state: EditorState,
  query: SearchQuery,
  from: number,
): SearchMatch | null {
  const step = query.getCursor(state, from).next()

  return step.done ? null : step.value
}

function getMatchAtSelection(
  state: EditorState,
  query: SearchQuery,
): SearchMatch | null {
  const selection = state.selection.main

  if (selection.empty) {
    return null
  }

  const match = nextCursorMatch(state, query, selection.from)

  if (match && match.from === selection.from && match.to === selection.to) {
    return match
  }

  return null
}

function findNextMatch(
  state: EditorState,
  query: SearchQuery,
  after: number,
  exclude: { from: number; to: number },
): SearchMatch | null {
  const forward = nextCursorMatch(state, query, after)

  if (forward) {
    return forward
  }

  const wrapped = nextCursorMatch(state, query, 0)

  if (wrapped && (wrapped.from !== exclude.from || wrapped.to !== exclude.to)) {
    return wrapped
  }

  return null
}

/**
 * Returns the single change to apply when the main selection sits exactly on
 * a match, or null when there is nothing to replace at the selection.
 */
export function buildSingleReplace(
  state: EditorState,
  query: SearchQuery,
  { preserveCase }: ReplaceOptions,
): { from: number; insert: string; to: number } | null {
  if (!query.valid) {
    return null
  }

  const match = getMatchAtSelection(state, query)

  if (!match || match.precise === false) {
    return null
  }

  return {
    from: match.from,
    insert: buildReplacement(state, query, match, preserveCase),
    to: match.to,
  }
}

/**
 * Builds the change set that replaces every match in the document.
 */
export function buildReplaceAllChanges(
  state: EditorState,
  query: SearchQuery,
  { preserveCase }: ReplaceOptions,
): {
  changes: Array<{ from: number; insert: string; to: number }>
  occurrences: number
} {
  if (!query.valid) {
    return { changes: [], occurrences: 0 }
  }

  const changes: Array<{ from: number; insert: string; to: number }> = []
  const cursor = query.getCursor(state)

  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    const match = step.value as SearchMatch

    if (match.precise === false) {
      continue
    }

    changes.push({
      from: match.from,
      insert: buildReplacement(state, query, match, preserveCase),
      to: match.to,
    })
  }

  return { changes, occurrences: changes.length }
}

/**
 * Replaces the match under the main selection and moves the selection to the
 * next match (wrapping around). When the selection is not on a match, only
 * moves to the next match — IntelliJ semantics where the first activation
 * selects and the second one replaces.
 */
export function replaceCurrentMatch(
  view: EditorView,
  query: SearchQuery,
  options: ReplaceOptions,
): ReplaceOutcome {
  const state = view.state
  const beforeText = state.doc.toString()
  const replace = buildSingleReplace(state, query, options)

  if (!replace) {
    findNext(view)

    return { afterText: beforeText, beforeText, changed: false, occurrences: 0 }
  }

  const changes = state.changes({
    from: replace.from,
    insert: replace.insert,
    to: replace.to,
  })
  const next = findNextMatch(state, query, replace.to, replace)
  const selection = next
    ? EditorSelection.single(next.from, next.to).map(changes)
    : EditorSelection.single(replace.from + replace.insert.length)

  view.dispatch({
    changes,
    effects: EditorView.scrollIntoView(selection.main, { y: 'nearest' }),
    selection,
    userEvent: 'input.replace',
  })

  const afterText = view.state.doc.toString()

  return {
    afterText,
    beforeText,
    changed: afterText !== beforeText,
    occurrences: 1,
  }
}

/**
 * Replaces every match in the document in a single transaction.
 */
export function replaceAllMatches(
  view: EditorView,
  query: SearchQuery,
  options: ReplaceOptions,
): ReplaceOutcome {
  const state = view.state
  const beforeText = state.doc.toString()
  const { changes, occurrences } = buildReplaceAllChanges(state, query, options)

  if (occurrences === 0) {
    return { afterText: beforeText, beforeText, changed: false, occurrences: 0 }
  }

  view.dispatch({ changes, userEvent: 'input.replace.all' })

  const afterText = view.state.doc.toString()

  return {
    afterText,
    beforeText,
    changed: afterText !== beforeText,
    occurrences,
  }
}
