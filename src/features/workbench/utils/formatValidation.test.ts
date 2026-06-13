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
})
