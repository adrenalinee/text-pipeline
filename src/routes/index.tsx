import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Menu,
  MantineProvider,
  Modal,
  Stack,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { Notifications, notifications } from '@mantine/notifications'
import { createFileRoute } from '@tanstack/react-router'
import {
  Binary,
  Braces,
  Code2,
  Columns2,
  Crop,
  FileJson,
  GitCompareArrows,
  Database,
  CircleCheck,
  TriangleAlert,
  RefreshCw,
  Trash2,
  Link,
  ListTree,
  Moon,
  Replace,
  Scissors,
  Sun,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { EditorPane } from '#/features/workbench/components/EditorPane'
import {
  toggleCompareMode,
  toggleSplitMode,
} from '#/features/workbench/compareMode'
import { HistoryRail } from '#/features/workbench/components/HistoryRail'
import { HistorySidebar } from '#/features/workbench/components/HistorySidebar'
import { SplitEditorWorkspace } from '#/features/workbench/components/SplitEditorWorkspace'
import { TransformsRail } from '#/features/workbench/components/TransformsRail'
import { TransformsSidebar } from '#/features/workbench/components/TransformsSidebar'
import type { TextRevisionSnapshot } from '#/features/workbench/history'
import {
  appendCommit,
  createTextCommit,
  createWorkingSnapshotCommit,
  getNextCommitId,
  getRevisionSnapshot,
  getRootRevisionSnapshot,
  hasRevisionTextChanged,
  prepareHistoryBaseRevision,
  ROOT_REVISION_ID,
  WORKING_REVISION_ID,
} from '#/features/workbench/history'
import type { ReplaceSession } from '#/features/workbench/search/useSearchReplace'
import {
  clearWorkspaceStorage,
  createDefaultWorkspaceState,
  loadWorkspace,
  readLayoutBootstrap,
} from '#/features/workbench/persistence'
import type {
  LoadedWorkspace,
  WorkbenchPersistedState,
} from '#/features/workbench/persistence'
import { cropToSelection } from '#/features/workbench/transforms/cropSelection'
import { TRANSFORM_DEFINITIONS } from '#/features/workbench/transforms/definitions'
import { getTransformSections } from '#/features/workbench/transforms/filterTransforms'
import {
  shouldShowTransformProgress,
  TRANSFORM_PROGRESS_THRESHOLDS,
} from '#/features/workbench/transforms/progress'
import {
  formatSqlWithDialect,
  TRANSFORM_RUNNERS,
} from '#/features/workbench/transforms/runners'
import type {
  SyntaxMode,
  TextCommit,
  TransformAction,
  TransformActionSection,
  TransformDefinition,
  TransformRunner,
} from '#/features/workbench/types'
import type {
  EditorId,
  EditorSession,
  EditorSessionInitialState,
} from '#/features/workbench/useEditorSession'
import { useEditorSession } from '#/features/workbench/useEditorSession'
import { useWorkspacePersistence } from '#/features/workbench/useWorkspacePersistence'
import type { WorkspaceSaveStatus } from '#/features/workbench/useWorkspacePersistence'
import { theme } from '#/theme.ts'

const CompareWorkspace = lazy(() =>
  import('#/features/workbench/components/CompareWorkspace').then((module) => ({
    default: module.CompareWorkspace,
  })),
)

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

const INITIAL_EDITOR_VALUE = ''
const INITIAL_TEXT_REVISION = {
  syntaxMode: 'plain',
  text: INITIAL_EDITOR_VALUE,
} satisfies { syntaxMode: SyntaxMode; text: string }

const LEFT_SIDEBAR_WIDTH = 264
const RIGHT_SIDEBAR_WIDTH = 296
const RAIL_WIDTH = 48

function Home() {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <Notifications position="bottom-center" />
      <WorkspaceBootstrap />
    </MantineProvider>
  )
}

