import type { ElementType, ReactNode } from 'react'
import './Typography.scss'

/**
 * Text at a Radiant type step.
 *
 * The scale lives in SCSS mixins, which means a component can only reach it from
 * a stylesheet — so every new piece of text needs a class before it can be sized
 * correctly, and the easy wrong answer is a bare `font-size`. This puts the
 * scale in the component layer instead, the way `@thoughtspot/radiant-react`
 * does, so text can be written at a named step directly in the JSX.
 *
 * Each variant carries a default element, because the step and the semantics
 * agree far more often than not — a page title is an `h1`, a footnote is a
 * `span`. Override with `as` where they diverge.
 */
export type TypographyVariant =
  | 'headline-large'
  | 'page-title'
  | 'modal-title'
  | 'section-label'
  | 'content-label'
  | 'content-label-subhead'
  | 'body-large'
  | 'body-normal'
  | 'footnote'
  | 'caption'
  | 'overline'
  | 'fine-prints'

/** Maps to the `content-*` token group; `inverse` is for text on a filled surface. */
export type TypographyColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'inverse'
  | 'success'
  | 'warning'
  | 'failure'

const DEFAULT_TAG: Record<TypographyVariant, ElementType> = {
  'headline-large': 'h1',
  'page-title': 'h1',
  'modal-title': 'h2',
  'section-label': 'h3',
  'content-label': 'h4',
  'content-label-subhead': 'h5',
  'body-large': 'p',
  'body-normal': 'p',
  footnote: 'span',
  caption: 'span',
  overline: 'span',
  'fine-prints': 'span',
}

interface Props {
  variant: TypographyVariant
  /** Omitted inherits the surrounding colour, which is usually what a nested label wants. */
  color?: TypographyColor
  /** Overrides the variant's default element where the step and the semantics disagree. */
  as?: ElementType
  /** Single-line ellipsis. Multi-line clamping is a layout concern, so it stays in CSS. */
  truncate?: boolean
  className?: string
  title?: string
  children: ReactNode
}

export default function Typography({
  variant,
  color,
  as,
  truncate = false,
  className,
  title,
  children,
}: Props) {
  const Tag = as ?? DEFAULT_TAG[variant]

  const classes = [
    `ts-typo-${variant}`,
    color ? `ts-typo-c-${color}` : '',
    truncate ? 'ts-typo-truncate' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} title={title}>
      {children}
    </Tag>
  )
}
