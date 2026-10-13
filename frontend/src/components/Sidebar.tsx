import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Video, Phone, History,
  Database, Cpu, Settings, Info, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scanner', icon: Shield, label: 'Phishing Scanner' },
  { to: '/deepfake', icon: Video, label: 'Deepfake Detection' },
  { to: '/history', icon: History, label: 'Scan History' },
  { to: '/threat-intel', icon: Database, label: 'Threat Intelligence' },
  { to: '/model-health', icon: Cpu, label: 'Model Health' },
  { to: '/scam-analysis', icon: Phone, label: 'Scam Analysis', soon: 'Part 3' },
  { to: '/about', icon: Info, label: 'About & Methods' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🛡️</div>
          <div className="logo-text">
            <h1>CyberShield AI</h1>
            <p>Phishing Detection Platform</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label, soon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
            {soon && <span className="nav-badge soon">{soon}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-dot" />
          System online · v1.0.0
        </div>
      </div>
    </aside>
  );
}
