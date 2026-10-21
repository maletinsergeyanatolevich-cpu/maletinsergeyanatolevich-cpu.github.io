# Q079 B3.3 — server adapter routing, NOM/index and access gates (SOURCE ONLY)

Status: **STAGING_READ_ONLY / PRODUCTION_NO_GO**. Project `PROD-PWA-001`, parent `Q-029`, packet `Q-079` claimed.

## Verified architecture and blocker
- Existing GAS source `staging/q046/backend-q046.js` (source-only branch, not necessarily deployed) uses a single `CFG.SPREADSHEET_ID` for business AND user/device/auth sheets. The `ss_()` helper binds to the master ID, and `sheet_()` dispatches by tab name. It has no `businessGeneration` / `dataset_generation` enforcement. Replacing the ID blindly is **forbidden**.
- New private native staging spreadsheet `1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE`, 47 tabs: 30 legacy header-only + 17 Wallet2 schema-only. Generation `Q079.STAGING.20261021.001`, currency RUB integer kopeks, time zone `Asia/Tomsk`; control says `STAGING_ONLY`, `LOCKED_NO_BUSINESS_MUTATIONS`, `NO_GO`, `NOT_GRANTED`. Twelve cutover gates are `PENDING`.
- The staging catalog and auth/rights/device tables are **intentionally EMPTY**. Existing catalog has formulas that generate item IDs; `_NOM_SEARCH!A2` uses one array formula, and diagnostics have their own formulas. Copying plain displayed values cannot serve as a proven functional migration. Stage grid has been enlarged to at least old master capacity for every legacy tab (notably catalog and index).
- No financial history, Orders, stocks, debts, personal users, device/sessions or token hashes were copied into staging.

## Backend route separation design

1. **Do not change existing deployed `ss_()`**. Add a new, separately namespaced source-only `Q079_STAGE_STATUS` route in a non-production adapter that owns a compiled/pinned stage spreadsheet ID and exact `businessGeneration`. No client-supplied master ID, role, userId or permissions. Never forward an absent or stale generation. Only status/header diagnostics are permitted, without business rows.
2. A future trusted `authRealm_()` must resolve user state, device, permissions and session from existing verified backend infrastructure before a read of staging metadata. All staged financial writes remain closed, even for ADMIN1. Wallet2 sensitive grants require separate explicit approval. Do not interpret legacy `wallet.add` / `wallet.edit` flags as permission to assign profit, repay partner funding, withdraw, change opening or approve payment.
3. Split business reads/writes from authorization and catalog routing before any cutover: `authMaster_()`, `catalogMaster_()`, `businessMaster_(generation)`. During preparation, auth/catalog remain owned by the existing live master, while staging status can be read **only via a development-only probe**. At cutover, there must be exactly one current catalog and one authorization source. Route changes must be atomic and independently QA'd.
4. All business operations including reads, writes and sync must supply the new generation. Old offline queue and cached Wallet values are quarantined, NOT replayed or surfaced as fallback. The existing PWA local IndexedDB/user settings must NOT be reset.
5. Before allowing a single real business event, add persisted idempotent request ledger, controlled `LockService` critical sections, immutable event/effects journal with recoverable PREPARED/COMMITTED states, row-version CAS, crash recovery and read-after-write. A `LockService` call alone does not prove multi-sheet atomicity.
6. Reconcile canonical Nomenclature values/formulas/search index and user IDs/rights/devices in the new spreadsheet only under a separately approved bounded plan. Do **not** clone existing active sessions or bearer tokens. Real opening facts are entered and confirmed by the owner after cutover, not invented from historical totals.

## B3.3 source gateway

`staging/q079/stage-readonly-gateway.js` is a pure dependency-injected module with exactly two allowed operations `stage.status` and `stage.header`; it requires server-verification + current rights/device/expiry; pins the stage master + generation; rejects client impersonation, arbitrary data/sync operations, absent or old generation. The only exposed header sheets are a four-name allowlist. It **has no write or commit method**. Its `auditCatalogMetadata` and `auditIdentityMetadata` take only aggregate statistics, not personal records.

Synthetic validation: existing 70 engine/adapter tests plus 36 new read-only gateway, NOM/index, security and NO-GO tests = **106/106 PASS** on Node v22. No live GAS integration tests are claimed.

## Mandatory release gates

- Exact old/new IDs with verified archive/backups and rollback plan; old source remains protected.
- Formula-equivalent catalog & search index and stable user IDs/device/rights parity readback, no unintended privileges.
- GAS references/triggers/auth/sync routing audit with generation-guarded new backend.
- ADMIN1 + USER real phone tests, cold cache/outbox quarantine, 16 screens and read-after-write.
- Independent PROD-SYSTEM phase QA and separately explicit Sergey **DANGEROUS** approval naming the production archive, new master, releases and rollback.
- Until all complete: `WORK_STATUS=IN_PROGRESS`, `B3_3=SOURCE_QA_PASS`, `PRODUCTION_NO_GO`.
