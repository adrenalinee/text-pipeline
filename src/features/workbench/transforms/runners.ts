import type { DefaultTreeAdapterTypes, ParserError } from 'parse5'
import type { SqlLanguage } from 'sql-formatter'

import type { TransformRunnerMap } from '../types'
import { decodeBase64Url } from '../utils/formatValidation'

// Heavy parsers/serializers (js-yaml, parse5, smol-toml, graphql) are loaded
// through dynamic import() so they only enter the bundle when a transform that
// needs them actually runs. import() results are cached by the runtime, so
// repeated transforms do not re-download the module.
const loadYaml = () => import('js-yaml')
const loadParse5 = () => import('parse5')
const loadSmolToml = () => import('smol-toml')

export const TRANSFORM_RUNNERS: TransformRunnerMap = {
  'base64-decode': (input) => ({
    output: decodeBase64(input),
    outputFormat: 'plain',
  }),
  'base64-encode': (input) => ({
    output: encodeBase64(input),
    outputFormat: 'plain',
  }),
  'graphql-format': async (input) => ({
    output: await formatGraphql(input),
    outputFormat: 'graphql',
  }),
  'graphql-minify': async (input) => ({
    output: await minifyGraphql(input),
    outputFormat: 'graphql',
  }),
  'html-compact': (input) => ({
    output: compactHtml(input),
    outputFormat: 'html',
  }),
  'html-format': async (input) => ({
    output: await formatHtml(input),
    outputFormat: 'html',
  }),
  'html-minify': async (input) => ({
    output: await minifyHtml(input),
    outputFormat: 'html',
  }),
  'sql-format': async (input) => ({
    output: await formatSqlWithDialect(input, 'sql'),
    outputFormat: 'sql',
  }),
  'sql-minify': (input) => ({
    output: minifySql(input),
    outputFormat: 'sql',
  }),
  'json-format': (input) => ({
    output: JSON.stringify(JSON.parse(input), null, 2),
    outputFormat: 'json',
  }),
  'json-minify': (input) => ({
    output: JSON.stringify(JSON.parse(input)),
    outputFormat: 'json',
  }),
  'json-to-ndjson': (input) => ({
    output: jsonToNdjson(input),
    outputFormat: 'ndjson',
  }),
  'json-to-toml': async (input) => ({
    output: await stringifyTomlDocument(JSON.parse(input)),
    outputFormat: 'toml',
  }),
  'json-to-yaml': async (input) => ({
    output: await stringifyYaml(JSON.parse(input)),
    outputFormat: 'yaml',
  }),
  'jwt-decode': (input) => ({
    output: decodeJwt(input),
    outputFormat: 'json',
  }),
  'ndjson-to-json': (input) => ({
    output: ndjsonToJson(input),
    outputFormat: 'json',
  }),
  'toml-to-json': async (input) => ({
    output: stringifyJson(await parseTomlInput(input)),
    outputFormat: 'json',
  }),
  'toml-to-yaml': async (input) => ({
    output: await stringifyYaml(await parseTomlInput(input)),
    outputFormat: 'yaml',
  }),
  'url-decode': (input) => ({
    output: decodeURIComponent(input),
    outputFormat: 'plain',
  }),
  'url-encode': (input) => ({
    output: encodeURIComponent(input),
    outputFormat: 'plain',
  }),
  'yaml-to-json': async (input) => ({
    output: stringifyJson(await parseYamlInput(input)),
    outputFormat: 'json',
  }),
  'yaml-to-toml': async (input) => ({
    output: await stringifyTomlDocument(await parseYamlInput(input)),
    outputFormat: 'toml',
  }),
}

async function parseYamlInput(input: string): Promise<unknown> {
  const { load } = await loadYaml()

  return load(input)
}

async function parseTomlInput(input: string): Promise<unknown> {
  const { parse } = await loadSmolToml()

  return parse(input)
}

async function formatGraphql(input: string): Promise<string> {
  const { parse, print } = await import('graphql')

  return print(parse(input))
}

async function minifyGraphql(input: string): Promise<string> {
  const { stripIgnoredCharacters } = await import('graphql')

  return stripIgnoredCharacters(input)
}

// JWS compact decode: header + payload become JSON, the signature stays raw.
// The signature is not verified because no key is available in the browser.
function decodeJwt(input: string): string {
  const segments = input.trim().split('.')

  if (segments.length !== 3) {
    throw new Error(
      `JWT must have 3 dot-separated segments but found ${segments.length}.`,
    )
  }

  return JSON.stringify(
    {
      header: parseJwtSegment(segments[0], 'header'),
      payload: parseJwtSegment(segments[1], 'payload'),
      signature: segments[2],
    },
    null,
    2,
  )
}

