import type { SyntaxMode, TextCommit } from './types'
import { getChangeStats } from './utils/textMetrics'

export const ROOT_REVISION_ID = 'root'
export const WORKING_REVISION_ID = 'working'

export type InitialTextRevision = {
  syntaxMode: SyntaxMode
  text: string
}

export type TextRevisionSnapshot = {
  id: string
  syntaxMode: SyntaxMode
  text: string
}

export function getRootRevisionSnapshot(
  commits: ReadonlyArray<TextCommit>,
  initialRevision: InitialTextRevision,
): TextRevisionSnapshot {
  const rootChildCommit = getOldestRootChildCommit(commits)

  return {
    id: ROOT_REVISION_ID,
    syntaxMode: rootChildCommit?.beforeSyntaxMode ?? initialRevision.syntaxMode,
    text: rootChildCommit?.beforeText ?? initialRevision.text,
  }
}

export function getRevisionSnapshot({
  commits,
  initialRevision,
  revisionId,
}: {
  commits: ReadonlyArray<TextCommit>
  initialRevision: InitialTextRevision
  revisionId: string
}): TextRevisionSnapshot {
  if (revisionId === ROOT_REVISION_ID) {
    return getRootRevisionSnapshot(commits, initialRevision)
  }

  const commit = commits.find(({ id }) => id === revisionId)

  if (!commit) {
    return getRootRevisionSnapshot(commits, initialRevision)
  }

  return {
    id: commit.id,
    syntaxMode: commit.afterSyntaxMode,
    text: commit.afterText,
  }
}

export function hasRevisionTextChanged(
  baseRevision: TextRevisionSnapshot,
  text: string,
) {
  return baseRevision.text !== text
}

export function prepareHistoryBaseRevision({
  baseRevision,
  rootCaptured,
  syntaxMode,
  text,
}: {
  baseRevision: TextRevisionSnapshot
  rootCaptured: boolean
  syntaxMode: SyntaxMode
  text: string
}): {
  baseRevision: TextRevisionSnapshot
  capturedRoot: TextRevisionSnapshot | null
} {
  if (!rootCaptured && baseRevision.id === ROOT_REVISION_ID) {
    const capturedRoot = {
      id: ROOT_REVISION_ID,
      syntaxMode,
      text,
    }

    return { baseRevision: capturedRoot, capturedRoot }
  }

  return { baseRevision, capturedRoot: null }
}

export function createWorkingSnapshotCommit({
  baseRevision,
  currentSyntaxMode,
  currentText,
  description,
  id,
  timestamp,
  title,
}: {
  baseRevision: TextRevisionSnapshot
  currentSyntaxMode: SyntaxMode
  currentText: string
  description: string
  id: string
  timestamp: string
  title: string
}) {
  if (!hasRevisionTextChanged(baseRevision, currentText)) {
    return null
  }

  return createTextCommit({
    afterSyntaxMode: currentSyntaxMode,
    afterText: currentText,
    beforeSyntaxMode: baseRevision.syntaxMode,
    beforeText: baseRevision.text,
    description,
    id,
    parentId: baseRevision.id,
    timestamp,
    title,
  })
}

export function createTextCommit({
  afterSyntaxMode,
  afterText,
  beforeSyntaxMode,
  beforeText,
  description,
  id,
  parentId,
  timestamp,
  title,
}: Omit<TextCommit, 'charDelta' | 'lineDelta'>): TextCommit {
  const changeStats = getChangeStats(beforeText, afterText)

  return {
    afterSyntaxMode,
    afterText,
    beforeSyntaxMode,
    beforeText,
    charDelta: changeStats.charDelta,
    description,
    id,
    lineDelta: changeStats.lineDelta,
    parentId,
    timestamp,
    title,
  }
}

/**
 * Builds a commit id from a monotonically increasing sequence number.
 *
 * The sequence must be owned by the caller (a counter that never decreases)
 * so that truncating the linear history never reuses an id for a different
 * commit within the same session.
 */
export function getNextCommitId(seq: number) {
  return `c${String(seq).padStart(3, '0')}`
}

/**
 * Appends a commit to a linear, newest-first history.
 *
 * Because history is linear, "the children of a commit" are exactly the
 * commits that are newer than it. Appending a commit whose parent is not the
 * current tip therefore drops every commit newer than the parent (git's
 * branch-less reset + commit). Checking out a revision never calls this, so
 * checkout stays non-destructive until a new commit is created.
 */
export function appendCommit(
  commits: ReadonlyArray<TextCommit>,
  commit: TextCommit,
): Array<TextCommit> {
  const parentIndex = commits.findIndex(({ id }) => id === commit.parentId)
  // parentId === ROOT (or a missing parent) means everything is truncated.
  const kept = parentIndex === -1 ? [] : commits.slice(parentIndex)

  return [commit, ...kept]
}

/**
 * Returns the ids that are on the current line of history for a given base
 * revision: the base commit, every older commit, and the root.
 *
 * Commits that are *not* in this set are "future" commits (newer than the
 * checked-out base) that will be discarded when the next commit is created.
 * The UI dims them while keeping them clickable for redo.
 */
export function getLinearAncestorIds(
  commits: ReadonlyArray<TextCommit>,
  baseRevisionId: string,
): Set<string> {
  const ancestorIds = new Set<string>([ROOT_REVISION_ID])

  if (baseRevisionId === ROOT_REVISION_ID) {
    return ancestorIds
  }

  const baseIndex = commits.findIndex(({ id }) => id === baseRevisionId)

  if (baseIndex === -1) {
    return ancestorIds
  }

  for (let index = baseIndex; index < commits.length; index += 1) {
    ancestorIds.add(commits[index].id)
  }

  return ancestorIds
}

function getOldestRootChildCommit(commits: ReadonlyArray<TextCommit>) {
  for (let index = commits.length - 1; index >= 0; index -= 1) {
    const commit = commits[index]

    if (commit.parentId === ROOT_REVISION_ID) {
      return commit
    }
  }

  return null
}
