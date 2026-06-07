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
