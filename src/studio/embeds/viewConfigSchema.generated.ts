/* eslint-disable */
/**
 * GENERATED — do not edit by hand.
 *
 * Every prop of every embed's `ViewConfig`, read out of
 * @thoughtspot/visual-embed-sdk 1.50.1's type definitions, with the SDK enum
 * backing it. Used by the config panel's Code tab to print enum values by name, and by
 * `sdkTypes.ts` to type the view configs — the SDK is not a dependency of this app, so
 * these names are the only compile-time record of its surface.
 * Props are matched by name only, so this stays useful when a different SDK version
 * is loaded — a prop it does not list is passed through untouched.
 *
 * Regenerate with: npm run gen:embed-schema
 */
import type { EmbedType } from '../constants'

/** How a prop's value is shaped, which is what deciding how to print it needs. */
export type PropKind = 'boolean' | 'string' | 'number' | 'select' | 'stringList' | 'enumList' | 'json'

export interface PropSpec {
  name: string
  kind: PropKind
  /** SDK enum whose members this prop's value comes from, resolved at runtime. */
  enumName?: string
}

/**
 * The versions these artifacts were generated from, pinned in
 * `scripts/sdk-versions.json`. Nothing is bundled: this is the version the app falls
 * back to from the CDN when npm's latest cannot be resolved or will not load.
 */
export const SNAPSHOT_EMBED_SDK_VERSION = '1.50.1'
export const SNAPSHOT_REST_SDK_VERSION = '2.25.0'

export const VIEW_CONFIG_TYPE_NAME: Record<EmbedType, string> = {
  "app": "AppViewConfig",
  "liveboard": "LiveboardViewConfig",
  "search": "SearchViewConfig",
  "spotter": "SpotterEmbedViewConfig"
}

