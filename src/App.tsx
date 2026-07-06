import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Cameras } from './pages/Cameras';
import { Analytics } from './pages/Analytics';
import { Violations } from './pages/Violations';
import { Settings } from './pages/Settings';
import { MapDashboard } from './pages/MapDashboard';
import { AlertCenter } from './pages/AlertCenter';
import { DigitalTwin } from './pages/DigitalTwin';
import { ApiDocs } from './pages/ApiDocs';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="twin" element={<DigitalTwin />} />
        <Route path="map" element={<MapDashboard />} />
        <Route path="cameras" element={<Cameras />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="alerts" element={<AlertCenter />} />
        <Route path="violations" element={<Violations />} />
        <Route path="api" element={<ApiDocs />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
