// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { StatusBar } from './StatusBar'

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

afterEach(() => {
  cleanup()
})

const handlers = {
  onChooseEncoding: vi.fn(),
  onChooseSyntax: vi.fn(),
  onGoToLine: vi.fn(),
  onToggleValidation: vi.fn(),
}

function renderWith(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('StatusBar', () => {
  it('shows total counts, cursor position, encoding, and format state', () => {
    renderWith(
      <StatusBar
        charCount={42}
        cursor={{ column: 5, line: 2 }}
        encoding="UTF-8"
        formatLabel="JSON"
        lineCount={3}
        selection={null}
        validationAvailable
        validationEnabled={false}
        validationResult={null}
        {...handlers}
      />,
    )

    expect(screen.getByText('2:5')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('UTF-8')).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Change format and syntax highlighting',
      }).textContent,
    ).toContain('JSON')
  })

  it('calls handlers for the go-to-line and encoding chips', () => {
    const onGoToLine = vi.fn()
    const onChooseEncoding = vi.fn()

    renderWith(
      <StatusBar
        charCount={42}
        cursor={{ column: 5, line: 2 }}
        encoding="UTF-8"
        formatLabel="JSON"
        lineCount={3}
        selection={null}
        validationAvailable
        validationEnabled={false}
        validationResult={null}
        {...handlers}
        onChooseEncoding={onChooseEncoding}
        onGoToLine={onGoToLine}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Go to line and column' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Change encoding' }))

    expect(onGoToLine).toHaveBeenCalledTimes(1)
    expect(onChooseEncoding).toHaveBeenCalledTimes(1)
  })

  it('shows selection stats only when a selection is present', () => {
    renderWith(
      <StatusBar
        charCount={11}
        cursor={{ column: 1, line: 1 }}
        encoding="UTF-8"
        formatLabel="Plain text"
        lineCount={1}
        selection={{ charCount: 5, lineCount: 1 }}
        validationAvailable={false}
        validationEnabled={false}
        validationResult={null}
        {...handlers}
      />,
    )

    expect(screen.getByText('5 chars')).toBeTruthy()
  })

  it('formats line counts with thousands separators', () => {
    renderWith(
      <StatusBar
        charCount={12345}
        cursor={{ column: 1, line: 1234 }}
        encoding="UTF-8"
        formatLabel="Plain text"
        lineCount={12345}
        selection={{ charCount: 5000, lineCount: 1234 }}
        validationAvailable={false}
        validationEnabled={false}
        validationResult={null}
        {...handlers}
      />,
    )

    expect(screen.getByText('12,345')).toBeTruthy()
    expect(screen.getByText('5000 chars, 1,234 lines')).toBeTruthy()
    expect(screen.getByText('1234:1')).toBeTruthy()
  })

  it('surfaces validation status as the right-most control', () => {
    renderWith(
      <StatusBar
        charCount={11}
        cursor={{ column: 1, line: 1 }}
        encoding="UTF-8"
        formatLabel="JSON"
        lineCount={1}
        selection={null}
        validationAvailable
        validationEnabled
        validationResult={{
          message: 'Looks valid.',
          status: 'valid',
          title: 'Valid JSON',
        }}
        {...handlers}
      />,
    )

    expect(screen.getByText('Valid')).toBeTruthy()
  })
})