export const VIEW_CONFIG_SCHEMA: Record<EmbedType, PropSpec[]> = {
  "app": [
    {
      "name": "additionalFlags",
      "kind": "json"
    },
    {
      "name": "collapseSearchBar",
      "kind": "boolean"
    },
    {
      "name": "collapseSearchBarInitially",
      "kind": "boolean"
    },
    {
      "name": "contextMenuTrigger",
      "kind": "select",
      "enumName": "ContextMenuTriggerOptions"
    },
    {
      "name": "coverAndFilterOptionInPDF",
      "kind": "boolean"
    },
    {
      "name": "customActions",
      "kind": "json"
    },
    {
      "name": "customizations",
      "kind": "json"
    },
    {
      "name": "dataPanelCustomGroupsAccordionInitialState",
      "kind": "select",
      "enumName": "DataPanelCustomColumnGroupsAccordionState"
    },
    {
      "name": "dataPanelV2",
      "kind": "boolean"
    },
    {
      "name": "defaultQueryMode",
      "kind": "select",
      "enumName": "SpotterQueryMode"
    },
    {
      "name": "disabledActionReason",
      "kind": "string"
    },
    {
      "name": "disabledActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "disableProfileAndHelp",
      "kind": "boolean"
    },
    {
      "name": "disableRedirectionLinksInNewTab",
      "kind": "boolean"
    },
    {
      "name": "discoveryExperience",
      "kind": "json"
    },
    {
      "name": "doNotTrackPreRenderSize",
      "kind": "boolean"
    },
    {
      "name": "embedComponentType",
      "kind": "string"
    },
    {
      "name": "enable2ColumnLayout",
      "kind": "boolean"
    },
    {
      "name": "enableAskSage",
      "kind": "boolean"
    },
    {
      "name": "enableCustomColumnGroups",
      "kind": "boolean"
    },
    {
      "name": "enableHomepageAnnouncement",
      "kind": "boolean"
    },
    {
      "name": "enableLinkOverridesV2",
      "kind": "boolean"
    },
    {
      "name": "enableLiveboardDataCache",
      "kind": "boolean"
    },
    {
      "name": "enablePastConversationsSidebar",
      "kind": "boolean"
    },
    {
      "name": "enablePendoHelp",
      "kind": "boolean"
    },
    {
      "name": "enableScrollableContainerLazyLoading",
      "kind": "boolean"
    },
    {
      "name": "enableSearchAssist",
      "kind": "boolean"
    },
    {
      "name": "enableStopAnswerGenerationEmbed",
      "kind": "boolean"
    },
    {
      "name": "enableV2Shell_experimental",
      "kind": "boolean"
    },
    {
      "name": "excludeRuntimeFiltersfromURL",
      "kind": "boolean"
    },
    {
      "name": "excludeRuntimeParametersfromURL",
      "kind": "boolean"
    },
    {
      "name": "exposeTranslationIDs",
      "kind": "boolean"
    },
    {
      "name": "frameParams",
      "kind": "json"
    },
    {
      "name": "fullHeight",
      "kind": "boolean"
    },
    {
      "name": "hiddenActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "hiddenHomeLeftNavItems",
      "kind": "enumList",
      "enumName": "HomeLeftNavItem"
    },
    {
      "name": "hiddenHomepageModules",
      "kind": "enumList",
      "enumName": "HomepageModule"
    },
    {
      "name": "hiddenListColumns",
      "kind": "enumList",
      "enumName": "ListPageColumns"
    },
    {
      "name": "hideApplicationSwitcher",
      "kind": "boolean"
    },
    {
      "name": "hideHamburger",
      "kind": "boolean"
    },
    {
      "name": "hideHomepageLeftNav",
      "kind": "boolean"
    },
    {
      "name": "hideIrrelevantChipsInLiveboardTabs",
      "kind": "boolean"
    },
    {
      "name": "hideLiveboardHeader",
      "kind": "boolean"
    },
    {
      "name": "hideNotification",
      "kind": "boolean"
    },
    {
      "name": "hideObjects",
      "kind": "stringList"
    },
    {
      "name": "hideObjectSearch",
      "kind": "boolean"
    },
    {
      "name": "hideOrgSwitcher",
      "kind": "boolean"
    },
    {
      "name": "hideTagFilterChips",
      "kind": "boolean"
    },
    {
      "name": "homePageSearchBarMode",
      "kind": "select",
      "enumName": "HomePageSearchBarMode"
    },
    {
      "name": "insertInToSlide",
      "kind": "boolean"
    },
    {
      "name": "isCentralizedLiveboardFilterUXEnabled",
      "kind": "boolean"
    },
    {
      "name": "isContinuousLiveboardPDFEnabled",
      "kind": "boolean"
    },
    {
      "name": "isEnhancedFilterInteractivityEnabled",
      "kind": "boolean"
    },
    {
      "name": "isGranularXLSXCSVSchedulesEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLinkParametersEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardCompactHeaderEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardHeaderSticky",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardMasterpiecesEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardStylingAndGroupingEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardXLSXCSVDownloadEnabled",
      "kind": "boolean"
    },
    {
      "name": "isPNGInScheduledEmailsEnabled",
      "kind": "boolean"
    },
    {
      "name": "isScopedLiveboardFilteringEnabled",
      "kind": "boolean"
    },
    {
      "name": "isThisPeriodInDateFiltersEnabled",
      "kind": "boolean"
    },
    {
      "name": "isUnifiedSearchExperienceEnabled",
      "kind": "boolean"
    },
    {
      "name": "layoutConfig",
      "kind": "json"
    },
    {
      "name": "lazyLoadingForFullHeight",
      "kind": "boolean"
    },
    {
      "name": "lazyLoadingMargin",
      "kind": "string"
    },
    {
      "name": "linkOverride",
      "kind": "boolean"
    },
    {
      "name": "liveboardV2",
      "kind": "boolean"
    },
    {
      "name": "locale",
      "kind": "string"
    },
    {
      "name": "minimumHeight",
      "kind": "number"
    },
    {
      "name": "modularHomeExperience",
      "kind": "boolean"
    },
    {
      "name": "newChartsLibrary",
      "kind": "boolean"
    },
    {
      "name": "newConnectionsExperience",
      "kind": "boolean"
    },
    {
      "name": "overrideHistoryState",
      "kind": "boolean"
    },
    {
      "name": "overrideOrgId",
      "kind": "number"
    },
    {
      "name": "pageId",
      "kind": "select",
      "enumName": "Page"
    },
    {
      "name": "path",
      "kind": "string"
    },
    {
      "name": "preRenderId",
      "kind": "string"
    },
    {
      "name": "primaryAction",
      "kind": "string"
    },
    {
      "name": "refreshAuthTokenOnNearExpiry",
      "kind": "boolean"
    },
    {
      "name": "reorderedHomepageModules",
      "kind": "enumList",
      "enumName": "HomepageModule"
    },
    {
      "name": "runtimeFilters",
      "kind": "json"
    },
    {
      "name": "runtimeParameters",
      "kind": "json"
    },
    {
      "name": "shouldBypassPayloadValidation",
      "kind": "boolean"
    },
    {
      "name": "showAlerts",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardDescription",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardReverifyBanner",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardTitle",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardVerifiedBadge",
      "kind": "boolean"
    },
    {
      "name": "showMaskedFilterChip",
      "kind": "boolean"
    },
    {
      "name": "showPrimaryNavbar",
      "kind": "boolean"
    },
    {
      "name": "showSpotterRadiance",
      "kind": "boolean"
    },
    {
      "name": "spotterChatConfig",
      "kind": "json"
    },
    {
      "name": "spotterDataSources",
      "kind": "stringList"
    },
    {
      "name": "spotterShareConversationConfig",
      "kind": "json"
    },
    {
      "name": "spotterSidebarConfig",
      "kind": "json"
    },
    {
      "name": "spotterViz",
      "kind": "json"
    },
    {
      "name": "styleSheet__unstable",
      "kind": "string"
    },
    {
      "name": "tag",
      "kind": "string"
    },
    {
      "name": "theme",
      "kind": "string"
    },
    {
      "name": "updatedSpotterChatPrompt",
      "kind": "boolean"
    },
    {
      "name": "updatedSpotterExperience",
      "kind": "boolean"
    },
    {
      "name": "useHostEventsV2",
      "kind": "boolean"
    },
    {
      "name": "usePrerenderedIfAvailable",
      "kind": "boolean"
    },
    {
      "name": "visibleActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "visualOverrides",
      "kind": "json"
    }
  ],
  "liveboard": [
    {
      "name": "activeTabId",
      "kind": "string"
    },
    {
      "name": "additionalFlags",
      "kind": "json"
    },
    {
      "name": "coverAndFilterOptionInPDF",
      "kind": "boolean"
    },
    {
      "name": "customActions",
      "kind": "json"
    },
    {
      "name": "customizations",
      "kind": "json"
    },
    {
      "name": "dataSourceId",
      "kind": "string"
    },
    {
      "name": "defaultHeight",
      "kind": "number"
    },
    {
      "name": "disabledActionReason",
      "kind": "string"
    },
    {
      "name": "disabledActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "disableRedirectionLinksInNewTab",
      "kind": "boolean"
    },
    {
      "name": "doNotTrackPreRenderSize",
      "kind": "boolean"
    },
    {
      "name": "embedComponentType",
      "kind": "string"
    },
    {
      "name": "enable2ColumnLayout",
      "kind": "boolean"
    },
    {
      "name": "enableAskSage",
      "kind": "boolean"
    },
    {
      "name": "enableLinkOverridesV2",
      "kind": "boolean"
    },
    {
      "name": "enableLiveboardDataCache",
      "kind": "boolean"
    },
    {
      "name": "enableScrollableContainerLazyLoading",
      "kind": "boolean"
    },
    {
      "name": "enableStopAnswerGenerationEmbed",
      "kind": "boolean"
    },
    {
      "name": "enableV2Shell_experimental",
      "kind": "boolean"
    },
    {
      "name": "enableVizTransformations",
      "kind": "boolean"
    },
    {
      "name": "exposeTranslationIDs",
      "kind": "boolean"
    },
    {
      "name": "frameParams",
      "kind": "json"
    },
    {
      "name": "fullHeight",
      "kind": "boolean"
    },
    {
      "name": "hiddenActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "hiddenTabs",
      "kind": "stringList"
    },
    {
      "name": "hideIrrelevantChipsInLiveboardTabs",
      "kind": "boolean"
    },
    {
      "name": "hideLiveboardHeader",
      "kind": "boolean"
    },
    {
      "name": "hideTabPanel",
      "kind": "boolean"
    },
    {
      "name": "insertInToSlide",
      "kind": "boolean"
    },
    {
      "name": "isCentralizedLiveboardFilterUXEnabled",
      "kind": "boolean"
    },
    {
      "name": "isContinuousLiveboardPDFEnabled",
      "kind": "boolean"
    },
    {
      "name": "isEnhancedFilterInteractivityEnabled",
      "kind": "boolean"
    },
    {
      "name": "isForceRedirect",
      "kind": "boolean"
    },
    {
      "name": "isGranularXLSXCSVSchedulesEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLinkParametersEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardCompactHeaderEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardHeaderSticky",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardMasterpiecesEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardStylingAndGroupingEnabled",
      "kind": "boolean"
    },
    {
      "name": "isLiveboardXLSXCSVDownloadEnabled",
      "kind": "boolean"
    },
    {
      "name": "isPNGInScheduledEmailsEnabled",
      "kind": "boolean"
    },
    {
      "name": "isScopedLiveboardFilteringEnabled",
      "kind": "boolean"
    },
    {
      "name": "layoutConfig",
      "kind": "json"
    },
    {
      "name": "lazyLoadingForFullHeight",
      "kind": "boolean"
    },
    {
      "name": "lazyLoadingMargin",
      "kind": "string"
    },
    {
      "name": "linkOverride",
      "kind": "boolean"
    },
    {
      "name": "liveboardId",
      "kind": "string"
    },
    {
      "name": "liveboardV2",
      "kind": "boolean"
    },
    {
      "name": "locale",
      "kind": "string"
    },
    {
      "name": "minimumHeight",
      "kind": "number"
    },
    {
      "name": "newChartsLibrary",
      "kind": "boolean"
    },
    {
      "name": "oAuthPollingInterval",
      "kind": "number"
    },
    {
      "name": "overrideHistoryState",
      "kind": "boolean"
    },
    {
      "name": "overrideOrgId",
      "kind": "number"
    },
    {
      "name": "personalizedViewId",
      "kind": "string"
    },
    {
      "name": "pinboardId",
      "kind": "string"
    },
    {
      "name": "preRenderId",
      "kind": "string"
    },
    {
      "name": "preventLiveboardFilterRemoval",
      "kind": "boolean"
    },
    {
      "name": "preventPinboardFilterRemoval",
      "kind": "boolean"
    },
    {
      "name": "primaryAction",
      "kind": "string"
    },
    {
      "name": "refreshAuthTokenOnNearExpiry",
      "kind": "boolean"
    },
    {
      "name": "shouldBypassPayloadValidation",
      "kind": "boolean"
    },
    {
      "name": "showAlerts",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardDescription",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardReverifyBanner",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardTitle",
      "kind": "boolean"
    },
    {
      "name": "showLiveboardVerifiedBadge",
      "kind": "boolean"
    },
    {
      "name": "showMaskedFilterChip",
      "kind": "boolean"
    },
    {
      "name": "showPreviewLoader",
      "kind": "boolean"
    },
    {
      "name": "showSpotterLimitations",
      "kind": "boolean"
    },
    {
      "name": "showSpotterRadiance",
      "kind": "boolean"
    },
    {
      "name": "spotterChatConfig",
      "kind": "json"
    },
    {
      "name": "spotterViz",
      "kind": "json"
    },
    {
      "name": "styleSheet__unstable",
      "kind": "string"
    },
    {
      "name": "theme",
      "kind": "string"
    },
    {
      "name": "updatedSpotterChatPrompt",
      "kind": "boolean"
    },
    {
      "name": "updatedSpotterExperience",
      "kind": "boolean"
    },
    {
      "name": "useHostEventsV2",
      "kind": "boolean"
    },
    {
      "name": "usePrerenderedIfAvailable",
      "kind": "boolean"
    },
    {
      "name": "visibleActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "visibleTabs",
      "kind": "stringList"
    },
    {
      "name": "visibleVizs",
      "kind": "stringList"
    },
    {
      "name": "vizId",
      "kind": "string"
    }
  ],
  "search": [
    {
      "name": "additionalFlags",
      "kind": "json"
    },
    {
      "name": "answerId",
      "kind": "string"
    },
    {
      "name": "collapseDataPanel",
      "kind": "boolean"
    },
    {
      "name": "collapseDataSources",
      "kind": "boolean"
    },
    {
      "name": "collapseSearchBar",
      "kind": "boolean"
    },
    {
      "name": "collapseSearchBarInitially",
      "kind": "boolean"
    },
    {
      "name": "contextMenuTrigger",
      "kind": "select",
      "enumName": "ContextMenuTriggerOptions"
    },
    {
      "name": "customActions",
      "kind": "json"
    },
    {
      "name": "customizations",
      "kind": "json"
    },
    {
      "name": "dataPanelCustomGroupsAccordionInitialState",
      "kind": "select",
      "enumName": "DataPanelCustomColumnGroupsAccordionState"
    },
    {
      "name": "dataPanelV2",
      "kind": "boolean"
    },
    {
      "name": "dataSource",
      "kind": "string"
    },
    {
      "name": "dataSources",
      "kind": "stringList"
    },
    {
      "name": "disabledActionReason",
      "kind": "string"
    },
    {
      "name": "disabledActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "disableRedirectionLinksInNewTab",
      "kind": "boolean"
    },
    {
      "name": "doNotTrackPreRenderSize",
      "kind": "boolean"
    },
    {
      "name": "embedComponentType",
      "kind": "string"
    },
    {
      "name": "enableCustomColumnGroups",
      "kind": "boolean"
    },
    {
      "name": "enableLinkOverridesV2",
      "kind": "boolean"
    },
    {
      "name": "enableSearchAssist",
      "kind": "boolean"
    },
    {
      "name": "enableV2Shell_experimental",
      "kind": "boolean"
    },
    {
      "name": "excludeRuntimeFiltersfromURL",
      "kind": "boolean"
    },
    {
      "name": "excludeRuntimeParametersfromURL",
      "kind": "boolean"
    },
    {
      "name": "excludeSearchTokenStringFromURL",
      "kind": "boolean"
    },
    {
      "name": "exposeTranslationIDs",
      "kind": "boolean"
    },
    {
      "name": "focusSearchBarOnRender",
      "kind": "boolean"
    },
    {
      "name": "forceTable",
      "kind": "boolean"
    },
    {
      "name": "frameParams",
      "kind": "json"
    },
    {
      "name": "hiddenActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "hideDataSources",
      "kind": "boolean"
    },
    {
      "name": "hideResults",
      "kind": "boolean"
    },
    {
      "name": "hideSearchBar",
      "kind": "boolean"
    },
    {
      "name": "insertInToSlide",
      "kind": "boolean"
    },
    {
      "name": "isThisPeriodInDateFiltersEnabled",
      "kind": "boolean"
    },
    {
      "name": "layoutConfig",
      "kind": "json"
    },
    {
      "name": "linkOverride",
      "kind": "boolean"
    },
    {
      "name": "locale",
      "kind": "string"
    },
    {
      "name": "newChartsLibrary",
      "kind": "boolean"
    },
    {
      "name": "overrideHistoryState",
      "kind": "boolean"
    },
    {
      "name": "overrideOrgId",
      "kind": "number"
    },
    {
      "name": "preRenderId",
      "kind": "string"
    },
    {
      "name": "refreshAuthTokenOnNearExpiry",
      "kind": "boolean"
    },
    {
      "name": "runtimeFilters",
      "kind": "json"
    },
    {
      "name": "runtimeParameters",
      "kind": "json"
    },
    {
      "name": "searchOptions",
      "kind": "json"
    },
    {
      "name": "searchQuery",
      "kind": "string"
    },
    {
      "name": "shouldBypassPayloadValidation",
      "kind": "boolean"
    },
    {
      "name": "showAlerts",
      "kind": "boolean"
    },
    {
      "name": "styleSheet__unstable",
      "kind": "string"
    },
    {
      "name": "theme",
      "kind": "string"
    },
    {
      "name": "useHostEventsV2",
      "kind": "boolean"
    },
    {
      "name": "useLastSelectedSources",
      "kind": "boolean"
    },
    {
      "name": "usePrerenderedIfAvailable",
      "kind": "boolean"
    },
    {
      "name": "visibleActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "visualOverrides",
      "kind": "json"
    }
  ],
  "spotter": [
    {
      "name": "additionalFlags",
      "kind": "json"
    },
    {
      "name": "customActions",
      "kind": "json"
    },
    {
      "name": "customizations",
      "kind": "json"
    },
    {
      "name": "dataPanelV2",
      "kind": "boolean"
    },
    {
      "name": "dataSources",
      "kind": "stringList"
    },
    {
      "name": "defaultQueryMode",
      "kind": "select",
      "enumName": "SpotterQueryMode"
    },
    {
      "name": "disabledActionReason",
      "kind": "string"
    },
    {
      "name": "disabledActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "disableRedirectionLinksInNewTab",
      "kind": "boolean"
    },
    {
      "name": "disableSourceSelection",
      "kind": "boolean"
    },
    {
      "name": "doNotTrackPreRenderSize",
      "kind": "boolean"
    },
    {
      "name": "embedComponentType",
      "kind": "string"
    },
    {
      "name": "enableLinkOverridesV2",
      "kind": "boolean"
    },
    {
      "name": "enablePastConversationsSidebar",
      "kind": "boolean"
    },
    {
      "name": "enableStopAnswerGenerationEmbed",
      "kind": "boolean"
    },
    {
      "name": "enableV2Shell_experimental",
      "kind": "boolean"
    },
    {
      "name": "excludeRuntimeFiltersfromURL",
      "kind": "boolean"
    },
    {
      "name": "excludeRuntimeParametersfromURL",
      "kind": "boolean"
    },
    {
      "name": "exposeTranslationIDs",
      "kind": "boolean"
    },
    {
      "name": "frameParams",
      "kind": "json"
    },
    {
      "name": "hiddenActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "hideSampleQuestions",
      "kind": "boolean"
    },
    {
      "name": "hideSourceSelection",
      "kind": "boolean"
    },
    {
      "name": "insertInToSlide",
      "kind": "boolean"
    },
    {
      "name": "layoutConfig",
      "kind": "json"
    },
    {
      "name": "linkOverride",
      "kind": "boolean"
    },
    {
      "name": "locale",
      "kind": "string"
    },
    {
      "name": "overrideHistoryState",
      "kind": "boolean"
    },
    {
      "name": "overrideOrgId",
      "kind": "number"
    },
    {
      "name": "preRenderId",
      "kind": "string"
    },
    {
      "name": "refreshAuthTokenOnNearExpiry",
      "kind": "boolean"
    },
    {
      "name": "runtimeFilters",
      "kind": "json"
    },
    {
      "name": "runtimeParameters",
      "kind": "json"
    },
    {
      "name": "searchOptions",
      "kind": "json"
    },
    {
      "name": "sharedConversationId",
      "kind": "string"
    },
    {
      "name": "shouldBypassPayloadValidation",
      "kind": "boolean"
    },
    {
      "name": "showAlerts",
      "kind": "boolean"
    },
    {
      "name": "showSpotterLimitations",
      "kind": "boolean"
    },
    {
      "name": "showSpotterRadiance",
      "kind": "boolean"
    },
    {
      "name": "spotterChatConfig",
      "kind": "json"
    },
    {
      "name": "spotterShareConversationConfig",
      "kind": "json"
    },
    {
      "name": "spotterSidebarConfig",
      "kind": "json"
    },
    {
      "name": "styleSheet__unstable",
      "kind": "string"
    },
    {
      "name": "theme",
      "kind": "string"
    },
    {
      "name": "updatedSpotterChatPrompt",
      "kind": "boolean"
    },
    {
      "name": "updatedSpotterExperience",
      "kind": "boolean"
    },
    {
      "name": "useHostEventsV2",
      "kind": "boolean"
    },
    {
      "name": "usePrerenderedIfAvailable",
      "kind": "boolean"
    },
    {
      "name": "visibleActions",
      "kind": "enumList",
      "enumName": "Action"
    },
    {
      "name": "worksheetId",
      "kind": "string"
    }
  ]
}

