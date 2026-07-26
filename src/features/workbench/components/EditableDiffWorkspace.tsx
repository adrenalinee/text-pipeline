import { Box } from '@mantine/core'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirrorMerge from 'react-codemirror-merge'
import type { CodeMirrorMergeRef } from 'react-codemirror-merge'
import { useEffect, useRef } from 'react'

import type { EditorSession } from '../useEditorSession'
import {
  EditorDialogs,
  EditorPaneHeader,
} from './EditorPane'

const Original = CodeMirrorMerge.Original
const Modified = CodeMirrorMerge.Modified

export function EditableDiffWorkspace({
  activeEditorId,
  canCommitWorkingText,
  isDark,
  mainSession,
  subSession,
  onActivate,
  onCommitWorkingText,
}: {
  activeEditorId: 'main' | 'sub'
  canCommitWorkingText: boolean
  isDark: boolean
  mainSession: EditorSession
  subSession: EditorSession
  onActivate: (id: 'main' | 'sub') => void
  onCommitWorkingText: () => void
}) {
  const mergeRef = useRef<CodeMirrorMergeRef>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => bindMergeViews(mergeRef.current), 0)

    return () => window.clearTimeout(timeout)
  })

  function bindMergeViews(handle: CodeMirrorMergeRef | null) {
    mainSession.bindEditorView(handle?.view?.a ?? null)
    subSession.bindEditorView(handle?.view?.b ?? null)
  }

  function activateFromTarget(target: EventTarget | null) {
    const handle = mergeRef.current
    const node = target instanceof Node ? target : null

    if (!handle?.view || !node) return

    if (handle.view.a.dom.contains(node)) {
      mainSession.bindEditorView(handle.view.a)
      onActivate('main')
    } else if (handle.view.b.dom.contains(node)) {
      subSession.bindEditorView(handle.view.b)
      onActivate('sub')
    }
  }

  return (
    <Box
      className="editableDiffWorkspace"
      data-active-editor={activeEditorId}
      onFocusCapture={(event) => activateFromTarget(event.target)}
      onPointerDownCapture={(event) => activateFromTarget(event.target)}
    >
      <EditorDialogs session={mainSession} />
      <EditorDialogs session={subSession} />
      <Box className="diffEditorHeaders">
        <Box
          className="diffEditorHeader"
          data-active={activeEditorId === 'main'}
          onPointerDownCapture={() => {
            mainSession.bindEditorView(mergeRef.current?.view?.a ?? null)
            onActivate('main')
          }}
        >
          <EditorPaneHeader
            allowCommit
            canCommitWorkingText={canCommitWorkingText}
            paneLabel="Base · Left"
            session={mainSession}
            onCommitWorkingText={onCommitWorkingText}
          />
        </Box>
        <Box
          className="diffEditorHeader"
          data-active={activeEditorId === 'sub'}
          onPointerDownCapture={() => {
            subSession.bindEditorView(mergeRef.current?.view?.b ?? null)
            onActivate('sub')
          }}
        >
          <EditorPaneHeader
            allowCommit={false}
            canCommitWorkingText={false}
            paneLabel="Modified · Right"
            session={subSession}
          />
        </Box>
      </Box>
      <CodeMirrorMerge
        ref={mergeRef}
        key={`${mainSession.editorExtensionsVersion}:${subSession.editorExtensionsVersion}`}
        className="editableMergeView"
        destroyRerender={false}
        gutter
        highlightChanges
        orientation="a-b"
        theme={isDark ? oneDark : 'light'}
      >
        <Original
          basicSetup={editorBasicSetup}
          extensions={mainSession.editorExtensions}
          placeholder="Base text"
          value={mainSession.value}
          onChange={(value) => {
            if (value !== mainSession.value) mainSession.updateValue(value)
          }}
        />
        <Modified
          basicSetup={editorBasicSetup}
          extensions={subSession.editorExtensions}
          placeholder="Modified text"
          value={subSession.value}
          onChange={(value) => {
            if (value !== subSession.value) subSession.updateValue(value)
          }}
        />
      </CodeMirrorMerge>
      {mainSession.searchReplace.panelPortal}
      {subSession.searchReplace.panelPortal}
    </Box>
  )
}

const editorBasicSetup = {
  bracketMatching: true,
  closeBrackets: true,
  foldGutter: true,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
  lineNumbers: true,
}
