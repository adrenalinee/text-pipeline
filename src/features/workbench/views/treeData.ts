import { load } from 'js-yaml'

import type { SyntaxMode } from '../types'

export type StructuredTreeNode = {
  children: Array<StructuredTreeNode>
  id: string
  keyLabel: string
  path: string
  type: StructuredTreeNodeType
  value: unknown
}

export type StructuredTreeNodeType =
  | 'array'
  | 'boolean'
  | 'null'
  | 'number'
  | 'object'
  | 'string'
  | 'undefined'

export type StructuredTreeResult =
  | {
      root: StructuredTreeNode
      status: 'valid'
    }
  | {
      message: string
      status: 'invalid'
      title: string
    }

export function parseStructuredTree(
  value: string,
  syntaxMode: Extract<SyntaxMode, 'json' | 'yaml'>,
): StructuredTreeResult {
  try {
    const parsed = syntaxMode === 'json' ? JSON.parse(value) : load(value)

    return {
      root: createTreeNode({
        id: '$',
        keyLabel: '$',
        path: '$',
        value: parsed,
      }),
      status: 'valid',
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : `${syntaxMode.toUpperCase()} could not be parsed.`,
      status: 'invalid',
      title: `Invalid ${syntaxMode.toUpperCase()}`,
    }
  }
}

export function formatTreeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  return JSON.stringify(value, null, 2)
}

function createTreeNode({
  id,
  keyLabel,
  path,
  value,
}: {
  id: string
  keyLabel: string
  path: string
  value: unknown
}): StructuredTreeNode {
  const entries = getChildEntries(value, path)

  return {
    children: entries.map((entry) =>
      createTreeNode({
        id: `${id}.${entry.idPart}`,
        keyLabel: entry.keyLabel,
        path: entry.path,
        value: entry.value,
      }),
    ),
    id,
    keyLabel,
    path,
    type: getNodeType(value),
    value,
  }
}

function getChildEntries(value: unknown, parentPath: string) {
  if (Array.isArray(value)) {
    return value.map((entryValue, index) => ({
      idPart: String(index),
      keyLabel: String(index),
      path: `${parentPath}[${index}]`,
      value: entryValue,
    }))
  }

  if (!isRecord(value)) {
    return []
  }

  return Object.entries(value).map(([key, entryValue]) => ({
    idPart: key,
    keyLabel: key,
    path: getObjectPath(parentPath, key),
    value: entryValue,
  }))
}

function getObjectPath(parentPath: string, key: string) {
  return isIdentifierPathPart(key)
    ? `${parentPath}.${key}`
    : `${parentPath}[${JSON.stringify(key)}]`
}

function getNodeType(value: unknown): StructuredTreeNodeType {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (isRecord(value)) {
    return 'object'
  }

  if (typeof value === 'string') {
    return 'string'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  return 'undefined'
}

function isIdentifierPathPart(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