/** Every prop of `AppViewConfig` in 1.50.1. */
export type AppViewConfigProp =
  | 'additionalFlags'
  | 'collapseSearchBar'
  | 'collapseSearchBarInitially'
  | 'contextMenuTrigger'
  | 'coverAndFilterOptionInPDF'
  | 'customActions'
  | 'customizations'
  | 'dataPanelCustomGroupsAccordionInitialState'
  | 'dataPanelV2'
  | 'defaultQueryMode'
  | 'disabledActionReason'
  | 'disabledActions'
  | 'disableProfileAndHelp'
  | 'disableRedirectionLinksInNewTab'
  | 'discoveryExperience'
  | 'doNotTrackPreRenderSize'
  | 'embedComponentType'
  | 'enable2ColumnLayout'
  | 'enableAskSage'
  | 'enableCustomColumnGroups'
  | 'enableHomepageAnnouncement'
  | 'enableLinkOverridesV2'
  | 'enableLiveboardDataCache'
  | 'enablePastConversationsSidebar'
  | 'enablePendoHelp'
  | 'enableScrollableContainerLazyLoading'
  | 'enableSearchAssist'
  | 'enableStopAnswerGenerationEmbed'
  | 'enableV2Shell_experimental'
  | 'excludeRuntimeFiltersfromURL'
  | 'excludeRuntimeParametersfromURL'
  | 'exposeTranslationIDs'
  | 'frameParams'
  | 'fullHeight'
  | 'hiddenActions'
  | 'hiddenHomeLeftNavItems'
  | 'hiddenHomepageModules'
  | 'hiddenListColumns'
  | 'hideApplicationSwitcher'
  | 'hideHamburger'
  | 'hideHomepageLeftNav'
  | 'hideIrrelevantChipsInLiveboardTabs'
  | 'hideLiveboardHeader'
  | 'hideNotification'
  | 'hideObjects'
  | 'hideObjectSearch'
  | 'hideOrgSwitcher'
  | 'hideTagFilterChips'
  | 'homePageSearchBarMode'
  | 'insertInToSlide'
  | 'isCentralizedLiveboardFilterUXEnabled'
  | 'isContinuousLiveboardPDFEnabled'
  | 'isEnhancedFilterInteractivityEnabled'
  | 'isGranularXLSXCSVSchedulesEnabled'
  | 'isLinkParametersEnabled'
  | 'isLiveboardCompactHeaderEnabled'
  | 'isLiveboardHeaderSticky'
  | 'isLiveboardMasterpiecesEnabled'
  | 'isLiveboardStylingAndGroupingEnabled'
  | 'isLiveboardXLSXCSVDownloadEnabled'
  | 'isPNGInScheduledEmailsEnabled'
  | 'isScopedLiveboardFilteringEnabled'
  | 'isThisPeriodInDateFiltersEnabled'
  | 'isUnifiedSearchExperienceEnabled'
  | 'layoutConfig'
  | 'lazyLoadingForFullHeight'
  | 'lazyLoadingMargin'
  | 'linkOverride'
  | 'liveboardV2'
  | 'locale'
  | 'minimumHeight'
  | 'modularHomeExperience'
  | 'newChartsLibrary'
  | 'newConnectionsExperience'
  | 'overrideHistoryState'
  | 'overrideOrgId'
  | 'pageId'
  | 'path'
  | 'preRenderId'
  | 'primaryAction'
  | 'refreshAuthTokenOnNearExpiry'
  | 'reorderedHomepageModules'
  | 'runtimeFilters'
  | 'runtimeParameters'
  | 'shouldBypassPayloadValidation'
  | 'showAlerts'
  | 'showLiveboardDescription'
  | 'showLiveboardReverifyBanner'
  | 'showLiveboardTitle'
  | 'showLiveboardVerifiedBadge'
  | 'showMaskedFilterChip'
  | 'showPrimaryNavbar'
  | 'showSpotterRadiance'
  | 'spotterChatConfig'
  | 'spotterDataSources'
  | 'spotterShareConversationConfig'
  | 'spotterSidebarConfig'
  | 'spotterViz'
  | 'styleSheet__unstable'
  | 'tag'
  | 'theme'
  | 'updatedSpotterChatPrompt'
  | 'updatedSpotterExperience'
  | 'useHostEventsV2'
  | 'usePrerenderedIfAvailable'
  | 'visibleActions'
  | 'visualOverrides'

