import { Box, Group, Text } from '@mantine/core'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { unifiedMergeView } from '@codemirror/merge'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'

import type { EditorSession } from '../useEditorSession'

export function UnifiedDiffView({
  isDark,
  mainSession,
  subSession,
}: {
  isDark: boolean
  mainSession: EditorSession
  subSession: EditorSession
}) {
  const extensions = useMemo(
    () => [
      ...subSession.editorExtensions,
      unifiedMergeView({
        allowInlineDiffs: true,
        collapseUnchanged: { margin: 3, minSize: 8 },
        gutter: true,
        highlightChanges: true,
        mergeControls: false,
        original: mainSession.value,
      }),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
    ],
    [mainSession.value, subSession.editorExtensions],
  )

  return (
    <Box className="unifiedDiffPanel">
      <Group className="unifiedDiffHeader" justify="space-between" wrap="nowrap">
        <Box>
          <Text fw={700} size="sm">
            Unified diff
          </Text>
          <Text c="dimmed" size="xs">
            Base · Left → Modified · Right
          </Text>
        </Box>
        <Text c="dimmed" size="xs">
          Read only
        </Text>
      </Group>
      <CodeMirror
        aria-label="Unified diff view"
        basicSetup={{ foldGutter: true, lineNumbers: true }}
        className="codeEditor unifiedDiffEditor"
        editable={false}
        extensions={extensions}
        height="100%"
        readOnly
        theme={isDark ? oneDark : 'light'}
        value={subSession.value}
      />
      {subSession.searchReplace.panelPortal}
    </Box>
  )
}
