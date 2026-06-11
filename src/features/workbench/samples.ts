import type { SyntaxMode } from './types'

export type TextSample = {
  description: string
  id: string
  label: string
  syntaxMode: Extract<SyntaxMode, 'json' | 'markdown' | 'toml' | 'yaml'>
  value: string
}

export const TEXT_SAMPLES = [
  {
    description: 'Nested service event with request metadata',
    id: 'json-service-event',
    label: 'Service event JSON',
    syntaxMode: 'json',
    value: `{
  "timestamp": "2026-06-07T14:22:08Z",
  "service": "text-pipeline",
  "level": "info",
  "request": {
    "id": "req_7f3a9d",
    "method": "POST",
    "path": "/v1/transforms",
    "durationMs": 42
  },
  "payload": {
    "format": "json",
    "transforms": ["json-format", "base64-encode"],
    "preview": true
  }
}`,
  },
  {
    description: 'Pipeline configuration with transforms and retention',
    id: 'yaml-pipeline-config',
    label: 'Pipeline config YAML',
    syntaxMode: 'yaml',
    value: `service: text-pipeline
environment: local
input:
  format: yaml
  preserveSource: true
transforms:
  - id: yaml-to-json
    enabled: true
  - id: json-minify
    enabled: false
history:
  branchMode: true
  retention:
    maxCommits: 25
    persistLocal: false
`,
  },
  {
    description: 'Release notes with a fenced JSON payload',
    id: 'markdown-release-notes',
    label: 'Release notes Markdown',
    syntaxMode: 'markdown',
    value: `# Text Pipeline notes

- Keep source input intact.
- Commit every transform as a pipeline step.
- Highlight fenced code blocks.

> Sensitive payloads should stay in the browser.

\`\`\`json
{
  "service": "text-pipeline",
  "format": "markdown",
  "localOnly": true
}
\`\`\`
`,
  },
  {
    description: 'Pipeline configuration with nested tables',
    id: 'toml-pipeline-config',
    label: 'Pipeline config TOML',
    syntaxMode: 'toml',
    value: `service = "text-pipeline"
environment = "local"

[input]
format = "toml"
preserveSource = true

[[transforms]]
id = "toml-to-json"
enabled = true

[[transforms]]
id = "json-minify"
enabled = false

[history]
branchMode = true

[history.retention]
maxCommits = 25
persistLocal = false
`,
  },
] satisfies ReadonlyArray<TextSample>
