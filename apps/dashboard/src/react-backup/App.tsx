/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SourcesPage from './pages/SourcesPage'
import HistoryPage from './pages/HistoryPage'
import ReplayPage from './pages/ReplayPage'
import BandsPage from './pages/BandsPage'
import ChartsPage from './pages/ChartsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/sources" replace />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/bands" element={<BandsPage />} />
        <Route path="/charts" element={<ChartsPage />} />
        <Route path="*" element={<Navigate to="/sources" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

