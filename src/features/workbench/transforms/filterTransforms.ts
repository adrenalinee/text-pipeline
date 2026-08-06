import type {
  FormatCapability,
  TransformDefinition,
  TransformGroup,
} from '../types'

export type TransformDefinitionSection = {
  id: TransformGroup
  title: string
  transforms: Array<TransformDefinition>
}

export function isTransformAvailable(
  transform: TransformDefinition,
  format: FormatCapability,
) {
  return format.transformIds.includes(transform.id)
}

export function getAvailableTransforms(
  transforms: ReadonlyArray<TransformDefinition>,
  format: FormatCapability,
) {
  return transforms.filter((transform) =>
    isTransformAvailable(transform, format),
  )
}

export function getTransformSections(
  transforms: ReadonlyArray<TransformDefinition>,
  format: FormatCapability,
): Array<TransformDefinitionSection> {
  const availableTransforms = getAvailableTransforms(transforms, format)
  const sections: Array<TransformDefinitionSection> = [
    {
      id: 'format',
      title: `${format.label} transforms`,
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
