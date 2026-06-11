import { Button, Group, Menu, Text, Tooltip } from '@mantine/core'
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Code2,
  FileJson,
  ShieldCheck,
} from 'lucide-react'

import type { SyntaxMode } from '../types'
import type { TextSample } from '../samples'
import type { FormatValidationResult } from '../utils/formatValidation'

const SYNTAX_LABELS: Record<SyntaxMode, string> = {
  json: 'JSON',
  markdown: 'Markdown',
  plain: 'Text',
  toml: 'TOML',
  yaml: 'YAML',
}

export function EditorToolbar({
  onLoadSample,
  onChooseSyntax,
  onToggleValidation,
  sampleOptions,
  syntaxMode,
  validationEnabled,
  validationResult,
}: {
  onChooseSyntax: () => void
  onLoadSample: (sample: TextSample) => void
  onToggleValidation: () => void
  sampleOptions: ReadonlyArray<TextSample>
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
        <SampleMenu sampleOptions={sampleOptions} onLoadSample={onLoadSample} />
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

function SampleMenu({
  onLoadSample,
  sampleOptions,
}: {
  onLoadSample: (sample: TextSample) => void
  sampleOptions: ReadonlyArray<TextSample>
}) {
  return (
    <Menu position="bottom-end" shadow="md" width={240} withinPortal>
      <Menu.Target>
        <Button
          aria-label="Load sample data"
          className="sampleButton"
          color="gray"
          leftSection={<FileJson size={14} />}
          rightSection={
            <ChevronDown className="sampleButtonChevron" size={13} />
          }
          size="xs"
          variant="light"
        >
          Samples
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {sampleOptions.map((sample) => (
          <Menu.Item
            key={sample.id}
            leftSection={<SampleIcon syntaxMode={sample.syntaxMode} />}
            onClick={() => onLoadSample(sample)}
          >
            <Text fw={650} size="sm">
              {sample.label}
            </Text>
            <Text c="dimmed" size="xs">
              {sample.description}
            </Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

function SampleIcon({ syntaxMode }: { syntaxMode: TextSample['syntaxMode'] }) {
  if (syntaxMode === 'json') {
    return <FileJson size={14} />
  }

  return <Code2 size={14} />
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
