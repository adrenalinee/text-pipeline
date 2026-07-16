import type { Diagnostic, LintSource } from '@codemirror/lint'
import type { Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { ParserError } from 'parse5'

import type { SyntaxMode } from '../types'
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

// Lint sources are resolved on demand so their parser packages (js-yaml,
// parse5, smol-toml, graphql, the JSON language) stay out of the initial
// bundle until a format that needs them is linted.
export async function loadFormatLintSource(
  syntaxMode: SyntaxMode,
): Promise<LintSource | null> {
  if (syntaxMode === 'json') {
    const { jsonParseLinter } = await import('@codemirror/lang-json')
    return jsonParseLinter()
  }

  if (syntaxMode === 'html') {
    return loadHtmlLintSource()
  }

  if (syntaxMode === 'yaml') {
    return loadYamlLintSource()
  }

  if (syntaxMode === 'toml') {
    return loadTomlLintSource()
  }

  if (syntaxMode === 'xml') {
    return xmlLintSource
  }

  if (syntaxMode === 'csv') {
    return csvLintSource
  }

  if (syntaxMode === 'graphql') {
    return graphqlLintSource
  }

  if (syntaxMode === 'ndjson') {
    return ndjsonLintSource
  }

  if (syntaxMode === 'jwt') {
    return jwtLintSource
  }

  return null
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

async function loadYamlLintSource(): Promise<LintSource> {
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

async function loadTomlLintSource(): Promise<LintSource> {
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

async function loadHtmlLintSource(): Promise<LintSource> {
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
