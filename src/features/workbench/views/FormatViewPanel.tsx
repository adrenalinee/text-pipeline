import { Box, Group, Text } from '@mantine/core'
import { EyeOff } from 'lucide-react'

import type {
  FormatCapability,
  FormatViewDefinition,
  SyntaxMode,
} from '../types'

export function FormatViewPanel({
  format,
  value,
  views,
}: {
  format: FormatCapability
  value: string
  views: ReadonlyArray<FormatViewDefinition>
}) {
  const view =
    views.find((candidate) => candidate.id === format.defaultViewId) ??
    views.find((candidate) => format.viewIds.includes(candidate.id))

  if (!view) {
    return <UnavailableView syntaxMode={format.id} />
  }

  return (
    <Box className="formatViewPanel">
      <Group className="formatViewHeader" justify="space-between" wrap="nowrap">
        <Box>
          <Text fw={700} size="sm">
            {view.label}
          </Text>
          <Text c="dimmed" size="xs">
            {view.description}
          </Text>
        </Box>
      </Group>
      <Box className="formatViewBody">
        {view.render({ syntaxMode: format.id, value })}
      </Box>
    </Box>
  )
}

export function UnavailableView({ syntaxMode }: { syntaxMode: SyntaxMode }) {
  return (
    <Box className="formatViewEmpty">
      <Group gap="xs" wrap="nowrap">
        <EyeOff size={16} />
        <Text fw={700} size="sm">
          No visual view for {syntaxMode.toUpperCase()}
        </Text>
      </Group>
      <Text c="dimmed" size="sm">
        Use Source mode for this format.
      </Text>
    </Box>
  )
}
