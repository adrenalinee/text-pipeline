import type { FormatDetectionContext, FormatDetectionEvidence } from '../types'

const HTML_TAGS = new Set([
  'article',
  'aside',
  'body',
  'button',
  'div',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'head',
  'header',
  'html',
  'img',
  'input',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'script',
  'section',
  'span',
  'style',
  'table',
  'tbody',
  'td',
  'textarea',
  'th',
  'thead',
  'tr',
  'ul',
])

function evidence(confidence: number, reason: string): FormatDetectionEvidence {
  return { confidence, reason }
}

function getNonEmptyLines(value: string) {
  return value
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getFirstTagName(value: string) {
  return value.match(/^\s*(?:<!doctype\s+html\s*>\s*)?<([a-zA-Z][\w:-]*)/i)?.[1]
}

function isObjectLike(value: unknown) {
  return typeof value === 'object' && value !== null
}

export function sniffJson({ value }: FormatDetectionContext) {
  const trimmed = value.trim()

  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null

  try {
    const parsed: unknown = JSON.parse(trimmed)

    return isObjectLike(parsed)
      ? evidence(1, 'The complete input is a JSON object or array.')
      : null
  } catch {
    return null
  }
}

export function sniffNdjson({ value }: FormatDetectionContext) {
  const lines = getNonEmptyLines(value)

  if (lines.length < 2) return null

  try {
    const records = lines.map((line) => JSON.parse(line) as unknown)

    return records.every(isObjectLike)
      ? evidence(1, 'Every non-empty line is a standalone JSON record.')
      : null
  } catch {
    return null
  }
}

export function sniffJwt({ value }: FormatDetectionContext) {
  const token = value.trim()
  const segments = token.split('.')

  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    return null
  }

  try {
    const header = JSON.parse(decodeBase64Url(segments[0])) as unknown
    JSON.parse(decodeBase64Url(segments[1]))

    if (
      typeof header !== 'object' ||
      header === null ||
      typeof (header as Record<string, unknown>).alg !== 'string'
    ) {
      return null
    }

    return evidence(
      1,
      'The input has three JWS segments with JSON header and payload data.',
    )
  } catch {
    return null
  }
}

export function sniffDiff({ sample }: FormatDetectionContext) {
  const hasFileHeaders =
    /^(?:diff --git .+|---\s+.+)$/m.test(sample) &&
    /^\+\+\+\s+.+$/m.test(sample)
  const hasHunk = /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m.test(sample)

  return hasFileHeaders && hasHunk
    ? evidence(1, 'Unified diff file headers and a hunk header were found.')
    : null
}

export function sniffHtml({ sample }: FormatDetectionContext) {
  if (/^\s*<!doctype\s+html(?:\s|>)/i.test(sample)) {
    return evidence(0.99, 'An HTML doctype was found.')
  }

  const tagName = getFirstTagName(sample)?.toLowerCase()

  return tagName && HTML_TAGS.has(tagName)
    ? evidence(0.82, `The document starts with the HTML <${tagName}> element.`)
    : null
}

export function sniffXml({ sample }: FormatDetectionContext) {
  if (/^\s*<\?xml(?:\s|\?>)/i.test(sample)) {
    return evidence(0.99, 'An XML declaration was found.')
  }

  const tagName = getFirstTagName(sample)?.toLowerCase()

  if (!tagName || HTML_TAGS.has(tagName)) return null

  return evidence(
    0.76,
    `The input starts with the custom root element <${tagName}>.`,
  )
}

export function sniffCsv({ sample }: FormatDetectionContext) {
  const lines = getNonEmptyLines(sample)

  if (lines.length < 2) return null

  const commaCounts = lines.slice(0, 20).map(countUnquotedCommas)

  return commaCounts[0] &&
    commaCounts.every((count) => count === commaCounts[0])
    ? evidence(0.76, 'Multiple rows have the same comma-delimited shape.')
    : null
}

export function sniffToml({ sample }: FormatDetectionContext) {
  const tableCount = (sample.match(/^\s*\[\[?[\w.-]+\]?\]\s*$/gm) ?? []).length
  const assignmentCount = (sample.match(/^\s*[\w.-]+\s*=\s*.+$/gm) ?? []).length

  return tableCount >= 1 && assignmentCount >= 1
    ? evidence(0.8, 'TOML table and key assignment syntax were found.')
    : assignmentCount >= 3
      ? evidence(0.72, 'Several TOML-style key assignments were found.')
      : null
}

export function sniffYaml({ sample }: FormatDetectionContext) {
  const firstCharacter = sample.trimStart()[0]

  if (firstCharacter === '[' || firstCharacter === '{') return null

  const mappingCount = (sample.match(/^\s*[\w.-]+\s*:\s*(?:.+)?$/gm) ?? [])
    .length
  const sequenceCount = (sample.match(/^\s*-\s+.+$/gm) ?? []).length

  return mappingCount >= 2 || (mappingCount >= 1 && sequenceCount >= 1)
    ? evidence(0.7, 'Repeated YAML mapping or sequence syntax was found.')
    : null
}

