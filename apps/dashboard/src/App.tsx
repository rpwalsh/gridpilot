import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import PortfolioOverview from './pages/PortfolioOverview'
import SiteEvaluation from './pages/SiteEvaluation'
import GenerationForecast from './pages/GenerationForecast'
import AssetHealth from './pages/AssetHealth'
import BatteryDispatch from './pages/BatteryDispatch'
import AuditTrail from './pages/AuditTrail'
import TelemetryDashboard from './pages/TelemetryDashboard'
import ProviderStatus from './pages/ProviderStatus'
import Proofs from './pages/Proofs'
import PipelineState from './pages/PipelineState'

export default function App() {
  return (
    <BrowserRouter>
      <div className="gp-layout">
        <NavBar />
        <main className="gp-main">
          <Routes>
            <Route path="/" element={<Navigate to="/portfolio" replace />} />
            <Route path="/portfolio" element={<PortfolioOverview />} />
            <Route path="/evaluate" element={<SiteEvaluation />} />
            <Route path="/forecast" element={<GenerationForecast />} />
            <Route path="/health" element={<AssetHealth />} />
            <Route path="/dispatch" element={<BatteryDispatch />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/telemetry" element={<TelemetryDashboard />} />
            <Route path="/providers" element={<ProviderStatus />} />
            <Route path="/proofs"    element={<Proofs />} />
            <Route path="/pipeline"  element={<PipelineState />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

