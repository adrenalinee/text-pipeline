import type { SyntaxMode } from './types'

export type TextSample = {
  description: string
  id: string
  label: string
  syntaxMode: Exclude<SyntaxMode, 'plain'>
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
  {
    description: 'Pipeline configuration expressed as XML elements',
    id: 'xml-pipeline-config',
    label: 'Pipeline config XML',
    syntaxMode: 'xml',
    value: `<?xml version="1.0" encoding="UTF-8"?>
<pipeline service="text-pipeline" environment="local">
  <input format="xml" preserveSource="true" />
  <transforms>
    <transform id="json-format" enabled="true" />
    <transform id="base64-encode" enabled="false" />
  </transforms>
  <!-- Local transforms run in the browser -->
  <history maxCommits="25" persistLocal="false" />
</pipeline>
`,
  },
  {
    description: 'Transform run metrics with a quoted field',
    id: 'csv-pipeline-metrics',
    label: 'Transform metrics CSV',
    syntaxMode: 'csv',
    value: `transform,format,duration_ms,success
json-format,json,42,true
yaml-to-json,yaml,18,true
"html-minify, dom",html,73,false
base64-encode,plain,5,true
`,
  },
  {
    description: 'Unified diff updating the pipeline config',
    id: 'diff-pipeline-config',
    label: 'Pipeline config diff',
    syntaxMode: 'diff',
    value: `--- a/pipeline.yaml
+++ b/pipeline.yaml
@@ -1,5 +1,5 @@
-service: text-pipeline
+service: text-pipeline-v2
 environment: local
 transforms:
-  - id: json-minify
+  - id: json-format
   - id: base64-encode
`,
  },
  {
    description: 'Aggregate report over recorded transform events',
    id: 'sql-event-report',
    label: 'Event report SQL',
    syntaxMode: 'sql',
    value: `-- Aggregate transform events by format
SELECT
  format,
  COUNT(*) AS total,
  AVG(duration_ms) AS avg_duration
FROM transform_events
WHERE success = TRUE
  AND created_at >= '2026-06-01'
GROUP BY format
ORDER BY total DESC
LIMIT 10;
`,
  },
] satisfies ReadonlyArray<TextSample>
