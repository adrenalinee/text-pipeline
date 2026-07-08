import {
  ActionIcon,
  Button,
  Group,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  CaseSensitive,
  CaseUpper,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Regex,
  X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import { MATCH_COUNT_LIMIT } from './matchCount'
import type { MatchCountResult } from './matchCount'

export type SearchPanelFocusRequest = {
  seq: number
  target: 'replace' | 'search'
}

type SearchReplacePanelProps = {
  caseSensitive: boolean
  focusRequest: SearchPanelFocusRequest | null
  matchInfo: MatchCountResult
  preserveCase: boolean
  queryValid: boolean
  regexp: boolean
  replaceText: string
  searchText: string
  showReplace: boolean
  onCaseSensitiveChange: (value: boolean) => void
  onClose: () => void
  onFindNext: () => void
  onFindPrevious: () => void
  onHeightChange: (height: number) => void
  onOpenReplaceRow: () => void
  onPreserveCaseChange: (value: boolean) => void
  onRegexpChange: (value: boolean) => void
  onReplaceAll: () => void
  onReplaceNext: () => void
  onReplaceTextChange: (value: string) => void
  onSearchTextChange: (value: string) => void
  onToggleReplaceRow: () => void
}

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)

// Ctrl+H on Windows/Linux; Cmd+H hides the app on macOS, so Cmd+Alt+F
// (the VS Code convention) is used there instead.
function isReplaceRowShortcut(event: KeyboardEvent<HTMLElement>) {
  if (IS_MAC) {
    return event.metaKey && event.altKey && event.code === 'KeyF'
  }

  return (
    event.ctrlKey && !event.altKey && !event.shiftKey && event.code === 'KeyH'
  )
}

function isFindShortcut(event: KeyboardEvent<HTMLElement>) {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.code === 'KeyF'
  )
}

function PanelToggleButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip label={label}>
      <ActionIcon
        aria-label={label}
        aria-pressed={active}
        color={active ? 'blue' : 'gray'}
        size="sm"
        variant={active ? 'light' : 'subtle'}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}

export function SearchReplacePanel({
  caseSensitive,
  focusRequest,
  matchInfo,
  preserveCase,
  queryValid,
  regexp,
  replaceText,
  searchText,
  showReplace,
  onCaseSensitiveChange,
  onClose,
  onFindNext,
  onFindPrevious,
  onHeightChange,
  onOpenReplaceRow,
  onPreserveCaseChange,
  onRegexpChange,
  onReplaceAll,
  onReplaceNext,
  onReplaceTextChange,
  onSearchTextChange,
  onToggleReplaceRow,
}: SearchReplacePanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const notifyHeight = () => onHeightChange(container.offsetHeight)

    notifyHeight()

    const observer = new ResizeObserver(notifyHeight)
    observer.observe(container)

    return () => observer.disconnect()
  }, [onHeightChange])

  // Focus can end up outside the panel (e.g. on document.body after a
  // clicked button becomes disabled), where neither the panel keydown nor
  // the editor keymap sees Escape. Catch it at the window level while the
  // panel is open, leaving modal dialogs to their own Escape handling.
  useEffect(() => {
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      const active = document.activeElement

      if (active instanceof HTMLElement && active.closest('[role="dialog"]')) {
        return
      }

      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', handleWindowKeyDown)

    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!focusRequest) {
      return
    }

    const input =
      focusRequest.target === 'replace'
        ? replaceInputRef.current
        : searchInputRef.current

    input?.focus()
    input?.select()
  }, [focusRequest])

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (isReplaceRowShortcut(event)) {
      event.preventDefault()
      onOpenReplaceRow()
      return
    }

    if (isFindShortcut(event)) {
      event.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()

      if (event.shiftKey) {
        onFindPrevious()
      } else {
        onFindNext()
      }
    }
  }

  function handleReplaceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onReplaceNext()
    }
  }

  const hasMatches = matchInfo.total > 0
  const totalLabel = matchInfo.capped
    ? `${MATCH_COUNT_LIMIT}+`
    : `${matchInfo.total}`
  const countLabel = !searchText
    ? ''
    : !queryValid
      ? 'Bad pattern'
      : hasMatches
        ? `${matchInfo.current}/${totalLabel}`
        : 'No results'

  return (
    <div
      ref={containerRef}
      className="searchReplacePanel"
      onKeyDown={handlePanelKeyDown}
    >
      <Group gap={4} wrap="nowrap">
        <Tooltip label={showReplace ? 'Hide replace' : 'Show replace'}>
          <ActionIcon
            aria-label={showReplace ? 'Hide replace' : 'Show replace'}
            color="gray"
            size="sm"
            variant="subtle"
            onClick={onToggleReplaceRow}
          >
            {showReplace ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </ActionIcon>
        </Tooltip>
        <TextInput
          ref={searchInputRef}
          aria-label="Find"
          className="searchPanelInput"
          error={!queryValid}
          placeholder="Find"
          size="xs"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.currentTarget.value)}
          onKeyDown={handleSearchKeyDown}
          {...{ 'main-field': 'true' }}
        />
        <PanelToggleButton
          active={caseSensitive}
          label="Match case"
          onClick={() => onCaseSensitiveChange(!caseSensitive)}
        >
          <CaseSensitive size={14} />
        </PanelToggleButton>
        <PanelToggleButton
          active={regexp}
          label="Regular expression"
          onClick={() => onRegexpChange(!regexp)}
        >
          <Regex size={14} />
        </PanelToggleButton>
        <Text c="dimmed" className="searchPanelCount" size="xs">
          {countLabel}
        </Text>
        <Tooltip label="Previous match (Shift+Enter)">
          <ActionIcon
            aria-label="Previous match"
            color="gray"
            disabled={!hasMatches}
            size="sm"
            variant="subtle"
            onClick={onFindPrevious}
          >
            <ChevronUp size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Next match (Enter)">
          <ActionIcon
            aria-label="Next match"
            color="gray"
            disabled={!hasMatches}
            size="sm"
            variant="subtle"
            onClick={onFindNext}
          >
            <ChevronDown size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Close (Esc)">
          <ActionIcon
            aria-label="Close search"
            color="gray"
            size="sm"
            variant="subtle"
            onClick={onClose}
          >
            <X size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {showReplace ? (
        <Group className="searchPanelReplaceRow" gap={4} wrap="nowrap">
          <TextInput
            ref={replaceInputRef}
            aria-label="Replace with"
            className="searchPanelInput"
            placeholder="Replace"
            size="xs"
            value={replaceText}
            onChange={(event) => onReplaceTextChange(event.currentTarget.value)}
            onKeyDown={handleReplaceKeyDown}
          />
          <PanelToggleButton
            active={preserveCase}
            label="Preserve case"
            onClick={() => onPreserveCaseChange(!preserveCase)}
          >
            <CaseUpper size={14} />
          </PanelToggleButton>
          {/* Enabled while the pattern is valid (a no-op without matches):
              disabling mid-click drops focus to body and breaks Escape. */}
          <Button
            disabled={!queryValid}
            size="compact-xs"
            variant="default"
            onClick={onReplaceNext}
          >
            Replace
          </Button>
          <Button
            disabled={!queryValid}
            size="compact-xs"
            variant="default"
            onClick={onReplaceAll}
          >
            Replace all
          </Button>
        </Group>
      ) : null}
    </div>
  )
}
