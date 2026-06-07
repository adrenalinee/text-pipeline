import { load } from 'js-yaml'
import { parse as parseToml } from 'smol-toml'

import type { SyntaxMode } from '../types'

export type FormatValidationIssue = {
  column: number
  line: number
  position?: number
}

export type FormatValidationResult = {
  issue?: FormatValidationIssue
  message: string
  status: 'invalid' | 'unsupported' | 'valid'
  title: string
}

export function validateFormat(
  value: string,
  syntaxMode: SyntaxMode,
): FormatValidationResult {
  if (syntaxMode === 'plain') {
    return {
      message: 'Plain text has no syntax validator.',
      status: 'unsupported',
      title: 'No validator',
    }
  }

  if (syntaxMode === 'json') {
    return validateJson(value)
  }

  if (syntaxMode === 'yaml') {
    return validateYaml(value)
  }

  return validateToml(value)
}

function validateJson(value: string): FormatValidationResult {
  try {
    JSON.parse(value)

    return {
      message: 'No JSON syntax errors found.',
      status: 'valid',
      title: 'Valid JSON',
    }
  } catch (error) {
    const issue =
      error instanceof Error
        ? getJsonErrorIssue(error.message, value)
        : undefined

    return {
      issue,
      message: formatInvalidMessage(
        error instanceof Error ? error.message : 'JSON syntax is invalid.',
        issue,
      ),
      status: 'invalid',
      title: formatInvalidTitle('JSON', issue),
    }
  }
}

function validateYaml(value: string): FormatValidationResult {
  try {
    load(value)

    return {
      message: isJsonLike(value)
        ? 'JSON-style input is valid YAML flow syntax.'
        : 'No YAML syntax errors found.',
      status: 'valid',
      title: 'Valid YAML',
    }
  } catch (error) {
    const issue = getYamlErrorIssue(error)

    return {
      issue,
      message: formatInvalidMessage(
        error instanceof Error ? error.message : 'YAML syntax is invalid.',
        issue,
      ),
      status: 'invalid',
      title: formatInvalidTitle('YAML', issue),
    }
  }
}

function validateToml(value: string): FormatValidationResult {
  try {
    parseToml(value)

    return {
      message: 'No TOML syntax errors found.',
      status: 'valid',
      title: 'Valid TOML',
    }
  } catch (error) {
    const issue = getTomlErrorIssue(error)

    return {
      issue,
      message: formatInvalidMessage(
        error instanceof Error ? error.message : 'TOML syntax is invalid.',
        issue,
      ),
      status: 'invalid',
      title: formatInvalidTitle('TOML', issue),
    }
  }
}

function isJsonLike(value: string) {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function getYamlErrorIssue(
  error: unknown,
): FormatValidationIssue | undefined {
  if (!isRecord(error) || !isRecord(error.mark)) {
    return undefined
  }

  const { column, line, position } = error.mark

  if (typeof line !== 'number' || typeof column !== 'number') {
    return undefined
  }

  return {
    column: column + 1,
    line: line + 1,
    position: typeof position === 'number' ? position : undefined,
  }
}

export function getTomlErrorIssue(
  error: unknown,
): FormatValidationIssue | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  const { column, line } = error

  if (typeof line !== 'number' || typeof column !== 'number') {
    return undefined
  }

  return {
    column,
    line,
  }
}

function getJsonErrorIssue(
  message: string,
  value: string,
): FormatValidationIssue | undefined {
  const lineColumnMatch = message.match(/at line (\d+) column (\d+)/)

  if (lineColumnMatch?.[1] && lineColumnMatch[2]) {
    return {
      column: Number(lineColumnMatch[2]),
      line: Number(lineColumnMatch[1]),
    }
  }

  const positionMatch = message.match(/at position (\d+)/)

  if (!positionMatch?.[1]) {
    return undefined
  }

  return getIssueFromPosition(value, Number(positionMatch[1]))
}

function getIssueFromPosition(
  value: string,
  position: number,
): FormatValidationIssue {
  const normalizedPosition = Math.max(0, Math.min(position, value.length))
  const beforeError = value.slice(0, normalizedPosition)
  const lines = beforeError.split(/\r\n|\r|\n/)

  return {
    column: lines.at(-1)?.length ? lines.at(-1)!.length + 1 : 1,
    line: lines.length,
    position: normalizedPosition,
  }
}

function formatInvalidMessage(
  message: string,
  issue: FormatValidationIssue | undefined,
) {
  if (!issue) {
    return message
  }

  return `${message} Line ${issue.line}, column ${issue.column}.`
}

function formatInvalidTitle(
  format: 'JSON' | 'TOML' | 'YAML',
  issue: FormatValidationIssue | undefined,
) {
  return issue ? `${format} line ${issue.line}` : `Invalid ${format}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
