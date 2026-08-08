import type { EditorSessionInitialState } from './useEditorSession'
import {
  createTextCommit,
  ROOT_REVISION_ID,
  WORKING_REVISION_ID,
} from './history'
import { DEFAULT_SQL_DIALECT, getSqlDialect } from './sqlDialects'
import type { SqlDialectId } from './sqlDialects'
import type {
  FormatSelectionState,
  SyntaxMode,
  TextCommit,
  WorkbenchViewMode,
} from './types'

export const WORKSPACE_SCHEMA_VERSION = 1
export const WORKSPACE_DB_NAME = 'text-pipeline'
export const WORKSPACE_DB_STORE = 'workspace'
export const WORKSPACE_DB_KEY = 'current'
export const WORKSPACE_LAYOUT_STORAGE_KEY = 'text-pipeline:layout:v1'
export const WORKSPACE_CHANNEL_NAME = 'text-pipeline:workspace'

export const LEGACY_STORAGE_KEYS = {
  leftOpened: 'text-pipeline:leftSidebarOpened',
  rightOpened: 'text-pipeline:rightSidebarOpened',
  splitRatio: 'text-pipeline:editorSplitRatio',
} as const

const SYNTAX_MODES = new Set<SyntaxMode>([
  'plain',
  'csv',
  'diff',
  'go',
  'graphql',
  'html',
  'http',
  'javascript',
  'json',
  'jwt',
  'markdown',
  'ndjson',
  'sql',
  'toml',
  'typescript',
  'xml',
  'yaml',
])

const ENCODINGS = new Set([
  'UTF-8',
  'UTF-16 LE',
  'UTF-16 BE',
  'US-ASCII',
  'ISO-8859-1',
  'Windows-1252',
])

const VIEW_MODES = new Set<WorkbenchViewMode>(['source', 'view'])

export type EditorId = 'main' | 'sub'

export type SidebarLayout = {
  leftOpened: boolean
  rightOpened: boolean
}

export type WorkbenchLayoutState = {
  activeEditorId: EditorId
  compareEnabled: boolean
  compact: SidebarLayout
  splitEnabled: boolean
  splitRatio: number
  wide: SidebarLayout
}

export type WorkbenchHistoryState = {
  commits: Array<TextCommit>
  commitSequence: number
  initialRevision: { syntaxMode: SyntaxMode; text: string }
  rootCaptured: boolean
  selectedRevisionId: string
  workingBaseRevisionId: string
}

export type WorkbenchPersistedState = {
  editors: Record<EditorId, EditorSessionInitialState>
  history: WorkbenchHistoryState
  layout: WorkbenchLayoutState
}

type PersistedCommitV1 = {
  afterSyntaxMode: SyntaxMode
  afterText: string
  description: string
  id: string
  parentId: string
  timestamp: string
  title: string
}

type PersistedWorkspaceV1 = {
  editors: Record<EditorId, EditorSessionInitialState>
  history: Omit<WorkbenchHistoryState, 'commits'> & {
    commits: Array<PersistedCommitV1>
  }
  layout: WorkbenchLayoutState
  revision: number
  savedAt: string
  schemaVersion: 1
}

export type LoadedWorkspace = {
  revision: number
  savedAt: string | null
  state: WorkbenchPersistedState
}

export class WorkspaceConflictError extends Error {
  constructor() {
    super('The saved workspace was changed by another tab.')
    this.name = 'WorkspaceConflictError'
  }
}

export function createDefaultEditorState(): EditorSessionInitialState {
  return {
    encoding: 'UTF-8',
    formatSelection: { mode: 'auto' },
    selection: { anchor: 0, head: 0 },
    softWrapEnabled: true,
    sourceViewEnabled: true,
    sqlDialectId: DEFAULT_SQL_DIALECT.id,
    syntaxMode: 'plain',
    validationEnabled: false,
    value: '',
    viewMode: 'source',
    whitespaceVisible: false,
    scroll: { left: 0, top: 0 },
  }
}

