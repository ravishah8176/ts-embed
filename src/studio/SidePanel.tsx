import type { ReactNode } from 'react'
import './SidePanel.scss'
import {
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  type PanelResizeHandleProps,
} from './usePanelWidth'

interface Props {
  width: number
  resizing: boolean
  handleProps: PanelResizeHandleProps
  children: ReactNode
}

/**
 * The resizable shell the left-panel tools live in.
 *
 * They are separate components with very different state but share one slot, one
 * surface and one width — which the user drags — so the frame belongs here rather
 * than in each of them.
 *
 * While a drag is live a transparent shield covers the window. Two things need it:
 * the embed iframe sets its own cursor and its document would otherwise show a text
 * or pointer cursor mid-drag, and any element with a `cursor` of its own (the code
 * editor) would do the same. The shield is one surface with one cursor over the lot.
 */
export default function SidePanel({ width, resizing, handleProps, children }: Props) {
  return (
    <aside className={'sp-shell' + (resizing ? ' resizing' : '')} style={{ flex: `0 0 ${width}px` }}>
      {resizing && <div className="sp-drag-shield" aria-hidden />}
      <div className="sp-inner">{children}</div>
      <div
        className="sp-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={width}
        aria-valuemin={PANEL_MIN_WIDTH}
        aria-valuemax={PANEL_MAX_WIDTH}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        {...handleProps}
      >
        <span className="sp-grip" />
      </div>
    </aside>
  )
}
