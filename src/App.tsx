import { useEffect } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './studio/Login'
import Studio from './studio/Studio'
import './studio/global.scss'
import './App.scss'

function Gate() {
  const { signedIn, loading } = useAuth()

  // The app is routerless — views switch on auth state, not the URL. Once
  // signed in, drop any stale path (e.g. /login) so the bar reads "/".
  useEffect(() => {
    if (signedIn && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
  }, [signedIn])

  if (loading) return <div className="route-loading">Loading…</div>
  return signedIn ? <Studio /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
