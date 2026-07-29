import {
    ActionIcon,
    Button,
    Group,
    SegmentedControl,
    Tooltip
} from '@mantine/core';
import {
    CircleDot,
    ClipboardPaste,
    Columns2,
    Copy,
    FileJson,
    PilcrowIcon,
    Search
} from 'lucide-react';

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
  onToggleSourceView,
  onToggleSoftWrap,
  onToggleWhitespace,
  searchPanelOpen,
  softWrapEnabled,
  showCommit,
  viewAvailable,
  sourceViewDisabled,
  sourceViewEnabled,
  whitespaceVisible,
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
  onToggleSourceView: () => void
  onToggleSoftWrap: () => void
  onToggleWhitespace: () => void
  searchPanelOpen: boolean
  showCommit: boolean
  softWrapEnabled: boolean
  sourceViewDisabled: boolean
  sourceViewEnabled: boolean
  viewAvailable: boolean
  whitespaceVisible: boolean
}) {
  const sourceViewLabel = sourceViewEnabled
    ? 'Show view only'
    : 'Show source alongside view'

  return (
    <Group className="editorToolbar" justify="space-between" wrap="wrap">
      <Group gap="xs" wrap="nowrap">
        <CircleDot className="editorPaneMarker" size={14} />
        {/* <Text className="editorPaneTitle" fw={600} size="sm">
          {editorTitle}
        </Text> */}
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
      <Group className="editorToolbarActions" gap={6} wrap="wrap">
        {activeViewMode === 'view' ? (
          <Tooltip
            label={
              sourceViewDisabled
                ? 'Source + View is available on wider screens'
                : sourceViewLabel
            }
            withArrow
          >
            <ActionIcon
              aria-label={sourceViewLabel}
              aria-pressed={sourceViewEnabled}
              color="dark"
              disabled={sourceViewDisabled}
              variant={sourceViewEnabled ? 'filled' : 'subtle'}
              onClick={onToggleSourceView}
            >
              <Columns2 size={18} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <>
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
            <Tooltip label="Paste at cursor or replace selection" withArrow>
              <ActionIcon
                aria-label="Paste clipboard text"
                color="dark"
                variant="subtle"
                onClick={onPasteText}
              >
                <ClipboardPaste size={18} />
              </ActionIcon>
            </Tooltip>
            <span className="statusBarDivider" aria-hidden="true" />
            <Tooltip
              label={whitespaceVisible ? 'Hide whitespace' : 'Show whitespace'}
              withArrow
            >
              <ActionIcon
                aria-label={
                  whitespaceVisible ? 'Hide whitespace' : 'Show whitespace'
                }
                aria-pressed={whitespaceVisible}
                color="dark"
                variant={whitespaceVisible ? 'filled' : 'subtle'}
                onClick={onToggleWhitespace}
              >
                <PilcrowIcon size={18} />
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
                searchPanelOpen ? 'Close search' : 'Search and replace (Ctrl+F)'
              }
              withArrow
            >
              <ActionIcon
                aria-label={
                  searchPanelOpen ? 'Close search' : 'Search and replace'
                }
                aria-pressed={searchPanelOpen}
                color="dark"
                variant={searchPanelOpen ? 'filled' : 'subtle'}
                onClick={onOpenSearch}
              >
                <Search size={18} />
              </ActionIcon>
            </Tooltip>
            {showCommit ? (
              <>
                <span className="statusBarDivider" aria-hidden="true" />
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
              </>
            ) : null}
          </>
        )}
      </Group>
    </Group>
  )
}
