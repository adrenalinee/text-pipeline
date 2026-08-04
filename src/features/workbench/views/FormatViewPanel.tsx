import { ActionIcon, Box, Group, Loader, Text, Tooltip } from '@mantine/core'
import { Columns2, EyeOff, Maximize, Minimize, PanelLeftClose } from 'lucide-react'
import { Suspense } from 'react'

import type {
  FormatCapability,
  FormatViewDefinition,
  SyntaxMode,
} from '../types'

export function FormatViewPanel({
  format,
  onToggleSourceView,
  sourceViewAvailable,
  sourceViewVisible,
  value,
  views,
}: {
  format: FormatCapability
  onToggleSourceView: () => void
  sourceViewAvailable: boolean
  sourceViewVisible: boolean
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
      <Group className="formatViewHeader" justify="space-between" wrap="wrap">
        <Group className="formatViewHeaderTitle" gap={8}>
          <Text fw={700} size="sm">
            {view.label}
          </Text>
          <Text c="dimmed" size="xs">
            {view.description}
          </Text>
        </Group>
        <Tooltip
          label={
            sourceViewAvailable
              ? sourceViewVisible
                ? 'Show view only'
                : 'Show source alongside view'
              : 'Split view is available on wider screens'
          }
          withArrow
        >
          <ActionIcon
            aria-label={
              sourceViewVisible
                ? 'Show view only'
                : 'Show source alongside view'
            }
            aria-pressed={!sourceViewVisible}
            className="formatViewHeaderAction"
            color="dark"
            disabled={!sourceViewAvailable}
            size="sm"
            variant="subtle"
            onClick={onToggleSourceView}
          >
            {sourceViewVisible ? (
              <Maximize size={16} />
            ) : (
              <Minimize size={16} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>
      <Box className="formatViewBody">
        <Suspense
          fallback={
            <Group gap="xs" p="md" wrap="nowrap">
              <Loader size="sm" />
              <Text c="dimmed" size="sm">
                Loading view…
              </Text>
            </Group>
          }
        >
          {view.render({ syntaxMode: format.id, value })}
        </Suspense>
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
