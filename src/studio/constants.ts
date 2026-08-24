import { embedSdk } from '../thoughtspot/sdkLoader'

export type EmbedType = 'app' | 'liveboard' | 'search' | 'spotter'
/** Top-bar tabs: the embed types plus the REST API SDK explorer. */
export type StudioTab = EmbedType | 'rest'
export type LogDir = 'embed' | 'host'

export interface LogRow {
  id: string
  ts: number
  dir: LogDir
  /** Display key (member name, e.g. "RouteChange") */
  name: string
  payload: unknown
  viaReaction?: string
  reactedWith?: string
}

export interface Reaction {
  embedEvent: string
  hostEvent: string
}

export const REACT_CHOICES = [
  'Reload',
  'Navigate',
  'SetActiveTab',
  'UpdateRuntimeFilters',
  'UpdateParameters',
  'ShowUnderlyingData',
  'DownloadAsPdf',
  'Share',
  'Pin',
  'Present',
]

/** Example payloads pre-filled into the composer JSON editor per host event. */
export const SAMPLE: Record<string, unknown> = {
  Reload: {},
  ResetSearch: {},
  Present: {},
  ExitPresentMode: {},
  GetFilters: {},
  GetParameters: {},
  GetTabs: {},
  GetPageContext: {},
  GetIframeUrl: {},
  GetAnswerSession: {},
  DestroyEmbed: {},
  GetTML: { metadataIds: ['7d3b0e21-9c0a-4f2e'] },
  Navigate: { path: 'insights/home' },
  SetActiveTab: { tabId: 'tab-revenue' },
  UpdateRuntimeFilters: [{ columnName: 'Region', operator: 'EQ', values: ['West'] }],
  UpdateParameters: [{ name: 'Revenue Target', value: 1500000 }],
  Search: { searchQuery: '[Revenue] [Product] top 10' },
  SpotterSearch: { query: 'What are my top products by revenue this quarter?' },
  AskSpotter: { query: 'Show me revenue trend by month' },
  ShareSpotterConversation: { conversationId: '<conversation-guid>' },
  CloseSpotterShareConversation: {},
  ExitSpotterSharedConversation: {},
  AskSage: { query: 'Show me revenue trend by month' },
  SetVisibleVizs: ['viz-revenue', 'viz-trend'],
  SetVisibleTabs: ['tab-overview', 'tab-revenue'],
  SetHiddenTabs: ['tab-admin'],
  UpdateCrossFilter: {
    vizId: 'viz-revenue',
    conditions: [{ columnName: 'Region', values: ['West'] }],
  },
  DownloadAsPdf: {},
  DownloadAsPng: {},
  DownloadAsCsv: {},
  DownloadAsXlsx: {},
  DownloadLiveboardAsContinuousPDF: {},
  DrillDown: {
    points: { clickedPoint: { selectedAttributes: [{ column: 'Product', value: 'Widgets' }] } },
  },
  ShowUnderlyingData: { vizId: 'viz-revenue', maxRows: 1000 },
  Pin: { newLiveboardName: 'Executive KPIs' },
  Share: { principals: [{ type: 'USER', name: 'ceo@acme.com' }], permission: 'READ_ONLY' },
  ExportTML: { metadataId: '7d3b0e21-9c0a-4f2e', exportFqn: true },
  AddColumns: { columnIds: ['col-margin'] },
  RemoveColumn: { columnId: 'col-discount' },
  UpdateEmbedParams: { visibleActions: ['save', 'share'] },
  SelectPersonalizedView: { viewId: 'view-default' },
  SpotterVizSendUserMessage: { message: 'Break this down by region' },
  Save: {},
  Edit: {},
  MakeACopy: {},
  Delete: {},
  Explore: {},
  CopyLink: {},
}

/**
 * Host events surfaced in the composer — generated from the SDK's `HostEvent`
 * enum, so new SDK events appear automatically with no hand-maintained list.
 * Every embed tab shows the full set; the UI groups them via `categoryOf()` and
 * filters by the search box. Events that don't apply to a given embed type simply
 * no-op when triggered. `_type` is kept for call-site compatibility.
 */
export function allowedHostEvents(_type?: EmbedType): string[] {
  return Object.keys(embedSdk().HostEvent).filter((k) => isNaN(Number(k)))
}

/**
 * Reverse map: EmbedEvent runtime value (e.g. "init") -> member name ("Init").
 *
 * `embed.on(EmbedEvent.ALL)` delivers `payload.type` as the *value*, so it is
 * mapped back to a readable key for display. Built on first use rather than at
 * module load: the SDK is fetched at the version the user picked, so its enums do
 * not exist until sign-in has completed.
 */
let embedValueToKey: Record<string, string> | null = null

export function embedEventKey(value: string): string {
  if (!embedValueToKey) {
    embedValueToKey = Object.entries(embedSdk().EmbedEvent).reduce((acc, [key, v]) => {
      if (typeof v === 'string') acc[v] = key
      return acc
    }, {} as Record<string, string>)
  }
  return embedValueToKey[value] ?? value
}

/* ----------------------------------------------------------------------------
 * Display helpers — ported from the design's DCLogic.
 * -------------------------------------------------------------------------- */

const HUMANIZE_OVERRIDES: Record<string, string> = {
  tml: 'TML', pdf: 'PDF', png: 'PNG', csv: 'CSV', xlsx: 'XLSX', ai: 'AI', saml: 'SAML',
  sso: 'SSO', api: 'API', ui: 'UI', url: 'URL', id: 'ID', spotiq: 'SpotIQ', viz: 'Viz',
}

export function humanize(k: string): string {
  if (k === 'APP_INIT') return 'App Init'
  if (k === 'V1Data') return 'V1 Data'
  if (k === 'CLEAR_INFO_CACHE') return 'Clear Info Cache'
  const s = k
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return s
    .split(' ')
    .map((w) => {
      const lw = w.toLowerCase()
      return HUMANIZE_OVERRIDES[lw] || w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

export function initials(name: string): string {
  return (name || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function jstr(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export function nameFromEmail(em: string): string {
  const local = (em || '').split('@')[0] || 'User'
  return local
    .split(/[._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** `embed.trigger(HostEvent.X)` preview shown under the composer. */
export function composerCodeFor(key: string, draft: string): string {
  const t = (draft || '').trim()
  try {
    const p = t ? JSON.parse(t) : undefined
    if (
      p === undefined ||
      (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0)
    ) {
      return `embed.trigger(HostEvent.${key});`
    }
    return `embed.trigger(HostEvent.${key}, ${JSON.stringify(p)});`
  } catch {
    return `embed.trigger(HostEvent.${key}, /* fix JSON */);`
  }
}

export const EMBED_CLASS_NAME: Record<EmbedType, string> = {
  app: 'AppEmbed',
  liveboard: 'LiveboardEmbed',
  search: 'SearchEmbed',
  spotter: 'SpotterEmbed',
}
