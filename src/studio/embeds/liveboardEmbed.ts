import { LiveboardEmbed } from '@thoughtspot/visual-embed-sdk'
import { embedConfig } from '../config'

/**
 * Liveboard embed (LiveboardEmbed).
 *
 * Needs a real `liveboardId` — set VITE_TS_LIVEBOARD_ID in .env, or hardcode
 * one below while testing. Edit anything in `LiveboardViewConfig` here.
 */
export function createLiveboardEmbed(container: HTMLDivElement): LiveboardEmbed {
  return new LiveboardEmbed(container, {
    frameParams: { width: '100%', height: '100%' },

    // ───────── customize from here ─────────
    liveboardId: embedConfig.liveboardId,
    fullHeight: true,
    // ───────────────────────────────────────
  })
}