export function createDefaultWorkspaceState(): WorkbenchPersistedState {
  return {
    editors: {
      main: createDefaultEditorState(),
      sub: createDefaultEditorState(),
    },
    history: {
      commits: [],
      commitSequence: 0,
      initialRevision: { syntaxMode: 'plain', text: '' },
      rootCaptured: false,
      selectedRevisionId: WORKING_REVISION_ID,
      workingBaseRevisionId: ROOT_REVISION_ID,
    },
    layout: {
      activeEditorId: 'main',
      compareEnabled: false,
      compact: { leftOpened: false, rightOpened: false },
      splitEnabled: false,
      splitRatio: 50,
      wide: { leftOpened: false, rightOpened: true },
    },
  }
}

export function readLayoutBootstrap(
  fallback: WorkbenchLayoutState,
): WorkbenchLayoutState {
  if (typeof window === 'undefined') return fallback

  try {
    const current = parseLayout(
      JSON.parse(
        window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '',
      ),
      fallback,
    )
    if (current) return current
  } catch {
    // Fall through to legacy keys and defaults.
  }

  return {
    ...fallback,
    splitRatio: readLegacyRatio(fallback.splitRatio),
    wide: {
      leftOpened: readLegacyBoolean(
        LEGACY_STORAGE_KEYS.leftOpened,
        fallback.wide.leftOpened,
      ),
      rightOpened: readLegacyBoolean(
        LEGACY_STORAGE_KEYS.rightOpened,
        fallback.wide.rightOpened,
      ),
    },
  }
}

export function writeLayoutBootstrap(layout: WorkbenchLayoutState) {
  window.localStorage.setItem(
    WORKSPACE_LAYOUT_STORAGE_KEY,
    JSON.stringify(layout),
  )
}

export function removeLegacyStorageKeys() {
  Object.values(LEGACY_STORAGE_KEYS).forEach((key) =>
    window.localStorage.removeItem(key),
  )
}

export function clearWorkspaceLocalStorage() {
  window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
  removeLegacyStorageKeys()
  window.localStorage.removeItem('mantine-color-scheme-value')
}

export async function loadWorkspace(
  fallback: WorkbenchPersistedState,
): Promise<LoadedWorkspace> {
  const database = await openWorkspaceDatabase()

  try {
    const stored = await requestToPromise<unknown>(
      database
        .transaction(WORKSPACE_DB_STORE, 'readonly')
        .objectStore(WORKSPACE_DB_STORE)
        .get(WORKSPACE_DB_KEY),
    )

    if (stored === undefined) {
      return { revision: 0, savedAt: null, state: fallback }
    }

    const parsed = parseWorkspace(stored, fallback)
    if (!parsed) {
      throw new Error('The saved workspace is invalid or uses a newer schema.')
    }

    return parsed
  } finally {
    database.close()
  }
}

export async function saveWorkspace({
  expectedRevision,
  force = false,
  state,
}: {
  expectedRevision: number
  force?: boolean
  state: WorkbenchPersistedState
}): Promise<{ revision: number; savedAt: string }> {
  const database = await openWorkspaceDatabase()
  const transaction = database.transaction(WORKSPACE_DB_STORE, 'readwrite')
  const store = transaction.objectStore(WORKSPACE_DB_STORE)

  try {
    const current = await requestToPromise<unknown>(store.get(WORKSPACE_DB_KEY))
    const currentRevision = getStoredRevision(current)

    if (!force && currentRevision !== expectedRevision) {
      transaction.abort()
      throw new WorkspaceConflictError()
    }

    const revision = currentRevision + 1
    const savedAt = new Date().toISOString()
    store.put(serializeWorkspace(state, revision, savedAt), WORKSPACE_DB_KEY)
    await transactionToPromise(transaction)
    return { revision, savedAt }
  } finally {
    database.close()
  }
}

