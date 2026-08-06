import type { ParserError } from 'parse5'

import { getCsvError } from './formatValidation'

export async function confirmHtml(value: string) {
  const { parseFragment } = await import('parse5')
  const errors: Array<ParserError> = []

  parseFragment(value, { onParseError: (error) => errors.push(error) })

  return errors.length === 0
}

export function confirmXml(value: string) {
  if (typeof DOMParser === 'undefined') return false

  const document = new DOMParser().parseFromString(value, 'application/xml')

  return document.getElementsByTagName('parsererror').length === 0
}

export function confirmCsv(value: string) {
  if (getCsvError(value)) return false

  const rows = value
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return rows.length >= 2 && rows[0].includes(',')
}

export async function confirmToml(value: string) {
  const { parse } = await import('smol-toml')

  try {
    parse(value)
    return true
  } catch {
    return false
  }
}

export async function confirmYaml(value: string) {
  const { load } = await import('js-yaml')

  try {
    const parsed: unknown = load(value)

    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

export async function confirmGraphql(value: string) {
  const { parse } = await import('graphql')

  try {
    parse(value)
    return true
  } catch {
    return false
  }
}
