import { describe, expect, it } from 'vitest'

import { getFormatDefinition } from '../formats'
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
    label: 'JSON format',
    outputFormat: 'json',
  },
  {
    description: 'Minify JSON',
    group: 'format',
    id: 'json-minify',
    label: 'JSON minify',
    outputFormat: 'json',
  },
  {
    description: 'Encode text for URLs',
    group: 'general',
    id: 'url-encode',
    label: 'URL encode',
    outputFormat: 'plain',
  },
] satisfies Array<TransformDefinition>

describe('transform filtering', () => {
  it('keeps JSON transforms and general transforms available for JSON input', () => {
    expect(
      getAvailableTransforms(
        transformFixtures,
        getFormatDefinition('json'),
      ).map(({ id }) => id),
    ).toEqual(['json-format', 'json-minify', 'url-encode'])
  })

  it('hides JSON-only transforms for YAML input while keeping general transforms', () => {
    expect(
      getAvailableTransforms(
        transformFixtures,
        getFormatDefinition('yaml'),
      ).map(({ id }) => id),
    ).toEqual(['url-encode'])
  })

  it('treats wildcard input formats as available for every selected format', () => {
    const generalTransform = transformFixtures.find(
      ({ id }) => id === 'url-encode',
    )

    if (!generalTransform) {
      throw new Error('Fixture is missing the general transform.')
    }

    expect(
      isTransformAvailable(generalTransform, getFormatDefinition('plain')),
    ).toBe(true)
    expect(
      isTransformAvailable(generalTransform, getFormatDefinition('html')),
    ).toBe(true)
    expect(
      isTransformAvailable(generalTransform, getFormatDefinition('json')),
    ).toBe(true)
    expect(
      isTransformAvailable(generalTransform, getFormatDefinition('markdown')),
    ).toBe(true)
    expect(
      isTransformAvailable(generalTransform, getFormatDefinition('toml')),
    ).toBe(true)
    expect(
      isTransformAvailable(generalTransform, getFormatDefinition('yaml')),
    ).toBe(true)
  })

  it('groups available transforms into format and general sections', () => {
    const sections = getTransformSections(
      transformFixtures,
      getFormatDefinition('json'),
    ).map((section) => ({
      ids: section.transforms.map(({ id }) => id),
      title: section.title,
    }))

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
    const sections = getTransformSections(
      transformFixtures,
      getFormatDefinition('plain'),
    ).map((section) => ({
      ids: section.transforms.map(({ id }) => id),
      title: section.title,
    }))

    expect(sections).toEqual([
      {
        ids: ['url-encode'],
        title: 'General transforms',
      },
    ])
  })

  it('exposes YAML to JSON with general transforms for YAML input', () => {
    const sections = getTransformSections(
      TRANSFORM_DEFINITIONS,
      getFormatDefinition('yaml'),
    ).map((section) => ({
      ids: section.transforms.map(({ id }) => id),
      title: section.title,
    }))

    expect(sections).toEqual([
      {
        ids: ['yaml-to-json', 'yaml-to-toml'],
        title: 'YAML transforms',
      },
      {
        ids: [
          'crop-selection',
          'trim',
          'url-encode',
          'url-decode',
          'base64-encode',
          'base64-decode',
        ],
        title: 'General transforms',
      },
    ])
  })

  it('exposes TOML conversions with general transforms for TOML input', () => {
    const sections = getTransformSections(
      TRANSFORM_DEFINITIONS,
      getFormatDefinition('toml'),
    ).map((section) => ({
      ids: section.transforms.map(({ id }) => id),
      title: section.title,
    }))

    expect(sections).toEqual([
      {
        ids: ['toml-to-json', 'toml-to-yaml'],
        title: 'TOML transforms',
      },
      {
        ids: [
          'crop-selection',
          'trim',
          'url-encode',
          'url-decode',
          'base64-encode',
          'base64-decode',
        ],
        title: 'General transforms',
      },
    ])
  })

  it('exposes HTML compacting, formatting, and minifying with general transforms for HTML input', () => {
    const sections = getTransformSections(
      TRANSFORM_DEFINITIONS,
      getFormatDefinition('html'),
    ).map((section) => ({
      ids: section.transforms.map(({ id }) => id),
      title: section.title,
    }))

    expect(sections).toEqual([
      {
        ids: ['html-compact', 'html-format', 'html-minify'],
        title: 'HTML transforms',
      },
      {
        ids: [
          'crop-selection',
          'trim',
          'url-encode',
          'url-decode',
          'base64-encode',
          'base64-decode',
        ],
        title: 'General transforms',
      },
    ])
  })

  it('exposes only general transforms for plain text input', () => {
    expect(
      getAvailableTransforms(
        TRANSFORM_DEFINITIONS,
        getFormatDefinition('plain'),
      ).map(({ id }) => id),
    ).toEqual([
      'crop-selection',
      'trim',
      'url-encode',
      'url-decode',
      'base64-encode',
      'base64-decode',
    ])
  })

  it('exposes only general transforms for Markdown input', () => {
    expect(
      getAvailableTransforms(
        TRANSFORM_DEFINITIONS,
        getFormatDefinition('markdown'),
      ).map(({ id }) => id),
    ).toEqual([
      'crop-selection',
      'trim',
      'url-encode',
      'url-decode',
      'base64-encode',
      'base64-decode',
    ])
  })
})
