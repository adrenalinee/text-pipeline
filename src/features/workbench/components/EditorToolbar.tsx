import { ActionIcon, Button, Group, Tooltip } from '@mantine/core'
import {
  CircleDot,
  ClipboardPaste,
  Copy,
  Eye,
  FileJson,
  PilcrowIcon,
  Search,
} from 'lucide-react'

import { IconGitCommit, IconTextWrap } from '@tabler/icons-react'
import type { WorkbenchViewMode } from '../types'

export function EditorToolbar({
  activeViewMode,
  canCommitWorkingText,
  isActive,
  onCopyText,
  onCommitWorkingText,
  onOpenSamples,
  onOpenSearch,
  onPasteText,
  onSetViewMode,
  onToggleSoftWrap,
  onToggleWhitespace,
  searchPanelOpen,
  softWrapEnabled,
  showCommit,
  viewAvailable,
  whitespaceVisible,
}: {
  activeViewMode: WorkbenchViewMode
  canCommitWorkingText: boolean
  isActive: boolean
  onCopyText: () => void
  onCommitWorkingText?: () => void
  onOpenSamples: () => void
  onOpenSearch: () => void
  onPasteText: () => void
  onSetViewMode: (mode: WorkbenchViewMode) => void
  onToggleSoftWrap: () => void
  onToggleWhitespace: () => void
  searchPanelOpen: boolean
  showCommit: boolean
  softWrapEnabled: boolean
  viewAvailable: boolean
  whitespaceVisible: boolean
}) {
  const viewToggleLabel =
    activeViewMode === 'view' ? 'Show source only' : 'Show view'

  return (
    <Group className="editorToolbar" justify="space-between" wrap="wrap">
      <Group gap="xs" wrap="nowrap">
        <CircleDot
          aria-label={isActive ? 'Active editor' : 'Inactive editor'}
          className="editorPaneMarker"
          data-active={isActive || undefined}
          size={18}
        />
      </Group>
      <Group className="editorToolbarActions" gap={6} wrap="wrap">
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
          label={
            viewAvailable
              ? viewToggleLabel
              : 'No visual view is available for this format'
          }
          withArrow
        >
          <ActionIcon
            aria-label={viewToggleLabel}
            aria-pressed={activeViewMode === 'view'}
            color="dark"
            disabled={!viewAvailable}
            variant={activeViewMode === 'view' ? 'filled' : 'subtle'}
            onClick={() =>
              onSetViewMode(activeViewMode === 'view' ? 'source' : 'view')
            }
          >
            <Eye size={18} />
          </ActionIcon>
        </Tooltip>
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
            aria-label={searchPanelOpen ? 'Close search' : 'Search and replace'}
            aria-pressed={searchPanelOpen}
            color="dark"
            variant={searchPanelOpen ? 'filled' : 'subtle'}
            onClick={onOpenSearch}
          >
            <Search size={18} />
          </ActionIcon>
        </Tooltip>
        {/* <span className="statusBarDivider" aria-hidden="true" />
        <Tooltip
          label={
            viewAvailable
              ? viewToggleLabel
              : 'No visual view is available for this format'
          }
          withArrow
        >
          <ActionIcon
            aria-label={viewToggleLabel}
            aria-pressed={activeViewMode === 'view'}
            color="dark"
            disabled={!viewAvailable}
            variant={activeViewMode === 'view' ? 'filled' : 'subtle'}
            onClick={() =>
              onSetViewMode(activeViewMode === 'view' ? 'source' : 'view')
            }
          >
            <Eye size={18} />
          </ActionIcon>
        </Tooltip> */}
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
      </Group>
    </Group>
  )
}