export async function clearWorkspaceStorage() {
  const database = await openWorkspaceDatabase()

  try {
    const transaction = database.transaction(WORKSPACE_DB_STORE, 'readwrite')
    transaction.objectStore(WORKSPACE_DB_STORE).clear()
    await transactionToPromise(transaction)
  } finally {
    database.close()
  }

  clearWorkspaceLocalStorage()
}

function serializeWorkspace(
  state: WorkbenchPersistedState,
  revision: number,
  savedAt: string,
): PersistedWorkspaceV1 {
  return {
    editors: state.editors,
    history: {
      ...state.history,
      commits: state.history.commits.map(
        ({
          afterSyntaxMode,
          afterText,
          description,
          id,
          parentId,
          timestamp,
          title,
        }) => ({
          afterSyntaxMode,
          afterText,
          description,
          id,
          parentId,
          timestamp,
          title,
        }),
      ),
    },
    layout: state.layout,
    revision,
    savedAt,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
  }
}

function parseWorkspace(
  value: unknown,
  fallback: WorkbenchPersistedState,
): LoadedWorkspace | null {
  if (!isRecord(value) || value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    return null
  }
  if (
    !isFiniteNonNegative(value.revision) ||
    typeof value.savedAt !== 'string'
  ) {
    return null
  }

  const editors = isRecord(value.editors)
    ? {
        main: parseEditor(value.editors.main, fallback.editors.main),
        sub: parseEditor(value.editors.sub, fallback.editors.sub),
      }
    : null
  const history = parseHistory(value.history, fallback.history)
  const layout = parseLayout(value.layout, fallback.layout)

  if (!editors || !history || !layout) return null

  if (!layout.splitEnabled) {
    layout.compareEnabled = false
    layout.activeEditorId = 'main'
  } else if (layout.compareEnabled) {
    layout.splitEnabled = true
  }

  return {
    revision: value.revision,
    savedAt: value.savedAt,
    state: { editors, history, layout },
  }
}

function parseHistory(
  value: unknown,
  fallback: WorkbenchHistoryState,
): WorkbenchHistoryState | null {
  if (!isRecord(value) || !Array.isArray(value.commits)) return null
  const initialRevision = parseTextRevision(value.initialRevision)
  if (!initialRevision) return null

  const persistedCommits = value.commits.map(parseCommit)
  if (persistedCommits.some((commit) => commit === null)) return null
  const persistedIds = new Set(
    (persistedCommits as Array<PersistedCommitV1>).map(({ id }) => id),
  )
  if (persistedIds.size !== persistedCommits.length) return null
  for (let index = 0; index < persistedCommits.length; index += 1) {
    const commit = persistedCommits[index] as PersistedCommitV1
    const expectedParent =
      index === persistedCommits.length - 1
        ? ROOT_REVISION_ID
        : (persistedCommits[index + 1] as PersistedCommitV1).id
    if (commit.parentId !== expectedParent) return null
  }
  const commits = reconstructCommits(
    persistedCommits as Array<PersistedCommitV1>,
    initialRevision,
  )
  if (!commits) return null

  const ids = new Set(commits.map(({ id }) => id))
  const selectedRevisionId =
    typeof value.selectedRevisionId === 'string' &&
    (value.selectedRevisionId === ROOT_REVISION_ID ||
      value.selectedRevisionId === WORKING_REVISION_ID ||
      ids.has(value.selectedRevisionId))
      ? value.selectedRevisionId
      : WORKING_REVISION_ID
  const workingBaseRevisionId =
    typeof value.workingBaseRevisionId === 'string' &&
    (value.workingBaseRevisionId === ROOT_REVISION_ID ||
      ids.has(value.workingBaseRevisionId))
      ? value.workingBaseRevisionId
      : ROOT_REVISION_ID

  return {
    commits,
    commitSequence: isFiniteNonNegative(value.commitSequence)
      ? Math.max(value.commitSequence, getLargestCommitSequence(commits))
      : Math.max(fallback.commitSequence, getLargestCommitSequence(commits)),
    initialRevision,
    rootCaptured:
      typeof value.rootCaptured === 'boolean'
        ? value.rootCaptured
        : fallback.rootCaptured,
    selectedRevisionId,
    workingBaseRevisionId,
  }
}

