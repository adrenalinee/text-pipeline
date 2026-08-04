import type { WorkbenchViewMode } from './types'

export function shouldShowSourceAlongsideView({
  compact,
  sourceViewEnabled,
  viewMode,
}: {
  compact: boolean
  sourceViewEnabled: boolean
  viewMode: WorkbenchViewMode
}) {
  return viewMode === 'view' && sourceViewEnabled && !compact
}

/**
 * Where the status bar belongs for the current layout.
 *
 * - `header`: source mode, so the bar spans the whole pane under the toolbar.
 * - `sourceColumn`: view mode with the source pane beside it, so the bar sits
 *   on top of the left source column where its counters and cursor position
 *   still describe something the user can see.
 * - `hidden`: view-only mode, where there is no source editor to describe.
 */
export type StatusBarPlacement = 'header' | 'sourceColumn' | 'hidden'

export function getStatusBarPlacement({
  compact,
  sourceViewEnabled,
  viewMode,
}: {
  compact: boolean
  sourceViewEnabled: boolean
  viewMode: WorkbenchViewMode
}): StatusBarPlacement {
  if (viewMode === 'source') return 'header'
  return shouldShowSourceAlongsideView({ compact, sourceViewEnabled, viewMode })
    ? 'sourceColumn'
    : 'hidden'
}
