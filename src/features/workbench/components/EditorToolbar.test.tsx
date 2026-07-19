// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen } from '@testing-library/react'
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
  onOpenSamples: vi.fn(),
  onOpenSearch: vi.fn(),
  onSetViewMode: vi.fn(),
  onToggleSoftWrap: vi.fn(),
  searchPanelOpen: false,
  softWrapEnabled: true,
  viewAvailable: true,
}

describe('EditorToolbar capabilities', () => {
  it('omits view mode and commit controls from the sub editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          editorTitle="Sub Editor"
          showCommit={false}
          showViewMode={false}
        />
      </MantineProvider>,
    )

    expect(screen.getByText('Sub Editor')).toBeTruthy()
    expect(screen.queryByLabelText('Editor view mode')).toBeNull()
    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
    expect(screen.getByLabelText('Choose sample data')).toBeTruthy()
    expect(screen.getByLabelText('Search and replace')).toBeTruthy()
  })

  it('keeps view mode and commit controls in the main editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          editorTitle="Main Editor"
          showCommit
          showViewMode
          onCommitWorkingText={vi.fn()}
        />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Editor view mode')).toBeTruthy()
    expect(screen.getByLabelText('Commit current editor text')).toBeTruthy()
  })
})
