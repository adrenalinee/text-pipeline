// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { FormatCapability, FormatViewDefinition } from '../types'
import { FormatViewPanel } from './FormatViewPanel'

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

const format = {
  defaultViewId: 'structured-tree',
  description: 'JSON data',
  id: 'json',
  label: 'JSON',
  loadEditorExtensions: async () => [],
  sampleIds: [],
  transformIds: [],
  validation: 'supported',
  viewIds: ['structured-tree'],
} satisfies FormatCapability

const views: ReadonlyArray<FormatViewDefinition> = [
  {
    description: 'Browse nested values.',
    id: 'structured-tree',
    label: 'Tree view',
    render: () => <div>Rendered tree</div>,
    supportedFormats: ['json'],
  },
]

describe('FormatViewPanel layout controls', () => {
  it('offers view-only mode while the source is shown', () => {
    const onToggleSourceView = vi.fn()

    render(
      <MantineProvider>
        <FormatViewPanel
          format={format}
          sourceViewAvailable
          sourceViewVisible
          value="{}"
          views={views}
          onToggleSourceView={onToggleSourceView}
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show view only')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)
    expect(onToggleSourceView).toHaveBeenCalledOnce()
  })

  it('offers split mode while only the rendered view is shown', () => {
    render(
      <MantineProvider>
        <FormatViewPanel
          format={format}
          sourceViewAvailable
          sourceViewVisible={false}
          value="{}"
          views={views}
          onToggleSourceView={vi.fn()}
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show source alongside view')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
  })
})
