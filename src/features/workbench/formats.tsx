import { lazy } from 'react'

import type {
  FormatCapability,
  FormatViewDefinition,
  SyntaxMode,
  TransformId,
} from './types'
import { loadFormatLintSource } from './utils/formatLinting'
import { UnavailableView } from './views/FormatViewPanel'

// Editor language modes are loaded through dynamic import() so that each
// format's CodeMirror package only enters the bundle when that format is used.
// Keep this file free of top-level language/parser imports.

// Visual view components are lazy so their renderers and heavy dependencies
// (react-markdown, remark-gfm, js-yaml via the tree parser) stay out of the
// initial bundle until the user switches a format into view mode. The render
// calls run inside a Suspense boundary in FormatViewPanel.
const HtmlPreviewView = lazy(() =>
  import('./views/HtmlPreviewView').then((module) => ({
    default: module.HtmlPreviewView,
  })),
)
const MarkdownDocumentView = lazy(() =>
  import('./views/MarkdownDocumentView').then((module) => ({
    default: module.MarkdownDocumentView,
  })),
)
const StructuredTreeView = lazy(() =>
  import('./views/StructuredTreeView').then((module) => ({
    default: module.StructuredTreeView,
  })),
)

const JSON_TRANSFORMS = [
  'json-format',
  'json-minify',
  'json-to-yaml',
  'json-to-toml',
  'json-to-ndjson',
] satisfies ReadonlyArray<TransformId>

const NDJSON_TRANSFORMS = [
  'ndjson-to-json',
] satisfies ReadonlyArray<TransformId>

const JWT_TRANSFORMS = ['jwt-decode'] satisfies ReadonlyArray<TransformId>

const GRAPHQL_TRANSFORMS = [
  'graphql-format',
  'graphql-minify',
] satisfies ReadonlyArray<TransformId>

const YAML_TRANSFORMS = [
  'yaml-to-json',
  'yaml-to-toml',
] satisfies ReadonlyArray<TransformId>

const TOML_TRANSFORMS = [
  'toml-to-json',
  'toml-to-yaml',
] satisfies ReadonlyArray<TransformId>

const HTML_TRANSFORMS = [
  'html-compact',
  'html-format',
  'html-minify',
] satisfies ReadonlyArray<TransformId>

const SQL_TRANSFORMS = [
  'sql-format',
  'sql-minify',
] satisfies ReadonlyArray<TransformId>

const GENERAL_TRANSFORMS = [
  'crop-selection',
  'url-encode',
  'url-decode',
  'base64-encode',
  'base64-decode',
] satisfies ReadonlyArray<TransformId>

export const FORMAT_VIEWS = [
  {
    description: 'Preview static HTML in a restricted iframe',
    id: 'html-preview',
    label: 'Sandboxed preview',
    render: ({ value }) => <HtmlPreviewView value={value} />,
    supportedFormats: ['html'],
  },
  {
    description: 'Inspect parsed objects and arrays as collapsible nodes',
    id: 'structured-tree',
    label: 'Tree view',
    render: ({ syntaxMode, value }) =>
      syntaxMode === 'json' || syntaxMode === 'yaml' ? (
        <StructuredTreeView syntaxMode={syntaxMode} value={value} />
      ) : (
        <UnavailableView syntaxMode={syntaxMode} />
      ),
    supportedFormats: ['json', 'yaml'],
  },
  {
    description: 'Read Markdown as a formatted document',
    id: 'markdown-document',
    label: 'Document view',
    render: ({ value }) => <MarkdownDocumentView value={value} />,
    supportedFormats: ['markdown'],
  },
] satisfies ReadonlyArray<FormatViewDefinition>

