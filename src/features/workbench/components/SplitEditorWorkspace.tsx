import { Box } from '@mantine/core';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { useRef } from 'react';

const MIN_RATIO = 20
const MAX_RATIO = 80
const KEYBOARD_STEP = 5

export function clampSplitRatio(ratio: number) {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio))
}

export function SplitEditorWorkspace({
  compact,
  main,
  onRatioChange,
  ratio,
  split,
  sub,
}: {
  compact: boolean
  main: ReactNode
  onRatioChange: (ratio: number) => void
  ratio: number
  split: boolean
  sub: ReactNode
}) {
  const workspaceRef = useRef<HTMLDivElement>(null)

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const workspace = workspaceRef.current
    if (!workspace || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return
    }

    const bounds = workspace.getBoundingClientRect()
    const position = compact
      ? (event.clientY - bounds.top) / bounds.height
      : (event.clientX - bounds.left) / bounds.width

    onRatioChange(clampSplitRatio(position * 100))
  }

  function handleSeparatorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const decreaseKey = compact ? 'ArrowUp' : 'ArrowLeft'
    const increaseKey = compact ? 'ArrowDown' : 'ArrowRight'

    if (event.key === decreaseKey) {
      event.preventDefault()
      onRatioChange(clampSplitRatio(ratio - KEYBOARD_STEP))
    } else if (event.key === increaseKey) {
      event.preventDefault()
      onRatioChange(clampSplitRatio(ratio + KEYBOARD_STEP))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onRatioChange(MIN_RATIO)
    } else if (event.key === 'End') {
      event.preventDefault()
      onRatioChange(MAX_RATIO)
    }
  }

  return (
    <Box
      ref={workspaceRef}
      className="editorWorkspace"
      data-compact={compact || undefined}
      data-split={split || undefined}
      style={{ '--editor-split-ratio': `${ratio}%` }}
    >
      {main}
      {split ? (
        <>
          <Box
            aria-label="Resize editor panes"
            aria-orientation={compact ? 'horizontal' : 'vertical'}
            aria-valuemax={MAX_RATIO}
            aria-valuemin={MIN_RATIO}
            aria-valuenow={Math.round(ratio)}
            className="editorSplitSeparator"
            role="separator"
            tabIndex={0}
            onKeyDown={handleSeparatorKeyDown}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              updateFromPointer(event)
            }}
            onPointerMove={updateFromPointer}
          />
          {/* <Paper m="xs" shadow="sm"> */}
            {sub}
          {/* </Paper> */}
        </>
      ) : null}
    </Box>
  )
}
