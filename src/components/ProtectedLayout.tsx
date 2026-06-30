import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Navbar from './Navbar'

export default function ProtectedLayout() {
  const { username, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="route-loading">Loading…</div>
  }

  if (!username) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