/** Every prop of `LiveboardViewConfig` in 1.50.1. */
export type LiveboardViewConfigProp =
  | 'activeTabId'
  | 'additionalFlags'
  | 'coverAndFilterOptionInPDF'
  | 'customActions'
  | 'customizations'
  | 'dataSourceId'
  | 'defaultHeight'
  | 'disabledActionReason'
  | 'disabledActions'
  | 'disableRedirectionLinksInNewTab'
  | 'doNotTrackPreRenderSize'
  | 'embedComponentType'
  | 'enable2ColumnLayout'
  | 'enableAskSage'
  | 'enableLinkOverridesV2'
  | 'enableLiveboardDataCache'
  | 'enableScrollableContainerLazyLoading'
  | 'enableStopAnswerGenerationEmbed'
  | 'enableV2Shell_experimental'
  | 'enableVizTransformations'
  | 'exposeTranslationIDs'
  | 'frameParams'
  | 'fullHeight'
  | 'hiddenActions'
  | 'hiddenTabs'
  | 'hideIrrelevantChipsInLiveboardTabs'
  | 'hideLiveboardHeader'
  | 'hideTabPanel'
  | 'insertInToSlide'
  | 'isCentralizedLiveboardFilterUXEnabled'
  | 'isContinuousLiveboardPDFEnabled'
  | 'isEnhancedFilterInteractivityEnabled'
  | 'isForceRedirect'
  | 'isGranularXLSXCSVSchedulesEnabled'
  | 'isLinkParametersEnabled'
  | 'isLiveboardCompactHeaderEnabled'
  | 'isLiveboardHeaderSticky'
  | 'isLiveboardMasterpiecesEnabled'
  | 'isLiveboardStylingAndGroupingEnabled'
  | 'isLiveboardXLSXCSVDownloadEnabled'
  | 'isPNGInScheduledEmailsEnabled'
  | 'isScopedLiveboardFilteringEnabled'
  | 'layoutConfig'
  | 'lazyLoadingForFullHeight'
  | 'lazyLoadingMargin'
  | 'linkOverride'
  | 'liveboardId'
  | 'liveboardV2'
  | 'locale'
  | 'minimumHeight'
  | 'newChartsLibrary'
  | 'oAuthPollingInterval'
  | 'overrideHistoryState'
  | 'overrideOrgId'
  | 'personalizedViewId'
  | 'pinboardId'
  | 'preRenderId'
  | 'preventLiveboardFilterRemoval'
  | 'preventPinboardFilterRemoval'
  | 'primaryAction'
  | 'refreshAuthTokenOnNearExpiry'
  | 'shouldBypassPayloadValidation'
  | 'showAlerts'
  | 'showLiveboardDescription'
  | 'showLiveboardReverifyBanner'
  | 'showLiveboardTitle'
  | 'showLiveboardVerifiedBadge'
  | 'showMaskedFilterChip'
  | 'showPreviewLoader'
  | 'showSpotterLimitations'
  | 'showSpotterRadiance'
  | 'spotterChatConfig'
  | 'spotterViz'
  | 'styleSheet__unstable'
  | 'theme'
  | 'updatedSpotterChatPrompt'
  | 'updatedSpotterExperience'
  | 'useHostEventsV2'
  | 'usePrerenderedIfAvailable'
  | 'visibleActions'
  | 'visibleTabs'
  | 'visibleVizs'
  | 'vizId'

