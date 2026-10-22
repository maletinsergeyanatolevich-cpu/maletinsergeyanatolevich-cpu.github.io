# Q-079 — wallet-only stage B4a, 2026-10-22. NO PRODUCTION RELEASE.

## Only wallet scope

Preserve installed PWA and all existing 16 screens, auth/users/rights/devices/sessions, NOM/index, Settings and media. Stage branch contains wallet2.js, wallet2.css, wallet2-bridge.js, isolated app.js/bootstrap.js changes behind a default-OFF release flag, and new wallet2-gas-bundle.js for the existing Apps Script. NO global CFG.SPREADSHEET_ID edit. Do not merge/deploy before an exact owner-reviewed cutover plan + separate DANGEROUS authorization.

### Tests

- Locally reproduced 178/178 prior tests and then 190/190 after hardening, Node v22, 0 failed; 32 financial engine, 38 fake backend, 36 read-only gateway, 32 synthetic GAS ledger, 4 GAS bundle, 44 mobile UI, 4 bridge tests (total 190).
- Wallet2 server USER wallet.add is now deliberately restricted to ordinary CASH_RECEIPT and OPERATING_EXPENSE. All other 22 events ADMIN1-only pending explicit owner approval of granular permissions; *existing user rights in live table unchanged*. Caller role/permissions/actor claims are never authorized.
- UI mirrors that conservative server rule; same-user token/device change clears displayed Wallet2 ledger; Tomsk date uses explicit ISO parts.
- GAS adapter now requires exact new `event_json` sheet header and verifies immutable complete-event hash, revision, locked writes, generation, and server session/device. No fallback to prior `Финансы`, `Заказы`, `Кошелёк` or cached finance. Mock writes confirm same-ID retries do not duplicate.
- On isolated previous stage spreadsheet ID `1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE`, created only `_W2_CONTROL` and `_W2_EVENTS` (additional Wallet-only test sheets). Control row: `Q079.STAGE.20261021.001`, STAGING_ONLY, boolean FALSE for writes, 2026-10-21, Asia/Tomsk, RUB, NOT_GRANTED. `_W2_EVENTS!A1` = `event_json`. A2 synthetic connector connectivity marker written/read back/cleared and confirmed no longer exists; **this was Google Sheets connector, NOT real Apps Script execution and NOT a valid money event**.
- Latest READ-ONLY old master primary-key counts 2026-10-22: `Финансы` 106 rows (through row 107), `Заказы` 9 rows (through 10), `Расчёты с партнёрами` 2 (through 3), `Обязательства` 1 (through 2). Counts are not whole-sheet backup hashes, are subject to change prior to freeze.

### Hard remaining gates

1. Real GAS project integration and dedicated *staging* deployment with existing auth, registered device and correct ledger pinning; test ADMIN1/USER write/read, duplicate retry, session rotation, crash/timeout, finance math, 2-phone propagation. **Not yet performed**.
2. Wallet screen QA on physical smartphone, pending-outbox quarantine, offline and re-login; **not yet performed**. No production UI is available yet.
3. Opening facts: current model supports owner `OPENING_CONFIRM` for zero business generation only; any nonzero opening cash/debt/stock must have a separate correctly audited entry path before release, not be inferred from prior history. Owner may confirm genuine zero only explicitly.
4. Fresh full archival copy and readback with row counts/formulas/media dependencies and checksums, exact freeze time and exact `DANGEROUS` card before any old Finance/Order wipe. If archive fails, STOP; no automatic deletion even though the owner broadly authorized the option. A separate exact unbacked-data destruction confirmation is required.
5. Independent SYS review, final owner acceptance, production cutover and release/deploy authority. Keep MAIN and working Google master untouched until then.

## Next safe code focus

Test real GAS staging endpoint and make receipt->server->second session visible; improve opening-fact entry and mobile form usability. Only changed Wallet code covered; no NOM/Calculator/Gallery rewrites/retests.
