import type { ReactNode } from 'react'

export type SyntaxMode = 'plain' | 'json' | 'markdown' | 'toml' | 'yaml'

export type TransformGroup = 'format' | 'general'

export type TransformId =
  | 'base64-decode'
  | 'base64-encode'
  | 'json-format'
  | 'json-minify'
  | 'json-to-toml'
  | 'json-to-yaml'
  | 'json-validate'
  | 'jsonpath-query'
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

export type TransformRunner = (input: string) => TransformResult

export type TransformRunnerMap = Partial<Record<TransformId, TransformRunner>>
