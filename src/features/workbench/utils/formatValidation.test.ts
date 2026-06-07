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
})