function reconstructCommits(
  persisted: Array<PersistedCommitV1>,
  initialRevision: { syntaxMode: SyntaxMode; text: string },
): Array<TextCommit> | null {
  const byId = new Map(persisted.map((commit) => [commit.id, commit]))
  const result = new Map<string, TextCommit>()
  const visiting = new Set<string>()

  function build(commit: PersistedCommitV1): TextCommit | null {
    const existing = result.get(commit.id)
    if (existing) return existing
    if (visiting.has(commit.id)) return null
    visiting.add(commit.id)

    let beforeText = initialRevision.text
    let beforeSyntaxMode = initialRevision.syntaxMode
    if (commit.parentId !== ROOT_REVISION_ID) {
      const parent = byId.get(commit.parentId)
      if (!parent) return null
      const builtParent = build(parent)
      if (!builtParent) return null
      beforeText = builtParent.afterText
      beforeSyntaxMode = builtParent.afterSyntaxMode
    }

    const built = createTextCommit({
      afterSyntaxMode: commit.afterSyntaxMode,
      afterText: commit.afterText,
      beforeSyntaxMode,
      beforeText,
      description: commit.description,
      id: commit.id,
      parentId: commit.parentId,
      timestamp: commit.timestamp,
      title: commit.title,
    })
    visiting.delete(commit.id)
    result.set(commit.id, built)
    return built
  }

  for (const commit of persisted) {
    if (!build(commit)) return null
  }

  return persisted.map(({ id }) => result.get(id) as TextCommit)
}

function parseCommit(value: unknown): PersistedCommitV1 | null {
  if (!isRecord(value) || !isSyntaxMode(value.afterSyntaxMode)) return null
  const strings = [
    value.afterText,
    value.description,
    value.id,
    value.parentId,
    value.timestamp,
    value.title,
  ]
  if (strings.some((item) => typeof item !== 'string')) return null
  if (value.id === ROOT_REVISION_ID || value.id === WORKING_REVISION_ID)
    return null

  return {
    afterSyntaxMode: value.afterSyntaxMode,
    afterText: value.afterText as string,
    description: value.description as string,
    id: value.id as string,
    parentId: value.parentId as string,
    timestamp: value.timestamp as string,
    title: value.title as string,
  }
}

function parseEditor(
  value: unknown,
  fallback: EditorSessionInitialState,
): EditorSessionInitialState {
  if (!isRecord(value)) return fallback
  const text = typeof value.value === 'string' ? value.value : fallback.value
  const syntaxMode = isSyntaxMode(value.syntaxMode)
    ? value.syntaxMode
    : fallback.syntaxMode
  const selection = parseSelection(value.selection, text.length)
  const scroll = parseScroll(value.scroll)

  return {
    encoding: ENCODINGS.has(String(value.encoding))
      ? String(value.encoding)
      : fallback.encoding,
    formatSelection: parseFormatSelection(value.formatSelection),
    selection,
    softWrapEnabled: booleanOr(value.softWrapEnabled, fallback.softWrapEnabled),
    sourceViewEnabled: booleanOr(
      value.sourceViewEnabled,
      fallback.sourceViewEnabled,
    ),
    sqlDialectId: parseSqlDialectId(value.sqlDialectId),
    syntaxMode,
    validationEnabled: booleanOr(
      value.validationEnabled,
      fallback.validationEnabled,
    ),
    value: text,
    viewMode: VIEW_MODES.has(value.viewMode as WorkbenchViewMode)
      ? (value.viewMode as WorkbenchViewMode)
      : fallback.viewMode,
    whitespaceVisible: booleanOr(
      value.whitespaceVisible,
      fallback.whitespaceVisible,
    ),
    scroll,
  }
}

