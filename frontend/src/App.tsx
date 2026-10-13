import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PhishingScanner from './pages/PhishingScanner';
import ScanHistory from './pages/ScanHistory';
import ThreatIntelPage from './pages/ThreatIntelPage';
import ModelHealthPage from './pages/ModelHealthPage';
import DeepfakePage from './pages/DeepfakePage';
import ScamAnalysisPage from './pages/ScamAnalysisPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scanner" element={<PhishingScanner />} />
          <Route path="/history" element={<ScanHistory />} />
          <Route path="/threat-intel" element={<ThreatIntelPage />} />
          <Route path="/model-health" element={<ModelHealthPage />} />
          <Route path="/deepfake" element={<DeepfakePage />} />
          <Route path="/scam-analysis" element={<ScamAnalysisPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
