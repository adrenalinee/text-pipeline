// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEditorSession } from './useEditorSession'
import { TEXT_SAMPLES } from './samples'
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

describe('editor session sample loading', () => {
  it('runs the pre-load callback before replacing working text', () => {
    const events: Array<string> = []
    const sample = TEXT_SAMPLES[0]
    const { result } = renderHook(() =>
      useEditorSession({
        id: 'main',
        initialSyntaxMode: 'plain',
        initialValue: 'unsaved working text',
        onBeforeSampleLoad: () => {
          events.push('before')
        },
        onManualChange: () => {
          events.push('change')
        },
      }),
    )

    act(() => result.current.loadSample(sample))

    expect(events).toEqual(['before', 'change'])
    expect(result.current.value).toBe(sample.value)
  })
})

describe('editor session restoration', () => {
  it('initializes durable editor preferences and positions from a snapshot', () => {
    const { result } = renderHook(() =>
      useEditorSession({
        id: 'main',
        initialState: {
          encoding: 'UTF-16 LE',
          formatSelection: { mode: 'locked', origin: 'manual' },
          scroll: { left: 14, top: 120 },
          selection: { anchor: 7, head: 2 },
          softWrapEnabled: false,
          sourceViewEnabled: false,
          sqlDialectId: 'postgresql',
          syntaxMode: 'sql',
          validationEnabled: true,
          value: 'select 1',
          viewMode: 'source',
          whitespaceVisible: true,
        },
        initialSyntaxMode: 'plain',
        initialValue: '',
      }),
    )

    expect(result.current.value).toBe('select 1')
    expect(result.current.syntaxMode).toBe('sql')
    expect(result.current.sqlDialect.id).toBe('postgresql')
    expect(result.current.selection).toEqual({ anchor: 7, head: 2 })
    expect(result.current.scrollPosition).toEqual({ left: 14, top: 120 })
    expect(result.current.softWrapEnabled).toBe(false)
    expect(result.current.validationEnabled).toBe(true)
    expect(result.current.whitespaceVisible).toBe(true)
  })
})
