/**
 * CyberShield AI — Client-side Offline Heuristics Engine
 *
 * Provides fast, local URL risk assessment when the FastAPI backend
 * is unavailable or for instant pre-navigation evaluation.
 */

// Offline test fixture domains matching backend HaGeZi fixtures
const OFFLINE_THREAT_FIXTURES = new Set([
  'phishing-test.example',
  'malware-test.example',
  'badactor.test'
]);

// Suspicious keywords commonly found in credential harvesting & phishing URLs
const SUSPICIOUS_KEYWORDS = [
  'login', 'signin', 'sign-in', 'log-in', 'verify', 'verification',
  'account-update', 'update-account', 'security-alert', 'banking',
  'paypal', 'appleid', 'netflix-billing', 'microsoft-online',
  'metamask', 'wallet-connect', 'credential', 'recover-account',
  'auth-confirm', 'confirm-identity', 'passcode', 'webscr', 'ebayisapi'
];

// Suspicious or heavily abused TLDs
const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'click', 'buzz', 'online', 'club', 'work', 'cam',
  'country', 'stream', 'gq', 'cf', 'ml', 'tk', 'ga', 'bid', 'loan'
]);

// Trusted major domains (helps avoid false positives during local heuristics)
const TRUSTED_DOMAINS = new Set([
  'google.com', 'github.com', 'microsoft.com', 'apple.com', 'amazon.com',
  'wikipedia.org', 'cloudflare.com', 'mozilla.org', 'stackoverflow.com',
  'youtube.com', 'linkedin.com', 'twitter.com', 'x.com'
]);

/**
 * Normalizes and extracts hostname from URL string
 */
export function extractHostname(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

/**
 * Checks if hostname is a raw IP address (IPv4)
 */
export function isIpAddress(hostname) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(hostname)) return false;
  const parts = hostname.split('.').map(Number);
  return parts.every(p => p >= 0 && p <= 255);
}

/**
 * Analyzes URL using fast offline heuristics
 * @param {string} urlStr 
 * @returns {Object} Structured heuristic evaluation
 */
export function evaluateHeuristics(urlStr) {
  const evidence = [];
  const flags = [];
  let score = 0; // 0 (Safe) to 100 (Phishing)

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    return {
      risk_category: 'inconclusive',
      risk_score: 50,
      evidence: ['Malformed URL structure'],
      flags: ['malformed_url'],
      is_test_fixture: false,
      recommended_actions: ['Do not navigate to unparseable URLs.']
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const search = parsed.search.toLowerCase();
  const fullUrl = urlStr.toLowerCase();

  // 1. Direct match with offline threat intelligence fixture
  if (OFFLINE_THREAT_FIXTURES.has(hostname) || Array.from(OFFLINE_THREAT_FIXTURES).some(d => hostname.endsWith('.' + d))) {
    evidence.push(`Hostname matches offline threat test fixture: ${hostname}`);
    flags.push('threat_intel_fixture_match');
    return {
      risk_category: 'phishing',
      risk_score: 98,
      evidence,
      flags,
      is_test_fixture: true,
      recommended_actions: [
        'Do not enter credentials, personal data, or passwords.',
        'Close this tab immediately.'
      ]
    };
  }

  // 2. Trusted domain bypass for clean sites
  for (const trusted of TRUSTED_DOMAINS) {
    if (hostname === trusted || hostname.endsWith('.' + trusted)) {
      return {
        risk_category: 'safe',
        risk_score: 5,
        evidence: [`Recognized reputable domain (${trusted})`],
        flags: ['reputable_domain'],
        is_test_fixture: false,
        recommended_actions: ['Standard safe browsing practices.']
      };
    }
  }

  // 3. Raw IP Address in URL
  if (isIpAddress(hostname)) {
    score += 45;
    evidence.push(`Direct IP address used as hostname (${hostname}) instead of a registered domain`);
    flags.push('ip_address_hostname');
  }

  // 4. Punycode / IDN Homograph attack (e.g. xn--)
  if (hostname.includes('xn--')) {
    score += 40;
    evidence.push('Punycode / IDN homograph character encoding detected in domain');
    flags.push('punycode_detected');
  }

  // 5. Insecure protocol on sensitive path
  if (parsed.protocol === 'http:') {
    score += 15;
    evidence.push('Insecure HTTP protocol used without encryption');
    flags.push('unencrypted_http');
  }

  // 6. Suspicious TLD check
  const domainParts = hostname.split('.');
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += 20;
    evidence.push(`Domain uses high-abuse top-level domain (.${tld})`);
    flags.push('suspicious_tld');
  }

  // 7. Excessive subdomains
  if (domainParts.length >= 4) {
    score += 20;
    evidence.push(`Excessive subdomain depth (${domainParts.length} levels) often used to obscure true domain`);
    flags.push('excessive_subdomains');
  }

  // 8. Embedded '@' symbol in URL
  if (urlStr.includes('@')) {
    score += 35;
    evidence.push('Obfuscated user-info "@" symbol present in URL string');
    flags.push('at_symbol_obfuscation');
  }

  // 9. Excessive hyphens in hostname
  const hyphenCount = (hostname.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    score += 20;
    evidence.push(`Unusually high number of hyphens (${hyphenCount}) in hostname`);
    flags.push('excessive_hyphens');
  }

  // 10. Credential & phishing keywords in hostname or path
  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter(kw => fullUrl.includes(kw));
  if (matchedKeywords.length > 0) {
    const kwWeight = Math.min(matchedKeywords.length * 20, 50);
    score += kwWeight;
    evidence.push(`Suspicious credential harvesting tokens detected: ${matchedKeywords.slice(0, 4).join(', ')}`);
    flags.push('suspicious_keywords');
  }

  // Determine risk category based on aggregated score
  let risk_category = 'safe';
  if (score >= 65) {
    risk_category = 'phishing';
  } else if (score >= 35) {
    risk_category = 'suspicious';
  } else if (score > 10) {
    risk_category = 'inconclusive';
  }

  const actions = [];
  if (risk_category === 'phishing') {
    actions.push('Do not enter passwords, credit cards, or personal information.');
    actions.push('Navigate away from this page.');
  } else if (risk_category === 'suspicious') {
    actions.push('Verify the exact domain spelling in the address bar before interacting.');
    actions.push('Never download or execute files from unverified websites.');
  } else {
    actions.push('No obvious malicious heuristic patterns detected.');
  }

  return {
    risk_category,
    risk_score: Math.min(score, 99),
    evidence: evidence.length > 0 ? evidence : ['No high-risk lexical indicators found'],
    flags,
    is_test_fixture: false,
    recommended_actions: actions
  };
}