/** Every prop of `SearchViewConfig` in 1.50.1. */
export type SearchViewConfigProp =
  | 'additionalFlags'
  | 'answerId'
  | 'collapseDataPanel'
  | 'collapseDataSources'
  | 'collapseSearchBar'
  | 'collapseSearchBarInitially'
  | 'contextMenuTrigger'
  | 'customActions'
  | 'customizations'
  | 'dataPanelCustomGroupsAccordionInitialState'
  | 'dataPanelV2'
  | 'dataSource'
  | 'dataSources'
  | 'disabledActionReason'
  | 'disabledActions'
  | 'disableRedirectionLinksInNewTab'
  | 'doNotTrackPreRenderSize'
  | 'embedComponentType'
  | 'enableCustomColumnGroups'
  | 'enableLinkOverridesV2'
  | 'enableSearchAssist'
  | 'enableV2Shell_experimental'
  | 'excludeRuntimeFiltersfromURL'
  | 'excludeRuntimeParametersfromURL'
  | 'excludeSearchTokenStringFromURL'
  | 'exposeTranslationIDs'
  | 'focusSearchBarOnRender'
  | 'forceTable'
  | 'frameParams'
  | 'hiddenActions'
  | 'hideDataSources'
  | 'hideResults'
  | 'hideSearchBar'
  | 'insertInToSlide'
  | 'isThisPeriodInDateFiltersEnabled'
  | 'layoutConfig'
  | 'linkOverride'
  | 'locale'
  | 'newChartsLibrary'
  | 'overrideHistoryState'
  | 'overrideOrgId'
  | 'preRenderId'
  | 'refreshAuthTokenOnNearExpiry'
  | 'runtimeFilters'
  | 'runtimeParameters'
  | 'searchOptions'
  | 'searchQuery'
  | 'shouldBypassPayloadValidation'
  | 'showAlerts'
  | 'styleSheet__unstable'
  | 'theme'
  | 'useHostEventsV2'
  | 'useLastSelectedSources'
  | 'usePrerenderedIfAvailable'
  | 'visibleActions'
  | 'visualOverrides'