export const FORMAT_DEFINITIONS = {
  csv: {
    description: 'Delimited rows and columns',
    loadEditorExtensions: async () => {
      const { csvLanguage } = await import('./utils/csvLanguage')
      return [csvLanguage]
    },
    id: 'csv',
    label: 'CSV',
    loadLintSource: () => loadFormatLintSource('csv'),
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['csv-pipeline-metrics'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  diff: {
    description: 'Unified diff and patch output',
    loadEditorExtensions: async () => {
      const [{ StreamLanguage }, { diff }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/diff'),
      ])
      return [StreamLanguage.define(diff)]
    },
    id: 'diff',
    label: 'Diff',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['diff-pipeline-config'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'unsupported',
    viewIds: [],
  },
  graphql: {
    description: 'Queries, mutations, and schema definitions',
    loadEditorExtensions: async () => {
      const [{ LanguageSupport }, { graphqlLanguage }] = await Promise.all([
        import('@codemirror/language'),
        import('cm6-graphql'),
      ])
      return [new LanguageSupport(graphqlLanguage)]
    },
    id: 'graphql',
    label: 'GraphQL',
    loadLintSource: () => loadFormatLintSource('graphql'),
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['graphql-user-query'],
    transformIds: [...GRAPHQL_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  html: {
    defaultViewId: 'html-preview',
    description: 'Markup fragments and documents',
    loadEditorExtensions: async () => {
      const { html } = await import('@codemirror/lang-html')
      return [html()]
    },
    id: 'html',
    label: 'HTML',
    loadLintSource: () => loadFormatLintSource('html'),
    renderPolicy: 'explicit',
    renderSecurity: 'sandboxed',
    sampleIds: ['html-status-panel'],
    transformIds: [...HTML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: ['html-preview'],
  },
  json: {
    defaultViewId: 'structured-tree',
    description: 'Objects, arrays, payloads',
    loadEditorExtensions: async () => {
      const { json } = await import('@codemirror/lang-json')
      return [json()]
    },
    id: 'json',
    label: 'JSON',
    loadLintSource: () => loadFormatLintSource('json'),
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['json-service-event'],
    transformIds: [...JSON_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: ['structured-tree'],
  },
  jwt: {
    description: 'Signed JSON Web Tokens (header.payload.signature)',
    loadEditorExtensions: async () => {
      const { jwtLanguage } = await import('./utils/jwtLanguage')
      return [jwtLanguage]
    },
    id: 'jwt',
    label: 'JWT',
    loadLintSource: () => loadFormatLintSource('jwt'),
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['jwt-access-token'],
    transformIds: [...JWT_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  markdown: {
    defaultViewId: 'markdown-document',
    description: 'Notes, docs, and fenced code',
    loadEditorExtensions: async () => {
      const [{ markdown }, { languages }] = await Promise.all([
        import('@codemirror/lang-markdown'),
        import('@codemirror/language-data'),
      ])
      return [markdown({ codeLanguages: languages })]
    },
    id: 'markdown',
    label: 'Markdown',
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['markdown-release-notes'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'unsupported',
    viewIds: ['markdown-document'],
  },
  ndjson: {
    description: 'Newline-delimited JSON records (logs, streams)',
    loadEditorExtensions: async () => {
      const [{ StreamLanguage }, { json }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/javascript'),
      ])
      return [StreamLanguage.define(json)]
    },
    id: 'ndjson',
    label: 'NDJSON',
    loadLintSource: () => loadFormatLintSource('ndjson'),
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['ndjson-request-log'],
    transformIds: [...NDJSON_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  plain: {
    description: 'No highlighting',
    loadEditorExtensions: async () => [],
    id: 'plain',
    label: 'Plain text',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: [],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'unsupported',
    viewIds: [],
  },
  sql: {
    description: 'Queries and schema statements',
    loadEditorExtensions: async () => {
      const { sql } = await import('@codemirror/lang-sql')
      return [sql()]
    },
    id: 'sql',
    label: 'SQL',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['sql-event-report'],
    transformIds: [...SQL_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  toml: {
    description: 'Config tables and arrays',
    loadEditorExtensions: async () => {
      const [{ StreamLanguage }, { toml }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/toml'),
      ])
      return [StreamLanguage.define(toml)]
    },
    id: 'toml',
    label: 'TOML',
    loadLintSource: () => loadFormatLintSource('toml'),
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['toml-pipeline-config'],
    transformIds: [...TOML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  xml: {
    description: 'Markup documents and feeds',
    loadEditorExtensions: async () => {
      const { xml } = await import('@codemirror/lang-xml')
      return [xml()]
    },
    id: 'xml',
    label: 'XML',
    loadLintSource: () => loadFormatLintSource('xml'),
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['xml-pipeline-config'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  yaml: {
    defaultViewId: 'structured-tree',
    description: 'Config and manifests',
    loadEditorExtensions: async () => {
      const { yaml } = await import('@codemirror/lang-yaml')
      return [yaml()]
    },
    id: 'yaml',
    label: 'YAML',
    loadLintSource: () => loadFormatLintSource('yaml'),
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['yaml-pipeline-config'],
    transformIds: [...YAML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: ['structured-tree'],
  },
} satisfies Record<SyntaxMode, FormatCapability>

export const FORMAT_OPTIONS = Object.values(FORMAT_DEFINITIONS)

export function getFormatDefinition(syntaxMode: SyntaxMode): FormatCapability {
  return FORMAT_DEFINITIONS[syntaxMode]
}
