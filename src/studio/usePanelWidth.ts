import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'

/**
 * Width of the left panel, dragged by the user and remembered per browser.
 *
 * The panel holds a JSON editor, so how wide it should be is a question about the
 * config being edited, not something a fixed number can answer — a `runtimeFilters`
 * array wants room, a couple of booleans do not.
 *
 * The drag uses pointer capture rather than window listeners: the embed next to the
 * panel is an iframe, and without capture it swallows every move event the moment
 * the cursor crosses into it, leaving the drag stuck.
 *
 * Each panel passes its own storage key: the embed config panel and the REST
 * Explorer's request builder hold different things, and a width that suits one is
 * not a width the other should inherit.
 */
const DEFAULT_STORE_KEY = 'ts_embed_panel_width_v1'

export const PANEL_MIN_WIDTH = 300
export const PANEL_MAX_WIDTH = 920
export const PANEL_DEFAULT_WIDTH = 400

/** Keeps the embed itself usable no matter how wide the panel is dragged. */
const EMBED_MIN_WIDTH = 360

const KEYBOARD_STEP = 24

export interface PanelWidthOptions {
  storeKey?: string
  defaultWidth?: number
}

function clamp(width: number): number {
  const roomForEmbed = Math.max(PANEL_MIN_WIDTH, window.innerWidth - EMBED_MIN_WIDTH)
  return Math.round(Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, Math.min(width, roomForEmbed))))
}

/**
 * Reads and writes swallow their errors: with site data disabled the panel still
 * resizes, it just starts at the default width on every load.
 */
function load(storeKey: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(storeKey)
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? clamp(parsed) : clamp(fallback)
  } catch {
    return clamp(fallback)
  }
}

function save(storeKey: string, width: number) {
  try {
    localStorage.setItem(storeKey, String(width))
  } catch {
    /* empty */
  }
}

export interface PanelResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onDoubleClick: () => void
}

export function usePanelWidth(options: PanelWidthOptions = {}) {
  const { storeKey = DEFAULT_STORE_KEY, defaultWidth = PANEL_DEFAULT_WIDTH } = options
  const [width, setWidth] = useState(() => load(storeKey, defaultWidth))
  const [resizing, setResizing] = useState(false)
  const dragStart = useRef({ x: 0, width: 0 })
  /** Mirrors `resizing` for the handlers: a move can land before React re-renders. */
  const dragging = useRef(false)

  /** Only persist once a drag settles, so a drag is not one write per frame. */
  useEffect(() => {
    if (!resizing) save(storeKey, width)
  }, [resizing, storeKey, width])

  /** The cursor and the text-selection block have to hold across the whole page. */
  useEffect(() => {
    document.body.classList.toggle('sp-resizing', resizing)
    return () => document.body.classList.remove('sp-resizing')
  }, [resizing])

  useEffect(() => {
    const onWindowResize = () => setWidth((w) => clamp(w))
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [])

  const handleProps: PanelResizeHandleProps = {
    onPointerDown: (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragStart.current = { x: e.clientX, width }
      dragging.current = true
      setResizing(true)
    },
    onPointerMove: (e) => {
      if (!dragging.current) return
      setWidth(clamp(dragStart.current.width + (e.clientX - dragStart.current.x)))
    },
    onPointerUp: (e) => {
      if (!dragging.current) return
      dragging.current = false
      setResizing(false)
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    },
    onKeyDown: (e) => {
      if (e.key === 'ArrowLeft') setWidth((w) => clamp(w - KEYBOARD_STEP))
      else if (e.key === 'ArrowRight') setWidth((w) => clamp(w + KEYBOARD_STEP))
      else if (e.key === 'Home') setWidth(clamp(defaultWidth))
      else return
      e.preventDefault()
    },
    onDoubleClick: () => setWidth(clamp(defaultWidth)),
  }

  return { width, resizing, handleProps }
}
