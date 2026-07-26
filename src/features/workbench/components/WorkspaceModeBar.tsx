import {
  ActionIcon,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Text,
  Tooltip,
} from '@mantine/core'
import { ArrowRight, X } from 'lucide-react'

export type SecondaryPurpose = 'diff' | 'editor' | 'view'
export type DiffLayout = 'split' | 'unified'

export function WorkspaceModeBar({
  compact,
  diffLayout,
  purpose,
  rightMatchesLeft,
  viewAvailable,
  onClose,
  onCopyLeftToRight,
  onDiffLayoutChange,
  onPurposeChange,
}: {
  compact: boolean
  diffLayout: DiffLayout
  purpose: SecondaryPurpose
  rightMatchesLeft: boolean
  viewAvailable: boolean
  onClose: () => void
  onCopyLeftToRight: () => void
  onDiffLayoutChange: (layout: DiffLayout) => void
  onPurposeChange: (purpose: SecondaryPurpose) => void
}) {
  const effectiveLayout = compact ? 'unified' : diffLayout

  return (
    <Group className="workspaceModeBar" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <Text className="workspaceModeLabel" c="dimmed" fw={700} size="xs">
          Workspace
        </Text>
        <SegmentedControl
          aria-label="Secondary workspace mode"
          data={[
            { label: 'Editor', value: 'editor' },
            { label: 'Diff', value: 'diff' },
            {
              disabled: !viewAvailable && purpose !== 'view',
              label: 'View',
              value: 'view',
            },
          ]}
          size="xs"
          value={purpose}
          onChange={onPurposeChange}
        />
      </Group>

      <Group className="workspaceModeActions" gap="xs" wrap="nowrap">
        {purpose === 'diff' ? (
          <>
            {compact ? (
              <Badge color="gray" size="sm" variant="light">
                Unified on narrow screens
              </Badge>
            ) : (
              <SegmentedControl
                aria-label="Diff layout"
                data={[
                  { label: 'Side-by-side', value: 'split' },
                  { label: 'Unified', value: 'unified' },
                ]}
                size="xs"
                value={effectiveLayout}
                onChange={(value) =>
                  onDiffLayoutChange(value)
                }
              />
            )}
            <Tooltip
              label={
                rightMatchesLeft
                  ? 'Right editor already matches left'
                  : 'Copy left text and format to the right editor'
              }
              withArrow
            >
              <Button
                aria-label="Copy left editor to right editor"
                color="gray"
                disabled={rightMatchesLeft}
                leftSection={<ArrowRight size={14} />}
                size="xs"
                variant="light"
                onClick={onCopyLeftToRight}
              >
                Copy left
              </Button>
            </Tooltip>
          </>
        ) : null}
        <Tooltip label="Close secondary workspace" withArrow>
          <ActionIcon
            aria-label="Close secondary workspace"
            color="gray"
            size="sm"
            variant="subtle"
            onClick={onClose}
          >
            <X size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  )
}
