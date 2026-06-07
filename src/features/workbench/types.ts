import type { ReactNode } from 'react'

export type TextCommit = {
  afterText: string
  beforeText: string
  charDelta: number
  description: string
  id: string
  lineDelta: number
  parentId: string
  title: string
  timestamp: string
}

export type TransformAction = {
  description: string
  icon: ReactNode
  id: string
  label: string
  onClick: () => void
}
