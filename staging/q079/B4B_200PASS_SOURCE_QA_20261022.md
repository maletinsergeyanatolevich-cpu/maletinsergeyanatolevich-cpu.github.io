# Q079 Wallet2 B4B — SOURCE ONLY / 22 October 2026

Project PROD-PWA-001; parent Q029 IN_PROGRESS; Q079 CLAIMED; PRODUCTION NO-GO.

OWNER SCOPE: ONLY wallet screen and wallet handlers inside the original 16-screen PWA. Other 15 screens, NOM, rights, sessions, devices, gallery, calculator, settings, customer/order code unchanged.

LOCAL QA: Node v22 exact isolated 200/200 PASS, 0 fail. GAS V8 bundle invoked via VM with mocked SpreadsheetApp/LockService/auth: owner opening, receipt, duplicate ACK-loss retry, old epoch rejection, corrupt record detection; NOT live Apps Script or real phone.

GAS adapter fixes: bootstrap openingStatus and revision now read from complete verified Wallet2 journal; acceptedEventId and acceptedRequestId returned by every accepted commit and duplicate. Client checks matching accepted event/request IDs before dropping pending state.

Wallet UI fixes: pending event saved before dispatch in per-tab sessionStorage (without token or credentials), keyed by user ID and business generation, never automatically replayed. Explicit Retry same IDs; pending blocks new operation; changed account does not auto-replay. Browser storage denied leaves only ephemeral memory pending, so complete cross-reload recovery remains open.

ISOLATED STAGING GOOGLE: sheet ID 1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE, _W2_CONTROL STAGING_ONLY/writeEnabled FALSE/owner approval NOT_GRANTED, _W2_EVENTS header-only after connector probe. 49 total sheet tabs in STAGING, 2 wallet-specific. NEVER new production master.

PRODUCTION: live master 177IVzLUaNrzKScoRo0CjT5Zo7tJm5Bo0am2z9whAWdg still 30 original sheets with zero _W2_ tabs. PWA main version v0.3.28.4-rc-q029 unchanged; no GAS deployed, no archives or deletions, no cache/session/rights/NOM changes.

TEST EVIDENCE: Q079_WALLET2_B4B_200PASS_SOURCE_ONLY_20261022.zip 69218 bytes, SHA256 2b14c325e901579c904b4664a79d939675b376cc465feadc4c252b492ec036af; includes all local exact 200 tests and sources. Github branch contains key patches and focused tests; full branch-vs-archive parity requires separate verification before deploy. Do not claim remote branch itself 200/200.

BLOCKERS: Real GAS doPost/auth-backed endpoint E2E not performed; no Apps Script deployment integration available; headless Chromium mobile screenshot timed out and phone touch QA unverified. Verify durable recovery after reload, session expiry/role changes and live auth in separate nonprod Apps Script.

ARCHIVE POLICY: User gave general permission to archive and delete if archive impossible, but NO exact dangerous owner approval for enumerated live row deletion yet. Preserve source until verified archive counts+checksums/readback and independent SYS review, then present exact DANGEROUS destructive/rollback card. Old finance and orders never feed Wallet2, no old outbox replay.

NEXT SAFE: full staged source parity, isolated nonproduction Apps Script integration, mobile physical QA, exact archive/cutover gate. Main and production NO-GO.
