// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createTextCommit } from '../history'
import type { TextCommit } from '../types'
import { HistoryRail } from './HistoryRail'
import { HistorySidebar } from './HistorySidebar'

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
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function commit(id: string, parentId: string, title: string): TextCommit {
  return createTextCommit({
    afterSyntaxMode: 'json',
    afterText: `after-${id}`,
    beforeSyntaxMode: 'json',
    beforeText: `before-${id}`,
    description: `desc ${id}`,
    id,
    parentId,
    timestamp: '10:00:00',
    title,
  })
}

// Newest-first, as the workbench stores them.
const commits = [
  commit('c003', 'c002', 'Third'),
  commit('c002', 'c001', 'Second'),
  commit('c001', 'root', 'First'),
]

function renderWith(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('HistorySidebar', () => {
  it('dims future commits relative to the checked-out base and checks out on click', () => {
    const onRestoreCommit = vi.fn()
    renderWith(
      <HistorySidebar
        commits={commits}
        currentText="hello"
        selectedRevisionId="c002"
        workingBaseRevisionId="c002"
        onRestoreCommit={onRestoreCommit}
        onRestoreRoot={vi.fn()}
      />,
    )

    // c003 is newer than the base c002, so it is a "future" (dimmed) row.
    expect(
      screen
        .getByText('Third')
        .closest('.historyRow')
        ?.getAttribute('data-future'),
    ).toBe('true')
    // The base and older commits are on the current line and not dimmed.
    expect(
      screen
        .getByText('Second')
        .closest('.historyRow')
        ?.getAttribute('data-future'),
    ).toBeNull()

    fireEvent.click(screen.getByText('Second'))
    expect(onRestoreCommit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c002' }),
    )
  })
})

describe('HistoryRail', () => {
  it('renders a clickable dot per revision with accessible labels', () => {
    const onRestoreCommit = vi.fn()
    const onRestoreRoot = vi.fn()
    renderWith(
      <HistoryRail
        commits={commits}
        currentText="hello"
        selectedRevisionId="c003"
        workingBaseRevisionId="c003"
        onExpand={vi.fn()}
        onRestoreCommit={onRestoreCommit}
        onRestoreRoot={onRestoreRoot}
      />,
    )

    fireEvent.click(screen.getByLabelText('Second (c002)'))
    expect(onRestoreCommit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c002' }),
    )

    fireEvent.click(screen.getByLabelText('Root input'))
    expect(onRestoreRoot).toHaveBeenCalled()
  })
})
