/**
 * CyberShield AI — Backend API Client
 *
 * Communicates with FastAPI endpoints (`/api/scan/url`, `/api/health`).
 * Features bounded timeouts and seamless offline heuristic fallback.
 */

import { evaluateHeuristics, extractHostname } from './heuristics.js';
import { storageManager } from './cache.js';

const TIMEOUT_MS = 3800; // 3.8s timeout for live API calls

/**
 * Tests connection to FastAPI backend
 */
export async function checkBackendHealth(customUrl = null) {
  const settings = await storageManager.getSettings();
  const baseUrl = (customUrl || settings.backendUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const start = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);
    const latency = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        status: data.status || 'ok',
        version: data.version || '1.0.0',
        db_connected: data.database_connected ?? false,
        latency_ms: latency,
        baseUrl
      };
    } else {
      return {
        online: false,
        status: `HTTP ${res.status}`,
        error: `Backend responded with status code ${res.status}`,
        latency_ms: latency,
        baseUrl
      };
    }
  } catch (err) {
    clearTimeout(timer);
    const latency = Math.round(performance.now() - start);
    return {
      online: false,
      status: 'unreachable',
      error: err.name === 'AbortError' ? 'Connection timed out' : 'Connection refused / offline',
      latency_ms: latency,
      baseUrl
    };
  }
}

/**
 * Scans a URL using FastAPI backend with automatic fallback to heuristics
 * @param {string} urlStr
 * @returns {Promise<Object>} Standardized scan result
 */
export async function scanUrl(urlStr) {
  if (!urlStr || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
    return {
      url: urlStr,
      risk_category: 'safe',
      status: 'skipped',
      backend_available: true,
      key_evidence: ['Internal or non-web URL format (e.g., chrome://, file://)'],
      explanations: ['Internal browser or non-HTTP protocols are not scanned.'],
      recommended_actions: []
    };
  }

  const hostname = extractHostname(urlStr);

  // Check cache first
  const cached = storageManager.getCachedResult(hostname);
  if (cached) {
    return { ...cached, cached: true };
  }

  const settings = await storageManager.getSettings();
  const baseUrl = (settings.backendUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const start = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/scan/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url: urlStr }),
      signal: controller.signal
    });

    clearTimeout(timer);
    const latency = Math.round(performance.now() - start);

    if (response.ok) {
      const data = await response.json();
      const formatted = {
        scan_id: data.scan_id || `scan_${Date.now()}`,
        url: urlStr,
        normalized_hostname: data.normalized_hostname || hostname,
        risk_category: data.risk_category || 'safe',
        status: 'completed',
        backend_available: true,
        processing_duration_ms: latency,
        ml_result: data.ml_result || { available: false },
        threat_intel_result: data.threat_intel_result || { checked: false, matched: false },
        dns_findings: data.dns_findings || { resolution_successful: true },
        tls_findings: data.tls_findings || { status: 'unavailable' },
        key_evidence: data.key_evidence || [],
        explanations: data.explanations || [],
        recommended_actions: data.recommended_actions || []
      };

      // Cache result and record stats
      storageManager.setCachedResult(hostname, formatted);
      await storageManager.recordScanStats(formatted.risk_category, false);
      return formatted;
    } else {
      throw new Error(`API returned HTTP ${response.status}`);
    }
  } catch (err) {
    clearTimeout(timer);
    const latency = Math.round(performance.now() - start);

    // Backend is unavailable or timed out -> execute offline heuristics
    const heuristic = evaluateHeuristics(urlStr);
    const offlineResult = {
      scan_id: `offline_${Date.now()}`,
      url: urlStr,
      normalized_hostname: hostname,
      risk_category: heuristic.risk_category,
      status: 'offline_fallback',
      backend_available: false,
      processing_duration_ms: latency,
      offline_reason: `FastAPI server at ${baseUrl} is unavailable (${err.message || 'connection failed'}). Running offline heuristic guard.`,
      heuristic_score: heuristic.risk_score,
      ml_result: {
        available: false,
        error: 'Backend ML service offline'
      },
      threat_intel_result: {
        checked: heuristic.is_test_fixture,
        matched: heuristic.is_test_fixture,
        matched_entry: heuristic.is_test_fixture ? hostname : null,
        source_name: heuristic.is_test_fixture ? 'HaGeZi Offline Fixture (Client)' : null
      },
      dns_findings: {
        resolution_successful: null,
        available: false
      },
      tls_findings: {
        status: 'unavailable'
      },
      key_evidence: [
        `[Offline Heuristic Mode] ${err.name === 'AbortError' ? 'Scan timed out' : 'Backend offline'}`,
        ...heuristic.evidence
      ],
      explanations: [
        'The extension evaluated this URL using local heuristic rules because the CyberShield FastAPI backend is currently unreachable.',
        ...heuristic.recommended_actions
      ],
      recommended_actions: heuristic.recommended_actions
    };

    // Cache fallback result briefly
    storageManager.setCachedResult(hostname, offlineResult);
    await storageManager.recordScanStats(offlineResult.risk_category, true);
    return offlineResult;
  }
}
