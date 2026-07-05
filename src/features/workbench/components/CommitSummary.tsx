import { Box, Group, Text } from '@mantine/core'

import type { TextCommit } from '../types'
import { formatSignedValue } from '../utils/textMetrics'

/**
 * Renders the commit information shown both inline in the expanded history
 * sidebar and inside the collapsed rail's hover card. `multiline` lets the
 * hover card show full title/description instead of truncating them.
 */
export function CommitSummary({
  commit,
  multiline = false,
}: {
  commit: TextCommit
  multiline?: boolean
}) {
  return (
    <Box
      className={
        multiline ? 'commitSummary commitSummaryCard' : 'commitSummary'
      }
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text className="commitTitle" size="sm" fw={650}>
          {commit.title}
        </Text>
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
    </Box>
  )
}
