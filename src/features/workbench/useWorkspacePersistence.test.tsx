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
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: FakeBroadcastChannel,
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
        state,
      }),
    )

    act(() => result.current.scheduleSave('editors', { affectsContent: true }))
    expect(result.current.status).toBe('saved')
    expect(result.current.isSaved).toBe(false)
    await waitFor(async () => {
      const loaded = await loadWorkspace(createDefaultWorkspaceState())
      expect(loaded.state.editors.main.value).toBe('autosaved text')
    })
    await waitFor(() => expect(result.current.isSaved).toBe(true))

    const loaded = await loadWorkspace(createDefaultWorkspaceState())
    expect(loaded.state.editors.main.value).toBe('autosaved text')
    expect(loaded.revision).toBe(1)
  })

  it('keeps the document saved indicator stable for UI-only changes', async () => {
    const state = createDefaultWorkspaceState()
    const { result } = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: 0,
        initialSavedAt: '2026-08-09T00:00:00.000Z',
        state,
      }),
    )

    act(() => result.current.scheduleSave('layout'))
    expect(result.current.isSaved).toBe(true)
    await waitFor(async () => {
      const loaded = await loadWorkspace(createDefaultWorkspaceState())
      expect(loaded.revision).toBe(1)
    })
    expect(result.current.isSaved).toBe(true)
  })

  it('tracks history writes as document content saves', async () => {
    const state = createDefaultWorkspaceState()
    const { result } = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: 0,
        initialSavedAt: '2026-08-09T00:00:00.000Z',
        state,
      }),
    )

    act(() => result.current.scheduleSave('history', { affectsContent: true }))
    expect(result.current.isSaved).toBe(false)
    await waitFor(() => expect(result.current.isSaved).toBe(true))
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
        state: stale,
      }),
    )

    act(() => result.current.scheduleSave('editors', { affectsContent: true }))
    await waitFor(() => expect(result.current.status).toBe('conflict'), {
      timeout: 1500,
    })
    expect(result.current.error?.toLowerCase()).toContain('another tab')
  })

  it('does not reload or claim a remote workspace is saved in this tab', async () => {
    const firstState = createDefaultWorkspaceState()
    firstState.editors.main.value = 'saved by the first tab'
    const secondState = createDefaultWorkspaceState()
    secondState.editors.main.value = 'visible in the second tab'
    const first = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: 0,
        initialSavedAt: null,
        state: firstState,
      }),
    )
    const second = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: 0,
        initialSavedAt: null,
        state: secondState,
      }),
    )

    act(() =>
      first.result.current.scheduleSave('editors', { affectsContent: true }),
    )
    await waitFor(() =>
      expect(second.result.current.hasRemoteChanges).toBe(true),
    )
    expect(second.result.current.isSaved).toBe(false)

    act(() => second.result.current.scheduleSave('positions'))
    expect(second.result.current.status).toBe('saved')
    expect(second.result.current.hasRemoteChanges).toBe(true)

    act(() =>
      second.result.current.scheduleSave('editors', { affectsContent: true }),
    )
    expect(second.result.current.status).toBe('conflict')
  })

  it('ignores UI-only saves broadcast by another tab', async () => {
    const state = createDefaultWorkspaceState()
    const initial = await saveWorkspace({ expectedRevision: 0, state })
    const first = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: initial.revision,
        initialSavedAt: initial.savedAt,
        state,
      }),
    )
    const second = renderHook(() =>
      useWorkspacePersistence({
        initialRevision: initial.revision,
        initialSavedAt: initial.savedAt,
        state,
      }),
    )

    act(() => first.result.current.scheduleSave('layout'))
    await waitFor(async () => {
      const loaded = await loadWorkspace(createDefaultWorkspaceState())
      expect(loaded.revision).toBe(2)
    })
    await waitFor(() => expect(second.result.current.isSaved).toBe(true))
    expect(second.result.current.hasRemoteChanges).toBe(false)
  })
})

class FakeBroadcastChannel {
  static instances = new Set<FakeBroadcastChannel>()

  name: string
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    this.name = name
    FakeBroadcastChannel.instances.add(this)
  }

  close() {
    FakeBroadcastChannel.instances.delete(this)
  }

  postMessage(data: unknown) {
    for (const instance of FakeBroadcastChannel.instances) {
      if (instance === this || instance.name !== this.name) continue
      queueMicrotask(() => instance.onmessage?.({ data } as MessageEvent))
    }
  }
}
