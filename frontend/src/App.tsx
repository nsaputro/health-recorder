import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import BodyMetricsPage from './pages/BodyMetrics'
import LabResultsPage from './pages/LabResults'
import VitalSignsPage from './pages/VitalSigns'
import SettingsPage from './pages/Settings'
import ReferenceRangesPage from './pages/ReferenceRanges'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="body-metrics" element={<BodyMetricsPage />} />
          <Route path="lab-results" element={<LabResultsPage />} />
          <Route path="vital-signs" element={<VitalSignsPage />} />
          <Route path="ranges" element={<ReferenceRangesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
