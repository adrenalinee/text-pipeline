export type CompareModeState = {
  compareEnabled: boolean
  splitEnabled: boolean
}

export function toggleCompareMode({
  compareEnabled,
  splitEnabled,
}: CompareModeState): CompareModeState {
  return compareEnabled
    ? { compareEnabled: false, splitEnabled }
    : { compareEnabled: true, splitEnabled: true }
}

export function toggleSplitMode({
  splitEnabled,
}: CompareModeState): CompareModeState {
  return splitEnabled
    ? { compareEnabled: false, splitEnabled: false }
    : { compareEnabled: false, splitEnabled: true }
}
