# Q079 B4G — Canary /exec read-only publication gate

User confirmed 2026-10-23 editor-local Q079CanaryRouterCheck PASS: wallet2.stage.bootstrap rejects missing session, stage writes 0, production business writes 0. Existing separate canary /exec GET ping also returned ok:true backend-0.2.35-q029-finance-sortfix. Neither proves the compiled canary /exec includes latest POST routing.

**Add** `staging/q079/Q079_Wallet2_Canary_Readonly_B4G.gs` to same Apps Script project as a separate file, only as a read-only diagnostic. **Insert** in pre-existing doGet(e), immediately after action assignment and before GET_ONLY_PING:

```javascript
if (action === 'wallet2.stage.canary') return json_(q079Wallet2CanaryReadOnlyB4G_());
```

Save and update **only separate canary deployment** with a new version, access Only me; NOT the live v29 deployment. Navigate to that canary's `/exec?action=wallet2.stage.canary`. Expected JSON: `ok:true`, `canary:'Q079-B4G'`, `publishedCodeHasWalletStageRouter:true`, `stageWriteEnabled:false`, `stageEvents:0`, `unauthenticatedRequestDenied:true`, `realUserAuthorizationTested:false`, `walletHttpPostTested:false`.

This probes the deployed compiled code and invokes the router *internally* using a deliberately missing token, with no calls to the generic doPost error/audit logging path, no real token material, no data mutations, and no changes to production. Do not infer successful live authenticated POST or phone QA. No stage finance records. Remove diagnostic GET route before final production cutover. Keep production master 177IVzLUaNrzKScoRo0CjT5Zo7tJm5Bo0am2z9whAWdg with 30 existing sheets and no Wallet2 active event ledger. Test stage 1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE locked STAGING_ONLY.

Tests: `node --test tests/q079-wallet2-canary-b4g.test.js`, 10 / 10 PASS (isolated JavaScript VM mocks). Source staging only, no actual Apps Script deployment performed by assistant. Production remains NO-GO. Next safe block: Wallet2 stage-specific PWA bridge and authenticated canary read/deny test; do not send tokens to chat or change broad user rights.
