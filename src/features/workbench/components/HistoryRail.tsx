import { ActionIcon, Badge, Box, Stack, Tooltip } from '@mantine/core'
import { PanelLeftOpen } from 'lucide-react'

import { ROOT_REVISION_ID, WORKING_REVISION_ID } from '../history'
import type { TextCommit } from '../types'
import { countLines } from '../utils/textMetrics'

type HistoryRailProps = {
  commits: ReadonlyArray<TextCommit>
  currentText: string
  onExpand: () => void
  onRestoreCommit: (commit: TextCommit) => void
  onRestoreRoot: () => void
  selectedRevisionId: string
  workingBaseRevisionId: string
}

export function HistoryRail({
  commits,
  currentText,
  onExpand,
  onRestoreCommit,
  onRestoreRoot,
  selectedRevisionId,
  workingBaseRevisionId,
}: HistoryRailProps) {
  const workingActive = selectedRevisionId === WORKING_REVISION_ID
  const rootActive = selectedRevisionId === ROOT_REVISION_ID

  return (
    <Box className="workbenchRail historyRail">
      <Tooltip label="Expand history" position="right" withArrow>
        <ActionIcon
          aria-label="Expand history"
          color="gray"
          onClick={onExpand}
          size="lg"
          variant="subtle"
        >
          <PanelLeftOpen size={18} />
        </ActionIcon>
      </Tooltip>

      {commits.length > 0 ? (
        <Tooltip label={`${commits.length} commits`} position="right" withArrow>
          <Badge className="historyRailCount" size="xs" variant="light">
            {commits.length}
          </Badge>
        </Tooltip>
      ) : null}

      <Box className="railDivider" />

      <Stack className="historyRailTrack" gap={2}>
        <RailDot
          active={workingActive}
          label={`Working text · ${countLines(currentText)} lines · ${currentText.length} chars`}
        />
        {commits.map((commit) => (
          <RailDot
            active={
              selectedRevisionId === commit.id ||
              (workingActive && workingBaseRevisionId === commit.id)
            }
            key={commit.id}
            label={`${commit.title} · ${commit.id}`}
            onClick={() => onRestoreCommit(commit)}
          />
        ))}
        <RailDot
          active={rootActive}
          label="Root input · baseline text"
          onClick={onRestoreRoot}
        />
      </Stack>
    </Box>
  )
}

function RailDot({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick?: () => void
}) {
  const mark = <span className="railDotMark" data-active={active || undefined} />

  return (
    <Tooltip label={label} position="right" withArrow>
      {onClick ? (
        <ActionIcon
          aria-label={label}
          className="historyRailDot"
          color="gray"
          onClick={onClick}
          size={26}
          variant="subtle"
        >
          {mark}
        </ActionIcon>
      ) : (
        <Box className="historyRailDot historyRailDotStatic">{mark}</Box>
      )}
    </Tooltip>
  )
}
