import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Group,
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
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
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

import { EditorToolbar } from '#/features/workbench/components/EditorToolbar'
import { HistorySidebar } from '#/features/workbench/components/HistorySidebar'
import { TransformsSidebar } from '#/features/workbench/components/TransformsSidebar'
import { TEXT_SAMPLES } from '#/features/workbench/samples'
import type { TextSample } from '#/features/workbench/samples'
import type {
  SyntaxMode,
  TextCommit,
  TransformAction,
  TransformActionSection,
  TransformDefinition,
  TransformRunner,
} from '#/features/workbench/types'
import { TRANSFORM_DEFINITIONS } from '#/features/workbench/transforms/definitions'
import { getTransformSections } from '#/features/workbench/transforms/filterTransforms'
import { TRANSFORM_RUNNERS } from '#/features/workbench/transforms/runners'
import { getFormatLintSource } from '#/features/workbench/utils/formatLinting'
import { validateFormat } from '#/features/workbench/utils/formatValidation'
import { getChangeStats } from '#/features/workbench/utils/textMetrics'

export const Route = createFileRoute('/')({ component: Home })

const SYNTAX_OPTIONS: Array<{
  description: string
  label: string
  value: SyntaxMode
}> = [
  {
    description: 'No highlighting',
    label: 'Plain text',
    value: 'plain',
  },
  {
    description: 'Objects, arrays, payloads',
    label: 'JSON',
    value: 'json',
  },
  {
    description: 'Config and manifests',
    label: 'YAML',
    value: 'yaml',
  },
]

const INITIAL_EDITOR_VALUE =
  '{\n  "service": "text-pipeline",\n  "status": "draft"\n}'

function Home() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications position="top-center" />
      <Workbench />
    </MantineProvider>
  )
}

function Workbench() {
  const [leftOpened, setLeftOpened] = useState(true)
  const [rightOpened, setRightOpened] = useState(true)
  const [editorValue, setEditorValue] = useState(INITIAL_EDITOR_VALUE)
  const [commits, setCommits] = useState<Array<TextCommit>>([])
  const [selectedRevisionId, setSelectedRevisionId] = useState('working')
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>('json')
  const [syntaxModalOpened, setSyntaxModalOpened] = useState(false)
  const [validationEnabled, setValidationEnabled] = useState(false)
  const { setColorScheme } = useMantineColorScheme()
  const isCompact = useMediaQuery('(max-width: 48em)')
  const computedColorScheme = useComputedColorScheme('dark', {
    getInitialValueInEffect: true,
  })
  const isDark = computedColorScheme === 'dark'
  const rootText = commits.at(-1)?.beforeText ?? INITIAL_EDITOR_VALUE
  const editorExtensions = useMemo(() => {
    const syntaxExtensions =
      syntaxMode === 'json' ? [json()] : syntaxMode === 'yaml' ? [yaml()] : []
    const lintSource = validationEnabled
      ? getFormatLintSource(syntaxMode)
      : null
    const lintExtensions = lintSource
      ? [lintGutter(), linter(lintSource, { delay: 250 })]
      : []

    return [...syntaxExtensions, ...lintExtensions, EditorView.lineWrapping]
  }, [syntaxMode, validationEnabled])
  const validationResult = useMemo(
    () => (validationEnabled ? validateFormat(editorValue, syntaxMode) : null),
    [editorValue, syntaxMode, validationEnabled],
  )

  function runTransform(
    definition: TransformDefinition,
    runner: TransformRunner,
  ) {
    try {
      const result = runner(editorValue)
      const outputFormat = result.outputFormat ?? definition.outputFormat

      if (outputFormat) {
        setSyntaxMode(outputFormat)
      }

      commitTransform({
        afterText: result.output,
        beforeText: editorValue,
        description: definition.description,
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
    }
  }

  function commitTransform({
    afterText,
    beforeText,
    description,
    title,
  }: {
    afterText: string
    beforeText: string
    description: string
    title: string
  }) {
    if (afterText === beforeText) {
      notifications.show({
        color: 'blue',
        message: 'The transform did not change the text.',
        title: 'No commit created',
      })
      return
    }

    const changeStats = getChangeStats(beforeText, afterText)
    const index = commits.length + 1
    const id = `c${String(index).padStart(3, '0')}`

    setEditorValue(afterText)
    setSelectedRevisionId(id)
    setCommits((currentCommits) => [
      {
        afterText,
        beforeText,
        charDelta: changeStats.charDelta,
        description,
        id,
        lineDelta: changeStats.lineDelta,
        parentId: currentCommits[0]?.id ?? 'root',
        title,
        timestamp: formatCommitTimestamp(new Date()),
      },
      ...currentCommits,
    ])

    notifications.show({
      color: 'green',
      message: `${title} was committed as a text change.`,
      title: 'Commit created',
    })
  }

  function restoreCommit(commit: TextCommit) {
    setEditorValue(commit.afterText)
    setSelectedRevisionId(commit.id)
    setSyntaxMode('json')
    notifications.show({
      color: 'blue',
      message: `${commit.id} is now loaded in the editor.`,
      title: 'Commit checked out',
    })
  }

  function restoreRootText() {
    setEditorValue(rootText)
    setSelectedRevisionId('root')
    setSyntaxMode('json')
    notifications.show({
      color: 'blue',
      message: 'Root input is now loaded in the editor.',
      title: 'Root checked out',
    })
  }

  function restoreCommitParent(commit: TextCommit) {
    if (commit.parentId === 'root') {
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
    setSelectedRevisionId('working')
  }

  function loadSample(sample: TextSample) {
    setEditorValue(sample.value)
    setSyntaxMode(sample.syntaxMode)
    setSelectedRevisionId('working')

    notifications.show({
      color: 'blue',
      message: `${sample.label} is now loaded in the editor.`,
      title: 'Sample loaded',
    })
  }

  useEffect(() => {
    if (isCompact) {
      setLeftOpened(false)
      setRightOpened(false)
    }
  }, [isCompact])

  const transformSections: Array<TransformActionSection> = getTransformSections(
    TRANSFORM_DEFINITIONS,
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
            onClick: () => runTransform(definition, runner),
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
          {SYNTAX_OPTIONS.map((option) => (
            <SyntaxOptionButton
              active={syntaxMode === option.value}
              description={option.description}
              key={option.value}
              label={option.label}
              value={option.value}
              onClick={() => {
                setSyntaxMode(option.value)
                setSyntaxModalOpened(false)
              }}
            />
          ))}
        </Stack>
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
          onRestoreCommit={restoreCommit}
          onRestoreCommitParent={restoreCommitParent}
          onRestoreRoot={restoreRootText}
        />
      </AppShell.Navbar>

      <AppShell.Main className="workbenchMain">
        <Box className="editorPanel">
          <EditorToolbar
            sampleOptions={TEXT_SAMPLES}
            syntaxMode={syntaxMode}
            validationEnabled={validationEnabled}
            validationResult={validationResult}
            onChooseSyntax={() => setSyntaxModalOpened(true)}
            onLoadSample={loadSample}
            onToggleValidation={() =>
              setValidationEnabled((enabled) => !enabled)
            }
          />
          <CodeMirror
            aria-label="Text editor"
            className="codeEditor"
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
            onChange={updateEditorValue}
          />
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

  if (id === 'yaml-to-json') {
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
