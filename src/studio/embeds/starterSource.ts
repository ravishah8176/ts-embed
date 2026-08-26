import { EMBED_CLASS_NAME } from '../constants'
import type { EmbedType } from '../constants'

/**
 * What the config panel opens with for an embed nothing has been written for yet.
 *
 * Deliberately empty of props. There are no built-in default configs any more — a
 * config is whatever source the user writes and applies — so this is the shape of
 * the call and nothing else: the import the SDK needs, the constructor to fill in,
 * and the `render()` that makes it an embed. Anything more would be this app's
 * opinion masquerading as the user's config.
 *
 * It is not stored. Until the source is applied it exists only in the editor, so an
 * embed with nothing applied has no config at all rather than an empty one.
 */
export function starterSource(type: EmbedType): string {
  const className = EMBED_CLASS_NAME[type]
  const hint = SURFACE_HINT[type]
  return (
    `import { ${className} } from '@thoughtspot/visual-embed-sdk'\n\n` +
    `const embed = new ${className}(container, {\n${hint ? `  // ${hint}\n` : '\n'}})\n\n` +
    `embed.render()\n`
  )
}

/**
 * The prop that makes a surface itself, named where it is not implied by the class.
 *
 * A saved Answer and a Search are both a `SearchEmbed`, and a visualization and a
 * Liveboard are both a `LiveboardEmbed` — the difference is one prop, and a skeleton
 * that did not say which would be the same skeleton twice. It stays a comment: the
 * config is still empty, and an id belongs to the user, not to this app.
 */
const SURFACE_HINT: Partial<Record<EmbedType, string>> = {
  viz: 'liveboardId and vizId identify the visualization to embed',
  answer: 'answerId identifies the saved Answer to embed',
}
