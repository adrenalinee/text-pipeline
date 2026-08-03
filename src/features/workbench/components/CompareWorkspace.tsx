import { oneDark } from '@codemirror/theme-one-dark'
import { Compartment, Transaction } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import {
  getChunks,
  goToNextChunk,
  goToPreviousChunk,
  MergeView,
  unifiedMergeView,
} from '@codemirror/merge'
import { EditorView } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'
import { ActionIcon, Badge, Box, Group, Text, Tooltip } from '@mantine/core'
import { getDefaultExtensions } from '@uiw/react-codemirror'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import type { EditorId, EditorSession } from '../useEditorSession'
import { clampSplitRatio } from './SplitEditorWorkspace'
import { EditorDialogs, EditorPaneHeader } from './EditorPane'

const DIFF_CONFIG = { scanLimit: 500, timeout: 250 } as const
const COLLAPSE_UNCHANGED = { margin: 3, minSize: 8 } as const

type CompareStats = {
  approximate: boolean
  chunkCount: number
}

export function CompareWorkspace({
  activeEditorId,
  canCommitWorkingText,
  compact,
  isDark,
  mainSession,
  onActivate,
  onCommitWorkingText,
  onRatioChange,
  ratio,
  subSession,
}: {
  activeEditorId: EditorId
  canCommitWorkingText: boolean
  compact: boolean
  isDark: boolean
  mainSession: EditorSession
  onActivate: (id: EditorId) => void
  onCommitWorkingText: () => void
  onRatioChange: (ratio: number) => void
  ratio: number
  subSession: EditorSession
}) {
  return compact ? (
    <CompactUnifiedCompare
      isDark={isDark}
      mainSession={mainSession}
      subSession={subSession}
    />
  ) : (
    <DesktopCompare
      activeEditorId={activeEditorId}
      canCommitWorkingText={canCommitWorkingText}
      isDark={isDark}
      mainSession={mainSession}
      ratio={ratio}
      subSession={subSession}
      onActivate={onActivate}
      onCommitWorkingText={onCommitWorkingText}
      onRatioChange={onRatioChange}
    />
  )
}

