import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import PortfolioOverview from './pages/PortfolioOverview'
import NotConnected from './pages/NotConnected'

export default function App() {
  return (
    <BrowserRouter>
      <div className="gp-layout">
        <NavBar />
        <main className="gp-main">
          <Routes>
            <Route path="/" element={<Navigate to="/portfolio" replace />} />
            <Route path="/portfolio" element={<PortfolioOverview />} />
            <Route path="*" element={<NotConnected />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

