import { ActionIcon, Button, SegmentedControl, Select } from '@mantine/core'
import type { MantineThemeOverride } from '@mantine/core'

export const theme = {
  components: {
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: "sm"
      }
    }),
    Button: Button.extend({
      defaultProps: {
        size: 'xs',
        radius: 'sm',
      },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {
        radius: "sm"
      }
    }),
    Select: Select.extend({
      defaultProps: {
        size: 'xs',
        radius: 'sm',
      }
    })
  },
} as MantineThemeOverride
