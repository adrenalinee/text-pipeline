import {ActionIcon, Button, Group, SegmentedControl, Text, Tooltip } from '@mantine/core'
import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  Code2,
  FileJson,
  GitCommitHorizontal,
  ShieldCheck,
  TextWrap,
} from 'lucide-react'

import type { WorkbenchViewMode } from '../types'
import type { FormatValidationResult } from '../utils/formatValidation'
import {IconGitCommit, IconShieldCheck, IconTextWrap, IconTextWrapDisabled} from "@tabler/icons-react";

export function EditorToolbar({
  activeViewMode,
  canCommitWorkingText,
  formatLabel,
  onChooseSyntax,
  onCommitWorkingText,
  onOpenSamples,
  onSetViewMode,
  onToggleSoftWrap,
  onToggleValidation,
  softWrapEnabled,
  validationEnabled,
  validationResult,
  validationAvailable,
  viewAvailable,
}: {
  activeViewMode: WorkbenchViewMode
  canCommitWorkingText: boolean
  formatLabel: string
  onChooseSyntax: () => void
  onCommitWorkingText: () => void
  onOpenSamples: () => void
  onSetViewMode: (mode: WorkbenchViewMode) => void
  onToggleSoftWrap: () => void
  onToggleValidation: () => void
  softWrapEnabled: boolean
  validationEnabled: boolean
  validationAvailable: boolean
  validationResult: FormatValidationResult | null
  viewAvailable: boolean
}) {
  return (
    <Group className="editorToolbar" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <CircleDot size={14} />
        <Text fw={600} size="sm">
          Text Editor
        </Text>
        <SegmentedControl
          aria-label="Editor view mode"
          className="viewModeTabs"
          data={[
            { label: 'Source', value: 'source' },
            { disabled: !viewAvailable, label: 'View', value: 'view' },
          ]}
          size="xs"
          value={activeViewMode}
          onChange={(value) => onSetViewMode(value as WorkbenchViewMode)}
        />
      </Group>
      <Group className="editorToolbarActions" gap={6} wrap="nowrap">
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

        <Tooltip label="Choose sample data" withArrow>
          <Button
            aria-label="Choose sample data"
            className="sampleButton"
            color="gray"
            leftSection={<FileJson size={14} />}
            size="xs"
            variant="light"
            onClick={onOpenSamples}
          >
            Samples
          </Button>
        </Tooltip>
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
            // className="validationToggle"
            color={getValidationColor(validationResult)}
            disabled={!validationAvailable}
            // leftSection={<ShieldCheck size={14} />}
            // size="xs"
            variant={validationEnabled ? 'filled' : 'light'}
            onClick={onToggleValidation}
          >
            {/*<ShieldCheck size={18} />*/}
            <IconShieldCheck size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={softWrapEnabled ? 'Disable soft wrap' : 'Enable soft wrap'}
          withArrow
        >
          <ActionIcon
            aria-label={
              softWrapEnabled ? 'Disable soft wrap' : 'Enable soft wrap'
            }
            aria-pressed={softWrapEnabled}
            color="dark"
            variant={softWrapEnabled ? 'filled' : 'light'}
            onClick={onToggleSoftWrap}
          >
            {softWrapEnabled ? (
              <IconTextWrapDisabled size={18} />
            ) : (
              <IconTextWrap size={18} />
            )}
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={
            canCommitWorkingText
              ? 'Commit current editor text'
              : 'No editor changes to commit'
          }
          withArrow
        >
          <ActionIcon
            aria-label="Commit current editor text"
            color={canCommitWorkingText ? 'green' : 'gray'}
            disabled={!canCommitWorkingText}
            variant={canCommitWorkingText ? 'filled' : 'light'}
            onClick={onCommitWorkingText}
          >
            <IconGitCommit size={18} />
          </ActionIcon>
        </Tooltip>
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
