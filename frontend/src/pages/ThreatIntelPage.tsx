import { useState, useEffect } from 'react';
import { RefreshCw, Database, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getThreatIntelHealth, triggerSync, getApiError } from '../services/api';
import type { ThreatIntelHealthStatus } from '../types/api';

const syncStatusConfig: Record<string, { label: string; badge: string }> = {
  synced:       { label: 'Synced',        badge: 'status-badge-success' },
  syncing:      { label: 'Syncing…',      badge: 'status-badge-info' },
  failed:       { label: 'Failed',        badge: 'status-badge-error' },
  never_synced: { label: 'Never synced',  badge: 'status-badge-neutral' },
  stale:        { label: 'Stale',         badge: 'status-badge-warning' },
};

export default function ThreatIntelPage() {
  const [health, setHealth] = useState<ThreatIntelHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getThreatIntelHealth()
      .then(setHealth)
      .catch(e => setError(getApiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    setError(null);
    try {
      const r = await triggerSync();
      setSyncMsg(
        r.message + (r.entry_count ? ` (${r.entry_count.toLocaleString()} domains loaded)` : ''),
      );
      load();
    } catch (e) {
      setError(getApiError(e) || 'Sync failed. Check backend logs.');
    } finally {
      setSyncing(false);
    }
  }

  const sc = health ? syncStatusConfig[health.sync_status] ?? { label: health.sync_status, badge: 'status-badge-neutral' } : null;

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Threat Intelligence</h2>
        <p>HaGeZi TIF blocklist integration — status and manual synchronization</p>
      </div>
      <div className="page-body">

        {error && (
          <div className="alert alert-phishing mb-4" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {syncMsg && (
          <div className="alert alert-safe mb-4" role="status">
            <CheckCircle2 size={16} />
            <span>{syncMsg}</span>
          </div>
        )}

        <div className="grid-2">
          {/* Status card */}
          <div className="card">
            <div className="section-title"><Database size={13} /> List Status</div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                <div className="spinner" /> Loading status…
              </div>
            ) : health ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Row label="Source" value={health.source_name} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Sync Status</span>
                  {sc && <span className={`status-badge ${sc.badge}`}>{sc.label}</span>}
                </div>
                <Row
                  label="In-Memory Domains"
                  value={health.in_memory_count?.toLocaleString() ?? '—'}
                  note="Currently loaded for lookups"
                />
                <Row
                  label="List Entry Count"
                  value={health.entry_count?.toLocaleString() ?? '—'}
                  note="From last sync metadata"
                />
                <Row
                  label="Last Sync"
                  value={health.last_successful ? new Date(health.last_successful).toLocaleString() : 'Never'}
                />
                <Row
                  label="Content Hash"
                  value={health.content_hash ? health.content_hash.slice(0, 16) + '…' : '—'}
                  mono
                />
                {health.error && (
                  <div className="alert alert-phishing mt-3" style={{ fontSize: 13 }}>
                    <AlertCircle size={14} />
                    <span>{health.error}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted text-sm">Unable to load threat intel status.</p>
            )}
          </div>

          {/* Source info + sync action */}
          <div className="card">
            <div className="section-title"><Info size={13} /> Source Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13.5, marginBottom: 16 }}>
                CyberShield AI uses the{' '}
                <strong style={{ color: 'var(--text-primary)' }}>HaGeZi Threat Intelligence Feeds (TIF Medium)</strong>{' '}
                list, which aggregates known phishing, malware, ransomware, and scam domains from multiple curated sources.
              </p>
              <Row label="Repository" value="github.com/hagezi/dns-blocklists" />
              <Row label="License" value="GPL-3.0" />
              <Row label="Format" value="Plain domains (one per line)" />
              <Row label="Update Frequency" value="Multiple times daily (upstream)" />
            </div>

            <div className="alert alert-info" style={{ fontSize: 13, marginBottom: 20 }}>
              <Info size={14} />
              <span>
                The list is downloaded at runtime — not stored in Git.
                Set <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>HAGEZI_SYNC_ENABLED=true</code> in{' '}
                <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>.env</code> to auto-sync on startup.
              </span>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSync}
              disabled={syncing}
              aria-label={syncing ? 'Sync in progress' : 'Trigger threat intelligence sync'}
            >
              {syncing ? <><div className="spinner spinner-sm" /> Syncing…</> : <><RefreshCw size={15} /> Sync Now</>}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Sync downloads ~30 MB. This may take 30–60 seconds.
              Avoid triggering multiple syncs concurrently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, note, mono,
}: {
  label: string; value: string; note?: string; mono?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', marginBottom: 0,
    }}>
      <div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{label}</span>
        {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{note}</div>}
      </div>
      <span style={{
        color: 'var(--text-primary)',
        fontFamily: mono ? 'JetBrains Mono, monospace' : undefined,
        fontSize: 13,
        textAlign: 'right',
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}
