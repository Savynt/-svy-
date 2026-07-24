'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Highlighter, Eraser } from 'lucide-react'

/**
 * The reading passage, with exam-style highlighting.
 *
 * A CSS `::selection` colour is not a highlighter: it looks marked while the
 * mouse is down and vanishes the moment the button is released, so nothing the
 * learner marked while hunting for an answer survives. Here the selection stays
 * the browser's own, and marking is an explicit act — select a phrase, a small
 * "Highlight" button appears just above it, click it and the text is wrapped in
 * a `<mark>` that stays until it is cleared. Clicking an existing highlight
 * offers to remove it.
 *
 * The passage is injected with `dangerouslySetInnerHTML` and React never
 * re-renders that subtree (the HTML string is constant for a task), so the
 * marks we insert into the DOM are safe from being wiped by a re-render.
 */

/** Marks this component created, so we never wrap or unwrap anything else. */
const MARK_ATTR = 'data-hl'

interface Toolbar {
  /** Viewport coordinates of the anchor (selection or mark) midpoint / top. */
  x: number
  y: number
  mode: 'add' | 'remove'
  /** Present in `remove` mode: the mark the learner clicked. */
  target?: HTMLElement
}

/** Every text node inside `range` that carries at least one visible character. */
function textNodesInRange(range: Range, root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const out: Text[] = []
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    if (range.intersectsNode(text) && text.data.trim().length > 0) out.push(text)
    node = walker.nextNode()
  }
  return out
}

/** True when the node already sits inside one of our highlights. */
function insideMark(node: Node, root: HTMLElement): boolean {
  let cur: Node | null = node.parentNode
  while (cur && cur !== root) {
    if (cur instanceof HTMLElement && cur.hasAttribute(MARK_ATTR)) return true
    cur = cur.parentNode
  }
  return false
}

/**
 * Wrap the selected text in `<mark>` elements.
 *
 * `Range.surroundContents` throws whenever the selection crosses an element
 * boundary — which is most of the time in a passage of `<p>`s and `<strong>`s —
 * so we walk the text nodes instead, splitting the first and last at the exact
 * offsets and wrapping each piece on its own.
 */
function highlightRange(range: Range, root: HTMLElement): boolean {
  const nodes = textNodesInRange(range, root).filter((n) => !insideMark(n, root))
  if (nodes.length === 0) return false

  // Split the boundary nodes first: after splitText the tail is a new node, so
  // do the end before the start to keep the start offsets valid.
  const last = nodes[nodes.length - 1]
  if (last === range.endContainer && range.endOffset < last.data.length) {
    last.splitText(range.endOffset)
  }
  const first = nodes[0]
  if (first === range.startContainer && range.startOffset > 0) {
    nodes[0] = first.splitText(range.startOffset)
  }

  for (const node of nodes) {
    const mark = document.createElement('mark')
    mark.setAttribute(MARK_ATTR, '1')
    mark.className = 'rounded-[3px] bg-amber-200/90 px-0.5 text-navy-900'
    node.parentNode?.replaceChild(mark, node)
    mark.appendChild(node)
  }
  return true
}

/** Replace a highlight with its own contents. */
function removeMark(mark: HTMLElement, root: HTMLElement): void {
  const parent = mark.parentNode
  if (!parent) return
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
  parent.removeChild(mark)
  // Re-join the text nodes we split, so repeated mark/unmark cycles do not
  // leave the passage fragmented into hundreds of nodes.
  root.normalize()
}

export function PassageReader({ html, className }: { html: string; className?: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [toolbar, setToolbar] = useState<Toolbar | null>(null)
  const [count, setCount] = useState(0)
  // The exact range captured when the button appeared. On touch devices, tapping
  // the button collapses the live selection *before* the click handler runs, so
  // re-reading window.getSelection() at click time finds nothing — that was why
  // highlighting did nothing on the phone. We snapshot the range here instead.
  const pendingRange = useRef<Range | null>(null)

  const hide = useCallback(() => setToolbar(null), [])

  /** Show the "Highlight" button above whatever the learner just selected. */
  const onSelection = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return hide()
    const range = selection.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer) || !range.toString().trim()) return hide()
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return hide()
    pendingRange.current = range.cloneRange()
    setToolbar({ x: rect.left + rect.width / 2, y: rect.top, mode: 'add' })
  }, [hide])

  const applyHighlight = useCallback(() => {
    const root = rootRef.current
    const range = pendingRange.current
    if (!root || !range) return
    if (highlightRange(range, root)) setCount((n) => n + 1)
    pendingRange.current = null
    window.getSelection()?.removeAllRanges()
    hide()
  }, [hide])

  /** Clicking an existing highlight offers to take it off again. */
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement | null)?.closest?.(`[${MARK_ATTR}]`)
      if (!(target instanceof HTMLElement)) return
      const rect = target.getBoundingClientRect()
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top, mode: 'remove', target })
    },
    [],
  )

  const applyRemove = useCallback(() => {
    const root = rootRef.current
    if (root && toolbar?.target) {
      removeMark(toolbar.target, root)
      setCount((n) => Math.max(0, n - 1))
    }
    hide()
  }, [hide, toolbar])

  const clearAll = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    root.querySelectorAll<HTMLElement>(`[${MARK_ATTR}]`).forEach((m) => removeMark(m, root))
    setCount(0)
    hide()
  }, [hide])

  // The toolbar is positioned in viewport coordinates, so any scroll or resize
  // would leave it pointing at the wrong words — drop it instead of chasing.
  useEffect(() => {
    if (!toolbar) return
    const drop = () => hide()
    window.addEventListener('scroll', drop, true)
    window.addEventListener('resize', drop)
    return () => {
      window.removeEventListener('scroll', drop, true)
      window.removeEventListener('resize', drop)
    }
  }, [toolbar, hide])

  // A click anywhere outside the passage dismisses the button.
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (root && e.target instanceof Node && !root.contains(e.target)) hide()
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [hide])

  return (
    <>
      {count > 0 && (
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-navy-400 transition hover:bg-navy-50 hover:text-navy-700"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden />
            Clear {count} highlight{count === 1 ? '' : 's'}
          </button>
        </div>
      )}

      <div
        ref={rootRef}
        onMouseUp={onSelection}
        onTouchEnd={onSelection}
        onClick={onClick}
        className={className}
        // Passage HTML is authored/moderated content from the DB.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {toolbar && (
        <div
          className="fixed z-40 -translate-x-1/2 -translate-y-full pb-1.5"
          style={{ left: toolbar.x, top: toolbar.y }}
          // Keep the selection alive: a mousedown on the button would otherwise
          // collapse it before the click handler ever runs.
          onMouseDown={(e) => e.preventDefault()}
        >
          {toolbar.mode === 'add' ? (
            <button
              type="button"
              onClick={applyHighlight}
              // On touch, fire on touchend and suppress the synthetic click so the
              // tap is not swallowed by the browser dismissing the selection first.
              onTouchEnd={(e) => {
                e.preventDefault()
                applyHighlight()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-navy-700"
            >
              <Highlighter className="h-4 w-4 text-amber-300" aria-hidden />
              Highlight
            </button>
          ) : (
            <button
              type="button"
              onClick={applyRemove}
              onTouchEnd={(e) => {
                e.preventDefault()
                applyRemove()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-navy-700"
            >
              <Eraser className="h-4 w-4 text-amber-300" aria-hidden />
              Remove
            </button>
          )}
        </div>
      )}
    </>
  )
}

export default PassageReader
