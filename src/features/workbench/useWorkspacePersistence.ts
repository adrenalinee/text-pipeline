import { useCallback, useEffect, useRef, useState } from 'react'

import {
  removeLegacyStorageKeys,
  saveWorkspace,
  WORKSPACE_CHANNEL_NAME,
  WorkspaceConflictError,
  writeLayoutBootstrap,
} from './persistence'
import type { WorkbenchPersistedState } from './persistence'

const SAVE_DEBOUNCE_MS = 250

export type WorkspaceSaveStatus = 'conflict' | 'error' | 'saved' | 'saving'

type WorkspaceChannelMessage = {
  revision: number
  source: string
  type: 'cleared' | 'saved'
}

export function useWorkspacePersistence({
  initialRevision,
  initialSavedAt,
}: {
  initialRevision: number
  initialSavedAt: string | null
}) {
  const [status, setStatus] = useState<WorkspaceSaveStatus>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt)
  const [error, setError] = useState<string | null>(null)
  const revisionRef = useRef(initialRevision)
  const pendingRef = useRef<WorkbenchPersistedState | null>(null)
  const timerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const pausedRef = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const sourceRef = useRef(createTabId())

  const broadcast = useCallback(
    (message: Omit<WorkspaceChannelMessage, 'source'>) => {
      channelRef.current?.postMessage({ ...message, source: sourceRef.current })
    },
    [],
  )

  const flush = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (savingRef.current || (pausedRef.current && !force)) return
      const state = pendingRef.current
      if (!state) return

      pendingRef.current = null
      savingRef.current = true
      setStatus('saving')
      setError(null)

      try {
        const result = await saveWorkspace({
          expectedRevision: revisionRef.current,
          force,
          state,
        })
        revisionRef.current = result.revision
        setSavedAt(result.savedAt)
        setStatus('saved')
        try {
          writeLayoutBootstrap(state.layout)
          removeLegacyStorageKeys()
        } catch {
          // IndexedDB remains canonical if the small bootstrap mirror is blocked.
        }
        broadcast({ revision: result.revision, type: 'saved' })
      } catch (reason) {
        pendingRef.current = state
        pausedRef.current = true
        if (reason instanceof WorkspaceConflictError) {
          setStatus('conflict')
          setError(reason.message)
        } else {
          setStatus('error')
          setError(
            reason instanceof Error
              ? reason.message
              : 'The workspace could not be saved locally.',
          )
        }
      } finally {
        savingRef.current = false
        if (pendingRef.current && !pausedRef.current) {
          void flush()
        }
      }
    },
    [broadcast],
  )

  const scheduleSave = useCallback(
    (state: WorkbenchPersistedState) => {
      pendingRef.current = state
      if (pausedRef.current) return
      setStatus('saving')
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void flush()
      }, SAVE_DEBOUNCE_MS)
    },
    [flush],
  )

  const retry = useCallback(
    (state: WorkbenchPersistedState) => {
      pausedRef.current = false
      pendingRef.current = state
      void flush()
    },
    [flush],
  )

  const overwrite = useCallback(
    (state: WorkbenchPersistedState) => {
      pausedRef.current = false
      pendingRef.current = state
      void flush({ force: true })
    },
    [flush],
  )

  const announceClear = useCallback(() => {
    revisionRef.current = 0
    pendingRef.current = null
    pausedRef.current = false
    broadcast({ revision: 0, type: 'cleared' })
  }, [broadcast])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(WORKSPACE_CHANNEL_NAME)
    channelRef.current = channel
    channel.onmessage = (event: MessageEvent<WorkspaceChannelMessage>) => {
      const message = event.data
      if (message.source === sourceRef.current) return
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      pausedRef.current = true
      setStatus('conflict')
      setError(
        message.type === 'cleared'
          ? 'The saved workspace was cleared in another tab.'
          : 'The saved workspace was changed by another tab.',
      )
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const flushOnPageHide = () => void flush()
    document.addEventListener('visibilitychange', flushOnHide)
    window.addEventListener('pagehide', flushOnPageHide)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide)
      window.removeEventListener('pagehide', flushOnPageHide)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [flush])

  return {
    announceClear,
    error,
    overwrite,
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
