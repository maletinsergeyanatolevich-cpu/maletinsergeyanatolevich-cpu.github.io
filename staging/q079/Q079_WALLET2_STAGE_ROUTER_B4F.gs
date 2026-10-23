/**
 * Q079 B4F — STAGING Wallet2 router for existing "Производство — Backend".
 * Source-only. In the existing Code.gs, add only the dispatch shown in README.
 * KEEP CURRENT PRODUCTION DEPLOYMENT VERSION 29 UNCHANGED.
 * Never change CFG.SPREADSHEET_ID or replace the project's Code.gs.
 */
const Q079_W2_TEST_SHEET_ID_B4F = '1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE';

function q079Wallet2StageRouteB4F_(body, requestId) {
  const action = String(body && body.action || '');
  if (['wallet2.stage.bootstrap','wallet2.stage.read','wallet2.stage.commit'].indexOf(action) < 0) {
    throw new Error('W2_STAGE_ACTION_NOT_ALLOWED');
  }
  if (typeof CFG === 'undefined' || !CFG.SPREADSHEET_ID ||
      String(CFG.SPREADSHEET_ID) === Q079_W2_TEST_SHEET_ID_B4F) {
    throw new Error('STOP_STAGE_PRODUCTION_ISOLATION_FAILED');
  }
  if (typeof Q079Wallet2Server === 'undefined' || typeof Q079Wallet2Server.create !== 'function') {
    throw new Error('W2_MODULE_NOT_INSTALLED');
  }
  const stage = SpreadsheetApp.openById(Q079_W2_TEST_SHEET_ID_B4F);
  const control = stage.getSheetByName('_W2_CONTROL');
  const events = stage.getSheetByName('_W2_EVENTS');
  if (!control || !events) throw new Error('W2_STAGE_TABLES_MISSING');
  const row = control.getRange(2, 1, 1, 7).getValues()[0] || [];
  if (String(row[0]) !== 'Q079.STAGE.20261021.001' ||
      ['STAGING_ONLY','ACTIVE_V2'].indexOf(String(row[1])) < 0 ||
      String(row[3]) !== '2026-10-21' ||
      String(row[4]) !== 'Asia/Tomsk' || String(row[5]) !== 'RUB' ||
      String(events.getRange(1,1).getValue()) !== 'event_json') {
    throw new Error('W2_STAGE_SCHEMA_OR_GENERATION_INVALID');
  }
  const gateway = Q079Wallet2Server.create({
    getSheet: function (name) {
      if (name !== '_W2_CONTROL' && name !== '_W2_EVENTS') {
        throw new Error('W2_STAGE_OTHER_SHEET_FORBIDDEN');
      }
      return stage.getSheetByName(name);
    },
    // Existing production authorization is deliberately reused, READ-ONLY.
    // This function never accepts identities or rights supplied by the client.
    authSession: function (token, permission, reqId) {
      return authSession_(token, permission, reqId);
    },
    hasPermission: function (user, permission) {
      return hasPermission_(user, permission);
    },
    lock: LockService.getScriptLock(),
    sha256: function (message) { return sha256Hex_(message); },
    clock: function () { return nowIso_(); }
  });
  const request = Object.assign({}, body, {request_id: requestId});
  if (action === 'wallet2.stage.bootstrap') return gateway.bootstrap(request);
  if (action === 'wallet2.stage.read') return gateway.read(request);
  return gateway.commit(request);
}
