import { describe, expect, it } from 'vitest'

import {
  FORMAT_DEFINITIONS,
  FORMAT_OPTIONS,
  FORMAT_VIEWS,
  getFormatDefinition,
} from './formats'

describe('FORMAT_DEFINITIONS', () => {
  it('defines capabilities for every supported syntax mode', () => {
    expect(FORMAT_OPTIONS.map((format) => format.id).sort()).toEqual([
      'json',
      'markdown',
      'plain',
      'toml',
      'yaml',
    ])
    expect(FORMAT_OPTIONS.map((format) => format.label).sort()).toEqual([
      'JSON',
      'Markdown',
      'Plain text',
      'TOML',
      'YAML',
    ])
  })

  it('exposes default visual views for JSON, YAML, and Markdown', () => {
    expect(getFormatDefinition('json').defaultViewId).toBe('structured-tree')
    expect(getFormatDefinition('yaml').defaultViewId).toBe('structured-tree')
    expect(getFormatDefinition('markdown').defaultViewId).toBe(
      'markdown-document',
    )
  })

  it('keeps plain and TOML source-first until visual views are added', () => {
    expect(FORMAT_DEFINITIONS.plain.viewIds).toEqual([])
    expect(FORMAT_DEFINITIONS.toml.viewIds).toEqual([])
    expect(FORMAT_DEFINITIONS.toml.validation).toBe('supported')
  })

  it('keeps transform availability in the registry', () => {
    expect(FORMAT_DEFINITIONS.json.transformIds).toContain('json-format')
    expect(FORMAT_DEFINITIONS.json.transformIds).toContain('base64-encode')
    expect(FORMAT_DEFINITIONS.markdown.transformIds).not.toContain(
      'json-format',
    )
    expect(FORMAT_DEFINITIONS.markdown.transformIds).toContain('url-encode')
  })
})

describe('FORMAT_VIEWS', () => {
  it('declares supported formats for each visual view', () => {
    expect(
      FORMAT_VIEWS.find((view) => view.id === 'structured-tree')
        ?.supportedFormats,
    ).toEqual(['json', 'yaml'])
    expect(
      FORMAT_VIEWS.find((view) => view.id === 'markdown-document')
        ?.supportedFormats,
    ).toEqual(['markdown'])
  })
})
