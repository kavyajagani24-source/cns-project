/**
 * CyberShield AI — Popup UI Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading-state');
  const mainEl = document.getElementById('main-content');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('backend-status-text');
  const offlineBanner = document.getElementById('offline-banner');

  let currentTabUrl = '';

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(`pane-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Health check
  async function refreshHealth() {
    try {
      chrome.runtime.sendMessage({ action: 'CHECK_HEALTH' }, (health) => {
        if (chrome.runtime.lastError || !health) {
          setHealthStatus(false, 'Unreachable');
          return;
        }
        if (health.online) {
          setHealthStatus(true, `${health.latency_ms}ms`);
          offlineBanner.classList.remove('visible');
        } else {
          setHealthStatus(false, 'Offline');
          offlineBanner.classList.add('visible');
        }
      });
    } catch (e) {
      setHealthStatus(false, 'Offline');
    }
  }

  function setHealthStatus(isOnline, text) {
    statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    statusText.textContent = text;
  }

  // Load and render tab status
  async function loadTabStatus() {
    loadingEl.style.display = 'flex';
    mainEl.style.display = 'none';

    chrome.runtime.sendMessage({ action: 'GET_CURRENT_TAB_STATUS' }, (res) => {
      loadingEl.style.display = 'none';
      mainEl.style.display = 'block';

      if (chrome.runtime.lastError || !res || res.error) {
        renderNonWebTab(res?.error || 'Unable to scan active tab');
        return;
      }

      renderScanResult(res);
    });
  }

  function renderNonWebTab(msg) {
    document.getElementById('active-host').textContent = 'Internal / Local Browser Page';
    document.getElementById('active-url').textContent = msg;
    document.getElementById('risk-badge').className = 'risk-category-badge safe';
    document.getElementById('risk-badge-text').textContent = 'NOT SCANNED';
    document.getElementById('risk-score-val').textContent = '0';
    document.getElementById('risk-summary-text').textContent = 'Internal or non-HTTP address';
    document.getElementById('evidence-list').innerHTML = `
      <li class="evidence-item">
        <span class="icon">ℹ️</span>
        <span>Browser internal schemes (chrome://, file://) are bypassed by security policy.</span>
      </li>
    `;
    document.getElementById('action-text').textContent = 'Navigate to a public HTTP or HTTPS website to inspect real-time threat intelligence.';
  }

  function renderScanResult(data) {
    currentTabUrl = data.url || '';
    const hostname = data.normalized_hostname || 'Unknown Host';
    const risk = (data.risk_category || 'safe').toLowerCase();

    document.getElementById('active-host').textContent = hostname;
    document.getElementById('active-url').textContent = data.url;

    // Risk Meter Card update
    const riskCard = document.getElementById('risk-card');
    const riskBadge = document.getElementById('risk-badge');
    const riskBadgeText = document.getElementById('risk-badge-text');
    const riskBadgeIcon = document.getElementById('risk-badge-icon');
    const riskScoreVal = document.getElementById('risk-score-val');
    const riskSummaryText = document.getElementById('risk-summary-text');

    riskCard.className = `risk-meter-card ${risk}`;
    riskBadge.className = `risk-category-badge ${risk}`;

    let score = 5;
    if (data.ml_result?.probability_phishing !== undefined && data.ml_result?.probability_phishing !== null) {
      score = Math.round(data.ml_result.probability_phishing * 100);
    } else if (data.heuristic_score !== undefined) {
      score = data.heuristic_score;
    } else if (risk === 'phishing') {
      score = 98;
    } else if (risk === 'suspicious') {
      score = 65;
    } else {
      score = 4;
    }

    riskScoreVal.textContent = score;

    if (risk === 'phishing') {
      riskBadgeText.textContent = 'PHISHING';
      riskBadgeIcon.textContent = '🚨';
      riskSummaryText.textContent = 'High confidence malicious destination';
    } else if (risk === 'suspicious') {
      riskBadgeText.textContent = 'SUSPICIOUS';
      riskBadgeIcon.textContent = '⚠️';
      riskSummaryText.textContent = 'Elevated threat signals or structural anomalies';
    } else if (risk === 'safe') {
      riskBadgeText.textContent = 'SAFE';
      riskBadgeIcon.textContent = '✓';
      riskSummaryText.textContent = 'No malicious indicators detected';
    } else {
      riskBadgeText.textContent = 'INCONCLUSIVE';
      riskBadgeIcon.textContent = '•';
      riskSummaryText.textContent = 'Insufficient telemetry for conclusive verdict';
    }

    // Evidence List
    const evidenceListEl = document.getElementById('evidence-list');
    evidenceListEl.innerHTML = '';
    const evidenceArr = data.key_evidence || [];

    if (evidenceArr.length === 0) {
      evidenceArr.push('No malicious indicators found across analysis layers.');
    }

    evidenceArr.forEach(ev => {
      const li = document.createElement('li');
      li.className = 'evidence-item';
      let icon = '🔍';
      if (ev.includes('matched') || ev.includes('blocklist') || ev.includes('phishing')) icon = '🚨';
      else if (ev.includes('Offline') || ev.includes('heuristic')) icon = '⚡';
      else if (ev.includes('TLS') || ev.includes('certificate')) icon = '🔒';
      else if (ev.includes('reputable') || ev.includes('clean')) icon = '✓';

      li.innerHTML = `<span class="icon">${icon}</span><span>${escapeHtml(ev)}</span>`;
      evidenceListEl.appendChild(li);
    });

    // Action Box
    const actionText = data.recommended_actions?.[0] || 'Standard safe browsing practices.';
    document.getElementById('action-text').textContent = actionText;

    // Telemetry pane
    const ti = data.threat_intel_result;
    if (ti?.matched) {
      document.getElementById('telemetry-ti-val').textContent = 'Threat Match!';
      document.getElementById('telemetry-ti-val').style.color = 'var(--danger)';
      document.getElementById('telemetry-ti-sub').textContent = ti.matched_entry || 'HaGeZi Blocklist';
    } else if (ti?.checked) {
      document.getElementById('telemetry-ti-val').textContent = 'Clean';
      document.getElementById('telemetry-ti-val').style.color = 'var(--safe)';
      document.getElementById('telemetry-ti-sub').textContent = 'Not in HaGeZi TIF';
    } else {
      document.getElementById('telemetry-ti-val').textContent = data.backend_available ? 'Unchecked' : 'Offline';
      document.getElementById('telemetry-ti-sub').textContent = data.backend_available ? 'No TI data' : 'Client heuristic fallback';
    }

    const ml = data.ml_result;
    if (ml?.probability_phishing !== undefined && ml.probability_phishing !== null) {
      const mlPct = (ml.probability_phishing * 100).toFixed(1) + '%';
      document.getElementById('telemetry-ml-val').textContent = mlPct;
      document.getElementById('telemetry-ml-sub').textContent = ml.model_version || 'TF-IDF LogisticReg';
    } else {
      document.getElementById('telemetry-ml-val').textContent = data.backend_available ? 'N/A' : 'Offline';
      document.getElementById('telemetry-ml-sub').textContent = data.backend_available ? 'Model not loaded' : 'Heuristic rule engine';
    }

    const tls = data.tls_findings;
    if (tls?.is_valid === true) {
      document.getElementById('telemetry-tls-val').textContent = 'Valid';
      document.getElementById('telemetry-tls-sub').textContent = tls.issuer ? tls.issuer.substring(0, 18) : 'Trusted CA';
    } else if (tls?.status === 'invalid') {
      document.getElementById('telemetry-tls-val').textContent = 'Invalid / Expired';
      document.getElementById('telemetry-tls-val').style.color = 'var(--danger)';
      document.getElementById('telemetry-tls-sub').textContent = tls.error || 'Untrusted';
    } else {
      document.getElementById('telemetry-tls-val').textContent = currentTabUrl.startsWith('https://') ? 'HTTPS (Active)' : 'HTTP (Insecure)';
      document.getElementById('telemetry-tls-sub').textContent = currentTabUrl.startsWith('https://') ? 'Standard TLS' : 'No Encryption';
    }

    const dns = data.dns_findings;
    if (dns?.resolution_successful === true) {
      document.getElementById('telemetry-dns-val').textContent = 'Resolved';
      document.getElementById('telemetry-dns-sub').textContent = dns.a_records?.[0] || 'Active DNS';
    } else if (dns?.resolution_successful === false) {
      document.getElementById('telemetry-dns-val').textContent = 'Failed';
      document.getElementById('telemetry-dns-sub').textContent = 'NXDOMAIN / Unresolved';
    } else {
      document.getElementById('telemetry-dns-val').textContent = 'Active';
      document.getElementById('telemetry-dns-sub').textContent = 'Browser Connected';
    }

    const engineMetaEl = document.getElementById('engine-meta');
    engineMetaEl.textContent = `Latency: ${data.processing_duration_ms || 0}ms · Backend: ${data.backend_available ? 'FastAPI Connected' : 'Offline (Local Guard)'}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Button: Copy URL
  document.getElementById('btn-copy-url').addEventListener('click', () => {
    if (currentTabUrl) {
      navigator.clipboard.writeText(currentTabUrl).then(() => {
        const btn = document.getElementById('btn-copy-url');
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = '📋', 1200);
      });
    }
  });

  // Button: Retry health
  document.getElementById('btn-retry-health').addEventListener('click', async () => {
    statusText.textContent = 'Retrying...';
    await refreshHealth();
    await loadTabStatus();
  });

  // Button: Re-scan
  document.getElementById('btn-rescan').addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, async () => {
      await loadTabStatus();
    });
  });

  // Button: Clear cache
  document.getElementById('btn-clear-cache').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, () => {
      const btn = document.getElementById('btn-clear-cache');
      btn.textContent = 'Cleared!';
      setTimeout(() => btn.textContent = 'Clear Cache', 1500);
      loadTabStatus();
    });
  });

  // Button: Open demo portal
  document.getElementById('btn-open-demo-portal').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('test/demo_portal.html') });
  });

  // Button: Open options
  document.getElementById('btn-open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Initial load
  await refreshHealth();
  await loadTabStatus();
});
