import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Code,
  Divider,
  Group,
  MantineProvider,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import {
  Braces,
  CircleDot,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sun,
  Workflow,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Workbench />
    </MantineProvider>
  )
}

function Workbench() {
  const [leftOpened, setLeftOpened] = useState(true)
  const [rightOpened, setRightOpened] = useState(true)
  const [editorValue, setEditorValue] = useState(
    '{\n  "service": "text-pipeline",\n  "status": "draft"\n}',
  )
  const { setColorScheme } = useMantineColorScheme()
  const isCompact = useMediaQuery('(max-width: 48em)')
  const computedColorScheme = useComputedColorScheme('dark', {
    getInitialValueInEffect: true,
  })
  const isDark = computedColorScheme === 'dark'

  useEffect(() => {
    if (isCompact) {
      setLeftOpened(false)
      setRightOpened(false)
    }
  }, [isCompact])

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
        <SidebarSection title="Flow">
          <Stack gap={6}>
            <FlowItem active label="Input" meta="root" />
            <FlowItem label="Draft result" meta="current" />
          </Stack>
        </SidebarSection>
        <Divider />
        <SidebarSection title="Transforms">
          <Stack gap={6}>
            <SideAction icon={<Braces size={15} />} label="JSON" />
            <SideAction icon={<Search size={15} />} label="Extract" />
          </Stack>
        </SidebarSection>
      </AppShell.Navbar>

      <AppShell.Main className="workbenchMain">
        <Box className="editorPanel">
          <Group className="editorToolbar" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <CircleDot size={14} />
              <Text fw={600} size="sm">
                Text Editor
              </Text>
            </Group>
            <Code fz="xs">plain text</Code>
          </Group>
          <textarea
            aria-label="Text editor"
            className="textEditor"
            spellCheck={false}
            value={editorValue}
            onChange={(event) => setEditorValue(event.currentTarget.value)}
          />
        </Box>
      </AppShell.Main>

      <AppShell.Aside className="workbenchSidebar">
        <SidebarSection title="Inspector">
          <Stack gap="xs">
            <MetaRow label="Characters" value={String(editorValue.length)} />
            <MetaRow
              label="Lines"
              value={String(editorValue.split(/\r\n|\r|\n/).length)}
            />
            <MetaRow label="Selected step" value="Input" />
          </Stack>
        </SidebarSection>
        <Divider />
        <SidebarSection title="Context">
          <Text size="xs" c="dimmed">
            Local workspace
          </Text>
        </SidebarSection>
      </AppShell.Aside>
    </AppShell>
  )
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

function SidebarSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <ScrollArea.Autosize mah="50vh" type="hover">
      <Stack gap="xs" p="sm">
        <Text fw={700} size="xs" tt="uppercase" c="dimmed">
          {title}
        </Text>
        {children}
      </Stack>
    </ScrollArea.Autosize>
  )
}

function FlowItem({
  active,
  label,
  meta,
}: {
  active?: boolean
  label: string
  meta: string
}) {
  return (
    <Box className="flowItem" data-active={active || undefined}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {meta}
      </Text>
    </Box>
  )
}

function SideAction({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <Group className="sideAction" gap="xs" wrap="nowrap">
      {icon}
      <Text size="sm">{label}</Text>
    </Group>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="sm" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Code fz="xs">{value}</Code>
    </Group>
  )
}
