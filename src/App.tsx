import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedLayout from './components/ProtectedLayout'
import Home from './pages/Home'
import FullApp from './pages/FullApp'
import Spotter from './pages/Spotter'
import Login from './pages/Login'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Home />} />
            <Route path="/full-app" element={<FullApp />} />
            <Route path="/spotter" element={<Spotter />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
