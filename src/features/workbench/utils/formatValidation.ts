import type { Parser } from 'node-sql-parser'
import type { ParserError } from 'parse5'

import type { FormatValidationIssue, FormatValidationResult } from '../types'

export type { FormatValidationIssue, FormatValidationResult } from '../types'

// node-sql-parser is dialect-specific; SQL valid in another dialect may be
// flagged here. Change this single constant to switch dialects.
const SQL_DIALECT = 'PostgreSQL'

// node-sql-parser is heavy, so load it lazily (and only once) on first SQL
// validation rather than statically importing it into the initial bundle.
let sqlParserPromise: Promise<Parser> | null = null

function loadSqlParser(): Promise<Parser> {
  if (!sqlParserPromise) {
    sqlParserPromise = import('node-sql-parser').then(
      (module) => new module.Parser(),
    )
  }

  return sqlParserPromise
}

export async function validateHtml(
  value: string,
): Promise<FormatValidationResult> {
  const { parseFragment } = await import('parse5')
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

export function validateJson(value: string): FormatValidationResult {
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

export async function validateYaml(
  value: string,
): Promise<FormatValidationResult> {
  const { load } = await import('js-yaml')

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

export async function validateToml(
  value: string,
): Promise<FormatValidationResult> {
  const { parse: parseToml } = await import('smol-toml')

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

export function validateXml(value: string): FormatValidationResult {
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

export function validateCsv(value: string): FormatValidationResult {
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

export async function validateSql(
  value: string,
): Promise<FormatValidationResult> {
  const error = await getSqlError(value)

  if (!error) {
    return {
      message: 'No SQL syntax errors found.',
      status: 'valid',
      title: 'Valid SQL',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('SQL', error.issue),
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

// SQL syntax check via node-sql-parser. Validation is dialect-specific;
// statements valid in another dialect may be reported here.
// Pass database = null to skip parsing (generic SQL has no dialect validator).
export async function getSqlError(
  value: string,
  database: string | null = SQL_DIALECT,
): Promise<FormatSyntaxError | null> {
  if (database === null || value.trim().length === 0) {
    return null
  }

  const parser = await loadSqlParser()

  try {
    parser.astify(value, { database })
    return null
  } catch (error) {
    return {
      issue: getSqlErrorIssue(error),
      message: buildSqlErrorMessage(error),
    }
  }
}

// Validate SQL with a runtime-selected dialect. Returns an unsupported result
// when parserDatabase is null (Generic SQL).
export async function validateSqlDialect(
  value: string,
  parserDatabase: string | null,
): Promise<FormatValidationResult> {
  if (parserDatabase === null) {
    return {
      message:
        'Generic SQL has no dialect-specific validator. Choose a dialect to enable validation.',
      status: 'unsupported',
      title: 'No validator',
    }
  }

  const error = await getSqlError(value, parserDatabase)

  if (!error) {
    return {
      message: 'No SQL syntax errors found.',
      status: 'valid',
      title: 'Valid SQL',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('SQL', error.issue),
  }
}

function getSqlErrorIssue(error: unknown): FormatValidationIssue | undefined {
  if (!isRecord(error) || !isRecord(error.location)) {
    return undefined
  }

  const start = error.location.start

  if (!isRecord(start)) {
    return undefined
  }

  const { column, line } = start

  if (typeof line !== 'number' || typeof column !== 'number') {
    return undefined
  }

  return { column, line }
}

function buildSqlErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const found = message.match(/but (.+?) found\.?\s*$/)

  if (found && found[1]) {
    return `SQL parse error: unexpected ${found[1].trim()}.`
  }

  return 'SQL syntax is invalid.'
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
  format: string,
  issue: FormatValidationIssue | undefined,
) {
  return issue ? `${format} line ${issue.line}` : `Invalid ${format}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function validateJwt(value: string): FormatValidationResult {
  const error = getJwtError(value)

  if (!error) {
    return {
      message: 'JWT structure is valid. The signature is not verified here.',
      status: 'valid',
      title: 'Valid JWT',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('JWT', error.issue),
  }
}

// Structural JWS check: three dot-separated base64url segments whose header and
// payload decode to valid JSON. The signature is not verified (no key here).
export function getJwtError(value: string): FormatSyntaxError | null {
  const token = value.trim()

  if (token.length === 0) {
    return null
  }

  const segments = token.split('.')

  if (segments.length !== 3) {
    return {
      message: `JWT must have 3 dot-separated segments but found ${segments.length}.`,
    }
  }

  if (!isDecodableJwtJson(segments[0])) {
    return { message: 'JWT header is not valid base64url-encoded JSON.' }
  }

  if (!isDecodableJwtJson(segments[1])) {
    return { message: 'JWT payload is not valid base64url-encoded JSON.' }
  }

  return null
}

function isDecodableJwtJson(segment: string): boolean {
  try {
    JSON.parse(decodeBase64Url(segment))
    return true
  } catch {
    return false
  }
}

export function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function validateNdjson(value: string): FormatValidationResult {
  const error = getNdjsonError(value)

  if (!error) {
    return {
      message: 'No NDJSON syntax errors found. Every non-empty line is JSON.',
      status: 'valid',
      title: 'Valid NDJSON',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('NDJSON', error.issue),
  }
}

// Newline-delimited JSON: each non-empty line must be a standalone JSON value.
export function getNdjsonError(value: string): FormatSyntaxError | null {
  if (value.trim().length === 0) {
    return null
  }

  const lines = value.split(/\r\n|\r|\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line.trim().length === 0) {
      continue
    }

    try {
      JSON.parse(line)
    } catch (error) {
      const inner =
        error instanceof Error
          ? getJsonErrorIssue(error.message, line)
          : undefined

      return {
        issue: { column: inner?.column ?? 1, line: index + 1 },
        message: `NDJSON line ${index + 1} is not valid JSON.`,
      }
    }
  }

  return null
}

export async function validateGraphql(
  value: string,
): Promise<FormatValidationResult> {
  const error = await getGraphqlError(value)

  if (!error) {
    return {
      message: 'No GraphQL syntax errors found.',
      status: 'valid',
      title: 'Valid GraphQL',
    }
  }

  return {
    issue: error.issue,
    message: formatInvalidMessage(error.message, error.issue),
    status: 'invalid',
    title: formatInvalidTitle('GraphQL', error.issue),
  }
}

// GraphQL document syntax check via the reference parser, loaded on demand.
export async function getGraphqlError(
  value: string,
): Promise<FormatSyntaxError | null> {
  if (value.trim().length === 0) {
    return null
  }

  const { parse } = await import('graphql')

  try {
    parse(value)
    return null
  } catch (error) {
    return {
      issue: getGraphqlErrorIssue(error),
      message: buildGraphqlErrorMessage(error),
    }
  }
}

function getGraphqlErrorIssue(
  error: unknown,
): FormatValidationIssue | undefined {
  if (!isRecord(error) || !Array.isArray(error.locations)) {
    return undefined
  }

  const location = error.locations[0]

  if (!isRecord(location)) {
    return undefined
  }

  const { column, line } = location

  if (typeof line !== 'number' || typeof column !== 'number') {
    return undefined
  }

  return { column, line }
}

function buildGraphqlErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const cleaned = message.replace(/^Syntax Error:\s*/i, '').split('\n')[0]

  return cleaned
    ? `GraphQL parse error: ${cleaned.trim()}`
    : 'GraphQL syntax is invalid.'
}
