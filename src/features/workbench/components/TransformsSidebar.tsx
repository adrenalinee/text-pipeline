import { Box, Group, Stack, Text } from '@mantine/core'

import type { TransformAction } from '../types'
import { SidebarSection } from './SidebarSection'

export function TransformsSidebar({
  actions,
}: {
  actions: Array<TransformAction>
}) {
  return (
    <SidebarSection title="Transforms">
      <Stack gap={6}>
        {actions.map((action) => (
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