/** Every prop of `SpotterEmbedViewConfig` in 1.50.1. */
export type SpotterEmbedViewConfigProp =
  | 'additionalFlags'
  | 'customActions'
  | 'customizations'
  | 'dataPanelV2'
  | 'dataSources'
  | 'defaultQueryMode'
  | 'disabledActionReason'
  | 'disabledActions'
  | 'disableRedirectionLinksInNewTab'
  | 'disableSourceSelection'
  | 'doNotTrackPreRenderSize'
  | 'embedComponentType'
  | 'enableLinkOverridesV2'
  | 'enablePastConversationsSidebar'
  | 'enableStopAnswerGenerationEmbed'
  | 'enableV2Shell_experimental'
  | 'excludeRuntimeFiltersfromURL'
  | 'excludeRuntimeParametersfromURL'
  | 'exposeTranslationIDs'
  | 'frameParams'
  | 'hiddenActions'
  | 'hideSampleQuestions'
  | 'hideSourceSelection'
  | 'insertInToSlide'
  | 'layoutConfig'
  | 'linkOverride'
  | 'locale'
  | 'overrideHistoryState'
  | 'overrideOrgId'
  | 'preRenderId'
  | 'refreshAuthTokenOnNearExpiry'
  | 'runtimeFilters'
  | 'runtimeParameters'
  | 'searchOptions'
  | 'sharedConversationId'
  | 'shouldBypassPayloadValidation'
  | 'showAlerts'
  | 'showSpotterLimitations'
  | 'showSpotterRadiance'
  | 'spotterChatConfig'
  | 'spotterShareConversationConfig'
  | 'spotterSidebarConfig'
  | 'styleSheet__unstable'
  | 'theme'
  | 'updatedSpotterChatPrompt'
  | 'updatedSpotterExperience'
  | 'useHostEventsV2'
  | 'usePrerenderedIfAvailable'
  | 'visibleActions'
  | 'worksheetId'
