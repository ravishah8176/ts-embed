import {
  AppEmbed,
  HomePage,
  HomePageSearchBarMode,
  PrimaryNavbarVersion,
} from '@thoughtspot/visual-embed-sdk'

/**
 * Full-application embed (AppEmbed).
 *
 * Edit the view config below to test changes — anything in `AppViewConfig`
 * is fair game. The Studio handles event wiring + rendering, so just return
 * the configured instance.
 */
export function createAppEmbed(container: HTMLDivElement): AppEmbed {
  return new AppEmbed(container, {
    frameParams: { width: '100%', height: '100%' },

    // ───────── customize from here ─────────
    // V3 discovery experience: sliding navbar + modular home page.
    discoveryExperience: {
      primaryNavbarVersion: PrimaryNavbarVersion.Sliding,
      homePage: HomePage.ModularWithStylingChanges,
    },
    isUnifiedSearchExperienceEnabled: false,
    homePageSearchBarMode: HomePageSearchBarMode.AI_ANSWER,
    spotterSidebarConfig: {
      enablePastConversationsSidebar: true,
      spotterSidebarTitle: 'TS Assistant',
    },
    updatedSpotterChatPrompt: true,
    // ───────────────────────────────────────
  })
}
