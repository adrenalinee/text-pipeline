import type { Diagnostic, LintSource } from '@codemirror/lint'
import type { Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { ParserError } from 'parse5'

import {
  formatHtmlParseError,
  getCsvError,
  getGraphqlError,
  getHtmlErrorIssue,
  getJwtError,
  getNdjsonError,
  getSqlError,
  getTomlErrorIssue,
  getXmlError,
  getYamlErrorIssue,
} from './formatValidation'
import type { FormatSyntaxError } from './formatValidation'

// Lint sources are resolved by each format capability so adding a format does
// not require another central syntax-mode switch.
export async function loadJsonLintSource(): Promise<LintSource> {
  const { jsonParseLinter } = await import('@codemirror/lang-json')

  return jsonParseLinter()
}

const xmlLintSource: LintSource = (view) =>
  toSyntaxDiagnostics(getXmlError(view.state.doc.toString()), 'XML', view)

const csvLintSource: LintSource = (view) =>
  toSyntaxDiagnostics(getCsvError(view.state.doc.toString()), 'CSV', view)

const jwtLintSource: LintSource = (view) =>
  toSyntaxDiagnostics(getJwtError(view.state.doc.toString()), 'JWT', view)

const ndjsonLintSource: LintSource = (view) =>
  toSyntaxDiagnostics(getNdjsonError(view.state.doc.toString()), 'NDJSON', view)

const graphqlLintSource: LintSource = async (view) =>
  toSyntaxDiagnostics(
    await getGraphqlError(view.state.doc.toString()),
    'GraphQL',
    view,
  )

export function createSqlLintSource(database: string): LintSource {
  return async (view) =>
    toSyntaxDiagnostics(
      await getSqlError(view.state.doc.toString(), database),
      'SQL',
      view,
    )
}

export async function loadYamlLintSource(): Promise<LintSource> {
  const { load } = await import('js-yaml')

  return (view) => {
    try {
      load(view.state.doc.toString())
      return []
    } catch (error) {
      return [
        createDiagnostic({
          error,
          fallbackMessage: 'YAML syntax is invalid.',
          from: getYamlErrorIssue(error),
          source: 'YAML',
          view,
        }),
      ]
    }
  }
}

export async function loadTomlLintSource(): Promise<LintSource> {
  const { parse: parseToml } = await import('smol-toml')

  return (view) => {
    try {
      parseToml(view.state.doc.toString())
      return []
    } catch (error) {
      return [
        createDiagnostic({
          error,
          fallbackMessage: 'TOML syntax is invalid.',
          from: getTomlErrorIssue(error),
          source: 'TOML',
          view,
        }),
      ]
    }
  }
}

export async function loadHtmlLintSource(): Promise<LintSource> {
  const { parseFragment } = await import('parse5')

  return (view) => {
    const errors: Array<ParserError> = []

    parseFragment(view.state.doc.toString(), {
      onParseError: (error) => errors.push(error),
    })

    return errors.map((error) =>
      createDiagnostic({
        error,
        fallbackMessage: `HTML parse error: ${formatHtmlParseError(error.code)}.`,
        from: getHtmlErrorIssue(error),
        source: 'HTML',
        view,
      }),
    )
  }
}

export async function loadXmlLintSource(): Promise<LintSource> {
  return xmlLintSource
}

export async function loadCsvLintSource(): Promise<LintSource> {
  return csvLintSource
}

export async function loadGraphqlLintSource(): Promise<LintSource> {
  return graphqlLintSource
}

export async function loadNdjsonLintSource(): Promise<LintSource> {
  return ndjsonLintSource
}

export async function loadJwtLintSource(): Promise<LintSource> {
  return jwtLintSource
}

function toSyntaxDiagnostics(
  error: FormatSyntaxError | null,
  source: string,
  view: EditorView,
): Array<Diagnostic> {
  if (!error) {
    return []
  }

  return [
    createDiagnostic({
      error: new Error(error.message),
      fallbackMessage: `${source} is invalid.`,
      from: error.issue,
      source,
      view,
    }),
  ]
}

function createDiagnostic({
  error,
  fallbackMessage,
  from: issue,
  source,
  view,
}: {
  error: unknown
  fallbackMessage: string
  from: { column: number; line: number } | undefined
  source: string
  view: EditorView
}): Diagnostic {
  const from = issue
    ? getPositionFromIssue(view.state.doc, issue.line, issue.column)
    : 0

  return {
    from,
    message: error instanceof Error ? error.message : fallbackMessage,
    severity: 'error',
    source,
    to: Math.min(from + 1, view.state.doc.length),
  }
}

function getPositionFromIssue(doc: Text, line: number, column: number) {
  const docLine = doc.line(Math.max(1, Math.min(line, doc.lines)))

  return Math.max(docLine.from, Math.min(docLine.from + column - 1, docLine.to))
}
