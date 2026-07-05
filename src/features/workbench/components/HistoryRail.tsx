import {
  ActionIcon,
  Badge,
  Box,
  HoverCard,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { PanelLeftOpen } from 'lucide-react'
import type { ReactNode } from 'react'

import { getLinearAncestorIds, WORKING_REVISION_ID } from '../history'
import type { TextCommit } from '../types'
import { countLines } from '../utils/textMetrics'
import { CommitSummary } from './CommitSummary'

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
  const baseRevisionId =
    selectedRevisionId === WORKING_REVISION_ID
      ? workingBaseRevisionId
      : selectedRevisionId
  const ancestorIds = getLinearAncestorIds(commits, baseRevisionId)
  const workingActive = selectedRevisionId === WORKING_REVISION_ID

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
        <RailDot active={workingActive} ariaLabel="Working text">
          <Box className="historyRailCard">
            <Text size="sm" fw={650}>
              Working text
            </Text>
            <Text size="xs" c="dimmed">
              {countLines(currentText)} lines | {currentText.length} chars
            </Text>
          </Box>
        </RailDot>

        {commits.map((commit) => {
          const isAncestor = ancestorIds.has(commit.id)

          return (
            <RailDot
              active={isAncestor}
              ariaLabel={`${commit.title} (${commit.id})`}
              future={!isAncestor}
              key={commit.id}
              onClick={() => onRestoreCommit(commit)}
            >
              <CommitSummary commit={commit} multiline />
            </RailDot>
          )
        })}

        <RailDot active ariaLabel="Root input" onClick={onRestoreRoot}>
          <Box className="historyRailCard">
            <Text size="sm" fw={650}>
              Root input
            </Text>
            <Text size="xs" c="dimmed">
              Baseline text
            </Text>
          </Box>
        </RailDot>
      </Stack>
    </Box>
  )
}

function RailDot({
  active,
  ariaLabel,
  children,
  future,
  onClick,
}: {
  active: boolean
  ariaLabel: string
  children: ReactNode
  future?: boolean
  onClick?: () => void
}) {
  const mark = (
    <span
      className="railDotMark"
      data-active={active || undefined}
      data-future={future || undefined}
    />
  )

  const target = onClick ? (
    <ActionIcon
      aria-label={ariaLabel}
      className="historyRailDot"
      color="gray"
      data-future={future || undefined}
      onClick={onClick}
      size={26}
      variant="subtle"
    >
      {mark}
    </ActionIcon>
  ) : (
    <Box className="historyRailDot historyRailDotStatic">{mark}</Box>
  )

  return (
    <HoverCard
      closeDelay={80}
      openDelay={150}
      position="right"
      shadow="md"
      width={250}
      withArrow
    >
      <HoverCard.Target>{target}</HoverCard.Target>
      <HoverCard.Dropdown className="historyRailDropdown">
        {children}
      </HoverCard.Dropdown>
    </HoverCard>
  )
}
