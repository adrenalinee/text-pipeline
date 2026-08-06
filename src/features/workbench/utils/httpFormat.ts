import type { Diagnostic, LintSource } from '@codemirror/lint'

import type { FormatValidationResult } from '../types'
import type { FormatSyntaxError } from './formatValidation'

const REQUEST_LINE =
  /^(?:GET|HEAD|POST|PUT|PATCH|DELETE|CONNECT|OPTIONS|TRACE)\s+\S+\s+HTTP\/\d(?:\.\d)?$/i
const RESPONSE_LINE = /^HTTP\/\d(?:\.\d)?\s+\d{3}(?:\s+.*)?$/i
const HEADER_LINE = /^[-!#$%&'*+.^_`|~0-9A-Za-z]+\s*:\s*.*$/

export function validateHttp(value: string): FormatValidationResult {
  const error = getHttpError(value)

  if (!error) {
    return {
      message: 'The HTTP start line and header block are structurally valid.',
      status: 'valid',
      title: 'Valid HTTP message',
    }
  }

  const location = error.issue
    ? ` at line ${error.issue.line}, column ${error.issue.column}`
    : ''

  return {
    issue: error.issue,
    message: `${error.message}${location}`,
    status: 'invalid',
    title: `Invalid HTTP${location}`,
  }
}

export function getHttpError(value: string): FormatSyntaxError | null {
  if (value.trim().length === 0) return null

  const lines = value.split(/\r\n|\r|\n/)
  const firstLine = lines[0] ?? ''

  if (!REQUEST_LINE.test(firstLine) && !RESPONSE_LINE.test(firstLine)) {
    return {
      issue: { column: 1, line: 1 },
      message: 'Expected an HTTP request or response start line.',
    }
  }

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ''

    if (line.length === 0) return null

    if (!HEADER_LINE.test(line)) {
      return {
        issue: { column: 1, line: index + 1 },
        message:
          'Expected an HTTP header field or a blank line before the body.',
      }
    }
  }

  return null
}

export async function loadHttpLintSource(): Promise<LintSource> {
  return (view) => {
    const error = getHttpError(view.state.doc.toString())

    if (!error) return []

    const issue = error.issue ?? { column: 1, line: 1 }
    const line = view.state.doc.line(
      Math.max(1, Math.min(issue.line, view.state.doc.lines)),
    )
    const from = Math.max(
      line.from,
      Math.min(line.from + issue.column - 1, line.to),
    )

    return [
      {
        from,
        message: error.message,
        severity: 'error',
        source: 'HTTP',
        to: Math.min(from + 1, view.state.doc.length),
      } satisfies Diagnostic,
    ]
  }
}
