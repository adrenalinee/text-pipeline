import { describe, expect, it } from 'vitest'

import {
  createClipboardPasteEdit,
  getTextForClipboard,
} from './editorClipboard'

describe('editor clipboard operations', () => {
  it('copies all text when the selection is empty', () => {
    expect(getTextForClipboard('alpha beta', { from: 4, to: 4 })).toBe(
      'alpha beta',
    )
  })

  it('copies only selected text', () => {
    expect(getTextForClipboard('alpha beta', { from: 6, to: 10 })).toBe('beta')
  })

  it('inserts clipboard text at the cursor', () => {
    expect(createClipboardPasteEdit({ from: 5, to: 5 }, ' pasted')).toEqual({
      changes: { from: 5, insert: ' pasted', to: 5 },
      cursor: 12,
    })
  })

  it('replaces the selected range and moves the cursor after pasted text', () => {
    expect(createClipboardPasteEdit({ from: 6, to: 10 }, 'gamma')).toEqual({
      changes: { from: 6, insert: 'gamma', to: 10 },
      cursor: 11,
    })
  })
})
