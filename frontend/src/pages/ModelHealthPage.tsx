import { useState, useEffect } from 'react';
import { getModelHealth } from '../services/api';
import type { ModelHealthStatus } from '../types/api';

export default function ModelHealthPage() {
  const [health, setHealth] = useState<ModelHealthStatus | null>(null);

  useEffect(() => {
    getModelHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Model Health</h2>
        <p>Machine learning classifier status and metadata</p>
      </div>
      <div className="page-body">
        <div className="grid-2">
          <div className="card">
            <div className="section-title">🤖 Model Status</div>
            {health ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div className={`status-dot ${health.available ? '' : 'offline'}`} style={{ width: 12, height: 12 }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: health.available ? 'var(--risk-safe)' : 'var(--risk-phishing)' }}>
                    {health.available ? 'Model Loaded' : 'Model Unavailable'}
                  </span>
                </div>
                <Row label="Model Name" value={health.model_name} />
                <Row label="Version" value={health.version || 'Unknown'} />
                <Row label="Type" value={health.model_type || 'Unknown'} />
                <Row label="Last Check" value={health.last_check ? new Date(health.last_check).toLocaleString() : '—'} />
                {health.error && (
                  <div className="alert alert-phishing" style={{ fontSize: 13 }}>
                    <span>⚠️</span> {health.error}
                  </div>
                )}
              </div>
            ) : <div className="spinner" />}
          </div>

          <div className="card">
            <div className="section-title">📊 Model Architecture</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
              <Row label="Vectorizer" value="TF-IDF char_wb n-gram (3,5)" />
              <Row label="Classifier" value="Logistic Regression (balanced)" />
              <Row label="Max Features" value="50,000" />
              <Row label="Feature Schema" value="v1.0" />
              <div className="alert alert-info" style={{ marginTop: 8, fontSize: 13 }}>
                The model was trained on a synthetic dataset for development. Replace with a real labeled dataset for production use.
                Run: <code style={{ fontFamily: 'monospace' }}>uv run python -m app.scripts.train_phishing_model</code>
              </div>
            </div>

            {!health?.available && (
              <div style={{ marginTop: 16 }}>
                <div className="section-title">Training Steps</div>
                <ol style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
                  <li>Place dataset at <code style={{ fontFamily: 'monospace' }}>datasets/phishing_urls.csv</code></li>
                  <li>Run <code style={{ fontFamily: 'monospace' }}>uv run python -m app.scripts.prepare_dataset</code></li>
                  <li>Run <code style={{ fontFamily: 'monospace' }}>uv run python -m app.scripts.train_phishing_model</code></li>
                  <li>Restart the backend</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{value}</span>
    </div>
  );
}
