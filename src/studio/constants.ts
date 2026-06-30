import { EmbedEvent, HostEvent } from '@thoughtspot/visual-embed-sdk'

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

/* ----------------------------------------------------------------------------
 * Event categorisation — ported from the Embed Studio design.
 * -------------------------------------------------------------------------- */

export interface Category {
  label: string
  color: string
}

export const CATS: Record<string, Category> = {
  render: { label: 'Lifecycle', color: '#10B981' },
  auth: { label: 'Auth & Session', color: '#3B82F6' },
  interaction: { label: 'Interaction', color: '#8B5CF6' },
  data: { label: 'Data', color: '#06B6D4' },
  action: { label: 'Actions & Export', color: '#F59E0B' },
  spotter: { label: 'Spotter / AI', color: '#EC4899' },
  system: { label: 'System', color: '#64748B' },
  error: { label: 'Errors', color: '#EF4444' },
}

export const CAT_ORDER = [
  'render',
  'auth',
  'interaction',
  'data',
  'action',
  'spotter',
  'system',
  'error',
] as const

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

/** Host events surfaced in the composer, grouped by the embed type they apply to. */
export const EMBED_HOST_EVENTS: Record<EmbedType, string[]> = {
  app: [
    'Navigate', 'Reload', 'GetPageContext', 'UpdateRuntimeFilters', 'GetFilters', 'UpdateFilters',
    'UpdateParameters', 'GetParameters', 'SetActiveTab', 'GetTabs', 'AskSage', 'Save', 'Share',
    'UpdateEmbedParams', 'GetIframeUrl', 'DestroyEmbed',
  ],
  liveboard: [
    'UpdateRuntimeFilters', 'GetFilters', 'UpdateFilters', 'UpdateParameters', 'GetParameters',
    'SetActiveTab', 'GetTabs', 'SetVisibleTabs', 'SetHiddenTabs', 'SetVisibleVizs', 'UpdateCrossFilter',
    'ResetLiveboardPersonalisedView', 'UpdatePersonalisedView', 'SelectPersonalizedView', 'Pin', 'Share',
    'Schedule', 'SchedulesList', 'ExportTML', 'GetTML', 'EditTML', 'UpdateTML', 'DownloadAsPdf',
    'DownloadLiveboardAsContinuousPDF', 'Present', 'ExitPresentMode', 'MakeACopy', 'Edit', 'Delete',
    'CopyLink', 'AIHighlights', 'LiveboardInfo', 'getExportRequestForCurrentPinboard',
    'RefreshLiveboardBrowserCache', 'Reload', 'GetIframeUrl', 'UpdateEmbedParams', 'DestroyEmbed',
  ],
  search: [
    'Search', 'ResetSearch', 'UpdateRuntimeFilters', 'GetFilters', 'UpdateFilters', 'UpdateParameters',
    'GetParameters', 'AddColumns', 'RemoveColumn', 'DrillDown', 'ShowUnderlyingData', 'GetAnswerSession',
    'AnswerChartSwitcher', 'SaveAnswer', 'Save', 'Pin', 'Share', 'DownloadAsPng', 'DownloadAsCsv',
    'DownloadAsXlsx', 'ExportTML', 'GetTML', 'SpotIQAnalyze', 'Explore', 'Reload', 'GetIframeUrl',
    'UpdateEmbedParams', 'DestroyEmbed',
  ],
  spotter: [
    'SpotterSearch', 'StartNewSpotterConversation', 'ResetSpotterConversation', 'EditLastPrompt',
    'DeleteLastPrompt', 'PreviewSpotterData', 'DataModelInstructions', 'AddToCoaching', 'Save',
    'OpenSpotterVizPanel', 'CloseSpotterVizPanel', 'InitSpotterVizConversation', 'SpotterVizSendUserMessage',
  ],
}

/** Only keep events the installed SDK actually exposes, so triggers never no-op. */
export function allowedHostEvents(type: EmbedType): string[] {
  return EMBED_HOST_EVENTS[type].filter((k) => k in HostEvent)
}

/* ----------------------------------------------------------------------------
 * Reverse map: EmbedEvent runtime value (e.g. "init") -> member name ("Init").
 * `embed.on(EmbedEvent.ALL)` delivers payload.type as the *value*, so we map it
 * back to a readable key for display + categorisation.
 * -------------------------------------------------------------------------- */
export const EMBED_VALUE_TO_KEY: Record<string, string> = Object.entries(EmbedEvent).reduce(
  (acc, [key, value]) => {
    if (typeof value === 'string') acc[value] = key
    return acc
  },
  {} as Record<string, string>,
)

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

export function categoryOf(name: string): keyof typeof CATS {
  const n = name.toLowerCase()
  const has = (...a: string[]) => a.some((s) => n.includes(s))
  if (has('error', 'alert', 'failure', 'vizerror')) return 'error'
  if (has('auth', 'login', 'logout', 'cookie', 'saml', 'sso', 'idlesession', 'session', 'refreshauthtoken', 'orgswitch')) return 'auth'
  if (has('spotter', 'sage', 'prompt', 'coaching', 'datamodelinstructions', 'conversation')) return 'spotter'
  if (has('download', 'export', 'tml', 'share', 'pin', 'schedul', 'subscrib', 'makeacopy', 'favorite', 'monitor', 'spotiq', 'present', 'explore', 'rename', 'insert', 'sync', 'publish', 'save', 'edit', 'delete', 'remove', 'cancel', 'highlight', 'createliveboard', 'createworksheet', 'createmodel', 'createconnection', 'updateconnection', 'saveasview', 'copyaedit', 'copylink', 'copytoclipboard', 'answerchartswitcher', 'personalis', 'personaliz', 'liveboard')) return 'action'
  if (has('reload', 'init', 'load', 'render', 'height', 'route', 'listener', 'iframecenter', 'visibleembed', 'pagecontext', 'browsercache', 'navigate', 'tab')) return 'render'
  if (has('click', 'drill', 'filter', 'crossfilter', 'param', 'query', 'column', 'datasource', 'dialog', 'getdataclick')) return 'interaction'
  if (has('data', 'customaction', 'intercept', 'transform', 'underlying', 'clearinfocache', 'infosuccess', 'answersession', 'uipassthrough', 'iframeurl')) return 'data'
  return 'system'
}

export function colorOf(name: string): string {
  return CATS[categoryOf(name)].color
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
