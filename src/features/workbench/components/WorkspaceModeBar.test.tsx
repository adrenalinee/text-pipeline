// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { WorkspaceModeBar } from './WorkspaceModeBar'

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

const commonProps: ComponentProps<typeof WorkspaceModeBar> = {
  compact: false,
  diffLayout: 'split' as const,
  purpose: 'editor' as const,
  rightMatchesLeft: false,
  viewAvailable: true,
  onClose: vi.fn(),
  onCopyLeftToRight: vi.fn(),
  onDiffLayoutChange: vi.fn(),
  onPurposeChange: vi.fn(),
}

describe('WorkspaceModeBar', () => {
  it('exposes editor, diff, and view as explicit workspace modes', () => {
    const onPurposeChange = vi.fn()

    renderBar({ onPurposeChange })

    fireEvent.click(screen.getByRole('radio', { name: 'Diff' }))
    expect(onPurposeChange).toHaveBeenCalledWith('diff')
    expect(screen.getByRole('radio', { name: 'View' })).toBeTruthy()
  })

  it('shows diff layout and explicit copy controls only in diff mode', () => {
    renderBar({ purpose: 'diff' })

    expect(screen.getByLabelText('Diff layout')).toBeTruthy()
    expect(screen.getByLabelText('Copy left editor to right editor')).toBeTruthy()
  })

  it('forces a unified indicator on compact screens', () => {
    renderBar({ compact: true, purpose: 'diff' })

    expect(screen.getByText('Unified on narrow screens')).toBeTruthy()
    expect(screen.queryByLabelText('Diff layout')).toBeNull()
  })

  it('disables view when the current format has no visual renderer', () => {
    renderBar({ viewAvailable: false })

    expect(screen.getByRole('radio', { name: 'View' }).hasAttribute('disabled')).toBe(
      true,
    )
  })
})

function renderBar(
  overrides: Partial<ComponentProps<typeof WorkspaceModeBar>>,
) {
  return render(
    <MantineProvider>
      <WorkspaceModeBar {...commonProps} {...overrides} />
    </MantineProvider>,
  )
}
