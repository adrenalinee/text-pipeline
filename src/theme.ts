import { Button, type MantineThemeOverride } from '@mantine/core'

export const theme = {
  components: {
    Button: Button.extend({
      defaultProps: {
        size: 'compact-xs',
        radius: 'sm',
      },
    }),
  },
} as MantineThemeOverride