import { describe, expect, it } from 'vitest'

import { formatTreeValue, parseStructuredTree } from './treeData'

describe('parseStructuredTree', () => {
  it('parses JSON into nested tree nodes with JSONPath-like paths', () => {
    const result = parseStructuredTree(
      '{"request":{"id":"req_1"},"items":[{"name":"first"}],"odd key":true}',
      'json',
    )

    expect(result.status).toBe('valid')

    if (result.status !== 'valid') {
      return
    }

    const request = result.root.children.find(
      (node) => node.keyLabel === 'request',
    )
    const items = result.root.children.find((node) => node.keyLabel === 'items')
    const oddKey = result.root.children.find(
      (node) => node.keyLabel === 'odd key',
    )

    expect(request?.path).toBe('$.request')
    expect(request?.children[0]?.path).toBe('$.request.id')
    expect(items?.children[0]?.children[0]?.path).toBe('$.items[0].name')
    expect(oddKey?.path).toBe('$["odd key"]')
  })

  it('parses YAML into tree nodes', () => {
    const result = parseStructuredTree(
      'service: text-pipeline\nport: 3000',
      'yaml',
    )

    expect(result.status).toBe('valid')

    if (result.status !== 'valid') {
      return
    }

    expect(result.root.children.map((node) => node.keyLabel)).toEqual([
      'service',
      'port',
    ])
  })

  it('returns invalid status for parse errors', () => {
    const result = parseStructuredTree('{"service": }', 'json')

    expect(result.status).toBe('invalid')
  })
})

describe('formatTreeValue', () => {
  it('formats primitive and structured values for copying', () => {
    expect(formatTreeValue('text')).toBe('text')
    expect(formatTreeValue(null)).toBe('null')
    expect(formatTreeValue({ ok: true })).toBe('{\n  "ok": true\n}')
  })
})
