import { Box, Group, Stack, Text } from '@mantine/core'
import { CircleDot } from 'lucide-react'
import type { CSSProperties } from 'react'

import {
  buildCommitGraph,
  ROOT_REVISION_ID,
  WORKING_REVISION_ID,
  type CommitGraphConnector,
  type CommitGraphRow,
  type CommitGraphSegment,
} from '../history'
import type { TextCommit } from '../types'
import { countLines, formatSignedValue } from '../utils/textMetrics'
import { SidebarSection } from './SidebarSection'

type HistorySidebarProps = {
  commits: ReadonlyArray<TextCommit>
  currentText: string
  onRestoreCommit: (commit: TextCommit) => void
  onRestoreCommitParent: (commit: TextCommit) => void
  onRestoreRoot: () => void
  selectedRevisionId: string
  workingBaseRevisionId: string
}

const GRAPH_LANE_GAP = 14
const GRAPH_PADDING = 8
const GRAPH_MAX_WIDTH = 86
const GRAPH_HEIGHT = 100
const GRAPH_CENTER_Y = GRAPH_HEIGHT / 2

export function HistorySidebar({
  commits,
  currentText,
  onRestoreCommit,
  onRestoreCommitParent,
  onRestoreRoot,
  selectedRevisionId,
  workingBaseRevisionId,
}: HistorySidebarProps) {
  const graphRevisionId =
    selectedRevisionId === WORKING_REVISION_ID
      ? workingBaseRevisionId
      : selectedRevisionId
  const commitGraph = buildCommitGraph(commits, graphRevisionId)
  const graphStyle = {
    '--history-graph-width': `${getHistoryGraphWidth(commitGraph.laneCount)}px`,
  } as CSSProperties

  return (
    <SidebarSection title="History Graph">
      <Stack gap={6}>
        <WorkingTreeItem
          active={selectedRevisionId === WORKING_REVISION_ID}
          charCount={currentText.length}
          lineCount={countLines(currentText)}
        />
        <Box className="historyDivider" />
        {commitGraph.rows.length > 0 ? (
          <Box className="historyGraphList" style={graphStyle}>
            {commitGraph.rows.map((row) => (
              <CommitItem
                active={selectedRevisionId === row.commit.id}
                graphLaneCount={commitGraph.laneCount}
                key={row.commit.id}
                row={row}
                onClick={() => onRestoreCommit(row.commit)}
                onParentClick={() => onRestoreCommitParent(row.commit)}
              />
            ))}
            <Box className="historyRootBlock">
              <CommitRootItem
                active={selectedRevisionId === ROOT_REVISION_ID}
                connected={commitGraph.rows.length > 0}
                graphLaneCount={commitGraph.laneCount}
                pathActive={commitGraph.ancestorIds.has(ROOT_REVISION_ID)}
                onClick={onRestoreRoot}
              />
            </Box>
          </Box>
        ) : (
          <>
            <Text className="emptyHistory" c="dimmed" size="xs">
              No commits yet.
            </Text>
            <Box className="historyGraphList" style={graphStyle}>
              <Box className="historyRootBlock">
                <CommitRootItem
                  active={selectedRevisionId === ROOT_REVISION_ID}
                  connected={commitGraph.rows.length > 0}
                  graphLaneCount={commitGraph.laneCount}
                  pathActive={commitGraph.ancestorIds.has(ROOT_REVISION_ID)}
                  onClick={onRestoreRoot}
                />
              </Box>
            </Box>
          </>
        )}
      </Stack>
    </SidebarSection>
  )
}

function WorkingTreeItem({
  active,
  charCount,
  lineCount,
}: {
  active: boolean
  charCount: number
  lineCount: number
}) {
  return (
    <Box className="historyItem" data-active={active || undefined}>
      <Group gap="xs" wrap="nowrap">
        <CircleDot size={14} />
        <Text size="sm" fw={650}>
          Working text
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {lineCount} lines | {charCount} chars
      </Text>
    </Box>
  )
}

function CommitRootItem({
  active,
  connected,
  graphLaneCount,
  onClick,
  pathActive,
}: {
  active: boolean
  connected: boolean
  graphLaneCount: number
  onClick: () => void
  pathActive: boolean
}) {
  return (
    <Box className="commitGraphRow historyRootRow">
      <RootGraph
        active={active || pathActive}
        connected={connected}
        graphLaneCount={graphLaneCount}
      />
      <button
        className="historyItem historyItemButton"
        data-active={active || undefined}
        type="button"
        onClick={onClick}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <CircleDot size={14} />
            <Text className="commitTitle" size="sm" fw={650}>
              Root input
            </Text>
          </Group>
          <Text className="commitHash" size="xs">
            root
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          Baseline text
        </Text>
      </button>
    </Box>
  )
}

