import {
  ShieldCheck, Target, Cpu, Network, Lock, CalendarClock, Globe,
  AlertTriangle, FileText, ExternalLink,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="main-content">
      <div className="page-header">
        <h2>About & Methodology</h2>
        <p>How CyberShield AI works — transparent, evidence-based analysis</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

          {/* What is CyberShield AI */}
          <div className="card">
            <div className="section-title"><ShieldCheck size={13} /> What is CyberShield AI?</div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 14 }}>
              CyberShield AI is an intelligent cybersecurity platform designed to help users assess suspicious URLs,
              videos, and messages before acting on them. It combines multiple independent evidence sources —
              threat intelligence, machine learning, DNS inspection, domain registration data, TLS certificate
              analysis, and deepfake video detection — to produce a transparent, multi-layer risk assessment.
            </p>
          </div>

          {/* Analysis Pipeline */}
          <div className="card">
            <div className="section-title"><FileText size={13} /> Analysis Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                {
                  icon: <Globe size={18} />,
                  title: 'Lexical Feature Extraction',
                  status: 'Live',
                  desc: 'URL structure is parsed without making any HTTP request to the submitted website. 18 features are extracted covering length, structure, character composition, and suspicious patterns.',
                },
                {
                  icon: <Target size={18} />,
                  title: 'Threat Intelligence Matching',
                  status: 'Live',
                  desc: 'The hostname is checked against the HaGeZi TIF Medium blocklist — an aggregated list of known phishing, malware, and scam domains updated multiple times daily.',
                },
                {
                  icon: <Cpu size={18} />,
                  title: 'ML Phishing Classifier',
                  status: 'Live',
                  desc: 'A logistic regression model trained on character-level TF-IDF features of URL strings. Provides a probability score (0–1) where higher values indicate more phishing-like patterns.',
                },
                {
                  icon: <Network size={18} />,
                  title: 'DNS Analysis',
                  status: 'Live',
                  desc: 'A, AAAA, MX, NS, and CNAME records are queried with strict timeouts. DNS failure does not automatically classify a URL as phishing.',
                },
                {
                  icon: <Lock size={18} />,
                  title: 'TLS Certificate Inspection',
                  status: 'Live',
                  desc: 'For HTTPS URLs, the certificate is inspected for validity, expiry, issuer, and hostname matching. A valid certificate does NOT prove a site is legitimate.',
                },
                {
                  icon: <CalendarClock size={18} />,
                  title: 'Domain Registration Lookup',
                  status: 'Live',
                  desc: 'RDAP is used to estimate domain age where available. Newly registered domains can be a risk signal, but are not conclusive evidence of phishing.',
                },
                {
                  icon: <ShieldCheck size={18} />,
                  title: 'Deepfake Video Detection',
                  status: 'Live',
                  desc: 'The PwTF-DVD model analyzes uploaded video clips frame-by-frame to detect AI-generated or face-swapped content. Requires model weights and a GPU-capable environment.',
                },
                {
                  icon: <AlertTriangle size={18} />,
                  title: 'Scam & Impersonation Analysis',
                  status: 'Live',
                  desc: 'Rule-based and optional ML analysis of SMS, email, call transcripts, and chat messages to detect social engineering, payment coercion, and credential harvesting scams.',
                },
              ].map(({ icon, title, status, desc }) => (
                <div key={title} style={{
                  display: 'flex', gap: 16, padding: '16px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    width: 40, height: 40, background: 'var(--bg-subtle)',
                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-blue)', flexShrink: 0,
                  }} aria-hidden="true">
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
                      <span className={`status-badge ${status === 'Live' ? 'status-badge-success' : 'status-badge-purple'}`}>
                        {status}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.7 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Limitations */}
          <div className="card">
            <div className="section-title"><AlertTriangle size={13} /> Important Limitations</div>
            <div className="alert alert-suspicious mb-4">
              <AlertTriangle size={16} />
              <span>
                A <strong>"SAFE"</strong> result means the available checks did not detect threats.
                It is <strong>NOT</strong> a guarantee of safety.
              </span>
            </div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 2, paddingLeft: 20 }}>
              <li>The ML model was trained on a limited dataset — false positives and negatives are possible.</li>
              <li>Threat intelligence lists do not cover all phishing domains.</li>
              <li>A valid TLS certificate is obtained by legitimate sites <em>and</em> by phishing sites.</li>
              <li>Domain age data may be unavailable for privacy-redacted RDAP records.</li>
              <li>The tool never visits the submitted URL, so redirect chains are not analyzed.</li>
              <li>Deepfake detection requires GPU support and model weights; results may be inconclusive.</li>
              <li>Scam analysis uses heuristic rules; the ML component is optional and experimental.</li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div className="card">
            <div className="section-title"><Cpu size={13} /> Technology Stack</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {[
                ['Frontend', 'React 19 + Vite + TypeScript'],
                ['Styling', 'Vanilla CSS + CSS Variables'],
                ['HTTP Client', 'Axios + TanStack Query'],
                ['Icons', 'Lucide React'],
                ['Backend', 'FastAPI (Python)'],
                ['Database', 'MongoDB'],
                ['ML Classifier', 'scikit-learn (LR + TF-IDF)'],
                ['Deepfake Model', 'PwTF-DVD (PyTorch)'],
                ['Threat Data', 'HaGeZi DNS Blocklists'],
                ['DNS', 'Python dnspython'],
                ['TLS', 'Python ssl module'],
                ['Domain Reg.', 'RDAP via httpx'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Attribution */}
          <div className="card">
            <div className="section-title"><FileText size={13} /> Attribution & Licensing</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>HaGeZi DNS Blocklists</strong> — Used under GPL-3.0.
              </p>
              <p>
                Source:{' '}
                <a
                  href="https://github.com/hagezi/dns-blocklists"
                  style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/hagezi/dns-blocklists <ExternalLink size={12} />
                </a>
              </p>
              <p style={{ marginTop: 8 }}>
                The list is downloaded at runtime from the official CDN. It is not redistributed or committed to this repository.
              </p>
              <p style={{ marginTop: 8 }}>
                CyberShield AI is an <strong>educational/research project</strong>. Do not use results as the sole basis
                for security decisions in production environments.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
