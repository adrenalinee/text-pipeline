import { linter, lintGutter } from '@codemirror/lint'
import type { LintSource } from '@codemirror/lint'
import { Transaction } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, highlightWhitespace } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'
import { notifications } from '@mantine/notifications'
import { useEffect, useRef, useState } from 'react'

import { getFormatDefinition } from './formats'
import { useSearchReplace } from './search/useSearchReplace'
import type { ReplaceSession } from './search/useSearchReplace'
import type { TextSample } from './samples'
import {
  DEFAULT_SQL_DIALECT,
  getSqlDialect,
  SQL_DIALECT_OPTIONS,
} from './sqlDialects'
import type { SqlDialect, SqlDialectId } from './sqlDialects'
import type {
  FormatSelectionState,
  FormatValidationResult,
  SyntaxMode,
  WorkbenchViewMode,
} from './types'
import {
  detectFormat,
  FORMAT_DETECTION_DEBOUNCE_MS,
} from './utils/formatDetection'
import {
  createClipboardPasteEdit,
  getTextForClipboard,
} from './utils/editorClipboard'
import {
  countLines,
  getLineAndColumn,
  getOffsetForLineAndColumn,
  getSelectionStats,
} from './utils/textMetrics'

export type EditorId = 'main' | 'sub'

export const DEFAULT_ENCODING_LABEL = 'UTF-8'

export type FormatDetectionStatus =
  | 'detected'
  | 'detecting'
  | 'idle'
  | 'too-large'
  | 'undetermined'

export type EditorSessionInitialState = {
  encoding: string
  formatSelection: FormatSelectionState
  scroll: { left: number; top: number }
  selection: { anchor: number; head: number }
  softWrapEnabled: boolean
  sourceViewEnabled: boolean
  sqlDialectId: SqlDialectId
  syntaxMode: SyntaxMode
  validationEnabled: boolean
  value: string
  viewMode: WorkbenchViewMode
  whitespaceVisible: boolean
}

export const ENCODING_OPTIONS: Array<{
  description: string
  label: string
}> = [
  { description: 'Unicode, variable width (default)', label: 'UTF-8' },
  { description: 'Unicode, little-endian 16-bit', label: 'UTF-16 LE' },
  { description: 'Unicode, big-endian 16-bit', label: 'UTF-16 BE' },
  { description: '7-bit US-ASCII', label: 'US-ASCII' },
  { description: 'Latin-1, Western European', label: 'ISO-8859-1' },
  { description: 'Windows Western European', label: 'Windows-1252' },
]

