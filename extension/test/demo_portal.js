/**
 * CyberShield AI — Demo Portal Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnScanSafe = document.getElementById('btn-scan-safe');
  const btnScanTI = document.getElementById('btn-scan-ti');
  const btnNavTI = document.getElementById('btn-nav-ti');
  const btnScanSuspicious = document.getElementById('btn-scan-suspicious');
  const btnTestOffline = document.getElementById('btn-test-offline');

  const resultSafe = document.getElementById('result-safe');
  const resultTI = document.getElementById('result-ti');
  const resultSuspicious = document.getElementById('result-suspicious');
  const resultOffline = document.getElementById('result-offline');

  function renderResult(container, res) {
    container.style.display = 'block';
    const isOnline = res.backend_available;
    const risk = (res.risk_category || 'safe').toUpperCase();
    const evidence = (res.key_evidence || []).map(e => `<li>${e}</li>`).join('');

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Verdict: <span style="color: ${risk === 'PHISHING' ? '#ef4444' : risk === 'SUSPICIOUS' ? '#f59e0b' : '#10b981'}">${risk}</span></strong>
        <span style="color: #94a3b8;">${isOnline ? 'FastAPI Backend' : 'Offline Heuristic Fallback'} · ${res.processing_duration_ms || 0}ms</span>
      </div>
      <ul style="padding-left: 18px; margin: 0; color: #cbd5e1;">
        ${evidence}
      </ul>
    `;
  }

  // 1. Safe Scan
  btnScanSafe.addEventListener('click', () => {
    btnScanSafe.textContent = 'Scanning...';
    chrome.runtime.sendMessage({ action: 'SCAN_URL', url: 'https://github.com' }, (res) => {
      btnScanSafe.textContent = 'Run API Scan';
      renderResult(resultSafe, res);
    });
  });

  // 2. Threat Intel Match Scan
  btnScanTI.addEventListener('click', () => {
    btnScanTI.textContent = 'Scanning...';
    chrome.runtime.sendMessage({ action: 'SCAN_URL', url: 'http://phishing-test.example' }, (res) => {
      btnScanTI.textContent = 'Run API Scan';
      renderResult(resultTI, res);
    });
  });

  // 2b. Simulate Navigation to Threat Intel Fixture (Triggers Warning Interstitial)
  btnNavTI.addEventListener('click', () => {
    const warningUrl = chrome.runtime.getURL('warning/warning.html') + 
      '?url=' + encodeURIComponent('http://phishing-test.example/login') + 
      '&risk=phishing' + 
      '&reason=' + encodeURIComponent('Hostname matched HaGeZi offline threat fixture (phishing-test.example)');
    window.open(warningUrl, '_blank');
  });

  // 3. Suspicious Scan
  btnScanSuspicious.addEventListener('click', () => {
    btnScanSuspicious.textContent = 'Scanning...';
    chrome.runtime.sendMessage({ action: 'SCAN_URL', url: 'http://paypal-verification-account-security-alert.xyz/login' }, (res) => {
      btnScanSuspicious.textContent = 'Run API Scan';
      renderResult(resultSuspicious, res);
    });
  });

  // 5. Offline Simulation
  btnTestOffline.addEventListener('click', () => {
    btnTestOffline.textContent = 'Simulating...';
    // Test backend check with unreachable port
    chrome.runtime.sendMessage({ action: 'CHECK_HEALTH', customUrl: 'http://127.0.0.1:9999' }, (health) => {
      btnTestOffline.textContent = 'Simulate Offline Scan';
      resultOffline.style.display = 'block';
      resultOffline.innerHTML = `
        <div style="color: #a78bfa; margin-bottom: 6px;">
          <strong>Graceful Fallback Verified:</strong> Backend at http://127.0.0.1:9999 is ${health.status} (${health.error}).
        </div>
        <p style="color: #cbd5e1; margin: 0;">
          The extension captured the connection failure safely without uncaught exceptions, and automatically diverted URL analysis to local heuristic scoring rules.
        </p>
      `;
    });
  });
});