function DesktopCompare({
  activeEditorId,
  canCommitWorkingText,
  isDark,
  mainSession,
  onActivate,
  onCommitWorkingText,
  onRatioChange,
  ratio,
  subSession,
}: {
  activeEditorId: EditorId
  canCommitWorkingText: boolean
  isDark: boolean
  mainSession: EditorSession
  onActivate: (id: EditorId) => void
  onCommitWorkingText: () => void
  onRatioChange: (ratio: number) => void
  ratio: number
  subSession: EditorSession
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mergeRef = useRef<MergeView | null>(null)
  const mainSessionRef = useRef(mainSession)
  const subSessionRef = useRef(subSession)
  const activeEditorIdRef = useRef(activeEditorId)
  const syncingRef = useRef<EditorId | null>(null)
  const baseA = useRef(new Compartment()).current
  const baseB = useRef(new Compartment()).current
  const sessionA = useRef(new Compartment()).current
  const sessionB = useRef(new Compartment()).current
  const [stats, setStats] = useState<CompareStats | null>(null)

  mainSessionRef.current = mainSession
  subSessionRef.current = subSession
  activeEditorIdRef.current = activeEditorId

  function refreshStats() {
    const chunks = mergeRef.current?.chunks ?? []
    setStats({
      approximate: chunks.some((chunk) => !chunk.precise),
      chunkCount: chunks.length,
    })
  }

  function handleUpdate(id: EditorId, update: ViewUpdate) {
    const session =
      id === 'main' ? mainSessionRef.current : subSessionRef.current

    session.bindEditorView(update.view)
    session.updateEditorView(update)

    if (update.docChanged && syncingRef.current !== id) {
      session.updateValue(update.state.doc.toString())
    }

    if (update.docChanged) queueMicrotask(refreshStats)
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const merge = new MergeView({
      a: {
        doc: mainSessionRef.current.value,
        extensions: [
          baseA.of(getBaseExtensions(isDark, 'Left text')),
          sessionA.of(mainSessionRef.current.editorExtensions),
          EditorView.updateListener.of((update) =>
            handleUpdate('main', update),
          ),
        ],
      },
      b: {
        doc: subSessionRef.current.value,
        extensions: [
          baseB.of(getBaseExtensions(isDark, 'Right text')),
          sessionB.of(subSessionRef.current.editorExtensions),
          EditorView.updateListener.of((update) => handleUpdate('sub', update)),
        ],
      },
      collapseUnchanged: COLLAPSE_UNCHANGED,
      diffConfig: DIFF_CONFIG,
      gutter: true,
      highlightChanges: true,
      orientation: 'a-b',
      parent: host,
    })

    mergeRef.current = merge
    mainSessionRef.current.bindEditorView(merge.a)
    subSessionRef.current.bindEditorView(merge.b)
    refreshStats()

    return () => {
      if (mainSessionRef.current.editorViewRef.current === merge.a) {
        mainSessionRef.current.bindEditorView(null)
      }
      if (subSessionRef.current.editorViewRef.current === merge.b) {
        subSessionRef.current.bindEditorView(null)
      }
      merge.destroy()
      mergeRef.current = null
    }
    // The MergeView is deliberately created once. Later configuration and
    // document changes are applied through compartments and transactions.
  }, [])

  useEffect(() => {
    const merge = mergeRef.current
    if (!merge) return

    merge.a.dispatch({
      effects: [
        baseA.reconfigure(getBaseExtensions(isDark, 'Left text')),
        sessionA.reconfigure(mainSession.editorExtensions),
      ],
    })
  }, [baseA, isDark, mainSession.editorExtensions, sessionA])

  useEffect(() => {
    const merge = mergeRef.current
    if (!merge) return

    merge.b.dispatch({
      effects: [
        baseB.reconfigure(getBaseExtensions(isDark, 'Right text')),
        sessionB.reconfigure(subSession.editorExtensions),
      ],
    })
  }, [baseB, isDark, sessionB, subSession.editorExtensions])

  useEffect(() => {
    syncDocument(mergeRef.current?.a, mainSession.value, 'main', syncingRef)
  }, [mainSession.value])

  useEffect(() => {
    syncDocument(mergeRef.current?.b, subSession.value, 'sub', syncingRef)
  }, [subSession.value])

  useEffect(() => {
    mergeRef.current?.a.requestMeasure()
    mergeRef.current?.b.requestMeasure()
  }, [ratio])

  function activateFromTarget(target: EventTarget | null) {
    const merge = mergeRef.current
    const node = target instanceof Node ? target : null
    if (!merge || !node) return

    if (merge.a.dom.contains(node)) onActivate('main')
    if (merge.b.dom.contains(node)) onActivate('sub')
  }

  function navigate(direction: 'next' | 'previous') {
    const merge = mergeRef.current
    if (!merge) return

    const target = activeEditorIdRef.current === 'sub' ? merge.b : merge.a
    const command = direction === 'next' ? goToNextChunk : goToPreviousChunk
    command(target)
    target.focus()
  }

  return (
    <Box className="compareWorkspace">
      <CompareToolbar
        compact={false}
        stats={stats}
        onNext={() => navigate('next')}
        onPrevious={() => navigate('previous')}
      />
      <EditorDialogs session={mainSession} />
      <EditorDialogs session={subSession} />
      <Box
        className="compareEditorHeaders"
        style={{ '--editor-split-ratio': `${ratio}%` }}
      >
        <Box className="compareEditorHeader compareEditorHeaderLeft">
          <EditorPaneHeader
            activeViewMode="source"
            allowCommit
            canCommitWorkingText={canCommitWorkingText}
            isActive={activeEditorId === 'main'}
            session={mainSession}
            viewDisabledReason="Exit Compare to show the visual view"
            onCommitWorkingText={onCommitWorkingText}
          />
        </Box>
        <Box className="compareEditorHeader compareEditorHeaderRight">
          <EditorPaneHeader
            activeViewMode="source"
            allowCommit={false}
            canCommitWorkingText={false}
            isActive={activeEditorId === 'sub'}
            session={subSession}
            viewDisabledReason="Exit Compare to show the visual view"
          />
        </Box>
      </Box>
      <Box
        className="compareMergeBody"
        style={{ '--editor-split-ratio': `${ratio}%` }}
        onFocusCapture={(event) => activateFromTarget(event.target)}
        onPointerDownCapture={(event) => activateFromTarget(event.target)}
      >
        <Box ref={hostRef} className="compareMergeHost" />
        <CompareSeparator
          hostRef={hostRef}
          ratio={ratio}
          onRatioChange={onRatioChange}
        />
      </Box>
      {mainSession.searchReplace.panelPortal}
      {subSession.searchReplace.panelPortal}
    </Box>
  )
}

