// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { TEXT_SAMPLES } from '../samples'
import { detectFormat, FORMAT_DETECTION_MAX_CHARS } from './formatDetection'

describe('format detection', () => {
  it.each(TEXT_SAMPLES)(
    'detects $label conservatively as $syntaxMode',
    async (sample) => {
      const attempt = await detectFormat(sample.value)

      expect(attempt).toMatchObject({
        result: { format: sample.syntaxMode },
        status: 'detected',
      })
    },
  )

  it('prefers NDJSON over a single JSON document', async () => {
    const attempt = await detectFormat('{"id":1}\n{"id":2}\n')

    expect(attempt.result?.format).toBe('ndjson')
  })

  it('distinguishes known HTML elements from custom XML roots', async () => {
    await expect(
      detectFormat('<main><p>Status</p></main>'),
    ).resolves.toMatchObject({ result: { format: 'html' } })
    await expect(
      detectFormat('<pipeline><step id="one" /></pipeline>'),
    ).resolves.toMatchObject({ result: { format: 'xml' } })
  })

  it('does not guess ambiguous prose or incomplete structured text', async () => {
    await expect(detectFormat('SELECT a better option')).resolves.toMatchObject(
      {
        result: null,
        status: 'undetermined',
      },
    )
    await expect(detectFormat('{"service":')).resolves.toMatchObject({
      result: null,
      status: 'undetermined',
    })
    await expect(detectFormat('# One heading only')).resolves.toMatchObject({
      result: null,
      status: 'undetermined',
    })
  })

  it('keeps empty and oversized input out of automatic parsing', async () => {
    await expect(detectFormat('   ')).resolves.toEqual({
      result: null,
      status: 'empty',
    })
    await expect(
      detectFormat('x'.repeat(FORMAT_DETECTION_MAX_CHARS + 1)),
    ).resolves.toEqual({ result: null, status: 'too-large' })
  })
})
