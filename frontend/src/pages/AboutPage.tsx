export default function AboutPage() {
  return (
    <div className="main-content">
      <div className="page-header">
        <h2>About & Methodology</h2>
        <p>How CyberShield AI works — transparent, evidence-based analysis</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

          <div className="card">
            <div className="section-title">🛡️ What is CyberShield AI?</div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              CyberShield AI is an intelligent cybersecurity platform designed to help users assess suspicious URLs before visiting them.
              It combines multiple independent evidence sources — threat intelligence, machine learning, DNS inspection,
              domain registration data, and TLS certificate analysis — to produce a transparent risk assessment.
            </p>
          </div>

          <div className="card">
            <div className="section-title">⚙️ Analysis Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '🔍', title: 'Lexical Feature Extraction', desc: 'URL structure is parsed without making any HTTP request to the submitted website. 18 features are extracted covering length, structure, character composition, and suspicious patterns.' },
                { icon: '🎯', title: 'Threat Intelligence Matching', desc: 'The hostname is checked against the HaGeZi TIF Medium blocklist — an aggregated list of known phishing, malware, and scam domains updated multiple times daily.' },
                { icon: '🤖', title: 'ML Phishing Classifier', desc: 'A logistic regression model trained on character-level TF-IDF features of URL strings. Provides a probability score (0–1) where higher values indicate more phishing-like patterns.' },
                { icon: '🌐', title: 'DNS Analysis', desc: 'A records, AAAA, MX, NS, and CNAME records are queried with strict timeouts. DNS failure does not automatically classify a URL as phishing.' },
                { icon: '📜', title: 'TLS Certificate Inspection', desc: 'For HTTPS URLs, the certificate is inspected for validity, expiry, issuer, and hostname matching. A valid certificate does NOT prove a site is legitimate.' },
                { icon: '📅', title: 'Domain Registration Lookup', desc: 'RDAP is used to estimate domain age where available. Newly registered domains can be a risk signal, but are not conclusive evidence of phishing.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title">⚠️ Important Limitations</div>
            <div className="alert alert-suspicious" style={{ marginBottom: 12 }}>
              <span>⚠️</span>
              <span>A "SAFE" result means the available checks did not detect threats. It is NOT a guarantee of safety.</span>
            </div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 2, paddingLeft: 20 }}>
              <li>The ML model was trained on a limited dataset — false positives and negatives are possible.</li>
              <li>Threat intelligence lists do not cover all phishing domains.</li>
              <li>A valid TLS certificate is obtained by legitimate sites AND by phishing sites.</li>
              <li>Domain age data may be unavailable for privacy-redacted records.</li>
              <li>The tool never visits the submitted URL, so redirect chains are not analyzed.</li>
            </ul>
          </div>

          <div className="card">
            <div className="section-title">📜 Attribution & Licensing</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>HaGeZi DNS Blocklists</strong> — Used under GPL-3.0.</p>
              <p>Source: <a href="https://github.com/hagezi/dns-blocklists" style={{ color: 'var(--accent-blue)' }} target="_blank" rel="noopener noreferrer">github.com/hagezi/dns-blocklists</a></p>
              <p style={{ marginTop: 8 }}>The list is downloaded at runtime from the official CDN. It is not redistributed or committed to this repository.</p>
              <p style={{ marginTop: 8 }}>CyberShield AI is an educational/research project. Do not use results as the sole basis for security decisions in production environments.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
