import { html } from '@codemirror/lang-html'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { StreamLanguage } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { diff } from '@codemirror/legacy-modes/mode/diff'
import { toml } from '@codemirror/legacy-modes/mode/toml'

import type {
  FormatCapability,
  FormatViewDefinition,
  SyntaxMode,
  TransformId,
} from './types'
import { csvLanguage } from './utils/csvLanguage'
import { getFormatLintSource } from './utils/formatLinting'
import { HtmlPreviewView } from './views/HtmlPreviewView'
import { MarkdownDocumentView } from './views/MarkdownDocumentView'
import { StructuredTreeView } from './views/StructuredTreeView'
import { UnavailableView } from './views/FormatViewPanel'

const TOML_LANGUAGE = StreamLanguage.define(toml)
const DIFF_LANGUAGE = StreamLanguage.define(diff)

const JSON_TRANSFORMS = [
  'json-format',
  'json-minify',
  'json-to-yaml',
  'json-to-toml',
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

const GENERAL_TRANSFORMS = [
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
    getEditorExtensions: () => [csvLanguage],
    id: 'csv',
    label: 'CSV',
    lintSource: getFormatLintSource('csv') ?? undefined,
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['csv-pipeline-metrics'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  diff: {
    description: 'Unified diff and patch output',
    getEditorExtensions: () => [DIFF_LANGUAGE],
    id: 'diff',
    label: 'Diff',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['diff-pipeline-config'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'unsupported',
    viewIds: [],
  },
  html: {
    defaultViewId: 'html-preview',
    description: 'Markup fragments and documents',
    getEditorExtensions: () => [html()],
    id: 'html',
    label: 'HTML',
    lintSource: getFormatLintSource('html') ?? undefined,
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
    getEditorExtensions: () => [json()],
    id: 'json',
    label: 'JSON',
    lintSource: jsonParseLinter(),
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['json-service-event'],
    transformIds: [...JSON_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: ['structured-tree'],
  },
  markdown: {
    defaultViewId: 'markdown-document',
    description: 'Notes, docs, and fenced code',
    getEditorExtensions: () => [markdown({ codeLanguages: languages })],
    id: 'markdown',
    label: 'Markdown',
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['markdown-release-notes'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'unsupported',
    viewIds: ['markdown-document'],
  },
  plain: {
    description: 'No highlighting',
    getEditorExtensions: () => [],
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
    getEditorExtensions: () => [sql()],
    id: 'sql',
    label: 'SQL',
    lintSource: getFormatLintSource('sql') ?? undefined,
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['sql-event-report'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  toml: {
    description: 'Config tables and arrays',
    getEditorExtensions: () => [TOML_LANGUAGE],
    id: 'toml',
    label: 'TOML',
    lintSource: getFormatLintSource('toml') ?? undefined,
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['toml-pipeline-config'],
    transformIds: [...TOML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: 'supported',
    viewIds: [],
  },
  xml: {
    description: 'Markup documents and feeds',
    getEditorExtensions: () => [xml()],
    id: 'xml',
    label: 'XML',
    lintSource: getFormatLintSource('xml') ?? undefined,
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
    getEditorExtensions: () => [yaml()],
    id: 'yaml',
    label: 'YAML',
    lintSource: getFormatLintSource('yaml') ?? undefined,
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
