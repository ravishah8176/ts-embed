import { Link } from 'react-router-dom'
import './Home.css'

const demos = [
  {
    to: '/full-app',
    title: 'Full App Embed',
    description:
      'Embeds the entire ThoughtSpot application inside your app using AppEmbed. Includes the primary nav, home page, and all ThoughtSpot features.',
    badge: 'AppEmbed',
  },
  {
    to: '/spotter',
    title: 'Spotter (AI Analytics)',
    description:
      'Embed the ThoughtSpot Spotter conversational AI interface backed by a specific worksheet/datasource.',
    badge: 'ConversationEmbed',
  },
]

export default function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1>ThoughtSpot Embed Demos</h1>
        <p>
          Explore how to embed ThoughtSpot analytics and AI capabilities inside a
          React application using the{' '}
          <code>@thoughtspot/visual-embed-sdk</code>.
        </p>
      </header>

      <div className="home-grid">
        {demos.map(({ to, title, description, badge }) => (
          <Link key={to} to={to} className="demo-card">
            <span className="demo-badge">{badge}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
