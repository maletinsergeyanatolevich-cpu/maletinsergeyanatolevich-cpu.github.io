# Q079 — FAST-TRACK Wallet2 in existing «Производство» — 23.10.2026

Decision: owner explicitly requests expedited two-deployment rollout and STOP repetitive single-function diagnostics. **Do not create another application or rewrite/test unchanged 15 tabs.**

## Fact-checked blockers, no wishful claims
- Owner deployed a separate new GAS /exec canary; screenshot on 2026-10-23 still shows GET `ping`: `ok:true`, version `backend-0.2.35-q029-finance-sortfix`. This proves only the old ping route in the canary deployment. It does not demonstrate that `wallet2.stage.canary` or HTTP POST works. Do not claim otherwise.
- Existing Code.gs editor source has `wallet2.stage.bootstrap/read/commit` dispatch to a stage router, and editor tests showed DENIED missing session. Whether those lines were included in most recent published canary version is not demonstrated.
- Native isolated stage spreadsheet 1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE, `_W2_CONTROL` generation Q079.STAGE.20261021.001, `STAGING_ONLY`, `writeEnabled=false`, `ownerApproval=NOT_GRANTED`; `_W2_EVENTS` empty. Stage has not run a permitted actual mutation (by design).
- Live master 177IVzLUaNrzKScoRo0CjT5Zo7tJm5Bo0am2z9whAWdg has no `_W2_CONTROL` or `_W2_EVENTS` yet. Old finance and orders still live and must NEVER feed Wallet2.
- Staging PWA branch client assets/wallet2.js uses `wallet2.bootstrap/read/commit`, but isolated stage server exposes `wallet2.stage.bootstrap/read/commit`; `assets/wallet2-bridge.js` still forwards calls to production `backendPost()`. The Wallet2 bootstrap flag in existing app remains off. This is the MAIN remaining **code integration** work; don't ask owner to run more tiny GAS inspector functions before resolving it.
- Wallet2 source is not production-deployed. Any manual script added to GAS editor without a published version is not exposed to existing /exec; for admin-only test deployments, browser cross-site fetch authentication/CORS must be verified. No user tokens should be shared.
- Last local suite 200+ tests is valuable code confidence, **not** phone-to-GAS-to-Sheets success.

## Fastest safe remaining execution (no extra diagnostic phases)
1. **One Canary integration build (source only in GitHub staging branch, same PWA).** Finish browser Wallet2 adapter to route only Wallet requests to a separately configured canary URL with staging-prefixed action names; preserve other 15 screens and generic backend URL, current auth/session/device provider, and fail-closed legacy finance cache/outbox; do not hardcode or leak user tokens. Keep the UI disabled outside owner-only test context; no change to main until release gate. Verify CORS/Google private web-app access before relying on cross-origin canary UI.
2. **One actual canary E2E acceptance with owner under existing verified session** and synthetic amounts: get Wallet2 generation+initial status; authorize a synthetic opening and one synthetic receipt on the isolated stage only; retry exactly same eventId/requestId to prove idempotency; refresh on same device; attempt unknown/revoked session to prove denial. Stage write enablement must be separately time-boxed and stage-only, with test journal backed up or cleared safely after test; never allow synthetic rows into live master. One E2E proof replaces redundant editor-function checks. If canary /exec only responds to ping, first ensure POST router/code included in published canary build; don't reuse production deployment.
3. **Pre-cutover archival gate (safely, before destructive cleanup):** owner-approved exact archive/cleanup manifest for all finance/order/linked old tables, source row counts/hash/readback, working master restoration point, rollback behavior before/after first new Wallet2 financial event, local stale outbox quarantine. No blind clearing of NOM/users/rights/auth/devices/settings/gallery/calculator. User gave general archive/delete permission, but seek specific irreversible deletion approval after exact ranges/restore plan; don't silently delete if archive unavailable.
4. **One real release:** add minimal `_W2_CONTROL`/`_W2_EVENTS` only to existing working master, with `openingStatus=UNCONFIRMED`; integrate verified Wallet2 routes to existing GAS, disable old finance fallback and old auto-replay, release same PWA assets while keeping the same 16 screens/nav/installed app; update production GAS **existing deployment** only after release checklist and SYS QA, no URL rotation. New generation no old financial/order rows or Q029 cache. Test one real user-entered finance transaction; read on second registered device; verify cash/plan/debt recalculation. Freeze financial writes on error.
5. **If a blocker arises:** show the precise blocker, don't ask owner for repeated `ping`/canary/local checks. Return to code integration and fix.

### Minimal GO criteria (5, no more)
- Source archive read-back and rollback steps verified.
- Old finance/orders/cache/outbox physically or logically excluded from new Wallet2 generation.
- One end-to-end authenticated write/read/retry with expected result, no double-counting.
- Permission/device/session denied correctly for unauthorized user.
- Actual Wallet mobile screen updates and shows cross-device canonical new-generation result.

Existing live GAS version 29 and GitHub main remain untouched throughout canary. No production mutation/deploy or irreversible cleanup authorized by this source-only note. Current status Q079 CLAIMED / Q029 IN_PROGRESS / production NO-GO.

Next productive block: **Q079_B4H_CANARY_MOBILE_TRANSPORT_INTEGRATION**; do code, not more standalone read-only GAS diagnostics.
