import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.scss'

/**
 * A button at Radiant's spec.
 *
 * Replaces the single `.ts-btn-primary` utility, which was one appearance with
 * seven companion classes bolted on for size and padding. Radiant's button is a
 * matrix instead — three variants by three sizes — so the sizes live here once
 * and a call site picks one rather than re-deriving padding.
 *
 * Colours come from the Layer 3 component tokens (`--rd-comp-color-button-*`)
 * rather than the semantic palette: a primary button's hover step is a decision
 * about buttons, not a role every other component should be able to reach for.
 *
 * Two deliberate departures from `@thoughtspot/radiant-react`:
 *  - the variant prop is `variant`, not `type` — `type` is a native `<button>`
 *    attribute and shadowing it invites submitting a form by accident.
 *  - the `--ts-var-button--*` customisation layer is dropped. Those exist so an
 *    embedding customer can restyle Blink's chrome; this Studio is the host, not
 *    the embed, so the indirection would never resolve to anything.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

/** Heights are 20 / 24 / 32px — Radiant's three steps, on the 4px grid. */
export type ButtonSize = 'xs' | 's' | 'm'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Rendered before the label, or alone — an icon with no children becomes a circle. */
  icon?: ReactNode
  iconPlacement?: 'left' | 'right'
  isSelected?: boolean
  /** Ellipsis the label instead of letting it overflow — for buttons in a shared row. */
  truncate?: boolean
  /** Layout only — width, margin, grid placement. Appearance belongs to the variant. */
  className?: string
  children?: ReactNode
}

export default function Button({
  variant = 'secondary',
  size = 'm',
  icon,
  iconPlacement = 'left',
  isSelected = false,
  truncate = false,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  const hasText = children !== undefined && children !== null && children !== false

  const classes = [
    'ts-btn',
    `ts-btn--${variant}`,
    `ts-btn--${size}`,
    icon ? 'ts-btn--icon' : '',
    hasText ? 'ts-btn--text' : '',
    isSelected ? 'ts-btn--selected' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} disabled={disabled} {...rest}>
      {icon && iconPlacement === 'left' && icon}
      {hasText && (
        <span className={truncate ? 'ts-btn-label ts-btn-label--truncate' : 'ts-btn-label'}>
          {children}
        </span>
      )}
      {icon && iconPlacement === 'right' && icon}
    </button>
  )
}
