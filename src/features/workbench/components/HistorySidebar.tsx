import { Box, Group, Stack, Text } from '@mantine/core'
import { CircleDot } from 'lucide-react'

import type { TextCommit } from '../types'
import { countLines, formatSignedValue } from '../utils/textMetrics'
import { SidebarSection } from './SidebarSection'

type HistorySidebarProps = {
  commits: Array<TextCommit>
  currentText: string
  onRestoreCommit: (commit: TextCommit) => void
  onRestoreCommitParent: (commit: TextCommit) => void
  onRestoreRoot: () => void
  selectedRevisionId: string
}

export function HistorySidebar({
  commits,
  currentText,
  onRestoreCommit,
  onRestoreCommitParent,
  onRestoreRoot,
  selectedRevisionId,
}: HistorySidebarProps) {
  return (
    <SidebarSection title="History">
      <Stack gap={6}>
        <WorkingTreeItem
          active={selectedRevisionId === 'working'}
          charCount={currentText.length}
          lineCount={countLines(currentText)}
        />
        <Box className="historyDivider" />
        {commits.length > 0 ? (
          commits.map((commit) => (
            <CommitItem
              active={selectedRevisionId === commit.id}
              commit={commit}
              key={commit.id}
              onClick={() => onRestoreCommit(commit)}
              onParentClick={() => onRestoreCommitParent(commit)}
            />
          ))
        ) : (
          <Text className="emptyHistory" c="dimmed" size="xs">
            No transform commits yet.
          </Text>
        )}
        <Box className="historyRootBlock">
          <CommitRootItem
            active={selectedRevisionId === 'root'}
            onClick={onRestoreRoot}
          />
        </Box>
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
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className="historyItem historyItemButton"
      data-active={active || undefined}
      type="button"
      onClick={onClick}
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <CircleDot size={14} />
          <Text size="sm" fw={650}>
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
  )
}

function CommitItem({
  active,
  commit,
  onClick,
  onParentClick,
}: {
  active: boolean
  commit: TextCommit
  onClick: () => void
  onParentClick: () => void
}) {
  return (
    <Box className="commitItemWrap">
      <button
        className="historyItem historyItemButton"
        data-active={active || undefined}
        type="button"
        onClick={onClick}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <CircleDot size={14} />
            <Text size="sm" fw={650}>
              {commit.title}
            </Text>
          </Group>
          <Text className="commitHash" size="xs">
            {commit.id}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
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
  )
}
