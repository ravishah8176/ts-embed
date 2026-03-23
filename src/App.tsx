import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { init, AuthType } from '@thoughtspot/visual-embed-sdk'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import FullApp from './pages/FullApp'
import Spotter from './pages/Spotter'
import './App.css'

init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST ?? '',
  authType: AuthType.None,
})

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route index element={<Home />} />
            <Route path="/full-app" element={<FullApp />} />
            <Route path="/spotter" element={<Spotter />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