function parseLayout(
  value: unknown,
  fallback: WorkbenchLayoutState,
): WorkbenchLayoutState | null {
  if (!isRecord(value)) return null
  const wide = parseSidebar(value.wide, fallback.wide)
  const compact = parseSidebar(value.compact, fallback.compact)
  if (!wide || !compact) return null

  return {
    activeEditorId:
      value.activeEditorId === 'sub' || value.activeEditorId === 'main'
        ? value.activeEditorId
        : fallback.activeEditorId,
    compareEnabled: booleanOr(value.compareEnabled, fallback.compareEnabled),
    compact,
    splitEnabled: booleanOr(value.splitEnabled, fallback.splitEnabled),
    splitRatio:
      typeof value.splitRatio === 'number' &&
      Number.isFinite(value.splitRatio) &&
      value.splitRatio >= 20 &&
      value.splitRatio <= 80
        ? value.splitRatio
        : fallback.splitRatio,
    wide,
  }
}

function parseSidebar(value: unknown, fallback: SidebarLayout) {
  if (!isRecord(value)) return null
  return {
    leftOpened: booleanOr(value.leftOpened, fallback.leftOpened),
    rightOpened: booleanOr(value.rightOpened, fallback.rightOpened),
  }
}

function parseTextRevision(value: unknown) {
  return isRecord(value) &&
    typeof value.text === 'string' &&
    isSyntaxMode(value.syntaxMode)
    ? { syntaxMode: value.syntaxMode, text: value.text }
    : null
}

function parseSelection(value: unknown, length: number) {
  if (!isRecord(value)) return { anchor: 0, head: 0 }
  return {
    anchor: clampOffset(value.anchor, length),
    head: clampOffset(value.head, length),
  }
}

function parseScroll(value: unknown) {
  if (!isRecord(value)) return { left: 0, top: 0 }
  return {
    left: finiteNonNegativeOr(value.left, 0),
    top: finiteNonNegativeOr(value.top, 0),
  }
}

function parseFormatSelection(value: unknown): FormatSelectionState {
  if (!isRecord(value) || value.mode === 'auto') return { mode: 'auto' }
  if (
    value.mode === 'locked' &&
    (value.origin === 'detected' ||
      value.origin === 'known' ||
      value.origin === 'manual')
  ) {
    return { mode: 'locked', origin: value.origin }
  }
  return { mode: 'auto' }
}

function parseSqlDialectId(value: unknown): SqlDialectId {
  return typeof value === 'string'
    ? getSqlDialect(value as SqlDialectId).id
    : DEFAULT_SQL_DIALECT.id
}

function getLargestCommitSequence(commits: ReadonlyArray<TextCommit>) {
  return commits.reduce((largest, { id }) => {
    const match = /^c(\d+)$/.exec(id)
    return match ? Math.max(largest, Number(match[1])) : largest
  }, 0)
}

function getStoredRevision(value: unknown) {
  return isRecord(value) && isFiniteNonNegative(value.revision)
    ? value.revision
    : 0
}

function readLegacyBoolean(key: string, fallback: boolean) {
  const value = window.localStorage.getItem(key)
  return value === null ? fallback : value === 'true'
}

function readLegacyRatio(fallback: number) {
  const value = Number(
    window.localStorage.getItem(LEGACY_STORAGE_KEYS.splitRatio),
  )
  return Number.isFinite(value) && value >= 20 && value <= 80 ? value : fallback
}

function booleanOr(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function clampOffset(value: unknown, length: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(length, Math.max(0, Math.round(value)))
    : 0
}

function finiteNonNegativeOr(value: unknown, fallback: number) {
  return isFiniteNonNegative(value) ? value : fallback
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isSyntaxMode(value: unknown): value is SyntaxMode {
  return SYNTAX_MODES.has(value as SyntaxMode)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function openWorkspaceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(WORKSPACE_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
        database.createObjectStore(WORKSPACE_DB_STORE)
      }
    }
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB failed'))
    request.onsuccess = () => resolve(request.result)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB failed'))
    request.onsuccess = () => resolve(request.result)
  })
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.oncomplete = () => resolve()
  })
}