function WorkspaceBootstrap() {
  const { clearColorScheme } = useMantineColorScheme()
  const [loadSequence, setLoadSequence] = useState(0)
  const [loaded, setLoaded] = useState<LoadedWorkspace | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clearRequested, setClearRequested] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fallback = createDefaultWorkspaceState()
    fallback.layout = readLayoutBootstrap(fallback.layout)
    setLoaded(null)
    setLoadError(null)

    void loadWorkspace(fallback)
      .then((workspace) => {
        if (!cancelled) setLoaded(workspace)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'The saved workspace could not be loaded.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadSequence])

  if (loadError) {
    return (
      <Box className="workspaceBootstrapState">
        <Stack align="center" gap="sm">
          <TriangleAlert color="var(--mantine-color-red-6)" size={24} />
          <Text fw={700}>Local workspace unavailable</Text>
          <Text c="dimmed" maw={460} size="sm" ta="center">
            {loadError} The saved data was left untouched.
          </Text>
          <Group gap="xs">
            <Button
              leftSection={<RefreshCw size={14} />}
              variant="default"
              onClick={() => setLoadSequence((value) => value + 1)}
            >
              Retry
            </Button>
            <Button
              color="red"
              leftSection={<Trash2 size={14} />}
              onClick={() => setClearRequested(true)}
            >
              Clear saved workspace
            </Button>
          </Group>
          <Modal
            centered
            opened={clearRequested}
            title="Clear saved workspace?"
            onClose={() => setClearRequested(false)}
          >
            <Stack gap="md">
              <Text size="sm">
                This permanently removes the locally saved text, history, and
                workspace settings from this browser profile.
              </Text>
              <Group justify="flex-end" gap="xs">
                <Button
                  variant="default"
                  onClick={() => setClearRequested(false)}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  onClick={() => {
                    void clearWorkspaceStorage().then(() => {
                      clearColorScheme()
                      setClearRequested(false)
                      setLoadSequence((value) => value + 1)
                    })
                  }}
                >
                  Clear and reset
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      </Box>
    )
  }

  if (!loaded) {
    return <WorkspaceLoadingState fullHeight label="Loading local workspace" />
  }

  return (
    <Workbench
      key={`${loadSequence}-${loaded.revision}`}
      initialWorkspace={loaded}
      onReload={() => setLoadSequence((value) => value + 1)}
    />
  )
}

function Workbench({
  initialWorkspace,
  onReload,
}: {
  initialWorkspace: LoadedWorkspace
  onReload: () => void
}) {
  const initial = initialWorkspace.state
  const [sidebarLayouts, setSidebarLayouts] = useState({
    compact: initial.layout.compact,
    wide: initial.layout.wide,
  })
  const [commits, setCommits] = useState<Array<TextCommit>>(
    initial.history.commits,
  )
  const [initialRevision, setInitialRevision] = useState<{
    syntaxMode: SyntaxMode
    text: string
  }>(initial.history.initialRevision)
  const [rootCaptured, setRootCaptured] = useState(initial.history.rootCaptured)
  const [selectedRevisionId, setSelectedRevisionId] = useState(
    initial.history.selectedRevisionId,
  )
  const [workingBaseRevisionId, setWorkingBaseRevisionId] = useState(
    initial.history.workingBaseRevisionId,
  )
  const [activeEditorId, setActiveEditorId] = useState<EditorId>(
    initial.layout.activeEditorId,
  )
  const [splitEnabled, setSplitEnabled] = useState(initial.layout.splitEnabled)
  const [compareEnabled, setCompareEnabled] = useState(
    initial.layout.compareEnabled,
  )
  const [splitRatio, setSplitRatio] = useState(initial.layout.splitRatio)
  const [runningTransformLabel, setRunningTransformLabel] = useState<
    string | null
  >(null)
  const [pendingCheckout, setPendingCheckout] = useState<
    TextCommit | typeof ROOT_REVISION_ID | null
  >(null)
  const [storageAction, setStorageAction] = useState<'clear' | null>(null)
  const [commitSequence, setCommitSequence] = useState(
    initial.history.commitSequence,
  )
  const commitSeqRef = useRef(initial.history.commitSequence)
  const { clearColorScheme, setColorScheme } = useMantineColorScheme()
  const initialCompact = useRef(
    window.matchMedia('(max-width: 48em)').matches,
  ).current
  const isCompact = useMediaQuery('(max-width: 48em)', initialCompact, {
    getInitialValueInEffect: false,
  })
  const computedColorScheme = useComputedColorScheme('dark', {
    getInitialValueInEffect: true,
  })
  const isDark = computedColorScheme === 'dark'
  const mainSession = useEditorSession({
    id: 'main',
    initialState: initial.editors.main,
    initialSyntaxMode: INITIAL_TEXT_REVISION.syntaxMode,
    initialValue: INITIAL_TEXT_REVISION.text,
    onBeforeSampleLoad: commitWorkingText,
    onManualChange: markWorkingTextChanged,
    onReplaceCommit: commitReplace,
  })
  const subSession = useEditorSession({
    id: 'sub',
    initialState: initial.editors.sub,
    initialSyntaxMode: 'plain',
    initialValue: '',
  })
  const activeSession =
    activeEditorId === 'sub' && splitEnabled ? subSession : mainSession
  const compactCompareReadOnly = compareEnabled && isCompact === true
  const rootRevision = getRootRevisionSnapshot(commits, initialRevision)
  const rootText = rootRevision.text
  const rootSyntaxMode = rootRevision.syntaxMode
  const workingBaseRevision = useMemo(
    () =>
      getRevisionSnapshot({
        commits,
        initialRevision,
        revisionId: workingBaseRevisionId,
      }),
    [commits, initialRevision, workingBaseRevisionId],
  )
  const canCommitWorkingText = hasRevisionTextChanged(
    workingBaseRevision,
    mainSession.value,
  )
  const sidebarLayout = isCompact ? sidebarLayouts.compact : sidebarLayouts.wide
  const { leftOpened, rightOpened } = sidebarLayout
  const persistedWorkspace = useMemo<WorkbenchPersistedState>(
    () => ({
      editors: {
        main: getPersistedEditorState(mainSession),
        sub: getPersistedEditorState(subSession),
      },
      history: {
        commits,
        commitSequence,
        initialRevision,
        rootCaptured,
        selectedRevisionId,
        workingBaseRevisionId,
      },
      layout: {
        activeEditorId,
        compareEnabled,
        compact: sidebarLayouts.compact,
        splitEnabled,
        splitRatio,
        wide: sidebarLayouts.wide,
      },
    }),
    [
      activeEditorId,
      commits,
      commitSequence,
      compareEnabled,
      initialRevision,
      mainSession.encoding,
      mainSession.formatSelection,
      mainSession.scrollPosition.left,
      mainSession.scrollPosition.top,
      mainSession.selection.anchor,
      mainSession.selection.head,
      mainSession.softWrapEnabled,
      mainSession.sourceViewEnabled,
      mainSession.sqlDialect.id,
      mainSession.syntaxMode,
      mainSession.validationEnabled,
      mainSession.value,
      mainSession.viewMode,
      mainSession.whitespaceVisible,
      rootCaptured,
      selectedRevisionId,
      sidebarLayouts.compact,
      sidebarLayouts.wide,
      splitEnabled,
      splitRatio,
      subSession.encoding,
      subSession.formatSelection,
      subSession.scrollPosition.left,
      subSession.scrollPosition.top,
      subSession.selection.anchor,
      subSession.selection.head,
      subSession.softWrapEnabled,
      subSession.sourceViewEnabled,
      subSession.sqlDialect.id,
      subSession.syntaxMode,
      subSession.validationEnabled,
      subSession.value,
      subSession.viewMode,
      subSession.whitespaceVisible,
      workingBaseRevisionId,
    ],
  )
  const workspacePersistence = useWorkspacePersistence({
    initialRevision: initialWorkspace.revision,
    initialSavedAt: initialWorkspace.savedAt,
    onRemoteChange: onReload,
    state: persistedWorkspace,
  })
  const persistenceMountedRef = useRef({
    editors: false,
    history: false,
    layout: false,
    positions: false,
  })
  const notifiedStorageStatusRef = useRef<WorkspaceSaveStatus | null>(null)

  useEffect(() => {
    if (!persistenceMountedRef.current.editors) {
      persistenceMountedRef.current.editors = true
      return
    }
    workspacePersistence.scheduleSave('editors')
  }, [
    mainSession.encoding,
    mainSession.formatSelection,
    mainSession.softWrapEnabled,
    mainSession.sourceViewEnabled,
    mainSession.sqlDialect.id,
    mainSession.syntaxMode,
    mainSession.validationEnabled,
    mainSession.value,
    mainSession.viewMode,
    mainSession.whitespaceVisible,
    subSession.encoding,
    subSession.formatSelection,
    subSession.softWrapEnabled,
    subSession.sourceViewEnabled,
    subSession.sqlDialect.id,
    subSession.syntaxMode,
    subSession.validationEnabled,
    subSession.value,
    subSession.viewMode,
    subSession.whitespaceVisible,
    workspacePersistence.scheduleSave,
  ])

  useEffect(() => {
    if (!persistenceMountedRef.current.positions) {
      persistenceMountedRef.current.positions = true
      return
    }
    workspacePersistence.scheduleSave('positions')
  }, [
    mainSession.scrollPosition.left,
    mainSession.scrollPosition.top,
    mainSession.selection.anchor,
    mainSession.selection.head,
    subSession.scrollPosition.left,
    subSession.scrollPosition.top,
    subSession.selection.anchor,
    subSession.selection.head,
    workspacePersistence.scheduleSave,
  ])

  useEffect(() => {
    if (!persistenceMountedRef.current.history) {
      persistenceMountedRef.current.history = true
      return
    }
    workspacePersistence.scheduleSave('history')
  }, [
    commits,
    commitSequence,
    initialRevision,
    rootCaptured,
    selectedRevisionId,
    workingBaseRevisionId,
    workspacePersistence.scheduleSave,
  ])

  useEffect(() => {
    if (!persistenceMountedRef.current.layout) {
      persistenceMountedRef.current.layout = true
      return
    }
    workspacePersistence.scheduleSave('layout')
  }, [
    activeEditorId,
    compareEnabled,
    sidebarLayouts.compact,
    sidebarLayouts.wide,
    splitEnabled,
    splitRatio,
    workspacePersistence.scheduleSave,
  ])

  useEffect(() => {
    const { status } = workspacePersistence
    if (status !== 'conflict' && status !== 'error') {
      notifiedStorageStatusRef.current = null
      return
    }
    if (notifiedStorageStatusRef.current === status) {
      return
    }
    notifiedStorageStatusRef.current = status
    notifications.show({
      color: status === 'conflict' ? 'yellow' : 'red',
      message:
        workspacePersistence.error ??
        'Open the local workspace menu to resolve the save issue.',
      title:
        status === 'conflict' ? 'Changes in another tab' : 'Local save failed',
    })
  }, [workspacePersistence.error, workspacePersistence.status])

  function allocateCommitId() {
    commitSeqRef.current += 1
    setCommitSequence(commitSeqRef.current)
    return getNextCommitId(commitSeqRef.current)
  }

  function prepareHistoryBase(
    baseRevision: TextRevisionSnapshot,
    text: string,
    syntaxMode: SyntaxMode,
  ) {
    return prepareHistoryBaseRevision({
      baseRevision,
      rootCaptured,
      syntaxMode,
      text,
    })
  }

  function commitReplace(session: ReplaceSession): TextRevisionSnapshot {
    const { afterText, beforeText, occurrences, replace, search } = session
    const preparedBase = prepareHistoryBase(
      workingBaseRevision,
      beforeText,
      mainSession.syntaxMode,
    )
    const workingSnapshotCommit = hasRevisionTextChanged(
      preparedBase.baseRevision,
      beforeText,
    )
      ? createWorkingSnapshotCommit({
          baseRevision: preparedBase.baseRevision,
          currentSyntaxMode: mainSession.syntaxMode,
          currentText: beforeText,
          description: 'Saved working text before replace.',
          id: allocateCommitId(),
          timestamp: formatCommitTimestamp(new Date()),
          title: 'Manual edit',
        })
      : null
    const commitId = allocateCommitId()
    const replaceCommit = createTextCommit({
      afterSyntaxMode: mainSession.syntaxMode,
      afterText,
      beforeSyntaxMode: mainSession.syntaxMode,
      beforeText,
      description: `Replaced ${occurrences} occurrence${
        occurrences === 1 ? '' : 's'
      } of "${search}" with "${replace}".`,
      id: commitId,
      parentId: workingSnapshotCommit?.id ?? preparedBase.baseRevision.id,
      timestamp: formatCommitTimestamp(new Date()),
      title: 'Replace',
    })

    setCommits((currentCommits) => {
      const withSnapshot = workingSnapshotCommit
        ? appendCommit(currentCommits, workingSnapshotCommit)
        : currentCommits

      return appendCommit(withSnapshot, replaceCommit)
    })
    if (preparedBase.capturedRoot) {
      setInitialRevision(preparedBase.capturedRoot)
      setRootCaptured(true)
    }
    setWorkingBaseRevisionId(commitId)
    // The editor may already hold newer manual edits when the session is
    // flushed by a non-replace change; keep those as working text.
    setSelectedRevisionId(
      mainSession.value === afterText ? commitId : WORKING_REVISION_ID,
    )

    notifications.show({
      color: 'green',
      message: `Replace was committed as ${commitId}.`,
      title: 'Commit created',
    })

    return { id: commitId, syntaxMode: mainSession.syntaxMode, text: afterText }
  }

  function flushPendingReplaceCommits(): {
    baseRevision: TextRevisionSnapshot
    didCommit: boolean
  } {
    const session = mainSession.searchReplace.takePendingReplace()

    if (!session || session.beforeText === session.afterText) {
      return { baseRevision: workingBaseRevision, didCommit: false }
    }

    return { baseRevision: commitReplace(session), didCommit: true }
  }

  async function runTransform(
    targetSession: EditorSession,
    definition: TransformDefinition,
    runner: TransformRunner,
  ) {
    const isMain = targetSession.id === 'main'
    const beforeText = targetSession.value
    const beforeSyntaxMode = targetSession.syntaxMode
    const pendingBaseRevision = isMain
      ? flushPendingReplaceCommits().baseRevision
      : null
    const preparedBase = pendingBaseRevision
      ? prepareHistoryBase(pendingBaseRevision, beforeText, beforeSyntaxMode)
      : null
    const baseRevision = preparedBase?.baseRevision ?? null
    const workingSnapshotCommit =
      baseRevision && hasRevisionTextChanged(baseRevision, beforeText)
        ? createWorkingSnapshotCommit({
            baseRevision,
            currentSyntaxMode: beforeSyntaxMode,
            currentText: beforeText,
            description: 'Saved working text before transform.',
            id: allocateCommitId(),
            timestamp: formatCommitTimestamp(new Date()),
            title: 'Manual edit',
          })
        : null
    const transformParentId =
      workingSnapshotCommit?.id ?? baseRevision?.id ?? ROOT_REVISION_ID
    const transformCommitId = isMain ? allocateCommitId() : null
    const shouldShowProgress = shouldShowTransformProgress(
      definition,
      beforeText,
    )
    const progressStartedAt = shouldShowProgress
      ? showTransformProgress(definition.label, setRunningTransformLabel)
      : null

    try {
      if (workingSnapshotCommit) {
        setCommits((currentCommits) =>
          appendCommit(currentCommits, workingSnapshotCommit),
        )
        setSelectedRevisionId(workingSnapshotCommit.id)
        setWorkingBaseRevisionId(workingSnapshotCommit.id)
      }

      if (shouldShowProgress) {
        await waitForTransformModalPaint()
      }

      const result = await runner(beforeText)
      const afterSyntaxMode =
        result.outputFormat ?? definition.outputFormat ?? beforeSyntaxMode

      if (isMain && transformCommitId) {
        commitTransform({
          afterText: result.output,
          afterSyntaxMode,
          beforeText,
          beforeSyntaxMode,
          description: definition.description,
          id: transformCommitId,
          parentId: transformParentId,
          title: definition.label,
          capturedRoot: preparedBase?.capturedRoot ?? null,
        })
      } else {
        applyUncommittedTransform({
          afterText: result.output,
          afterSyntaxMode,
          beforeText,
          targetSession,
          title: definition.label,
        })
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        message:
          error instanceof Error
            ? error.message
            : 'The transform could not be applied.',
        title: `${definition.label} failed`,
      })
    } finally {
      if (shouldShowProgress) {
        await waitForTransformProgressMinimumDuration(progressStartedAt)
        setRunningTransformLabel(null)
      }
    }
  }

  function applyUncommittedTransform({
    afterText,
    afterSyntaxMode,
    beforeText,
    targetSession,
    title,
  }: {
    afterText: string
    afterSyntaxMode: SyntaxMode
    beforeText: string
    targetSession: EditorSession
    title: string
  }) {
    if (afterText === beforeText) {
      notifications.show({
        color: 'blue',
        message: 'The transform did not change the text.',
        title: 'No changes applied',
      })
      return
    }

    targetSession.setValue(afterText)
    targetSession.setKnownSyntaxMode(afterSyntaxMode)
    notifications.show({
      color: 'green',
      message: `${title} updated the sub editor without creating history.`,
      title: 'Transform applied',
    })
  }

  function commitTransform({
    afterText,
    afterSyntaxMode,
    beforeText,
    beforeSyntaxMode,
    description,
    id,
    parentId,
    title,
    capturedRoot,
  }: {
    afterText: string
    afterSyntaxMode: SyntaxMode
    beforeText: string
    beforeSyntaxMode: SyntaxMode
    description: string
    id: string
    parentId: string
    title: string
    capturedRoot: TextRevisionSnapshot | null
  }) {
    if (afterText === beforeText) {
      notifications.show({
        color: 'blue',
        message: 'The transform did not change the text.',
        title: 'No transform commit created',
      })
      return
    }

    const commit = createTextCommit({
      afterSyntaxMode,
      afterText,
      beforeSyntaxMode,
      beforeText,
      description,
      id,
      parentId,
      timestamp: formatCommitTimestamp(new Date()),
      title,
    })

    mainSession.setValue(afterText)
    mainSession.setKnownSyntaxMode(afterSyntaxMode)
    if (capturedRoot) {
      setInitialRevision(capturedRoot)
      setRootCaptured(true)
    }
    setSelectedRevisionId(id)
    setWorkingBaseRevisionId(id)
    setCommits((currentCommits) => appendCommit(currentCommits, commit))

    notifications.show({
      color: 'green',
      message: `${title} was committed as a text change.`,
      title: 'Commit created',
    })
  }

  function commitWorkingText() {
    const { baseRevision: pendingBaseRevision, didCommit } =
      flushPendingReplaceCommits()
    const preparedBase = prepareHistoryBase(
      pendingBaseRevision,
      mainSession.value,
      mainSession.syntaxMode,
    )
    const { baseRevision } = preparedBase

    if (!hasRevisionTextChanged(baseRevision, mainSession.value)) {
      if (preparedBase.capturedRoot) {
        setInitialRevision(preparedBase.capturedRoot)
        setRootCaptured(true)
        setSelectedRevisionId(ROOT_REVISION_ID)
        setWorkingBaseRevisionId(ROOT_REVISION_ID)
        notifications.show({
          color: 'green',
          message: 'The current editor text is now the root input.',
          title: 'Root input captured',
        })
        return
      }

      // A flushed replace session already produced its own commit toast.
      if (!didCommit) {
        notifications.show({
          color: 'blue',
          message: 'The editor already matches the checked-out revision.',
          title: 'No commit created',
        })
      }
      return
    }

    const commit = createWorkingSnapshotCommit({
      baseRevision,
      currentSyntaxMode: mainSession.syntaxMode,
      currentText: mainSession.value,
      description: 'Saved current editor text.',
      id: allocateCommitId(),
      timestamp: formatCommitTimestamp(new Date()),
      title: 'Manual edit',
    })

    if (!commit) {
      return
    }

    setSelectedRevisionId(commit.id)
    setWorkingBaseRevisionId(commit.id)
    setCommits((currentCommits) => appendCommit(currentCommits, commit))

    notifications.show({
      color: 'green',
      message: `${commit.id} now points to the current editor text.`,
      title: 'Commit created',
    })
  }

  function restoreCommit(commit: TextCommit) {
    mainSession.setValue(commit.afterText)
    setSelectedRevisionId(commit.id)
    setWorkingBaseRevisionId(commit.id)
    mainSession.setKnownSyntaxMode(commit.afterSyntaxMode)
    notifications.show({
      color: 'blue',
      message: `${commit.id} is now loaded in the editor.`,
      title: 'Commit checked out',
    })
  }

  function restoreRootText() {
    mainSession.setValue(rootText)
    setSelectedRevisionId(ROOT_REVISION_ID)
    setWorkingBaseRevisionId(ROOT_REVISION_ID)
    mainSession.setKnownSyntaxMode(rootSyntaxMode)
    notifications.show({
      color: 'blue',
      message: 'Root input is now loaded in the editor.',
      title: 'Root checked out',
    })
  }

  function performCheckout(target: TextCommit | typeof ROOT_REVISION_ID) {
    // Checkout discards uncommitted working text (after the warning modal),
    // and any replace session pending inside it is discarded the same way.
    mainSession.searchReplace.takePendingReplace()

    if (target === ROOT_REVISION_ID) {
      restoreRootText()
    } else {
      restoreCommit(target)
    }
  }

  function requestCheckout(target: TextCommit | typeof ROOT_REVISION_ID) {
    setActiveEditorId('main')
    // Checking out a different revision throws away uncommitted working text,
    // so warn before discarding it.
    if (canCommitWorkingText) {
      setPendingCheckout(target)
      return
    }

    performCheckout(target)
  }

  function confirmPendingCheckout() {
    const target = pendingCheckout
    setPendingCheckout(null)

    if (target !== null) {
      performCheckout(target)
    }
  }

  function markWorkingTextChanged() {
    setWorkingBaseRevisionId((baseRevisionId) =>
      selectedRevisionId === WORKING_REVISION_ID
        ? baseRevisionId
        : selectedRevisionId,
    )
    setSelectedRevisionId(WORKING_REVISION_ID)
  }

  function setLeftOpenedPersisted(value: boolean) {
    const mode = isCompact ? 'compact' : 'wide'
    setSidebarLayouts((current) => ({
      ...current,
      [mode]: { ...current[mode], leftOpened: value },
    }))
  }

  function setRightOpenedPersisted(value: boolean) {
    const mode = isCompact ? 'compact' : 'wide'
    setSidebarLayouts((current) => ({
      ...current,
      [mode]: { ...current[mode], rightOpened: value },
    }))
  }

  function setSplitRatioPersisted(value: number) {
    setSplitRatio(value)
  }

  function toggleSplitEditor() {
    const next = toggleSplitMode({ compareEnabled, splitEnabled })

    if (splitEnabled) {
      subSession.searchReplace.closePanel()
      setActiveEditorId('main')
    }
    setCompareEnabled(next.compareEnabled)
    setSplitEnabled(next.splitEnabled)
  }

  function toggleCompareEditor() {
    const next = toggleCompareMode({ compareEnabled, splitEnabled })

    mainSession.searchReplace.closePanel()
    subSession.searchReplace.closePanel()
    if (isCompact) setActiveEditorId('main')
    setCompareEnabled(next.compareEnabled)
    setSplitEnabled(next.splitEnabled)
  }

  async function confirmStorageAction() {
    setStorageAction(null)

    try {
      await clearWorkspaceStorage()
      workspacePersistence.announceClear()
      clearColorScheme()
      onReload()
    } catch (error) {
      notifications.show({
        color: 'red',
        message:
          error instanceof Error
            ? error.message
            : 'The local workspace could not be cleared.',
        title: 'Clear failed',
      })
    }
  }

  const transformSections: Array<TransformActionSection> = getTransformSections(
    TRANSFORM_DEFINITIONS,
    activeSession.currentFormat,
  )
    .map((section) => {
      const actions = section.transforms.flatMap(
        (definition): Array<TransformAction> => {
          if (definition.id === 'crop-selection') {
            const cropRunner: TransformRunner = (input) => ({
              output: cropToSelection(
                input,
                activeSession.selectionRange.from,
                activeSession.selectionRange.to,
              ),
            })

            return [
              {
                description: compactCompareReadOnly
                  ? 'Exit Compare to transform text on a narrow screen'
                  : activeSession.hasEditorSelection
                    ? definition.description
                    : 'Select text in the editor first',
                disabled:
                  compactCompareReadOnly || !activeSession.hasEditorSelection,
                icon: getTransformIcon(definition.id),
                id: definition.id,
                label: definition.label,
                onClick: () => {
                  void runTransform(activeSession, definition, cropRunner)
                },
              } satisfies TransformAction,
            ]
          }

          const runner = TRANSFORM_RUNNERS[definition.id]

          if (!runner) {
            return []
          }

          const effectiveRunner: TransformRunner =
            definition.id === 'sql-format'
              ? (input) =>
                  formatSqlWithDialect(
                    input,
                    activeSession.sqlDialect.formatterLanguage,
                  ).then((output) => ({ output, outputFormat: 'sql' as const }))
              : runner

          return [
            {
              description: compactCompareReadOnly
                ? 'Exit Compare to transform text on a narrow screen'
                : definition.description,
              disabled: compactCompareReadOnly,
              icon: getTransformIcon(definition.id),
              id: definition.id,
              label: definition.label,
              onClick: () => {
                void runTransform(activeSession, definition, effectiveRunner)
              },
            } satisfies TransformAction,
          ]
        },
      )

      if (section.id === 'general') {
        const replaceAction: TransformAction = {
          description: compactCompareReadOnly
            ? 'Exit Compare to edit text on a narrow screen'
            : activeSession.hasEditorSelection
              ? 'Search for the selected text and replace it'
              : 'Select text in the editor first',
          disabled: compactCompareReadOnly || !activeSession.hasEditorSelection,
          icon: <Replace size={16} />,
          id: 'search-replace',
          label: 'Replace',
          onClick: () => activeSession.searchReplace.openPanel('replace'),
        }
        const cropIndex = actions.findIndex(
          (action) => action.id === 'crop-selection',
        )

        actions.splice(cropIndex + 1, 0, replaceAction)
      }

      return {
        actions,
        id: section.id,
        title: section.title,
      }
    })
    .filter((section) => section.actions.length > 0)

  return (
    <AppShell
      header={{ height: 44 }}
      navbar={{
        width: leftOpened ? LEFT_SIDEBAR_WIDTH : RAIL_WIDTH,
        breakpoint: 'sm',
        collapsed: { mobile: !leftOpened, desktop: false },
      }}
      aside={{
        width: rightOpened ? RIGHT_SIDEBAR_WIDTH : RAIL_WIDTH,
        breakpoint: 'md',
        collapsed: { mobile: !rightOpened, desktop: false },
      }}
      padding={0}
      withBorder
      className="workbenchShell"
    >
      <Modal
        centered
        closeOnClickOutside={false}
        closeOnEscape={false}
        opened={runningTransformLabel !== null}
        overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
        size="xs"
        title="Transform running"
        withCloseButton={false}
        onClose={() => undefined}
      >
        <Group gap="sm" wrap="nowrap">
          <Loader size="sm" />
          <Box>
            <Text fw={700} size="sm">
              {runningTransformLabel}
            </Text>
            <Text c="dimmed" size="xs">
              Processing a large text input locally.
            </Text>
          </Box>
        </Group>
      </Modal>
      <Modal
        centered
        opened={pendingCheckout !== null}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="sm"
        title="Discard working text?"
        onClose={() => setPendingCheckout(null)}
      >
        <Stack gap="md">
          <Text size="sm">
            The current working text has not been committed. Loading another
            revision will discard these changes.
          </Text>
          <Group justify="flex-end" gap="xs" wrap="nowrap">
            <Button variant="default" onClick={() => setPendingCheckout(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmPendingCheckout}>
              Discard &amp; load
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        centered
        opened={storageAction !== null}
        size="sm"
        title="Clear saved workspace?"
        onClose={() => setStorageAction(null)}
      >
        <Stack gap="md">
          <Text size="sm">
            This permanently removes the locally saved text, history, editor
            positions, and workspace settings, then resets the app.
          </Text>
          <Group justify="flex-end" gap="xs" wrap="nowrap">
            <Button variant="default" onClick={() => setStorageAction(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={() => void confirmStorageAction()}>
              Clear and reset
            </Button>
          </Group>
        </Stack>
      </Modal>
      <AppShell.Header className="workbenchHeader">
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <img
              alt=""
              aria-hidden="true"
              className="workbenchLogo"
              src="/favicon.svg"
            />
            <Text fw={650} size="sm">
              Text Pipeline
            </Text>
            <Badge className="workbenchBadge" variant="light" size="xs">
              Alpha
            </Badge>
            <WorkspaceStorageMenu
              error={workspacePersistence.error}
              savedAt={workspacePersistence.savedAt}
              status={workspacePersistence.status}
              onClear={() => setStorageAction('clear')}
              onKeepThisTab={workspacePersistence.keepThisTab}
              onLoadLatest={onReload}
              onRetry={workspacePersistence.retry}
            />
            {/* <HeaderIconButton
              label={splitEnabled ? 'Close split editor' : 'Split editor'}
              pressed={splitEnabled}
              onClick={toggleSplitEditor}
            >
              <Columns2 size={18} />
            </HeaderIconButton> */}
          </Group>

          <Group gap={6} wrap="nowrap">
            <HeaderIconButton
              label={splitEnabled ? 'Close split editor' : 'Split editor'}
              pressed={splitEnabled}
              onClick={toggleSplitEditor}
            >
              <Columns2 size={18} />
            </HeaderIconButton>
            <HeaderIconButton
              label={
                compareEnabled ? 'Stop comparing editors' : 'Compare editors'
              }
              pressed={compareEnabled}
              onClick={toggleCompareEditor}
            >
              <GitCompareArrows size={18} />
            </HeaderIconButton>
            <HeaderIconButton
              label={isDark ? 'Use light theme' : 'Use dark theme'}
              onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </HeaderIconButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        className={
          leftOpened
            ? 'workbenchSidebar'
            : 'workbenchSidebar workbenchSidebarCollapsed'
        }
      >
        {leftOpened ? (
          <HistorySidebar
            commits={commits}
            currentText={mainSession.value}
            selectedRevisionId={selectedRevisionId}
            workingBaseRevisionId={workingBaseRevisionId}
            onCollapse={() => setLeftOpenedPersisted(false)}
            onRestoreCommit={requestCheckout}
            onRestoreRoot={() => requestCheckout(ROOT_REVISION_ID)}
          />
        ) : (
          <HistoryRail
            commits={commits}
            currentText={mainSession.value}
            selectedRevisionId={selectedRevisionId}
            workingBaseRevisionId={workingBaseRevisionId}
            onExpand={() => setLeftOpenedPersisted(true)}
            onRestoreCommit={requestCheckout}
            onRestoreRoot={() => requestCheckout(ROOT_REVISION_ID)}
          />
        )}
      </AppShell.Navbar>

      <AppShell.Main className="workbenchMain">
        {compareEnabled ? (
          <Suspense
            fallback={<WorkspaceLoadingState label="Loading comparison" />}
          >
            <CompareWorkspace
              activeEditorId={activeEditorId}
              canCommitWorkingText={canCommitWorkingText}
              compact={isCompact === true}
              isDark={isDark}
              mainSession={mainSession}
              ratio={splitRatio}
              subSession={subSession}
              onActivate={setActiveEditorId}
              onCommitWorkingText={commitWorkingText}
              onRatioChange={setSplitRatioPersisted}
            />
          </Suspense>
        ) : (
          <SplitEditorWorkspace
            compact={isCompact === true}
            ratio={splitRatio}
            split={splitEnabled}
            onRatioChange={setSplitRatioPersisted}
            main={
              <EditorPane
                allowCommit
                canCommitWorkingText={canCommitWorkingText}
                compact={isCompact === true}
                // editorTitle="Main Editor"
                isActive={activeEditorId === 'main'}
                isDark={isDark}
                session={mainSession}
                onActivate={() => setActiveEditorId('main')}
                onCommitWorkingText={commitWorkingText}
              />
            }
            sub={
              <EditorPane
                allowCommit={false}
                canCommitWorkingText={false}
                compact={isCompact === true}
                // editorTitle="Sub Editor"
                isActive={activeEditorId === 'sub'}
                isDark={isDark}
                session={subSession}
                onActivate={() => setActiveEditorId('sub')}
              />
            }
          />
        )}
      </AppShell.Main>

      <AppShell.Aside
        className={
          rightOpened
            ? 'workbenchSidebar'
            : 'workbenchSidebar workbenchSidebarCollapsed'
        }
      >
        {rightOpened ? (
          <TransformsSidebar
            onCollapse={() => setRightOpenedPersisted(false)}
            sections={transformSections}
          />
        ) : (
          <TransformsRail
            onExpand={() => setRightOpenedPersisted(true)}
            sections={transformSections}
          />
        )}
      </AppShell.Aside>
    </AppShell>
  )
}

function getTransformIcon(id: TransformDefinition['id']) {
  if (id === 'crop-selection') {
    return <Crop size={16} />
  }

  if (id === 'trim') {
    return <Scissors size={16} />
  }

  if (id === 'json-format') {
    return <ListTree size={16} />
  }

  if (id === 'json-minify') {
    return <Braces size={16} />
  }

  if (id.endsWith('-to-json')) {
    return <FileJson size={16} />
  }

  if (id === 'url-encode' || id === 'url-decode') {
    return <Link size={16} />
  }

  if (id === 'base64-encode' || id === 'base64-decode') {
    return <Binary size={16} />
  }

  return <Code2 size={16} />
}

function waitForTransformModalPaint() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 0)
      })
    })
  })
}

