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
 * Where the status bar belongs for the current pane layout.
 *
 * - `header`: source mode, so the bar spans the whole pane under the toolbar.
 * - `sourceColumn`: view mode with the source editor beside the view, so the
 *   bar sits on top of the left source column only.
 * - `hidden`: view-only, so there is no source editor for the bar to describe.
 */
export type StatusBarPlacement = 'header' | 'hidden' | 'sourceColumn'

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
