/**
 * CyberShield AI — Manifest V3 Background Service Worker
 *
 * Coordinates URL lifecycle events, API communication, pre-navigation
 * warnings, badge updates, and message routing.
 */

import { scanUrl, checkBackendHealth } from './api_client.js';
import { storageManager } from './cache.js';
import { evaluateHeuristics, extractHostname } from './heuristics.js';

// Initialize storage and cache on worker startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[CyberShield SW] Installed/Updated:', details.reason);
  await storageManager.init();
});

// Update badge appearance according to risk category
function updateBadge(tabId, category) {
  if (!tabId || tabId < 0) return;

  let text = '';
  let color = '#6b7280'; // gray

  if (category === 'phishing') {
    text = '!';
    color = '#ef4444'; // Red
  } else if (category === 'suspicious') {
    text = '?';
    color = '#f59e0b'; // Amber
  } else if (category === 'safe') {
    text = '✓';
    color = '#10b981'; // Emerald
  } else if (category === 'inconclusive') {
    text = '•';
    color = '#6366f1'; // Indigo
  }

  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}

// ---------------------------------------------------------------------------
// 1. Pre-Navigation Interception via webNavigation.onBeforeNavigate
// ---------------------------------------------------------------------------
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only inspect top-level frame navigations
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return;
  }

  // Skip warning interstitial pages itself
  const warningUrl = chrome.runtime.getURL('warning/warning.html');
  if (url.startsWith(warningUrl)) return;

  const settings = await storageManager.getSettings();
  if (!settings.interstitialRedirectEnabled) return;

  const hostname = extractHostname(url);
  if (!hostname) return;

  // Check if user already chose to bypass warning for this session
  if (storageManager.isBypassed(hostname)) {
    return;
  }

  // Check cache first for known verdicts
  const cached = storageManager.getCachedResult(hostname);
  if (cached && (cached.risk_category === 'phishing' || cached.risk_category === 'suspicious')) {
    const redirectUrl = `${warningUrl}?url=${encodeURIComponent(url)}&risk=${cached.risk_category}&reason=${encodeURIComponent(cached.key_evidence?.[0] || 'Flagged threat')}&offline=${!cached.backend_available}`;
    chrome.tabs.update(details.tabId, { url: redirectUrl });
    return;
  }

  // Fast pre-flight heuristic evaluation
  const fastCheck = evaluateHeuristics(url);
  if (fastCheck.risk_category === 'phishing' || fastCheck.is_test_fixture) {
    const redirectUrl = `${warningUrl}?url=${encodeURIComponent(url)}&risk=${fastCheck.risk_category}&reason=${encodeURIComponent(fastCheck.evidence[0] || 'Known threat')}&offline=false`;
    chrome.tabs.update(details.tabId, { url: redirectUrl });
  }
});

// ---------------------------------------------------------------------------
// 2. Active Tab URL Analysis on Page Complete
// ---------------------------------------------------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      chrome.action.setBadgeText({ tabId, text: '' });
      return;
    }

    const settings = await storageManager.getSettings();
    if (!settings.autoScanEnabled) return;

    try {
      const result = await scanUrl(url);
      updateBadge(tabId, result.risk_category);

      // Notify content script if site is risky and in-page banner is enabled
      if (settings.warningBannerEnabled && (result.risk_category === 'phishing' || result.risk_category === 'suspicious')) {
        chrome.tabs.sendMessage(tabId, {
          action: 'SHOW_WARNING_BANNER',
          data: result
        }).catch(() => {
          // Content script may not be loaded yet or tab restricted
        });
      }
    } catch (err) {
      console.warn('[CyberShield SW] Tab scan error:', err);
    }
  }
});

// Update badge when user switches active tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      chrome.action.setBadgeText({ tabId: activeInfo.tabId, text: '' });
      return;
    }

    const hostname = extractHostname(tab.url);
    const cached = storageManager.getCachedResult(hostname);
    if (cached) {
      updateBadge(activeInfo.tabId, cached.risk_category);
    } else {
      // Quick scan if not yet cached
      const result = await scanUrl(tab.url);
      updateBadge(activeInfo.tabId, result.risk_category);
    }
  } catch (err) {
    // Ignore closed tab errors
  }
});

// ---------------------------------------------------------------------------
// 3. Message Routing for Popup, Content Scripts, and Warning Page
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsync = async () => {
    switch (message.action) {
      case 'SCAN_URL': {
        const result = await scanUrl(message.url);
        return result;
      }

      case 'GET_CURRENT_TAB_STATUS': {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.url) {
          return { error: 'No active web tab found' };
        }
        const result = await scanUrl(activeTab.url);
        return { ...result, tabTitle: activeTab.title, tabId: activeTab.id };
      }

      case 'CHECK_LINK': {
        // Fast link evaluation triggered by content script click interceptor
        const targetUrl = message.url;
        const hostname = extractHostname(targetUrl);

        // Check if bypassed
        if (storageManager.isBypassed(hostname)) {
          return { safe_to_proceed: true };
        }

        const cached = storageManager.getCachedResult(hostname);
        if (cached) {
          return {
            safe_to_proceed: cached.risk_category === 'safe',
            risk_category: cached.risk_category,
            evidence: cached.key_evidence || [],
            result: cached
          };
        }

        // Fast offline heuristic
        const fast = evaluateHeuristics(targetUrl);
        return {
          safe_to_proceed: fast.risk_category === 'safe',
          risk_category: fast.risk_category,
          evidence: fast.evidence,
          fast
        };
      }

      case 'BYPASS_WARNING': {
        const { hostname, targetUrl, tabId } = message;
        if (hostname) {
          storageManager.addBypass(hostname);
        }
        if (targetUrl) {
          if (tabId) {
            chrome.tabs.update(tabId, { url: targetUrl });
          } else {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab) chrome.tabs.update(activeTab.id, { url: targetUrl });
          }
        }
        return { success: true };
      }

      case 'CHECK_HEALTH': {
        const health = await checkBackendHealth(message.customUrl);
        return health;
      }

      case 'GET_STATS': {
        const stats = await storageManager.getStats();
        return stats;
      }

      case 'GET_SETTINGS': {
        const settings = await storageManager.getSettings();
        return settings;
      }

      case 'UPDATE_SETTINGS': {
        const updated = await storageManager.updateSettings(message.settings);
        return updated;
      }

      case 'CLEAR_CACHE': {
        await storageManager.clearAllCache();
        return { success: true };
      }

      default:
        return { error: 'Unknown action' };
    }
  };

  handleAsync().then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || 'Operation failed' });
  });

  return true; // Keep channel open for async sendResponse
});
