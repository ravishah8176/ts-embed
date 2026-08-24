import { useCallback, useEffect, useRef, useState } from 'react'
import type { HostEvent } from '../thoughtspot/sdkTypes'
import type { EmbedType } from './constants'
import { EMBED_CLASS_NAME, embedEventKey } from './constants'
import { createEmbed, type AnyEmbed, type ViewConfigValues } from './embeds'
import { onAuthFailure } from '../thoughtspot/init'
import { embedSdk, loadedVersion } from '../thoughtspot/sdkLoader'

export type EmbedStatus = 'loading' | 'ready' | 'error'

export interface EmbedEventInfo {
  /** Member-name key, e.g. "RouteChange" (mapped back from the runtime value). */
  name: string
  payload: unknown
}

/**
 * Owns the live ThoughtSpot embed for the Studio surface.
 *
 * - Recreates the embed instance when `embedType` or `viewConfig` changes (old
 *   iframe destroyed). A view config cannot be changed on a live embed, so every
 *   config edit applied from the UI comes through here as a fresh instance.
 * - Streams every embed event through `onEvent` via `EmbedEvent.ALL` (the console).
 * - Exposes `trigger()` which dispatches a real `embed.trigger(HostEvent.X, …)`.
 *
 * `onEvent` is held in a ref so the embed isn't torn down on every render. The
 * caller owns `viewConfig`'s identity: it must be a new object only when the user
 * applies a change, never per keystroke, or the embed would reload while typing.
 */
export function useStudioEmbed(
  embedType: EmbedType | null,
  viewConfig: ViewConfigValues | null,
  onEvent: (e: EmbedEventInfo) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<AnyEmbed | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const [status, setStatus] = useState<EmbedStatus>('loading')
  /** Why the surface is in error, when it is something the user can act on. */
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    // No embed selected yet (landing screen) — nothing to mount.
    if (!container || !embedType || !viewConfig) return
    setStatus('loading')
    setError(null)

    const { EmbedEvent } = embedSdk()

    /**
     * Building the embed can fail outright on a version the user picked — an embed
     * class or an enum the config names may simply not exist in it. Reported here,
     * because the alternative is a spinner that never resolves.
     */
    let embed: AnyEmbed
    try {
      embed = createEmbed(embedType, container, viewConfig)
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      setError(
        `${EMBED_CLASS_NAME[embedType]} could not be created with Visual Embed SDK ` +
          `${loadedVersion('embed') ?? '?'} — ${detail}`,
      )
      setStatus('error')
      return
    }
    embedRef.current = embed

    embed.on(EmbedEvent.ALL, (payload) => {
      // Skip the "start" half of start/end pairs to keep the log to discrete events.
      if (payload?.status === 'start') return
      const value = String(payload?.type ?? '')
      if (!value || value === '*') return
      onEventRef.current({
        name: embedEventKey(value),
        payload: payload?.data,
      })
    })
    embed.on(EmbedEvent.Load, () => setStatus('ready'))
    embed.on(EmbedEvent.Error, (payload) => {
      console.warn('[Studio] EmbedEvent.Error (non-fatal):', payload)
    })
    // EmbedEvent.AuthExpire is intentionally NOT handled here: in cookieless
    // auto-login mode the SDK silently refreshes the token on it, so treating it
    // as an error would clobber a healthy (self-healing) session. Only a genuine,
    // unrecoverable auth failure (surfaced via onAuthFailure) shows the overlay.
    const unsubscribeAuthFailure = onAuthFailure(() => setStatus('error'))

    try {
      embed.render()
    } catch (e) {
      setError(`${EMBED_CLASS_NAME[embedType]} failed to render — ${e instanceof Error ? e.message : String(e)}`)
      setStatus('error')
    }

    return () => {
      unsubscribeAuthFailure()
      try {
        embed.destroy()
      } catch {
        /* embed may already be gone */
      }
      embedRef.current = null
      container.innerHTML = ''
    }
  }, [embedType, viewConfig])

  /** Fire a real host event at the live embed. `key` is a HostEvent member name. */
  const trigger = useCallback((key: string, params?: unknown): Promise<unknown> => {
    const embed = embedRef.current
    const hostEvent = (embedSdk().HostEvent as Record<string, HostEvent>)[key]
    if (!embed || hostEvent === undefined) {
      return Promise.reject(new Error(`Cannot trigger ${key}`))
    }
    // The SDK's trigger signature is heavily generic; the params shape is event-specific.
    return embed.trigger(hostEvent, params as never)
  }, [])

  return { containerRef, status, error, trigger }
}