function CommitItem({
  active,
  graphLaneCount,
  onClick,
  onParentClick,
  row,
}: {
  active: boolean
  graphLaneCount: number
  onClick: () => void
  onParentClick: () => void
  row: CommitGraphRow
}) {
  const { commit } = row

  return (
    <Box className="commitGraphRow">
      <CommitGraph graphLaneCount={graphLaneCount} row={row} />
      <Box className="commitItemWrap">
        <button
          className="historyItem historyItemButton"
          data-active={active || undefined}
          data-ancestor={row.isAncestor || undefined}
          type="button"
          onClick={onClick}
        >
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Group className="commitTitleGroup" gap="xs" wrap="nowrap">
              <Text className="commitTitle" size="sm" fw={650}>
                {commit.title}
              </Text>
            </Group>
            <Text className="commitHash" size="xs">
              {commit.id}
            </Text>
          </Group>
          <Text className="commitDescription" size="xs" c="dimmed">
            {commit.description}
          </Text>
          <Group className="commitStats" gap={4} wrap="wrap">
            <Text size="xs">{formatSignedValue(commit.lineDelta)} lines</Text>
            <Text size="xs">{formatSignedValue(commit.charDelta)} chars</Text>
            <Text size="xs">{commit.timestamp}</Text>
          </Group>
        </button>
        <button className="parentRef" type="button" onClick={onParentClick}>
          parent {commit.parentId}
        </button>
      </Box>
    </Box>
  )
}

function CommitGraph({
  graphLaneCount,
  row,
}: {
  graphLaneCount: number
  row: CommitGraphRow
}) {
  const graphWidth = getHistoryGraphSvgWidth(graphLaneCount)

  return (
    <Box className="historyGraph">
      <svg
        aria-hidden="true"
        focusable="false"
        className="historyGraphLines"
        preserveAspectRatio="none"
        viewBox={`0 0 ${graphWidth} ${GRAPH_HEIGHT}`}
      >
        {row.topSegments.map((segment) => (
          <LaneLine
            key={`top-${segment.lane}`}
            segment={segment}
            y1={0}
            y2={GRAPH_CENTER_Y}
          />
        ))}
        {row.bottomSegments.map((segment) => (
          <LaneLine
            key={`bottom-${segment.lane}`}
            segment={segment}
            y1={GRAPH_CENTER_Y}
            y2={GRAPH_HEIGHT}
          />
        ))}
        {row.commit.parentId === ROOT_REVISION_ID ? (
          <LaneLine
            segment={{
              active: row.isAncestor,
              lane: row.lane,
            }}
            y1={GRAPH_CENTER_Y}
            y2={GRAPH_HEIGHT}
          />
        ) : null}
        {row.connectors.map((connector) => (
          <ConnectorLine
            connector={connector}
            key={`${connector.fromLane}-${connector.toLane}`}
          />
        ))}
      </svg>
      <GraphDot active={row.isAncestor} lane={row.lane} />
    </Box>
  )
}

function RootGraph({
  active,
  connected,
  graphLaneCount,
}: {
  active: boolean
  connected: boolean
  graphLaneCount: number
}) {
  const graphWidth = getHistoryGraphSvgWidth(graphLaneCount)

  return (
    <Box className="historyGraph historyGraphRoot">
      {connected ? (
        <svg
          aria-hidden="true"
          focusable="false"
          className="historyGraphLines"
          preserveAspectRatio="none"
          viewBox={`0 0 ${graphWidth} ${GRAPH_HEIGHT}`}
        >
          <line
            className={
              active
                ? 'historyGraphLine historyGraphLineActive'
                : 'historyGraphLine'
            }
            vectorEffect="non-scaling-stroke"
            x1={getLaneX(0)}
            x2={getLaneX(0)}
            y1={0}
            y2={GRAPH_CENTER_Y}
          />
        </svg>
      ) : null}
      <GraphDot active={active} lane={0} />
    </Box>
  )
}

function LaneLine({
  segment,
  y1,
  y2,
}: {
  segment: CommitGraphSegment
  y1: number
  y2: number
}) {
  return (
    <line
      className={
        segment.active
          ? 'historyGraphLine historyGraphLineActive'
          : 'historyGraphLine'
      }
      x1={getLaneX(segment.lane)}
      x2={getLaneX(segment.lane)}
      y1={y1}
      y2={y2}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function ConnectorLine({ connector }: { connector: CommitGraphConnector }) {
  return (
    <line
      className={
        connector.active
          ? 'historyGraphLine historyGraphLineActive'
          : 'historyGraphLine'
      }
      x1={getLaneX(connector.fromLane)}
      x2={getLaneX(connector.toLane)}
      y1={GRAPH_CENTER_Y}
      y2={GRAPH_CENTER_Y}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function GraphDot({ active, lane }: { active: boolean; lane: number }) {
  return (
    <span
      aria-hidden="true"
      className={
        active ? 'historyGraphDot historyGraphDotActive' : 'historyGraphDot'
      }
      style={{ left: getLaneX(lane) }}
    />
  )
}

function getLaneX(lane: number) {
  return GRAPH_PADDING + lane * GRAPH_LANE_GAP + GRAPH_LANE_GAP / 2
}

function getHistoryGraphSvgWidth(laneCount: number) {
  return GRAPH_PADDING * 2 + Math.max(laneCount, 1) * GRAPH_LANE_GAP
}

function getHistoryGraphWidth(laneCount: number) {
  return Math.min(GRAPH_MAX_WIDTH, getHistoryGraphSvgWidth(laneCount))
}
