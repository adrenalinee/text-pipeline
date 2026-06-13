import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { SyntaxMode } from '../types'
import {
  formatTreeValue,
  parseStructuredTree,
  type StructuredTreeNode,
} from './treeData'

export function StructuredTreeView({
  syntaxMode,
  value,
}: {
  syntaxMode: Extract<SyntaxMode, 'json' | 'yaml'>
  value: string
}) {
  const result = useMemo(
    () => parseStructuredTree(value, syntaxMode),
    [syntaxMode, value],
  )

  if (result.status === 'invalid') {
    return (
      <Box className="formatViewError">
        <Text fw={700} size="sm">
          {result.title}
        </Text>
        <Text c="dimmed" size="sm">
          {result.message}
        </Text>
      </Box>
    )
  }

  return (
    <Box className="treeView" role="tree">
      <TreeNode node={result.root} root />
    </Box>
  )
}

function TreeNode({
  node,
  root = false,
}: {
  node: StructuredTreeNode
  root?: boolean
}) {
  const [opened, setOpened] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <Box
      className="treeNode"
      role="treeitem"
      aria-expanded={hasChildren ? opened : undefined}
    >
      <Group className="treeNodeRow" gap={6} wrap="nowrap">
        {hasChildren ? (
          <ActionIcon
            aria-label={opened ? 'Collapse tree node' : 'Expand tree node'}
            className="treeToggle"
            color="gray"
            size="sm"
            variant="subtle"
            onClick={() => setOpened((current) => !current)}
          >
            {opened ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </ActionIcon>
        ) : (
          <span className="treeToggleSpacer" aria-hidden="true" />
        )}
        <Text className="treeKey" fw={root ? 700 : 650} size="sm">
          {node.keyLabel}
        </Text>
        <Badge className="treeTypeBadge" size="xs" variant="light">
          {node.type}
        </Badge>
        {!hasChildren ? (
          <Text className="treeValue" size="sm">
            {formatTreeValue(node.value)}
          </Text>
        ) : (
          <Text className="treeValue" c="dimmed" size="xs">
            {node.children.length}{' '}
            {Array.isArray(node.value) ? 'items' : 'keys'}
          </Text>
        )}
        <Group className="treeActions" gap={2} wrap="nowrap">
          <CopyButton label="Copy path" value={node.path} />
          <CopyButton label="Copy value" value={formatTreeValue(node.value)} />
        </Group>
      </Group>
      {hasChildren && opened ? (
        <Stack className="treeChildren" gap={2} role="group">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} />
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

function CopyButton({ label, value }: { label: string; value: string }) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        aria-label={label}
        color="gray"
        size="sm"
        variant="subtle"
        onClick={() => copyText(value, label)}
      >
        <Copy size={13} />
      </ActionIcon>
    </Tooltip>
  )
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    notifications.show({
      color: 'green',
      message: `${label} copied to clipboard.`,
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
