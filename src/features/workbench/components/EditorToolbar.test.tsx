// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { EditorToolbar } from './EditorToolbar'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class ResizeObserverMock {
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()
    },
  })
})

afterEach(cleanup)

const commonProps = {
  activeViewMode: 'source' as const,
  canCommitWorkingText: false,
  onCopyText: vi.fn(),
  onOpenSamples: vi.fn(),
  onOpenSearch: vi.fn(),
  onPasteText: vi.fn(),
  onSetViewMode: vi.fn(),
  onToggleSourceView: vi.fn(),
  onToggleSoftWrap: vi.fn(),
  onToggleWhitespace: vi.fn(),
  searchPanelOpen: false,
  softWrapEnabled: true,
  sourceViewDisabled: false,
  sourceViewEnabled: false,
  viewAvailable: true,
  whitespaceVisible: false,
}

describe('EditorToolbar capabilities', () => {
  it('keeps view mode but omits commit controls from the sub editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar {...commonProps} showCommit={false} />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Editor view mode')).toBeTruthy()
    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
    expect(screen.getByLabelText('Choose sample data')).toBeTruthy()
    expect(screen.getByLabelText('Copy editor text')).toBeTruthy()
    expect(screen.getByLabelText('Paste clipboard text')).toBeTruthy()
    expect(screen.getByLabelText('Search and replace')).toBeTruthy()
  })

  it('keeps view mode and commit controls in the main editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit
          onCommitWorkingText={vi.fn()}
        />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Editor view mode')).toBeTruthy()
    expect(screen.getByLabelText('Commit current editor text')).toBeTruthy()
  })

  it('replaces every source action with Source + View in view mode', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          showCommit={false}
        />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Show source alongside view')).toBeTruthy()
    expect(screen.queryByLabelText('Choose sample data')).toBeNull()
    expect(screen.queryByLabelText('Copy editor text')).toBeNull()
    expect(screen.queryByLabelText('Paste clipboard text')).toBeNull()
    expect(screen.queryByLabelText('Show whitespace')).toBeNull()
    expect(screen.queryByLabelText('Disable soft wrap')).toBeNull()
    expect(screen.queryByLabelText('Search and replace')).toBeNull()
    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
  })

  it('reports and toggles the Source + View state', () => {
    const onToggleSourceView = vi.fn()

    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          onToggleSourceView={onToggleSourceView}
          showCommit
          sourceViewEnabled
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show view only')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(toggle)
    expect(onToggleSourceView).toHaveBeenCalledOnce()
  })

  it('disables Source + View on compact screens without clearing its state', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          showCommit={false}
          sourceViewDisabled
          sourceViewEnabled
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show view only')
    expect(toggle.disabled).toBe(true)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows whitespace state and invokes its toggle', () => {
    const onToggleWhitespace = vi.fn()

    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          onToggleWhitespace={onToggleWhitespace}
          showCommit={false}
        />
      </MantineProvider>,
    )

    const whitespaceToggle = screen.getByLabelText('Show whitespace')
    const softWrapToggle = screen.getByLabelText('Disable soft wrap')
    expect(whitespaceToggle.getAttribute('aria-pressed')).toBe('false')
    expect(
      whitespaceToggle.compareDocumentPosition(softWrapToggle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(whitespaceToggle)
    expect(onToggleWhitespace).toHaveBeenCalledOnce()
  })
})
