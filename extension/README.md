# CyberShield AI — Browser Extension (Manifest V3)

> **Task B — Priority 1 Implementation**  
> A Chromium Manifest V3 browser extension that integrates with the CyberShield AI FastAPI phishing endpoint, displays comprehensive URL risk assessments, and actively warns users before they voluntarily navigate to suspicious or malicious web properties.

---

## 🛡️ Key Features & Acceptance Criteria

| Requirement | Implementation Details | Acceptance Status |
|---|---|---|
| **Chromium Manifest V3** | Built strictly under Manifest V3 specifications (`service_worker`, modern action popup, scoped content scripts, declarative storage). | ✅ Verified |
| **Developer Mode Support** | Zero build step required; load directly as an unpacked extension in Chrome, Edge, or Brave. | ✅ Verified |
| **FastAPI Backend Integration** | Communicates with `POST /api/scan/url` and `GET /api/health` at `http://127.0.0.1:8000` (configurable in settings). | ✅ Verified |
| **Risk Assessment Display** | Live popup HUD featuring color-coded Risk Gauge, HaGeZi threat intelligence feed status, ML model probability, TLS validity, and DNS resolution telemetry. | ✅ Verified |
| **Voluntary Navigation Warning** | Dual-layer warning system: (1) Pre-navigation Interstitial redirect via `webNavigation.onBeforeNavigate`, and (2) Pre-click DOM link interception via content script. | ✅ Verified |
| **Graceful Offline Fallback** | Handles timeouts and unreachable API responses without breaking browsing or throwing unhandled exceptions. Seamlessly activates client-side heuristic rules. | ✅ Verified |
| **Safe Test Demonstrations** | Bundled interactive demo portal (`test/demo_portal.html`) offering one-click safe verification for safe, phishing, suspicious, and offline scenarios. | ✅ Verified |
| **Browser API Honesty** | Accurately documents Manifest V3 constraints and avoids false claims regarding synchronous remote API blocking. | ✅ Verified |

---

## 🏗️ Technical Architecture & Manifest V3 Reality

### Clarification on Browser Interception Capabilities
In Chromium Manifest V3, **extensions cannot perform synchronous blocking network interception with arbitrary external asynchronous API calls before the socket handshake begins**.
- The legacy `chrome.webRequestBlocking` API was intentionally deprecated and removed by Chromium for performance and security isolation.
- The replacement `declarativeNetRequest` API only operates on **static pre-compiled rule dictionaries**, and cannot dispatch an asynchronous HTTP `fetch()` to a local FastAPI ML backend before allowing or redirecting an in-flight socket request.

### How CyberShield AI Solves This Legally & Responsibly
CyberShield AI achieves reliable protection without violating Manifest V3 design principles:

1. **Pre-Navigation Lifecycle Interception (`chrome.webNavigation.onBeforeNavigate`)**:
   - Captures the initial navigation event before page rendering.
   - Queries the high-speed local cache and fast heuristic pre-evaluator.
   - If the domain matches the HaGeZi threat fixture (`phishing-test.example`) or exhibits high-confidence phishing indicators, the extension immediately calls `chrome.tabs.update()` to redirect the tab to an internal **Warning Interstitial (`warning/warning.html`)**.
2. **Pre-Click DOM Interception (`content/content.js`)**:
   - Content scripts listen in the capture phase for user clicks on `<a>` tags.
   - If an external link is clicked, the destination is analyzed. High-risk targets trigger an immediate modal alert: *"Security Warning: Suspicious Link Target"*, preventing voluntary navigation unless the user explicitly acknowledges the risk.
3. **In-Page Risk Banner (`content/content.js` + `content/content.css`)**:
   - If a background scan categorizes an active destination as `phishing` or `suspicious`, a prominent floating warning banner is rendered at the top of the viewport with evidence summary and a 1-click "Leave Site" button.
4. **Resilient Offline Heuristic Engine (`background/heuristics.js`)**:
   - If the FastAPI backend is down, unreachable, or times out (>3.8s), the extension does not fail or hang. It switches instantly to local heuristics (raw IP hostnames, Punycode/IDN homographs, deceptive keyword accumulation, suspicious TLDs, and HaGeZi offline fixtures).

---

## 📁 Extension File Structure

