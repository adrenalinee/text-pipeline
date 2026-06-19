import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Group,
  Loader,
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
import { linter, lintGutter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'
import {
  Binary,
  Braces,
  Check,
  Code2,
  FileJson,
  FileText,
  ListTree,
  Link,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Workflow,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'

import { EditorToolbar } from '#/features/workbench/components/EditorToolbar'
import { HistorySidebar } from '#/features/workbench/components/HistorySidebar'
import { TransformsSidebar } from '#/features/workbench/components/TransformsSidebar'
import {
  FORMAT_DEFINITIONS,
  FORMAT_OPTIONS,
  FORMAT_VIEWS,
  getFormatDefinition,
} from '#/features/workbench/formats'
import {
  createTextCommit,
  createWorkingSnapshotCommit,
  getNextCommitId,
  getRevisionSnapshot,
  getRootRevisionSnapshot,
  hasRevisionTextChanged,
  ROOT_REVISION_ID,
  WORKING_REVISION_ID,
} from '#/features/workbench/history'
import { TEXT_SAMPLES } from '#/features/workbench/samples'
import type { TextSample } from '#/features/workbench/samples'
import type {
  SyntaxMode,
  TextCommit,
  TransformAction,
  TransformActionSection,
  TransformDefinition,
  TransformRunner,
  WorkbenchViewMode,
} from '#/features/workbench/types'
import { TRANSFORM_DEFINITIONS } from '#/features/workbench/transforms/definitions'
import { getTransformSections } from '#/features/workbench/transforms/filterTransforms'
import {
  shouldShowTransformProgress,
  TRANSFORM_PROGRESS_THRESHOLDS,
} from '#/features/workbench/transforms/progress'
import { TRANSFORM_RUNNERS } from '#/features/workbench/transforms/runners'
import { validateFormat } from '#/features/workbench/utils/formatValidation'
import { FormatViewPanel } from '#/features/workbench/views/FormatViewPanel'

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

const INITIAL_EDITOR_VALUE = ''
const INITIAL_TEXT_REVISION = {
  syntaxMode: 'json',
  text: INITIAL_EDITOR_VALUE,
} satisfies { syntaxMode: SyntaxMode; text: string }

function Home() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications position="bottom-center" />
      <Workbench />
    </MantineProvider>
  )
}

