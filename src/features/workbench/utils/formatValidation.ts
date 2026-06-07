import { yamlLanguage } from '@codemirror/lang-yaml'

import type { SyntaxMode } from '../types'

export type FormatValidationResult = {
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

  return validateYaml(value)
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
    return {
      message:
        error instanceof Error ? error.message : 'JSON syntax is invalid.',
      status: 'invalid',
      title: 'Invalid JSON',
    }
  }
}

function validateYaml(value: string): FormatValidationResult {
  const tree = yamlLanguage.parser.parse(value)
  const cursor = tree.cursor()

  do {
    if (cursor.type.isError) {
      return {
        message: 'The YAML parser found a syntax error.',
        status: 'invalid',
        title: 'Invalid YAML',
      }
    }
  } while (cursor.next())

  return {
    message: isJsonLike(value)
      ? 'JSON-style input is valid YAML flow syntax.'
      : 'No YAML syntax errors found.',
    status: 'valid',
    title: 'Valid YAML',
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
