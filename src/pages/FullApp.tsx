import { AppEmbed, 
    EmbedEvent, // Main class to embed the full ThoughtSpot app
    PrimaryNavbarVersion, // Enum for V3 experience setting
    HomePage, // Enum for home page experience settings
    HomePageSearchBarMode} from '@thoughtspot/visual-embed-sdk'
import { useThoughtSpotEmbed } from '../hooks/useThoughtSpotEmbed'
import EmbedFrame from '../components/EmbedFrame'
import './EmbedPage.css'

export default function FullApp() {
  const { containerRef, status, errorMsg } = useThoughtSpotEmbed(
    (container) => {
      const embed = new AppEmbed(container, {
        frameParams: { width: '100%', height: '100%' },
        // Add the params from here to test your changes

        // Enable the V3 discovery experience, which includes the new sliding navbar and modular home page
        discoveryExperience: {
            primaryNavbarVersion: PrimaryNavbarVersion.Sliding, // Enable v3 experience
            homePage: HomePage.ModularWithStylingChanges // Enable v3 home page experience
        },
        // Set the home page search bar to show the Spotter / AI search bar
        isUnifiedSearchExperienceEnabled: false,
        homePageSearchBarMode: HomePageSearchBarMode.AI_ANSWER,
        spotterSidebarConfig: {
          enablePastConversationsSidebar: true,
          spotterSidebarTitle: "TS Assistant",
        },
        updatedSpotterChatPrompt: true,
      })
      embed.on(EmbedEvent.RouteChange, (payload) => {
        console.log('[FullApp] Route changed:', payload)
      })
      return embed
    },
  )

  return (
    <div className="embed-page">
      <EmbedFrame containerRef={containerRef} status={status} errorMsg={errorMsg} />
    </div>
  )
}