function Workbench() {
  const [leftOpened, setLeftOpened] = useState(true)
  const [rightOpened, setRightOpened] = useState(true)
  const [editorValue, setEditorValue] = useState(INITIAL_EDITOR_VALUE)
  const [commits, setCommits] = useState<Array<TextCommit>>([])
  const [selectedRevisionId, setSelectedRevisionId] =
    useState(WORKING_REVISION_ID)
  const [workingBaseRevisionId, setWorkingBaseRevisionId] =
    useState(ROOT_REVISION_ID)
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>('json')
  const [syntaxModalOpened, setSyntaxModalOpened] = useState(false)
  const [sampleModalOpened, setSampleModalOpened] = useState(false)
  const [softWrapEnabled, setSoftWrapEnabled] = useState(true)
  const [validationEnabled, setValidationEnabled] = useState(false)
  const [viewMode, setViewMode] = useState<WorkbenchViewMode>('source')
  const [runningTransformLabel, setRunningTransformLabel] = useState<
    string | null
  >(null)
  const { setColorScheme } = useMantineColorScheme()
  const isCompact = useMediaQuery('(max-width: 48em)')
  const computedColorScheme = useComputedColorScheme('dark', {
    getInitialValueInEffect: true,
  })
  const isDark = computedColorScheme === 'dark'
  const currentFormat = getFormatDefinition(syntaxMode)
  const viewAvailable = currentFormat.viewIds.length > 0
  const rootRevision = getRootRevisionSnapshot(commits, INITIAL_TEXT_REVISION)
  const rootText = rootRevision.text
  const rootSyntaxMode = rootRevision.syntaxMode
  const workingBaseRevision = useMemo(
    () =>
      getRevisionSnapshot({
        commits,
        initialRevision: INITIAL_TEXT_REVISION,
        revisionId: workingBaseRevisionId,
      }),
    [commits, workingBaseRevisionId],
  )
  const canCommitWorkingText = hasRevisionTextChanged(
    workingBaseRevision,
    editorValue,
  )
  const editorExtensions = useMemo(() => {
    const syntaxExtensions = currentFormat.getEditorExtensions()
    const lintSource = validationEnabled ? currentFormat.lintSource : null
    const lintExtensions = lintSource
      ? [lintGutter(), linter(lintSource, { delay: 250 })]
      : []
    const wrappingExtensions = softWrapEnabled ? [EditorView.lineWrapping] : []

    return [...syntaxExtensions, ...lintExtensions, ...wrappingExtensions]
  }, [currentFormat, softWrapEnabled, validationEnabled])
  const validationResult = useMemo(
    () =>
      validationEnabled && currentFormat.validation === 'supported'
        ? validateFormat(editorValue, syntaxMode)
        : null,
    [currentFormat.validation, editorValue, syntaxMode, validationEnabled],
  )

  async function runTransform(
    definition: TransformDefinition,
    runner: TransformRunner,
  ) {
    const beforeText = editorValue
    const beforeSyntaxMode = syntaxMode
    const workingSnapshotCommit = createWorkingSnapshotCommit({
      baseRevision: workingBaseRevision,
      currentSyntaxMode: beforeSyntaxMode,
      currentText: beforeText,
      description: 'Saved working text before transform.',
      id: getNextCommitId(commits),
      timestamp: formatCommitTimestamp(new Date()),
      title: 'Manual edit',
    })
    const transformParentId =
      workingSnapshotCommit?.id ?? workingBaseRevision.id
    const transformCommitId = getNextCommitId(
      commits,
      workingSnapshotCommit ? 2 : 1,
    )
    const shouldShowProgress = shouldShowTransformProgress(
      definition,
      beforeText,
    )
    const progressStartedAt = shouldShowProgress
      ? showTransformProgress(definition.label, setRunningTransformLabel)
      : null

    try {
      if (workingSnapshotCommit) {
        setCommits((currentCommits) => [
          workingSnapshotCommit,
          ...currentCommits,
        ])
        setSelectedRevisionId(workingSnapshotCommit.id)
        setWorkingBaseRevisionId(workingSnapshotCommit.id)
      }

      if (shouldShowProgress) {
        await waitForTransformModalPaint()
      }

      const result = await runner(beforeText)
      const afterSyntaxMode =
        result.outputFormat ?? definition.outputFormat ?? beforeSyntaxMode

      commitTransform({
        afterText: result.output,
        afterSyntaxMode,
        beforeText,
        beforeSyntaxMode,
        description: definition.description,
        id: transformCommitId,
        parentId: transformParentId,
        title: definition.label,
      })
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

  function commitTransform({
    afterText,
    afterSyntaxMode,
    beforeText,
    beforeSyntaxMode,
    description,
    id,
    parentId,
    title,
  }: {
    afterText: string
    afterSyntaxMode: SyntaxMode
    beforeText: string
    beforeSyntaxMode: SyntaxMode
    description: string
    id: string
    parentId: string
    title: string
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

    setEditorValue(afterText)
    setSyntaxMode(afterSyntaxMode)
    setSelectedRevisionId(id)
    setWorkingBaseRevisionId(id)
    setCommits((currentCommits) => [commit, ...currentCommits])

    notifications.show({
      color: 'green',
      message: `${title} was committed as a text change.`,
      title: 'Commit created',
    })
  }

  function commitWorkingText() {
    const commit = createWorkingSnapshotCommit({
      baseRevision: workingBaseRevision,
      currentSyntaxMode: syntaxMode,
      currentText: editorValue,
      description: 'Saved current editor text.',
      id: getNextCommitId(commits),
      timestamp: formatCommitTimestamp(new Date()),
      title: 'Manual edit',
    })

    if (!commit) {
      notifications.show({
        color: 'blue',
        message: 'The editor already matches the checked-out revision.',
        title: 'No commit created',
      })
      return
    }

    setSelectedRevisionId(commit.id)
    setWorkingBaseRevisionId(commit.id)
    setCommits((currentCommits) => [commit, ...currentCommits])

    notifications.show({
      color: 'green',
      message: `${commit.id} now points to the current editor text.`,
      title: 'Commit created',
    })
  }

  function restoreCommit(commit: TextCommit) {
    setEditorValue(commit.afterText)
    setSelectedRevisionId(commit.id)
    setWorkingBaseRevisionId(commit.id)
    setSyntaxMode(commit.afterSyntaxMode)
    notifications.show({
      color: 'blue',
      message: `${commit.id} is now loaded in the editor.`,
      title: 'Commit checked out',
    })
  }

  function restoreRootText() {
    setEditorValue(rootText)
    setSelectedRevisionId(ROOT_REVISION_ID)
    setWorkingBaseRevisionId(ROOT_REVISION_ID)
    setSyntaxMode(rootSyntaxMode)
    notifications.show({
      color: 'blue',
      message: 'Root input is now loaded in the editor.',
      title: 'Root checked out',
    })
  }

  function restoreCommitParent(commit: TextCommit) {
    if (commit.parentId === ROOT_REVISION_ID) {
      restoreRootText()
      return
    }

    const parentCommit = commits.find(({ id }) => id === commit.parentId)

    if (parentCommit) {
      restoreCommit(parentCommit)
    } else {
      notifications.show({
        color: 'red',
        message: `Parent commit ${commit.parentId} could not be found.`,
        title: 'Checkout failed',
      })
    }
  }

  function updateEditorValue(value: string) {
    setEditorValue(value)
    markWorkingTextChanged()
  }

  function loadSample(sample: TextSample) {
    markWorkingTextChanged()
    setEditorValue(sample.value)
    setSyntaxMode(sample.syntaxMode)
    setSampleModalOpened(false)
    setViewMode('source')

    notifications.show({
      color: 'blue',
      message: `${sample.label} is now loaded in the editor.`,
      title: 'Sample loaded',
    })
  }

  function markWorkingTextChanged() {
    setWorkingBaseRevisionId((baseRevisionId) =>
      selectedRevisionId === WORKING_REVISION_ID
        ? baseRevisionId
        : selectedRevisionId,
    )
    setSelectedRevisionId(WORKING_REVISION_ID)
  }

  useEffect(() => {
    if (isCompact) {
      setLeftOpened(false)
      setRightOpened(false)
    }
  }, [isCompact])

  const transformSections: Array<TransformActionSection> = getTransformSections(
    TRANSFORM_DEFINITIONS.filter((definition) =>
      currentFormat.transformIds.includes(definition.id),
    ),
    syntaxMode,
  )
    .map((section) => {
      const actions = section.transforms.flatMap((definition) => {
        const runner = TRANSFORM_RUNNERS[definition.id]

        if (!runner) {
          return []
        }

        return [
          {
            description: definition.description,
            icon: getTransformIcon(definition.id),
            id: definition.id,
            label: definition.label,
            onClick: () => {
              void runTransform(definition, runner)
            },
          } satisfies TransformAction,
        ]
      })

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
        width: 264,
        breakpoint: 'sm',
        collapsed: { mobile: !leftOpened, desktop: !leftOpened },
      }}
      aside={{
        width: 296,
        breakpoint: 'md',
        collapsed: { mobile: !rightOpened, desktop: !rightOpened },
      }}
      padding={0}
      withBorder
      className="workbenchShell"
    >
      <Modal
        centered
        opened={syntaxModalOpened}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="sm"
        title="Text format"
        onClose={() => setSyntaxModalOpened(false)}
      >
        <Stack gap="xs">
          {FORMAT_OPTIONS.map((option) => (
            <SyntaxOptionButton
              active={syntaxMode === option.id}
              description={option.description}
              key={option.id}
              label={option.label}
              value={option.id}
              onClick={() => {
                if (option.id !== syntaxMode) {
                  markWorkingTextChanged()
                }
                setSyntaxMode(option.id)
                setViewMode(
                  FORMAT_DEFINITIONS[option.id].viewIds.length > 0
                    ? viewMode
                    : 'source',
                )
                setSyntaxModalOpened(false)
              }}
            />
          ))}
        </Stack>
      </Modal>
      <Modal
        centered
        opened={sampleModalOpened}
        overlayProps={{ backgroundOpacity: 0.45, blur: 1 }}
        size="lg"
        title="Sample data"
        onClose={() => setSampleModalOpened(false)}
      >
        <Stack gap="xs">
          {TEXT_SAMPLES.map((sample) => (
            <SampleOptionButton
              key={sample.id}
              sample={sample}
              onClick={() => loadSample(sample)}
            />
          ))}
        </Stack>
      </Modal>
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

      <AppShell.Header className="workbenchHeader">
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Workflow size={18} strokeWidth={1.8} />
            <Text fw={650} size="sm">
              Text Pipeline
            </Text>
            <Badge className="workbenchBadge" variant="light" size="xs">
              Workbench
            </Badge>
          </Group>

          <Group gap={6} wrap="nowrap">
            <HeaderIconButton
              label={leftOpened ? 'Hide left sidebar' : 'Show left sidebar'}
              onClick={() => setLeftOpened((opened) => !opened)}
            >
              {leftOpened ? (
                <PanelLeftClose size={18} />
              ) : (
                <PanelLeftOpen size={18} />
              )}
            </HeaderIconButton>
            <HeaderIconButton
              label={rightOpened ? 'Hide right sidebar' : 'Show right sidebar'}
              onClick={() => setRightOpened((opened) => !opened)}
            >
              {rightOpened ? (
                <PanelRightClose size={18} />
              ) : (
                <PanelRightOpen size={18} />
              )}
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

      <AppShell.Navbar className="workbenchSidebar">
        <HistorySidebar
          commits={commits}
          currentText={editorValue}
          selectedRevisionId={selectedRevisionId}
          workingBaseRevisionId={workingBaseRevisionId}
          onRestoreCommit={restoreCommit}
          onRestoreCommitParent={restoreCommitParent}
          onRestoreRoot={restoreRootText}
        />
      </AppShell.Navbar>

      <AppShell.Main className="workbenchMain">
        <Box className="editorPanel">
          <EditorToolbar
            activeViewMode={viewMode}
            canCommitWorkingText={canCommitWorkingText}
            formatLabel={currentFormat.label}
            softWrapEnabled={softWrapEnabled}
            validationEnabled={validationEnabled}
            validationAvailable={currentFormat.validation === 'supported'}
            validationResult={validationResult}
            viewAvailable={viewAvailable}
            onChooseSyntax={() => setSyntaxModalOpened(true)}
            onCommitWorkingText={commitWorkingText}
            onOpenSamples={() => setSampleModalOpened(true)}
            onSetViewMode={setViewMode}
            onToggleSoftWrap={() => setSoftWrapEnabled((enabled) => !enabled)}
            onToggleValidation={() =>
              setValidationEnabled((enabled) => !enabled)
            }
          />
          {viewMode === 'source' ? (
            <CodeMirror
              aria-label="Text editor"
              className={
                softWrapEnabled ? 'codeEditor' : 'codeEditor codeEditorNoWrap'
              }
              basicSetup={{
                bracketMatching: true,
                closeBrackets: true,
                foldGutter: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                lineNumbers: true,
              }}
              extensions={editorExtensions}
              height="100%"
              theme={isDark ? oneDark : 'light'}
              value={editorValue}
              placeholder="any text here"
              onChange={updateEditorValue}
            />
          ) : (
            <FormatViewPanel
              format={currentFormat}
              value={editorValue}
              views={FORMAT_VIEWS}
            />
          )}
        </Box>
      </AppShell.Main>

      <AppShell.Aside className="workbenchSidebar">
        <TransformsSidebar sections={transformSections} />
      </AppShell.Aside>
    </AppShell>
  )
}

function getTransformIcon(id: TransformDefinition['id']) {
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
  if (value === 'json') {
    return <Braces size={18} />
  }

  if (value === 'yaml') {
    return <Code2 size={18} />
  }

  if (value === 'markdown') {
    return <FileText size={18} />
  }

  if (value === 'toml') {
    return <FileText size={18} />
  }

  if (value === 'xml' || value === 'sql') {
    return <Code2 size={18} />
  }

  return <FileText size={18} />
}

function HeaderIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        aria-label={label}
        size="lg"
        variant="subtle"
        color="gray"
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}

function formatCommitTimestamp(date: Date) {
  return date.toTimeString().slice(0, 8)
}
