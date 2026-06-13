import { jsonParseLinter } from '@codemirror/lang-json'
import type { Diagnostic, LintSource } from '@codemirror/lint'
import type { Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { load } from 'js-yaml'
import { parseFragment } from 'parse5'
import type { ParserError } from 'parse5'
import { parse as parseToml } from 'smol-toml'

import type { SyntaxMode } from '../types'
import {
  formatHtmlParseError,
  getHtmlErrorIssue,
  getTomlErrorIssue,
  getYamlErrorIssue,
} from './formatValidation'

export function getFormatLintSource(syntaxMode: SyntaxMode): LintSource | null {
  if (syntaxMode === 'json') {
    return jsonParseLinter()
  }

  if (syntaxMode === 'html') {
    return htmlLintSource
  }

  if (syntaxMode === 'yaml') {
    return yamlLintSource
  }

  if (syntaxMode === 'toml') {
    return tomlLintSource
  }

  return null
}

const yamlLintSource: LintSource = (view) => {
  try {
    load(view.state.doc.toString())
    return []
  } catch (error) {
    return [createYamlDiagnostic(error, view)]
  }
}

const tomlLintSource: LintSource = (view) => {
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

const htmlLintSource: LintSource = (view) => {
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

function createYamlDiagnostic(error: unknown, view: EditorView): Diagnostic {
  return createDiagnostic({
    error,
    fallbackMessage: 'YAML syntax is invalid.',
    from: getYamlErrorIssue(error),
    source: 'YAML',
    view,
  })
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
