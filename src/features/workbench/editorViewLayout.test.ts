import { describe, expect, it } from 'vitest'

import {
  getStatusBarPlacement,
  shouldShowSourceAlongsideView,
} from './editorViewLayout'

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

describe('getStatusBarPlacement', () => {
  it('spans the pane header in source mode', () => {
    expect(
      getStatusBarPlacement({
        compact: false,
        sourceViewEnabled: false,
        viewMode: 'source',
      }),
    ).toBe('header')
  })

  it('moves into the left source column when the view shows source alongside', () => {
    expect(
      getStatusBarPlacement({
        compact: false,
        sourceViewEnabled: true,
        viewMode: 'view',
      }),
    ).toBe('sourceColumn')
  })

  it('hides only when the view mode has no source editor to describe', () => {
    expect(
      getStatusBarPlacement({
        compact: false,
        sourceViewEnabled: false,
        viewMode: 'view',
      }),
    ).toBe('hidden')

    expect(
      getStatusBarPlacement({
        compact: true,
        sourceViewEnabled: true,
        viewMode: 'view',
      }),
    ).toBe('hidden')
  })
})
