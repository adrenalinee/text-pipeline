import type { SearchQuery } from '@codemirror/search'
import type { EditorState } from '@codemirror/state'

export const MATCH_COUNT_LIMIT = 1000

export type MatchCountResult = {
  /** 1-based index of the match the main selection sits on, 0 when none. */
  current: number
  total: number
  /** True when counting stopped at the limit, so `total` reads "limit+". */
  capped: boolean
}

export const EMPTY_MATCH_COUNT: MatchCountResult = {
  capped: false,
  current: 0,
  total: 0,
}

/**
 * Counts the matches of a search query across the whole document. There is
 * no built-in count API in @codemirror/search, so this walks the query's
 * search cursor, stopping at `limit` to stay cheap on very large documents.
 */
export function countMatches(
  state: EditorState,
  query: SearchQuery,
  { limit = MATCH_COUNT_LIMIT }: { limit?: number } = {},
): MatchCountResult {
  if (!query.valid) {
    return EMPTY_MATCH_COUNT
  }

  const { from, to } = state.selection.main
  const cursor = query.getCursor(state)
  let total = 0
  let current = 0
  let capped = false

  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    total += 1

    if (step.value.from === from && step.value.to === to) {
      current = total
    }

    if (total >= limit) {
      capped = true
      break
    }
  }

  return { capped, current, total }
}
