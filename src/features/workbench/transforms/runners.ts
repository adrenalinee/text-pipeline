import { load } from 'js-yaml'

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
  return JSON.stringify(value === undefined ? null : value, null, 2)
}
