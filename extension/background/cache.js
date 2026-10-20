/**
 * CyberShield AI — Cache & Storage Manager
 *
 * Manages scan result caching, user bypass lists, stats, and extension settings.
 */

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL

const DEFAULT_SETTINGS = {
  backendUrl: 'http://127.0.0.1:8000',
  autoScanEnabled: true,
  linkInterceptorEnabled: true,
  warningBannerEnabled: true,
  interstitialRedirectEnabled: true,
  sensitivity: 'balanced' // conservative | balanced | aggressive
};

class StorageManager {
  constructor() {
    this.memoryCache = new Map();
    this.sessionBypassList = new Set();
  }

  /**
   * Initializes storage with defaults if not present
   */
  async init() {
    try {
      const data = await chrome.storage.local.get(['settings', 'stats']);
      if (!data.settings) {
        await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      }
      if (!data.stats) {
        await chrome.storage.local.set({
          stats: {
            scansCount: 0,
            threatsDetected: 0,
            suspiciousWarned: 0,
            safeCount: 0,
            offlineScans: 0
          }
        });
      }
    } catch (e) {
      console.warn('[CyberShield Storage] Init warning:', e);
    }
  }

  /**
   * Retrieves active settings
   */
  async getSettings() {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      return { ...DEFAULT_SETTINGS, ...(settings || {}) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Updates settings
   */
  async updateSettings(newSettings) {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };
    await chrome.storage.local.set({ settings: merged });
    return merged;
  }

  /**
   * Gets cached scan result for a URL or hostname
   */
  getCachedResult(key) {
    if (!key) return null;
    const entry = this.memoryCache.get(key.toLowerCase());
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.memoryCache.delete(key.toLowerCase());
      return null;
    }
    return entry.data;
  }

  /**
   * Caches a scan result
   */
  setCachedResult(key, data) {
    if (!key) return;
    this.memoryCache.set(key.toLowerCase(), {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Checks if user has temporarily bypassed a warning for this hostname
   */
  isBypassed(hostname) {
    if (!hostname) return false;
    return this.sessionBypassList.has(hostname.toLowerCase());
  }

  /**
   * Adds hostname to temporary session bypass list
   */
  addBypass(hostname) {
    if (!hostname) return;
    this.sessionBypassList.add(hostname.toLowerCase());
  }

  /**
   * Clears bypass list
   */
  clearBypass() {
    this.sessionBypassList.clear();
  }

  /**
   * Increments scan and threat statistics
   */
  async recordScanStats(category, isOffline = false) {
    try {
      const { stats } = await chrome.storage.local.get('stats');
      const current = stats || {
        scansCount: 0,
        threatsDetected: 0,
        suspiciousWarned: 0,
        safeCount: 0,
        offlineScans: 0
      };

      current.scansCount++;
      if (isOffline) current.offlineScans++;

      if (category === 'phishing') {
        current.threatsDetected++;
      } else if (category === 'suspicious') {
        current.suspiciousWarned++;
      } else if (category === 'safe') {
        current.safeCount++;
      }

      await chrome.storage.local.set({ stats: current });
      return current;
    } catch (e) {
      console.warn('[CyberShield Stats] Failed to record stats:', e);
      return null;
    }
  }

  /**
   * Retrieves scan statistics
   */
  async getStats() {
    try {
      const { stats } = await chrome.storage.local.get('stats');
      return stats || {
        scansCount: 0,
        threatsDetected: 0,
        suspiciousWarned: 0,
        safeCount: 0,
        offlineScans: 0
      };
    } catch (e) {
      return { scansCount: 0, threatsDetected: 0, suspiciousWarned: 0, safeCount: 0, offlineScans: 0 };
    }
  }

  /**
   * Clears in-memory cache and saved scan stats
   */
  async clearAllCache() {
    this.memoryCache.clear();
    this.sessionBypassList.clear();
    await chrome.storage.local.set({
      stats: {
        scansCount: 0,
        threatsDetected: 0,
        suspiciousWarned: 0,
        safeCount: 0,
        offlineScans: 0
      }
    });
  }
}

export const storageManager = new StorageManager();
