import { Button, Group, Text, Tooltip } from '@mantine/core'
import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  Code2,
  ShieldCheck,
} from 'lucide-react'

import type { SyntaxMode } from '../types'
import type { FormatValidationResult } from '../utils/formatValidation'

const SYNTAX_LABELS: Record<SyntaxMode, string> = {
  json: 'JSON',
  plain: 'Text',
  yaml: 'YAML',
}

export function EditorToolbar({
  onChooseSyntax,
  onToggleValidation,
  syntaxMode,
  validationEnabled,
  validationResult,
}: {
  onChooseSyntax: () => void
  onToggleValidation: () => void
  syntaxMode: SyntaxMode
  validationEnabled: boolean
  validationResult: FormatValidationResult | null
}) {
  return (
    <Group className="editorToolbar" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <CircleDot size={14} />
        <Text fw={600} size="sm">
          Text Editor
        </Text>
      </Group>
      <Group className="editorToolbarActions" gap={6} wrap="nowrap">
        <FormatValidationStatus
          result={validationEnabled ? validationResult : null}
        />
        <Tooltip
          label={
            validationEnabled
              ? 'Disable format validation'
              : 'Enable format validation'
          }
          withArrow
        >
          <Button
            aria-label={
              validationEnabled
                ? 'Disable format validation'
                : 'Enable format validation'
            }
            aria-pressed={validationEnabled}
            className="validationToggle"
            color={getValidationColor(validationResult)}
            leftSection={<ShieldCheck size={14} />}
            size="xs"
            variant={validationEnabled ? 'filled' : 'light'}
            onClick={onToggleValidation}
          >
            Validate
          </Button>
        </Tooltip>
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
            {SYNTAX_LABELS[syntaxMode]}
          </Button>
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
