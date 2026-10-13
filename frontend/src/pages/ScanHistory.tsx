import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink } from 'lucide-react';
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
        {error && <div className="alert alert-phishing mb-4">⚠️ {error}</div>}

        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }} />
              <p className="text-muted">Loading scan history...</p>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No scans yet</h3>
              <p>Analyzed URLs will appear here. <Link to="/scanner" style={{ color: 'var(--accent-blue)' }}>Run your first scan →</Link></p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
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
                          <span className="mono" style={{ fontSize: 13 }}>{scan.normalized_hostname || '—'}</span>
                        </td>
                        <td><RiskBadge category={scan.risk_category} size="sm" /></td>
                        <td>
                          {scan.threat_intel_matched
                            ? <span style={{ color: 'var(--risk-phishing)', fontWeight: 600 }}>🎯 Match</span>
                            : <span className="text-muted">—</span>
                          }
                        </td>
                        <td>
                          {scan.ml_score != null
                            ? <span style={{ fontFamily: 'monospace' }}>{(scan.ml_score * 100).toFixed(0)}%</span>
                            : <span className="text-muted">N/A</span>
                          }
                        </td>
                        <td className="text-muted text-sm">
                          {scan.processing_duration_ms ? `${scan.processing_duration_ms.toFixed(0)}ms` : '—'}
                        </td>
                        <td className="text-muted text-sm">
                          {scan.created_at ? new Date(scan.created_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Link
                              to={`/scanner?id=${scan.scan_id}`}
                              className="btn btn-secondary btn-sm"
                              title="View details"
                            >
                              <ExternalLink size={12} />
                            </Link>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(scan.scan_id)}
                              disabled={deleting === scan.scan_id}
                              title="Delete scan"
                            >
                              {deleting === scan.scan_id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Trash2 size={12} />}
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >← Prev</button>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>
                    Page {page} of {data.total_pages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage(p => p + 1)}
                  >Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
