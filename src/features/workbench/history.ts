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

export type CommitGraphSegment = {
  active: boolean
  lane: number
}

export type CommitGraphConnector = {
  active: boolean
  fromLane: number
  toLane: number
}

export type CommitGraphRow = {
  bottomSegments: Array<CommitGraphSegment>
  commit: TextCommit
  connectors: Array<CommitGraphConnector>
  isAncestor: boolean
  lane: number
  laneCount: number
  topSegments: Array<CommitGraphSegment>
}

export type CommitGraph = {
  ancestorIds: Set<string>
  laneCount: number
  rows: Array<CommitGraphRow>
}

type ActiveGraphLane = {
  pathActive: boolean
  targetId: string
}

export function getRootRevisionSnapshot(
  commits: ReadonlyArray<TextCommit>,
  initialRevision: InitialTextRevision,
): TextRevisionSnapshot {
  const rootChildCommit = getOldestRootChildCommit(commits)

  return {
    id: ROOT_REVISION_ID,
    syntaxMode:
      rootChildCommit?.beforeSyntaxMode ?? initialRevision.syntaxMode,
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

export function buildCommitGraph(
  commits: ReadonlyArray<TextCommit>,
  selectedRevisionId: string,
): CommitGraph {
  const ancestorIds = getRevisionAncestorIds(commits, selectedRevisionId)
  let activeLanes: Array<ActiveGraphLane> = []
  let laneCount = 1

  const rows = commits.map((commit) => {
    const incomingLaneIndexes = getLaneIndexes(activeLanes, commit.id)
    const activeLaneIndex = incomingLaneIndexes.at(0)
    const lane =
      activeLaneIndex === undefined ? activeLanes.length : activeLaneIndex
    const isAncestor = ancestorIds.has(commit.id)
    const topSegments = activeLanes.map(({ pathActive }, index) => ({
      active: pathActive,
      lane: index,
    }))

    if (activeLaneIndex === undefined) {
      activeLanes = [
        ...activeLanes,
        {
          pathActive: isAncestor,
          targetId: commit.id,
        },
      ]
    }

    const rowLaneCountBeforeUpdate = Math.max(activeLanes.length, lane + 1)
    const connectors = incomingLaneIndexes
      .filter((incomingLaneIndex) => incomingLaneIndex !== lane)
      .map((incomingLaneIndex) => ({
        active: activeLanes[incomingLaneIndex]?.pathActive ?? false,
        fromLane: incomingLaneIndex,
        toLane: lane,
      }))

    activeLanes = getNextActiveLanes(activeLanes, commit)

    const bottomSegments = activeLanes.map(({ pathActive }, index) => ({
      active: pathActive,
      lane: index,
    }))
    const rowLaneCount = Math.max(
      rowLaneCountBeforeUpdate,
      activeLanes.length,
      ...connectors.flatMap(({ fromLane, toLane }) => [fromLane + 1, toLane + 1]),
    )
    laneCount = Math.max(laneCount, rowLaneCount)

    return {
      bottomSegments,
      commit,
      connectors,
      isAncestor,
      lane,
      laneCount: rowLaneCount,
      topSegments,
    } satisfies CommitGraphRow
  })

  return {
    ancestorIds,
    laneCount,
    rows,
  }
}

export function getRevisionAncestorIds(
  commits: ReadonlyArray<TextCommit>,
  revisionId: string,
) {
  const commitsById = new Map(commits.map((commit) => [commit.id, commit]))
  const ancestorIds = new Set<string>()
  let currentRevisionId = revisionId

  while (currentRevisionId !== ROOT_REVISION_ID) {
    const commit = commitsById.get(currentRevisionId)

    if (!commit) {
      break
    }

    ancestorIds.add(commit.id)
    currentRevisionId = commit.parentId
  }

  if (currentRevisionId === ROOT_REVISION_ID) {
    ancestorIds.add(ROOT_REVISION_ID)
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

function getLaneIndexes(
  lanes: ReadonlyArray<ActiveGraphLane>,
  revisionId: string,
) {
  return lanes.flatMap((lane, index) =>
    lane.targetId === revisionId ? [index] : [],
  )
}

function getNextActiveLanes(
  activeLanes: ReadonlyArray<ActiveGraphLane>,
  commit: TextCommit,
) {
  const nextLanes =
    commit.parentId === ROOT_REVISION_ID
      ? activeLanes.filter(({ targetId }) => targetId !== commit.id)
      : activeLanes.map((lane) =>
          lane.targetId === commit.id
            ? {
                pathActive: lane.pathActive,
                targetId: commit.parentId,
              }
            : lane,
        )

  return trimTrailingInactiveRootLanes(nextLanes)
}

function trimTrailingInactiveRootLanes(lanes: Array<ActiveGraphLane>) {
  let lastLaneIndex = lanes.length - 1

  while (
    lastLaneIndex >= 0 &&
    lanes[lastLaneIndex]?.targetId === ROOT_REVISION_ID
  ) {
    lastLaneIndex -= 1
  }

  return lanes.slice(0, lastLaneIndex + 1)
}
