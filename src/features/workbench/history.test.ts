import { describe, expect, it } from 'vitest'

import {
  createTextCommit,
  createWorkingSnapshotCommit,
  getNextCommitId,
  getRevisionSnapshot,
  getRootRevisionSnapshot,
  ROOT_REVISION_ID,
} from './history'

const initialRevision = {
  syntaxMode: 'json',
  text: '{"status":"draft"}',
} as const

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

  it('resolves root from the oldest commit before state', () => {
    const firstCommit = createTextCommit({
      afterSyntaxMode: 'json',
      afterText: '{"status":"ready"}',
      beforeSyntaxMode: 'json',
      beforeText: initialRevision.text,
      description: 'Saved working text before transform.',
      id: 'c001',
      parentId: 'root',
      timestamp: '10:00:00',
      title: 'Manual edit',
    })
    const secondCommit = createTextCommit({
      afterSyntaxMode: 'json',
      afterText: '{\n  "status": "ready"\n}',
      beforeSyntaxMode: 'json',
      beforeText: firstCommit.afterText,
      description: 'Pretty print JSON.',
      id: 'c002',
      parentId: 'c001',
      timestamp: '10:01:00',
      title: 'JSON format',
    })

    expect(
      getRootRevisionSnapshot([secondCommit, firstCommit], initialRevision),
    ).toEqual({
      id: 'root',
      syntaxMode: 'json',
      text: initialRevision.text,
    })
    expect(getNextCommitId([secondCommit, firstCommit], 2)).toBe('c004')
  })
})
