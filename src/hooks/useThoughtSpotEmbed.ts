import { useEffect, useRef, useState } from 'react'
import { EmbedEvent, SpotterEmbed, AppEmbed, LiveboardEmbed, SearchEmbed } from '@thoughtspot/visual-embed-sdk'

export type AnyTsEmbed = SpotterEmbed | AppEmbed | LiveboardEmbed | SearchEmbed

export type EmbedStatus = 'loading' | 'ready' | 'error'

export function useThoughtSpotEmbed<T extends AnyTsEmbed>(
  factory: (container: HTMLDivElement) => T,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<T | null>(null)
  const [status, setStatus] = useState<EmbedStatus>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!containerRef.current) return

    const embed = factory(containerRef.current)
    embedRef.current = embed

    embed.on(EmbedEvent.Load, () => setStatus('ready'))
    embed.on(EmbedEvent.Error, (payload) => {
      // Non-fatal: ThoughtSpot fires Error for internal navigation issues.
      // Log it but let the iframe handle its own error UI.
      console.warn('[ThoughtSpot] EmbedEvent.Error (non-fatal):', payload)
    })
    embed.on(EmbedEvent.AuthExpire, () => {
      setErrorMsg('Authentication expired. Check credentials in .env.')
      setStatus('error')
    })

    embed.render()

    return () => {
      embedRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, embedRef, status, errorMsg }
}
