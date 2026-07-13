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

export function getOffsetForLineAndColumn(
  value: string,
  line: number,
  column: number,
) {
  // Clamp the requested line to the lines that actually exist so a line past
  // the end lands on the start of the last line rather than the document end.
  const targetLine = Math.min(
    Math.max(1, Math.floor(line)),
    Math.max(1, countLines(value)),
  )
  const targetColumn = Math.max(1, Math.floor(column))

  // Walk the string to the start of the target line, treating \r\n, \r, and \n
  // each as a single line break so offsets line up with the source string.
  let currentLine = 1
  let index = 0
  while (currentLine < targetLine && index < value.length) {
    const char = value[index]
    if (char === '\r') {
      index += value[index + 1] === '\n' ? 2 : 1
      currentLine += 1
    } else if (char === '\n') {
      index += 1
      currentLine += 1
    } else {
      index += 1
    }
  }

  // Clamp the column to the length of the line we landed on.
  const lineStart = index
  let lineEnd = index
  while (
    lineEnd < value.length &&
    value[lineEnd] !== '\r' &&
    value[lineEnd] !== '\n'
  ) {
    lineEnd += 1
  }

  const maxColumn = lineEnd - lineStart + 1

  return lineStart + Math.min(targetColumn, maxColumn) - 1
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
