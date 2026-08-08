import { useCallback, useEffect, useRef, useState } from 'react'

import {
  removeLegacyStorageKeys,
  saveWorkspace,
  WORKSPACE_CHANNEL_NAME,
  WORKSPACE_SAVE_AREAS,
  WorkspaceConflictError,
  writeLayoutBootstrap,
} from './persistence'
import type { WorkbenchPersistedState, WorkspaceSaveArea } from './persistence'

const SLOW_SAVE_INDICATOR_MS = 350

export const WORKSPACE_SAVE_DELAYS = {
  editors: 750,
  history: 100,
  layout: 100,
  positions: 1500,
} satisfies Record<WorkspaceSaveArea, number>

export type WorkspaceSaveStatus = 'conflict' | 'error' | 'saved' | 'saving'

type WorkspaceChannelMessage = {
  revision: number
  savedAt: string | null
  source: string
  type: 'cleared' | 'saved'
}

export function useWorkspacePersistence({
  initialRevision,
  initialSavedAt,
  onRemoteChange,
  state,
}: {
  initialRevision: number
  initialSavedAt: string | null
  onRemoteChange: () => void
  state: WorkbenchPersistedState
}) {
  const [status, setStatus] = useState<WorkspaceSaveStatus>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt)
  const [error, setError] = useState<string | null>(null)
  const stateRef = useRef(state)
  const onRemoteChangeRef = useRef(onRemoteChange)
  const revisionRef = useRef(initialRevision)
  const pendingAreasRef = useRef(new Set<WorkspaceSaveArea>())
  const timersRef = useRef(new Map<WorkspaceSaveArea, number>())
  const slowSaveTimerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const pausedRef = useRef(false)
  const remoteChangePendingRef = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const sourceRef = useRef(createTabId())

  useEffect(() => {
    stateRef.current = state
    onRemoteChangeRef.current = onRemoteChange
  }, [onRemoteChange, state])

  const broadcast = useCallback(
    (message: Omit<WorkspaceChannelMessage, 'source'>) => {
      channelRef.current?.postMessage({ ...message, source: sourceRef.current })
    },
    [],
  )

  const clearScheduledTimers = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      window.clearTimeout(timer)
    }
    timersRef.current.clear()
  }, [])

  const flush = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (savingRef.current || (pausedRef.current && !force)) return
      const areas = Array.from(pendingAreasRef.current)
      if (areas.length === 0) return

      pendingAreasRef.current.clear()
      clearScheduledTimers()
      savingRef.current = true
      setError(null)
      slowSaveTimerRef.current = window.setTimeout(() => {
        slowSaveTimerRef.current = null
        setStatus('saving')
      }, SLOW_SAVE_INDICATOR_MS)

      try {
        const currentState = stateRef.current
        const result = await saveWorkspace({
          areas,
          expectedRevision: revisionRef.current,
          force,
          state: currentState,
        })
        revisionRef.current = result.revision
        setSavedAt(result.savedAt)
        setStatus('saved')
        try {
          if (areas.includes('layout')) {
            writeLayoutBootstrap(currentState.layout)
          }
          removeLegacyStorageKeys()
        } catch {
          // IndexedDB remains canonical if the small bootstrap mirror is blocked.
        }
        broadcast({
          revision: result.revision,
          savedAt: result.savedAt,
          type: 'saved',
        })
      } catch (reason) {
        for (const area of areas) pendingAreasRef.current.add(area)
        pausedRef.current = true
        if (reason instanceof WorkspaceConflictError) {
          setStatus('conflict')
          setError('Another tab saved changes while this tab had unsaved work.')
        } else {
          setStatus('error')
          setError(
            reason instanceof Error
              ? reason.message
              : 'The workspace could not be saved locally.',
          )
        }
      } finally {
        window.clearTimeout(slowSaveTimerRef.current)
        slowSaveTimerRef.current = null
        savingRef.current = false
        if (
          pendingAreasRef.current.size > 0 &&
          timersRef.current.size === 0 &&
          !pausedRef.current
        ) {
          void flush()
        }
      }
    },
    [broadcast, clearScheduledTimers],
  )

  const scheduleSave = useCallback(
    (area: WorkspaceSaveArea) => {
      pendingAreasRef.current.add(area)
      if (pausedRef.current) return

      const existingTimer = timersRef.current.get(area)
      if (existingTimer !== undefined) window.clearTimeout(existingTimer)
      const timer = window.setTimeout(() => {
        timersRef.current.delete(area)
        void flush()
      }, WORKSPACE_SAVE_DELAYS[area])
      timersRef.current.set(area, timer)
    },
    [flush],
  )

  const retry = useCallback(() => {
    pausedRef.current = false
    void flush()
  }, [flush])

  const keepThisTab = useCallback(() => {
    pausedRef.current = false
    for (const area of WORKSPACE_SAVE_AREAS) {
      pendingAreasRef.current.add(area)
    }
    void flush({ force: true })
  }, [flush])

  const announceClear = useCallback(() => {
    revisionRef.current = 0
    pendingAreasRef.current.clear()
    clearScheduledTimers()
    pausedRef.current = false
    broadcast({ revision: 0, savedAt: null, type: 'cleared' })
  }, [broadcast, clearScheduledTimers])

  const applyRemoteChangeWhenInactive = useCallback(() => {
    if (!remoteChangePendingRef.current) return
    const isInactive =
      document.visibilityState === 'hidden' || !document.hasFocus()
    if (!isInactive) return
    remoteChangePendingRef.current = false
    onRemoteChangeRef.current()
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(WORKSPACE_CHANNEL_NAME)
    channelRef.current = channel
    channel.onmessage = (event: MessageEvent<WorkspaceChannelMessage>) => {
      const message = event.data
      if (message.source === sourceRef.current) return

      const hasLocalChanges =
        savingRef.current || pendingAreasRef.current.size > 0
      if (hasLocalChanges) {
        clearScheduledTimers()
        pausedRef.current = true
        setStatus('conflict')
        setError(
          message.type === 'cleared'
            ? 'Another tab cleared the saved workspace while this tab had unsaved work.'
            : 'Another tab saved changes while this tab had unsaved work.',
        )
        return
      }

      revisionRef.current = message.revision
      setSavedAt(message.savedAt)
      setStatus('saved')
      setError(null)
      remoteChangePendingRef.current = true
      applyRemoteChangeWhenInactive()
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [applyRemoteChangeWhenInactive, clearScheduledTimers])

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState !== 'hidden') return
      if (remoteChangePendingRef.current) {
        remoteChangePendingRef.current = false
        onRemoteChangeRef.current()
        return
      }
      void flush()
    }
    const refreshOnFocus = () => {
      if (!remoteChangePendingRef.current) return
      remoteChangePendingRef.current = false
      onRemoteChangeRef.current()
    }
    const flushOnPageHide = () => void flush()
    document.addEventListener('visibilitychange', flushOnHide)
    window.addEventListener('focus', refreshOnFocus)
    window.addEventListener('pagehide', flushOnPageHide)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide)
      window.removeEventListener('focus', refreshOnFocus)
      window.removeEventListener('pagehide', flushOnPageHide)
      clearScheduledTimers()
      if (slowSaveTimerRef.current !== null) {
        window.clearTimeout(slowSaveTimerRef.current)
      }
    }
  }, [clearScheduledTimers, flush])

  return {
    announceClear,
    error,
    keepThisTab,
    retry,
    savedAt,
    scheduleSave,
    status,
  }
}

function createTabId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}
