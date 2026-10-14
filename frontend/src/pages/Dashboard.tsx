import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Shield, Database, Cpu, TrendingUp } from 'lucide-react';

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
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="main-content">
      <div className="page-body">
        <div className="alert alert-phishing" style={{ maxWidth: 560 }}>
          <span>⚠️</span>
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

        {/* Stat cards */}
        <div className="grid-4 mb-6">
          <StatCard label="Total Scans" value={s.total_scans} icon="🔍" color="var(--accent-blue)" />
          <StatCard label="Phishing Detected" value={s.phishing_count} icon="🚨" color="var(--risk-phishing)" />
          <StatCard label="Suspicious" value={s.suspicious_count} icon="⚠️" color="var(--risk-suspicious)" />
          <StatCard label="TI Matches" value={s.threat_intel_matches} icon="🎯" color="var(--accent-cyan)" />
        </div>

        <div className="grid-2 mb-6">
          {/* System Status */}
          <div className="card">
            <div className="section-title"><Cpu size={14} /> System Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <StatusRow label="ML Model" ok={s.model_available} detail={s.model_version ? `v${s.model_version}` : 'Not loaded'} />
              <StatusRow
                label="Threat Intelligence"
                ok={s.threat_intel_status === 'synced'}
                detail={s.threat_intel_entry_count ? `${s.threat_intel_entry_count.toLocaleString()} domains` : 'Offline fixture'}
              />
              <StatusRow label="Database" ok={true} detail="Connected" />
            </div>

            <div style={{ marginTop: 20 }}>
              <Link to="/scanner" className="btn btn-primary w-full">
                <Shield size={16} /> Start Scanning
              </Link>
            </div>
          </div>

          {/* Distribution */}
          <div className="card">
            <div className="section-title"><TrendingUp size={14} /> Risk Distribution</div>
            {s.total_scans === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <p>No scans yet. Run your first scan to see distribution.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <DistBar label="Safe" count={s.safe_count} total={s.total_scans} color="var(--risk-safe)" />
                <DistBar label="Suspicious" count={s.suspicious_count} total={s.total_scans} color="var(--risk-suspicious)" />
                <DistBar label="Phishing" count={s.phishing_count} total={s.total_scans} color="var(--risk-phishing)" />
                <DistBar label="Inconclusive" count={s.inconclusive_count} total={s.total_scans} color="var(--risk-inconclusive)" />
              </div>
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="card">
          <div className="section-title flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Database size={14} /> Recent Scans</span>
            <Link to="/history" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {s.recent_scans.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
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
                      <td><span className="mono truncate" style={{ maxWidth: 240, display: 'block' }}>{scan.normalized_hostname || '—'}</span></td>
                      <td><RiskBadge category={scan.risk_category} size="sm" /></td>
                      <td>{scan.threat_intel_matched ? '🎯 Yes' : <span className="text-muted">No</span>}</td>
                      <td>{scan.ml_score != null ? `${(scan.ml_score * 100).toFixed(0)}%` : <span className="text-muted">N/A</span>}</td>
                      <td className="text-muted text-sm">{scan.created_at ? new Date(scan.created_at).toLocaleString() : '—'}</td>
                      <td><Link to={`/scanner?id=${scan.scan_id}`} style={{ color: 'var(--accent-blue)', fontSize: 12 }}>View →</Link></td>
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

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
        </div>
        <span style={{ fontSize: 28, opacity: 0.6 }}>{icon}</span>
      </div>
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
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
        <span style={{ color }}>{count} ({pct}%)</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
