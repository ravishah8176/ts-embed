import Button from './Button'
import './PanelRail.scss'

/**
 * The collapsed left panel.
 *
 * Rendered instead of either panel tool, so collapsing does not silently pick one
 * of them: expanding returns to whichever tab was last open.
 */
export default function PanelRail({ onExpand }: { onExpand: () => void }) {
  return (
    <aside className="pr-rail">
      <Button
        variant="primary"
        size="m"
        onClick={onExpand}
        title="Expand panel"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        }
      />
    </aside>
  )
}
