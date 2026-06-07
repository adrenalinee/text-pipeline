import { ScrollArea, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

export function SidebarSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <ScrollArea.Autosize mah="50vh" type="hover">
      <Stack gap="xs" p="sm">
        <Text fw={700} size="xs" tt="uppercase" c="dimmed">
          {title}
        </Text>
        {children}
      </Stack>
    </ScrollArea.Autosize>
  )
}
