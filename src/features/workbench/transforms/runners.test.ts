import { describe, expect, it } from 'vitest'

import type { TransformId, TransformRunner } from '../types'
import { TRANSFORM_RUNNERS } from './runners'

describe('transform runners', () => {
  it('formats JavaScript with its parser loaded on demand', async () => {
    expect(
      await runTransform(
        'javascript-format',
        'export const run=async(input)=>{return await input.text()}',
      ),
    ).toEqual({
      output:
        'export const run = async (input) => {\n  return await input.text()\n}\n',
      outputFormat: 'javascript',
    })
  })

  it('formats TypeScript while preserving type syntax', async () => {
    expect(
      await runTransform(
        'typescript-format',
        'export const run=(input:string):Promise<string>=>Promise.resolve(input)',
      ),
    ).toEqual({
      output:
        'export const run = (input: string): Promise<string> => Promise.resolve(input)\n',
      outputFormat: 'typescript',
    })
  })

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

  it('compacts HTML without reparsing or removing comments', async () => {
    expect(
      await runTransform(
        'html-compact',
        '<!-- note -->\n<main>\n  <h1>Hi</h1>\n  <p>Hello\n    <strong>team</strong>\n  </p>\n</main>',
      ),
    ).toEqual({
      output:
        '<!-- note --><main><h1>Hi</h1><p>Hello <strong>team</strong></p></main>',
      outputFormat: 'html',
    })
  })

  it('preserves raw text contents while compacting HTML', async () => {
    expect(
      await runTransform(
        'html-compact',
        '<style>\n  .status-panel { color: red; }\n</style>\n<main>ok</main>',
      ),
    ).toEqual({
      output:
        '<style>\n  .status-panel { color: red; }\n</style><main>ok</main>',
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

  it('decodes a JWT into header, payload, and signature JSON', async () => {
    const { output, outputFormat } = await runTransform(
      'jwt-decode',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    )

    expect(outputFormat).toBe('json')

    const decoded = JSON.parse(output)

    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(decoded.payload).toMatchObject({
      name: 'John Doe',
      sub: '1234567890',
    })
    expect(decoded.signature).toBe(
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    )
  })

  it('rejects JWT decode when the token does not have three segments', async () => {
    await expect(runTransform('jwt-decode', 'header.payload')).rejects.toThrow(
      'JWT must have 3 dot-separated segments but found 2.',
    )
  })

  it('parses NDJSON into a pretty printed JSON array', async () => {
    expect(await runTransform('ndjson-to-json', '{"a":1}\n{"b":2}\n')).toEqual({
      output: '[\n  {\n    "a": 1\n  },\n  {\n    "b": 2\n  }\n]',
      outputFormat: 'json',
    })
  })

  it('serializes a JSON array into NDJSON lines', async () => {
    expect(await runTransform('json-to-ndjson', '[{"a":1},{"b":2}]')).toEqual({
      output: '{"a":1}\n{"b":2}',
      outputFormat: 'ndjson',
    })
  })

  it('rejects JSON to NDJSON when the JSON is not an array', async () => {
    await expect(runTransform('json-to-ndjson', '{"a":1}')).rejects.toThrow(
      'JSON to NDJSON requires a top-level array.',
    )
  })

  it('formats a GraphQL document', async () => {
    expect(
      await runTransform('graphql-format', 'query{user{id name}}'),
    ).toEqual({
      output: '{\n  user {\n    id\n    name\n  }\n}',
      outputFormat: 'graphql',
    })
  })

  it('minifies a GraphQL document', async () => {
    expect(
      await runTransform(
        'graphql-minify',
        'query {\n  user {\n    id\n    name\n  }\n}\n',
      ),
    ).toEqual({
      output: 'query{user{id name}}',
      outputFormat: 'graphql',
    })
  })
})

async function runTransform(id: TransformId, input: string) {
  const runner: TransformRunner | undefined = TRANSFORM_RUNNERS[id]

  if (!runner) {
    throw new Error(`Missing runner for ${id}.`)
  }

  return await runner(input)
}
