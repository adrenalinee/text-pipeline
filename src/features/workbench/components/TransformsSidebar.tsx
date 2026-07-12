import { ActionIcon, Box, Group, Stack, Text, Tooltip } from '@mantine/core'
import { PanelRightClose } from 'lucide-react'

import type { TransformAction, TransformActionSection } from '../types'
import { SidebarSection } from './SidebarSection'

export function TransformsSidebar({
  onCollapse,
  sections,
}: {
  onCollapse: () => void
  sections: Array<TransformActionSection>
}) {
  const collapseAction = (
    <Tooltip label="Collapse transforms" position="left" withArrow>
      <ActionIcon
        aria-label="Collapse transforms"
        color="gray"
        onClick={onCollapse}
        size="lg"
        variant="subtle"
      >
        <PanelRightClose size={18} />
      </ActionIcon>
    </Tooltip>
  )

  if (sections.length === 0) {
    return (
      <SidebarSection action={collapseAction} title="Transforms">
        <Text c="dimmed" className="emptyTransforms" size="sm">
          No transforms available for this format.
        </Text>
      </SidebarSection>
    )
  }

  return (
    <Stack gap={0}>
      {sections.map((section, index) => (
        <SidebarSection
          action={index === 0 ? collapseAction : undefined}
          key={section.id}
          title={section.title}
        >
          <Stack gap={6}>
            {section.actions.map((action) => (
              <TransformButton
                description={action.description}
                disabled={action.disabled}
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
  disabled,
  icon,
  label,
  onClick,
}: Omit<TransformAction, 'id'>) {
  return (
    <button
      className="transformButton"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
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