function showTransformProgress(
  label: string,
  setRunningTransformLabel: (label: string) => void,
) {
  const startedAt = getTransformProgressTimestamp()

  if (typeof window === 'undefined') {
    setRunningTransformLabel(label)
    return startedAt
  }

  flushSync(() => {
    setRunningTransformLabel(label)
  })

  return startedAt
}

function waitForTransformProgressMinimumDuration(startedAt: number | null) {
  if (startedAt === null) {
    return Promise.resolve()
  }

  const remainingMs =
    TRANSFORM_PROGRESS_THRESHOLDS.minimumVisibleMs -
    (getTransformProgressTimestamp() - startedAt)

  if (remainingMs <= 0) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const setDelay =
      typeof window === 'undefined' ? setTimeout : window.setTimeout

    setDelay(resolve, remainingMs)
  })
}

function getTransformProgressTimestamp() {
  if (typeof performance === 'undefined') {
    return Date.now()
  }

  return performance.now()
}

function getPersistedEditorState(
  session: EditorSession,
): EditorSessionInitialState {
  return {
    encoding: session.encoding,
    formatSelection: session.formatSelection,
    scroll: session.scrollPosition,
    selection: session.selection,
    softWrapEnabled: session.softWrapEnabled,
    sourceViewEnabled: session.sourceViewEnabled,
    sqlDialectId: session.sqlDialect.id,
    syntaxMode: session.syntaxMode,
    validationEnabled: session.validationEnabled,
    value: session.value,
    viewMode: session.viewMode,
    whitespaceVisible: session.whitespaceVisible,
  }
}

