import { describe, expect, it } from 'vitest'

import {
  appendCommit,
  createTextCommit,
  createWorkingSnapshotCommit,
  getLinearAncestorIds,
  getNextCommitId,
  getRevisionSnapshot,
  getRootRevisionSnapshot,
  ROOT_REVISION_ID,
} from './history'
import type { TextCommit } from './types'

const initialRevision = {
  syntaxMode: 'json',
  text: '{"status":"draft"}',
} as const

function makeCommit(id: string, parentId: string): TextCommit {
  return createTextCommit({
    afterSyntaxMode: 'json',
    afterText: `after-${id}`,
    beforeSyntaxMode: 'json',
    beforeText: `before-${id}`,
    description: `commit ${id}`,
    id,
    parentId,
    timestamp: '10:00:00',
    title: id,
  })
}

describe('workbench history', () => {
  it('creates a working snapshot commit before a transform when text changed from root', () => {
    const baseRevision = getRevisionSnapshot({
      commits: [],
      initialRevision,
      revisionId: ROOT_REVISION_ID,
    })
    const commit = createWorkingSnapshotCommit({
      baseRevision,
      currentSyntaxMode: 'json',
      currentText: '{"status":"ready"}',
      description: 'Saved working text before transform.',
      id: 'c001',
      timestamp: '10:00:00',
      title: 'Manual edit',
    })

    expect(commit).toMatchObject({
      afterText: '{"status":"ready"}',
      beforeText: '{"status":"draft"}',
      id: 'c001',
      parentId: 'root',
      title: 'Manual edit',
    })
  })

  it('skips the working snapshot commit when the working state matches its base revision', () => {
    const baseRevision = getRevisionSnapshot({
      commits: [],
      initialRevision,
      revisionId: ROOT_REVISION_ID,
    })

    expect(
      createWorkingSnapshotCommit({
        baseRevision,
        currentSyntaxMode: 'json',
        currentText: initialRevision.text,
        description: 'Saved working text before transform.',
        id: 'c001',
        timestamp: '10:00:00',
        title: 'Manual edit',
      }),
    ).toBeNull()
  })

  it('skips the working snapshot commit when only the syntax mode changed', () => {
    const baseRevision = getRevisionSnapshot({
      commits: [],
      initialRevision,
      revisionId: ROOT_REVISION_ID,
    })

    expect(
      createWorkingSnapshotCommit({
        baseRevision,
        currentSyntaxMode: 'plain',
        currentText: initialRevision.text,
        description: 'Saved working text before transform.',
        id: 'c001',
        timestamp: '10:00:00',
        title: 'Manual edit',
      }),
    ).toBeNull()
  })

  it('uses the checked-out commit as the base for a working snapshot', () => {
    const firstCommit = createTextCommit({
      afterSyntaxMode: 'json',
      afterText: '{"status":"ready"}',
      beforeSyntaxMode: 'json',
      beforeText: initialRevision.text,
      description: 'Pretty print JSON.',
      id: 'c001',
      parentId: 'root',
      timestamp: '10:00:00',
      title: 'JSON format',
    })
    const baseRevision = getRevisionSnapshot({
      commits: [firstCommit],
      initialRevision,
      revisionId: 'c001',
    })
    const commit = createWorkingSnapshotCommit({
      baseRevision,
      currentSyntaxMode: 'json',
      currentText: '{"status":"archived"}',
      description: 'Saved working text before transform.',
      id: 'c002',
      timestamp: '10:01:00',
      title: 'Manual edit',
    })

    expect(commit).toMatchObject({
      beforeText: '{"status":"ready"}',
      afterText: '{"status":"archived"}',
      parentId: 'c001',
    })
  })

  it('resolves root from a root child before state', () => {
    const firstCommit = makeCommit('c001', 'root')
    const secondCommit = makeCommit('c002', 'c001')
    const commits = [secondCommit, firstCommit]

    expect(getRootRevisionSnapshot(commits, initialRevision)).toEqual({
      id: 'root',
      syntaxMode: 'json',
      text: 'before-c001',
    })
  })

  it('builds a commit id from a monotonic sequence without padding loss', () => {
    expect(getNextCommitId(1)).toBe('c001')
    expect(getNextCommitId(10)).toBe('c010')
    expect(getNextCommitId(123)).toBe('c123')
    // Distinct ids for increasing sequence values even as history shrinks.
    expect(getNextCommitId(4)).not.toBe(getNextCommitId(5))
  })

  describe('appendCommit (linear truncation)', () => {
    it('keeps the whole history when appending onto the tip', () => {
      const commits = [makeCommit('c002', 'c001'), makeCommit('c001', 'root')]
      const next = appendCommit(commits, makeCommit('c003', 'c002'))

      expect(next.map(({ id }) => id)).toEqual(['c003', 'c002', 'c001'])
    })

    it('drops commits newer than the parent when appending onto a middle commit', () => {
      const commits = [
        makeCommit('c003', 'c002'),
        makeCommit('c002', 'c001'),
        makeCommit('c001', 'root'),
      ]
      const next = appendCommit(commits, makeCommit('c004', 'c001'))

      expect(next.map(({ id }) => id)).toEqual(['c004', 'c001'])
    })

    it('truncates everything when appending onto root', () => {
      const commits = [makeCommit('c002', 'c001'), makeCommit('c001', 'root')]
      const next = appendCommit(commits, makeCommit('c003', 'root'))

      expect(next.map(({ id }) => id)).toEqual(['c003'])
    })

    it('stays linear across a snapshot + transform pair from an older commit', () => {
      let commits: Array<TextCommit> = [makeCommit('c001', 'root')]
      // First transform onto the tip: snapshot c002 then transform c003.
      commits = appendCommit(commits, makeCommit('c002', 'c001'))
      commits = appendCommit(commits, makeCommit('c003', 'c002'))
      expect(commits.map(({ id }) => id)).toEqual(['c003', 'c002', 'c001'])

      // Check out c001 and transform again: c004 + c005 replace c002/c003.
      commits = appendCommit(commits, makeCommit('c004', 'c001'))
      commits = appendCommit(commits, makeCommit('c005', 'c004'))
      expect(commits.map(({ id }) => id)).toEqual(['c005', 'c004', 'c001'])
    })
  })

  describe('getLinearAncestorIds', () => {
    const commits = [
      makeCommit('c003', 'c002'),
      makeCommit('c002', 'c001'),
      makeCommit('c001', 'root'),
    ]

    it('marks the base and everything older as ancestors', () => {
      expect(getLinearAncestorIds(commits, 'c002')).toEqual(
        new Set(['root', 'c001', 'c002']),
      )
    })

    it('treats only root as an ancestor when the base is root', () => {
      expect(getLinearAncestorIds(commits, 'root')).toEqual(new Set(['root']))
    })

    it('includes every commit when the base is the tip', () => {
      expect(getLinearAncestorIds(commits, 'c003')).toEqual(
        new Set(['root', 'c001', 'c002', 'c003']),
      )
    })
  })
})
