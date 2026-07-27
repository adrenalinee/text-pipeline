import { describe, expect, it } from 'vitest'

import { shouldShowSourceAlongsideView } from './editorViewLayout'

describe('shouldShowSourceAlongsideView', () => {
  it('shows source beside the view only when enabled in desktop view mode', () => {
    expect(
      shouldShowSourceAlongsideView({
        compact: false,
        sourceViewEnabled: true,
        viewMode: 'view',
      }),
    ).toBe(true)

    expect(
      shouldShowSourceAlongsideView({
        compact: false,
        sourceViewEnabled: true,
        viewMode: 'source',
      }),
    ).toBe(false)

    expect(
      shouldShowSourceAlongsideView({
        compact: false,
        sourceViewEnabled: false,
        viewMode: 'view',
      }),
    ).toBe(false)
  })

  it('suppresses the source pane on compact screens without changing state', () => {
    expect(
      shouldShowSourceAlongsideView({
        compact: true,
        sourceViewEnabled: true,
        viewMode: 'view',
      }),
    ).toBe(false)
  })
})