function WorkspaceStorageMenu({
  error,
  onClear,
  onKeepThisTab,
  onLoadLatest,
  onRetry,
  savedAt,
  status,
}: {
  error: string | null
  onClear: () => void
  onKeepThisTab: () => void
  onLoadLatest: () => void
  onRetry: () => void
  savedAt: string | null
  status: WorkspaceSaveStatus
}) {
  const statusLabel =
    status === 'saving'
      ? 'Saving locally'
      : status === 'conflict'
        ? 'Changes in another tab'
        : status === 'error'
          ? 'Local save failed'
          : 'Saved locally'
  const statusColor =
    status === 'conflict' || status === 'error' ? 'red' : 'blue'
  const statusIcon =
    status === 'saving' ? (
      <Loader size={17} />
    ) : status === 'conflict' || status === 'error' ? (
      <TriangleAlert size={17} />
    ) : (
      <Database size={17} />
    )

  return (
    <Menu position="bottom-end" shadow="md" width={280} withinPortal>
      <Menu.Target>
        <Tooltip label={getStorageTooltip(status)} withArrow>
          <ActionIcon
            aria-label={statusLabel}
            color={statusColor}
            size="lg"
            variant={status === 'saved' ? 'subtle' : 'light'}
          >
            {statusIcon}
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Local workspace</Menu.Label>
        <Box px="sm" py={6}>
          <Group gap="xs" wrap="nowrap">
            {status === 'saved' ? (
              <CircleCheck color="var(--mantine-color-blue-6)" size={16} />
            ) : null}
            <Box>
              <Text fw={650} size="sm">
                {statusLabel}
              </Text>
              <Text c="dimmed" size="xs">
                {error ?? formatSavedAt(savedAt)}
              </Text>
            </Box>
          </Group>
        </Box>
        {status === 'conflict' ? (
          <>
            <Menu.Divider />
            <Menu.Item onClick={onLoadLatest}>Load latest changes</Menu.Item>
            <Menu.Item color="blue" onClick={onKeepThisTab}>
              Keep working in this tab
            </Menu.Item>
          </>
        ) : null}
        {status === 'error' ? (
          <Menu.Item leftSection={<RefreshCw size={15} />} onClick={onRetry}>
            Retry local save
          </Menu.Item>
        ) : null}
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<Trash2 size={15} />}
          onClick={onClear}
        >
          Clear saved workspace
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

function getStorageTooltip(status: WorkspaceSaveStatus) {
  if (status === 'saving') return 'Saving workspace in this browser'
  if (status === 'conflict') return 'Changes from another tab need attention'
  if (status === 'error') return 'Local autosave needs attention'
  return 'Workspace is automatically saved in this browser'
}

function formatSavedAt(value: string | null) {
  if (!value) return 'Local autosave is ready.'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Saved in this browser.'
    : `Last saved ${date.toLocaleTimeString()}`
}

function HeaderIconButton({
  children,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  pressed?: boolean
}) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        aria-label={label}
        aria-pressed={pressed}
        color={pressed ? 'blue' : 'gray'}
        size="lg"
        variant={pressed ? 'light' : 'subtle'}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}

function WorkspaceLoadingState({
  fullHeight = false,
  label,
}: {
  fullHeight?: boolean
  label: string
}) {
  return (
    <Group
      className={
        fullHeight
          ? 'workspaceLoadingState workspaceBootstrapState'
          : 'workspaceLoadingState'
      }
      gap="xs"
      justify="center"
    >
      <Loader size="sm" />
      <Text c="dimmed" size="sm">
        {label}…
      </Text>
    </Group>
  )
}

function formatCommitTimestamp(date: Date) {
  return date.toTimeString().slice(0, 8)
}
