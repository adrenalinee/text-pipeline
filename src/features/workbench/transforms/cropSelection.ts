/**
 * Keep only the text within the given editor selection range.
 *
 * The range comes from the CodeMirror selection, where `from`/`to` are
 * character offsets into `text`. The selection may be reversed (the user
 * dragged right-to-left), so the bounds are normalized before slicing.
 */
export function cropToSelection(
  text: string,
  from: number,
  to: number,
): string {
  const start = Math.max(0, Math.min(from, to))
  const end = Math.min(text.length, Math.max(from, to))

  if (start >= end) {
    throw new Error('Select text in the editor before cropping.')
  }

  return text.slice(start, end)
}
