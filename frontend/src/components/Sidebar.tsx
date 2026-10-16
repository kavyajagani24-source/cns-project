import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Video, Phone, History,
  Database, Cpu, Info, ShieldCheck,
} from 'lucide-react';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scanner',      icon: Shield,          label: 'Phishing Scanner' },
  { to: '/deepfake',     icon: Video,           label: 'Deepfake Detection' },
  { to: '/history',      icon: History,         label: 'Scan History' },
  { to: '/threat-intel', icon: Database,        label: 'Threat Intelligence' },
  { to: '/model-health', icon: Cpu,             label: 'Model Health' },
  { to: '/scam-analysis',icon: Phone,           label: 'Scam Analysis' },
  { to: '/about',        icon: Info,            label: 'About & Methods' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${open ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </div>
            <div className="logo-text">
              <h1>CyberShield AI</h1>
              <p>Security Analysis Platform</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              aria-current={undefined}
              onClick={() => { if (open) onClose(); }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                  {isActive && <span className="sr-only">(current page)</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-dot" aria-hidden="true" />
            <span>System online · v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
