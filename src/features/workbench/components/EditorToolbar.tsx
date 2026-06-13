import {
  Button,
  Group,
  Menu,
  SegmentedControl,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Code2,
  FileJson,
  ShieldCheck,
} from 'lucide-react'

import type { WorkbenchViewMode } from '../types'
import type { TextSample } from '../samples'
import type { FormatValidationResult } from '../utils/formatValidation'

export function EditorToolbar({
  activeViewMode,
  formatLabel,
  onLoadSample,
  onChooseSyntax,
  onSetViewMode,
  onToggleValidation,
  sampleOptions,
  validationEnabled,
  validationResult,
  validationAvailable,
  viewAvailable,
}: {
  activeViewMode: WorkbenchViewMode
  formatLabel: string
  onChooseSyntax: () => void
  onLoadSample: (sample: TextSample) => void
  onSetViewMode: (mode: WorkbenchViewMode) => void
  onToggleValidation: () => void
  sampleOptions: ReadonlyArray<TextSample>
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
      </Group>
      <Group className="editorToolbarActions" gap={6} wrap="nowrap">
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
        <SampleMenu sampleOptions={sampleOptions} onLoadSample={onLoadSample} />
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
          <Button
            aria-label={
              !validationAvailable
                ? 'Validation is not available for this format'
                : validationEnabled
                  ? 'Disable format validation'
                  : 'Enable format validation'
            }
            aria-pressed={validationEnabled}
            className="validationToggle"
            color={getValidationColor(validationResult)}
            disabled={!validationAvailable}
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
            {formatLabel}
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
  const hasSamples = sampleOptions.length > 0

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
          disabled={!hasSamples}
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
