import { ActionIcon, Button, Group, Select, Text, Tooltip } from '@mantine/core'
import { CircleAlert, CircleCheck, Code2, ShieldCheck } from 'lucide-react'
import { IconShieldCheck } from '@tabler/icons-react'

import type { WorkbenchViewMode } from '../types'
import type { FormatValidationResult } from '../utils/formatValidation'

export type StatusBarCursorInfo = {
  column: number
  line: number
}

export type StatusBarSelectionInfo = {
  charCount: number
  lineCount: number
}

export function StatusBar({
  activeViewMode,
  charCount,
  cursor,
  encoding,
  formatLabel,
  lineCount,
  onChooseSqlDialect,
  onChooseSyntax,
  onToggleValidation,
  selection,
  sqlDialectId,
  sqlDialectOptions,
  validationAvailable,
  validationEnabled,
  validationResult,
}: {
  activeViewMode: WorkbenchViewMode
  charCount: number
  cursor: StatusBarCursorInfo
  encoding: string
  formatLabel: string
  lineCount: number
  onChooseSqlDialect?: (id: string) => void
  onChooseSyntax: () => void
  onToggleValidation: () => void
  selection: StatusBarSelectionInfo | null
  sqlDialectId?: string
  sqlDialectOptions?: Array<{ label: string; value: string }>
  validationAvailable: boolean
  validationEnabled: boolean
  validationResult: FormatValidationResult | null
}) {
  return (
    <Group className="statusBar" justify="space-between" wrap="nowrap">
      <Group className="statusBarFormat" gap={6} wrap="nowrap">
        <Tooltip label="Choose text format" withArrow>
          <Button
            aria-label="Choose text format"
            className="syntaxButton"
            color="gray"
            leftSection={<Code2 size={14} />}
            size="xs"
            variant="light"
            onClick={onChooseSyntax}
          >
            {formatLabel}
          </Button>
        </Tooltip>
        {sqlDialectOptions && sqlDialectId && onChooseSqlDialect && (
          <Select
            aria-label="SQL dialect"
            className="dialectSelect"
            data={sqlDialectOptions}
            maxDropdownHeight={400}
            size="xs"
            value={sqlDialectId}
            withCheckIcon={false}
            onChange={(value) => {
              if (value) onChooseSqlDialect(value)
            }}
          />
        )}
        <FormatValidationStatus
          result={validationEnabled ? validationResult : null}
        />
        <Tooltip
          label={
            !validationAvailable
              ? 'Validation is not available for this format'
              : validationEnabled
                ? 'Disable format validation'
                : 'Enable format validation'
          }
          withArrow
        >
          <ActionIcon
            aria-label={
              !validationAvailable
                ? 'Validation is not available for this format'
                : validationEnabled
                  ? 'Disable format validation'
                  : 'Enable format validation'
            }
            aria-pressed={validationEnabled}
            color={getValidationColor(validationResult)}
            disabled={!validationAvailable}
            variant={validationEnabled ? 'filled' : 'light'}
            onClick={onToggleValidation}
          >
            <IconShieldCheck size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group className="statusBarMetrics" gap="md" wrap="nowrap">
        {activeViewMode === 'source' && (
          <Text className="statusBarItem" size="xs">
            Ln {cursor.line}, Col {cursor.column}
          </Text>
        )}
        {selection && (
          <Text className="statusBarItem" size="xs">
            Selected {selection.lineCount} ln, {selection.charCount} ch
          </Text>
        )}
        <Text className="statusBarItem" size="xs">
          {lineCount} lines, {charCount} chars
        </Text>
        <Text className="statusBarItem" size="xs">
          {encoding}
        </Text>
      </Group>
    </Group>
  )
}

function FormatValidationStatus({
  result,
}: {
  result: FormatValidationResult | null
}) {
  if (!result) {
    return (
      <Group
        aria-hidden="true"
        className="validationStatus"
        data-empty
        gap={4}
        wrap="nowrap"
      >
        <ShieldCheck size={13} />
        <Text className="validationStatusText" size="xs">
          Validation
        </Text>
      </Group>
    )
  }

  const isValid = result.status === 'valid'
  const isInvalid = result.status === 'invalid'
  const icon = isInvalid ? (
    <CircleAlert size={13} />
  ) : isValid ? (
    <CircleCheck size={13} />
  ) : (
    <ShieldCheck size={13} />
  )

  return (
    <Tooltip label={result.message} withArrow>
      <Group
        className="validationStatus"
        data-status={result.status}
        gap={4}
        wrap="nowrap"
      >
        {icon}
        <Text className="validationStatusText" size="xs">
          {result.title}
        </Text>
      </Group>
    </Tooltip>
  )
}

function getValidationColor(result: FormatValidationResult | null) {
  if (!result) {
    return 'gray'
  }

  if (result.status === 'invalid') {
    return 'red'
  }

  if (result.status === 'valid') {
    return 'green'
  }

  return 'gray'
}
