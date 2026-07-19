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
  editorTitle,
  onCommitWorkingText,
  onOpenSamples,
  onOpenSearch,
  onSetViewMode,
  onToggleSoftWrap,
  searchPanelOpen,
  softWrapEnabled,
  showCommit,
  showViewMode,
  viewAvailable,
}: {
  activeViewMode: WorkbenchViewMode
  canCommitWorkingText: boolean
  editorTitle: string
  onCommitWorkingText?: () => void
  onOpenSamples: () => void
  onOpenSearch: () => void
  onSetViewMode: (mode: WorkbenchViewMode) => void
  onToggleSoftWrap: () => void
  searchPanelOpen: boolean
  showCommit: boolean
  showViewMode: boolean
  softWrapEnabled: boolean
  viewAvailable: boolean
}) {
  return (
    <Group className="editorToolbar" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <CircleDot size={14} />
        <Text className="editorPaneTitle" fw={600} size="sm">
          {editorTitle}
        </Text>
        {showViewMode ? (
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
        ) : null}
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
            color="dark"
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
            activeViewMode !== 'source'
              ? 'Search is available in source mode'
              : searchPanelOpen
                ? 'Close search'
                : 'Search and replace (Ctrl+F)'
          }
          withArrow
        >
          <ActionIcon
            aria-label={
              activeViewMode !== 'source'
                ? 'Search is available in source mode'
                : searchPanelOpen
                  ? 'Close search'
                  : 'Search and replace'
            }
            aria-pressed={searchPanelOpen}
            color="dark"
            disabled={activeViewMode !== 'source'}
            variant={searchPanelOpen ? 'filled' : 'subtle'}
            onClick={onOpenSearch}
          >
            <Search size={18} />
          </ActionIcon>
        </Tooltip>
        {showCommit ? (
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
        ) : null}
      </Group>
    </Group>
  )
}
