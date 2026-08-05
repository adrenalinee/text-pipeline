// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { EMPTY_MATCH_COUNT } from './matchCount'
import { SearchReplacePanel } from './SearchReplacePanel'

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

function renderPanel(onClose: () => void) {
  render(
    <MantineProvider>
      <SearchReplacePanel
        caseSensitive={false}
        focusRequest={null}
        matchInfo={EMPTY_MATCH_COUNT}
        preserveCase={false}
        queryValid
        regexp={false}
        replaceText=""
        searchText=""
        showReplace={false}
        onCaseSensitiveChange={vi.fn()}
        onClose={onClose}
        onFindNext={vi.fn()}
        onFindPrevious={vi.fn()}
        onHeightChange={vi.fn()}
        onOpenReplaceRow={vi.fn()}
        onPreserveCaseChange={vi.fn()}
        onRegexpChange={vi.fn()}
        onReplaceAll={vi.fn()}
        onReplaceNext={vi.fn()}
        onReplaceTextChange={vi.fn()}
        onSearchTextChange={vi.fn()}
        onToggleReplaceRow={vi.fn()}
      />
    </MantineProvider>,
  )
}

describe('SearchReplacePanel shortcuts', () => {
  it('closes when the find shortcut is pressed again', () => {
    const onClose = vi.fn()
    renderPanel(onClose)

    expect(
      fireEvent.keyDown(screen.getByLabelText('Find'), {
        code: 'KeyF',
        ctrlKey: true,
      }),
    ).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
