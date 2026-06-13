import { dump, load } from 'js-yaml'
import { parseFragment, serialize } from 'parse5'
import type { DefaultTreeAdapterTypes, ParserError } from 'parse5'
import { format as formatWithPrettier } from 'prettier/standalone'
import * as prettierHtmlPlugin from 'prettier/plugins/html'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

import type { TransformRunnerMap } from '../types'

export const TRANSFORM_RUNNERS: TransformRunnerMap = {
  'base64-decode': (input) => ({
    output: decodeBase64(input),
    outputFormat: 'plain',
  }),
  'base64-encode': (input) => ({
    output: encodeBase64(input),
    outputFormat: 'plain',
  }),
  'html-format': async (input) => ({
    output: await formatHtml(input),
    outputFormat: 'html',
  }),
  'html-minify': (input) => ({
    output: minifyHtml(input),
    outputFormat: 'html',
  }),
  'json-format': (input) => ({
    output: JSON.stringify(JSON.parse(input), null, 2),
    outputFormat: 'json',
  }),
  'json-minify': (input) => ({
    output: JSON.stringify(JSON.parse(input)),
    outputFormat: 'json',
  }),
  'json-to-toml': (input) => ({
    output: stringifyTomlDocument(JSON.parse(input)),
    outputFormat: 'toml',
  }),
  'json-to-yaml': (input) => ({
    output: stringifyYaml(JSON.parse(input)),
    outputFormat: 'yaml',
  }),
  'toml-to-json': (input) => ({
    output: stringifyJson(parseToml(input)),
    outputFormat: 'json',
  }),
  'toml-to-yaml': (input) => ({
    output: stringifyYaml(parseToml(input)),
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
  'yaml-to-json': (input) => ({
    output: stringifyJson(load(input)),
    outputFormat: 'json',
  }),
  'yaml-to-toml': (input) => ({
    output: stringifyTomlDocument(load(input)),
    outputFormat: 'toml',
  }),
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

function formatHtml(input: string) {
  return formatWithPrettier(input, {
    parser: 'html',
    plugins: [prettierHtmlPlugin],
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

function minifyHtml(input: string) {
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

    if (!sibling || isCommentNode(sibling)) {
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

function stringifyYaml(value: unknown) {
  return dump(value === undefined ? null : value, { noRefs: true })
}

function stringifyTomlDocument(value: unknown) {
  assertTomlDocumentValue(value)

  return stringifyToml(value)
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
