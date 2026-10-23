# Q079 B4H — exact private canary mobile config — 2026-10-23

Owner supplied the separate owner-only Apps Script /exec URL. This is not a token; do not publish the endpoint into production GitHub Pages main.

Verified ZIP: https://drive.google.com/file/d/17U_VttpwCxP_pH1WEHVBkz6jJtpANJp6/view
SHA-256: d013e2ec9c31c2079ee1cc82ae6e9ae00beb7065a425ef0fdb4bff844459140f
Drive directory: ПРОИЗВОДСТВО / 05_PWA — ПРИЛОЖЕНИЕ / 07_Backend sync.

ZIP contents: q079-canary-config.js with owner-supplied separate endpoint, assets/wallet2-bridge.js strict isolated stage dispatcher, assets/wallet2.js, assets/wallet2.css, tests and Russian README. 21/21 local tests PASS. The user-provided endpoint is embedded only in the private test configuration in the ZIP, not in this repository document.

Client remaps only wallet2.bootstrap/read/commit to wallet2.stage.bootstrap/read/commit, restricts Q079.STAGE.20261021.001, and fails closed without production-finance fallback. Only in a PRIVATE copy of existing PWA, never public Pages main. The 15 other screens/auth/devices/rights and production backend URL stay unchanged.

Blockers: Existing canary owner-only /exec possibly inaccessible from cross-origin PWA fetch due Google auth/CORS. Never change access to Anyone on a GAS project still exposing legacy routes to live master. User's previous screenshot was plain ?action=ping, not wallet2.stage.canary or POST. No true canary E2E or mobile proof yet. The isolated stage write gate remains STAGING_ONLY/writeEnabled false/approval NOT_GRANTED and event journal is empty.

Remaining only two acceptance gates: (1) one controlled authenticated stage bootstrap/read/synthetic commit/retry on actual mobile with stage-only isolation, resolving private CORS transport properly; (2) source archive readback+exact destructive cutover/rollback approval+same existing PWA/GAS deployment release with second-device financial readback. No more micro-diagnostic scripts and no tests of unchanged tabs.

Q079 CLAIMED; Q029 IN_PROGRESS; NO PRODUCTION GO; no production data, authentication, master, published PWA or GAS changed.