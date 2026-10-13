import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getThreatIntelHealth, triggerSync } from '../services/api';
import type { ThreatIntelHealthStatus } from '../types/api';

export default function ThreatIntelPage() {
  const [health, setHealth] = useState<ThreatIntelHealthStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => getThreatIntelHealth().then(setHealth).catch(e => setError(String(e)));

  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true); setSyncMsg(null); setError(null);
    try {
      const r = await triggerSync();
      setSyncMsg(r.message + (r.entry_count ? ` (${r.entry_count.toLocaleString()} domains)` : ''));
      load();
    } catch (e) {
      setError('Sync failed. Backend error.');
    } finally {
      setSyncing(false);
    }
  }

  const statusColor: Record<string, string> = {
    synced: 'var(--risk-safe)',
    syncing: 'var(--accent-blue)',
    failed: 'var(--risk-phishing)',
    never_synced: 'var(--text-muted)',
    stale: 'var(--risk-suspicious)',
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Threat Intelligence</h2>
        <p>HaGeZi TIF blocklist integration status and controls</p>
      </div>
      <div className="page-body">

        {error && <div className="alert alert-phishing mb-4">⚠️ {error}</div>}
        {syncMsg && <div className="alert alert-safe mb-4">✅ {syncMsg}</div>}

        <div className="grid-2">
          <div className="card">
            <div className="section-title">📋 List Status</div>
            {health ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
                <Row label="Source" value={health.source_name} />
                <Row label="Sync Status" value={health.sync_status.toUpperCase()} valueColor={statusColor[health.sync_status]} />
                <Row label="In-Memory Domains" value={health.in_memory_count?.toLocaleString() ?? '—'} />
                <Row label="List Entry Count" value={health.entry_count?.toLocaleString() ?? '—'} />
                <Row label="Last Sync" value={health.last_successful ? new Date(health.last_successful).toLocaleString() : 'Never'} />
                <Row label="Content Hash" value={health.content_hash ? health.content_hash.slice(0, 16) + '...' : '—'} mono />
                {health.error && <Row label="Error" value={health.error} valueColor="var(--risk-phishing)" />}
              </div>
            ) : (
              <div className="spinner" />
            )}
          </div>

          <div className="card">
            <div className="section-title">ℹ️ Source Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                CyberShield AI uses the <strong style={{ color: 'var(--text-primary)' }}>HaGeZi Threat Intelligence Feeds (TIF Medium)</strong> list,
                which aggregates known phishing, malware, ransomware, and scam domains from multiple curated sources.
              </p>
              <Row label="Repository" value="github.com/hagezi/dns-blocklists" />
              <Row label="License" value="GPL-3.0" />
              <Row label="Format" value="Plain domains (one per line)" />
              <Row label="Update Frequency" value="Multiple times daily (upstream)" />
              <div className="alert alert-info" style={{ marginTop: 8, fontSize: 13 }}>
                The list is downloaded at runtime — not stored in Git.
                Enable HAGEZI_SYNC_ENABLED=true in .env to auto-sync on startup.
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
                {syncing ? <><div className="spinner" /> Syncing...</> : <><RefreshCw size={16} /> Sync Now</>}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Sync downloads ~30MB. This may take 30-60 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: valueColor || 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined, fontSize: 13 }}>{value}</span>
    </div>
  );
}
