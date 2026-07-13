export function countLines(value: string) {
  if (value.length === 0) {
    return 0
  }

  return value.split(/\r\n|\r|\n/).length
}

export function getChangeStats(beforeText: string, afterText: string) {
  return {
    charDelta: afterText.length - beforeText.length,
    lineDelta: countLines(afterText) - countLines(beforeText),
  }
}

export function formatSignedValue(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

export function getLineAndColumn(value: string, offset: number) {
  const clamped = Math.max(0, Math.min(offset, value.length))
  const lines = value.slice(0, clamped).split(/\r\n|\r|\n/)

  return {
    column: lines[lines.length - 1].length + 1,
    line: lines.length,
  }
}

export function getSelectionStats(value: string, from: number, to: number) {
  if (from === to) {
    return null
  }

  const selectedText = value.slice(from, to)

  return {
    charCount: selectedText.length,
    lineCount: countLines(selectedText),
  }
}
