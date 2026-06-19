import { load } from 'js-yaml'
import { parseFragment } from 'parse5'
import type { ParserError } from 'parse5'
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

const UNVALIDATED_FORMAT_LABELS: Partial<Record<SyntaxMode, string>> = {
  diff: 'Diff',
  markdown: 'Markdown',
  plain: 'Plain text',
  sql: 'SQL',
}

export function validateFormat(
  value: string,
  syntaxMode: SyntaxMode,
): FormatValidationResult {
  if (syntaxMode === 'json') {
    return validateJson(value)
  }

  if (syntaxMode === 'html') {
    return validateHtml(value)
  }

  if (syntaxMode === 'yaml') {
    return validateYaml(value)
  }

  if (syntaxMode === 'toml') {
    return validateToml(value)
  }

  if (syntaxMode === 'xml') {
    return validateXml(value)
  }

  if (syntaxMode === 'csv') {
    return validateCsv(value)
  }

  return unsupportedValidationResult(
    UNVALIDATED_FORMAT_LABELS[syntaxMode] ?? 'This format',
  )
}

function unsupportedValidationResult(format: string): FormatValidationResult {
  return {
    message: `${format} has no syntax validator.`,
    status: 'unsupported',
    title: 'No validator',
  }
}

function validateHtml(value: string): FormatValidationResult {
  const errors: Array<ParserError> = []

  parseFragment(value, {
    onParseError: (error) => errors.push(error),
  })

  if (errors.length === 0) {
    return {
      message:
        'No HTML parse errors found. Browser-recovered structure issues may still exist.',
      status: 'valid',
      title: 'Valid HTML',
    }
  }

  const error = errors[0]
  const issue = getHtmlErrorIssue(error)
  const message = `HTML parse error: ${formatHtmlParseError(error.code)}.`

  return {
    issue,
    message: formatInvalidMessage(message, issue),
    status: 'invalid',
    title: formatInvalidTitle('HTML', issue),
  }
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

function validateXml(value: string): FormatValidationResult {
  const error = getXmlError(value)

  if (!error) {
    return {
      message: 'No XML syntax errors found.',
      status: 'valid',
      title: 'Valid XML',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('XML', error.issue),
  }
}

function validateCsv(value: string): FormatValidationResult {
  const error = getCsvError(value)

  if (!error) {
    return {
      message: 'No CSV structure errors found.',
      status: 'valid',
      title: 'Valid CSV',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('CSV', error.issue),
  }
}

export type FormatSyntaxError = {
  issue?: FormatValidationIssue
  message: string
}

// XML well-formedness via the browser DOMParser. Returns null when the input is
// well-formed, empty, or DOMParser is unavailable (e.g. server-side rendering).
export function getXmlError(value: string): FormatSyntaxError | null {
  if (value.trim().length === 0 || typeof DOMParser === 'undefined') {
    return null
  }

  const doc = new DOMParser().parseFromString(value, 'application/xml')
  const parseErrors = doc.getElementsByTagName('parsererror')

  if (parseErrors.length === 0) {
    return null
  }

  const text = parseErrors[0].textContent

  return {
    issue: getXmlErrorIssue(text),
    message: buildXmlErrorMessage(text),
  }
}

function getXmlErrorIssue(text: string): FormatValidationIssue | undefined {
  // Browser parsererror text formats differ: jsdom "1:17: msg",
  // Chrome "error on line 1 at column 17", Firefox "Line Number 1, Column 17".
  const patterns = [
    /^\s*(\d+):(\d+):/,
    /line\s+(\d+)\s+at\s+column\s+(\d+)/i,
    /line\s+number\s+(\d+),\s+column\s+(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match && match[1] && match[2]) {
      return { column: Number(match[2]), line: Number(match[1]) }
    }
  }

  return undefined
}

function buildXmlErrorMessage(text: string): string {
  const jsdomMatch = text.match(/^\s*\d+:\d+:\s*(.+)$/m)

  if (jsdomMatch && jsdomMatch[1]) {
    return `XML parse error: ${jsdomMatch[1].trim()}`
  }

  const browserMatch = text.match(/(?:error on |)line\s+\d+.*?:\s*(.+)/i)

  if (browserMatch && browserMatch[1]) {
    return `XML parse error: ${browserMatch[1].trim()}`
  }

  return 'XML is not well-formed.'
}

type CsvRecord = { fieldCount: number; line: number }

// Lightweight RFC 4180 row scan: flags unterminated quoted fields and rows whose
// column count diverges from the header. Returns null when the input is empty or
// structurally consistent.
export function getCsvError(value: string): FormatSyntaxError | null {
  if (value.trim().length === 0) {
    return null
  }

  const records: Array<CsvRecord> = []
  let fieldCount = 1
  let line = 1
  let recordStartLine = 1
  let inQuotes = false
  let sawContent = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (inQuotes) {
      if (character === '"') {
        if (value[index + 1] === '"') {
          index += 1
          continue
        }

        inQuotes = false
      } else if (character === '\n') {
        line += 1
      }

      continue
    }

    if (character === '"') {
      inQuotes = true
      sawContent = true
    } else if (character === ',') {
      fieldCount += 1
      sawContent = true
    } else if (character === '\n') {
      if (sawContent || fieldCount > 1) {
        records.push({ fieldCount, line: recordStartLine })
      }

      line += 1
      fieldCount = 1
      sawContent = false
      recordStartLine = line
    } else if (character !== '\r') {
      sawContent = true
    }
  }

  if (inQuotes) {
    return {
      issue: { column: 1, line: recordStartLine },
      message: 'CSV has an unterminated quoted field.',
    }
  }

  if (sawContent || fieldCount > 1) {
    records.push({ fieldCount, line: recordStartLine })
  }

  if (records.length === 0) {
    return null
  }

  const expected = records[0].fieldCount
  const mismatch = records.find((record) => record.fieldCount !== expected)

  if (mismatch) {
    return {
      issue: { column: 1, line: mismatch.line },
      message: `CSV row has ${mismatch.fieldCount} columns but the header row has ${expected}.`,
    }
  }

  return null
}

function isJsonLike(value: string) {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function getHtmlErrorIssue(
  error: ParserError,
): FormatValidationIssue | undefined {
  if (error.startLine < 1 || error.startCol < 1) {
    return undefined
  }

  return {
    column: error.startCol,
    line: error.startLine,
    position: error.startOffset >= 0 ? error.startOffset : undefined,
  }
}

export function formatHtmlParseError(code: string) {
  return code.replaceAll('-', ' ')
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
  format: 'CSV' | 'HTML' | 'JSON' | 'TOML' | 'XML' | 'YAML',
  issue: FormatValidationIssue | undefined,
) {
  return issue ? `${format} line ${issue.line}` : `Invalid ${format}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
