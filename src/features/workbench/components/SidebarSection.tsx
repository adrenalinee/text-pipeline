import { Group, ScrollArea, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

export function SidebarSection({
  action,
  actionAlign = 'right',
  children,
  title,
}: {
  action?: ReactNode
  actionAlign?: 'left' | 'right'
  children: ReactNode
  title: string
}) {
  const heading = (
    <Text fw={700} size="xs" tt="uppercase" c="dimmed">
      {title}
    </Text>
  )

  return (
    <ScrollArea.Autosize mah="calc(100vh - 44px)" type="hover">
      <Stack gap="xs" p="sm">
        {action ? (
          <Group
            className="sidebarSectionHeader"
            gap="xs"
            justify={actionAlign === 'left' ? 'flex-start' : 'space-between'}
            wrap="nowrap"
          >
            {actionAlign === 'left' ? (
              <>
                {action}
                {heading}
              </>
            ) : (
              <>
                {heading}
                {action}
              </>
            )}
          </Group>
        ) : (
          heading
        )}
        {children}
      </Stack>
    </ScrollArea.Autosize>
  )
}
