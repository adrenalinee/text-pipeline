import {
    ActionIcon,
    Button,
    Group,
    SegmentedControl,
    Tooltip
} from '@mantine/core';
import { CircleDot, ClipboardPaste, Copy, FileJson, Search } from 'lucide-react';

import {
    IconGitCommit,
    IconTextWrap
} from '@tabler/icons-react';
import type { WorkbenchViewMode } from '../types';

export function EditorToolbar({
  activeViewMode,
  canCommitWorkingText,
  // editorTitle,
  onCopyText,
  onCommitWorkingText,
  onOpenSamples,
  onOpenSearch,
  onPasteText,
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
  // editorTitle: string
  onCopyText: () => void
  onCommitWorkingText?: () => void
  onOpenSamples: () => void
  onOpenSearch: () => void
  onPasteText: () => void
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
        <CircleDot className="editorPaneMarker" size={14} />
        {/* <Text className="editorPaneTitle" fw={600} size="sm">
          {editorTitle}
        </Text> */}
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
            // className="sampleButton"
            size="xs"
            color="gray"
            leftSection={<FileJson size={14} />}
            variant="light"
            onClick={onOpenSamples}
          >
            Samples
          </Button>
        </Tooltip>
        <Tooltip label="Copy selected text, or all text" withArrow>
          <ActionIcon
            aria-label="Copy editor text"
            color="dark"
            variant="subtle"
            onClick={onCopyText}
          >
            <Copy size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={
            activeViewMode === 'source'
              ? 'Paste at cursor or replace selection'
              : 'Paste is available in source mode'
          }
          withArrow
        >
          <ActionIcon
            aria-label="Paste clipboard text"
            color="dark"
            disabled={activeViewMode !== 'source'}
            variant="subtle"
            onClick={onPasteText}
          >
            <ClipboardPaste size={18} />
          </ActionIcon>
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
            <IconTextWrap size={18} />
            {/* {softWrapEnabled ? (
              <IconTextWrapDisabled size={18} />
            ) : (
              <IconTextWrap size={18} />
            )} */}
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
