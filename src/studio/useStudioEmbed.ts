import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppEmbed,
  EmbedEvent,
  HostEvent,
  LiveboardEmbed,
  SearchEmbed,
  SpotterEmbed,
} from '@thoughtspot/visual-embed-sdk'
import type { EmbedType } from './constants'
import { EMBED_VALUE_TO_KEY } from './constants'
import { embedConfig } from './config'

type AnyEmbed = AppEmbed | LiveboardEmbed | SearchEmbed | SpotterEmbed
export type EmbedStatus = 'loading' | 'ready' | 'error'

export interface EmbedEventInfo {
  /** Member-name key, e.g. "RouteChange" (mapped back from the runtime value). */
  name: string
  payload: unknown
}

function createEmbed(type: EmbedType, container: HTMLDivElement): AnyEmbed {
  const frameParams = { width: '100%', height: '100%' }
  switch (type) {
    case 'liveboard':
      return new LiveboardEmbed(container, {
        frameParams,
        liveboardId: embedConfig.liveboardId,
        fullHeight: true,
      })
    case 'search':
      return new SearchEmbed(container, {
        frameParams,
        dataSources: embedConfig.dataSourceId ? [embedConfig.dataSourceId] : undefined,
      })
    case 'spotter':
      return new SpotterEmbed(container, {
        frameParams,
        worksheetId: embedConfig.worksheetId,
      })
    case 'app':
    default:
      return new AppEmbed(container, { frameParams })
  }
}

/**
 * Owns the live ThoughtSpot embed for the Studio surface.
 *
 * - Recreates the embed instance when `embedType` changes (old iframe destroyed).
 * - Streams every embed event through `onEvent` via `EmbedEvent.ALL` (the console).
 * - Exposes `trigger()` which dispatches a real `embed.trigger(HostEvent.X, …)`.
 *
 * `onEvent` is held in a ref so the embed isn't torn down on every render — only
 * a genuine `embedType` change rebuilds it.
 */
export function useStudioEmbed(embedType: EmbedType, onEvent: (e: EmbedEventInfo) => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<AnyEmbed | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const [status, setStatus] = useState<EmbedStatus>('loading')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    setStatus('loading')

    const embed = createEmbed(embedType, container)
    embedRef.current = embed

    embed.on(EmbedEvent.ALL, (payload) => {
      // Skip the "start" half of start/end pairs to keep the log to discrete events.
      if (payload?.status === 'start') return
      const value = String(payload?.type ?? '')
      if (!value || value === '*') return
      onEventRef.current({
        name: EMBED_VALUE_TO_KEY[value] ?? value,
        payload: payload?.data,
      })
    })
    embed.on(EmbedEvent.Load, () => setStatus('ready'))
    embed.on(EmbedEvent.Error, (payload) => {
      console.warn('[Studio] EmbedEvent.Error (non-fatal):', payload)
    })
    embed.on(EmbedEvent.AuthExpire, () => setStatus('error'))

    embed.render()

    return () => {
      try {
        embed.destroy()
      } catch {
        /* embed may already be gone */
      }
      embedRef.current = null
      container.innerHTML = ''
    }
  }, [embedType])

  /** Fire a real host event at the live embed. `key` is a HostEvent member name. */
  const trigger = useCallback((key: string, params?: unknown): Promise<unknown> => {
    const embed = embedRef.current
    const hostEvent = (HostEvent as Record<string, HostEvent>)[key]
    if (!embed || hostEvent === undefined) {
      return Promise.reject(new Error(`Cannot trigger ${key}`))
    }
    // The SDK's trigger signature is heavily generic; the params shape is event-specific.
    return embed.trigger(hostEvent, params as never)
  }, [])

  return { containerRef, status, trigger }
}
