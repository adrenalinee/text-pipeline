// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { HtmlPreviewView } from './HtmlPreviewView'

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

describe('HtmlPreviewView', () => {
  it('renders HTML in a fully sandboxed iframe with a restrictive CSP', () => {
    render(
      <MantineProvider>
        <HtmlPreviewView value="<main><script>alert(1)</script></main>" />
      </MantineProvider>,
    )

    const frame = screen.getByTitle('Sandboxed HTML preview')

    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.hasAttribute('allow')).toBe(false)
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(frame.getAttribute('srcdoc')).toContain('Content-Security-Policy')
    expect(frame.getAttribute('srcdoc')).toContain("default-src 'none'")
    expect(frame.getAttribute('srcdoc')).toContain("script-src 'none'")
    expect(frame.getAttribute('srcdoc')).toContain("connect-src 'none'")
    expect(frame.getAttribute('srcdoc')).toContain("frame-src 'none'")
    expect(frame.getAttribute('srcdoc')).toContain("object-src 'none'")
    expect(frame.getAttribute('srcdoc')).toContain("base-uri 'none'")
    expect(frame.getAttribute('srcdoc')).toContain("form-action 'none'")
  })
})
