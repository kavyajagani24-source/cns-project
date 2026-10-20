/**
 * CyberShield AI — Content Script
 *
 * Implements:
 * 1. Pre-navigation link click inspection & modal warning
 * 2. In-page floating risk banner for flagged active destinations
 */

(() => {
  // Prevent duplicate injections
  if (window.__CYBERSHIELD_CONTENT_INITIALIZED__) return;
  window.__CYBERSHIELD_CONTENT_INITIALIZED__ = true;

  // -------------------------------------------------------------------------
  // 1. In-Page Warning Banner
  // -------------------------------------------------------------------------
  function showWarningBanner(data) {
    const existing = document.getElementById('cybershield-banner-root');
    if (existing) existing.remove();

    const category = data.risk_category || 'suspicious';
    const isPhishing = category === 'phishing';
    const evidenceText = data.key_evidence?.[0] || 'High risk indicators detected on this webpage';

    const root = document.createElement('div');
    root.id = 'cybershield-banner-root';

    root.innerHTML = `
      <div class="cybershield-banner ${isPhishing ? 'cybershield-banner-phishing' : 'cybershield-banner-suspicious'}">
        <div class="cybershield-banner-content">
          <div class="cybershield-banner-icon">${isPhishing ? '🚨' : '⚠️'}</div>
          <div class="cybershield-banner-text">
            <strong>CyberShield AI Alert: ${isPhishing ? 'Phishing Site Detected' : 'Suspicious Site Detected'}</strong>
            <span class="cybershield-banner-reason">${evidenceText}</span>
          </div>
        </div>
        <div class="cybershield-banner-actions">
          <button type="button" class="cybershield-btn cybershield-btn-leave" id="cybershield-banner-leave-btn">
            Leave Site Now
          </button>
          <button type="button" class="cybershield-btn cybershield-btn-dismiss" id="cybershield-banner-dismiss-btn" title="Dismiss banner">
            ✕
          </button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(root);

    document.getElementById('cybershield-banner-leave-btn')?.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'https://www.google.com';
      }
    });

    document.getElementById('cybershield-banner-dismiss-btn')?.addEventListener('click', () => {
      root.remove();
    });
  }

  // -------------------------------------------------------------------------
  // 2. Pre-Navigation Link Click Interceptor Modal
  // -------------------------------------------------------------------------
  function showLinkWarningModal(targetUrl, riskCategory, evidence, onProceed, onCancel) {
    const existing = document.getElementById('cybershield-modal-root');
    if (existing) existing.remove();

    const isPhishing = riskCategory === 'phishing';
    const modalRoot = document.createElement('div');
    modalRoot.id = 'cybershield-modal-root';

    const evidenceListHtml = (evidence || [])
      .slice(0, 3)
      .map(e => `<li>${e}</li>`)
      .join('');

    modalRoot.innerHTML = `
      <div class="cybershield-modal">
        <div class="cybershield-modal-header">
          <span style="font-size: 22px;">${isPhishing ? '🚨' : '⚠️'}</span>
          <h3>Security Warning: Suspicious Link Target</h3>
          <span class="cybershield-modal-badge ${isPhishing ? 'cybershield-badge-phishing' : 'cybershield-badge-suspicious'}">
            ${riskCategory.toUpperCase()}
          </span>
        </div>
        <div class="cybershield-modal-body">
          <p>CyberShield AI detected potential security risks with this link destination before navigation:</p>
          <div class="cybershield-url-box">${targetUrl}</div>
          ${evidenceListHtml ? `
            <strong>Observed Threat Indicators:</strong>
            <ul class="cybershield-evidence-list">
              ${evidenceListHtml}
            </ul>
          ` : ''}
          <p style="margin-top: 14px; font-size: 13px; color: #94a3b8;">
            Entering passwords, credit cards, or personal information on unverified sites exposes your accounts to compromise.
          </p>
        </div>
        <div class="cybershield-modal-footer">
          <button type="button" class="cybershield-btn cybershield-btn-cancel" id="cybershield-modal-cancel">
            Stay on This Page (Safe)
          </button>
          <button type="button" class="cybershield-btn cybershield-btn-proceed" id="cybershield-modal-proceed">
            Proceed Anyway
          </button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modalRoot);

    document.getElementById('cybershield-modal-cancel')?.addEventListener('click', () => {
      modalRoot.remove();
      if (onCancel) onCancel();
    });

    document.getElementById('cybershield-modal-proceed')?.addEventListener('click', () => {
      modalRoot.remove();
      if (onProceed) onProceed();
    });
  }

  // Intercept link clicks before navigation
  document.addEventListener('click', (event) => {
    // Find closest anchor tag
    const anchor = event.target.closest('a');
    if (!anchor || !anchor.href) return;

    const href = anchor.href;
    if (!href.startsWith('http://') && !href.startsWith('https://')) return;

    try {
      const targetUrl = new URL(href);
      const currentUrl = new URL(window.location.href);

      // Skip internal navigation within same origin (unless hash/target is strange)
      if (targetUrl.hostname === currentUrl.hostname) {
        return;
      }

      // Check with background service worker
      chrome.runtime.sendMessage({
        action: 'CHECK_LINK',
        url: href
      }, (response) => {
        if (chrome.runtime.lastError || !response) return;

        if (response.safe_to_proceed === false && (response.risk_category === 'phishing' || response.risk_category === 'suspicious')) {
          // Pause navigation and pop modal
          showLinkWarningModal(
            href,
            response.risk_category,
            response.evidence,
            () => {
              // User confirmed: bypass and proceed
              chrome.runtime.sendMessage({
                action: 'BYPASS_WARNING',
                hostname: targetUrl.hostname
              }, () => {
                window.location.href = href;
              });
            },
            () => {
              // User cancelled: do nothing
            }
          );
        }
      });
    } catch (e) {
      // Invalid URL, let browser handle
    }
  }, true);

  // -------------------------------------------------------------------------
  // 3. Message Listener from Background Worker
  // -------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_WARNING_BANNER' && message.data) {
      showWarningBanner(message.data);
      sendResponse({ received: true });
    }
  });
})();