function CompactUnifiedCompare({
  isDark,
  mainSession,
  subSession,
}: {
  isDark: boolean
  mainSession: EditorSession
  subSession: EditorSession
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const syntaxCompartment = useRef(new Compartment()).current
  const themeCompartment = useRef(new Compartment()).current
  const mergeCompartment = useRef(new Compartment()).current
  const [stats, setStats] = useState<CompareStats | null>(null)

  function refreshStats(view: EditorView | null = viewRef.current) {
    const chunks = view ? (getChunks(view.state)?.chunks ?? []) : []
    setStats({
      approximate: chunks.some((chunk) => !chunk.precise),
      chunkCount: chunks.length,
    })
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const view = new EditorView({
      doc: subSession.value,
      extensions: [
        themeCompartment.of(getReadOnlyExtensions(isDark)),
        syntaxCompartment.of(subSession.editorExtensions),
        mergeCompartment.of(
          getUnifiedExtensions(
            mainSession.value,
            mainSession.syntaxMode === subSession.syntaxMode,
          ),
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) queueMicrotask(() => refreshStats(update.view))
        }),
      ],
      parent: host,
    })

    viewRef.current = view
    refreshStats(view)

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Unified mode owns a read-only view and updates it through compartments.
  }, [])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.reconfigure(getReadOnlyExtensions(isDark)),
    })
  }, [isDark, themeCompartment])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: syntaxCompartment.reconfigure(subSession.editorExtensions),
    })
  }, [subSession.editorExtensions, syntaxCompartment])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    view.dispatch({
      effects: mergeCompartment.reconfigure(
        getUnifiedExtensions(
          mainSession.value,
          mainSession.syntaxMode === subSession.syntaxMode,
        ),
      ),
    })
    queueMicrotask(() => refreshStats(view))
  }, [
    mainSession.syntaxMode,
    mainSession.value,
    mergeCompartment,
    subSession.syntaxMode,
  ])

  useEffect(() => {
    syncReadOnlyDocument(viewRef.current, subSession.value)
  }, [subSession.value])

  function navigate(direction: 'next' | 'previous') {
    const view = viewRef.current
    if (!view) return
    const command = direction === 'next' ? goToNextChunk : goToPreviousChunk
    command(view)
  }

  return (
    <Box className="compareWorkspace compareWorkspaceCompact">
      <CompareToolbar
        compact
        stats={stats}
        onNext={() => navigate('next')}
        onPrevious={() => navigate('previous')}
      />
      <Box ref={hostRef} className="compareUnifiedHost" />
    </Box>
  )
}

