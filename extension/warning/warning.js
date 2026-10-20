/**
 * CyberShield AI — Warning Interstitial Script
 *
 * Reads query params (url, risk, reason, offline), populates details,
 * and handles "Back to Safety" or "Proceed Anyway" bypass.
 */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get('url') || 'https://unknown-destination.example';
  const risk = (params.get('risk') || 'phishing').toLowerCase();
  const reason = params.get('reason') || '';
  const isOffline = params.get('offline') === 'true';

  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname;
  } catch (e) {
    hostname = targetUrl;
  }

  // Update DOM elements
  const targetUrlEl = document.getElementById('target-url');
  const riskBadgeEl = document.getElementById('risk-badge');
  const threatIconEl = document.getElementById('threat-icon');
  const warningHeadingEl = document.getElementById('warning-heading');
  const evidenceListEl = document.getElementById('evidence-list');

  targetUrlEl.textContent = targetUrl;

  if (risk === 'suspicious') {
    riskBadgeEl.textContent = 'SUSPICIOUS SITE';
    riskBadgeEl.className = 'badge-risk suspicious';
    threatIconEl.textContent = '⚠️';
    warningHeadingEl.textContent = 'Suspicious Website Warning';
  } else {
    riskBadgeEl.textContent = 'PHISHING DETECTED';
    riskBadgeEl.className = 'badge-risk phishing';
    threatIconEl.textContent = '🚨';
    warningHeadingEl.textContent = 'Deceptive Website Blocked';
  }

  // Build evidence list
  evidenceListEl.innerHTML = '';
  const evidenceItems = [];

  if (reason) {
    evidenceItems.push(reason);
  }

  if (isOffline) {
    evidenceItems.push('[Offline Mode] Evaluated via client-side heuristic rules because the CyberShield FastAPI backend was offline.');
  }

  if (hostname.includes('test.example') || hostname.includes('badactor.test')) {
    evidenceItems.push('Target matched HaGeZi offline threat intelligence fixture domain.');
  }

  if (evidenceItems.length === 0) {
    evidenceItems.push('High-confidence heuristic or threat intelligence match.');
    evidenceItems.push('URL structural anomalies consistent with social engineering or impersonation.');
  }

  evidenceItems.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    evidenceListEl.appendChild(li);
  });

  // Action: Back to safety
  document.getElementById('btn-back-safety').addEventListener('click', () => {
    if (window.history.length > 2) {
      window.history.go(-2);
    } else {
      window.location.href = 'https://www.google.com';
    }
  });

  // Action: Close tab
  document.getElementById('btn-close-tab').addEventListener('click', () => {
    window.close();
  });

  // Action: Proceed anyway (Bypass)
  document.getElementById('btn-proceed-unsafe').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'BYPASS_WARNING',
      hostname,
      targetUrl
    }, () => {
      window.location.href = targetUrl;
    });
  });
});
