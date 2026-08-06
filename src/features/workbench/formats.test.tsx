import { describe, expect, it } from 'vitest'

import { TEXT_SAMPLES } from './samples'
import { TRANSFORM_DEFINITIONS } from './transforms/definitions'
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

  it('exposes default visual views for supported formats', () => {
    expect(getFormatDefinition('diff').defaultViewId).toBe('diff-patch')
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
    expect(FORMAT_DEFINITIONS.toml.validation).toBeDefined()
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
    expect(FORMAT_DEFINITIONS.jwt.validation).toBeDefined()
    expect(FORMAT_DEFINITIONS.ndjson.transformIds).toContain('ndjson-to-json')
    expect(FORMAT_DEFINITIONS.json.transformIds).toContain('json-to-ndjson')
    expect(FORMAT_DEFINITIONS.graphql.transformIds).toContain('graphql-format')
    expect(FORMAT_DEFINITIONS.graphql.transformIds).toContain('graphql-minify')
    expect(FORMAT_DEFINITIONS.graphql.validation).toBeDefined()
  })

  it('resolves editor extensions on demand for every format', async () => {
    for (const format of FORMAT_OPTIONS) {
      const extensions = await format.loadEditorExtensions()

      expect(Array.isArray(extensions)).toBe(true)
    }
  })
})

describe('FORMAT_VIEWS', () => {
  it('resolves every registered view from format capabilities', () => {
    const viewIds = new Set(FORMAT_VIEWS.map((view) => view.id))

    for (const format of FORMAT_OPTIONS) {
      expect(format.viewIds.every((viewId) => viewIds.has(viewId))).toBe(true)
      if ('defaultViewId' in format) {
        expect(format.viewIds).toContain(format.defaultViewId)
      }
    }
  })

  it('keeps samples, transforms, and detection wired through capabilities', () => {
    const sampleIds = FORMAT_OPTIONS.flatMap((format) =>
      format.sampleIds.map((sampleId) => ({ format: format.id, sampleId })),
    )
    const transformIds = new Set(
      TRANSFORM_DEFINITIONS.map((transform) => transform.id),
    )

    expect(sampleIds.map(({ sampleId }) => sampleId).sort()).toEqual(
      TEXT_SAMPLES.map((sample) => sample.id).sort(),
    )

    for (const { format, sampleId } of sampleIds) {
      expect(
        TEXT_SAMPLES.find((sample) => sample.id === sampleId)?.syntaxMode,
      ).toBe(format)
    }

    for (const format of FORMAT_OPTIONS) {
      expect(
        format.transformIds.every((transformId) =>
          transformIds.has(transformId),
        ),
      ).toBe(true)
      if (format.id === 'plain') {
        expect('detection' in format).toBe(false)
      } else {
        expect(format.detection).toBeDefined()
      }
    }
  })
})
