import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertCircle, Info, Terminal } from 'lucide-react';
import { getModelHealth, getApiError } from '../services/api';
import type { ModelHealthStatus } from '../types/api';

export default function ModelHealthPage() {
  const [health, setHealth] = useState<ModelHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModelHealth()
      .then(setHealth)
      .catch(e => setError(getApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Model Health</h2>
        <p>Machine learning classifier status, version, and diagnostic information</p>
      </div>
      <div className="page-body">

        {error && (
          <div className="alert alert-phishing mb-4" role="alert">
            <AlertCircle size={16} />
            <span>Failed to load model health: {error}</span>
          </div>
        )}

        <div className="grid-2">
          {/* Model Status */}
          <div className="card">
            <div className="section-title"><Cpu size={13} /> Model Status</div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                <div className="spinner" /> Checking model status…
              </div>
            ) : health ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Availability indicator */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 0', marginBottom: 6,
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  {health.available
                    ? <><CheckCircle2 size={20} color="var(--success)" /><span style={{ fontWeight: 600, color: 'var(--success)', fontSize: 15 }}>Model Loaded</span></>
                    : <><AlertCircle size={20} color="var(--error)" /><span style={{ fontWeight: 600, color: 'var(--error)', fontSize: 15 }}>Model Unavailable</span></>}
                </div>

                <Row label="Model Name"  value={health.model_name} />
                <Row label="Version"     value={health.version || 'Unknown'} />
                <Row label="Type"        value={health.model_type || 'Unknown'} />
                <Row label="Last Check"  value={health.last_check ? new Date(health.last_check).toLocaleString() : '—'} />

                {health.artifact_path && (
                  <Row label="Artifact Path" value={health.artifact_path} mono />
                )}

                {health.error && (
                  <div className="alert alert-phishing mt-3" style={{ fontSize: 13 }}>
                    <AlertCircle size={14} />
                    <span>{health.error}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted text-sm">No model status available.</p>
            )}
          </div>

          {/* Architecture + Training */}
          <div className="card">
            <div className="section-title"><Info size={13} /> Model Architecture</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <Row label="Vectorizer"    value="TF-IDF char_wb n-gram (3,5)" />
              <Row label="Classifier"    value="Logistic Regression (balanced)" />
              <Row label="Max Features"  value="50,000" />
              <Row label="Feature Schema" value="v1.0" />
            </div>

            <div className="alert alert-info" style={{ fontSize: 13, marginBottom: 16 }}>
              <Info size={14} />
              <span>
                The model was trained on a synthetic dataset for development.
                Replace with a real labeled dataset for production use.
              </span>
            </div>

            {!health?.available && (
              <>
                <div className="section-title mt-4"><Terminal size={13} /> Training Steps</div>
                <ol style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
                  <li>Place dataset at <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>datasets/phishing_urls.csv</code></li>
                  <li>Run <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>uv run python -m app.scripts.prepare_dataset</code></li>
                  <li>Run <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>uv run python -m app.scripts.train_phishing_model</code></li>
                  <li>Restart the backend</li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13.5, flexShrink: 0 }}>{label}</span>
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
