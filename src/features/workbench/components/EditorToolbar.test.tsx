// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { handleEditorToolbarShortcut } from './EditorPane'
import { EDITOR_TOOLBAR_SHORTCUTS, EditorToolbar } from './EditorToolbar'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class ResizeObserverMock {
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()
    },
  })
})

afterEach(cleanup)

const commonProps = {
  activeViewMode: 'source' as const,
  canCommitWorkingText: false,
  isActive: true,
  onCopyText: vi.fn(),
  onOpenSamples: vi.fn(),
  onOpenSearch: vi.fn(),
  onPasteText: vi.fn(),
  onSetViewMode: vi.fn(),
  onToggleSoftWrap: vi.fn(),
  onToggleWhitespace: vi.fn(),
  searchPanelOpen: false,
  softWrapEnabled: true,
  viewAvailable: true,
  whitespaceVisible: false,
}

describe('EditorToolbar capabilities', () => {
  it('marks only the active editor indicator with its active state', () => {
    const { rerender } = render(
      <MantineProvider>
        <EditorToolbar {...commonProps} showCommit={false} />
      </MantineProvider>,
    )

    expect(
      screen.getByLabelText('Active editor').hasAttribute('data-active'),
    ).toBe(true)

    rerender(
      <MantineProvider>
        <EditorToolbar {...commonProps} isActive={false} showCommit={false} />
      </MantineProvider>,
    )

    expect(
      screen.getByLabelText('Inactive editor').hasAttribute('data-active'),
    ).toBe(false)
  })

  it('keeps view mode but omits commit controls from the sub editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar {...commonProps} showCommit={false} />
      </MantineProvider>,
    )

    expect(screen.queryByLabelText('Editor view mode')).toBeNull()
    expect(screen.getByLabelText('Show view')).toBeTruthy()
    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
    expect(screen.getByLabelText('Choose sample data')).toBeTruthy()
    expect(screen.getByLabelText('Copy editor text')).toBeTruthy()
    expect(screen.getByLabelText('Paste clipboard text')).toBeTruthy()
    expect(screen.getByLabelText('Search and replace')).toBeTruthy()
  })

  it('keeps view mode and commit controls in the main editor', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit
          onCommitWorkingText={vi.fn()}
        />
      </MantineProvider>,
    )

    expect(screen.queryByLabelText('Editor view mode')).toBeNull()
    expect(screen.getByLabelText('Show view')).toBeTruthy()
    expect(screen.getByLabelText('Commit current editor text')).toBeTruthy()
  })

  it('keeps every editor action visible in view mode', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          showCommit={false}
        />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Show source only')).toBeTruthy()
    expect(screen.getByLabelText('Choose sample data')).toBeTruthy()
    expect(screen.getByLabelText('Copy editor text')).toBeTruthy()
    expect(screen.getByLabelText('Paste clipboard text')).toBeTruthy()
    expect(screen.getByLabelText('Show whitespace')).toBeTruthy()
    expect(screen.getByLabelText('Disable soft wrap')).toBeTruthy()
    expect(screen.getByLabelText('Search and replace')).toBeTruthy()
    expect(screen.queryByLabelText('Commit current editor text')).toBeNull()
  })

  it('reports and toggles the visual view state', () => {
    const onSetViewMode = vi.fn()

    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          activeViewMode="view"
          onSetViewMode={onSetViewMode}
          showCommit
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show source only')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(toggle)
    expect(onSetViewMode).toHaveBeenCalledWith('source')
  })

  it('disables the view toggle when the format has no visual view', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit={false}
          viewAvailable={false}
        />
      </MantineProvider>,
    )

    const toggle = screen.getByLabelText('Show view')
    expect((toggle as HTMLButtonElement).disabled).toBe(true)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
  })

  it('shows whitespace state and invokes its toggle', () => {
    const onToggleWhitespace = vi.fn()

    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          onToggleWhitespace={onToggleWhitespace}
          showCommit={false}
        />
      </MantineProvider>,
    )

    const whitespaceToggle = screen.getByLabelText('Show whitespace')
    const softWrapToggle = screen.getByLabelText('Disable soft wrap')
    expect(whitespaceToggle.getAttribute('aria-pressed')).toBe('false')
    expect(
      whitespaceToggle.compareDocumentPosition(softWrapToggle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(whitespaceToggle)
    expect(onToggleWhitespace).toHaveBeenCalledOnce()
  })

  it('exposes the assigned keyboard shortcuts on every icon action', () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          showCommit
          onCommitWorkingText={vi.fn()}
        />
      </MantineProvider>,
    )

    expect(
      screen
        .getByLabelText('Copy editor text')
        .getAttribute('aria-keyshortcuts'),
    ).toBe(EDITOR_TOOLBAR_SHORTCUTS.copy.aria)
    expect(
      screen
        .getByLabelText('Paste clipboard text')
        .getAttribute('aria-keyshortcuts'),
    ).toBe(EDITOR_TOOLBAR_SHORTCUTS.paste.aria)
    expect(
      screen.getByLabelText('Show view').getAttribute('aria-keyshortcuts'),
    ).toBe(EDITOR_TOOLBAR_SHORTCUTS.view.aria)
    expect(
      screen
        .getByLabelText('Show whitespace')
        .getAttribute('aria-keyshortcuts'),
    ).toBe(EDITOR_TOOLBAR_SHORTCUTS.whitespace.aria)
    expect(
      screen
        .getByLabelText('Disable soft wrap')
        .getAttribute('aria-keyshortcuts'),
    ).toBe(EDITOR_TOOLBAR_SHORTCUTS.softWrap.aria)
    expect(
      screen
        .getByLabelText('Search and replace')
        .getAttribute('aria-keyshortcuts'),
    ).toBe('Control+F Meta+F')
    expect(
      screen
        .getByLabelText('Commit current editor text')
        .getAttribute('aria-keyshortcuts'),
    ).toBe(EDITOR_TOOLBAR_SHORTCUTS.commit.aria)
  })

  it('shows each icon action shortcut in its tooltip', async () => {
    render(
      <MantineProvider>
        <EditorToolbar
          {...commonProps}
          canCommitWorkingText
          showCommit
          onCommitWorkingText={vi.fn()}
        />
      </MantineProvider>,
    )

    const cases = [
      ['Copy editor text', 'Copy selected text, or all text (Ctrl+C)'],
      ['Paste clipboard text', 'Paste at cursor or replace selection (Ctrl+V)'],
      ['Show view', 'Show view (Ctrl+Shift+E)'],
      ['Show whitespace', 'Show whitespace (Ctrl+Alt+W)'],
      ['Disable soft wrap', 'Disable soft wrap (Alt+Z)'],
      ['Search and replace', 'Search and replace (Ctrl+F)'],
      ['Commit current editor text', 'Commit current editor text (Ctrl+S)'],
    ] as const

    for (const [accessibleName, tooltip] of cases) {
      const action = screen.getByLabelText(accessibleName)
      fireEvent.mouseEnter(action)
      expect(await screen.findByText(tooltip)).toBeTruthy()
      fireEvent.mouseLeave(action)
    }
  })

  it('reports both close shortcuts while search is open', async () => {
    render(
      <MantineProvider>
        <EditorToolbar {...commonProps} searchPanelOpen showCommit={false} />
      </MantineProvider>,
    )

    const closeSearch = screen.getByLabelText('Close search')
    expect(closeSearch.getAttribute('aria-keyshortcuts')).toBe(
      'Control+F Meta+F Escape',
    )
    fireEvent.mouseEnter(closeSearch)
    expect(await screen.findByText('Close search (Ctrl+F or Esc)')).toBeTruthy()
  })

  it('runs toolbar actions from their shortcuts inside CodeMirror', () => {
    const actions = {
      canCommit: true,
      canToggleView: true,
      commit: vi.fn(),
      toggleSoftWrap: vi.fn(),
      toggleView: vi.fn(),
      toggleWhitespace: vi.fn(),
    }

    render(
      <div
        onKeyDownCapture={(event) =>
          handleEditorToolbarShortcut(event, actions)
        }
      >
        <div aria-label="CodeMirror content" className="cm-content" />
      </div>,
    )

    const editor = screen.getByLabelText('CodeMirror content')
    fireEvent.keyDown(editor, {
      code: 'KeyE',
      ctrlKey: true,
      shiftKey: true,
    })
    fireEvent.keyDown(editor, {
      altKey: true,
      code: 'KeyW',
      ctrlKey: true,
    })
    fireEvent.keyDown(editor, { altKey: true, code: 'KeyZ' })
    fireEvent.keyDown(editor, { code: 'KeyS', ctrlKey: true })

    expect(actions.toggleView).toHaveBeenCalledOnce()
    expect(actions.toggleWhitespace).toHaveBeenCalledOnce()
    expect(actions.toggleSoftWrap).toHaveBeenCalledOnce()
    expect(actions.commit).toHaveBeenCalledOnce()
  })

  it('leaves native copy and paste shortcuts to the browser', () => {
    const actions = {
      canCommit: true,
      canToggleView: true,
      commit: vi.fn(),
      toggleSoftWrap: vi.fn(),
      toggleView: vi.fn(),
      toggleWhitespace: vi.fn(),
    }

    render(
      <div
        onKeyDownCapture={(event) =>
          handleEditorToolbarShortcut(event, actions)
        }
      >
        <div aria-label="CodeMirror content" className="cm-content" />
      </div>,
    )

    const editor = screen.getByLabelText('CodeMirror content')
    expect(fireEvent.keyDown(editor, { code: 'KeyC', ctrlKey: true })).toBe(
      true,
    )
    expect(fireEvent.keyDown(editor, { code: 'KeyV', ctrlKey: true })).toBe(
      true,
    )
    expect(actions.commit).not.toHaveBeenCalled()
    expect(actions.toggleSoftWrap).not.toHaveBeenCalled()
    expect(actions.toggleView).not.toHaveBeenCalled()
    expect(actions.toggleWhitespace).not.toHaveBeenCalled()
  })

  it('preserves shortcuts in standalone text inputs', () => {
    const commit = vi.fn()

    render(
      <div
        onKeyDownCapture={(event) =>
          handleEditorToolbarShortcut(event, {
            canCommit: true,
            canToggleView: true,
            commit,
            toggleSoftWrap: vi.fn(),
            toggleView: vi.fn(),
            toggleWhitespace: vi.fn(),
          })
        }
      >
        <input aria-label="Search field" />
      </div>,
    )

    expect(
      fireEvent.keyDown(screen.getByLabelText('Search field'), {
        code: 'KeyS',
        ctrlKey: true,
      }),
    ).toBe(true)
    expect(commit).not.toHaveBeenCalled()
  })
})
