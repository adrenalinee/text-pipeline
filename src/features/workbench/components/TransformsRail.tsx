import { ActionIcon, Box, Stack, Text, Tooltip } from '@mantine/core'
import { PanelRightOpen } from 'lucide-react'
import { Fragment } from 'react'

import type { TransformActionSection } from '../types'

type TransformsRailProps = {
  onExpand: () => void
  sections: Array<TransformActionSection>
}

export function TransformsRail({ onExpand, sections }: TransformsRailProps) {
  return (
    <Box className="workbenchRail transformsRail">
      <Tooltip label="Expand transforms" position="left" withArrow>
        <ActionIcon
          aria-label="Expand transforms"
          color="gray"
          onClick={onExpand}
          size="lg"
          variant="subtle"
        >
          <PanelRightOpen size={18} />
        </ActionIcon>
      </Tooltip>

      <Box className="railDivider" />

      {sections.length === 0 ? null : (
        <Stack gap={4}>
          {sections.map((section, index) => (
            <Fragment key={section.id}>
              {index > 0 ? <Box className="railDivider" /> : null}
              {section.actions.map((action) => (
                <Tooltip
                  key={action.id}
                  label={
                    <Box className="transformRailTooltip">
                      <Text fw={650} size="xs">
                        {action.label}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {action.description}
                      </Text>
                    </Box>
                  }
                  multiline
                  position="left"
                  withArrow
                >
                  <ActionIcon
                    aria-label={action.label}
                    className="transformRailButton"
                    color="gray"
                    disabled={action.disabled}
                    onClick={action.onClick}
                    size="lg"
                    variant="subtle"
                  >
                    {action.icon}
                  </ActionIcon>
                </Tooltip>
              ))}
            </Fragment>
          ))}
        </Stack>
      )}
    </Box>
  )
}
