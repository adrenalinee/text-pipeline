// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StatusBar } from './StatusBar'

function renderWith(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('StatusBar', () => {
  it('shows total counts, cursor position, and format state', () => {
    renderWith(
      <StatusBar
        activeViewMode="source"
        charCount={42}
        cursor={{ column: 5, line: 2 }}
        encoding="UTF-8"
        formatLabel="JSON"
        lineCount={3}
        selection={null}
        validationAvailable
        validationEnabled={false}
        validationResult={null}
        onChooseSyntax={vi.fn()}
        onToggleValidation={vi.fn()}
      />,
    )

    expect(screen.getByText('Ln 2, Col 5')).toBeInTheDocument()
    expect(screen.getByText('3 lines, 42 chars')).toBeInTheDocument()
    expect(screen.getByText('UTF-8')).toBeInTheDocument()
    expect(screen.getByLabelText('Choose text format')).toHaveTextContent(
      'JSON',
    )
  })

  it('shows selection stats only when a selection is present', () => {
    renderWith(
      <StatusBar
        activeViewMode="source"
        charCount={11}
        cursor={{ column: 1, line: 1 }}
        encoding="UTF-8"
        formatLabel="Plain text"
        lineCount={1}
        selection={{ charCount: 5, lineCount: 1 }}
        validationAvailable={false}
        validationEnabled={false}
        validationResult={null}
        onChooseSyntax={vi.fn()}
        onToggleValidation={vi.fn()}
      />,
    )

    expect(screen.getByText('Selected 1 ln, 5 ch')).toBeInTheDocument()
  })

  it('hides the cursor position when not in source mode', () => {
    renderWith(
      <StatusBar
        activeViewMode="view"
        charCount={11}
        cursor={{ column: 1, line: 1 }}
        encoding="UTF-8"
        formatLabel="JSON"
        lineCount={1}
        selection={null}
        validationAvailable
        validationEnabled={false}
        validationResult={null}
        onChooseSyntax={vi.fn()}
        onToggleValidation={vi.fn()}
      />,
    )

    expect(screen.queryByText(/^Ln /)).not.toBeInTheDocument()
  })
})
