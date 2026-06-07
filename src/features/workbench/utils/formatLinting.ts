import { jsonParseLinter } from '@codemirror/lang-json'
import type { Diagnostic, LintSource } from '@codemirror/lint'
import type { Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { load } from 'js-yaml'

import type { SyntaxMode } from '../types'
import { getYamlErrorIssue } from './formatValidation'

export function getFormatLintSource(syntaxMode: SyntaxMode): LintSource | null {
  if (syntaxMode === 'json') {
    return jsonParseLinter()
  }

  if (syntaxMode === 'yaml') {
    return yamlLintSource
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

function createYamlDiagnostic(error: unknown, view: EditorView): Diagnostic {
  const issue = getYamlErrorIssue(error)
  const from = issue
    ? getPositionFromIssue(view.state.doc, issue.line, issue.column)
    : 0

  return {
    from,
    message: error instanceof Error ? error.message : 'YAML syntax is invalid.',
    severity: 'error',
    source: 'YAML',
    to: Math.min(from + 1, view.state.doc.length),
  }
}

function getPositionFromIssue(doc: Text, line: number, column: number) {
  const docLine = doc.line(Math.max(1, Math.min(line, doc.lines)))

  return Math.max(docLine.from, Math.min(docLine.from + column - 1, docLine.to))
}
