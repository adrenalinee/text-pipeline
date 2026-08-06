import { FORMAT_OPTIONS } from '../formats'
import type {
  FormatDetectionConfirmer,
  FormatDetectionEvidence,
  FormatDetectionResult,
  SyntaxMode,
} from '../types'

export const FORMAT_DETECTION_DEBOUNCE_MS = 350
export const FORMAT_DETECTION_MAX_CHARS = 2 * 1024 * 1024
export const FORMAT_DETECTION_SAMPLE_CHARS = 64 * 1024
export const FORMAT_DETECTION_MIN_CONFIDENCE = 0.9
export const FORMAT_DETECTION_MIN_MARGIN = 0.15

export type FormatDetectionAttempt =
  | { result: FormatDetectionResult; status: 'detected' }
  | { result: null; status: 'empty' | 'too-large' | 'undetermined' }

type Candidate = FormatDetectionEvidence & {
  format: Exclude<SyntaxMode, 'plain'>
  loadConfirm?: () => Promise<FormatDetectionConfirmer>
  priority: number
}

export async function detectFormat(
  value: string,
): Promise<FormatDetectionAttempt> {
  if (value.trim().length === 0) {
    return { result: null, status: 'empty' }
  }

  if (value.length > FORMAT_DETECTION_MAX_CHARS) {
    return { result: null, status: 'too-large' }
  }

  const context = {
    sample: value.slice(0, FORMAT_DETECTION_SAMPLE_CHARS),
    value,
  }
  const candidates = FORMAT_OPTIONS.flatMap((definition) => {
    if (definition.id === 'plain') return []

    const detection = definition.detection
    const match = detection.sniff(context)

    return match
      ? [
          {
            ...match,
            format: definition.id,
            loadConfirm:
              'loadConfirm' in detection ? detection.loadConfirm : undefined,
            priority: detection.priority,
          } satisfies Candidate,
        ]
      : []
  }).sort(compareCandidates)
  const shortlist = candidates
    .filter(({ confidence }) => confidence >= 0.55)
    .slice(0, 2)
  const confirmed: Array<Candidate> = []

  for (const candidate of shortlist) {
    const { loadConfirm } = candidate

    if (!loadConfirm) {
      confirmed.push(candidate)
      continue
    }

    try {
      const confirm = await loadConfirm()

      if (await confirm(value)) {
        confirmed.push({
          ...candidate,
          confidence: Math.max(0.95, candidate.confidence),
        })
      }
    } catch {
      // A failed optional parser must not change the editor or prevent manual selection.
    }
  }

  confirmed.sort(compareCandidates)

  const winner = confirmed.at(0)
  const runnerUp = confirmed.at(1)
  const margin = winner ? winner.confidence - (runnerUp?.confidence ?? 0) : 0

  if (
    !winner ||
    winner.confidence < FORMAT_DETECTION_MIN_CONFIDENCE ||
    margin < FORMAT_DETECTION_MIN_MARGIN
  ) {
    return { result: null, status: 'undetermined' }
  }

  return {
    result: {
      confidence: winner.confidence,
      format: winner.format,
      reason: winner.reason,
    },
    status: 'detected',
  }
}

function compareCandidates(left: Candidate, right: Candidate) {
  const confidenceDifference = right.confidence - left.confidence

  if (confidenceDifference !== 0) return confidenceDifference

  return right.priority - left.priority
}
