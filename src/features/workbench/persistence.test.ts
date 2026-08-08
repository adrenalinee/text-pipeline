// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createTextCommit } from './history'
import {
  clearWorkspaceStorage,
  createDefaultWorkspaceState,
  loadWorkspace,
  saveWorkspace,
  WORKSPACE_DB_KEY,
  WORKSPACE_DB_NAME,
  WORKSPACE_DB_STORE,
  WorkspaceConflictError,
} from './persistence'

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

describe('workspace persistence', () => {
  it('round-trips editors, layout, revision pointers, and normalized history', async () => {
    const state = createDefaultWorkspaceState()
    state.editors.main.value = '{"saved":true}'
    state.editors.main.syntaxMode = 'json'
    state.editors.main.formatSelection = {
      mode: 'locked',
      origin: 'manual',
    }
    state.editors.main.selection = { anchor: 2, head: 8 }
    state.editors.main.scroll = { left: 12, top: 90 }
    state.layout.splitEnabled = true
    state.layout.activeEditorId = 'sub'
    state.history.initialRevision = { syntaxMode: 'plain', text: 'root text' }
    state.history.rootCaptured = true
    state.history.commitSequence = 7
    state.history.commits = [
      createTextCommit({
        afterSyntaxMode: 'json',
        afterText: '{"saved":true}',
        beforeSyntaxMode: 'plain',
        beforeText: 'root text',
        description: 'Formatted JSON',
        id: 'c007',
        parentId: 'root',
        timestamp: '12:00:00',
        title: 'JSON format',
      }),
    ]
    state.history.selectedRevisionId = 'c007'
    state.history.workingBaseRevisionId = 'c007'

    const saved = await saveWorkspace({ expectedRevision: 0, state })
    const loaded = await loadWorkspace(createDefaultWorkspaceState())

    expect(loaded.revision).toBe(saved.revision)
    expect(loaded.state.editors.main).toMatchObject({
      scroll: { left: 12, top: 90 },
      selection: { anchor: 2, head: 8 },
      syntaxMode: 'json',
      value: '{"saved":true}',
    })
    expect(loaded.state.layout).toMatchObject({
      activeEditorId: 'sub',
      splitEnabled: true,
    })
    expect(loaded.state.history.commitSequence).toBe(7)
    expect(loaded.state.history.commits[0]).toMatchObject({
      afterText: '{"saved":true}',
      beforeText: 'root text',
      id: 'c007',
      parentId: 'root',
    })
  })

  it('clamps restored editor positions to the restored document', async () => {
    const state = createDefaultWorkspaceState()
    state.editors.main.value = 'short'
    state.editors.main.selection = { anchor: -5, head: 500 }
    state.editors.main.scroll = { left: -10, top: 20 }

    await saveWorkspace({ expectedRevision: 0, state })
    const loaded = await loadWorkspace(createDefaultWorkspaceState())

    expect(loaded.state.editors.main.selection).toEqual({
      anchor: 0,
      head: 5,
    })
    expect(loaded.state.editors.main.scroll).toEqual({ left: 0, top: 20 })
  })

  it('writes only the requested workspace area after initialization', async () => {
    const original = createDefaultWorkspaceState()
    original.editors.main.value = 'first editor value'
    original.history.initialRevision = {
      syntaxMode: 'plain',
      text: 'preserved history root',
    }
    original.layout.splitEnabled = true
    const firstSave = await saveWorkspace({
      expectedRevision: 0,
      state: original,
    })

    const changed = structuredClone(original)
    changed.editors.main.value = 'second editor value'
    changed.history.initialRevision.text = 'should not be written'
    changed.layout.splitEnabled = false
    await saveWorkspace({
      areas: ['editors'],
      expectedRevision: firstSave.revision,
      state: changed,
    })

    const loaded = await loadWorkspace(createDefaultWorkspaceState())
    expect(loaded.state.editors.main.value).toBe('second editor value')
    expect(loaded.state.history.initialRevision.text).toBe(
      'preserved history root',
    )
    expect(loaded.state.layout.splitEnabled).toBe(true)
  })

  it('loads the previous single-record schema and migrates it on save', async () => {
    const legacy = createDefaultWorkspaceState()
    legacy.editors.main.value = 'legacy editor text'
    legacy.layout.wide.rightOpened = false
    await writeLegacyWorkspace({
      ...legacy,
      revision: 4,
      savedAt: '2026-08-09T00:00:00.000Z',
      schemaVersion: 1,
    })

    const loadedLegacy = await loadWorkspace(createDefaultWorkspaceState())
    expect(loadedLegacy.revision).toBe(4)
    expect(loadedLegacy.state.editors.main.value).toBe('legacy editor text')

    loadedLegacy.state.editors.main.value = 'migrated editor text'
    const migrated = await saveWorkspace({
      areas: ['editors'],
      expectedRevision: loadedLegacy.revision,
      state: loadedLegacy.state,
    })
    const loadedMigrated = await loadWorkspace(createDefaultWorkspaceState())

    expect(migrated.revision).toBe(5)
    expect(loadedMigrated.state.editors.main.value).toBe('migrated editor text')
    expect(loadedMigrated.state.layout.wide.rightOpened).toBe(false)
  })

  it('rejects stale writes instead of overwriting another tab', async () => {
    const state = createDefaultWorkspaceState()
    await saveWorkspace({ expectedRevision: 0, state })

    await expect(
      saveWorkspace({ expectedRevision: 0, state }),
    ).rejects.toBeInstanceOf(WorkspaceConflictError)
  })

  it('removes the saved workspace', async () => {
    const state = createDefaultWorkspaceState()
    state.editors.main.value = 'sensitive token'
    await saveWorkspace({ expectedRevision: 0, state })

    await clearWorkspaceStorage()
    const loaded = await loadWorkspace(createDefaultWorkspaceState())

    expect(loaded.revision).toBe(0)
    expect(loaded.state.editors.main.value).toBe('')
  })
})

function writeLegacyWorkspace(value: unknown) {
  return new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.open(WORKSPACE_DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction(WORKSPACE_DB_STORE, 'readwrite')
      transaction.objectStore(WORKSPACE_DB_STORE).put(value, WORKSPACE_DB_KEY)
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => {
        database.close()
        reject(transaction.error)
      }
    }
  })
}
