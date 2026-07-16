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
      'csv',
      'diff',
      'graphql',
      'html',
      'json',
      'jwt',
      'markdown',
      'ndjson',
      'plain',
      'sql',
      'toml',
      'xml',
      'yaml',
    ])
    expect(FORMAT_OPTIONS.map((format) => format.label).sort()).toEqual([
      'CSV',
      'Diff',
      'GraphQL',
      'HTML',
      'JSON',
      'JWT',
      'Markdown',
      'NDJSON',
      'Plain text',
      'SQL',
      'TOML',
      'XML',
      'YAML',
    ])
  })

  it('exposes default visual views for HTML, JSON, YAML, and Markdown', () => {
    expect(getFormatDefinition('html').defaultViewId).toBe('html-preview')
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
    expect(FORMAT_DEFINITIONS.html.transformIds).toContain('html-compact')
    expect(FORMAT_DEFINITIONS.html.transformIds).toContain('html-format')
    expect(FORMAT_DEFINITIONS.html.transformIds).toContain('html-minify')
    expect(FORMAT_DEFINITIONS.html.transformIds).toContain('base64-encode')
    expect(FORMAT_DEFINITIONS.html.renderSecurity).toBe('sandboxed')
    expect(FORMAT_DEFINITIONS.html.sampleIds).toContain('html-status-panel')
    expect(FORMAT_DEFINITIONS.json.transformIds).toContain('json-format')
    expect(FORMAT_DEFINITIONS.json.transformIds).toContain('base64-encode')
    expect(FORMAT_DEFINITIONS.markdown.transformIds).not.toContain(
      'json-format',
    )
    expect(FORMAT_DEFINITIONS.markdown.transformIds).toContain('url-encode')
  })

  it('registers the lazily loaded JWT, NDJSON, and GraphQL formats', () => {
    expect(FORMAT_DEFINITIONS.jwt.transformIds).toContain('jwt-decode')
    expect(FORMAT_DEFINITIONS.jwt.validation).toBe('supported')
    expect(FORMAT_DEFINITIONS.ndjson.transformIds).toContain('ndjson-to-json')
    expect(FORMAT_DEFINITIONS.json.transformIds).toContain('json-to-ndjson')
    expect(FORMAT_DEFINITIONS.graphql.transformIds).toContain('graphql-format')
    expect(FORMAT_DEFINITIONS.graphql.transformIds).toContain('graphql-minify')
    expect(FORMAT_DEFINITIONS.graphql.validation).toBe('supported')
  })

  it('resolves editor extensions on demand for every format', async () => {
    for (const format of FORMAT_OPTIONS) {
      const extensions = await format.loadEditorExtensions()

      expect(Array.isArray(extensions)).toBe(true)
    }
  })
})

describe('FORMAT_VIEWS', () => {
  it('declares supported formats for each visual view', () => {
    expect(
      FORMAT_VIEWS.find((view) => view.id === 'html-preview')?.supportedFormats,
    ).toEqual(['html'])
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
