import { describe, expect, it } from 'vitest'

import { toggleCompareMode, toggleSplitMode } from './compareMode'

describe('compare workspace mode', () => {
  it('opens split mode when compare is enabled from a single editor', () => {
    expect(
      toggleCompareMode({ compareEnabled: false, splitEnabled: false }),
    ).toEqual({ compareEnabled: true, splitEnabled: true })
  })

  it('leaves split mode open when compare is disabled', () => {
    expect(
      toggleCompareMode({ compareEnabled: true, splitEnabled: true }),
    ).toEqual({ compareEnabled: false, splitEnabled: true })
  })

  it('closes compare whenever the split workspace is closed', () => {
    expect(
      toggleSplitMode({ compareEnabled: true, splitEnabled: true }),
    ).toEqual({ compareEnabled: false, splitEnabled: false })
  })
})
