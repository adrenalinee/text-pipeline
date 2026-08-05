import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'
import {
  Braces,
  Check,
  Code2,
  FileJson,
  FileText,
  KeyRound,
  Share2,
} from 'lucide-react'
import { useState } from 'react'
import type { KeyboardEvent } from 'react'

import { FORMAT_DEFINITIONS, FORMAT_OPTIONS, FORMAT_VIEWS } from '../formats'
import { getStatusBarPlacement } from '../editorViewLayout'
import { TEXT_SAMPLES } from '../samples'
import type { TextSample } from '../samples'
import type { SyntaxMode } from '../types'
import { ENCODING_OPTIONS } from '../useEditorSession'
import type { EditorSession } from '../useEditorSession'
import { FormatViewPanel } from '../views/FormatViewPanel'
import { EditorToolbar } from './EditorToolbar'
import { StatusBar } from './StatusBar'

type EditorToolbarShortcutActions = {
  canCommit: boolean
  canToggleView: boolean
  commit?: () => void
  toggleSoftWrap: () => void
  toggleView: () => void
  toggleWhitespace: () => void
}

type EditorToolbarShortcutEvent = Pick<
  KeyboardEvent,
  | 'altKey'
  | 'code'
  | 'ctrlKey'
  | 'metaKey'
  | 'preventDefault'
  | 'shiftKey'
  | 'target'
>

function isStandaloneTextInput(target: EventTarget | null) {
  if (!(target instanceof Element) || target.closest('.cm-content')) {
    return false
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    ),
  )
}

export function handleEditorToolbarShortcut(
  event: EditorToolbarShortcutEvent,
  actions: EditorToolbarShortcutActions,
) {
  if (isStandaloneTextInput(event.target)) return false

  const modifier = event.ctrlKey || event.metaKey
  const plainModifier = modifier && !event.altKey && !event.shiftKey
  let action: (() => void) | undefined

  if (
    modifier &&
    event.shiftKey &&
    !event.altKey &&
    event.code === 'KeyE' &&
    actions.canToggleView
  ) {
    action = actions.toggleView
  }
  if (modifier && event.altKey && !event.shiftKey && event.code === 'KeyW') {
    action = actions.toggleWhitespace
  }
  if (event.altKey && !modifier && !event.shiftKey && event.code === 'KeyZ') {
    action = actions.toggleSoftWrap
  }
  if (
    plainModifier &&
    event.code === 'KeyS' &&
    actions.canCommit &&
    actions.commit
  ) {
    action = actions.commit
  }

  if (!action) return false

  event.preventDefault()
  action()
  return true
}

export function EditorPane({
  allowCommit,
  canCommitWorkingText,
  compact,
  // editorTitle,
  isActive,
  isDark,
  onActivate,
  onCommitWorkingText,
  session,
}: {
  allowCommit: boolean
  canCommitWorkingText: boolean
  compact: boolean
  // editorTitle: string
  isActive: boolean
  isDark: boolean
  onActivate: () => void
  onCommitWorkingText?: () => void
  session: EditorSession
}) {
  const activeViewMode = session.viewMode
  const statusBarPlacement = getStatusBarPlacement({
    compact,
    sourceViewEnabled: session.sourceViewEnabled,
    viewMode: activeViewMode,
  })
  const showSourceAlongsideView = statusBarPlacement === 'sourceColumn'

  return (
    <Box
      className="editorPane"
      data-active={isActive || undefined}
      data-editor-id={session.id}
      onFocusCapture={onActivate}
      onKeyDownCapture={(event) => {
        if (!isActive) return

        handleEditorToolbarShortcut(event, {
          canCommit: allowCommit && canCommitWorkingText,
          canToggleView: session.viewAvailable,
          commit: onCommitWorkingText,
          toggleSoftWrap: () =>
            session.setSoftWrapEnabled((enabled) => !enabled),
          toggleView: () =>
            session.setViewMode(
              session.viewMode === 'view' ? 'source' : 'view',
            ),
          toggleWhitespace: () =>
            session.setWhitespaceVisible((visible) => !visible),
        })
      }}
      onPointerDownCapture={onActivate}
    >
      <EditorDialogs session={session} />
      <Box className="editorPanel">
        <EditorPaneHeader
          activeViewMode={activeViewMode}
          allowCommit={allowCommit}
          canCommitWorkingText={canCommitWorkingText}
          isActive={isActive}
          session={session}
          showStatusBar={statusBarPlacement === 'header'}
          onCommitWorkingText={onCommitWorkingText}
        />
        <Box
          className="editorContent"
          data-source-view={showSourceAlongsideView || undefined}
        >
          {activeViewMode === 'source' || showSourceAlongsideView ? (
            <Box className="editorSourceColumn">
              {statusBarPlacement === 'sourceColumn' ? (
                <Box className="editorSourceColumnHeader">
                  <SessionStatusBar session={session} />
                </Box>
              ) : null}
              <SourceEditor isDark={isDark} session={session} />
            </Box>
          ) : null}
          {activeViewMode === 'view' ? (
            <FormatViewPanel
              format={session.currentFormat}
              sourceViewAvailable={!compact}
              sourceViewVisible={showSourceAlongsideView}
              value={session.value}
              views={FORMAT_VIEWS}
              onToggleSourceView={() =>
                session.setSourceViewEnabled((enabled) => !enabled)
              }
            />
          ) : null}
        </Box>
        {session.searchReplace.panelPortal}
      </Box>
    </Box>
  )
}

