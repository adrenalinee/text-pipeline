import type { TransformDefinition } from '../types'

export const TRANSFORM_PROGRESS_THRESHOLDS = {
  generalChars: 50_000,
  htmlChars: 5_000,
  minimumVisibleMs: 450,
  structuredChars: 10_000,
} as const

export function shouldShowTransformProgress(
  definition: TransformDefinition,
  input: string,
) {
  if (input.length >= TRANSFORM_PROGRESS_THRESHOLDS.generalChars) {
    return true
  }

  if (
    definition.id === 'html-compact' ||
    definition.id === 'html-format' ||
    definition.id === 'html-minify'
  ) {
    return input.length >= TRANSFORM_PROGRESS_THRESHOLDS.htmlChars
  }

  if (definition.group === 'format') {
    return input.length >= TRANSFORM_PROGRESS_THRESHOLDS.structuredChars
  }

  return false
}