export function useEditorSession({
  id,
  initialState,
  initialSyntaxMode,
  initialValue,
  onBeforeSampleLoad,
  onManualChange,
  onReplaceCommit,
}: {
  id: EditorId
  initialState?: EditorSessionInitialState
  initialSyntaxMode: SyntaxMode
  initialValue: string
  onBeforeSampleLoad?: (sample: TextSample) => void
  onManualChange?: () => void
  onReplaceCommit?: (session: ReplaceSession) => void
}) {
  const startingValue = initialState?.value ?? initialValue
  const startingSelection = clampSelection(
    initialState?.selection ?? { anchor: 0, head: 0 },
    startingValue.length,
  )
  const [value, setValue] = useState(startingValue)
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>(
    initialState?.syntaxMode ?? initialSyntaxMode,
  )
  const [formatSelection, setFormatSelection] = useState<FormatSelectionState>(
    initialState?.formatSelection ?? { mode: 'auto' },
  )
  const [formatDetectionStatus, setFormatDetectionStatus] =
    useState<FormatDetectionStatus>(
      initialState?.formatSelection.mode === 'locked' &&
        initialState.formatSelection.origin === 'detected'
        ? 'detected'
        : 'idle',
    )
  const [syntaxModalOpened, setSyntaxModalOpened] = useState(false)
  const [sampleModalOpened, setSampleModalOpened] = useState(false)
  const [encoding, setEncoding] = useState(
    initialState?.encoding ?? DEFAULT_ENCODING_LABEL,
  )
  const [encodingModalOpened, setEncodingModalOpened] = useState(false)
  const [goToLineModalOpened, setGoToLineModalOpened] = useState(false)
  const [softWrapEnabled, setSoftWrapEnabled] = useState(
    initialState?.softWrapEnabled ?? true,
  )
  const [whitespaceVisible, setWhitespaceVisible] = useState(
    initialState?.whitespaceVisible ?? false,
  )
  const [validationEnabled, setValidationEnabled] = useState(
    initialState?.validationEnabled ?? false,
  )
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>(() =>
    initialState
      ? getSqlDialect(initialState.sqlDialectId)
      : DEFAULT_SQL_DIALECT,
  )
  const [viewMode, setViewModeState] = useState<WorkbenchViewMode>(
    initialState?.viewMode ?? 'source',
  )
  const [sourceViewEnabled, setSourceViewEnabled] = useState(
    initialState?.sourceViewEnabled ?? true,
  )
  const [selectionRange, setSelectionRange] = useState({
    from: Math.min(startingSelection.anchor, startingSelection.head),
    to: Math.max(startingSelection.anchor, startingSelection.head),
  })
  const [selectionAnchor, setSelectionAnchor] = useState(
    startingSelection.anchor,
  )
  const [cursorOffset, setCursorOffset] = useState(startingSelection.head)
  const [scrollPosition, setScrollPosition] = useState(
    initialState?.scroll ?? { left: 0, top: 0 },
  )
  const [editorExtensions, setEditorExtensions] = useState<Array<Extension>>([])
  const [validationResult, setValidationResult] =
    useState<FormatValidationResult | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const onBeforeSampleLoadRef = useRef(onBeforeSampleLoad)
  const onManualChangeRef = useRef(onManualChange)
  const detectionRequestRef = useRef(0)
  const scrollListenerRef = useRef<(() => void) | null>(null)
  const scrollViewRef = useRef<EditorView | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const selectionRef = useRef(startingSelection)
  const scrollPositionRef = useRef(scrollPosition)

  onBeforeSampleLoadRef.current = onBeforeSampleLoad
  onManualChangeRef.current = onManualChange
  selectionRef.current = { anchor: selectionAnchor, head: cursorOffset }
  scrollPositionRef.current = scrollPosition

  const searchReplace = useSearchReplace({ editorViewRef, onReplaceCommit })
  const currentFormat = getFormatDefinition(syntaxMode)
  const viewAvailable = currentFormat.viewIds.length > 0
  const hasEditorSelection =
    viewMode === 'source' && selectionRange.from !== selectionRange.to
  const lineCount = countLines(value)
  const charCount = value.length
  const cursorPosition = getLineAndColumn(value, cursorOffset)
  const selectionStats = hasEditorSelection
    ? getSelectionStats(value, selectionRange.from, selectionRange.to)
    : null

  useEffect(
    () => () => {
      detachScrollListener()
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function loadEditorExtensions() {
      const syntaxExtensions = await currentFormat.loadEditorExtensions()
      let lintSource: LintSource | null = null

      if (validationEnabled && currentFormat.validation) {
        lintSource = await currentFormat.validation.loadLintSource({
          sqlParserDatabase:
            syntaxMode === 'sql' ? sqlDialect.parserDatabase : undefined,
        })
      }

      if (cancelled) return

      setEditorExtensions([
        ...syntaxExtensions,
        ...(lintSource
          ? [lintGutter(), linter(lintSource, { delay: 250 })]
          : []),
        ...(whitespaceVisible ? [highlightWhitespace()] : []),
        ...(softWrapEnabled ? [EditorView.lineWrapping] : []),
        ...searchReplace.extensions,
      ])
    }

    void loadEditorExtensions()

    return () => {
      cancelled = true
    }
  }, [
    currentFormat,
    searchReplace.extensions,
    softWrapEnabled,
    sqlDialect,
    syntaxMode,
    validationEnabled,
    whitespaceVisible,
  ])

  useEffect(() => {
    if (!(validationEnabled && currentFormat.validation)) {
      setValidationResult(null)
      return
    }

    let cancelled = false
    const validation = currentFormat.validation.validate(value, {
      sqlParserDatabase:
        syntaxMode === 'sql' ? sqlDialect.parserDatabase : undefined,
    })

    void validation.then((result) => {
      if (!cancelled) setValidationResult(result)
    })

    return () => {
      cancelled = true
    }
  }, [currentFormat, sqlDialect, syntaxMode, validationEnabled, value])

  useEffect(() => {
    if (formatSelection.mode !== 'auto') return

    const requestId = detectionRequestRef.current + 1
    detectionRequestRef.current = requestId

    if (value.trim().length === 0) {
      setSyntaxMode('plain')
      setFormatDetectionStatus('idle')
      return
    }

    setFormatDetectionStatus('detecting')
    const timeout = window.setTimeout(() => {
      void detectFormat(value).then((attempt) => {
        if (detectionRequestRef.current !== requestId) return

        if (attempt.status === 'detected') {
          setSyntaxMode(attempt.result.format)
          setFormatSelection({
            mode: 'locked',
            origin: 'detected',
            result: attempt.result,
          })
          setFormatDetectionStatus('detected')
          return
        }

        setSyntaxMode('plain')
        setFormatDetectionStatus(
          attempt.status === 'too-large' ? 'too-large' : 'undetermined',
        )
      })
    }, FORMAT_DETECTION_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
      if (detectionRequestRef.current === requestId) {
        detectionRequestRef.current += 1
      }
    }
  }, [formatSelection, value])

  function updateValue(nextValue: string) {
    setValue(nextValue)
    onManualChangeRef.current?.()
  }

  function updateStatistics(statistics: {
    selectionAsSingle: { from: number; head: number; to: number }
  }) {
    const { from, head, to } = statistics.selectionAsSingle
    const anchor = head === from ? to : from
    setSelectionRange((current) =>
      current.from === from && current.to === to ? current : { from, to },
    )
    setCursorOffset((current) => (current === head ? current : head))
    setSelectionAnchor((current) => (current === anchor ? current : anchor))
  }

  function bindEditorView(view: EditorView | null) {
    detachScrollListener()
    editorViewRef.current = view

    if (view) {
      const selection = clampSelection(
        selectionRef.current,
        view.state.doc.length,
      )
      if (
        view.state.selection.main.anchor !== selection.anchor ||
        view.state.selection.main.head !== selection.head
      ) {
        view.dispatch({
          annotations: Transaction.addToHistory.of(false),
          selection,
        })
      }
      updateStatisticsFromView(view)
      attachScrollListener(view)
      window.requestAnimationFrame(() => {
        if (editorViewRef.current !== view) return
        view.scrollDOM.scrollLeft = scrollPositionRef.current.left
        view.scrollDOM.scrollTop = scrollPositionRef.current.top
        view.requestMeasure()
      })
    }
  }

  function attachScrollListener(view: EditorView) {
    const listener = () => {
      if (scrollFrameRef.current !== null) return
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null
        if (editorViewRef.current !== view) return
        setScrollPosition({
          left: view.scrollDOM.scrollLeft,
          top: view.scrollDOM.scrollTop,
        })
      })
    }

    scrollViewRef.current = view
    scrollListenerRef.current = listener
    view.scrollDOM.addEventListener('scroll', listener, { passive: true })
  }

  function detachScrollListener() {
    if (scrollViewRef.current && scrollListenerRef.current) {
      scrollViewRef.current.scrollDOM.removeEventListener(
        'scroll',
        scrollListenerRef.current,
      )
    }
    scrollViewRef.current = null
    scrollListenerRef.current = null
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current)
      scrollFrameRef.current = null
    }
  }

  function updateEditorView(update: ViewUpdate) {
    editorViewRef.current = update.view

    if (update.selectionSet || update.docChanged) {
      updateStatisticsFromView(update.view)
    }
  }

  function updateStatisticsFromView(view: EditorView) {
    const { from, head, to } = view.state.selection.main

    updateStatistics({ selectionAsSingle: { from, head, to } })
  }

  async function copyText() {
    try {
      const view = editorViewRef.current
      const documentText = view?.state.doc.toString() ?? value
      const selection =
        view?.state.selection.main ??
        (hasEditorSelection ? selectionRange : { from: 0, to: 0 })
      const hasSelection = selection.from !== selection.to
      const text = getTextForClipboard(documentText, selection)

      await navigator.clipboard.writeText(text)
      notifications.show({
        color: 'green',
        message: hasSelection
          ? 'Selected text copied to clipboard.'
          : 'Editor text copied to clipboard.',
        title: 'Copied',
      })
    } catch {
      notifications.show({
        color: 'red',
        message: 'Clipboard access is not available in this browser context.',
        title: 'Copy failed',
      })
    }
  }

  async function pasteText() {
    try {
      const view = editorViewRef.current
      if (!view) throw new Error('Source editor unavailable')

      const text = await navigator.clipboard.readText()
      const { from, to } = view.state.selection.main
      const edit = createClipboardPasteEdit({ from, to }, text)

      view.dispatch({
        changes: edit.changes,
        scrollIntoView: true,
        selection: { anchor: edit.cursor },
      })
      view.focus()

      notifications.show({
        color: 'green',
        message:
          from === to
            ? 'Clipboard text inserted at the cursor.'
            : 'Selected text replaced with clipboard text.',
        title: 'Pasted',
      })
    } catch {
      editorViewRef.current?.focus()
      notifications.show({
        color: 'red',
        message:
          'Browser clipboard access was blocked. Focus the editor and press Ctrl+V instead.',
        title: 'Paste failed',
      })
    }
  }

  function setViewMode(nextViewMode: WorkbenchViewMode) {
    if (nextViewMode === 'view') {
      searchReplace.closePanel()
      setSourceViewEnabled(true)
    }
    setViewModeState(nextViewMode)
  }

  function chooseSyntax(nextSyntaxMode: SyntaxMode) {
    setSyntaxMode(nextSyntaxMode)
    setFormatSelection({ mode: 'locked', origin: 'manual' })
    setFormatDetectionStatus('idle')
    if (getFormatDefinition(nextSyntaxMode).viewIds.length === 0) {
      setViewModeState('source')
    }
    setSyntaxModalOpened(false)
  }

  function enableAutoDetection() {
    setSyntaxMode('plain')
    setFormatSelection({ mode: 'auto' })
    setFormatDetectionStatus('idle')
    setViewModeState('source')
    setSyntaxModalOpened(false)
  }

  function setKnownSyntaxMode(nextSyntaxMode: SyntaxMode) {
    setSyntaxMode(nextSyntaxMode)
    setFormatSelection({ mode: 'locked', origin: 'known' })
    setFormatDetectionStatus('idle')
    if (getFormatDefinition(nextSyntaxMode).viewIds.length === 0) {
      setViewModeState('source')
    }
  }

  function loadSample(sample: TextSample) {
    onBeforeSampleLoadRef.current?.(sample)
    onManualChangeRef.current?.()
    setValue(sample.value)
    setKnownSyntaxMode(sample.syntaxMode)
    setSampleModalOpened(false)
    setViewModeState('source')
    notifications.show({
      color: 'blue',
      message: `${sample.label} is now loaded in the ${id === 'main' ? 'main' : 'sub'} editor.`,
      title: 'Sample loaded',
    })
  }

  function goToLineColumn(line: number, column: number) {
    setViewModeState('source')
    const offset = getOffsetForLineAndColumn(value, line, column)
    const view = editorViewRef.current

    if (view) {
      view.dispatch({ selection: { anchor: offset }, scrollIntoView: true })
      view.focus()
    }

    setCursorOffset(offset)
    setSelectionAnchor(offset)
    setSelectionRange({ from: offset, to: offset })
    setGoToLineModalOpened(false)
  }

  return {
    bindEditorView,
    charCount,
    chooseSyntax,
    copyText,
    currentFormat,
    cursorPosition,
    enableAutoDetection,
    editorExtensions,
    editorViewRef,
    encoding,
    encodingModalOpened,
    formatDetectionStatus,
    formatSelection,
    goToLineColumn,
    goToLineModalOpened,
    hasEditorSelection,
    id,
    lineCount,
    loadSample,
    pasteText,
    sampleModalOpened,
    searchReplace,
    selectionRange,
    selection: { anchor: selectionAnchor, head: cursorOffset },
    selectionStats,
    setEncoding,
    setEncodingModalOpened,
    setGoToLineModalOpened,
    setSampleModalOpened,
    setSoftWrapEnabled,
    setSourceViewEnabled,
    setSqlDialect,
    setSyntaxModalOpened,
    setKnownSyntaxMode,
    setValidationEnabled,
    setValue,
    setViewMode,
    setWhitespaceVisible,
    softWrapEnabled,
    scrollPosition,
    sourceViewEnabled,
    sqlDialect,
    sqlDialectOptions: SQL_DIALECT_OPTIONS,
    syntaxModalOpened,
    syntaxMode,
    updateStatistics,
    updateEditorView,
    updateValue,
    validationEnabled,
    validationResult,
    value,
    viewAvailable,
    viewMode,
    whitespaceVisible,
  }
}

export type EditorSession = ReturnType<typeof useEditorSession>

function clampSelection(
  selection: { anchor: number; head: number },
  length: number,
) {
  return {
    anchor: Math.min(length, Math.max(0, selection.anchor)),
    head: Math.min(length, Math.max(0, selection.head)),
  }
}