function SourceEditor({
  isDark,
  session,
}: {
  isDark: boolean
  session: EditorSession
}) {
  return (
    <CodeMirror
      ref={session.editorRef}
      aria-label={
        session.id === 'main' ? 'Text editor' : 'Secondary text editor'
      }
      className={[
        session.softWrapEnabled ? 'codeEditor' : 'codeEditor codeEditorNoWrap',
        session.searchReplace.editorProps.className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={session.searchReplace.editorProps.style}
      basicSetup={{
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        lineNumbers: true,
      }}
      extensions={session.editorExtensions}
      height="100%"
      placeholder="any text here"
      theme={isDark ? oneDark : 'light'}
      value={session.value}
      onCreateEditor={session.bindEditorView}
      onChange={session.updateValue}
      onUpdate={session.updateEditorView}
    />
  )
}

export function EditorPaneHeader({
  activeViewMode,
  allowCommit,
  canCommitWorkingText,
  isActive,
  onCommitWorkingText,
  session,
  showStatusBar = true,
  viewDisabledReason,
}: {
  activeViewMode: 'source' | 'view'
  allowCommit: boolean
  canCommitWorkingText: boolean
  isActive: boolean
  onCommitWorkingText?: () => void
  session: EditorSession
  showStatusBar?: boolean
  viewDisabledReason?: string
}) {
  return (
    <>
      <EditorToolbar
        activeViewMode={activeViewMode}
        canCommitWorkingText={canCommitWorkingText}
        isActive={isActive}
        searchPanelOpen={session.searchReplace.isOpen}
        showCommit={allowCommit}
        softWrapEnabled={session.softWrapEnabled}
        viewAvailable={session.viewAvailable && !viewDisabledReason}
        viewDisabledReason={viewDisabledReason}
        whitespaceVisible={session.whitespaceVisible}
        onCommitWorkingText={onCommitWorkingText}
        onCopyText={() => void session.copyText()}
        onOpenSamples={() => session.setSampleModalOpened(true)}
        onOpenSearch={() =>
          session.searchReplace.isOpen
            ? session.searchReplace.closePanel()
            : session.searchReplace.openPanel('search')
        }
        onPasteText={() => void session.pasteText()}
        onSetViewMode={session.setViewMode}
        onToggleSoftWrap={() =>
          session.setSoftWrapEnabled((enabled) => !enabled)
        }
        onToggleWhitespace={() =>
          session.setWhitespaceVisible((visible) => !visible)
        }
      />
      {showStatusBar ? <SessionStatusBar session={session} /> : null}
    </>
  )
}

/** Wires a session to the status bar so every placement reads the same state. */
function SessionStatusBar({ session }: { session: EditorSession }) {
  return (
    <StatusBar
      charCount={session.charCount}
      cursor={session.cursorPosition}
      encoding={session.encoding}
      formatLabel={session.currentFormat.label}
      lineCount={session.lineCount}
      selection={session.selectionStats}
      sqlDialectId={
        session.syntaxMode === 'sql' ? session.sqlDialect.id : undefined
      }
      sqlDialectOptions={
        session.syntaxMode === 'sql'
          ? session.sqlDialectOptions.map((dialect) => ({
              label: dialect.label,
              value: dialect.id,
            }))
          : undefined
      }
      validationEnabled={session.validationEnabled}
      validationAvailable={session.currentFormat.validation === 'supported'}
      validationResult={session.validationResult}
      onChooseSqlDialect={(id) => {
        const dialect = session.sqlDialectOptions.find(
          (option) => option.id === id,
        )
        if (dialect) session.setSqlDialect(dialect)
      }}
      onChooseEncoding={() => session.setEncodingModalOpened(true)}
      onChooseSyntax={() => session.setSyntaxModalOpened(true)}
      onGoToLine={() => session.setGoToLineModalOpened(true)}
      onToggleValidation={() =>
        session.setValidationEnabled((enabled) => !enabled)
      }
    />
  )
}

export function EditorDialogs({ session }: { session: EditorSession }) {
  return (
    <>
      <Modal
        centered
        opened={session.syntaxModalOpened}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="sm"
        title="Text format"
        onClose={() => session.setSyntaxModalOpened(false)}
      >
        <Stack gap="xs">
          {FORMAT_OPTIONS.map((option) => (
            <SyntaxOptionButton
              active={session.syntaxMode === option.id}
              description={option.description}
              key={option.id}
              label={option.label}
              value={option.id}
              onClick={() => session.chooseSyntax(option.id)}
            />
          ))}
        </Stack>
      </Modal>
      <Modal
        centered
        opened={session.sampleModalOpened}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="lg"
        title="Sample data"
        onClose={() => session.setSampleModalOpened(false)}
      >
        <Stack gap="xs">
          {TEXT_SAMPLES.map((sample) => (
            <SampleOptionButton
              key={sample.id}
              sample={sample}
              onClick={() => session.loadSample(sample)}
            />
          ))}
        </Stack>
      </Modal>
      <Modal
        centered
        opened={session.goToLineModalOpened}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="sm"
        title="Go to line"
        onClose={() => session.setGoToLineModalOpened(false)}
      >
        {session.goToLineModalOpened ? (
          <GoToLineForm
            currentColumn={session.cursorPosition.column}
            currentLine={session.cursorPosition.line}
            maxLine={Math.max(1, session.lineCount)}
            onCancel={() => session.setGoToLineModalOpened(false)}
            onSubmit={session.goToLineColumn}
          />
        ) : null}
      </Modal>
      <Modal
        centered
        opened={session.encodingModalOpened}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="sm"
        title="Encoding"
        onClose={() => session.setEncodingModalOpened(false)}
      >
        <Stack gap="xs">
          <Text c="dimmed" size="xs">
            Text is held in memory as Unicode. This sets the encoding label used
            when reading or writing the source.
          </Text>
          {ENCODING_OPTIONS.map((option) => (
            <OptionButton
              active={session.encoding === option.label}
              description={option.description}
              key={option.label}
              label={option.label}
              onClick={() => {
                session.setEncoding(option.label)
                session.setEncodingModalOpened(false)
              }}
            />
          ))}
        </Stack>
      </Modal>
    </>
  )
}

function SampleOptionButton({
  onClick,
  sample,
}: {
  onClick: () => void
  sample: TextSample
}) {
  return (
    <button
      aria-label={`Load ${sample.label}`}
      className="syntaxOption sampleOption"
      type="button"
      onClick={onClick}
    >
      <Group className="syntaxOptionMain" gap="sm" wrap="nowrap">
        <SyntaxIcon value={sample.syntaxMode} />
        <Box className="syntaxOptionText">
          <Group gap="xs" wrap="nowrap">
            <Text fw={650} size="sm">
              {sample.label}
            </Text>
            <Badge className="sampleFormatBadge" size="xs" variant="light">
              {FORMAT_DEFINITIONS[sample.syntaxMode].label}
            </Badge>
          </Group>
          <Text c="dimmed" size="xs">
            {sample.description}
          </Text>
        </Box>
      </Group>
    </button>
  )
}

function GoToLineForm({
  currentColumn,
  currentLine,
  maxLine,
  onCancel,
  onSubmit,
}: {
  currentColumn: number
  currentLine: number
  maxLine: number
  onCancel: () => void
  onSubmit: (line: number, column: number) => void
}) {
  const [line, setLine] = useState<number | string>(currentLine)
  const [column, setColumn] = useState<number | string>(currentColumn)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(Number(line) || 1, Number(column) || 1)
      }}
    >
      <Stack gap="md">
        <Text c="dimmed" size="xs">
          Jump the cursor to a location. Line 1&ndash;{maxLine}.
        </Text>
        <Group gap="sm" grow wrap="nowrap">
          <NumberInput
            allowDecimal={false}
            data-autofocus
            label="Line"
            max={maxLine}
            min={1}
            value={line}
            onChange={setLine}
          />
          <NumberInput
            allowDecimal={false}
            label="Column"
            min={1}
            value={column}
            onChange={setColumn}
          />
        </Group>
        <Group justify="flex-end" gap="xs" wrap="nowrap">
          <Button type="button" variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Go to location</Button>
        </Group>
      </Stack>
    </form>
  )
}

function OptionButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean
  description: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className="syntaxOption"
      data-selected={active || undefined}
      type="button"
      onClick={onClick}
    >
      <Box className="syntaxOptionText">
        <Text fw={650} size="sm">
          {label}
        </Text>
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      </Box>
      {active ? <Check size={16} /> : null}
    </button>
  )
}

function SyntaxOptionButton({
  active,
  description,
  label,
  onClick,
  value,
}: {
  active: boolean
  description: string
  label: string
  onClick: () => void
  value: SyntaxMode
}) {
  return (
    <button
      aria-pressed={active}
      className="syntaxOption"
      data-selected={active || undefined}
      type="button"
      onClick={onClick}
    >
      <Group className="syntaxOptionMain" gap="sm" wrap="nowrap">
        <SyntaxIcon value={value} />
        <Box className="syntaxOptionText">
          <Text fw={650} size="sm">
            {label}
          </Text>
          <Text c="dimmed" size="xs">
            {description}
          </Text>
        </Box>
      </Group>
      {active ? <Check size={16} /> : null}
    </button>
  )
}

function SyntaxIcon({ value }: { value: SyntaxMode }) {
  if (value === 'json') return <Braces size={18} />
  if (value === 'jwt') return <KeyRound size={18} />
  if (value === 'ndjson') return <FileJson size={18} />
  if (value === 'graphql') return <Share2 size={18} />
  if (value === 'yaml' || value === 'xml' || value === 'sql') {
    return <Code2 size={18} />
  }
  return <FileText size={18} />
}
