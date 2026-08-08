// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  clearWorkspaceStorage,
  createDefaultWorkspaceState,
  loadWorkspace,
  saveWorkspace,
} from './persistence'
import { useWorkspacePersistence } from './useWorkspacePersistence'

beforeAll(() => {
  const values = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    },
  })
})

beforeEach(async () => {
  window.localStorage.clear()
  await clearWorkspaceStorage()
})

afterEach(cleanup)

describe('useWorkspacePersistence', () => {
  it('debounces state changes and reports the durable saved state', async () => {
    const state = createDefaultWorkspaceState()
    state.editors.main.value = 'autosaved text'
    const { result } = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: 0,
        initialSavedAt: null,
        onRemoteChange: () => undefined,
        state,
      }),
    )

    act(() => result.current.scheduleSave('editors'))
    expect(result.current.status).toBe('saved')
    await waitFor(async () => {
      const loaded = await loadWorkspace(createDefaultWorkspaceState())
      expect(loaded.state.editors.main.value).toBe('autosaved text')
    })

    const loaded = await loadWorkspace(createDefaultWorkspaceState())
    expect(loaded.state.editors.main.value).toBe('autosaved text')
    expect(loaded.revision).toBe(1)
  })

  it('pauses with a conflict when its expected revision is stale', async () => {
    const first = createDefaultWorkspaceState()
    await saveWorkspace({ expectedRevision: 0, state: first })
    const stale = createDefaultWorkspaceState()
    stale.editors.main.value = 'stale tab edit'
    const { result } = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: 0,
        initialSavedAt: null,
        onRemoteChange: () => undefined,
        state: stale,
      }),
    )

    act(() => result.current.scheduleSave('editors'))
    await waitFor(() => expect(result.current.status).toBe('conflict'), {
      timeout: 1500,
    })
    expect(result.current.error?.toLowerCase()).toContain('another tab')
  })
})
