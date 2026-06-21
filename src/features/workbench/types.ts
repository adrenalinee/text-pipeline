import type { ReactNode } from 'react'
import type { Extension } from '@codemirror/state'
import type { LintSource } from '@codemirror/lint'

export type SyntaxMode =
  | 'plain'
  | 'csv'
  | 'diff'
  | 'html'
  | 'json'
  | 'markdown'
  | 'sql'
  | 'toml'
  | 'xml'
  | 'yaml'

export type TransformGroup = 'format' | 'general'

export type FormatRenderPolicy = 'automatic' | 'explicit'

export type FormatRenderSecurity = 'sanitized' | 'sandboxed' | 'source-only'

export type FormatViewId =
  | 'html-preview'
  | 'markdown-document'
  | 'structured-tree'
  | 'unavailable'

export type WorkbenchViewMode = 'source' | 'view'

export type TransformId =
  | 'base64-decode'
  | 'base64-encode'
  | 'html-compact'
  | 'html-format'
  | 'html-minify'
  | 'json-format'
  | 'json-minify'
  | 'json-to-toml'
  | 'json-to-yaml'
  | 'json-validate'
  | 'jsonpath-query'
  | 'sql-format'
  | 'sql-minify'
  | 'toml-to-json'
  | 'toml-to-yaml'
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
  inputFormats: ReadonlyArray<SyntaxMode> | '*'
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
  supportedFormats: ReadonlyArray<SyntaxMode>
}

export type FormatCapability = {
  defaultViewId?: FormatViewId
  description: string
  getEditorExtensions: () => Array<Extension>
  id: SyntaxMode
  label: string
  lintSource?: LintSource
  renderPolicy?: FormatRenderPolicy
  renderSecurity?: FormatRenderSecurity
  sampleIds: ReadonlyArray<string>
  transformIds: ReadonlyArray<TransformId>
  validation: 'supported' | 'unsupported'
  viewIds: ReadonlyArray<FormatViewId>
}
