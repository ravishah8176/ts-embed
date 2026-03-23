import { NavLink } from 'react-router-dom'
import './Navbar.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/full-app', label: 'Full App' },
  { to: '/spotter', label: 'Spotter' },
]

export default function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">ThoughtSpot Embed</span>
      <ul className="navbar-links">
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
