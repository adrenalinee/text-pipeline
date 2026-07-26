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
  canCommitWorkingText: false,
  onCopyText: vi.fn(),
  onOpenSamples: vi.fn(),
  onOpenSearch: vi.fn(),
  onPasteText: vi.fn(),
  onToggleSoftWrap: vi.fn(),
  onToggleWhitespace: vi.fn(),
  searchPanelOpen: false,
  softWrapEnabled: true,
  viewAvailable: true,
  whitespaceVisible: false,
}

describe('EditorToolbar capabilities', () => {
  it('omits commit controls from the sub editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit={false}
        />
      </MantineProvider>,
    )

    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
    expect(screen.getByLabelText('Choose sample data')).toBeTruthy()
    expect(screen.getByLabelText('Copy editor text')).toBeTruthy()
    expect(screen.getByLabelText('Paste clipboard text')).toBeTruthy()
    expect(screen.getByLabelText('Search and replace')).toBeTruthy()
  })

  it('keeps commit controls and pane labels in the main editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          paneLabel="Base · Left"
          showCommit
          onCommitWorkingText={vi.fn()}
        />
      </MantineProvider>,
    )

    expect(screen.getByText('Base · Left')).toBeTruthy()
    expect(screen.getByLabelText('Commit current editor text')).toBeTruthy()
  })

  it('keeps clipboard controls available in source editors', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit={false}
        />
      </MantineProvider>,
    )

    expect(
      screen.getByLabelText('Copy editor text').hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen.getByLabelText('Paste clipboard text').hasAttribute('disabled'),
    ).toBe(false)
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
