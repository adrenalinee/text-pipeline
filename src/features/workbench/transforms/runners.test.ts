import { describe, expect, it } from 'vitest'

import type { TransformId, TransformRunner } from '../types'
import { TRANSFORM_RUNNERS } from './runners'

describe('transform runners', () => {
  it('encodes and decodes URL text', () => {
    expect(runTransform('url-encode', 'a b&c=/')).toEqual({
      output: 'a%20b%26c%3D%2F',
      outputFormat: 'plain',
    })
    expect(runTransform('url-decode', 'a%20b%26c%3D%2F')).toEqual({
      output: 'a b&c=/',
      outputFormat: 'plain',
    })
  })

  it('encodes and decodes UTF-8 Base64 text', () => {
    const encoded = runTransform('base64-encode', 'hello 안녕')

    expect(encoded).toEqual({
      output: 'aGVsbG8g7JWI64WV',
      outputFormat: 'plain',
    })
    expect(runTransform('base64-decode', encoded.output)).toEqual({
      output: 'hello 안녕',
      outputFormat: 'plain',
    })
  })

  it('converts YAML to pretty printed JSON', () => {
    expect(
      runTransform(
        'yaml-to-json',
        'service: text-pipeline\nstatus: draft\nitems:\n  - one\n  - two\n',
      ),
    ).toEqual({
      output:
        '{\n  "service": "text-pipeline",\n  "status": "draft",\n  "items": [\n    "one",\n    "two"\n  ]\n}',
      outputFormat: 'json',
    })
  })
})

function runTransform(id: TransformId, input: string) {
  const runner: TransformRunner | undefined = TRANSFORM_RUNNERS[id]

  if (!runner) {
    throw new Error(`Missing runner for ${id}.`)
  }

  return runner(input)
}
