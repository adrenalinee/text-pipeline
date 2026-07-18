import { Badge, Box, Group, SegmentedControl, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import { Diff, parseDiff } from 'react-diff-view'
import type { FileData, ViewType } from 'react-diff-view'
import 'react-diff-view/style/index.css'

type ParsedDiff =
  | { files: Array<FileData>; status: 'valid' }
  | { message: string; status: 'invalid' }

export function DiffPatchView({ value }: { value: string }) {
  const isCompact = useMediaQuery('(max-width: 48em)')
  const [selectedViewType, setSelectedViewType] = useState<ViewType>('split')
  const result = useMemo(() => parsePatch(value), [value])
  const viewType = isCompact ? 'unified' : selectedViewType

  if (result.status === 'invalid') {
    return (
      <Box className="formatViewError" role="alert">
        <Text fw={700} size="sm">
          Unable to render this diff
        </Text>
        <Text c="dimmed" size="sm">
          {result.message}
        </Text>
      </Box>
    )
  }

  return (
    <Box className="diffPatchView">
      <Group className="diffPatchToolbar" justify="space-between" wrap="nowrap">
        <Text c="dimmed" size="xs">
          {result.files.length} {result.files.length === 1 ? 'file' : 'files'}
        </Text>
        {isCompact ? (
          <Badge color="gray" size="sm" variant="light">
            Unified
          </Badge>
        ) : (
          <SegmentedControl
            aria-label="Diff layout"
            data={[
              { label: 'Split', value: 'split' },
              { label: 'Unified', value: 'unified' },
            ]}
            size="xs"
            value={selectedViewType}
            onChange={setSelectedViewType}
          />
        )}
      </Group>
      {result.files.map((file, index) => (
        <DiffFile
          key={`${file.oldPath}:${file.newPath}:${index}`}
          file={file}
          viewType={viewType}
        />
      ))}
    </Box>
  )
}

function DiffFile({ file, viewType }: { file: FileData; viewType: ViewType }) {
  const path = formatFilePath(file)

  return (
    <Box className="diffPatchFile">
      <Group className="diffPatchFileHeader" gap="xs" wrap="nowrap">
        <Text className="diffPatchFilePath" fw={650} size="sm" title={path}>
          {path}
        </Text>
        <Badge color={badgeColor(file.type)} size="xs" variant="light">
          {file.type}
        </Badge>
      </Group>
      {file.hunks.length > 0 ? (
        <Box className="diffPatchFileBody">
          <Diff diffType={file.type} hunks={file.hunks} viewType={viewType} />
        </Box>
      ) : (
        <Text c="dimmed" p="sm" size="sm">
          No text hunks to display.
        </Text>
      )}
    </Box>
  )
}

function parsePatch(value: string): ParsedDiff {
  if (!value.trim()) {
    return {
      message: 'Paste a unified diff in Source mode first.',
      status: 'invalid',
    }
  }

  try {
    const parsedFiles = parseDiff(value)
    const headerPaths = extractUnifiedFilePaths(value)
    const files = parsedFiles.map((file, index) => ({
      ...file,
      oldPath: file.oldPath || headerPaths[index]?.oldPath || '',
      newPath: file.newPath || headerPaths[index]?.newPath || '',
    }))

    if (
      files.length === 0 ||
      files.every(
        (file) =>
          file.hunks.length === 0 &&
          !file.isBinary &&
          !file.oldPath &&
          !file.newPath,
      )
    ) {
      return {
        message: 'No unified diff file headers or hunks were found.',
        status: 'invalid',
      }
    }

    return { files, status: 'valid' }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : 'The diff could not be parsed.',
      status: 'invalid',
    }
  }
}

function extractUnifiedFilePaths(value: string) {
  const lines = value.split(/\r?\n/)
  const paths: Array<{ newPath: string; oldPath: string }> = []

  for (let index = 0; index < lines.length - 1; index += 1) {
    const oldHeader = lines[index]
    const newHeader = lines[index + 1]

    if (oldHeader.startsWith('--- ') && newHeader.startsWith('+++ ')) {
      paths.push({
        newPath: normalizeHeaderPath(newHeader.slice(4)),
        oldPath: normalizeHeaderPath(oldHeader.slice(4)),
      })
      index += 1
    }
  }

  return paths
}

function normalizeHeaderPath(header: string) {
  const path = header.split('\t', 1)[0].trim()
  if (path === '/dev/null') return ''
  return path.startsWith('a/') || path.startsWith('b/') ? path.slice(2) : path
}

function formatFilePath(file: FileData) {
  if (file.oldPath === file.newPath || !file.oldPath) return file.newPath
  if (!file.newPath) return file.oldPath
  return `${file.oldPath} -> ${file.newPath}`
}

function badgeColor(type: FileData['type']) {
  if (type === 'add') return 'green'
  if (type === 'delete') return 'red'
  if (type === 'rename' || type === 'copy') return 'blue'
  return 'gray'
}
