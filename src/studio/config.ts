/**
 * Content IDs for each embed type. These point at real objects on the cluster.
 * Override via .env without touching code:
 *   VITE_TS_LIVEBOARD_ID, VITE_TS_DATASOURCE_ID, VITE_TS_WORKSHEET_ID
 *
 * AppEmbed needs no ID (it embeds the whole app). The worksheet GUID below is the
 * one already used by the original Spotter page and doubles as the Search data source.
 */
const DEFAULT_WORKSHEET = 'cd252e5c-b552-49a8-821d-3eadaa049cca'

export const embedConfig = {
  host: import.meta.env.VITE_THOUGHTSPOT_HOST ?? '',
  liveboardId: import.meta.env.VITE_TS_LIVEBOARD_ID ?? '',
  dataSourceId: import.meta.env.VITE_TS_DATASOURCE_ID ?? DEFAULT_WORKSHEET,
  worksheetId: import.meta.env.VITE_TS_WORKSHEET_ID ?? DEFAULT_WORKSHEET,
}
