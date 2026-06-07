import { Box, Group, Stack, Text } from '@mantine/core'

import type { TransformAction, TransformActionSection } from '../types'
import { SidebarSection } from './SidebarSection'

export function TransformsSidebar({
  sections,
}: {
  sections: Array<TransformActionSection>
}) {
  if (sections.length === 0) {
    return (
      <SidebarSection title="Transforms">
        <Text c="dimmed" className="emptyTransforms" size="sm">
          No transforms available for this format.
        </Text>
      </SidebarSection>
    )
  }

  return (
    <Stack gap={0}>
      {sections.map((section) => (
        <SidebarSection key={section.id} title={section.title}>
          <Stack gap={6}>
            {section.actions.map((action) => (
              <TransformButton
                description={action.description}
                icon={action.icon}
                key={action.id}
                label={action.label}
                onClick={action.onClick}
              />
            ))}
          </Stack>
        </SidebarSection>
      ))}
    </Stack>
  )
}

function TransformButton({
  description,
  icon,
  label,
  onClick,
}: Omit<TransformAction, 'id'>) {
  return (
    <button className="transformButton" type="button" onClick={onClick}>
      <Group gap="xs" wrap="nowrap">
        {icon}
        <Box className="transformButtonText">
          <Text fw={650} size="sm">
            {label}
          </Text>
          <Text c="dimmed" size="xs">
            {description}
          </Text>
        </Box>
      </Group>
    </button>
  )
}
