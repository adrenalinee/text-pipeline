export type EditorTextRange = {
  from: number
  to: number
}

export function getTextForClipboard(value: string, selection: EditorTextRange) {
  return selection.from === selection.to
    ? value
    : value.slice(selection.from, selection.to)
}

export function createClipboardPasteEdit(
  selection: EditorTextRange,
  text: string,
) {
  return {
    changes: { from: selection.from, insert: text, to: selection.to },
    cursor: selection.from + text.length,
  }
}
