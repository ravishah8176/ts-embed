import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './studio/Login'
import Studio from './studio/Studio'
import './studio/studio.css'

function Gate() {
  const { username, loading } = useAuth()
  if (loading) return <div className="route-loading">Loading…</div>
  return username ? <Studio /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
