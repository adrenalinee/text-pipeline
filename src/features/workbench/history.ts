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
  const oldestCommit = commits.at(-1)

  return {
    id: ROOT_REVISION_ID,
    syntaxMode: oldestCommit?.beforeSyntaxMode ?? initialRevision.syntaxMode,
    text: oldestCommit?.beforeText ?? initialRevision.text,
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

export function getNextCommitId(
  commits: ReadonlyArray<TextCommit>,
  offset = 1,
) {
  return `c${String(commits.length + offset).padStart(3, '0')}`
}
