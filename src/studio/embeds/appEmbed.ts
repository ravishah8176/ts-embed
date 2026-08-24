import type { AppEmbed, AppViewConfig } from '../../thoughtspot/sdkTypes'
import { embedSdk } from '../../thoughtspot/sdkLoader'

/**
 * Full-application embed (AppEmbed).
 *
 * The config below is only what the Studio starts from. Every prop of
 * `AppViewConfig` is editable from the Embed config panel at runtime, so trying a
 * change needs no code edit and no redeploy — this file just decides what a fresh
 * browser, or a "Reset to defaults", begins with.
 *
 * It is a function rather than a constant because the enum values it references
 * belong to whichever SDK version the user loaded.
 */
export function appDefaults(): AppViewConfig {
  const { HomePage, HomePageSearchBarMode, PrimaryNavbarVersion } = embedSdk()
  return {
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
  }
}

export function createAppEmbed(container: HTMLDivElement, config: AppViewConfig): AppEmbed {
  return new (embedSdk().AppEmbed)(container, config)
}
