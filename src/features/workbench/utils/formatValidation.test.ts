// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { validateFormat } from './formatValidation'

describe('format validation', () => {
  it('reports JSON syntax line and column when available', () => {
    const result = validateFormat('{\n  "service": "text-pipeline",\n}', 'json')

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 1,
      line: 3,
    })
  })

  it('reports YAML syntax line and column from the YAML parser', () => {
    const result = validateFormat(
      'service: text-pipeline\nitems: [one, two\nstatus: draft\n',
      'yaml',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 1,
      line: 3,
    })
  })

  it('reports TOML syntax line and column from the TOML parser', () => {
    const result = validateFormat(
      'service = "text-pipeline"\nitems = [1, 2\nstatus = true\n',
      'toml',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 13,
      line: 2,
    })
  })

  it('validates HTML fragments with browser parser recovery limits', () => {
    const result = validateFormat('<main><h1>Text Pipeline</h1></main>', 'html')

    expect(result).toMatchObject({
      status: 'valid',
      title: 'Valid HTML',
    })
  })

  it('reports HTML parse errors with line and column when available', () => {
    const result = validateFormat(
      '<main>\n  <div class=>x</div>\n</main>',
      'html',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 14,
      line: 2,
    })
  })

  it('treats Markdown validation as unsupported', () => {
    const result = validateFormat(
      '# Text Pipeline\n\n- local transforms\n',
      'markdown',
    )

    expect(result).toMatchObject({
      message: 'Markdown has no syntax validator.',
      status: 'unsupported',
      title: 'No validator',
    })
  })

  it('treats highlight-only formats as unsupported instead of TOML', () => {
    for (const [syntaxMode, label] of [
      ['diff', 'Diff'],
      ['sql', 'SQL'],
    ] as const) {
      const result = validateFormat('a = [1, 2', syntaxMode)

      expect(result).toMatchObject({
        message: `${label} has no syntax validator.`,
        status: 'unsupported',
        title: 'No validator',
      })
    }
  })

  it('accepts well-formed XML', () => {
    const result = validateFormat('<root><item>1</item></root>', 'xml')

    expect(result).toMatchObject({ status: 'valid', title: 'Valid XML' })
  })

  it('reports a not-well-formed XML document with a line', () => {
    const result = validateFormat('<root><item>1</root>', 'xml')

    expect(result.status).toBe('invalid')
    expect(result.issue?.line).toBe(1)
  })

  it('accepts a CSV whose rows match the header column count', () => {
    const result = validateFormat('id,name\n1,alice\n2,bob\n', 'csv')

    expect(result).toMatchObject({ status: 'valid', title: 'Valid CSV' })
  })

  it('reports a CSV row whose column count diverges from the header', () => {
    const result = validateFormat('id,name,active\n1,alice\n', 'csv')

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({ line: 2 })
  })

  it('reports an unterminated quoted CSV field', () => {
    const result = validateFormat('id,name\n1,"alice\n', 'csv')

    expect(result.status).toBe('invalid')
    expect(result.message).toContain('unterminated')
  })
})
