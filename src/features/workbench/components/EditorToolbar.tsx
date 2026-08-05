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

export const EDITOR_TOOLBAR_SHORTCUTS = {
  commit: { aria: 'Control+S Meta+S', label: 'Ctrl+S' },
  copy: { aria: 'Control+C Meta+C', label: 'Ctrl+C' },
  paste: { aria: 'Control+V Meta+V', label: 'Ctrl+V' },
  softWrap: { aria: 'Alt+Z', label: 'Alt+Z' },
  view: {
    aria: 'Control+Shift+E Meta+Shift+E',
    label: 'Ctrl+Shift+E',
  },
  whitespace: {
    aria: 'Control+Alt+W Meta+Alt+W',
    label: 'Ctrl+Alt+W',
  },
} as const

function withShortcut(label: string, shortcut: string) {
  return `${label} (${shortcut})`
}

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
  viewDisabledReason,
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
  viewDisabledReason?: string
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
        <Tooltip
          label={withShortcut(
            'Copy selected text, or all text',
            EDITOR_TOOLBAR_SHORTCUTS.copy.label,
          )}
          withArrow
        >
          <ActionIcon
            aria-label="Copy editor text"
            aria-keyshortcuts={EDITOR_TOOLBAR_SHORTCUTS.copy.aria}
            color="dark"
            variant="subtle"
            onClick={onCopyText}
          >
            <Copy size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={withShortcut(
            'Paste at cursor or replace selection',
            EDITOR_TOOLBAR_SHORTCUTS.paste.label,
          )}
          withArrow
        >
          <ActionIcon
            aria-label="Paste clipboard text"
            aria-keyshortcuts={EDITOR_TOOLBAR_SHORTCUTS.paste.aria}
            color="dark"
            variant="subtle"
            onClick={onPasteText}
          >
            <ClipboardPaste size={18} />
          </ActionIcon>
        </Tooltip>
        <span className="statusBarDivider" aria-hidden="true" />
        <Tooltip
          label={withShortcut(
            viewDisabledReason ??
              (viewAvailable
                ? viewToggleLabel
                : 'No visual view is available for this format'),
            EDITOR_TOOLBAR_SHORTCUTS.view.label,
          )}
          withArrow
        >
          <ActionIcon
            aria-label={viewToggleLabel}
            aria-keyshortcuts={EDITOR_TOOLBAR_SHORTCUTS.view.aria}
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
          label={withShortcut(
            whitespaceVisible ? 'Hide whitespace' : 'Show whitespace',
            EDITOR_TOOLBAR_SHORTCUTS.whitespace.label,
          )}
          withArrow
        >
          <ActionIcon
            aria-label={
              whitespaceVisible ? 'Hide whitespace' : 'Show whitespace'
            }
            aria-keyshortcuts={EDITOR_TOOLBAR_SHORTCUTS.whitespace.aria}
            aria-pressed={whitespaceVisible}
            color="dark"
            variant={whitespaceVisible ? 'filled' : 'subtle'}
            onClick={onToggleWhitespace}
          >
            <PilcrowIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={withShortcut(
            softWrapEnabled ? 'Disable soft wrap' : 'Enable soft wrap',
            EDITOR_TOOLBAR_SHORTCUTS.softWrap.label,
          )}
          withArrow
        >
          <ActionIcon
            aria-label={
              softWrapEnabled ? 'Disable soft wrap' : 'Enable soft wrap'
            }
            aria-keyshortcuts={EDITOR_TOOLBAR_SHORTCUTS.softWrap.aria}
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
            searchPanelOpen
              ? 'Close search (Ctrl+F or Esc)'
              : 'Search and replace (Ctrl+F)'
          }
          withArrow
        >
          <ActionIcon
            aria-label={searchPanelOpen ? 'Close search' : 'Search and replace'}
            aria-keyshortcuts={
              searchPanelOpen ? 'Control+F Meta+F Escape' : 'Control+F Meta+F'
            }
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
                  ? withShortcut(
                      'Commit current editor text',
                      EDITOR_TOOLBAR_SHORTCUTS.commit.label,
                    )
                  : withShortcut(
                      'No editor changes to commit',
                      EDITOR_TOOLBAR_SHORTCUTS.commit.label,
                    )
              }
              withArrow
            >
              <ActionIcon
                aria-label="Commit current editor text"
                aria-keyshortcuts={EDITOR_TOOLBAR_SHORTCUTS.commit.aria}
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
