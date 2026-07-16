import type { SyntaxMode, TransformDefinition, TransformGroup } from '../types'

export type TransformDefinitionSection = {
  id: TransformGroup
  title: string
  transforms: Array<TransformDefinition>
}

const FORMAT_SECTION_TITLES: Record<SyntaxMode, string> = {
  csv: 'CSV transforms',
  diff: 'Diff transforms',
  graphql: 'GraphQL transforms',
  html: 'HTML transforms',
  json: 'JSON transforms',
  jwt: 'JWT transforms',
  markdown: 'Markdown transforms',
  ndjson: 'NDJSON transforms',
  plain: 'Text transforms',
  sql: 'SQL transforms',
  toml: 'TOML transforms',
  xml: 'XML transforms',
  yaml: 'YAML transforms',
}

export function isTransformAvailable(
  transform: TransformDefinition,
  selectedFormat: SyntaxMode,
) {
  return (
    transform.inputFormats === '*' ||
    transform.inputFormats.includes(selectedFormat)
  )
}

export function getAvailableTransforms(
  transforms: ReadonlyArray<TransformDefinition>,
  selectedFormat: SyntaxMode,
) {
  return transforms.filter((transform) =>
    isTransformAvailable(transform, selectedFormat),
  )
}

export function getTransformSections(
  transforms: ReadonlyArray<TransformDefinition>,
  selectedFormat: SyntaxMode,
): Array<TransformDefinitionSection> {
  const availableTransforms = getAvailableTransforms(transforms, selectedFormat)
  const sections: Array<TransformDefinitionSection> = [
    {
      id: 'format',
      title: FORMAT_SECTION_TITLES[selectedFormat],
      transforms: availableTransforms.filter(
        (transform) => transform.group === 'format',
      ),
    },
    {
      id: 'general',
      title: 'General transforms',
      transforms: availableTransforms.filter(
        (transform) => transform.group === 'general',
      ),
    },
  ]

  return sections.filter((section) => section.transforms.length > 0)
}
