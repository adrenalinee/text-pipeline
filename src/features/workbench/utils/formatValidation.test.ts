// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getFormatDefinition } from '../formats'
import type { FormatValidationResult, SyntaxMode } from '../types'

async function validateFormat(
  value: string,
  syntaxMode: SyntaxMode,
): Promise<FormatValidationResult> {
  const format = getFormatDefinition(syntaxMode)

  if (!format.validation) {
    return {
      message: `${format.label} has no syntax validator.`,
      status: 'unsupported',
      title: 'No validator',
    }
  }

  return format.validation.validate(value, {
    sqlParserDatabase: syntaxMode === 'sql' ? 'PostgreSQL' : undefined,
  })
}

describe('format validation', () => {
  it('validates JavaScript and reports parser locations', async () => {
    await expect(
      validateFormat('const answer = () => 42', 'javascript'),
    ).resolves.toMatchObject({ status: 'valid', title: 'Valid JavaScript' })

    const invalid = await validateFormat('const = 42', 'javascript')

    expect(invalid).toMatchObject({
      issue: { column: 7, line: 1 },
      status: 'invalid',
    })
  })

  it('validates TypeScript type syntax and reports parser locations', async () => {
    await expect(
      validateFormat('const answer: number = 42', 'typescript'),
    ).resolves.toMatchObject({ status: 'valid', title: 'Valid TypeScript' })

    const invalid = await validateFormat('const answer: = 42', 'typescript')

    expect(invalid).toMatchObject({
      issue: { column: 15, line: 1 },
      status: 'invalid',
    })
  })

  it('validates raw HTTP request structure', async () => {
    await expect(
      validateFormat(
        'POST /v1/transforms HTTP/1.1\nContent-Type: application/json\n\n{}',
        'http',
      ),
    ).resolves.toMatchObject({ status: 'valid', title: 'Valid HTTP message' })

    const invalid = await validateFormat(
      'POST /v1/transforms HTTP/1.1\nMalformed header\n\n{}',
      'http',
    )

    expect(invalid).toMatchObject({
      issue: { column: 1, line: 2 },
      status: 'invalid',
    })
  })

  it('keeps Go validation explicitly unsupported', async () => {
    await expect(
      validateFormat('package main\n\nfunc main() {}\n', 'go'),
    ).resolves.toMatchObject({
      message: 'Go has no syntax validator.',
      status: 'unsupported',
    })
  })

  it('reports JSON syntax line and column when available', async () => {
    const result = await validateFormat(
      '{\n  "service": "text-pipeline",\n}',
      'json',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 1,
      line: 3,
    })
  })

  it('reports YAML syntax line and column from the YAML parser', async () => {
    const result = await validateFormat(
      'service: text-pipeline\nitems: [one, two\nstatus: draft\n',
      'yaml',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 1,
      line: 3,
    })
  })

  it('reports TOML syntax line and column from the TOML parser', async () => {
    const result = await validateFormat(
      'service = "text-pipeline"\nitems = [1, 2\nstatus = true\n',
      'toml',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 13,
      line: 2,
    })
  })

  it('validates HTML fragments with browser parser recovery limits', async () => {
    const result = await validateFormat(
      '<main><h1>Text Pipeline</h1></main>',
      'html',
    )

    expect(result).toMatchObject({
      status: 'valid',
      title: 'Valid HTML',
    })
  })

  it('reports HTML parse errors with line and column when available', async () => {
    const result = await validateFormat(
      '<main>\n  <div class=>x</div>\n</main>',
      'html',
    )

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({
      column: 14,
      line: 2,
    })
  })

  it('treats Markdown validation as unsupported', async () => {
    const result = await validateFormat(
      '# Text Pipeline\n\n- local transforms\n',
      'markdown',
    )

    expect(result).toMatchObject({
      message: 'Markdown has no syntax validator.',
      status: 'unsupported',
      title: 'No validator',
    })
  })

  it('treats highlight-only formats as unsupported instead of TOML', async () => {
    const result = await validateFormat('a = [1, 2', 'diff')

    expect(result).toMatchObject({
      message: 'Diff has no syntax validator.',
      status: 'unsupported',
      title: 'No validator',
    })
  })

  it('accepts a syntactically valid SQL statement', async () => {
    const result = await validateFormat(
      'SELECT id, name FROM users WHERE active = true',
      'sql',
    )

    expect(result).toMatchObject({ status: 'valid', title: 'Valid SQL' })
  })

  it('reports a SQL syntax error with a line and column', async () => {
    const result = await validateFormat('SELEC * FROM users', 'sql')

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({ line: 1 })
  })

  it('accepts well-formed XML', async () => {
    const result = await validateFormat('<root><item>1</item></root>', 'xml')

    expect(result).toMatchObject({ status: 'valid', title: 'Valid XML' })
  })

  it('reports a not-well-formed XML document with a line', async () => {
    const result = await validateFormat('<root><item>1</root>', 'xml')

    expect(result.status).toBe('invalid')
    expect(result.issue?.line).toBe(1)
  })

  it('accepts a CSV whose rows match the header column count', async () => {
    const result = await validateFormat('id,name\n1,alice\n2,bob\n', 'csv')

    expect(result).toMatchObject({ status: 'valid', title: 'Valid CSV' })
  })

  it('reports a CSV row whose column count diverges from the header', async () => {
    const result = await validateFormat('id,name,active\n1,alice\n', 'csv')

    expect(result.status).toBe('invalid')
    expect(result.issue).toMatchObject({ line: 2 })
  })

  it('reports an unterminated quoted CSV field', async () => {
    const result = await validateFormat('id,name\n1,"alice\n', 'csv')

    expect(result.status).toBe('invalid')
    expect(result.message).toContain('unterminated')
  })

  it('accepts a structurally valid JWT', async () => {
    const result = await validateFormat(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'jwt',
    )

    expect(result).toMatchObject({ status: 'valid', title: 'Valid JWT' })
  })

  it('reports a JWT that does not have three segments', async () => {
    const result = await validateFormat('header.payload', 'jwt')

    expect(result.status).toBe('invalid')
    expect(result.message).toContain('3 dot-separated segments')
  })

  it('accepts NDJSON where every non-empty line is JSON', async () => {
    const result = await validateFormat('{"a":1}\n{"b":2}\n', 'ndjson')

    expect(result).toMatchObject({ status: 'valid', title: 'Valid NDJSON' })
  })

  it('reports the NDJSON line that is not valid JSON', async () => {
    const result = await validateFormat('{"a":1}\n{"b":\n', 'ndjson')

    expect(result.status).toBe('invalid')
    expect(result.issue?.line).toBe(2)
  })

  it('accepts a valid GraphQL document', async () => {
    const result = await validateFormat('{ user { id name } }', 'graphql')

    expect(result).toMatchObject({ status: 'valid', title: 'Valid GraphQL' })
  })

  it('reports a GraphQL syntax error with a line', async () => {
    const result = await validateFormat('{ user( }', 'graphql')

    expect(result.status).toBe('invalid')
    expect(result.issue?.line).toBe(1)
  })
})
