import {
  ActionIcon,
  Button,
  Group,
  SegmentedControl,
  Text,
  Tooltip,
} from '@mantine/core'
import { CircleDot, FileJson, Search } from 'lucide-react'

import type { WorkbenchViewMode } from '../types'
import {
  IconGitCommit,
  IconTextWrap,
  IconTextWrapDisabled,
} from '@tabler/icons-react'

export function EditorToolbar({
  activeViewMode,
  canCommitWorkingText,
  onCommitWorkingText,
  onOpenSamples,
  onOpenSearch,
  onSetViewMode,
  onToggleSoftWrap,
  softWrapEnabled,
  viewAvailable,
}: {
  activeViewMode: WorkbenchViewMode
  canCommitWorkingText: boolean
  onCommitWorkingText: () => void
  onOpenSamples: () => void
  onOpenSearch: () => void
  onSetViewMode: (mode: WorkbenchViewMode) => void
  onToggleSoftWrap: () => void
  softWrapEnabled: boolean
  viewAvailable: boolean
}) {
  return (
    <Group className="editorToolbar" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <CircleDot size={14} />
        <Text fw={600} size="sm">
          Text Editor
        </Text>
        <SegmentedControl
          aria-label="Editor view mode"
          className="viewModeTabs"
          data={[
            { label: 'Source', value: 'source' },
            { disabled: !viewAvailable, label: 'View', value: 'view' },
          ]}
          size="xs"
          value={activeViewMode}
          onChange={(value) => onSetViewMode(value)}
        />
      </Group>
      <Group className="editorToolbarActions" gap={6} wrap="nowrap">
        <Tooltip label="Choose sample data" withArrow>
          <Button
            aria-label="Choose sample data"
            className="sampleButton"
            color="gray"
            leftSection={<FileJson size={14} />}
            size="xs"
            variant="light"
            onClick={onOpenSamples}
          >
            Samples
          </Button>
        </Tooltip>
        <Tooltip
          label={softWrapEnabled ? 'Disable soft wrap' : 'Enable soft wrap'}
          withArrow
        >
          <ActionIcon
            aria-label={
              softWrapEnabled ? 'Disable soft wrap' : 'Enable soft wrap'
            }
            aria-pressed={softWrapEnabled}
            color="gray"
            variant={softWrapEnabled ? 'filled' : 'subtle'}
            onClick={onToggleSoftWrap}
          >
            {softWrapEnabled ? (
              <IconTextWrapDisabled size={18} />
            ) : (
              <IconTextWrap size={18} />
            )}
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={
            activeViewMode === 'source'
              ? 'Search and replace (Ctrl+F)'
              : 'Search is available in source mode'
          }
          withArrow
        >
          <ActionIcon
            aria-label={
              activeViewMode === 'source'
                ? 'Search and replace'
                : 'Search is available in source mode'
            }
            color="gray"
            disabled={activeViewMode !== 'source'}
            variant="subtle"
            onClick={onOpenSearch}
          >
            <Search size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={
            canCommitWorkingText
              ? 'Commit current editor text'
              : 'No editor changes to commit'
          }
          withArrow
        >
          <ActionIcon
            aria-label="Commit current editor text"
            color={canCommitWorkingText ? 'green' : 'gray'}
            disabled={!canCommitWorkingText}
            variant={canCommitWorkingText ? 'filled' : 'light'}
            onClick={onCommitWorkingText}
          >
            <IconGitCommit size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  )
}
