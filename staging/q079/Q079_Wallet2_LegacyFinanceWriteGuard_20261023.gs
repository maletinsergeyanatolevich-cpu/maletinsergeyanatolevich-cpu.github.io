/**
 * Q079 / Wallet2 — wallet-only server cutover guard (source-only).
 * Add to the existing «Производство — Backend» GAS as separate Q079_Wallet2_Guard.gs.
 * Takes effect ONLY after _W2_CONTROL.status becomes ACTIVE_V2.
 * Does not change NOM/users/auth/orders/gallery/calculator or any master ID.
 * No installation/deployment performed by this source file.
 */
function q079OldFinanceWritesClosedQ079_() {
  var control = ss_().getSheetByName('_W2_CONTROL');
  if (!control) return false;
  var r = control.getRange(2, 1, 1, 3).getValues()[0] || [];
  return /^Q079[.:-]/.test(String(r[0] || '')) &&
    String(r[1] || '') === 'ACTIVE_V2';
}
/*
 * Mandatory surgical changes to existing Code.gs BEFORE live Wallet2 activation:
 *
 * 1. In doPost(e), immediately AFTER new wallet2.bootstrap/read/commit routes:
 *    if (q079OldFinanceWritesClosedQ079_() && /^wallet[.]/.test(q046Action))
 *      return json_({ok:false,error:'OLD_WALLET_RETIRED',request_id:requestId});
 *
 * 2. At the start of w1AppendFinance_(obj,eventId) BEFORE appendByHeaders_:
 *    if (q079OldFinanceWritesClosedQ079_()) throw new Error('OLD_FINANCE_WRITE_DISABLED');
 *
 * 3. At the start of mutateFinance_(body,auth,requestId,action):
 *    if (q079OldFinanceWritesClosedQ079_()) throw new Error('OLD_FINANCE_WRITE_DISABLED');
 *
 * These are needed to prevent obsolete installed clients or inbox replays from
 * creating/editing pre-2026-10-21 Finance records after the old rows are cleared.
 * Other app events/orders must remain functioning.
 * No retroactive import, emptying, generation switch or publication is done here.
 */