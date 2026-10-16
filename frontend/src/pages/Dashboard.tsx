import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Database, Cpu, TrendingUp,
  ScanSearch, AlertTriangle,
  Target, ArrowRight, Activity,
} from 'lucide-react';

import { getDashboardStats } from '../services/api';
import type { DashboardStats } from '../types/api';
import RiskBadge from '../components/RiskBadge';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Cannot connect to backend. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="main-content">
      <div className="page-header">
        <h2>Security Dashboard</h2>
        <p>Real-time threat detection metrics and system status</p>
      </div>
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="main-content">
      <div className="page-header">
        <h2>Security Dashboard</h2>
        <p>Real-time threat detection metrics and system status</p>
      </div>
      <div className="page-body">
        <div className="alert alert-phishing" style={{ maxWidth: 560 }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Backend unavailable</strong><br />
            <span style={{ fontSize: 13, opacity: 0.85 }}>{error}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const s = stats!;

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Security Dashboard</h2>
        <p>Real-time threat detection metrics and system status</p>
      </div>
      <div className="page-body">

        {/* KPI Cards */}
        <div className="grid-4 mb-6">
          <StatCard
            label="Total Scans"
            value={s.total_scans}
            icon={<ScanSearch size={20} />}
            iconBg="#EFF6FF"
            iconColor="#2563EB"
          />
          <StatCard
            label="Phishing Detected"
            value={s.phishing_count}
            icon={<AlertTriangle size={20} />}
            iconBg="#FEF2F2"
            iconColor="#B91C1C"
          />
          <StatCard
            label="Suspicious"
            value={s.suspicious_count}
            icon={<Shield size={20} />}
            iconBg="#FFFBEB"
            iconColor="#B45309"
          />
          <StatCard
            label="TI Matches"
            value={s.threat_intel_matches}
            icon={<Target size={20} />}
            iconBg="#F5F3FF"
            iconColor="#6D28D9"
          />
        </div>

        <div className="grid-2 mb-6">
          {/* System Status */}
          <div className="card">
            <div className="section-title"><Cpu size={13} /> System Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StatusRow
                label="ML Model"
                ok={s.model_available}
                detail={s.model_version ? `v${s.model_version}` : 'Not loaded'}
              />
              <StatusRow
                label="Threat Intelligence"
                ok={s.threat_intel_status === 'synced'}
                detail={s.threat_intel_entry_count
                  ? `${s.threat_intel_entry_count.toLocaleString()} domains`
                  : 'Offline fixture'}
              />
              <StatusRow label="Database" ok={true} detail="Connected" />
            </div>
            <div style={{ marginTop: 20 }}>
              <Link to="/scanner" className="btn btn-primary w-full">
                <Shield size={16} /> Start Scanning
              </Link>
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="card">
            <div className="section-title"><TrendingUp size={13} /> Risk Distribution</div>
            {s.total_scans === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-state-icon"><Activity size={24} /></div>
                <p>No scans yet. Run your first scan to see distribution.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <DistBar label="Safe"         count={s.safe_count}         total={s.total_scans} color="var(--risk-safe)" />
                <DistBar label="Suspicious"   count={s.suspicious_count}   total={s.total_scans} color="var(--risk-suspicious)" />
                <DistBar label="Phishing"     count={s.phishing_count}     total={s.total_scans} color="var(--risk-phishing)" />
                <DistBar label="Inconclusive" count={s.inconclusive_count} total={s.total_scans} color="var(--risk-inconclusive)" />
              </div>
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              <Database size={13} /> Recent Scans
            </div>
            <Link to="/history" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {s.recent_scans.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 0' }}>
              <div className="empty-state-icon"><ScanSearch size={22} /></div>
              <h3>No scans yet</h3>
              <p>Submit a URL to the <Link to="/scanner" style={{ color: 'var(--accent-blue)' }}>Phishing Scanner</Link> to get started.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hostname</th>
                    <th>Risk</th>
                    <th>TI Match</th>
                    <th>ML Score</th>
                    <th>Scanned</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {s.recent_scans.map(scan => (
                    <tr key={scan.scan_id}>
                      <td>
                        <span className="mono truncate" style={{ maxWidth: 220, display: 'block' }}>
                          {scan.normalized_hostname || '—'}
                        </span>
                      </td>
                      <td><RiskBadge category={scan.risk_category} size="sm" /></td>
                      <td>
                        {scan.threat_intel_matched
                          ? <span className="status-badge status-badge-error"><Target size={10} /> Match</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {scan.ml_score != null
                          ? <span className="mono">{(scan.ml_score * 100).toFixed(0)}%</span>
                          : <span className="text-muted">N/A</span>}
                      </td>
                      <td className="text-muted text-sm">
                        {scan.created_at ? new Date(scan.created_at).toLocaleString() : '—'}
                      </td>
                      <td>
                        <Link to={`/scanner?id=${scan.scan_id}`} className="btn btn-ghost btn-sm">
                          View <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, iconBg, iconColor,
}: {
  label: string; value: number; icon: React.ReactNode; iconBg: string; iconColor: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value.toLocaleString()}</div>
        </div>
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
      <div className={`status-dot ${ok ? '' : 'degraded'}`} />
      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-muted text-sm">{detail}</span>
    </div>
  );
}

function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
