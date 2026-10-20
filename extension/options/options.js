/**
 * CyberShield AI — Options Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const backendUrlInput = document.getElementById('backend-url-input');
  const toggleInterstitial = document.getElementById('toggle-interstitial');
  const toggleLinkInterceptor = document.getElementById('toggle-link-interceptor');
  const toggleWarningBanner = document.getElementById('toggle-warning-banner');
  const toggleAutoScan = document.getElementById('toggle-auto-scan');

  const testBtn = document.getElementById('btn-test-connection');
  const testResultBox = document.getElementById('test-result-box');
  const saveBtn = document.getElementById('btn-save-settings');
  const clearBtn = document.getElementById('btn-clear-all');
  const clearStatus = document.getElementById('clear-status');

  // Load existing settings
  chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, (settings) => {
    if (!settings) return;
    backendUrlInput.value = settings.backendUrl || 'http://127.0.0.1:8000';
    toggleInterstitial.checked = settings.interstitialRedirectEnabled ?? true;
    toggleLinkInterceptor.checked = settings.linkInterceptorEnabled ?? true;
    toggleWarningBanner.checked = settings.warningBannerEnabled ?? true;
    toggleAutoScan.checked = settings.autoScanEnabled ?? true;
  });

  // Test backend connection
  testBtn.addEventListener('click', () => {
    const customUrl = backendUrlInput.value.trim();
    testBtn.textContent = 'Testing...';
    testResultBox.className = 'test-result-box';
    testResultBox.style.display = 'none';

    chrome.runtime.sendMessage({ action: 'CHECK_HEALTH', customUrl }, (res) => {
      testBtn.textContent = 'Test Connection';
      if (chrome.runtime.lastError || !res) {
        showTestResult(false, 'Failed to communicate with extension background worker.');
        return;
      }

      if (res.online) {
        showTestResult(
          true,
          `Connected successfully! Version: ${res.version} · Response latency: ${res.latency_ms}ms · Database: ${res.db_connected ? 'MongoDB Connected' : 'Running (No DB Persistence)'}`
        );
      } else {
        showTestResult(
          false,
          `Connection failed (${res.error || 'Server offline'}). Ensure FastAPI is running on ${res.baseUrl} (e.g. \`uvicorn app.main:app --port 8000\`).`
        );
      }
    });
  });

  function showTestResult(success, message) {
    testResultBox.className = `test-result-box ${success ? 'success' : 'error'}`;
    testResultBox.textContent = message;
    testResultBox.style.display = 'block';
  }

  // Save settings
  saveBtn.addEventListener('click', () => {
    const updated = {
      backendUrl: backendUrlInput.value.trim(),
      interstitialRedirectEnabled: toggleInterstitial.checked,
      linkInterceptorEnabled: toggleLinkInterceptor.checked,
      warningBannerEnabled: toggleWarningBanner.checked,
      autoScanEnabled: toggleAutoScan.checked
    };

    saveBtn.textContent = 'Saving...';
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated }, () => {
      saveBtn.textContent = 'Saved!';
      setTimeout(() => saveBtn.textContent = 'Save Settings', 1200);
    });
  });

  // Clear cache and bypass
  clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, () => {
      clearStatus.textContent = 'Cache & bypass whitelist cleared!';
      setTimeout(() => clearStatus.textContent = '', 2500);
    });
  });
});
