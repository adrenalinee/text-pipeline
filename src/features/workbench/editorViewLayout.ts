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
