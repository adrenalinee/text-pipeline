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
  onToggleSoftWrap: vi.fn(),
  onToggleWhitespace: vi.fn(),
  searchPanelOpen: false,
  softWrapEnabled: true,
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

    expect(screen.queryByLabelText('Editor view mode')).toBeNull()
    expect(screen.getByLabelText('Show view')).toBeTruthy()
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

    expect(screen.queryByLabelText('Editor view mode')).toBeNull()
    expect(screen.getByLabelText('Show view')).toBeTruthy()
    expect(screen.getByLabelText('Commit current editor text')).toBeTruthy()
  })

  it('keeps every editor action visible in view mode', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          showCommit={false}
        />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Show source only')).toBeTruthy()
    expect(screen.getByLabelText('Choose sample data')).toBeTruthy()
    expect(screen.getByLabelText('Copy editor text')).toBeTruthy()
    expect(screen.getByLabelText('Paste clipboard text')).toBeTruthy()
    expect(screen.getByLabelText('Show whitespace')).toBeTruthy()
    expect(screen.getByLabelText('Disable soft wrap')).toBeTruthy()
    expect(screen.getByLabelText('Search and replace')).toBeTruthy()
    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
  })

  it('reports and toggles the visual view state', () => {
    const onSetViewMode = vi.fn()

    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          onSetViewMode={onSetViewMode}
          showCommit
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show source only')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(toggle)
    expect(onSetViewMode).toHaveBeenCalledWith('source')
  })

  it('disables the view toggle when the format has no visual view', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit={false}
          viewAvailable={false}
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show view') as HTMLButtonElement
    expect(toggle.disabled).toBe(true)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
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