export function sniffGraphql({ sample }: FormatDetectionContext) {
  const hasDocumentKeyword =
    /^\s*(?:query|mutation|subscription|fragment|schema|type|interface|enum|input|directive)\b/m.test(
      sample,
    )
  const hasSelection = /\{[\s\S]*\}/.test(sample)

  return hasDocumentKeyword && hasSelection
    ? evidence(0.8, 'A GraphQL document keyword and selection set were found.')
    : null
}

export function sniffGo({ sample }: FormatDetectionContext) {
  const hasPackage = /^\s*package\s+[A-Za-z_]\w*\s*$/m.test(sample)
  const hasDeclaration = /^\s*(?:func|type|var|const)\s+[A-Za-z_]\w*/m.test(
    sample,
  )

  return hasPackage && hasDeclaration
    ? evidence(0.99, 'A Go package clause and declaration were found.')
    : null
}

export function sniffHttp({ sample }: FormatDetectionContext) {
  const firstLine = getNonEmptyLines(sample)[0]

  if (!firstLine) return null

  const isRequest =
    /^(?:GET|HEAD|POST|PUT|PATCH|DELETE|CONNECT|OPTIONS|TRACE)\s+\S+\s+HTTP\/\d(?:\.\d)?$/i.test(
      firstLine,
    )
  const isResponse = /^HTTP\/\d(?:\.\d)?\s+\d{3}(?:\s+.*)?$/i.test(firstLine)
  const hasHeader = /^[-!#$%&'*+.^_`|~0-9A-Za-z]+\s*:\s*.*$/m.test(sample)

  return (isRequest || isResponse) && hasHeader
    ? evidence(1, 'An HTTP start line and header field were found.')
    : null
}

export function sniffTypescript({ sample }: FormatDetectionContext) {
  if (sniffGo({ sample, value: sample })) return null

  const hasTypeSyntax =
    /\b(?:interface|type|enum|namespace|implements|declare)\s+[A-Za-z_$]/.test(
      sample,
    ) ||
    /(?:\b(?:const|let|var)\s+[A-Za-z_$][\w$]*|\([^)]*\))\s*:\s*[A-Za-z_$][\w$<>{}[\]|&?, ]*(?:=|=>)/.test(
      sample,
    )
  const hasProgramStructure =
    /\b(?:import|export|function|class|const|let|var)\b/.test(sample)

  return hasTypeSyntax && hasProgramStructure
    ? evidence(
        0.98,
        'TypeScript type syntax and program declarations were found.',
      )
    : null
}

export function sniffJavascript({ sample }: FormatDetectionContext) {
  if (
    sniffTypescript({ sample, value: sample }) ||
    sniffGo({ sample, value: sample })
  ) {
    return null
  }

  const hasDeclaration =
    /\b(?:const|let|var|function|class|import|export)\b/.test(sample)
  const hasJavaScriptStructure =
    /=>|\b(?:async|await|new|return)\b|\.[A-Za-z_$][\w$]*\s*\(/.test(sample)

  return hasDeclaration && hasJavaScriptStructure
    ? evidence(
        0.96,
        'JavaScript declarations and executable syntax were found.',
      )
    : null
}

export function sniffSql({ sample }: FormatDetectionContext) {
  const normalized = sample.replace(
    /^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/i,
    '',
  )
  const firstKeyword = normalized
    .match(
      /^\s*(select|with|insert|update|delete|create|alter|drop|merge)\b/i,
    )?.[1]
    ?.toLowerCase()

  if (!firstKeyword) return null

  const companionPatterns: Record<string, RegExp> = {
    alter: /\b(?:table|column)\b/i,
    create: /\b(?:table|view|index|schema)\b/i,
    delete: /\bfrom\b/i,
    drop: /\b(?:table|view|index|schema)\b/i,
    insert: /\binto\b[\s\S]*\bvalues\b/i,
    merge: /\binto\b[\s\S]*\busing\b/i,
    select: /\bfrom\b/i,
    update: /\bset\b/i,
    with: /\bselect\b[\s\S]*\bfrom\b/i,
  }

  return companionPatterns[firstKeyword].test(normalized)
    ? evidence(0.94, 'A SQL statement and its structural clause were found.')
    : null
}

export function sniffMarkdown({ sample }: FormatDetectionContext) {
  const markers = [
    /^#{1,6}\s+\S/m,
    /^\s*[-*+]\s+\S/m,
    /^\s*>\s+\S/m,
    /^```[\w-]*\s*$/m,
    /\[[^\]]+\]\([^)]+\)/,
  ]
  const markerCount = markers.filter((pattern) => pattern.test(sample)).length

  return markerCount >= 2
    ? evidence(0.92, 'Multiple distinct Markdown structures were found.')
    : null
}

function countUnquotedCommas(line: string) {
  let count = 0
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      count += 1
    }
  }

  return count
}

function decodeBase64Url(segment: string) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}
