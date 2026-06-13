import type { SyntaxMode } from './types'

export type TextSample = {
  description: string
  id: string
  label: string
  syntaxMode: Extract<
    SyntaxMode,
    'html' | 'json' | 'markdown' | 'toml' | 'yaml'
  >
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
    description: 'Static admin panel fragment with inline styles',
    id: 'html-status-panel',
    label: 'Status panel HTML',
    syntaxMode: 'html',
    value: `<main class="status-panel">
  <style>
    .status-panel {
      color: #1f2937;
      font-family: ui-sans-serif, system-ui, sans-serif;
      padding: 24px;
    }

    .status-panel table {
      border-collapse: collapse;
      width: 100%;
    }

    .status-panel th,
    .status-panel td {
      border-bottom: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
    }
  </style>
  <h1>Pipeline status</h1>
  <p>Local transforms are running in the browser.</p>
  <table>
    <thead>
      <tr>
        <th>Format</th>
        <th>Validation</th>
        <th>View mode</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>HTML</td>
        <td>Parse errors</td>
        <td>Sandboxed preview</td>
      </tr>
    </tbody>
  </table>
</main>`,
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
