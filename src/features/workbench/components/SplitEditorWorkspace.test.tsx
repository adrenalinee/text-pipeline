// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { clampSplitRatio, SplitEditorWorkspace } from './SplitEditorWorkspace'

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
})

afterEach(cleanup)

describe('SplitEditorWorkspace', () => {
  it('clamps resize ratios to keep both panes usable', () => {
    expect(clampSplitRatio(-10)).toBe(20)
    expect(clampSplitRatio(45)).toBe(45)
    expect(clampSplitRatio(120)).toBe(80)
  })

  it('renders only the main pane when split mode is disabled', () => {
    render(
      <MantineProvider>
        <SplitEditorWorkspace
          compact={false}
          main={<div>Main pane</div>}
          ratio={50}
          split={false}
          sub={<div>Sub pane</div>}
          onRatioChange={vi.fn()}
        />
      </MantineProvider>,
    )

    expect(screen.getByText('Main pane')).toBeTruthy()
    expect(screen.queryByText('Sub pane')).toBeNull()
    expect(screen.queryByRole('separator')).toBeNull()
  })

  it('supports keyboard resizing with orientation-aware arrow keys', () => {
    const onRatioChange = vi.fn()
    const { rerender } = render(
      <MantineProvider>
        <SplitEditorWorkspace
          compact={false}
          main={<div>Main pane</div>}
          ratio={50}
          split
          sub={<div>Sub pane</div>}
          onRatioChange={onRatioChange}
        />
      </MantineProvider>,
    )

    const separator = screen.getByRole('separator')
    expect(separator.getAttribute('aria-orientation')).toBe('vertical')
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(onRatioChange).toHaveBeenLastCalledWith(55)

    rerender(
      <MantineProvider>
        <SplitEditorWorkspace
          compact
          main={<div>Main pane</div>}
          ratio={50}
          split
          sub={<div>Sub pane</div>}
          onRatioChange={onRatioChange}
        />
      </MantineProvider>,
    )

    const compactSeparator = screen.getByRole('separator')
    expect(compactSeparator.getAttribute('aria-orientation')).toBe('horizontal')
    fireEvent.keyDown(compactSeparator, { key: 'ArrowDown' })
    expect(onRatioChange).toHaveBeenLastCalledWith(55)
  })
})
