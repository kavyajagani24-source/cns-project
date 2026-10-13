export default function ScamAnalysisPage() {
  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Scam Analysis</h2>
        <p>Social engineering and impersonation scam detection</p>
      </div>
      <div className="page-body">
        <div className="coming-soon-card">
          <div className="coming-soon-icon">📞</div>
          <h2>Scam Analysis Module</h2>
          <p>
            This module will analyze call transcripts, text messages, and user-provided descriptions
            for social engineering warning signs — including fake authority threats, urgent payment demands,
            OTP requests, and remote access tool installation requests.
          </p>
          <p style={{ marginTop: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Warning patterns: Arrest threats · Gift card demands · OTP requests · RAT installation · Cryptocurrency demands
          </p>
          <div className="part-badge">🔜 Coming in Part 3</div>
        </div>
      </div>
    </div>
  );
}
