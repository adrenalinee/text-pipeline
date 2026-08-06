// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEditorSession } from './useEditorSession'
import { FORMAT_DETECTION_DEBOUNCE_MS } from './utils/formatDetection'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('editor session format detection', () => {
  it('detects once, locks, and only runs again after Auto detect is enabled', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useEditorSession({
        id: 'main',
        initialSyntaxMode: 'plain',
        initialValue: '',
      }),
    )

    act(() => result.current.updateValue('{"service":"text-pipeline"}'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FORMAT_DETECTION_DEBOUNCE_MS)
    })

    expect(result.current.syntaxMode).toBe('json')
    expect(result.current.formatSelection).toMatchObject({
      mode: 'locked',
      origin: 'detected',
    })

    act(() =>
      result.current.updateValue('service: text-pipeline\nenabled: true'),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FORMAT_DETECTION_DEBOUNCE_MS)
    })
    expect(result.current.syntaxMode).toBe('json')

    act(() => result.current.enableAutoDetection())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FORMAT_DETECTION_DEBOUNCE_MS)
      await vi.dynamicImportSettled()
    })

    expect(result.current.syntaxMode).toBe('yaml')
    expect(result.current.formatSelection).toMatchObject({
      mode: 'locked',
      origin: 'detected',
    })
  })

  it('locks manual and known format selections without detecting over them', () => {
    const { result } = renderHook(() =>
      useEditorSession({
        id: 'sub',
        initialSyntaxMode: 'plain',
        initialValue: '',
      }),
    )

    act(() => result.current.chooseSyntax('markdown'))
    expect(result.current.formatSelection).toEqual({
      mode: 'locked',
      origin: 'manual',
    })

    act(() => result.current.setKnownSyntaxMode('sql'))
    expect(result.current.syntaxMode).toBe('sql')
    expect(result.current.formatSelection).toEqual({
      mode: 'locked',
      origin: 'known',
    })
  })
})