function parseJwtSegment(segment: string, label: string): unknown {
  let decoded: string

  try {
    decoded = decodeBase64Url(segment)
  } catch {
    throw new Error(`JWT ${label} is not valid base64url.`)
  }

  try {
    return JSON.parse(decoded)
  } catch {
    throw new Error(`JWT ${label} is not valid JSON.`)
  }
}

function ndjsonToJson(input: string): string {
  const records: Array<unknown> = []

  input.split(/\r\n|\r|\n/).forEach((line, index) => {
    if (line.trim().length === 0) {
      return
    }

    try {
      records.push(JSON.parse(line))
    } catch {
      throw new Error(`NDJSON line ${index + 1} is not valid JSON.`)
    }
  })

  return JSON.stringify(records, null, 2)
}

function jsonToNdjson(input: string): string {
  const parsed = JSON.parse(input)

  if (!Array.isArray(parsed)) {
    throw new Error('JSON to NDJSON requires a top-level array.')
  }

  return parsed.map((entry) => JSON.stringify(entry)).join('\n')
}

function encodeBase64(input: string) {
  const bytes = new TextEncoder().encode(input)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function decodeBase64(input: string) {
  const binary = atob(input.trim())
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export async function formatSqlWithDialect(
  input: string,
  language: SqlLanguage,
): Promise<string> {
  // Load sql-formatter lazily so it stays out of the initial bundle.
  const { format } = await import('sql-formatter')

  return format(input, { language, tabWidth: 2, keywordCase: 'upper' })
}

function minifySql(input: string) {
  return input
    .replace(/--[^\n]*/g, '')          // strip single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')  // strip block comments
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim()
}

async function formatHtml(input: string) {
  // Load prettier lazily so it stays out of the initial bundle.
  const [{ format }, htmlPlugin] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/html'),
  ])

  return format(input, {
    parser: 'html',
    plugins: [htmlPlugin],
  })
}

const RAW_TEXT_TAGS = new Set(['pre', 'script', 'style', 'textarea'])

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'br',
  'caption',
  'dd',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'li',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
])

function compactHtml(input: string) {
  let output = ''
  let index = 0

  while (index < input.length) {
    const rawTextStart = getRawTextStart(input, index)

    if (rawTextStart) {
      const closeStart = findRawTextClose(input, rawTextStart.tagName, index)

      if (closeStart === -1) {
        output += input.slice(index)
        break
      }

      const closeEnd = input.indexOf('>', closeStart)

      if (closeEnd === -1) {
        output += input.slice(index)
        break
      }

      output += input.slice(index, closeEnd + 1)
      index = closeEnd + 1
      continue
    }

    const character = input[index]

    if (character && /\s/.test(character)) {
      const whitespaceStart = index

      while (index < input.length && /\s/.test(input[index] ?? '')) {
        index += 1
      }

      const whitespace = input.slice(whitespaceStart, index)

      if (!/[\r\n]/.test(whitespace)) {
        output += whitespace
        continue
      }

      if (isFormattingWhitespace(input, output, index)) {
        continue
      }

      if (!output.endsWith(' ')) {
        output += ' '
      }

      continue
    }

    output += character
    index += 1
  }

  return output.trim()
}

function getRawTextStart(input: string, index: number) {
  if (input[index] !== '<' || input[index + 1] === '/') {
    return null
  }

  const match = input.slice(index).match(/^<([a-zA-Z][\w:-]*)(?:\s|>|\/)/)
  const tagName = match?.[1]?.toLowerCase()

  if (!tagName || !RAW_TEXT_TAGS.has(tagName)) {
    return null
  }

  return { tagName }
}

function findRawTextClose(input: string, tagName: string, fromIndex: number) {
  return input.toLowerCase().indexOf(`</${tagName}`, fromIndex)
}

function isFormattingWhitespace(
  input: string,
  output: string,
  nextIndex: number,
) {
  const previous = output.at(-1)
  const next = getNextNonWhitespace(input, nextIndex)

  return previous === '>' && next === '<'
}

function getNextNonWhitespace(input: string, fromIndex: number) {
  for (let index = fromIndex; index < input.length; index += 1) {
    const character = input[index]

    if (character && !/\s/.test(character)) {
      return character
    }
  }

  return null
}

async function minifyHtml(input: string): Promise<string> {
  const { parseFragment, serialize } = await loadParse5()
  const errors: Array<ParserError> = []
  const fragment = parseFragment(input, {
    onParseError: (error) => errors.push(error),
  })

  if (errors[0]) {
    throw new Error(`HTML parse error: ${formatParseError(errors[0].code)}.`)
  }

  minifyChildNodes(fragment, null)

  return serialize(fragment).trim()
}

