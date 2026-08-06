import type { ReactNode } from 'react'
import type { Extension } from '@codemirror/state'
import type { LintSource } from '@codemirror/lint'

export type SyntaxMode =
  | 'plain'
  | 'csv'
  | 'diff'
  | 'go'
  | 'graphql'
  | 'html'
  | 'http'
  | 'javascript'
  | 'json'
  | 'jwt'
  | 'markdown'
  | 'ndjson'
  | 'sql'
  | 'toml'
  | 'typescript'
  | 'xml'
  | 'yaml'

export type TransformGroup = 'format' | 'general'

export type FormatRenderPolicy = 'automatic' | 'explicit'

export type FormatRenderSecurity = 'sanitized' | 'sandboxed' | 'source-only'

export type FormatDetectionContext = {
  sample: string
  value: string
}

export type FormatDetectionEvidence = {
  confidence: number
  reason: string
}

export type FormatDetectionConfirmer = (
  value: string,
) => Promise<boolean> | boolean

export type FormatDetectionCapability = {
  loadConfirm?: () => Promise<FormatDetectionConfirmer>
  priority: number
  sniff: (context: FormatDetectionContext) => FormatDetectionEvidence | null
}

export type FormatDetectionResult = FormatDetectionEvidence & {
  format: Exclude<SyntaxMode, 'plain'>
}

export type FormatSelectionState =
  | { mode: 'auto' }
  | {
      mode: 'locked'
      origin: 'detected' | 'known' | 'manual'
      result?: FormatDetectionResult
    }

export type FormatValidationIssue = {
  column: number
  line: number
  position?: number
}

export type FormatValidationResult = {
  issue?: FormatValidationIssue
  message: string
  status: 'invalid' | 'unsupported' | 'valid'
  title: string
}

export type FormatValidationContext = {
  sqlParserDatabase?: string | null
}

export type FormatValidationCapability = {
  loadLintSource: (
    context: FormatValidationContext,
  ) => Promise<LintSource | null>
  validate: (
    value: string,
    context: FormatValidationContext,
  ) => Promise<FormatValidationResult>
}

export type FormatViewId =
  | 'diff-patch'
  | 'html-preview'
  | 'markdown-document'
  | 'structured-tree'
  | 'unavailable'

export type WorkbenchViewMode = 'source' | 'view'

export type TransformId =
  | 'base64-decode'
  | 'base64-encode'
  | 'crop-selection'
  | 'graphql-format'
  | 'graphql-minify'
  | 'html-compact'
  | 'html-format'
  | 'html-minify'
  | 'javascript-format'
  | 'json-format'
  | 'json-minify'
  | 'json-to-ndjson'
  | 'json-to-toml'
  | 'json-to-yaml'
  | 'json-validate'
  | 'jsonpath-query'
  | 'jwt-decode'
  | 'ndjson-to-json'
  | 'sql-format'
  | 'sql-minify'
  | 'toml-to-json'
  | 'toml-to-yaml'
  | 'typescript-format'
  | 'url-decode'
  | 'url-encode'
  | 'yaml-to-json'
  | 'yaml-to-toml'

export type TextCommit = {
  afterText: string
  afterSyntaxMode: SyntaxMode
  beforeText: string
  beforeSyntaxMode: SyntaxMode
  charDelta: number
  description: string
  id: string
  lineDelta: number
  parentId: string
  title: string
  timestamp: string
}

export type TransformAction = {
  description: string
  disabled?: boolean
  icon: ReactNode
  id: string
  label: string
  onClick: () => void
}

export type TransformActionSection = {
  actions: Array<TransformAction>
  id: TransformGroup
  title: string
}

export type TransformDefinition = {
  description: string
  group: TransformGroup
  id: TransformId
  label: string
  outputFormat?: SyntaxMode
}

export type TransformResult = {
  output: string
  outputFormat?: SyntaxMode
}

export type TransformRunner = (
  input: string,
) => Promise<TransformResult> | TransformResult

export type TransformRunnerMap = Partial<Record<TransformId, TransformRunner>>

export type FormatViewRenderProps = {
  syntaxMode: SyntaxMode
  value: string
}

export type FormatViewDefinition = {
  description: string
  id: FormatViewId
  label: string
  render: (props: FormatViewRenderProps) => ReactNode
}

export type FormatCapability = {
  defaultViewId?: FormatViewId
  detection?: FormatDetectionCapability
  description: string
  icon: ReactNode
  // Editor extensions (CodeMirror language modes) are loaded on demand so their
  // packages stay out of the initial bundle until the format is activated.
  loadEditorExtensions: () => Promise<Array<Extension>>
  id: SyntaxMode
  label: string
  renderPolicy?: FormatRenderPolicy
  renderSecurity?: FormatRenderSecurity
  sampleIds: ReadonlyArray<string>
  transformIds: ReadonlyArray<TransformId>
  validation?: FormatValidationCapability
  viewIds: ReadonlyArray<FormatViewId>
}
