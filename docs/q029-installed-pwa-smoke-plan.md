# Q-029 · Block 3 · Installed PWA offline/update/rollback smoke plan

**Gate status: NO-GO until real installed-browser evidence.** This is a manual QA procedure for a **separate staging HTTPS origin or localhost browser profile**, not a production release instruction.

Source candidate: Draft PR #26, branch `q046-wallet-staging`, version `v0.3.28-staging-q029-rh1`, build `2026-10-09.q029.rh1`, IndexedDB schema **5**. Production remains v0.3.27.2 build 2026-10-07.3d, schema5. Production backend Wallet Q050 accepted independently and MUST NOT be used for synthetic mutation tests.

## Hard prerequisites

1. Have a distinct staging hostname/origin (or `http://localhost`) served from the **pinned, reviewed** GitHub commit, never overwrite GitHub Pages `main` or production `/exec`. Record full staging URL, scope, GitHub SHA and test date.
2. Use a fresh dedicated Chrome/Chromium **browser profile**, a synthetic test account and synthetic draft records. Do **not** reuse production ADMIN1 session token, real worker account, or business data. Mock backend or stub all business-mutating endpoints.
3. Capture the current production PWA version and data counts READ-ONLY, but **do not change production**.
4. Maintain two versioned copies of **client-only** assets on the **same isolated staging origin/scope** for the E2E change-over: old build 2026-10-07.3d, and candidate build 2026-10-09.q029.rh1. Check their local DB version is 5 before attempting rollback.
5. Candidate `staging-only` manifest is **deliberately non-installable** by SW. Test that forbidden installation first. For a controlled isolated pilot on staging **only**, explicitly construct a temporary test manifest whose rolloutStage is `admin1` and eligibleRoles [`ADMIN1`], retaining the matching build ID. Never commit or publish this pilot manifest to main; never use a shared production SW scope.
6. **SW lifecycle caveat**: a waiting SW can activate when all controlled windows close. A shared production origin cannot guarantee a true per-user ADMIN1-only SW rollout even with role checks. Isolated origin/scope remains mandatory for any pilot. A general production deployment needs a separate stable-release gate.

## Test sequence with evidence

| Step | Action in isolated test browser | Expected and evidence |
|---|---|---|
| A | On fresh profile load old app, install it, open DevTools > Application > Service Workers/IndexedDB. Create at least two distinct synthetic drafts and a snapshotCache record. | PWA old build 2026-10-07.3d, DB `production-v011` version5; record count/IDs, screenshots, SW scope. |
| B | Deploy only staging-only candidate to same isolated scope, reload/check update then close ALL test windows and reopen. | Candidate does **not** install or silently activate; old active controller/build remains; synthetic drafts and cached snapshot survive. |
| C | Test deliberately mismatched `version.json` build vs SW `BUILD` in isolated staging (not production). | Worker installation fails closed; no new controller; old cache and drafts intact. |
| D | In staging **only**, enable the explicit temporary ADMIN1 test pilot manifest after review; create authenticated **synthetic** ADMIN1 state in same staging profile and reload. | New SW may install/activate on isolated origin; new client identifies exact matching build; no prompts for production tokens. Record scope/controller and version. |
| E | On new installed pilot app open Wallet main/balance, then simulate backend offline (DevTools Network > Offline); reload, restore network; press one manual retry. | Cached app shell loads; controlled read-only error appears; **no automatic retry loop**, no Wallet business write, no loss of drafts/IndexedDB records; read recovery succeeds after network returns. |
| F | With a separate synthetic WORKER profile on the **same staging origin** (no production account), navigate Wallet. Then downgrade synthetic ADMIN1 role and clear session while view is open. | Worker sees legacy Wallet, no canonical controls; admin role/session loss immediately falls back to legacy and blocks direct canonical actions. |
| G | Roll back isolated staging origin to pinned old client build+manifest+SW; close/reopen pilot app to allow intended lifecycle and verify controller/manifest. | Old client v0.3.27.2/build 2026-10-07.3d runs against unchanged DB v5; all synthetic draft IDs and snapshot cache remain; no IndexedDB VersionError, no data reset. |
| H | After test, delete isolated test profile/site data ONLY after preserving sanitized evidence. | Production origin/application data and business operations untouched. |

## Fail-closed stopping conditions

Any changed production URL, unknown SW scope, missing synthetic backup, incorrect build, unexpected role access, bad cache, automatic retry loop, IndexedDB VersionError, lost synthetic drafts, or business-write request → **STOP**, no production merge/deploy. Capture sanitized screenshot, exact steps, browser version, test origin (not tokens), active SW build, app version, DB version, draft counts, and before/after IDs. Do not clear the real application's site data to troubleshoot.

## Required result contract

`Q029_BLOCK3_INSTALLED_SMOKE=PASS|FAIL|BLOCKED`

Record: test staging origin/scope; tested commit SHA; device/browser; old/new/rollback build IDs; old/new DB version; synthetic draft IDs/counts before/after; worker/admin role results; offline shell/Wallet behavior; SW update result; rollback result; screenshots; network interception proof; reviewer. Only then consider a consolidated **PROD-SYSTEM** independent DANGEROUS PWA release-readiness gate. **No release is authorized by this test plan.**

## Current automated evidence (simulators, NOT real-installed proof)

- `tests/q029-client-release-gate.test.js`: version/manifest parity, rollback schema5 contract, SW staged-install refusal, message fail-closed, mismatched build, intended admin/stable gates.
- `tests/q029-sw-offline.test.js`: SW offline navigation/app shell/assets/version fallback, fallback page, cache insertion, backend request pass-through, obsolete-cache cleanup.
- `tests/q029-wallet-ui-role-handler.test.js`: role-based real-source UI handlers, navigation, network error/manual retry, changed role/session.
- Backend/model regression tests remain mandatory on same pinned commit.
