import { linter, lintGutter } from '@codemirror/lint'
import type { LintSource } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import { EditorView, highlightWhitespace } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { notifications } from '@mantine/notifications'
import { useEffect, useRef, useState } from 'react'

import { getFormatDefinition } from './formats'
import { useSearchReplace } from './search/useSearchReplace'
import type { ReplaceSession } from './search/useSearchReplace'
import type { TextSample } from './samples'
import { DEFAULT_SQL_DIALECT, SQL_DIALECT_OPTIONS } from './sqlDialects'
import type { SqlDialect } from './sqlDialects'
import type { SyntaxMode, WorkbenchViewMode } from './types'
import { createSqlLintSource } from './utils/formatLinting'
import { validateFormat, validateSqlDialect } from './utils/formatValidation'
import type { FormatValidationResult } from './utils/formatValidation'
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
  initialSyntaxMode,
  initialValue,
  onManualChange,
  onReplaceCommit,
}: {
  id: EditorId
  initialSyntaxMode: SyntaxMode
  initialValue: string
  onManualChange?: () => void
  onReplaceCommit?: (session: ReplaceSession) => void
}) {
  const [value, setValue] = useState(initialValue)
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>(initialSyntaxMode)
  const [syntaxModalOpened, setSyntaxModalOpened] = useState(false)
  const [sampleModalOpened, setSampleModalOpened] = useState(false)
  const [encoding, setEncoding] = useState(DEFAULT_ENCODING_LABEL)
  const [encodingModalOpened, setEncodingModalOpened] = useState(false)
  const [goToLineModalOpened, setGoToLineModalOpened] = useState(false)
  const [softWrapEnabled, setSoftWrapEnabled] = useState(true)
  const [whitespaceVisible, setWhitespaceVisible] = useState(false)
  const [validationEnabled, setValidationEnabled] = useState(false)
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>(DEFAULT_SQL_DIALECT)
  const [viewMode, setViewMode] = useState<WorkbenchViewMode>('source')
  const [selectionRange, setSelectionRange] = useState({ from: 0, to: 0 })
  const [cursorOffset, setCursorOffset] = useState(0)
  const [editorExtensions, setEditorExtensions] = useState<Array<Extension>>([])
  const [validationResult, setValidationResult] =
    useState<FormatValidationResult | null>(null)
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const onManualChangeRef = useRef(onManualChange)

  onManualChangeRef.current = onManualChange

  const searchReplace = useSearchReplace({ editorRef, onReplaceCommit })
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

  useEffect(() => {
    let cancelled = false

    async function loadEditorExtensions() {
      const syntaxExtensions = await currentFormat.loadEditorExtensions()
      let lintSource: LintSource | null = null

      if (validationEnabled) {
        if (syntaxMode === 'sql') {
          lintSource = sqlDialect.parserDatabase
            ? createSqlLintSource(sqlDialect.parserDatabase)
            : null
        } else if (currentFormat.loadLintSource) {
          lintSource = await currentFormat.loadLintSource()
        }
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
    if (!(validationEnabled && currentFormat.validation === 'supported')) {
      setValidationResult(null)
      return
    }

    let cancelled = false
    const validation =
      syntaxMode === 'sql'
        ? validateSqlDialect(value, sqlDialect.parserDatabase)
        : validateFormat(value, syntaxMode)

    void validation.then((result) => {
      if (!cancelled) setValidationResult(result)
    })

    return () => {
      cancelled = true
    }
  }, [
    currentFormat.validation,
    sqlDialect,
    syntaxMode,
    validationEnabled,
    value,
  ])

  function updateValue(nextValue: string) {
    setValue(nextValue)
    onManualChangeRef.current?.()
  }

  function updateStatistics(statistics: {
    selectionAsSingle: { from: number; head: number; to: number }
  }) {
    const { from, head, to } = statistics.selectionAsSingle
    setSelectionRange((current) =>
      current.from === from && current.to === to ? current : { from, to },
    )
    setCursorOffset((current) => (current === head ? current : head))
  }

  async function copyText() {
    try {
      const view = editorRef.current?.view
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
      const view = editorRef.current?.view
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
      notifications.show({
        color: 'red',
        message: 'Clipboard access is not available in this browser context.',
        title: 'Paste failed',
      })
    }
  }

  function chooseSyntax(nextSyntaxMode: SyntaxMode) {
    if (nextSyntaxMode !== syntaxMode) onManualChangeRef.current?.()
    setSyntaxMode(nextSyntaxMode)
    if (getFormatDefinition(nextSyntaxMode).viewIds.length === 0) {
      setViewMode('source')
    }
    setSyntaxModalOpened(false)
  }

  function loadSample(sample: TextSample) {
    onManualChangeRef.current?.()
    setValue(sample.value)
    setSyntaxMode(sample.syntaxMode)
    setSampleModalOpened(false)
    setViewMode('source')
    notifications.show({
      color: 'blue',
      message: `${sample.label} is now loaded in the ${id === 'main' ? 'main' : 'sub'} editor.`,
      title: 'Sample loaded',
    })
  }

  function goToLineColumn(line: number, column: number) {
    setViewMode('source')
    const offset = getOffsetForLineAndColumn(value, line, column)
    const view = editorRef.current?.view

    if (view) {
      view.dispatch({ selection: { anchor: offset }, scrollIntoView: true })
      view.focus()
    }

    setCursorOffset(offset)
    setSelectionRange({ from: offset, to: offset })
    setGoToLineModalOpened(false)
  }

  return {
    charCount,
    chooseSyntax,
    copyText,
    currentFormat,
    cursorPosition,
    editorExtensions,
    editorRef,
    encoding,
    encodingModalOpened,
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
    selectionStats,
    setEncoding,
    setEncodingModalOpened,
    setGoToLineModalOpened,
    setSampleModalOpened,
    setSoftWrapEnabled,
    setSqlDialect,
    setSyntaxModalOpened,
    setSyntaxMode,
    setValidationEnabled,
    setValue,
    setViewMode,
    setWhitespaceVisible,
    softWrapEnabled,
    sqlDialect,
    sqlDialectOptions: SQL_DIALECT_OPTIONS,
    syntaxModalOpened,
    syntaxMode,
    updateStatistics,
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
