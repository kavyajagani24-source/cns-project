import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, ScanSearch, ShieldAlert, Trash2 } from 'lucide-react';
import { analyzeScam, deleteScamHistory, getApiError, getScamHistory } from '../services/api';
import type { ScamResult, ScamHistory } from '../services/api';
import './ScamAnalysisPage.css';

const examples = [
  { name: 'IRS arrest threat', type: 'call', text: 'This is the IRS. You must pay immediately using gift cards or an arrest warrant will be issued. Do not tell anyone.' },
  { name: 'FedEx delivery', type: 'sms', text: 'FedEx: Your package delivery failed. Click this link immediately to arrange redelivery and pay the small fee.' },
  { name: 'Bank OTP fraud', type: 'sms', text: 'This is your bank fraud department. Unauthorized transaction detected. Share your verification code with us within 15 minutes or your account will be locked.' },
  { name: 'Remote support', type: 'call', text: 'Microsoft Support here. Download AnyDesk, install it and allow remote access to fix your computer immediately.' },
  { name: 'Ordinary message', type: 'chat', text: 'Hi, are we still meeting at the library tomorrow afternoon? I will bring the notes.' },
] as const;

function Evidence({text, result}: {text:string; result:ScamResult}) {
  const spans = [...result.indicators].filter(e => e.start >= 0 && e.end <= text.length && e.end > e.start).sort((a,b) => a.start-b.start || b.end-a.end);
  const chosen: typeof spans = [];
  for (const span of spans) { if (!chosen.length || span.start >= chosen[chosen.length-1].end) chosen.push(span); }
  const nodes: React.ReactNode[] = []; let pos = 0;
  chosen.forEach((s, i) => { nodes.push(text.slice(pos, s.start)); nodes.push(<mark key={i} title={s.explanation}>{text.slice(s.start, s.end)}</mark>); pos = s.end; });
  nodes.push(text.slice(pos));
  return <div className="scam-evidence-text">{nodes}</div>;
}

export default function ScamAnalysisPage() {
  const [text, setText] = useState(''); const [source, setSource] = useState('sms');
  const [store, setStore] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [result, setResult] = useState<ScamResult | null>(null);
  const [history, setHistory] = useState<ScamHistory | null>(null); const [historyError, setHistoryError] = useState('');
  async function refreshHistory() { try { setHistory(await getScamHistory()); setHistoryError(''); } catch { setHistoryError('History requires an available MongoDB connection.'); } }
  useEffect(() => { void refreshHistory(); }, []);
  async function analyze(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setResult(null);
    try { const r = await analyzeScam(text, source, store); setResult(r); if (r.stored) void refreshHistory(); }
    catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }
  async function remove(id: string) { try { await deleteScamHistory(id); await refreshHistory(); } catch (err) { setHistoryError(getApiError(err)); } }
  return <div className="main-content">
    <div className="page-header"><h2>Scam & Impersonation Analysis</h2><p>Identify social engineering, payment coercion, credential harvesting and remote-access scams</p></div>
    <div className="page-body scam-layout">
      <section className="scam-panel">
        <div className="scam-panel-heading"><ScanSearch size={20}/><h3>Analyze a message or transcript</h3></div>
        <div className="scam-presets">{examples.map(x => <button key={x.name} type="button" onClick={() => {setText(x.text);setSource(x.type);setResult(null);}}>{x.name}</button>)}</div>
        <form onSubmit={analyze}>
          <label className="form-label" htmlFor="scam-source">Input type</label>
          <select className="form-input scam-select" id="scam-source" value={source} onChange={e => setSource(e.target.value)}>{['sms','email','call','chat','other'].map(x => <option key={x} value={x}>{x === 'call' ? 'Call transcript' : x.toUpperCase()}</option>)}</select>
          <label className="form-label" htmlFor="scam-text">Message or transcript</label>
          <textarea id="scam-text" className="form-input scam-textarea" placeholder="Paste a suspicious SMS, email, support chat or call transcript…" value={text} maxLength={20000} onChange={e => setText(e.target.value)} />
          <div className="scam-form-foot"><span>{text.length.toLocaleString()} / 20,000 characters</span><label><input type="checkbox" checked={store} onChange={e => setStore(e.target.checked)} /> Save a redacted result to history</label></div>
          <button className="btn btn-primary" type="submit" disabled={loading || text.trim().length < 10}>{loading ? 'Analyzing…' : 'Analyze Scam Risk'}</button>
          {error && <p role="alert" className="scam-error">{error}</p>}
        </form>
        <p className="scam-privacy">Analysis is local to the backend; raw message text is not saved to MongoDB. Avoid pasting real passwords, OTPs or sensitive personal information.</p>
      </section>
      {result && <section className="scam-panel" aria-live="polite">
        <div className="scam-panel-heading">{result.risk_level === 'high' ? <ShieldAlert size={20}/> : result.risk_level === 'moderate' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}<h3>Security assessment</h3></div>
        <div className={`scam-verdict scam-${result.risk_level}`}><div><span>Estimated risk</span><strong>{result.risk_score}/100</strong></div><div><strong>{result.risk_level.toUpperCase()}</strong><span>{result.scam_type}</span></div></div>
        <div className="scam-meter"><div style={{width: `${result.risk_score}%`}} /></div>
        <p className="scam-subtle">Rule score: {result.rule_score}/100 · ML: {result.ml_score === null ? 'Not trained / not available' : `${result.ml_score}/100 (experimental)`}</p>
        <h4>Highlighted evidence</h4><Evidence text={text} result={result} />
        <h4>Detected signals ({result.indicators.length})</h4>
        {result.indicators.length ? <div className="scam-signals">{result.indicators.map((i,n) => <div key={`${i.code}-${n}`}><strong>{i.label}</strong><span>{i.explanation}</span></div>)}</div> : <p className="scam-subtle">No rule-based indicators found.</p>}
        <h4>Recommended next steps</h4><ul className="scam-steps">{result.mitigation_steps.map(x => <li key={x}>{x}</li>)}</ul>
        <p className="scam-privacy">{result.disclaimer}</p>
      </section>}
      <section className="scam-panel"><div className="scam-panel-heading"><ClipboardList size={20}/><h3>Previous scans</h3><button className="scam-refresh" type="button" onClick={() => void refreshHistory()}>Refresh</button></div>
      {historyError && <p className="scam-subtle">{historyError}</p>}
      {!history?.items.length && <p className="scam-subtle">No saved scans. History is opt-in.</p>}
      {history?.items.map(item => <div className="scam-history-item" key={item.scan_id}><div><strong>{item.scam_type}</strong><span>{item.risk_level.toUpperCase()} · {item.risk_score}/100 · {new Date(item.created_at).toLocaleString()}</span></div><button type="button" title="Delete scan" aria-label="Delete saved scan" onClick={() => void remove(item.scan_id)}><Trash2 size={16}/></button></div>)}
      </section>
    </div>
  </div>;
}
