import { describe, expect, it } from 'vitest'

import type { TransformDefinition } from '../types'
import { TRANSFORM_DEFINITIONS } from './definitions'
import {
  getAvailableTransforms,
  getTransformSections,
  isTransformAvailable,
} from './filterTransforms'

const transformFixtures = [
  {
    description: 'Pretty print JSON',
    group: 'format',
    id: 'json-format',
    inputFormats: ['json'],
    label: 'JSON format',
    outputFormat: 'json',
  },
  {
    description: 'Minify JSON',
    group: 'format',
    id: 'json-minify',
    inputFormats: ['json'],
    label: 'JSON minify',
    outputFormat: 'json',
  },
  {
    description: 'Encode text for URLs',
    group: 'general',
    id: 'url-encode',
    inputFormats: '*',
    label: 'URL encode',
    outputFormat: 'plain',
  },
] satisfies Array<TransformDefinition>

describe('transform filtering', () => {
  it('keeps JSON transforms and general transforms available for JSON input', () => {
    expect(
      getAvailableTransforms(transformFixtures, 'json').map(({ id }) => id),
    ).toEqual(['json-format', 'json-minify', 'url-encode'])
  })

  it('hides JSON-only transforms for YAML input while keeping general transforms', () => {
    expect(
      getAvailableTransforms(transformFixtures, 'yaml').map(({ id }) => id),
    ).toEqual(['url-encode'])
  })

  it('treats wildcard input formats as available for every selected format', () => {
    const generalTransform = transformFixtures.find(
      ({ id }) => id === 'url-encode',
    )

    if (!generalTransform) {
      throw new Error('Fixture is missing the general transform.')
    }

    expect(isTransformAvailable(generalTransform, 'plain')).toBe(true)
    expect(isTransformAvailable(generalTransform, 'json')).toBe(true)
    expect(isTransformAvailable(generalTransform, 'markdown')).toBe(true)
    expect(isTransformAvailable(generalTransform, 'toml')).toBe(true)
    expect(isTransformAvailable(generalTransform, 'yaml')).toBe(true)
  })

  it('groups available transforms into format and general sections', () => {
    const sections = getTransformSections(transformFixtures, 'json').map(
      (section) => ({
        ids: section.transforms.map(({ id }) => id),
        title: section.title,
      }),
    )

    expect(sections).toEqual([
      {
        ids: ['json-format', 'json-minify'],
        title: 'JSON transforms',
      },
      {
        ids: ['url-encode'],
        title: 'General transforms',
      },
    ])
  })

  it('omits empty format sections', () => {
    const sections = getTransformSections(transformFixtures, 'plain').map(
      (section) => ({
        ids: section.transforms.map(({ id }) => id),
        title: section.title,
      }),
    )

    expect(sections).toEqual([
      {
        ids: ['url-encode'],
        title: 'General transforms',
      },
    ])
  })

  it('exposes YAML to JSON with general transforms for YAML input', () => {
    const sections = getTransformSections(TRANSFORM_DEFINITIONS, 'yaml').map(
      (section) => ({
        ids: section.transforms.map(({ id }) => id),
        title: section.title,
      }),
    )

    expect(sections).toEqual([
      {
        ids: ['yaml-to-json', 'yaml-to-toml'],
        title: 'YAML transforms',
      },
      {
        ids: ['url-encode', 'url-decode', 'base64-encode', 'base64-decode'],
        title: 'General transforms',
      },
    ])
  })

  it('exposes TOML conversions with general transforms for TOML input', () => {
    const sections = getTransformSections(TRANSFORM_DEFINITIONS, 'toml').map(
      (section) => ({
        ids: section.transforms.map(({ id }) => id),
        title: section.title,
      }),
    )

    expect(sections).toEqual([
      {
        ids: ['toml-to-json', 'toml-to-yaml'],
        title: 'TOML transforms',
      },
      {
        ids: ['url-encode', 'url-decode', 'base64-encode', 'base64-decode'],
        title: 'General transforms',
      },
    ])
  })

  it('exposes only general transforms for plain text input', () => {
    expect(
      getAvailableTransforms(TRANSFORM_DEFINITIONS, 'plain').map(
        ({ id }) => id,
      ),
    ).toEqual(['url-encode', 'url-decode', 'base64-encode', 'base64-decode'])
  })

  it('exposes only general transforms for Markdown input', () => {
    expect(
      getAvailableTransforms(TRANSFORM_DEFINITIONS, 'markdown').map(
        ({ id }) => id,
      ),
    ).toEqual(['url-encode', 'url-decode', 'base64-encode', 'base64-decode'])
  })
})
