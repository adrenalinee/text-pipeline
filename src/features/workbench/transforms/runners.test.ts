import { describe, expect, it } from 'vitest'

import type { TransformId, TransformRunner } from '../types'
import { TRANSFORM_RUNNERS } from './runners'

describe('transform runners', () => {
  it('encodes and decodes URL text', async () => {
    expect(await runTransform('url-encode', 'a b&c=/')).toEqual({
      output: 'a%20b%26c%3D%2F',
      outputFormat: 'plain',
    })
    expect(await runTransform('url-decode', 'a%20b%26c%3D%2F')).toEqual({
      output: 'a b&c=/',
      outputFormat: 'plain',
    })
  })

  it('encodes and decodes UTF-8 Base64 text', async () => {
    const encoded = await runTransform('base64-encode', 'hello 안녕')

    expect(encoded).toEqual({
      output: 'aGVsbG8g7JWI64WV',
      outputFormat: 'plain',
    })
    expect(await runTransform('base64-decode', encoded.output)).toEqual({
      output: 'hello 안녕',
      outputFormat: 'plain',
    })
  })

  it('formats HTML with Prettier', async () => {
    expect(
      await runTransform('html-format', '<main><h1>Hi</h1><p>x</p></main>'),
    ).toEqual({
      output: '<main>\n  <h1>Hi</h1>\n  <p>x</p>\n</main>\n',
      outputFormat: 'html',
    })
  })

  it('minifies HTML conservatively', async () => {
    expect(
      await runTransform(
        'html-minify',
        '<!-- note --><main>\n  <h1>Hi</h1>\n  <p>Hello <strong>team</strong></p>\n</main>',
      ),
    ).toEqual({
      output: '<main><h1>Hi</h1><p>Hello <strong>team</strong></p></main>',
      outputFormat: 'html',
    })
  })

  it('preserves raw text contents while minifying HTML', async () => {
    expect(
      await runTransform(
        'html-minify',
        '<style>\n  .status-panel { color: red; }\n</style>',
      ),
    ).toEqual({
      output: '<style>\n  .status-panel { color: red; }\n</style>',
      outputFormat: 'html',
    })
  })

  it('converts YAML to pretty printed JSON', async () => {
    expect(
      await runTransform(
        'yaml-to-json',
        'service: text-pipeline\nstatus: draft\nitems:\n  - one\n  - two\n',
      ),
    ).toEqual({
      output:
        '{\n  "service": "text-pipeline",\n  "status": "draft",\n  "items": [\n    "one",\n    "two"\n  ]\n}',
      outputFormat: 'json',
    })
  })

  it('converts JSON to YAML', async () => {
    expect(
      await runTransform(
        'json-to-yaml',
        '{"service":"text-pipeline","items":["one","two"]}',
      ),
    ).toEqual({
      output: 'service: text-pipeline\nitems:\n  - one\n  - two\n',
      outputFormat: 'yaml',
    })
  })

  it('converts JSON to TOML', async () => {
    expect(
      await runTransform(
        'json-to-toml',
        '{"service":"text-pipeline","items":["one","two"],"request":{"enabled":true,"durationMs":42}}',
      ),
    ).toEqual({
      output:
        'service = "text-pipeline"\nitems = [ "one", "two" ]\n\n[request]\nenabled = true\ndurationMs = 42\n',
      outputFormat: 'toml',
    })
  })

  it('converts YAML to TOML', async () => {
    expect(
      await runTransform(
        'yaml-to-toml',
        'service: text-pipeline\nitems:\n  - one\n  - two\nrequest:\n  enabled: true\n  durationMs: 42\n',
      ),
    ).toEqual({
      output:
        'service = "text-pipeline"\nitems = [ "one", "two" ]\n\n[request]\nenabled = true\ndurationMs = 42\n',
      outputFormat: 'toml',
    })
  })

  it('converts TOML to pretty printed JSON', async () => {
    expect(
      await runTransform(
        'toml-to-json',
        'service = "text-pipeline"\nitems = [ "one", "two" ]\n\n[request]\nenabled = true\ndurationMs = 42\n',
      ),
    ).toEqual({
      output:
        '{\n  "service": "text-pipeline",\n  "items": [\n    "one",\n    "two"\n  ],\n  "request": {\n    "enabled": true,\n    "durationMs": 42\n  }\n}',
      outputFormat: 'json',
    })
  })

  it('converts TOML to YAML', async () => {
    expect(
      await runTransform(
        'toml-to-yaml',
        'service = "text-pipeline"\nitems = [ "one", "two" ]\n\n[request]\nenabled = true\ndurationMs = 42\n',
      ),
    ).toEqual({
      output:
        'service: text-pipeline\nitems:\n  - one\n  - two\nrequest:\n  enabled: true\n  durationMs: 42\n',
      outputFormat: 'yaml',
    })
  })

  it('rejects TOML output when the source value cannot be represented', async () => {
    await expect(
      runTransform('json-to-toml', '{"service":null}'),
    ).rejects.toThrow(
      'TOML output does not support null values at root.service.',
    )
  })

  it('rejects JSON output when TOML contains non-finite numbers', async () => {
    await expect(
      runTransform('toml-to-json', 'metric = nan\n'),
    ).rejects.toThrow(
      'JSON output does not support non-finite numbers at root.metric.',
    )
  })
})

async function runTransform(id: TransformId, input: string) {
  const runner: TransformRunner | undefined = TRANSFORM_RUNNERS[id]

  if (!runner) {
    throw new Error(`Missing runner for ${id}.`)
  }

  return await runner(input)
}
