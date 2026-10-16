import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Menu, X, ShieldCheck } from 'lucide-react';
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

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      {/* Mobile topbar */}
      <div className="mobile-topbar" role="banner">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-nav"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="mobile-topbar-brand">
          <div className="logo-icon" aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7 }}>
            <ShieldCheck size={16} />
          </div>
          <h1>CyberShield AI</h1>
        </div>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/scanner"       element={<PhishingScanner />} />
        <Route path="/history"       element={<ScanHistory />} />
        <Route path="/threat-intel"  element={<ThreatIntelPage />} />
        <Route path="/model-health"  element={<ModelHealthPage />} />
        <Route path="/deepfake"      element={<DeepfakePage />} />
        <Route path="/scam-analysis" element={<ScamAnalysisPage />} />
        <Route path="/about"         element={<AboutPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
