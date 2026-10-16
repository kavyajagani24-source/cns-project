import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, ClipboardList, AlertCircle, ScanSearch } from 'lucide-react';
import { listScans, deleteScan, getApiError } from '../services/api';
import type { PaginatedScans } from '../types/api';
import RiskBadge from '../components/RiskBadge';

export default function ScanHistory() {
  const [data, setData] = useState<PaginatedScans | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = (p = page) => {
    setLoading(true);
    listScans(p, 20)
      .then(setData)
      .catch(e => setError(getApiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  async function handleDelete(scanId: string) {
    setDeleting(scanId);
    try {
      await deleteScan(scanId);
      load();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Scan History</h2>
        <p>All previously analyzed URLs — {data?.total ?? 0} total records</p>
      </div>
      <div className="page-body">

        {error && (
          <div className="alert alert-phishing mb-4" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 14px' }} />
              <p className="text-muted">Loading scan history…</p>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardList size={24} /></div>
              <h3>No scans yet</h3>
              <p>
                Analyzed URLs will appear here.{' '}
                <Link to="/scanner" style={{ color: 'var(--accent-blue)' }}>Run your first scan →</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Hostname</th>
                      <th>Risk</th>
                      <th>TI Match</th>
                      <th>ML Score</th>
                      <th>Duration</th>
                      <th>Scanned At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map(scan => (
                      <tr key={scan.scan_id}>
                        <td>
                          <span className="mono truncate" style={{ fontSize: 12, maxWidth: 220, display: 'block' }}>
                            {scan.normalized_hostname || '—'}
                          </span>
                        </td>
                        <td><RiskBadge category={scan.risk_category} size="sm" /></td>
                        <td>
                          {scan.threat_intel_matched
                            ? <span className="status-badge status-badge-error">Match</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {scan.ml_score != null
                            ? <span className="mono">{(scan.ml_score * 100).toFixed(0)}%</span>
                            : <span className="text-muted">N/A</span>}
                        </td>
                        <td className="text-muted text-sm">
                          {scan.processing_duration_ms ? `${scan.processing_duration_ms.toFixed(0)}ms` : '—'}
                        </td>
                        <td className="text-muted text-sm">
                          {scan.created_at ? new Date(scan.created_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Link
                              to={`/scanner?id=${scan.scan_id}`}
                              className="btn btn-secondary btn-sm"
                              title="View scan details"
                              aria-label={`View details for ${scan.normalized_hostname || scan.scan_id}`}
                            >
                              <ExternalLink size={12} />
                            </Link>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(scan.scan_id)}
                              disabled={deleting === scan.scan_id}
                              title="Delete scan"
                              aria-label={`Delete scan for ${scan.normalized_hostname || scan.scan_id}`}
                            >
                              {deleting === scan.scan_id
                                ? <div className="spinner spinner-sm" />
                                : <Trash2 size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', borderTop: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Page {page} of {data.total_pages} · {data.total} records
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={page >= data.total_pages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick link to scanner when empty */}
        {!loading && data && data.items.length === 0 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/scanner" className="btn btn-primary">
              <ScanSearch size={16} /> Analyze a URL
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
