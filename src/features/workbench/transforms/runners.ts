import { dump, load } from 'js-yaml'
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