function minifyChildNodes(
  parent: DefaultTreeAdapterTypes.ParentNode,
  parentTagName: string | null,
) {
  const rawTextParent = parentTagName ? RAW_TEXT_TAGS.has(parentTagName) : false
  const nodes = parent.childNodes
  const minifiedNodes: Array<DefaultTreeAdapterTypes.ChildNode> = []

  nodes.forEach((node, index) => {
    if (isCommentNode(node)) {
      return
    }

    if (isTextNode(node)) {
      if (rawTextParent) {
        minifiedNodes.push(node)
        return
      }

      const collapsed = node.value.replace(/\s+/g, ' ')

      if (collapsed.trim().length === 0) {
        if (shouldKeepInterElementSpace(nodes, index)) {
          node.value = ' '
          minifiedNodes.push(node)
        }

        return
      }

      node.value = collapsed
      minifiedNodes.push(node)
      return
    }

    const tagName = getTagName(node)

    if (isParentNode(node)) {
      minifyChildNodes(node, tagName)
    }

    if (isTemplateNode(node)) {
      minifyChildNodes(node.content, 'template')
    }

    minifiedNodes.push(node)
  })

  parent.childNodes = minifiedNodes
}

function shouldKeepInterElementSpace(
  nodes: ReadonlyArray<DefaultTreeAdapterTypes.ChildNode>,
  index: number,
) {
  const previous = findNonCommentSibling(nodes, index, -1)
  const next = findNonCommentSibling(nodes, index, 1)

  if (!previous || !next) {
    return false
  }

  const previousTag = getTagName(previous)
  const nextTag = getTagName(next)

  if (
    (previousTag && BLOCK_TAGS.has(previousTag)) ||
    (nextTag && BLOCK_TAGS.has(nextTag))
  ) {
    return false
  }

  return true
}

function findNonCommentSibling(
  nodes: ReadonlyArray<DefaultTreeAdapterTypes.ChildNode>,
  index: number,
  direction: -1 | 1,
) {
  for (
    let siblingIndex = index + direction;
    siblingIndex >= 0 && siblingIndex < nodes.length;
    siblingIndex += direction
  ) {
    const sibling = nodes[siblingIndex]

    if (isCommentNode(sibling)) {
      continue
    }

    return sibling
  }

  return null
}

function getTagName(node: DefaultTreeAdapterTypes.Node) {
  return 'tagName' in node ? node.tagName : null
}

function isCommentNode(
  node: DefaultTreeAdapterTypes.Node,
): node is DefaultTreeAdapterTypes.CommentNode {
  return node.nodeName === '#comment'
}

function isParentNode(
  node: DefaultTreeAdapterTypes.Node,
): node is DefaultTreeAdapterTypes.ParentNode {
  return 'childNodes' in node
}

function isTemplateNode(
  node: DefaultTreeAdapterTypes.Node,
): node is DefaultTreeAdapterTypes.Template {
  return node.nodeName === 'template'
}

function isTextNode(
  node: DefaultTreeAdapterTypes.Node,
): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === '#text'
}

function formatParseError(code: string) {
  return code.replaceAll('-', ' ')
}

function stringifyJson(value: unknown) {
  return JSON.stringify(toJsonValue(value ?? null, 'root'), null, 2)
}

async function stringifyYaml(value: unknown): Promise<string> {
  const { dump } = await loadYaml()

  return dump(value === undefined ? null : value, { noRefs: true })
}

async function stringifyTomlDocument(value: unknown): Promise<string> {
  assertTomlDocumentValue(value)

  const { stringify } = await loadSmolToml()

  return stringify(value)
}

function assertTomlDocumentValue(value: unknown) {
  if (!isPlainObject(value)) {
    throw new Error('TOML output requires an object at the document root.')
  }

  assertTomlValue(value, 'root')
}

function assertTomlValue(value: unknown, path: string) {
  if (value === null || value === undefined) {
    throw new Error(`TOML output does not support null values at ${path}.`)
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertTomlValue(item, `${path}[${index}]`))
    return
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, entryValue]) =>
      assertTomlValue(entryValue, `${path}.${key}`),
    )
    return
  }

  throw new Error(`TOML output does not support ${typeof value} at ${path}.`)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  )
}

function toJsonValue(value: unknown, path: string): unknown {
  if (value === null) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `JSON output does not support non-finite numbers at ${path}.`,
      )
    }

    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => toJsonValue(entry, `${path}[${index}]`))
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        toJsonValue(entryValue, `${path}.${key}`),
      ]),
    )
  }

  throw new Error(`JSON output does not support ${typeof value} at ${path}.`)
}
