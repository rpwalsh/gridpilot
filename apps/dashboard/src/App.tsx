import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import PortfolioOverview from './pages/PortfolioOverview'
import SiteEvaluation from './pages/SiteEvaluation'
import GenerationForecast from './pages/GenerationForecast'
import AssetHealth from './pages/AssetHealth'
import BatteryDispatch from './pages/BatteryDispatch'
import Recommendations from './pages/Recommendations'
import AuditTrail from './pages/AuditTrail'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/portfolio" replace />} />
          <Route path="/portfolio" element={<PortfolioOverview />} />
          <Route path="/evaluate" element={<SiteEvaluation />} />
          <Route path="/forecast" element={<GenerationForecast />} />
          <Route path="/health" element={<AssetHealth />} />
          <Route path="/dispatch" element={<BatteryDispatch />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/audit" element={<AuditTrail />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
