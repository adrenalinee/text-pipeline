import { Group, Select, Text, Tooltip, UnstyledButton } from '@mantine/core'
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Code2,
  FileCode2,
  MapPin,
  ShieldCheck,
  ShieldQuestion,
  TextSelect,
} from 'lucide-react'

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
  onChooseEncoding,
  onChooseSqlDialect,
  onChooseSyntax,
  onGoToLine,
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
  onChooseEncoding: () => void
  onChooseSqlDialect?: (id: string) => void
  onChooseSyntax: () => void
  onGoToLine: () => void
  onToggleValidation: () => void
  selection: StatusBarSelectionInfo | null
  sqlDialectId?: string
  sqlDialectOptions?: Array<{ label: string; value: string }>
  validationAvailable: boolean
  validationEnabled: boolean
  validationResult: FormatValidationResult | null
}) {
  const isSource = activeViewMode === 'source'

  return (
    <Group className="statusBar" justify="space-between" wrap="nowrap">
      <Group className="statusBarGroup statusBarGroupLeft" gap={4} wrap="nowrap">
        <Tooltip label="Change format and syntax highlighting" withArrow>
          <UnstyledButton
            aria-label="Change format and syntax highlighting"
            className="statusBarButton statusBarFormatButton"
            onClick={onChooseSyntax}
          >
            <Code2 className="statusBarButtonIcon" size={14} />
            <span className="statusBarButtonLabel">{formatLabel}</span>
            <ChevronDown className="statusBarButtonCaret" size={12} />
          </UnstyledButton>
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
      </Group>

      <Group
        className="statusBarGroup statusBarGroupRight"
        gap={4}
        wrap="nowrap"
      >
        <Tooltip
          label={`${lineCount} line${lineCount === 1 ? '' : 's'}, ${charCount} character${charCount === 1 ? '' : 's'} total`}
          withArrow
        >
          <Group className="statusBarMetric" gap={10} wrap="nowrap">
            <span className="statusBarMetricItem">
              <span className="statusBarMetricValue">{lineCount}</span>
              <span className="statusBarMetricUnit">
                {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </span>
            <span className="statusBarMetricItem">
              <span className="statusBarMetricValue">{charCount}</span>
              <span className="statusBarMetricUnit">
                {charCount === 1 ? 'char' : 'chars'}
              </span>
            </span>
          </Group>
        </Tooltip>

        {selection && (
          <Tooltip
            label={`Selected ${selection.charCount} character${
              selection.charCount === 1 ? '' : 's'
            } across ${selection.lineCount} line${
              selection.lineCount === 1 ? '' : 's'
            }`}
            withArrow
          >
            <Group className="statusBarSelection" gap={6} wrap="nowrap">
              <TextSelect size={13} />
              <span>
                {selection.charCount} chars
                {selection.lineCount > 1
                  ? `, ${selection.lineCount} lines`
                  : ''}
              </span>
            </Group>
          </Tooltip>
        )}

        <span className="statusBarDivider" aria-hidden="true" />

        {isSource && (
          <Tooltip label="Go to line and column" withArrow>
            <UnstyledButton
              aria-label="Go to line and column"
              className="statusBarButton"
              onClick={onGoToLine}
            >
              <MapPin className="statusBarButtonIcon" size={13} />
              <span className="statusBarButtonLabel">
                {cursor.line}:{cursor.column}
              </span>
            </UnstyledButton>
          </Tooltip>
        )}

        <Tooltip label="Change encoding" withArrow>
          <UnstyledButton
            aria-label="Change encoding"
            className="statusBarButton"
            onClick={onChooseEncoding}
          >
            <FileCode2 className="statusBarButtonIcon" size={13} />
            <span className="statusBarButtonLabel">{encoding}</span>
          </UnstyledButton>
        </Tooltip>

        <span className="statusBarDivider" aria-hidden="true" />

        <ValidationStatusButton
          available={validationAvailable}
          enabled={validationEnabled}
          result={validationEnabled ? validationResult : null}
          onToggle={onToggleValidation}
        />
      </Group>
    </Group>
  )
}

function ValidationStatusButton({
  available,
  enabled,
  onToggle,
  result,
}: {
  available: boolean
  enabled: boolean
  onToggle: () => void
  result: FormatValidationResult | null
}) {
  const tooltip = !available
    ? 'Validation is not available for this format'
    : enabled
      ? (result?.message ?? 'Disable format validation')
      : 'Enable format validation'

  const status = !available
    ? 'unavailable'
    : !enabled
      ? 'off'
      : (result?.status ?? 'pending')

  const label = !available
    ? 'Validation'
    : !enabled
      ? 'Validate'
      : status === 'valid'
        ? 'Valid'
        : status === 'invalid'
          ? 'Invalid'
          : (result?.title ?? 'Validating')

  const icon =
    status === 'valid' ? (
      <CircleCheck size={13} />
    ) : status === 'invalid' ? (
      <CircleAlert size={13} />
    ) : status === 'unavailable' ? (
      <ShieldQuestion size={13} />
    ) : (
      <ShieldCheck size={13} />
    )

  return (
    <Tooltip label={tooltip} withArrow>
      <UnstyledButton
        aria-label={tooltip}
        aria-pressed={available ? enabled : undefined}
        className="statusBarButton statusBarValidation"
        data-status={status}
        disabled={!available}
        onClick={available ? onToggle : undefined}
      >
        {icon}
        <Text className="statusBarButtonLabel" span>
          {label}
        </Text>
      </UnstyledButton>
    </Tooltip>
  )
}
