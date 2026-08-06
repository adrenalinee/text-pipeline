import { lazy } from 'react'
import {
  Braces,
  Code2,
  FileJson,
  FileText,
  KeyRound,
  Share2,
} from 'lucide-react'

import type {
  FormatCapability,
  FormatValidationCapability,
  FormatViewDefinition,
  SyntaxMode,
  TransformId,
} from './types'
import {
  sniffCsv,
  sniffDiff,
  sniffGraphql,
  sniffHtml,
  sniffJson,
  sniffJwt,
  sniffMarkdown,
  sniffNdjson,
  sniffSql,
  sniffToml,
  sniffXml,
  sniffYaml,
} from './utils/formatSniffers'
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
const DiffPatchView = lazy(() =>
  import('./views/DiffPatchView').then((module) => ({
    default: module.DiffPatchView,
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

function createValidationCapability(
  validate: FormatValidationCapability['validate'],
  loadLintSource: FormatValidationCapability['loadLintSource'],
): FormatValidationCapability {
  return { loadLintSource, validate }
}

export const FORMAT_VIEWS = [
  {
    description: 'Inspect patch hunks with old and new line numbers',
    id: 'diff-patch',
    label: 'Patch view',
    render: ({ value }) => <DiffPatchView value={value} />,
  },
  {
    description: 'Preview static HTML in a restricted iframe',
    id: 'html-preview',
    label: 'Sandboxed preview',
    render: ({ value }) => <HtmlPreviewView value={value} />,
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
  },
  {
    description: 'Read Markdown as a formatted document',
    id: 'markdown-document',
    label: 'Document view',
    render: ({ value }) => <MarkdownDocumentView value={value} />,
  },
] satisfies ReadonlyArray<FormatViewDefinition>

export const FORMAT_DEFINITIONS = {
  csv: {
    detection: {
      loadConfirm: () =>
        import('./utils/formatConfirmers').then((module) => module.confirmCsv),
      priority: 65,
      sniff: sniffCsv,
    },
    description: 'Delimited rows and columns',
    icon: <FileText size={18} />,
    loadEditorExtensions: async () => {
      const { csvLanguage } = await import('./utils/csvLanguage')
      return [csvLanguage]
    },
    id: 'csv',
    label: 'CSV',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['csv-pipeline-metrics'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateCsv(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadCsvLintSource(),
        ),
    ),
    viewIds: [],
  },
  diff: {
    defaultViewId: 'diff-patch',
    detection: { priority: 95, sniff: sniffDiff },
    description: 'Unified diff and patch output',
    icon: <FileText size={18} />,
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
    renderSecurity: 'sanitized',
    sampleIds: ['diff-pipeline-config'],
    transformIds: [...GENERAL_TRANSFORMS],
    viewIds: ['diff-patch'],
  },
  graphql: {
    detection: {
      loadConfirm: () =>
        import('./utils/formatConfirmers').then(
          (module) => module.confirmGraphql,
        ),
      priority: 60,
      sniff: sniffGraphql,
    },
    description: 'Queries, mutations, and schema definitions',
    icon: <Share2 size={18} />,
    loadEditorExtensions: async () => {
      const [{ LanguageSupport }, { graphqlLanguage }] = await Promise.all([
        import('@codemirror/language'),
        import('cm6-graphql'),
      ])
      return [new LanguageSupport(graphqlLanguage)]
    },
    id: 'graphql',
    label: 'GraphQL',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['graphql-user-query'],
    transformIds: [...GRAPHQL_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateGraphql(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadGraphqlLintSource(),
        ),
    ),
    viewIds: [],
  },
  html: {
    defaultViewId: 'html-preview',
    detection: {
      loadConfirm: () =>
        import('./utils/formatConfirmers').then((module) => module.confirmHtml),
      priority: 80,
      sniff: sniffHtml,
    },
    description: 'Markup fragments and documents',
    icon: <Code2 size={18} />,
    loadEditorExtensions: async () => {
      const { html } = await import('@codemirror/lang-html')
      return [html()]
    },
    id: 'html',
    label: 'HTML',
    renderPolicy: 'explicit',
    renderSecurity: 'sandboxed',
    sampleIds: ['html-status-panel'],
    transformIds: [...HTML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateHtml(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadHtmlLintSource(),
        ),
    ),
    viewIds: ['html-preview'],
  },
  json: {
    defaultViewId: 'structured-tree',
    detection: { priority: 85, sniff: sniffJson },
    description: 'Objects, arrays, payloads',
    icon: <Braces size={18} />,
    loadEditorExtensions: async () => {
      const { json } = await import('@codemirror/lang-json')
      return [json()]
    },
    id: 'json',
    label: 'JSON',
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['json-service-event'],
    transformIds: [...JSON_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateJson(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadJsonLintSource(),
        ),
    ),
    viewIds: ['structured-tree'],
  },
  jwt: {
    detection: { priority: 100, sniff: sniffJwt },
    description: 'Signed JSON Web Tokens (header.payload.signature)',
    icon: <KeyRound size={18} />,
    loadEditorExtensions: async () => {
      const { jwtLanguage } = await import('./utils/jwtLanguage')
      return [jwtLanguage]
    },
    id: 'jwt',
    label: 'JWT',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['jwt-access-token'],
    transformIds: [...JWT_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateJwt(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadJwtLintSource(),
        ),
    ),
    viewIds: [],
  },
  markdown: {
    defaultViewId: 'markdown-document',
    detection: { priority: 30, sniff: sniffMarkdown },
    description: 'Notes, docs, and fenced code',
    icon: <FileText size={18} />,
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
    viewIds: ['markdown-document'],
  },
  ndjson: {
    detection: { priority: 90, sniff: sniffNdjson },
    description: 'Newline-delimited JSON records (logs, streams)',
    icon: <FileJson size={18} />,
    loadEditorExtensions: async () => {
      const [{ StreamLanguage }, { json }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/javascript'),
      ])
      return [StreamLanguage.define(json)]
    },
    id: 'ndjson',
    label: 'NDJSON',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['ndjson-request-log'],
    transformIds: [...NDJSON_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateNdjson(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadNdjsonLintSource(),
        ),
    ),
    viewIds: [],
  },
  plain: {
    description: 'No highlighting',
    icon: <FileText size={18} />,
    loadEditorExtensions: async () => [],
    id: 'plain',
    label: 'Plain text',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: [],
    transformIds: [...GENERAL_TRANSFORMS],
    viewIds: [],
  },
  sql: {
    detection: { priority: 55, sniff: sniffSql },
    description: 'Queries and schema statements',
    icon: <Code2 size={18} />,
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
    validation: createValidationCapability(
      (value, context) =>
        import('./utils/formatValidation').then((module) =>
          module.validateSqlDialect(value, context.sqlParserDatabase ?? null),
        ),
      (context) =>
        context.sqlParserDatabase
          ? import('./utils/formatLinting').then((module) =>
              module.createSqlLintSource(context.sqlParserDatabase!),
            )
          : Promise.resolve(null),
    ),
    viewIds: [],
  },
  toml: {
    detection: {
      loadConfirm: () =>
        import('./utils/formatConfirmers').then((module) => module.confirmToml),
      priority: 70,
      sniff: sniffToml,
    },
    description: 'Config tables and arrays',
    icon: <FileText size={18} />,
    loadEditorExtensions: async () => {
      const [{ StreamLanguage }, { toml }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/toml'),
      ])
      return [StreamLanguage.define(toml)]
    },
    id: 'toml',
    label: 'TOML',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['toml-pipeline-config'],
    transformIds: [...TOML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateToml(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadTomlLintSource(),
        ),
    ),
    viewIds: [],
  },
  xml: {
    detection: {
      loadConfirm: () =>
        import('./utils/formatConfirmers').then((module) => module.confirmXml),
      priority: 79,
      sniff: sniffXml,
    },
    description: 'Markup documents and feeds',
    icon: <Code2 size={18} />,
    loadEditorExtensions: async () => {
      const { xml } = await import('@codemirror/lang-xml')
      return [xml()]
    },
    id: 'xml',
    label: 'XML',
    renderPolicy: 'explicit',
    renderSecurity: 'source-only',
    sampleIds: ['xml-pipeline-config'],
    transformIds: [...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateXml(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadXmlLintSource(),
        ),
    ),
    viewIds: [],
  },
  yaml: {
    defaultViewId: 'structured-tree',
    detection: {
      loadConfirm: () =>
        import('./utils/formatConfirmers').then((module) => module.confirmYaml),
      priority: 40,
      sniff: sniffYaml,
    },
    description: 'Config and manifests',
    icon: <Code2 size={18} />,
    loadEditorExtensions: async () => {
      const { yaml } = await import('@codemirror/lang-yaml')
      return [yaml()]
    },
    id: 'yaml',
    label: 'YAML',
    renderPolicy: 'automatic',
    renderSecurity: 'source-only',
    sampleIds: ['yaml-pipeline-config'],
    transformIds: [...YAML_TRANSFORMS, ...GENERAL_TRANSFORMS],
    validation: createValidationCapability(
      (value) =>
        import('./utils/formatValidation').then((module) =>
          module.validateYaml(value),
        ),
      () =>
        import('./utils/formatLinting').then((module) =>
          module.loadYamlLintSource(),
        ),
    ),
    viewIds: ['structured-tree'],
  },
} satisfies Record<SyntaxMode, FormatCapability>

export const FORMAT_OPTIONS = Object.values(FORMAT_DEFINITIONS)

export function getFormatDefinition(syntaxMode: SyntaxMode): FormatCapability {
  return FORMAT_DEFINITIONS[syntaxMode]
}