```
extension/
├── manifest.json              # Chromium Manifest V3 declaration
├── icons/                     # Generated extension icons (16, 32, 48, 128 px)
├── background/
│   ├── service_worker.js      # Background lifecycle, navigation interceptor & router
│   ├── api_client.js          # FastAPI communication with timeout & offline fallback
│   ├── heuristics.js          # Client-side offline phishing & lexical analysis engine
│   └── cache.js               # TTL cache, session bypass whitelist, and scan statistics
├── content/
│   ├── content.js             # In-page link click interception & warning banner injector
│   └── content.css            # Scoped dark cybersecurity styles for modal and banner
├── popup/
│   ├── popup.html             # Main extension HUD popup
│   ├── popup.css              # Cyber-slate theme with glowing status indicators
│   └── popup.js               # Dynamic risk gauge, telemetry drawer, and health monitor
├── warning/
│   ├── warning.html           # Full-screen interstitial warning page
│   ├── warning.css            # High-impact alert layout
│   └── warning.js             # Interstitial actions (Back to Safety / Proceed Anyway)
├── options/
│   ├── options.html           # Settings UI & Manifest V3 architectural explainer
│   ├── options.css            # Form and toggle styling
│   └── options.js             # Settings persistence and live API health tester
├── test/
│   ├── demo_portal.html       # Interactive test suite for developers & evaluators
│   ├── demo_portal.css        # Test harness layout
│   └── demo_portal.js         # Pre-configured test cases & offline simulation
└── README.md                  # This documentation
```

---

## 🚀 How to Install in Developer Mode

### Step 1: Open Extensions Page in Chromium
Open any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Arc):
- **Chrome / Brave:** Navigate to `chrome://extensions`
- **Edge:** Navigate to `edge://extensions`

### Step 2: Enable Developer Mode
- In the top-right corner, toggle the **Developer mode** switch to **ON**.

### Step 3: Load the Extension
1. Click the **Load unpacked** button in the top-left toolbar.
2. Select the `extension` folder located at:
   ```
   <repo-root>/cns-project/extension
   ```
3. The **CyberShield AI — Phishing & URL Threat Guard** extension will immediately appear in your extensions list.
4. (Optional) Click the Extensions puzzle piece in your browser toolbar and pin **CyberShield AI** for quick access.

---

## 🧪 Testing & Verification Guide

CyberShield AI includes an interactive **Demo & Verification Suite** built directly into the extension.

### Method 1: Using the Built-In Demo Portal
1. Click the CyberShield extension icon in the toolbar.
2. Click the **Demo & Suite** tab, then select **Interactive Demo & Test Suite** (or open `test/demo_portal.html` directly).
3. Test the available scenarios:
   - **Scenario 1 (Benign / Safe):** Scans `https://github.com` → Result: `SAFE` (green badge, low risk score).
   - **Scenario 2 (HaGeZi Blocklist Match):** Scans `http://phishing-test.example` → Result: `PHISHING` (matches HaGeZi offline fixture, triggers Interstitial Warning).
   - **Scenario 3 (Heuristic Deception):** Scans `http://paypal-verification-account-security-alert.xyz/login` → Result: `SUSPICIOUS` (detects deceptive keywords and suspicious TLD).
   - **Scenario 4 (In-Page Link Interception):** Click the link on the demo page → Content script immediately intercepts the click and displays the pre-navigation warning modal.
   - **Scenario 5 (Offline Fallback):** Simulates an unreachable port (9999) → Validates that offline heuristics engage smoothly without blocking browsing.

### Method 2: Testing with Live FastAPI Backend
1. Start the FastAPI backend:
   ```powershell
   cd backend
   uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. In the extension popup, observe the connection pill change to **Online (latency in ms)**.
3. Browse to any web page; the extension badge automatically updates:
   - Green `✓` = Safe
   - Amber `?` = Suspicious
   - Red `!` = Phishing threat

---

## ⚙️ Configuration Options

Open the extension options by right-clicking the extension icon and selecting **Options** (or via the Popup):
- **Backend API URL:** Change the default `http://127.0.0.1:8000` to a remote or containerized server.
- **Test Connection:** Live health check against `/api/health`.
- **Pre-Navigation Interstitial:** Enable or disable full-screen redirection.
- **Link Click Interceptor:** Enable or disable pre-navigation link inspection.
- **In-Page Warning Banner:** Enable or disable floating banners on dangerous websites.
- **Clear Cache:** Resets the local cache and session bypass authorizations.
