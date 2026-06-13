import { describe, expect, it } from 'vitest'

import type { TransformDefinition } from '../types'
import {
  shouldShowTransformProgress,
  TRANSFORM_PROGRESS_THRESHOLDS,
} from './progress'

function transform(
  overrides: Partial<TransformDefinition>,
): TransformDefinition {
  return {
    description: 'Test transform',
    group: 'general',
    id: 'url-encode',
    inputFormats: '*',
    label: 'Test transform',
    outputFormat: 'plain',
    ...overrides,
  }
}

function text(length: number) {
  return 'x'.repeat(length)
}

describe('shouldShowTransformProgress', () => {
  it('shows progress for large general transforms', () => {
    expect(
      shouldShowTransformProgress(
        transform({ id: 'base64-encode' }),
        text(TRANSFORM_PROGRESS_THRESHOLDS.generalChars),
      ),
    ).toBe(true)
  })

  it('uses a lower threshold for HTML transforms', () => {
    expect(
      shouldShowTransformProgress(
        transform({ group: 'format', id: 'html-compact' }),
        text(TRANSFORM_PROGRESS_THRESHOLDS.htmlChars - 1),
      ),
    ).toBe(false)
    expect(
      shouldShowTransformProgress(
        transform({ group: 'format', id: 'html-minify' }),
        text(TRANSFORM_PROGRESS_THRESHOLDS.htmlChars),
      ),
    ).toBe(true)
  })

  it('uses a structured format threshold for non-HTML format transforms', () => {
    expect(
      shouldShowTransformProgress(
        transform({ group: 'format', id: 'json-format' }),
        text(TRANSFORM_PROGRESS_THRESHOLDS.structuredChars - 1),
      ),
    ).toBe(false)
    expect(
      shouldShowTransformProgress(
        transform({ group: 'format', id: 'json-minify' }),
        text(TRANSFORM_PROGRESS_THRESHOLDS.structuredChars),
      ),
    ).toBe(true)
  })
})
