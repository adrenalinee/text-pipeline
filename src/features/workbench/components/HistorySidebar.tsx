import { Box, Group, Text } from '@mantine/core'

import {
  getLinearAncestorIds,
  ROOT_REVISION_ID,
  WORKING_REVISION_ID,
} from '../history'
import type { TextCommit } from '../types'
import { countLines } from '../utils/textMetrics'
import { CommitSummary } from './CommitSummary'
import { SidebarSection } from './SidebarSection'

type HistorySidebarProps = {
  commits: ReadonlyArray<TextCommit>
  currentText: string
  onRestoreCommit: (commit: TextCommit) => void
  onRestoreRoot: () => void
  selectedRevisionId: string
  workingBaseRevisionId: string
}

export function HistorySidebar({
  commits,
  currentText,
  onRestoreCommit,
  onRestoreRoot,
  selectedRevisionId,
  workingBaseRevisionId,
}: HistorySidebarProps) {
  const baseRevisionId =
    selectedRevisionId === WORKING_REVISION_ID
      ? workingBaseRevisionId
      : selectedRevisionId
  const ancestorIds = getLinearAncestorIds(commits, baseRevisionId)
  const workingActive = selectedRevisionId === WORKING_REVISION_ID
  const rootActive = selectedRevisionId === ROOT_REVISION_ID

  return (
    <SidebarSection title="History">
      <Box className="historyTimeline">
        <Box className="historyRow">
          <TimelineDot active={workingActive} />
          <Box className="historyItem" data-active={workingActive || undefined}>
            <Text size="sm" fw={650}>
              Working text
            </Text>
            <Text size="xs" c="dimmed">
              {countLines(currentText)} lines | {currentText.length} chars
            </Text>
          </Box>
        </Box>

        {commits.map((commit) => {
          const isAncestor = ancestorIds.has(commit.id)
          const active = selectedRevisionId === commit.id

          return (
            <Box
              className="historyRow"
              data-future={!isAncestor || undefined}
              key={commit.id}
            >
              <TimelineDot active={isAncestor} />
              <button
                className="historyItem historyItemButton"
                data-active={active || undefined}
                type="button"
                onClick={() => onRestoreCommit(commit)}
              >
                <CommitSummary commit={commit} />
              </button>
            </Box>
          )
        })}

        <Box className="historyRow">
          <TimelineDot active />
          <button
            className="historyItem historyItemButton"
            data-active={rootActive || undefined}
            type="button"
            onClick={onRestoreRoot}
          >
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text className="commitTitle" size="sm" fw={650}>
                Root input
              </Text>
              <Text className="commitHash" size="xs">
                root
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Baseline text
            </Text>
          </button>
        </Box>
      </Box>

      {commits.length === 0 ? (
        <Text className="emptyHistory" c="dimmed" size="xs">
          No commits yet.
        </Text>
      ) : null}
    </SidebarSection>
  )
}

function TimelineDot({ active }: { active: boolean }) {
  return (
    <Box className="historyRowDot" aria-hidden="true">
      <span className="historyDot" data-active={active || undefined} />
    </Box>
  )
}
