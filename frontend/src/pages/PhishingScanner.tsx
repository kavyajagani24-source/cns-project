import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Search, Copy, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { submitScan, getScan, getApiError } from '../services/api';
import type { ScanResult } from '../types/api';
import RiskBadge from '../components/RiskBadge';

export default function PhishingScanner() {
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing scan from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      getScan(id).then(setResult).catch(() => {});
    }
  }, [searchParams]);

  function validateUrl(v: string): string {
    if (!v.trim()) return 'Please enter a URL';
    if (!v.startsWith('http://') && !v.startsWith('https://')) return 'URL must start with http:// or https://';
    if (v.length > 2048) return 'URL is too long (max 2048 characters)';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    setUrlError('');
    setApiError(null);
    setResult(null);
    setScanning(true);
    try {
      const r = await submitScan(url);
      setResult(r);
    } catch (e) {
      setApiError(getApiError(e));
    } finally {
      setScanning(false);
    }
  }

  function copyReport() {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Phishing URL Scanner</h2>
        <p>Analyze suspicious URLs using threat intelligence, ML, DNS, and TLS inspection</p>
      </div>
      <div className="page-body">

        {/* Input */}
        <div className="scanner-box">
          <form onSubmit={handleSubmit}>
            <div className="form-field mb-4">
              <label className="form-label">Suspicious URL</label>
              <div className="input-group">
                <input
                  ref={inputRef}
                  id="url-input"
                  type="text"
                  className={`form-input ${urlError ? 'error' : ''}`}
                  placeholder="https://suspicious-site.example.com/login"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setUrlError(''); }}
                  disabled={scanning}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={scanning}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {scanning ? <><div className="spinner" /> Analyzing...</> : <><Search size={16} /> Analyze</>}
                </button>
              </div>
              {urlError && <div className="form-error">{urlError}</div>}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ⚠️ This tool does not visit the submitted URL. Analysis uses threat intelligence, lexical features, DNS, and TLS only.
            </p>
          </form>
        </div>

        {/* Scanning indicator */}
        {scanning && (
          <div className="card mb-6" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Running multi-layer analysis...</p>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {['Threat Intel', 'ML Classifier', 'DNS Lookup', 'Domain Reg.', 'TLS Check'].map(s => (
                <span key={s} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1 }} /> {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {apiError && (
          <div className="alert alert-phishing mb-6">
            <AlertCircle size={18} />
            <div>
              <strong>Analysis failed</strong><br />
              <span style={{ fontSize: 13 }}>{apiError}</span>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !scanning && <ScanResultView result={result} onCopy={copyReport} />}
      </div>
    </div>
  );
}

function ScanResultView({ result, onCopy }: { result: ScanResult; onCopy: () => void }) {
  const riskColors: Record<string, string> = {
    phishing: 'var(--risk-phishing)',
    suspicious: 'var(--risk-suspicious)',
    safe: 'var(--risk-safe)',
    inconclusive: 'var(--risk-inconclusive)',
  };
  const color = riskColors[result.risk_category || 'inconclusive'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="card" style={{ borderColor: color.replace(')', ', 0.35)').replace('var(', 'rgba(').replace('var(', '') }}>
        <div className="result-header">
          <div style={{ flex: 1 }}>
            <div className="result-hostname">{result.normalized_hostname || 'Unknown'}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <RiskBadge category={result.risk_category} />
              {result.processing_duration_ms && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {result.processing_duration_ms}ms
                </span>
              )}
              {result.scan_id && <span className="tag">{result.scan_id.slice(0, 8)}...</span>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onCopy}><Copy size={14} /> Copy Report</button>
        </div>

        {/* ML Score */}
        {result.ml_result && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <InfoChip label="ML Model" value={result.ml_result.available ? 'Loaded' : 'Unavailable'} ok={result.ml_result.available} />
            {result.ml_result.model_score != null && (
              <InfoChip label="Phishing Score" value={`${(result.ml_result.model_score * 100).toFixed(1)}%`} />
            )}
            {result.ml_result.model_version && (
              <InfoChip label="Model Version" value={`v${result.ml_result.model_version}`} />
            )}
          </div>
        )}

        {/* Threat Intel */}
        {result.threat_intel_result && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <InfoChip
              label="Threat Intel"
              value={result.threat_intel_result.matched ? `MATCH: ${result.threat_intel_result.matched_entry}` : 'No match'}
              danger={result.threat_intel_result.matched}
              ok={!result.threat_intel_result.matched && result.threat_intel_result.checked}
            />
            {result.threat_intel_result.entry_count && (
              <InfoChip label="List Size" value={result.threat_intel_result.entry_count.toLocaleString() + ' domains'} />
            )}
          </div>
        )}

        {/* Key Evidence */}
        {result.key_evidence.length > 0 && (
          <div>
            <div className="section-title" style={{ marginBottom: 12 }}>Key Evidence</div>
            {result.key_evidence.map((e, i) => (
              <div key={i} className="evidence-item">
                <span className="evidence-icon">🔍</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Explanations */}
        <div className="card">
          <div className="section-title">Plain-Language Explanation</div>
          {result.explanations.map((e, i) => (
            <div key={i} className="evidence-item">
              <span className="evidence-icon">💬</span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{e}</span>
            </div>
          ))}
        </div>

        {/* Recommended Actions */}
        <div className="card">
          <div className="section-title">Recommended Actions</div>
          {result.recommended_actions.map((a, i) => (
            <div key={i} className="evidence-item">
              <span className="evidence-icon">{i === 0 ? '🚨' : '→'}</span>
              <span style={{ fontSize: 14 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="grid-3">
        {/* DNS */}
        <div className="card card-sm">
          <div className="section-title">DNS Analysis</div>
          {result.dns_findings ? (
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TechRow label="Resolved" value={result.dns_findings.resolution_successful ? '✅ Yes' : '❌ No'} />
              <TechRow label="A Records" value={result.dns_findings.a_records.slice(0, 3).join(', ') || '—'} />
              {result.dns_findings.mx_records.length > 0 && <TechRow label="MX" value={result.dns_findings.mx_records[0]} />}
              {result.dns_findings.lookup_latency_ms && <TechRow label="Latency" value={`${result.dns_findings.lookup_latency_ms}ms`} />}
              {result.dns_findings.error && <TechRow label="Error" value={result.dns_findings.error} warn />}
            </div>
          ) : <span className="text-muted text-sm">Not available</span>}
        </div>

        {/* TLS */}
        <div className="card card-sm">
          <div className="section-title">TLS Certificate</div>
          {result.tls_findings ? (
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TechRow label="Status" value={result.tls_findings.status} ok={result.tls_findings.status === 'valid'} warn={result.tls_findings.status === 'invalid'} />
              {result.tls_findings.issuer && <TechRow label="Issuer" value={result.tls_findings.issuer} />}
              {result.tls_findings.days_until_expiry != null && <TechRow label="Expires in" value={`${result.tls_findings.days_until_expiry} days`} />}
              {result.tls_findings.hostname_matches != null && <TechRow label="Hostname match" value={result.tls_findings.hostname_matches ? '✅' : '❌'} />}
              {result.tls_findings.error && <TechRow label="Note" value={result.tls_findings.error} />}
            </div>
          ) : <span className="text-muted text-sm">Not available</span>}
        </div>

        {/* Domain */}
        <div className="card card-sm">
          <div className="section-title">Domain Registration</div>
          {result.domain_registration ? (
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.domain_registration.available ? (
                <>
                  {result.domain_registration.domain_age_days != null && <TechRow label="Age" value={`${result.domain_registration.domain_age_days} days`} warn={result.domain_registration.domain_age_days < 30} />}
                  {result.domain_registration.creation_date && <TechRow label="Registered" value={new Date(result.domain_registration.creation_date).toLocaleDateString()} />}
                  {result.domain_registration.data_source && <TechRow label="Source" value={result.domain_registration.data_source} />}
                </>
              ) : (
                <span className="text-muted">Data unavailable{result.domain_registration.error ? ` (${result.domain_registration.error})` : ''}</span>
              )}
            </div>
          ) : <span className="text-muted text-sm">Not available</span>}
        </div>
      </div>

      {/* URL Features */}
      {result.url_features && (
        <div className="card">
          <div className="section-title">URL Lexical Features</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {[
              ['URL Length', result.url_features.url_length],
              ['Hostname Length', result.url_features.hostname_length],
              ['Subdomains', result.url_features.num_subdomains],
              ['Dots', result.url_features.num_dots],
              ['Hyphens', result.url_features.num_hyphens],
              ['Digits', result.url_features.num_digits],
              ['Query Params', result.url_features.num_query_params],
              ['Path Segments', result.url_features.num_path_segments],
            ].map(([k, v]) => (
              <div key={k as string} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {result.url_features.is_ip_address && <span className="tag" style={{ color: 'var(--risk-suspicious)' }}>IP address</span>}
            {result.url_features.has_at_sign && <span className="tag" style={{ color: 'var(--risk-suspicious)' }}>@ sign</span>}
            {result.url_features.has_suspicious_tokens && <span className="tag" style={{ color: 'var(--risk-suspicious)' }}>Suspicious tokens</span>}
            {result.url_features.has_misleading_hostname && <span className="tag" style={{ color: 'var(--risk-phishing)' }}>Misleading hostname</span>}
            {result.url_features.has_punycode && <span className="tag" style={{ color: 'var(--risk-suspicious)' }}>Punycode</span>}
            {result.url_features.has_encoded_chars && <span className="tag">Encoded chars</span>}
            {result.url_features.uses_https && <span className="tag" style={{ color: 'var(--risk-safe)' }}>HTTPS</span>}
          </div>
        </div>
      )}

      {/* Missing data */}
      {result.missing_data.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="section-title">⚠️ Checks Not Completed</div>
          {result.missing_data.map((m, i) => (
            <div key={i} className="evidence-item" style={{ color: 'var(--text-muted)' }}>
              <span>❓</span> <span style={{ fontSize: 13 }}>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value, ok, danger }: { label: string; value: string; ok?: boolean; danger?: boolean }) {
  const color = danger ? 'var(--risk-phishing)' : ok ? 'var(--risk-safe)' : 'var(--text-muted)';
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function TechRow({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  const color = warn ? 'var(--risk-suspicious)' : ok ? 'var(--risk-safe)' : 'var(--text-secondary)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color, fontFamily: 'monospace', fontSize: 12, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
