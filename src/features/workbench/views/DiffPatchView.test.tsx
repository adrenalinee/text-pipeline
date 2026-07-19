// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { DiffPatchView } from './DiffPatchView'

const SAMPLE_DIFF = `--- a/pipeline.yaml
+++ b/pipeline.yaml
@@ -1,2 +1,2 @@
-service: text-pipeline
+service: text-pipeline-v2
 environment: local
`

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

afterEach(cleanup)

describe('DiffPatchView', () => {
  it('parses and renders unified diff files and hunks', () => {
    const { container } = renderView(SAMPLE_DIFF)

    expect(screen.getByText('pipeline.yaml')).not.toBeNull()
    expect(screen.getByText('modify')).not.toBeNull()
    expect(screen.getByText('1 file')).not.toBeNull()
    expect(container.querySelector('.diff')).not.toBeNull()
    expect(container.textContent).toContain('service: text-pipeline-v2')
  })

  it('switches between split and unified layouts', () => {
    const { container } = renderView(SAMPLE_DIFF)

    fireEvent.click(screen.getByRole('radio', { name: 'Unified' }))

    expect(container.querySelector('.diff-unified')).not.toBeNull()
  })

  it('shows a useful error for text that is not a unified diff', () => {
    renderView('not a diff')

    expect(screen.getByRole('alert').textContent).toContain(
      'No unified diff file headers or hunks were found.',
    )
  })
})

function renderView(value: string) {
  return render(
    <MantineProvider>
      <DiffPatchView value={value} />
    </MantineProvider>,
  )
}
