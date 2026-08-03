import { Chunk } from '@codemirror/merge'
import { Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

function chunks(left: string, right: string) {
  return Chunk.build(Text.of(left.split('\n')), Text.of(right.split('\n')), {
    scanLimit: 500,
    timeout: 250,
  })
}

describe('editor comparison diff', () => {
  it('reports no chunks for identical editor text', () => {
    expect(chunks('service: text-pipeline', 'service: text-pipeline')).toEqual(
      [],
    )
  })

  it('keeps whitespace-only changes visible', () => {
    const result = chunks('service: text-pipeline', 'service:  text-pipeline')

    expect(result).toHaveLength(1)
    expect(result[0].changes).toHaveLength(1)
  })

  it('groups adjacent line edits into a navigable change block', () => {
    const result = chunks(
      'version: 1\nstatus: draft',
      'version: 2\nstatus: ready',
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ precise: true })
  })
})