function CompareToolbar({
  compact,
  onNext,
  onPrevious,
  stats,
}: {
  compact: boolean
  onNext: () => void
  onPrevious: () => void
  stats: CompareStats | null
}) {
  const disabled = !stats || stats.chunkCount === 0
  const countLabel = !stats
    ? 'Comparing…'
    : stats.chunkCount === 0
      ? 'No differences'
      : `${stats.chunkCount} change block${stats.chunkCount === 1 ? '' : 's'}`

  return (
    <Group className="compareToolbar" justify="space-between" wrap="nowrap">
      <Box>
        <Text fw={700} size="sm">
          Left → Right
        </Text>
        <Text c="dimmed" size="xs">
          {compact ? 'Unified comparison · Read only' : 'Exact text comparison'}
        </Text>
      </Box>
      <Group gap={6} wrap="nowrap">
        <Badge
          color={stats?.chunkCount === 0 ? 'green' : 'blue'}
          variant="light"
        >
          {countLabel}
        </Badge>
        {stats?.approximate ? (
          <Badge color="yellow" variant="light">
            Approximate diff
          </Badge>
        ) : null}
        <Tooltip label="Previous change" withArrow>
          <ActionIcon
            aria-label="Previous diff change"
            color="dark"
            disabled={disabled}
            variant="subtle"
            onClick={onPrevious}
          >
            <ChevronUp size={17} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Next change" withArrow>
          <ActionIcon
            aria-label="Next diff change"
            color="dark"
            disabled={disabled}
            variant="subtle"
            onClick={onNext}
          >
            <ChevronDown size={17} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  )
}

function CompareSeparator({
  hostRef,
  onRatioChange,
  ratio,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>
  onRatioChange: (ratio: number) => void
  ratio: number
}) {
  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const host = hostRef.current
    if (!host || !event.currentTarget.hasPointerCapture(event.pointerId)) return

    const bounds = host.getBoundingClientRect()
    onRatioChange(
      clampSplitRatio(((event.clientX - bounds.left) / bounds.width) * 100),
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onRatioChange(clampSplitRatio(ratio - 5))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      onRatioChange(clampSplitRatio(ratio + 5))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onRatioChange(20)
    } else if (event.key === 'End') {
      event.preventDefault()
      onRatioChange(80)
    }
  }

  return (
    <Box
      aria-label="Resize diff panes"
      aria-orientation="vertical"
      aria-valuemax={80}
      aria-valuemin={20}
      aria-valuenow={Math.round(ratio)}
      className="compareSeparator"
      role="separator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        updateFromPointer(event)
      }}
      onPointerMove={updateFromPointer}
    />
  )
}

function getBaseExtensions(isDark: boolean, placeholder: string): Extension[] {
  return getDefaultExtensions({
    basicSetup: {
      bracketMatching: true,
      closeBrackets: true,
      foldGutter: true,
      highlightActiveLine: true,
      highlightActiveLineGutter: true,
      lineNumbers: true,
    },
    placeholder,
    theme: isDark ? oneDark : 'light',
  })
}

function getReadOnlyExtensions(isDark: boolean): Extension[] {
  return getDefaultExtensions({
    basicSetup: { foldGutter: true, lineNumbers: true },
    editable: false,
    readOnly: true,
    theme: isDark ? oneDark : 'light',
  })
}

function getUnifiedExtensions(original: string, sameSyntax: boolean) {
  return unifiedMergeView({
    allowInlineDiffs: true,
    collapseUnchanged: COLLAPSE_UNCHANGED,
    diffConfig: DIFF_CONFIG,
    gutter: true,
    highlightChanges: true,
    mergeControls: false,
    original,
    syntaxHighlightDeletions: sameSyntax,
  })
}

function syncDocument(
  view: EditorView | undefined,
  value: string,
  id: EditorId,
  syncingRef: React.MutableRefObject<EditorId | null>,
) {
  if (!view || view.state.doc.toString() === value) return

  syncingRef.current = id
  try {
    view.dispatch({
      annotations: Transaction.addToHistory.of(false),
      changes: { from: 0, insert: value, to: view.state.doc.length },
    })
  } finally {
    syncingRef.current = null
  }
}

function syncReadOnlyDocument(view: EditorView | null, value: string) {
  if (!view || view.state.doc.toString() === value) return

  view.dispatch({
    annotations: Transaction.addToHistory.of(false),
    changes: { from: 0, insert: value, to: view.state.doc.length },
  })
}
