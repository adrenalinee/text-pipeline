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
    description: 'Browser-side transform runner with async error handling',
    id: 'javascript-transform-runner',
    label: 'Transform runner JavaScript',
    syntaxMode: 'javascript',
    value: `export async function runTransform(input, transform) {
  const startedAt = performance.now()

  try {
    const output = await transform(input)
    return { durationMs: performance.now() - startedAt, output }
  } catch (error) {
    throw new Error(\`Transform failed: \${error.message}\`)
  }
}
`,
  },
  {
    description: 'Typed pipeline step and transform result',
    id: 'typescript-pipeline-step',
    label: 'Pipeline step TypeScript',
    syntaxMode: 'typescript',
    value: `type SyntaxMode = 'plain' | 'json' | 'yaml'

interface TransformResult {
  output: string
  outputFormat?: SyntaxMode
}

export async function applyStep(
  input: string,
  transform: (value: string) => Promise<TransformResult>,
): Promise<TransformResult> {
  return transform(input)
}
`,
  },
  {
    description: 'Small Go HTTP transform handler',
    id: 'go-transform-handler',
    label: 'Transform handler Go',
    syntaxMode: 'go',
    value: `package main

import (
	"encoding/json"
	"net/http"
)

type result struct {
	Output string \`json:"output"\`
}

func transformHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result{Output: "local transform"})
}
`,
  },
  {
    description: 'Raw JSON transform API request',
    id: 'http-transform-request',
    label: 'Transform request HTTP',
    syntaxMode: 'http',
    value: `POST /v1/transforms HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-Request-Id: req_7f3a9d

{"format":"json","transform":"json-format"}
`,
  },
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
  {
    description: 'Signed access token (header.payload.signature)',
    id: 'jwt-access-token',
    label: 'Access token JWT',
    syntaxMode: 'jwt',
    value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
  },
  {
    description: 'Newline-delimited transform log records',
    id: 'ndjson-request-log',
    label: 'Transform log NDJSON',
    syntaxMode: 'ndjson',
    value: `{"ts":"2026-06-07T14:22:08Z","level":"info","transform":"json-format","durationMs":42}
{"ts":"2026-06-07T14:22:09Z","level":"warn","transform":"yaml-to-json","durationMs":18}
{"ts":"2026-06-07T14:22:10Z","level":"error","transform":"html-minify","durationMs":73,"error":"parse"}
`,
  },
  {
    description: 'Query with variables and a reusable fragment',
    id: 'graphql-user-query',
    label: 'Pipeline run GraphQL',
    syntaxMode: 'graphql',
    value: `query PipelineRun($id: ID!) {
  pipelineRun(id: $id) {
    id
    status
    steps {
      ...StepFields
    }
  }
}

fragment StepFields on TransformStep {
  transform
  durationMs
  outputFormat
}
`,
  },
] satisfies ReadonlyArray<TextSample>
