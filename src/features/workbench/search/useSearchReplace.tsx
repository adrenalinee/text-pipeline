import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  search,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search'
import { Prec } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { Panel, ViewUpdate } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, RefObject } from 'react'
import { createPortal } from 'react-dom'

import { countMatches, EMPTY_MATCH_COUNT } from './matchCount'
import { replaceAllMatches, replaceCurrentMatch } from './searchCommands'
import type { ReplaceOutcome } from './searchCommands'
import { SearchReplacePanel } from './SearchReplacePanel'
import type { SearchPanelFocusRequest } from './SearchReplacePanel'

/**
 * One batch of replace actions performed with the same search/replace pair.
 * Sessions are committed to the history graph as a single commit when the
 * panel closes, the query changes, or a non-replace edit touches the text.
 */
export type ReplaceSession = {
  afterText: string
  beforeText: string
  occurrences: number
  replace: string
  search: string
}

function isPatternValid(searchText: string, regexp: boolean) {
  if (!regexp || !searchText) {
    return true
  }

  try {
    new RegExp(searchText)
    return true
  } catch {
    return false
  }
}

export function useSearchReplace({
  editorRef,
  onReplaceCommit,
}: {
  editorRef: RefObject<ReactCodeMirrorRef | null>
  onReplaceCommit: (session: ReplaceSession) => void
}) {
  const [panelDom, setPanelDom] = useState<HTMLElement | null>(null)
  const [showReplace, setShowReplace] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regexp, setRegexp] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const [matchInfo, setMatchInfo] = useState(EMPTY_MATCH_COUNT)
  const [panelHeight, setPanelHeight] = useState(0)
  const [focusRequest, setFocusRequest] =
    useState<SearchPanelFocusRequest | null>(null)

  const pendingSessionRef = useRef<ReplaceSession | null>(null)
  const flushTimerRef = useRef<number | null>(null)
  const focusSeqRef = useRef(0)
  const overlayHeightRef = useRef(0)
  const prevOverlayHeightRef = useRef(0)
  const onReplaceCommitRef = useRef(onReplaceCommit)

  onReplaceCommitRef.current = onReplaceCommit

  const overlayHeight = panelDom ? panelHeight : 0

  overlayHeightRef.current = overlayHeight

  /**
   * Removes the pending replace session without committing it. Used both as
   * the first step of a flush and to deliberately discard the session (e.g.
   * when a checkout throws working text away).
   */
  const takePendingReplace = useCallback(() => {
    const session = pendingSessionRef.current

    pendingSessionRef.current = null

    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    return session
  }, [])

  const flushPendingReplace = useCallback(() => {
    const session = takePendingReplace()

    if (session && session.beforeText !== session.afterText) {
      onReplaceCommitRef.current(session)
    }
  }, [takePendingReplace])

  /**
   * Flushes on the next tick. Used from CodeMirror update/destroy callbacks
   * so the commit runs after React has processed the editor change that
   * triggered it (keeping Workbench state fresh inside the commit handler).
   */
  const scheduleFlush = useCallback(() => {
    if (pendingSessionRef.current === null || flushTimerRef.current !== null) {
      return
    }

    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null
      flushPendingReplace()
    }, 0)
  }, [flushPendingReplace])

  useEffect(() => () => flushPendingReplace(), [flushPendingReplace])

  const requestFocus = useCallback((target: 'replace' | 'search') => {
    focusSeqRef.current += 1
    setFocusRequest({ seq: focusSeqRef.current, target })
  }, [])

  /**
   * Opens the search panel from outside the editor (toolbar/sidebar buttons).
   * openSearchPanel prefills the query from the current editor selection, so
   * callers get selection-as-query behavior for free.
   */
  const openPanel = useCallback(
    (target: 'replace' | 'search') => {
      const view = editorRef.current?.view

      if (!view) {
        return
      }

      if (target === 'replace') {
        setShowReplace(true)
      }

      openSearchPanel(view)
      requestFocus(target)
    },
    [editorRef, requestFocus],
  )

  const extensions = useMemo<Array<Extension>>(() => {
    const syncQueryToReact = (query: SearchQuery) => {
      setSearchText(query.search)
      setCaseSensitive(query.caseSensitive)
      setRegexp(query.regexp)
    }

    const createPanel = (view: EditorView): Panel => {
      const dom = document.createElement('div')

      dom.className = 'searchReplacePanelHost'

      return {
        dom,
        mount: () => {
          const query = getSearchQuery(view.state)

          syncQueryToReact(query)
          setMatchInfo(countMatches(view.state, query))
          setPanelDom(dom)
        },
        top: true,
        update: (update: ViewUpdate) => {
          let queryChanged = false

          for (const transaction of update.transactions) {
            for (const effect of transaction.effects) {
              if (effect.is(setSearchQuery)) {
                queryChanged = true
                syncQueryToReact(effect.value)
              }
            }
          }

          if (queryChanged || update.docChanged || update.selectionSet) {
            setMatchInfo(
              countMatches(update.state, getSearchQuery(update.state)),
            )
          }
        },
        destroy: () => {
          setPanelDom(null)
          scheduleFlush()
        },
      }
    }

    const openPanelFromKeymap = (view: EditorView, withReplace: boolean) => {
      if (withReplace) {
        setShowReplace(true)
      }

      openSearchPanel(view)
      requestFocus(withReplace ? 'replace' : 'search')

      return true
    }

    return [
      search({ createPanel, literal: true, top: true }),
      Prec.high(
        keymap.of([
          { key: 'Mod-f', run: (view) => openPanelFromKeymap(view, false) },
          // Ctrl+H (VS Code style) instead of IntelliJ's Ctrl+R, which would
          // shadow browser reload; Cmd+H hides the app on macOS.
          {
            key: 'Ctrl-h',
            mac: 'Cmd-Alt-f',
            run: (view) => openPanelFromKeymap(view, true),
          },
          { key: 'Escape', run: closeSearchPanel },
          {
            key: 'F3',
            preventDefault: true,
            run: findNext,
            shift: findPrevious,
          },
          {
            key: 'Mod-g',
            preventDefault: true,
            run: findNext,
            shift: findPrevious,
          },
        ]),
      ),
      // Keeps findNext/findPrevious from scrolling matches under the overlay.
      EditorView.scrollMargins.of(() => ({ top: overlayHeightRef.current })),
      // Any non-replace document change ends the pending replace session so
      // manual typing never gets folded into a replace commit.
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || pendingSessionRef.current === null) {
          return
        }

        const isReplaceEvent = update.transactions.some((transaction) =>
          transaction.isUserEvent('input.replace'),
        )

        if (!isReplaceEvent) {
          scheduleFlush()
        }
      }),
    ]
  }, [requestFocus, scheduleFlush])

  // Sync the React query state into CodeMirror, flushing the pending session
  // first when the search/replace pair changed.
  useEffect(() => {
    const view = editorRef.current?.view

    if (!view || !panelDom) {
      return
    }

    const session = pendingSessionRef.current

    if (
      session &&
      (session.search !== searchText || session.replace !== replaceText)
    ) {
      flushPendingReplace()
    }

    const desired = new SearchQuery({
      caseSensitive,
      literal: true,
      regexp,
      replace: replaceText,
      search: searchText,
    })

    if (!desired.eq(getSearchQuery(view.state))) {
      view.dispatch({ effects: setSearchQuery.of(desired) })
    }
  }, [
    caseSensitive,
    editorRef,
    flushPendingReplace,
    panelDom,
    regexp,
    replaceText,
    searchText,
  ])

  // Overlay compensation: the panel floats above the text, and the content
  // gains matching top padding (via --search-panel-height) so line 1 can be
  // scrolled out from under it. Adjusting scrollTop by the same delta in the
  // same layout pass keeps the visible text from moving when the padding
  // appears or disappears.
  useLayoutEffect(() => {
    const delta = overlayHeight - prevOverlayHeightRef.current

    prevOverlayHeightRef.current = overlayHeight

    if (delta === 0) {
      return
    }

    const view = editorRef.current?.view

    if (!view) {
      return
    }

    view.scrollDOM.scrollTop += delta
    view.requestMeasure()
  }, [editorRef, overlayHeight])

  function getView() {
    return editorRef.current?.view ?? null
  }

  function buildQuery() {
    return new SearchQuery({
      caseSensitive,
      literal: true,
      regexp,
      replace: replaceText,
      search: searchText,
    })
  }

  function runReplace(
    command: (
      view: EditorView,
      query: SearchQuery,
      options: { preserveCase: boolean },
    ) => ReplaceOutcome,
  ) {
    const view = getView()

    if (!view) {
      return
    }

    const query = buildQuery()

    if (!query.valid) {
      return
    }

    const outcome = command(view, query, { preserveCase })

    if (!outcome.changed) {
      return
    }

    const session = pendingSessionRef.current

    if (
      session &&
      session.search === query.search &&
      session.replace === query.replace
    ) {
      session.afterText = outcome.afterText
      session.occurrences += outcome.occurrences
    } else {
      if (session) {
        flushPendingReplace()
      }

      pendingSessionRef.current = {
        afterText: outcome.afterText,
        beforeText: outcome.beforeText,
        occurrences: outcome.occurrences,
        replace: query.replace,
        search: query.search,
      }
    }
  }

  const closePanel = useCallback(() => {
    const view = editorRef.current?.view

    if (view) {
      closeSearchPanel(view)
      view.focus()
    }
  }, [editorRef])

  const queryValid = isPatternValid(searchText, regexp)

  const panelPortal = panelDom
    ? createPortal(
        <SearchReplacePanel
          caseSensitive={caseSensitive}
          focusRequest={focusRequest}
          matchInfo={matchInfo}
          preserveCase={preserveCase}
          queryValid={queryValid}
          regexp={regexp}
          replaceText={replaceText}
          searchText={searchText}
          showReplace={showReplace}
          onCaseSensitiveChange={setCaseSensitive}
          onClose={closePanel}
          onFindNext={() => {
            const view = getView()
            if (view) {
              findNext(view)
            }
          }}
          onFindPrevious={() => {
            const view = getView()
            if (view) {
              findPrevious(view)
            }
          }}
          onHeightChange={setPanelHeight}
          onOpenReplaceRow={() => {
            setShowReplace(true)
            requestFocus('replace')
          }}
          onPreserveCaseChange={setPreserveCase}
          onRegexpChange={setRegexp}
          onReplaceAll={() => runReplace(replaceAllMatches)}
          onReplaceNext={() => runReplace(replaceCurrentMatch)}
          onReplaceTextChange={setReplaceText}
          onSearchTextChange={setSearchText}
          onToggleReplaceRow={() => setShowReplace((value) => !value)}
        />,
        panelDom,
      )
    : null

  const editorProps = {
    className: overlayHeight > 0 ? 'codeEditorSearchOpen' : '',
    style: {
      '--search-panel-height': `${overlayHeight}px`,
    } as CSSProperties,
  }

  return {
    closePanel,
    editorProps,
    extensions,
    isOpen: panelDom !== null,
    openPanel,
    panelPortal,
    takePendingReplace,
  }
}
