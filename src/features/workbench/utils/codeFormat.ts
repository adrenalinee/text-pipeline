import type { Diagnostic, LintSource } from '@codemirror/lint'

import type { FormatValidationIssue, FormatValidationResult } from '../types'

type CodeParser = 'babel' | 'typescript'

type Formatter = {
  format: (value: string, parser: CodeParser) => Promise<string>
}

let formatterPromise: Promise<Formatter> | null = null

async function loadFormatter(): Promise<Formatter> {
  if (!formatterPromise) {
    formatterPromise = Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/typescript'),
      import('prettier/plugins/estree'),
    ]).then(([prettier, babelPlugin, typescriptPlugin, estreePlugin]) => ({
      format: (value, parser) =>
        prettier.format(value, {
          parser,
          plugins: [
            parser === 'babel' ? babelPlugin : typescriptPlugin,
            estreePlugin,
          ],
          semi: false,
          singleQuote: true,
        }),
    }))
  }

  return formatterPromise
}

export async function formatCodeDocument(
  value: string,
  parser: CodeParser,
): Promise<string> {
  const formatter = await loadFormatter()

  return formatter.format(value, parser)
}

export async function validateCode(
  value: string,
  parser: CodeParser,
  label: 'JavaScript' | 'TypeScript',
): Promise<FormatValidationResult> {
  const error = await getCodeError(value, parser)

  if (!error) {
    return {
      message: `No ${label} syntax errors found.`,
      status: 'valid',
      title: `Valid ${label}`,
    }
  }

  const location = error.issue
    ? ` at line ${error.issue.line}, column ${error.issue.column}`
    : ''

  return {
    issue: error.issue,
    message: `${error.message}${location}`,
    status: 'invalid',
    title: `Invalid ${label}${location}`,
  }
}

export async function loadCodeLintSource(
  parser: CodeParser,
  label: 'JavaScript' | 'TypeScript',
): Promise<LintSource> {
  return async (view) => {
    const error = await getCodeError(view.state.doc.toString(), parser)

    if (!error) return []

    const issue = error.issue
    const line = issue
      ? view.state.doc.line(
          Math.max(1, Math.min(issue.line, view.state.doc.lines)),
        )
      : view.state.doc.line(1)
    const from = issue
      ? Math.max(line.from, Math.min(line.from + issue.column - 1, line.to))
      : 0

    return [
      {
        from,
        message: error.message,
        severity: 'error',
        source: label,
        to: Math.min(from + 1, view.state.doc.length),
      } satisfies Diagnostic,
    ]
  }
}

async function getCodeError(value: string, parser: CodeParser) {
  if (value.trim().length === 0) return null

  try {
    await formatCodeDocument(value, parser)
    return null
  } catch (error) {
    return {
      issue: getPrettierIssue(error),
      message: getPrettierMessage(error),
    }
  }
}

function getPrettierIssue(error: unknown): FormatValidationIssue | undefined {
  if (!isRecord(error) || !isRecord(error.loc) || !isRecord(error.loc.start)) {
    return undefined
  }

  const { column, line } = error.loc.start

  return typeof column === 'number' && typeof line === 'number'
    ? { column, line }
    : undefined
}

function getPrettierMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const summary = message.split('\n')[0]?.trim()

  return summary || 'Code syntax is invalid.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
