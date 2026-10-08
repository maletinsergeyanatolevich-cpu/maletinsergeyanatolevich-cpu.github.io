'use strict';
/**
* Производство PWA — Apps Script backend v0.2.29 Q-047 WALLET STAGING SOURCE FIX
* Серверный слой: ping / access request / activation / auth check / sync inbox.
* ВАЖНО: секреты НЕ хранить в этом файле. Recovery/owner secrets — только Script Properties.
*/
const CFG = Object.freeze({
 VERSION: 'backend-0.2.29-staging-q047',
 SPREADSHEET_ID: '177IVzLUaNrzKScoRo0CjT5Zo7tJm5Bo0am2z9whAWdg',
 USERS_SHEET: 'Пользователи и права',
 ACCESS_REQUESTS_SHEET: '_APP_ACCESS_REQUESTS',
 DEVICES_SHEET: '_APP_DEVICES',
 SESSIONS_SHEET: '_APP_SESSIONS',
 AUTH_LOG_SHEET: '_AUTH_LOG',
 SYNC_LOG_SHEET: '_SYNC_LOG',
 INBOX_SHEET: 'Входящие приложения',
 AVITO_INBOX_SHEET: 'Входящие Avito',
 GENERIC_MEDIA_FOLDER_ID: '1O9-HB56NTQj9Z5O-l-RBBY7OPP5gEuzm',
 AVITO_MEDIA_FOLDER_ID: '1sXGetCYBkab7CL-p8TSczFyUzKkJ25io',
 GALLERY_CANDIDATE_FOLDER_ID: '1CcTIGOoTwB_7VhR4d8bJwHqAIRBp-MDW',
 ORDERS_ROOT_FOLDER_ID: '1T-izm-RraWD550lk5LAcM-1Wy-yMtWs-',
 APPDEV_ROOT_FOLDER_ID: '1RS2MtPYkK5V0QtQ7N2sQjBuKSkxGjfPw',
 APPDEV_INCOMING_FOLDER_ID: '1XVB5VBgLALmEIbfUflq1-lxVfAQRNnN8',
 APPDEV_REQUIRED_FOLDER_ID: '16k9c8qI6jH2uTPnERfUg4x_OeAEo1irF',
 APPDEV_WORK_FOLDER_ID: '1Zzrhk_HdUE0eylLOkb5zwKw5nnb2bNJw',
 APPDEV_DONE_FOLDER_ID: '1MYRLeO6zNpKvFCQ4bU_-2I_EBtR5Qk6l',
 APPDEV_ARCHIVE_FOLDER_ID: '1a95Ms1OYrJgV0xWZSDX5HN2DqKsqm16d',
 APPDEV_JOURNAL_SPREADSHEET_ID: '13-wUKLJjrVFMWKYVJQdu-qSzoih-N7D63pTKHpRqX9I',
 APPDEV_JOURNAL_SHEET: 'ЖУРНАЛ',
 AUDIT_SHEET: '_APP_AUDIT',
 APPDEV_SHEET: '_APP_ISSUES',
 CONFLICTS_SHEET: '_APP_CONFLICTS',
 DEFAULT_SESSION_HOURS: 24 * 30,
 DEFAULT_USER_OFFLINE_HOURS: 24,
 MAX_MEDIA_BYTES: 7 * 1024 * 1024
});
function doGet(e) {
 const action = String((e && e.parameter && e.parameter.action) || 'ping');
 if (action !== 'ping') return json_({ ok: false, error: 'GET_ONLY_PING' });
 return json_({
   ok: true,
   service: 'production-pwa-backend',
   version: CFG.VERSION,
   serverTime: nowIso_(),
   spreadsheetId: CFG.SPREADSHEET_ID
 });
}
function doPost(e) {
 let body;
 try {
   body = parseBody_(e);
 } catch (err) {
   return json_({ ok: false, error: 'BAD_JSON', detail: safeErr_(err) });
 }
 const requestId = String(body.request_id || body.requestId || uuid_());
 try {
    const q046Action = String(body.action || '');
    if (q046Action === 'wallet.canonical.get') return json_(handleWalletCanonicalGetQ046_(body, requestId));
    if (q046Action === 'wallet.schema.spec') return json_(handleWalletSchemaSpecQ046_(body, requestId));
    if (q046Action === 'wallet.finance.create') return json_(handleWalletFinanceCreateQ046_(body, requestId));
    if (q046Action === 'wallet.plan.create') return json_(handleWalletPlanCreateQ046_(body, requestId));
    if (q046Action === 'wallet.plan.edit') return json_(handleWalletPlanEditQ046_(body, requestId));
    if (q046Action === 'wallet.plan.cancel') return json_(handleWalletPlanCancelQ046_(body, requestId));
    if (q046Action === 'wallet.plan.spend') return json_(handleWalletPlanSpendQ046_(body, requestId));
    if (q046Action === 'wallet.allocation.create') return json_(handleWalletAllocationCreateQ046_(body, requestId));
    if (q046Action === 'wallet.allocation.cancel') return json_(handleWalletAllocationCancelQ046_(body, requestId));
    if (q046Action === 'wallet.sensitive.execute') return json_(handleWalletSensitiveExecuteQ046_(body, requestId));
   switch (String(body.action || '')) {
     case 'ping':
       return json_({ ok: true, version: CFG.VERSION, serverTime: nowIso_(), request_id: requestId });
     case 'access.request':
       return json_(handleAccessRequest_(body, requestId));
     case 'access.activate':
       return json_(handleActivation_(body, requestId));
     case 'auth.check':
       return json_(handleAuthCheck_(body, requestId));
     case 'snapshot.pull':
       return json_(handleSnapshotPull_(body, requestId));
     case 'nomenclature.head':
       return json_(handleNomenclatureHead_(body, requestId));
     case 'nomenclature.delta':
       return json_(handleNomenclatureDelta_(body, requestId));
     case 'nomenclature.sync.install':
       return json_(handleNomenclatureSyncInstall_(body, requestId));
     case 'party.list':
       return json_(handlePartyList_(body, requestId));
     case 'party.get':
       return json_(handlePartyGet_(body, requestId));
     case 'party.mutate':
       return json_(handlePartyMutate_(body, requestId));
     case 'orderline.list':
       return json_(handleOrderLineList_(body, requestId));
     case 'orderline.mutate':
       return json_(handleOrderLineMutate_(body, requestId));
     case 'settlement.list':
       return json_(handleSettlementList_(body, requestId));
     case 'settlement.post':
       return json_(handleSettlementPost_(body, requestId));
     case 'settlement.correct':
       return json_(handleSettlementCorrect_(body, requestId));
     case 'reconciliation.get':
       return json_(handleReconciliationGet_(body, requestId));
     case 'reconciliation.preview':
       return json_(handleReconciliationPreviewQ042_(body, requestId));
     case 'reconciliation.apply':
       return json_(handleReconciliationApplyQ042_(body, requestId));
     case 'obligation.list':
       return json_(handleObligationList_(body, requestId));
     case 'obligation.mutate':
       return json_(handleObligationMutate_(body, requestId));
     case 'resource.list':
       return json_(handleResourceList_(body, requestId));
     case 'resource.post':
       return json_(handleResourcePost_(body, requestId));
     case 'resource.correct':
       return json_(handleResourceCorrect_(body, requestId));
     case 'sync.domain.head':
       return json_(handleDomainHead_(body, requestId));
     case 'sync.domain.delta':
       return json_(handleDomainDelta_(body, requestId));
     case 'order.media.get':
       return json_(handleOrderMediaGet_(body, requestId));
     case 'gallery.media.get':
       return json_(handleGalleryMediaGet_(body, requestId));
     case 'gallery.update':
       return json_(handleGalleryUpdate_(body, requestId));
     case 'record.mutate':
       return json_(handleRecordMutate_(body, requestId));
     case 'appdev.list':
       return json_(handleAppDevList_(body, requestId));
     case 'appdev.update':
       return json_(handleAppDevUpdate_(body, requestId));
     case 'appdev.media.get':
       return json_(handleAppDevMediaGet_(body, requestId));
     case 'activity.list':
       return json_(handleActivityList_(body, requestId));
     case 'admin.users.list':
       return json_(handleAdminUsersList_(body, requestId));
     case 'admin.user.update':
       return json_(handleAdminUserUpdate_(body, requestId));
     case 'admin.access.list':
       return json_(handleAdminAccessList_(body, requestId));
     case 'admin.access.resolve':
       return json_(handleAdminAccessResolve_(body, requestId));
     case 'admin.devices.list':
       return json_(handleAdminDevicesList_(body, requestId));
     case 'admin.device.update':
       return json_(handleAdminDeviceUpdate_(body, requestId));
     case 'admin.sessions.revoke':
       return json_(handleAdminSessionsRevoke_(body, requestId));
     case 'admin.inbox.reprocess':
       return json_(handleAdminInboxReprocess_(body, requestId));
     case 'admin.conflicts.list':
       return json_(handleAdminConflictsList_(body, requestId));
     case 'admin.conflicts.resolve':
       return json_(handleAdminConflictResolve_(body, requestId));
     case 'event.status':
       return json_(handleEventStatus_(body, requestId));
     case 'sync.push':
       return json_(handleSyncPush_(body, requestId));
     default:
       return json_({ ok: false, error: 'UNKNOWN_ACTION', request_id: requestId });
   }
 } catch (err) {
   const detail = safeErr_(err);
   try { authLog_('', '', 'backend_error', 'ERROR', detail, requestId, ''); } catch (_) {}
   if (detail === 'DEVICE_REVOKED_WIPE') {
     return json_({ ok: false, error: 'DEVICE_REVOKED', wipe_on_next_online: true, request_id: requestId });
   }
   if (/^(SESSION_TOKEN_REQUIRED|SESSION_INVALID|SESSION_REVOKED|SESSION_EXPIRED|USER_DISABLED|DEVICE_REVOKED)$/.test(detail)) {
     return json_({ ok: false, error: detail, request_id: requestId });
   }
   if (/^PERMISSION_DENIED:/.test(detail)) {
     return json_({ ok: false, error: 'PERMISSION_DENIED', permission: detail.split(':').slice(1).join(':'), request_id: requestId });
   }
   return json_({ ok: false, error: 'SERVER_ERROR', detail: detail, request_id: requestId });
 }
}
function handleAccessRequest_(body, requestId) {
 const deviceId = cleanId_(body.device_id, 'device_id');
 const name = cleanText_(body.name || body.name_entered, 120);
 const appVersion = cleanText_(body.app_version || '', 80);
 const activationHash = cleanHex_(body.activation_hash, 64);
 if (!name) throw new Error('NAME_REQUIRED');
 if (!activationHash) throw new Error('ACTIVATION_HASH_REQUIRED');
 const lock = LockService.getScriptLock();
 lock.waitLock(10000);
 try {
   const access = sheet_(CFG.ACCESS_REQUESTS_SHEET);
   const existing = findRowBy_(access, 4, deviceId, 2); // device_id is column D
   if (existing) {
     const status = String(existing.values[5] || 'PENDING');
     access.getRange(existing.row, 13).setValue(nowIso_()); // last_poll_at
     return { ok: true, request_id: existing.values[0], status: status, duplicate: true };
   }
   const reqId = requestId || uuid_();
   access.appendRow([
     reqId, nowIso_(), name, deviceId, appVersion, 'PENDING', '', '', '', '', activationHash, '', nowIso_()
   ]);
   authLog_('', deviceId, 'access_request', 'PENDING', name, reqId, '');
   return { ok: true, request_id: reqId, status: 'PENDING' };
 } finally {
   lock.releaseLock();
 }
}
function handleActivation_(body, requestId) {
 const deviceId = cleanId_(body.device_id, 'device_id');
 const reqId = cleanId_(body.access_request_id || body.request_id, 'access_request_id');
 const activationSecret = String(body.activation_secret || '');
 if (!activationSecret) throw new Error('ACTIVATION_SECRET_REQUIRED');
 const lock = LockService.getScriptLock();
 lock.waitLock(10000);
 try {
   const access = sheet_(CFG.ACCESS_REQUESTS_SHEET);
   const req = findRowBy_(access, 1, reqId, 2);
   if (!req) return deny_('ACCESS_REQUEST_NOT_FOUND', '', deviceId, 'activation', requestId, '');
   if (String(req.values[3]) !== deviceId) return deny_('DEVICE_MISMATCH', '', deviceId, 'activation', requestId, '');
   if (String(req.values[5]) !== 'APPROVED') {
     access.getRange(req.row, 13).setValue(nowIso_());
     return { ok: false, status: String(req.values[5] || 'PENDING'), error: 'NOT_APPROVED', request_id: requestId };
   }
   const expectedHash = String(req.values[10] || '');
   if (!constantTimeEq_(expectedHash, sha256Hex_(activationSecret))) {
     return deny_('ACTIVATION_SECRET_INVALID', '', deviceId, 'activation', requestId, '');
   }
   const userId = String(req.values[8] || '');
   if (!userId) return deny_('USER_NOT_LINKED', '', deviceId, 'activation', requestId, '');
   const user = getUser_(userId);
   if (!user || !user.active) return deny_('USER_INACTIVE', userId, deviceId, 'activation', requestId, '');
   revokeDeviceSessionsInternal_(deviceId, 'Reactivated / identity binding refreshed');
   upsertDevice_(deviceId, userId, cleanText_(body.device_name || 'PWA device', 160), user.offlineHours);
   const session = issueSession_(userId, deviceId, user.offlineHours);
   access.getRange(req.row, 8).setValue(nowIso_()); // resolved_at
   access.getRange(req.row, 12).setValue(nowIso_()); // approved_at
   authLog_(userId, deviceId, 'activation', 'OK', '', requestId, session.session_id);
   return {
     ok: true,
     request_id: requestId,
     session_token: session.token,
     session_id: session.session_id,
     user: publicUser_(user),
     offline_access_until: session.offline_access_until,
     serverTime: nowIso_()
   };
 } finally {
   lock.releaseLock();
 }
}
function handleAuthCheck_(body, requestId) {
 ensureStep2Schema_();
 const auth = authSession_(body.session_token, null, requestId);
 touchSessionAndDevice_(auth);
 return {
   ok: true,
   request_id: requestId,
   user: publicUser_(auth.user),
   device_id: auth.deviceId,
   session_id: auth.sessionId,
   offline_access_until: auth.offlineAccessUntil,
   serverTime: nowIso_(),
   wipe_on_next_online: auth.wipeOnNextOnline
 };
}
function inboxProcessingSummary_(){
 const sh=sheet_(CFG.INBOX_SHEET), last=sh.getLastRow(), out={new:0,processing:0,processed:0,pending_review:0,error:0,other:0,total:Math.max(0,last-1)};
 if(last<2)return out;
 const vals=sh.getRange(2,16,last-1,1).getValues();
 vals.forEach(function(r){const k=String(r[0]||'new');if(Object.prototype.hasOwnProperty.call(out,k))out[k]++;else out.other++;});
 return out;
}
function handleAdminInboxReprocess_(body, requestId){
 ensureStep2Schema_();
 const auth=authSession_(body.session_token,'users.manage',requestId);
 const limit=Math.max(1,Math.min(500,Number(body.limit||200)));
 const lock=LockService.getScriptLock(); lock.waitLock(20000);
 try {
   const before=inboxProcessingSummary_();
   const attempted=reprocessInboxBacklog_(limit,'');
   const after=inboxProcessingSummary_();
   authLog_(auth.user.userId,auth.deviceId,'admin_inbox_reprocess','OK','attempted='+attempted+'; before_new='+before.new+'; after_new='+after.new,requestId,auth.sessionId);
   touchSessionAndDevice_(auth);
   return {ok:true,request_id:requestId,attempted:attempted,before:before,after:after,serverTime:nowIso_()};
 } finally { lock.releaseLock(); }
}
function handleEventStatus_(body, requestId) {
 const auth = authSession_(body.session_token, 'sync.run', requestId);
 const eventId = cleanId_(body.event_id || body.id, 'event_id');
 const inbox = findGeneralInboxEvent_(eventId);
 let received = false;
 let serverReceived = false;
 let detail = null;
 if (inbox) {
   const v = inbox.values || [];
   const sameDevice = String(v[4] || '') === String(auth.deviceId || '');
   const sameUser = String(v[3] || '') === String(auth.user.userId || '');
   if (sameDevice || sameUser) {
     const processing = String(v[15] || 'new');
     received = true;
     serverReceived = isFinalProcessingStatus_(processing);
     detail = {
       received_at: cleanOut_(v[2]), event_id: cleanOut_(v[0]), event_type: cleanOut_(v[5]),
       validation: 'OK', duplicate: true, processing: processing,
       processed_by: cleanOut_(v[16]), processed_at: cleanOut_(v[17]), error: cleanOut_(v[18]), source_revision: cleanOut_(v[19])
     };
   }
 } else {
   const s = sheet_(CFG.SYNC_LOG_SHEET);
   const hit = findSuccessfulSyncLog_(eventId);
   if (hit) {
     const v = hit.values || [];
     const sameUser = String(v[2] || '') === String(auth.user.userId || '');
     const sameDevice = String(v[3] || '') === String(auth.deviceId || '');
     if (sameUser || sameDevice) {
       received = true; serverReceived = true;
       detail = {received_at:cleanOut_(v[0]),event_id:cleanOut_(v[1]),event_type:cleanOut_(v[4]),validation:cleanOut_(v[6]),duplicate:!!v[7],processing:cleanOut_(v[8]),error:cleanOut_(v[9])};
     }
   }
 }
 touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,event_id:eventId,received:received,server_received:serverReceived,status:serverReceived?'synced':(received?'processing':'not_found'),detail:detail,serverTime:nowIso_()};
}
function handleSyncPush_(body, requestId) {
 ensureStep2Schema_();
 const auth = authSession_(body.session_token, 'sync.run', requestId);
 const events = Array.isArray(body.events) ? body.events : (body.event ? [body.event] : []);
 if (!events.length) return { ok: true, request_id: requestId, results: [], serverTime: nowIso_() };
 if (events.length > 50) throw new Error('TOO_MANY_EVENTS');
 const lock = LockService.getScriptLock();
 lock.waitLock(20000);
 try {
   const results = events.map(function (ev) {
     return processEvent_(ev, auth, requestId);
   });
   touchSessionAndDevice_(auth);
   return { ok: true, request_id: requestId, results: results, serverTime: nowIso_() };
 } finally {
   lock.releaseLock();
 }
}
function processEvent_(ev, auth, requestId) {
 const eventId = cleanId_(ev.event_id || ev.id, 'event_id');
 const eventType = cleanText_(ev.event_type || ev.kind || 'unknown', 80);
 const holdUntil = ev.holdUntil || ev.hold_until || '';
 const sendNow = !!(ev.sendNowRequested || (ev.meta && ev.meta.sendNowRequested));
 if (holdUntil && !sendNow && new Date(holdUntil).getTime() > Date.now()) return {event_id:eventId,ok:false,status:'hold',error:'HOLD_WINDOW_ACTIVE'};
 const requiredPermission = permissionForEvent_(ev);
 if (requiredPermission && !hasPermission_(auth.user, requiredPermission)) {
   syncLog_(eventId, auth.user.userId, auth.deviceId, eventType, ev, 'DENIED:' + requiredPermission, false, 'denied', '');
   return {event_id:eventId,ok:false,status:'denied',error:'PERMISSION_DENIED',permission:requiredPermission};
 }
 if (!isAvitoEvent_(ev)) {
   const existing = findGeneralInboxEvent_(eventId);
   if (existing) {
     const routed = routeGeneralInboxRow_(existing.row, null);
     syncLog_(eventId, auth.user.userId, auth.deviceId, eventType, ev, 'OK', true, 'duplicate_' + routed.processing_status, routed.error || '');
     return {event_id:eventId,ok:routed.ok,status:routed.ok?'synced':'error',duplicate:true,server_received:routed.ok && isFinalProcessingStatus_(routed.processing_status),processing_status:routed.processing_status,operation_id:routed.operation_id||null,error:routed.error||''};
   }
 } else if (syncEventExists_(eventId)) {
   syncLog_(eventId, auth.user.userId, auth.deviceId, eventType, ev, 'OK', true, 'duplicate_ack', '');
   return {event_id:eventId,ok:true,status:'synced',duplicate:true,server_received:true};
 }
 let mediaUrl = '', sourceFilename = '', mediaUrls = [];
 if (ev.media && ev.media.base64) { const m=saveMedia_(ev,auth); mediaUrl=m.url; sourceFilename=m.fileName; mediaUrls.push(m.url); }
 if (Array.isArray(ev.mediaList)) {
   ev.mediaList.slice(0, 8).forEach(function(part, idx) {
     if (!part || !part.base64) return;
     const m = saveMediaPart_(ev, auth, part, idx + 1);
     mediaUrls.push(m.url);
     if (!mediaUrl) { mediaUrl = m.url; sourceFilename = m.fileName; }
   });
 }
 if (mediaUrls.length) ev.server_media_urls = mediaUrls.slice();
 try {
   if (isAvitoEvent_(ev)) {
     appendAvitoInbox_(ev, auth, mediaUrl, sourceFilename);
     syncLog_(eventId, auth.user.userId, auth.deviceId, eventType, ev, 'OK', false, 'stored_in_avito_inbox', '');
     return {event_id:eventId,ok:true,status:'synced',server_received:true,media_url:mediaUrl||null};
   }
   const row = appendGeneralInbox_(ev, auth, mediaUrl);
   const routed = routeGeneralInboxRow_(row, ev);
   syncLog_(eventId, auth.user.userId, auth.deviceId, eventType, ev, routed.ok?'OK':'ERROR', false, routed.processing_status, routed.error||'');
   reprocessInboxBacklog_(20, eventId);
   return {event_id:eventId,ok:routed.ok,status:routed.ok?'synced':'error',server_received:routed.ok && isFinalProcessingStatus_(routed.processing_status),processing_status:routed.processing_status,operation_id:routed.operation_id||null,media_url:mediaUrl||null,media_urls:mediaUrls,error:routed.error||''};
 } catch (err) {
   syncLog_(eventId, auth.user.userId, auth.deviceId, eventType, ev, 'ERROR', false, 'failed', safeErr_(err));
   return {event_id:eventId,ok:false,status:'error',server_received:false,error:safeErr_(err)};
 }
}
function permissionForEvent_(ev) {
 const kind = String(ev.kind || ev.event_type || '').toLowerCase();
 const context = String(ev.context || '').toLowerCase();
 if (kind === 'record-mutation') return '';
 if (kind === 'order-create') return 'orders.create';
 if (kind === 'appdev-issue') return 'appdev.submit';
 if (context.indexOf('avito') >= 0 || kind.indexOf('avito') >= 0) return 'avito.draft';
 if (kind === 'wallet' || kind === 'finance-entry' || context === 'wallet') return 'wallet.add';
 if (kind === 'portfolio-candidate' || context === 'portfolio-candidate') return 'gallery.add';
 if (kind === 'publish-draft' || context.indexOf('gallery-share') >= 0) return 'gallery.share';
 if (kind === 'quote-draft' || context === 'calculator') return 'calculator.create';
 if (kind === 'quote-promote') return 'calculator.promote';
 if (context === 'checklist' || kind.indexOf('checklist') >= 0) {
   return kind === 'checklist-create' ? 'checklists.create' : 'checklists.edit';
 }
 if (context === 'order' || /^202\d-\d+/.test(String(ev.objectId || ev.entity_id || ''))) {
   return (kind === 'photo' || kind === 'audio' || kind === 'document') ? 'orders.media' : 'orders.edit';
 }
 return 'sync.run';
}
function isAvitoEvent_(ev) {
 return String(ev.context || '').toLowerCase().indexOf('avito') >= 0 || String(ev.kind || '').toLowerCase().indexOf('avito') >= 0;
}
function saveMedia_(ev, auth) {
 const media = ev.media || {};
 const eventId = cleanId_(ev.event_id || ev.id, 'event_id');
 const mime = cleanText_(media.mimeType || media.mime || 'application/octet-stream', 120);
 const fileName = safeFileName_(media.fileName || media.name || ('PROD_' + eventId));
 let folderId = CFG.GENERIC_MEDIA_FOLDER_ID;
 if (isAvitoEvent_(ev)) folderId = CFG.AVITO_MEDIA_FOLDER_ID;
 if (String(ev.context || '') === 'portfolio-candidate' || String(ev.kind || '') === 'portfolio-candidate') folderId = CFG.GALLERY_CANDIDATE_FOLDER_ID;
 const folder = DriveApp.getFolderById(folderId);
 const existing = folder.getFilesByName(fileName);
 while (existing.hasNext()) {
   const f = existing.next();
   if (String(f.getDescription() || '').indexOf('PWA event ' + eventId) >= 0) {
     return { url: f.getUrl(), fileId: f.getId(), fileName: fileName, duplicate: true };
   }
 }
 const bytes = Utilities.base64Decode(String(media.base64 || ''));
 if (!bytes.length) throw new Error('EMPTY_MEDIA');
 if (bytes.length > CFG.MAX_MEDIA_BYTES) throw new Error('MEDIA_TOO_LARGE');
 const blob = Utilities.newBlob(bytes, mime, fileName);
 const file = folder.createFile(blob);
 file.setDescription('PWA event ' + eventId + ' / user ' + auth.user.userId + ' / device ' + auth.deviceId);
 return { url: file.getUrl(), fileId: file.getId(), fileName: fileName, duplicate: false };
}
function saveMediaPart_(ev, auth, media, index) {
 const clone = Object.assign({}, ev, {media: media});
 const eventId = cleanId_(ev.event_id || ev.id, 'event_id');
 const original = cleanText_(media.fileName || media.name || '', 160);
 const ext = original.indexOf('.') >= 0 ? original.slice(original.lastIndexOf('.')) : '';
 const base = original ? original.slice(0, original.length - ext.length) : ('PROD_' + eventId);
 clone.media = Object.assign({}, media, {fileName: safeFileName_(base + '_' + String(index || 1) + ext)});
 return saveMedia_(clone, auth);
}
function appendGeneralInbox_(ev, auth, mediaUrl) {
 const s = sheet_(CFG.INBOX_SHEET);
 s.appendRow([
   String(ev.event_id || ev.id || ''), String(ev.created_at || ev.createdAt || ''), nowIso_(), auth.user.userId, auth.deviceId,
   String(ev.event_type || ev.kind || ''), String(ev.entity_type || ''), String(ev.entity_id || ev.objectId || ''), String(ev.context || ''),
   String(ev.text || ev.raw_note || (ev.meta && ev.meta.note) || ''), ev.amount == null ? '' : ev.amount, String(ev.category || ev.finance_type || ''),
   mediaUrl || '', JSON.stringify(stripMediaBase64_(ev)), 'synced', 'new', '', '', '', String(ev.source_revision || '')
 ]);
 return s.getLastRow();
}
function appendAvitoInbox_(ev, auth, mediaUrl, sourceFilename) {
 const s = sheet_(CFG.AVITO_INBOX_SHEET);
 s.appendRow([
   String(ev.avito_event_id || ev.event_id || ev.id || ''),
   String(ev.event_id || ev.id || ''),
   String(ev.created_at || ev.createdAt || ''),
   nowIso_(),
   auth.user.userId,
   auth.deviceId,
   String(ev.listing_ref || (ev.meta && ev.meta.listing_ref) || ''),
   String(ev.related_order_id || ev.objectId || ''),
   String(ev.kind || ev.event_type || ''),
   String(ev.text || (ev.meta && ev.meta.note) || ''),
   mediaUrl || '',
   sourceFilename || String(ev.originalName || ''),
   'new', '',
   JSON.stringify(ev.tags || []),
   JSON.stringify(stripMediaBase64_(ev))
 ]);
}
function authSession_(token, requiredPermission, requestId) {
 token = String(token || '');
 if (!token) throw new Error('SESSION_TOKEN_REQUIRED');
 const tokenHash = sha256Hex_(token);
 const s = sheet_(CFG.SESSIONS_SHEET);
 const hit = findRowBy_(s, 4, tokenHash, 2);
 if (!hit) throw new Error('SESSION_INVALID');
 const values = hit.values;
 const sessionId = String(values[0] || '');
 const userId = String(values[1] || '');
 const deviceId = String(values[2] || '');
 const expiresAt = values[5] ? new Date(values[5]).getTime() : 0;
 const offlineUntil = String(values[6] || '');
 const revokedAt = String(values[7] || '');
 const device = getDevice_(deviceId);
 if (!device || !device.active) {
   if (device && device.wipeOnNextOnline) throw new Error('DEVICE_REVOKED_WIPE');
   throw new Error('DEVICE_REVOKED');
 }
 if (revokedAt) throw new Error('SESSION_REVOKED');
 if (expiresAt && expiresAt <= Date.now()) throw new Error('SESSION_EXPIRED');
 if (String(device.userId || '') !== String(userId || '')) throw new Error('SESSION_DEVICE_USER_MISMATCH');
 const user = getUser_(userId);
 if (!user || !user.active) throw new Error('USER_DISABLED');
 if (requiredPermission && !hasPermission_(user, requiredPermission)) throw new Error('PERMISSION_DENIED:' + requiredPermission);
 return {
   sessionRow: hit.row,
   sessionId: sessionId,
   user: user,
   deviceId: deviceId,
   deviceRow: device.row,
   offlineAccessUntil: offlineUntil,
   wipeOnNextOnline: device.wipeOnNextOnline
 };
}
function issueSession_(userId, deviceId, offlineHours) {
 const token = uuid_() + uuid_().replace(/-/g, '');
 const sessionId = 'SES-' + uuid_();
 const now = new Date();
 const expires = new Date(now.getTime() + CFG.DEFAULT_SESSION_HOURS * 3600000);
 const offlineUntil = new Date(now.getTime() + Number(offlineHours || CFG.DEFAULT_USER_OFFLINE_HOURS) * 3600000);
 sheet_(CFG.SESSIONS_SHEET).appendRow([
   sessionId, userId, deviceId, sha256Hex_(token),
   now.toISOString(), expires.toISOString(), offlineUntil.toISOString(), '', now.toISOString(), ''
 ]);
 return { token: token, session_id: sessionId, offline_access_until: offlineUntil.toISOString() };
}
function getUser_(userId) {
 const s = sheet_(CFG.USERS_SHEET);
 const lastCol = s.getLastColumn();
 const lastRow = s.getLastRow();
 if (lastRow < 3) return null;
 const keys = s.getRange(2, 1, 1, lastCol).getValues()[0];
 const values = s.getRange(3, 1, lastRow - 2, lastCol).getValues();
 for (let i = 0; i < values.length; i++) {
   if (String(values[i][0]) !== String(userId)) continue;
   const row = values[i];
   const perms = {};
   for (let c = 7; c < keys.length; c++) {
     const key = String(keys[c] || '');
     if (!key || key === 'note') continue;
     perms[key] = row[c] === true || String(row[c]).toUpperCase() === 'TRUE';
   }
   const role = String(row[2] || 'USER');
   const status = String(row[4] || 'INACTIVE');
   return {
     row: i + 3,
     userId: String(row[0] || ''),
     name: String(row[1] || ''),
     role: role,
     roleLabel: String(row[3] || ''),
     status: status,
     active: status === 'ACTIVE',
     offlineHours: offlineHoursFromCell_(row[6]),
     permissions: perms
   };
 }
 return null;
}
function publicUser_(u) {
 return { user_id: u.userId, name: u.name, role: u.role, role_label: u.roleLabel, permissions: u.permissions };
}
function hasPermission_(user, key) {
 if (!user || !user.active) return false;
 if (user.role === 'ADMIN1') return true;
 return !!user.permissions[key];
}
function offlineHoursFromCell_(v) {
 if (typeof v === 'number' && isFinite(v) && v > 0) return v;
 const t = String(v || '').trim();
 if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
 return CFG.DEFAULT_USER_OFFLINE_HOURS;
}
function getDevice_(deviceId) {
 const s = sheet_(CFG.DEVICES_SHEET);
 const hit = findRowBy_(s, 1, deviceId, 2);
 if (!hit) return null;
 const v = hit.values;
 return {
   row: hit.row,
   userId: String(v[1] || ''),
   status: String(v[3] || ''),
   active: String(v[3] || '') === 'ACTIVE',
   wipeOnNextOnline: v[10] === true || String(v[10]).toUpperCase() === 'TRUE'
 };
}
function upsertDevice_(deviceId, userId, deviceName, offlineHours) {
 const s = sheet_(CFG.DEVICES_SHEET);
 const hit = findRowBy_(s, 1, deviceId, 2);
 const now = nowIso_();
 const offlineUntil = new Date(Date.now() + Number(offlineHours || 24) * 3600000).toISOString();
 if (hit) {
   s.getRange(hit.row, 2, 1, 11).setValues([[
     userId, deviceName, 'ACTIVE', hit.values[4] || now, now, '', offlineUntil, '', '', false, hit.values[11] || ''
   ]]);
   return hit.row;
 }
 s.appendRow([deviceId, userId, deviceName, 'ACTIVE', now, now, '', offlineUntil, '', '', false, '']);
 return s.getLastRow();
}
function touchSessionAndDevice_(auth) {
 const now = new Date();
 const nowIso = now.toISOString();
 const offlineUntil = new Date(now.getTime() + Number(auth.user.offlineHours || CFG.DEFAULT_USER_OFFLINE_HOURS) * 3600000).toISOString();
 const sessionRow = Number(auth && auth.sessionRow);
 if (Number.isFinite(sessionRow) && sessionRow >= 2) {
   const sessions = sheet_(CFG.SESSIONS_SHEET);
   sessions.getRange(sessionRow, 7).setValue(offlineUntil);
   sessions.getRange(sessionRow, 9).setValue(nowIso);
 }
 let deviceRow = Number(auth && auth.deviceRow);
 if (!(Number.isFinite(deviceRow) && deviceRow >= 2) && auth && auth.deviceId) {
   const device = getDevice_(auth.deviceId);
   deviceRow = Number(device && device.row);
 }
 if (Number.isFinite(deviceRow) && deviceRow >= 2) {
   const devices = sheet_(CFG.DEVICES_SHEET);
   devices.getRange(deviceRow, 6).setValue(nowIso);
   devices.getRange(deviceRow, 8).setValue(offlineUntil);
 }
 auth.offlineAccessUntil = offlineUntil;
}
/* ===== backend v0.2.8 / Q-013: durable inbox router + finance idempotency ===== */
function normalizePersonName_(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function findActiveUsersByName_(name) {
 const n=normalizePersonName_(name); if(!n)return [];
 const s=sheet_(CFG.USERS_SHEET), last=s.getLastRow(), out=[]; if(last<3)return out;
 const vals=s.getRange(3,1,last-2,7).getValues();
 vals.forEach(function(r){if(normalizePersonName_(r[1])===n && String(r[4]||'')==='ACTIVE'){const u=getUser_(String(r[0]||''));if(u)out.push(u);}});
 return out;
}
function revokeDeviceSessionsInternal_(deviceId, reason) {
 const s=sheet_(CFG.SESSIONS_SHEET), last=s.getLastRow(); if(last<2)return 0; const vals=s.getRange(2,1,last-1,10).getValues(); let n=0;
 vals.forEach(function(r,i){if(String(r[2]||'')===String(deviceId) && !String(r[7]||'')){s.getRange(i+2,8).setValue(nowIso_());s.getRange(i+2,10).setValue(cleanText_(reason||'Revoked',500));n++;}}); return n;
}
function findSuccessfulSyncLog_(eventId) {
 const s=sheet_(CFG.SYNC_LOG_SHEET), last=s.getLastRow(); if(last<2)return null;
 const vals=s.getRange(2,1,last-1,10).getValues();
 for(let i=vals.length-1;i>=0;i--){const r=vals[i];if(String(r[1]||'')!==String(eventId))continue;const val=String(r[6]||'');if(val==='OK')return {row:i+2,values:r};}
 return null;
}
function findGeneralInboxEvent_(eventId) { return findRowBy_(sheet_(CFG.INBOX_SHEET),1,eventId,2); }
function isFinalProcessingStatus_(v) { return /^(processed|pending_review)$/i.test(String(v||'')); }
function setInboxProcessing_(row,status,processedBy,error,sourceRevision) {
 const s=sheet_(CFG.INBOX_SHEET); s.getRange(row,16).setValue(status); s.getRange(row,17).setValue(processedBy||CFG.VERSION);
 s.getRange(row,18).setValue(isFinalProcessingStatus_(status)?nowIso_():''); s.getRange(row,19).setValue(error||'');
 if(sourceRevision!==undefined)s.getRange(row,20).setValue(sourceRevision||'');
}
function parseAmount_(v){const s=String(v==null?'':v).replace(/\s/g,'').replace(',','.').replace(/[^0-9.-]/g,'');const n=Number(s);return Number.isFinite(n)&&n>0?n:null;}
function mapFinanceType_(v){const s=String(v||'').toLowerCase();if(/(приход|доход|income|поступ)/.test(s))return 'Приход';if(/(расход|трата|траты|expense|покуп)/.test(s))return 'Расход';return '';}
function parseFinanceIntent_(ev){
 ev=ev||{};const meta=ev.meta||{};const kind=String(ev.kind||ev.event_type||'').toLowerCase(),ctx=String(ev.context||'').toLowerCase(),text=String(ev.text||ev.raw_note||meta.rawText||'').trim();
 let type=mapFinanceType_(ev.finance_type||ev.category||meta.financeType||meta.type), amount=parseAmount_(ev.amount!=null?ev.amount:meta.amount);
 const financeContext=kind==='finance-entry'||kind==='wallet'||(ctx==='wallet'&&['photo','audio','voice','document'].indexOf(kind)<0);
 if(!type&&!financeContext)type=mapFinanceType_(text);
 if(!amount&&!financeContext){const nums=(text.match(/(?:^|\s)(\d[\d\s]*(?:[,.]\d{1,2})?)(?=\s|₽|руб|$)/gi)||[]).map(parseAmount_).filter(Boolean);if(nums.length===1)amount=nums[0];else if(nums.length>1)return {candidate:true,ambiguous:true,reason:'MULTIPLE_AMOUNTS'};}
 if(!amount&&financeContext)amount=parseAmount_(String(text).match(/\d[\d\s]*(?:[,.]\d{1,2})?/g)?.[0]||'');
 const hasIncome=/(приход|доход|поступ)/i.test(text),hasExpense=/(расход|трата|траты|покуп)/i.test(text);
 if(hasIncome&&hasExpense)return {candidate:true,ambiguous:true,reason:'MIXED_DIRECTION'};
 const candidate=financeContext||!!type;
 if(!candidate)return {candidate:false};
 if(!type||!amount)return {candidate:true,ambiguous:true,reason:!type?'TYPE_UNCLEAR':'AMOUNT_UNCLEAR'};
 return {candidate:true,ambiguous:false,type:type,amount:amount,currency:String(ev.currency||meta.currency||'RUB'),text:text||'Без описания',orderId:String(ev.entity_id||ev.objectId||''),category:String(meta.financeCategory||'Не определено'),subcategory:String(meta.financeSubcategory||'Не определено')};
}
function financeOperationId_(eventId){return 'APP-'+String(eventId||'');}
function findFinanceOperation_(operationId){return findRowBy_(sheet_('Финансы'),1,operationId,2);}
function sourceEventDate_(createdAt){const d=new Date(createdAt||'');return isNaN(d.getTime())?new Date():d;}
function correctedActorUserId_(rawUserId,deviceId){const d=getDevice_(deviceId);return d&&d.userId?String(d.userId):String(rawUserId||'');}
function ownerDisplayName_(key){return key==='sergey'?'Сергей':key==='evgeny'?'Евгений':'';}
function financeWaveFindPartnerParty_(ownerKey){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Контрагенты',1),uid=ownerKey==='sergey'?'ADMIN1':ownerKey==='evgeny'?'EMR-002':'',name=ownerDisplayName_(ownerKey);
 let hit=null;
 t.rows.forEach(function(r){if(hit)return;const status=String(valueBy_(t,r,'status')||'ACTIVE');if(status==='ARCHIVED')return;if(uid&&String(valueBy_(t,r,'linked_user_id')||'')===uid)hit=tableRowObject_(t,r);});
 if(hit)return hit;
 t.rows.forEach(function(r){if(hit)return;const status=String(valueBy_(t,r,'status')||'ACTIVE');if(status==='ARCHIVED')return;if(normalizePersonName_(valueBy_(t,r,'display_name'))===normalizePersonName_(name))hit=tableRowObject_(t,r);});
 return hit;
}
function financeWaveFundingDue_(partyId){
 if(!partyId)return 0;const t=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1);let n=0;
 t.rows.forEach(function(r){if(String(valueBy_(t,r,'partner_party_id')||'')!==String(partyId))return;if(String(valueBy_(t,r,'status')||'POSTED')!=='POSTED')return;n+=Number(valueBy_(t,r,'funding_delta')||0);});return n;
}
function financeWaveSettlementByEvent_(eventId,entryType){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1);for(let i=0;i<t.rows.length;i++){const r=t.rows[i];if(String(valueBy_(t,r,'source_event_id')||'')===String(eventId)&&String(valueBy_(t,r,'entry_type')||'')===String(entryType))return tableRowObject_(t,r);}return null;
}
function financeWaveAppendSettlement_(eventId,entryType,party,amount,fundingDelta,distributionDelta,financeId,orderId,actorId,comment,operationGroup){
 const existing=financeWaveSettlementByEvent_(eventId,entryType);if(existing)return existing;
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1),head=w1HeadObject_('partner_settlement'),nextRev=head.current_rev+1,now=nowIso_(),id='PSET-'+uuid_();
 const obj={settlement_entry_id:id,occurred_at:now,effective_date:Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy-MM-dd'),partner_party_id:String(party.party_id||''),entry_type:entryType,funding_delta:Number(fundingDelta||0),distribution_delta:Number(distributionDelta||0),amount:Number(amount||0),currency:'RUB',order_id:String(orderId||''),finance_id:String(financeId||''),obligation_id:'',reconciliation_id:'',operation_group:String(operationGroup||eventId),source_event_id:String(eventId),comment:cleanText_(comment||'',1000),status:'POSTED',reversal_of_entry_id:'',created_at:now,created_by_user_id:String(actorId||''),last_event_id:String(eventId),record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};
 obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('partner_settlement',nextRev,eventId);return obj;
}
function upsertStructuredOwnerFundedExpense_(eventId,ev,intent,rawUserId,deviceId){
 const meta=ev.meta||{},src=String(meta.paymentSource||'').toUpperCase(),owner=String(meta.partnerOwner||'').toLowerCase();
 if(meta.q032Structured!==true||src!=='PERSON'||intent.type!=='Расход'||!owner)return null;
 const party=financeWaveFindPartnerParty_(owner);if(!party)return {handled:true,ok:true,processing_status:'pending_review',error:'PARTNER_PARTY_REQUIRED',source_revision:'route=FINANCE;reason=PARTNER_PARTY_REQUIRED;owner='+owner};
 const opId=financeOperationId_(eventId),existing=findFinanceOperation_(opId);if(existing)return {handled:true,ok:true,processing_status:'processed',operation_id:opId,source_revision:'master_operation='+opId+'; idempotent_existing=true'};
 const actorId=correctedActorUserId_(rawUserId,deviceId),actor=getUser_(actorId),actorName=actor?actor.name:'',dt=sourceEventDate_(ev.created_at||ev.createdAt),planned=meta.planned===true||meta.actual===false,planState=String(meta.planState||'').toUpperCase()||(planned?'PLANNED':'NONE');
 ensureStep2Schema_();
 const fobj={'ID операции':opId,'Дата':dt,'Тип':'Расход','Категория':intent.category,'Подкатегория':intent.subcategory,'№ заказа':intent.orderId,'Контрагент / поставщик':cleanText_(meta.counterparty||'',160),'Описание':intent.text,'Количество':1,'Единица':'операция','Цена единицы':intent.amount,'Сумма':intent.amount,'Сотрудник':actorName,'Фактическая операция':planned?'Нет':'Да','Источник':'Приложение / event_id '+eventId+' / q032','Комментарий':'Q-032 structured finance; personal-paid business expense','Дата изменения':new Date(),'created_by_user_id':actorId,'created_by_name':actorName,'updated_by_user_id':actorId,'updated_by_name':actorName,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1,'Источник денег / оплаты':'PERSON','Группа операции':eventId,'Финансовый смысл':'PERSONAL_PAID_BUSINESS_EXPENSE',counterparty_party_id:String(meta.counterpartyPartyId||''),cash_destination:'NONE',partner_party_id:String(party.party_id||''),partner_effect:planned?'NONE':'FUNDING_INCREASE',partner_settlement_entry_id:'',obligation_id:String(meta.obligationId||''),plan_state:planState,due_date:String(meta.dueDate||''),correction_of_finance_id:String(meta.correctionOfFinanceId||'')};
 w1AppendFinance_(fobj,eventId);
 if(!planned){const se=financeWaveAppendSettlement_(eventId,'PERSONAL_PAID_BUSINESS_EXPENSE',party,intent.amount,intent.amount,0,opId,intent.orderId,actorId,intent.text,eventId);const hit=findFinanceOperation_(opId),t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1);if(hit){setByHeader_(t,hit.row,'partner_settlement_entry_id',se.settlement_entry_id);w1TouchDomainRow_('finance',t,hit.row,eventId+'-settlement-link');}}
 const finalHit=findFinanceOperation_(opId),finalTable=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),after=finalHit?tableRowObject_(finalTable,finalHit.values):fobj;auditMutation_('finance',opId,'create',{user:{userId:actorId,name:actorName},deviceId:deviceId},eventId,{},after,'Q-032 personal-paid business expense');
 return {handled:true,ok:true,processing_status:'processed',operation_id:opId,source_revision:'master_operation='+opId+'; q032_personal=true'};
}
function upsertStructuredPersonalIncome_(eventId,ev,intent,rawUserId,deviceId){
 const meta=ev.meta||{},dest=String(meta.cashDestination||'').toUpperCase(),owner=String(meta.partnerOwner||'').toLowerCase();
 if(meta.q032Structured!==true||dest!=='PERSON'||intent.type!=='Приход'||!owner)return null;
 const party=financeWaveFindPartnerParty_(owner);if(!party)return {handled:true,ok:true,processing_status:'pending_review',error:'PARTNER_PARTY_REQUIRED',source_revision:'route=FINANCE;reason=PARTNER_PARTY_REQUIRED;owner='+owner};
 const due=financeWaveFundingDue_(party.party_id);if(intent.amount>due+0.009)return {handled:true,ok:true,processing_status:'pending_review',error:'PERSONAL_INCOME_ALLOCATION_REQUIRED',source_revision:'route=FINANCE;reason=PERSONAL_INCOME_ALLOCATION_REQUIRED;funding_due='+due};
 const opId=financeOperationId_(eventId),existing=findFinanceOperation_(opId);if(existing)return {handled:true,ok:true,processing_status:'processed',operation_id:opId,source_revision:'master_operation='+opId+'; idempotent_existing=true'};
 const actorId=correctedActorUserId_(rawUserId,deviceId),actor=getUser_(actorId),actorName=actor?actor.name:'',dt=sourceEventDate_(ev.created_at||ev.createdAt);ensureStep2Schema_();
 const fobj={'ID операции':opId,'Дата':dt,'Тип':'Приход','Категория':intent.category,'Подкатегория':intent.subcategory,'№ заказа':intent.orderId,'Контрагент / поставщик':cleanText_(meta.counterparty||'',160),'Описание':intent.text,'Количество':1,'Единица':'операция','Цена единицы':intent.amount,'Сумма':intent.amount,'Сотрудник':actorName,'Фактическая операция':'Да','Источник':'Приложение / event_id '+eventId+' / q032','Комментарий':'Q-032 business income received personally','Дата изменения':new Date(),'created_by_user_id':actorId,'created_by_name':actorName,'updated_by_user_id':actorId,'updated_by_name':actorName,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1,'Источник денег / оплаты':'NONE','Группа операции':eventId,'Финансовый смысл':'BUSINESS_INCOME_RECEIVED_PERSONALLY',counterparty_party_id:String(meta.counterpartyPartyId||''),cash_destination:'PERSON',partner_party_id:String(party.party_id||''),partner_effect:'INCOME_OFFSET_FUNDING',partner_settlement_entry_id:'',obligation_id:String(meta.obligationId||''),plan_state:'NONE',due_date:'',correction_of_finance_id:String(meta.correctionOfFinanceId||'')};
 w1AppendFinance_(fobj,eventId);const se=financeWaveAppendSettlement_(eventId,'BUSINESS_INCOME_RECEIVED_PERSONALLY',party,intent.amount,-intent.amount,0,opId,intent.orderId,actorId,intent.text,eventId);const hit=findFinanceOperation_(opId),t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1);if(hit){setByHeader_(t,hit.row,'partner_settlement_entry_id',se.settlement_entry_id);w1TouchDomainRow_('finance',t,hit.row,eventId+'-settlement-link');}
 const finalHit=findFinanceOperation_(opId),after=finalHit?tableRowObject_(tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),finalHit.values):fobj;auditMutation_('finance',opId,'create',{user:{userId:actorId,name:actorName},deviceId:deviceId},eventId,{},after,'Q-032 business income received personally');
 return {handled:true,ok:true,processing_status:'processed',operation_id:opId,source_revision:'master_operation='+opId+'; q032_personal_income=true'};
}
function upsertOwnerFundedExpense_(eventId,ev,intent,rawUserId,deviceId){
 const structured=upsertStructuredOwnerFundedExpense_(eventId,ev,intent,rawUserId,deviceId);if(structured)return structured;
 const meta=ev.meta||{},src=String(meta.paymentSource||'').toLowerCase();
 const owner=src==='personal_sergey'?'sergey':src==='personal_evgeny'?'evgeny':'';
 if(!owner||intent.type!=='Расход'||meta.planned===true||meta.actual===false)return null;
 const expenseId=financeOperationId_(eventId),ownerId=expenseId+'-OWNER',ownerName=ownerDisplayName_(owner);
 const actorId=correctedActorUserId_(rawUserId,deviceId),actor=getUser_(actorId),actorName=actor?actor.name:'',dt=sourceEventDate_(ev.created_at||ev.createdAt);
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 let madeExpense=false,madeOwner=false;
 try{
   ensureStep2Schema_();
   if(!findFinanceOperation_(expenseId)){
     const expense={'ID операции':expenseId,'Дата':dt,'Тип':'Расход','Категория':intent.category,'Подкатегория':intent.subcategory,'№ заказа':intent.orderId,'Контрагент / поставщик':cleanText_(meta.counterparty||'',160),'Описание':intent.text,'Количество':1,'Единица':'операция','Цена единицы':intent.amount,'Сумма':intent.amount,'Сотрудник':actorName,'Фактическая операция':'Да','Источник':'Приложение / event_id '+eventId+' / owner-funded','Комментарий':'Q-025 owner-funded expense; group='+eventId+'; owner='+ownerName,'Дата изменения':new Date(),'created_by_user_id':actorId,'created_by_name':actorName,'updated_by_user_id':actorId,'updated_by_name':actorName,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1};
     w1AppendFinance_(expense,eventId);madeExpense=true;
     auditMutation_('finance',expenseId,'create',{user:{userId:actorId,name:actorName},deviceId:deviceId},eventId,{},expense,'Q-025 legacy: расход оплачен личными средствами '+ownerName);
   }
   if(!findFinanceOperation_(ownerId)){
     const contribution={'ID операции':ownerId,'Дата':dt,'Тип':'Приход','Категория':'Вклад владельца','Подкатегория':'Личные средства '+ownerName,'№ заказа':'','Контрагент / поставщик':ownerName,'Описание':'Личная оплата '+ownerName+' за расход производства: '+intent.text,'Количество':1,'Единица':'вклад','Цена единицы':intent.amount,'Сумма':intent.amount,'Сотрудник':actorName,'Фактическая операция':'Да','Источник':'Приложение / event_id '+eventId+' / owner-funded','Комментарий':'Q-025 paired owner contribution; group='+eventId,'Дата изменения':new Date(),'created_by_user_id':actorId,'created_by_name':actorName,'updated_by_user_id':actorId,'updated_by_name':actorName,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1};
     w1AppendFinance_(contribution,eventId);madeOwner=true;
     auditMutation_('finance',ownerId,'create',{user:{userId:actorId,name:actorName},deviceId:deviceId},eventId,{},contribution,'Q-025 legacy paired owner contribution '+ownerName);
   }
 }finally{lock.releaseLock();}
 if(!findFinanceOperation_(expenseId)||!findFinanceOperation_(ownerId))throw new Error('OWNER_FUNDED_PAIR_READBACK_FAILED');
 return {handled:true,ok:true,processing_status:'processed',operation_id:expenseId,source_revision:'master_operation='+expenseId+'; owner_operation='+ownerId+'; group='+eventId+'; created='+(madeExpense||madeOwner)};
}
function upsertFinanceFromEvent_(eventId,ev,rawUserId,deviceId){
 const intent=parseFinanceIntent_(ev); if(!intent.candidate)return {handled:false}; if(intent.ambiguous)return {handled:true,ok:true,processing_status:'pending_review',error:intent.reason,source_revision:'route=FINANCE;reason='+intent.reason};
 const personalIncome=upsertStructuredPersonalIncome_(eventId,ev,intent,rawUserId,deviceId);if(personalIncome)return personalIncome;
 const paired=upsertOwnerFundedExpense_(eventId,ev,intent,rawUserId,deviceId);if(paired)return paired;
 const opId=financeOperationId_(eventId), existing=findFinanceOperation_(opId); if(existing)return {handled:true,ok:true,processing_status:'processed',operation_id:opId,source_revision:'master_operation='+opId+'; idempotent_existing=true'};
 const actorId=correctedActorUserId_(rawUserId,deviceId), actor=getUser_(actorId), actorName=actor?actor.name:'',meta=ev.meta||{};
 const ownerKey=ownerNameKey_([meta.ownerName,meta.financeSubcategory,intent.subcategory,intent.text].join(' '));
 if(intent.category==='Возврат владельцу'&&ownerKey&&intent.amount>currentOwnerDebt_(ownerKey)+0.009)return {handled:true,ok:true,processing_status:'pending_review',error:'OWNER_RETURN_EXCEEDS_DEBT',source_revision:'route=FINANCE;reason=OWNER_RETURN_EXCEEDS_DEBT'};
 ensureStep2Schema_();
 const structured=meta.q032Structured===true,planned=meta.planned===true||meta.actual===false,planState=structured?(String(meta.planState||'').toUpperCase()||(planned?'PLANNED':'NONE')):'',paymentSource=structured?String(meta.paymentSource||'PRODUCTION_WALLET').toUpperCase():'',cashDestination=structured?String(meta.cashDestination||(intent.type==='Приход'?'PRODUCTION_WALLET':'NONE')).toUpperCase():'';
 const fobj={'ID операции':opId,'Дата':sourceEventDate_(ev.created_at||ev.createdAt),'Тип':intent.type,'Категория':intent.category,'Подкатегория':intent.subcategory,'№ заказа':intent.orderId,'Контрагент / поставщик':cleanText_(meta.counterparty||meta.ownerName||'',160),'Описание':intent.text,'Количество':1,'Единица':'операция','Цена единицы':intent.amount,'Сумма':intent.amount,'Сотрудник':actorName,'Фактическая операция':planned?'Нет':'Да','Источник':'Приложение / event_id '+eventId,'Комментарий':structured?'Q-032 structured finance':'AUTO APP-Q014; source event processed idempotently; currency='+intent.currency,'Дата изменения':new Date(),'created_by_user_id':actorId,'created_by_name':actorName,'updated_by_user_id':actorId,'updated_by_name':actorName,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1,'Источник денег / оплаты':paymentSource,'Группа операции':structured?eventId:'','Финансовый смысл':structured?(planned?'PLANNED_FINANCE':'DIRECT_FINANCE'):'',counterparty_party_id:String(meta.counterpartyPartyId||''),cash_destination:cashDestination,partner_party_id:'',partner_effect:'NONE',partner_settlement_entry_id:'',obligation_id:String(meta.obligationId||''),plan_state:planState,due_date:String(meta.dueDate||''),correction_of_finance_id:String(meta.correctionOfFinanceId||'')};
 w1AppendFinance_(fobj,eventId);
 const fakeAuth={user:{userId:actorId,name:actorName},deviceId:deviceId}; auditMutation_('finance',opId,'create',fakeAuth,eventId,{},fobj,'');
 const check=findFinanceOperation_(opId); if(!check)throw new Error('FINANCE_WRITE_READBACK_FAILED');
 return {handled:true,ok:true,processing_status:'processed',operation_id:opId,source_revision:'master_operation='+opId+'; idempotent_insert=true'};
}
function eventFromInboxRow_(v){let payload={};try{payload=JSON.parse(String(v[13]||'{}'))||{}}catch(_){payload={}};return Object.assign({},payload,{event_id:String(v[0]||payload.event_id||''),created_at:String(v[1]||payload.created_at||''),event_type:String(v[5]||payload.event_type||''),kind:String(payload.kind||v[5]||''),entity_type:String(v[6]||payload.entity_type||''),entity_id:String(v[7]||payload.entity_id||''),objectId:String(v[7]||payload.objectId||''),context:String(v[8]||payload.context||''),text:String(v[9]||payload.text||''),amount:v[10]===''?payload.amount:v[10],category:String(v[11]||payload.category||''),media_url:String(v[12]||'')});}
function findGalleryHit_(id){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Файлы и портфолио',1); let hit=null;
 t.rows.forEach(function(r,i){if(hit)return; if(String(valueBy_(t,r,'ID файла')||'')===String(id)||String(valueBy_(t,r,'last_event_id')||'')===String(id))hit={table:t,row:i+2,values:r};});
 return hit;
}
function isGalleryEvent_(ev){
 const kind=String(ev.kind||ev.event_type||'').toLowerCase(), ctx=String(ev.context||'').toLowerCase();
 return kind==='photo'&&(ctx==='portfolio-candidate'||ctx==='gallery-approved-local'||ctx==='gallery'||ctx.indexOf('gallery-')===0);
}
function upsertGalleryFromEvent_(eventId,ev,rawUserId,deviceId,mediaUrls){
 ensureStep2Schema_();
 const existing=findGalleryHit_(eventId);
 if(existing){
   const id=cleanOut_(valueBy_(existing.table,existing.values,'ID файла'));
   return {handled:true,ok:true,processing_status:'processed',operation_id:id,source_revision:'gallery='+id+'; idempotent_existing=true'};
 }
 const meta=ev.meta||{}, ctx=String(ev.context||'').toLowerCase(), actor=actorFromIds_(rawUserId,deviceId);
 const approved=ctx==='gallery-approved-local'||meta.approvedLocally===true;
 const id='GAL-'+String(eventId), rawOrder=cleanText_(meta.orderId||ev.objectId||ev.entity_id||'',80);
 const orderId=/^20\d{2}-\d{3}$/.test(rawOrder)?rawOrder:'';
 const orderHit=orderId?findOrderHit_(orderId):null, stableOrderId=orderHit?cleanOut_(valueBy_(orderHit.table,orderHit.values,'ID заказа')):'';
 const driveUrl=String((mediaUrls||[])[0]||'');
 if(!driveUrl)return {handled:true,ok:false,processing_status:'error',error:'GALLERY_MEDIA_REQUIRED',source_revision:'route=GALLERY;reason=GALLERY_MEDIA_REQUIRED'};
 const note=cleanText_(meta.note||meta.comment||'',5000), fileName=cleanText_(meta.appName||meta.originalName||ev.text||('GALLERY_'+eventId+'.jpg'),240);
 const obj={
   'ID файла':id,'№ заказа':orderId,'Позиция':'','Дата':cleanText_(ev.created_at||nowIso_(),60),'Тип':'Фото','Категория':'Галерея',
   'Название файла':fileName,'Описание':note,'Google Drive':driveUrl,'Версия':cleanText_(meta.app_version||'',80),'Актуальный':true,
   'Кандидат в портфолио':!approved,'Одобрен в портфолио':approved,'Откуда получен':'Приложение / '+actor.name,
   'Требует разбора':!approved,'Комментарий':note,'created_by_user_id':actor.userId,'created_by_name':actor.name,
   'updated_by_user_id':actor.userId,'updated_by_name':actor.name,'favorite_user_ids_json':'[]','last_event_id':eventId,'record_version':1,
   'lifecycle_state':'INTERNAL_SHARED','portfolio_state':approved?'APPROVED':'CANDIDATE','parent_entity_type':stableOrderId?'order':'','parent_entity_id':stableOrderId
 };
 w1AppendGallery_(obj,eventId);
 const fakeAuth={user:{userId:actor.userId,name:actor.name},deviceId:deviceId}; auditMutation_('gallery',id,'submit',fakeAuth,eventId,{},obj,'');
 return {handled:true,ok:true,processing_status:'processed',operation_id:id,source_revision:'gallery='+id+'; stored=true'};
}
function routeGeneralInboxRow_(row, explicitEvent){
 const sh=sheet_(CFG.INBOX_SHEET), v=sh.getRange(row,1,1,20).getValues()[0], current=String(v[15]||'new');
 if(isFinalProcessingStatus_(current))return {ok:true,processing_status:current,operation_id:(String(v[19]||'').match(/master_operation=([^;]+)/)||[])[1]||'',source_revision:String(v[19]||'')};
 setInboxProcessing_(row,'processing',CFG.VERSION,'',String(v[19]||''));
 try{
   const ev=explicitEvent||eventFromInboxRow_(v), eventId=String(v[0]||ev.event_id||''), kind=String(ev.kind||ev.event_type||'').toLowerCase(), ctx=String(ev.context||'').toLowerCase();
   const mediaUrls=Array.isArray(ev.server_media_urls)?ev.server_media_urls.filter(Boolean):(String(v[12]||'')?[String(v[12])]:[]);
   if(kind==='record-mutation'){
     const mutation=handleRecordMutationEvent_(eventId,ev,String(v[3]||''),String(v[4]||''));
     setInboxProcessing_(row,mutation.processing_status,CFG.VERSION,mutation.error||'',mutation.source_revision||'');
     return mutation;
   }
   if(kind==='order-create'){
     const created=createOrderFromEvent_(eventId,ev,String(v[3]||''),String(v[4]||''),mediaUrls);
     setInboxProcessing_(row,created.processing_status,CFG.VERSION,created.error||'',created.source_revision||'');
     return created;
   }
   if(kind==='appdev-issue'){
     const issue=createAppDevIssueFromEvent_(eventId,ev,String(v[3]||''),String(v[4]||''),mediaUrls);
     setInboxProcessing_(row,issue.processing_status,CFG.VERSION,issue.error||'',issue.source_revision||'');
     return issue;
   }
   if(isGalleryEvent_(ev)){
     const gallery=upsertGalleryFromEvent_(eventId,ev,String(v[3]||''),String(v[4]||''),mediaUrls);
     setInboxProcessing_(row,gallery.processing_status,CFG.VERSION,gallery.error||'',gallery.source_revision||'');
     return gallery;
   }
   const fin=upsertFinanceFromEvent_(eventId,ev,String(v[3]||''),String(v[4]||''));
   if(fin.handled){setInboxProcessing_(row,fin.processing_status,CFG.VERSION,fin.error||'',fin.source_revision||'');return fin;}
   let reason='AMBIGUOUS_GENERAL', route='GENERAL';
   if(ctx==='order'||/^202\d-\d+/.test(String(ev.objectId||ev.entity_id||''))){route='ORDER';reason='ROUTE_ORDER_PROFILE';}
   else if(kind==='quote-draft'||ctx==='calculator'){route='QUOTE';reason='ROUTE_CALCULATOR_PROFILE';}
   else if(kind==='audio'||kind==='voice'){route='AUDIO';reason=String(v[12]||'')?'ROUTE_AUDIO_TRANSCRIPTION':'AUDIO_MEDIA_MISSING';}
   else if(kind==='photo'||kind==='portfolio-candidate'||ctx.indexOf('gallery')>=0||ctx==='portfolio-candidate'){route='GALLERY';reason=String(v[12]||'')?'ROUTE_GALLERY_REVIEW':'PHOTO_MEDIA_MISSING';}
   else if(kind==='document'){route='DOCUMENT';reason=String(v[12]||'')?'ROUTE_DOCUMENT_REVIEW':'DOCUMENT_MEDIA_MISSING';}
   const source='route='+route+(String(v[12]||'')?'; media='+String(v[12]):'');
   setInboxProcessing_(row,'pending_review',CFG.VERSION,reason,source);return {ok:true,processing_status:'pending_review',error:reason,source_revision:source};
 }catch(err){const e=safeErr_(err);setInboxProcessing_(row,'error',CFG.VERSION,e,String(v[19]||''));return {ok:false,processing_status:'error',error:e};}
}
function reprocessInboxBacklog_(limit,excludeEventId){const sh=sheet_(CFG.INBOX_SHEET),last=sh.getLastRow();if(last<2)return 0;const vals=sh.getRange(2,1,last-1,20).getValues();let n=0;for(let i=0;i<vals.length&&n<Number(limit||20);i++){const v=vals[i],eid=String(v[0]||''),st=String(v[15]||'new');if(eid===String(excludeEventId||'')||!/^new$|^error$/i.test(st))continue;routeGeneralInboxRow_(i+2,null);n++;}return n;}
function syncEventExists_(eventId) { return !!findSuccessfulSyncLog_(eventId); }
function syncLog_(eventId, userId, deviceId, eventType, raw, validation, duplicateFlag, processing, error) {
 sheet_(CFG.SYNC_LOG_SHEET).appendRow([
   nowIso_(), eventId, userId, deviceId, eventType,
   JSON.stringify(stripMediaBase64_(raw)), validation, duplicateFlag === true, processing, error || ''
 ]);
}
function authLog_(userId, deviceId, action, result, detail, requestId, sessionId) {
 sheet_(CFG.AUTH_LOG_SHEET).appendRow([
   nowIso_(), userId || '', deviceId || '', action, result, cleanText_(detail || '', 1000), requestId || '', sessionId || ''
 ]);
}
function deny_(error, userId, deviceId, action, requestId, sessionId) {
 authLog_(userId, deviceId, action, 'DENIED', error, requestId, sessionId);
 return { ok: false, error: error, request_id: requestId };
}
/* ===== backend v0.2.9: APP-Q014 STEP 2 ===== */
const STEP2_PERMISSION_DEFS = [
 ['Заказы: редактировать свои','orders.edit-own','orders.edit'],
 ['Заказы: редактировать все','orders.edit-all',''],
 ['Заказы: удалять свои','orders.delete-own',''],
 ['Заказы: удалять все','orders.delete-all',''],
 ['Кошелёк: редактировать свои','wallet.edit-own','wallet.edit'],
 ['Кошелёк: редактировать все','wallet.edit-all',''],
 ['Кошелёк: удалять свои','wallet.delete-own',''],
 ['Кошелёк: удалять все','wallet.delete-all',''],
 ['Разработка приложения: видеть','appdev.view','sync.run'],
 ['Разработка приложения: отправлять','appdev.submit','sync.run'],
 ['Разработка приложения: администрировать','appdev.admin','']
];
function ensureStep2Schema_() {
 const props=PropertiesService.getScriptProperties();
 if(props.getProperty('APP_Q015_PHASE_B_SCHEMA_READY_V1')==='1')return true;
 const lock=LockService.getScriptLock(); lock.waitLock(20000);
 try {
   ensurePermissionColumns_();
   ensureColumns_('Заказы',['created_by_user_id','created_by_name','updated_by_user_id','updated_by_name','updated_at_app','is_deleted','last_event_id','record_version','Дата завершения']);
   ensureColumns_('Финансы',['created_by_user_id','created_by_name','updated_by_user_id','updated_by_name','updated_at_app','is_deleted','last_event_id','record_version']);
   ensureColumns_('Файлы и портфолио',['created_by_user_id','created_by_name','updated_by_user_id','updated_by_name','favorite_user_ids_json','last_event_id','record_version']);
   ensureDataSheet_(CFG.AUDIT_SHEET,['audit_id','at','entity_type','entity_id','action','actor_user_id','actor_name','device_id','event_id','before_json','after_json','note']);
   ensureDataSheet_(CFG.APPDEV_SHEET,['local_id','issue_id','status','title','original_text','working_text','created_at','created_by_user_id','created_by_name','device_id','app_version','screen','folder_id','folder_url','doc_id','doc_url','media_urls_json','updated_at','updated_by_user_id','updated_by_name','approved_at','approved_by_user_id','admin_note','last_event_id','record_version']);
   ensureDataSheet_(CFG.CONFLICTS_SHEET,['conflict_id','created_at','status','entity_type','entity_id','event_id','base_record_version','server_record_version','conflicting_fields_json','base_values_json','proposed_patch_json','server_values_json','actor_user_id','actor_name','device_id','resolved_at','resolved_by','resolution','resolution_note']);
   props.setProperty('APP_Q015_PHASE_B_SCHEMA_READY_V1','1');
   return true;
 } finally { lock.releaseLock(); }
}
function ensureDataSheet_(name, headers) {
 const ss=ss_(); let sh=ss.getSheetByName(name);
 if(!sh)sh=ss.insertSheet(name);
 const last=Math.max(sh.getLastColumn(),headers.length);
 const existing=last?sh.getRange(1,1,1,last).getDisplayValues()[0]:[];
 headers.forEach(function(h){
   if(existing.indexOf(h)>=0)return;
   const col=sh.getLastColumn()+1; sh.getRange(1,col).setValue(h); existing.push(h);
 });
 try{sh.hideSheet();}catch(_){}
 return sh;
}
function ensureColumns_(sheetName, headers) {
 const sh=sheet_(sheetName); const last=Math.max(1,sh.getLastColumn());
 const existing=sh.getRange(1,1,1,last).getDisplayValues()[0];
 headers.forEach(function(h){ if(existing.indexOf(h)>=0)return; const col=sh.getLastColumn()+1; sh.getRange(1,col).setValue(h); existing.push(h); });
}
function ensurePermissionColumns_() {
 const sh=sheet_(CFG.USERS_SHEET); let last=sh.getLastColumn();
 const keys=sh.getRange(2,1,1,last).getDisplayValues()[0];
 STEP2_PERMISSION_DEFS.forEach(function(def){
   if(keys.indexOf(def[1])>=0)return;
   const col=sh.getLastColumn()+1;
   sh.getRange(1,col).setValue(def[0]); sh.getRange(2,col).setValue(def[1]);
   const rowCount=Math.max(0,sh.getLastRow()-2);
   if(rowCount){
     const vals=[];
     for(let r=3;r<=sh.getLastRow();r++){
       const role=String(sh.getRange(r,3).getValue()||'');
       if(role==='ADMIN1'){ vals.push([true]); continue; }
       const fallback=def[2];
       let v=false;
       if(fallback){
         const freshKeys=sh.getRange(2,1,1,sh.getLastColumn()).getDisplayValues()[0];
         const fi=freshKeys.indexOf(fallback);
         if(fi>=0)v=yes_(sh.getRange(r,fi+1).getValue());
       }
       vals.push([v]);
     }
     sh.getRange(3,col,vals.length,1).setValues(vals);
   }
   keys.push(def[1]);
 });
}
function dateMs_(v){
 if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return v.getTime();
 if(typeof v==='number'&&isFinite(v))return Math.round((v-25569)*86400000);
 const t=Date.parse(String(v||'')); return isFinite(t)?t:0;
}
function tableRowObject_(table,row){
 const o={}; table.headers.forEach(function(h,i){if(String(h||'').trim())o[String(h).trim()]=cleanOut_(row[i]);}); return o;
}
function setByHeader_(table,rowNum,key,value){
 const idx=table.index[key]; if(idx==null)throw new Error('COLUMN_MISSING:'+key);
 table.sheet.getRange(rowNum,idx+1).setValue(value);
}
function appendByHeaders_(sheetName, obj){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,sheetName,1);
 const row=t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';});
 t.sheet.appendRow(row); return {row:t.sheet.getLastRow(),table:t};
}
function auditMutation_(entityType,entityId,action,auth,eventId,before,after,note){
 ensureStep2Schema_();
 const sh=sheet_(CFG.AUDIT_SHEET),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
 const parentOrder=(after&&after['№ заказа'])||(before&&before['№ заказа'])||'';
 const o={audit_id:'AUD-'+uuid_(),at:nowIso_(),entity_type:entityType,entity_id:entityId,action:action,
   actor_user_id:auth&&auth.user?auth.user.userId:'',actor_name:auth&&auth.user?auth.user.name:'',device_id:auth?auth.deviceId:'',event_id:eventId||'',
   before_json:JSON.stringify(before||{}),after_json:JSON.stringify(after||{}),note:cleanText_(note||'',1000),source:'BACKEND',
   parent_entity_type:parentOrder?'order':'',parent_entity_id:parentOrder,summary:action+' '+entityType+' '+entityId,
   old_version:before&&before.record_version||'',new_version:after&&after.record_version||'',status:'CONFIRMED',metadata_json:'{}'};
 sh.appendRow(headers.map(function(h){return Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';}));
}
function actorFromIds_(userId,deviceId){
 const corrected=correctedActorUserId_(userId,deviceId), u=getUser_(corrected);
 return {userId:corrected,name:u?u.name:''};
}
function nextOrderNumber_(){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1);
 const year=Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy'); let max=0;
 t.rows.forEach(function(r){const m=String(valueBy_(t,r,'№ заказа')||'').match(new RegExp('^'+year+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]||0));});
 const n=String(max+1).padStart(3,'0');
 return {number:year+'-'+n,systemId:'ORD-'+year+'-'+n};
}
function orderDeadlineValue_(v){
 const t=String(v||'').trim();
 if(!t)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(t)){const d=new Date(t+'T12:00:00');if(!isNaN(d.getTime()))return d;}
 return t;
}
function safeFolderPart_(v){return cleanText_(v||'Заказ',80).replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').replace(/^_+|_+$/g,'')||'Заказ';}
function createOrderFolder_(orderNo,title){
 const root=DriveApp.getFolderById(CFG.ORDERS_ROOT_FOLDER_ID);
 const folderName=orderNo+'_'+safeFolderPart_(title);
 const existing=root.getFoldersByName(folderName);
 const folder=existing.hasNext()?existing.next():root.createFolder(folderName);
 ['01_Расчёты','02_Документы','03_Чертежи','04_Фото','05_Аудио','06_Прочее'].forEach(function(n){childFolder_(folder,n);});
 return folder;
}
function childFolder_(root,name){const it=root.getFoldersByName(name);return it.hasNext()?it.next():root.createFolder(name);}
function driveFileFromUrl_(url){const id=driveIdFromUrl_(url); if(!id)return null; try{return DriveApp.getFileById(id)}catch(_){return null}}
function moveMediaUrls_(urls,targetFolder,eventId){
 const out=[]; (urls||[]).forEach(function(url){
   const f=driveFileFromUrl_(url); if(!f)return;
   try{f.moveTo(targetFolder);}catch(_){}
   try{f.setDescription((f.getDescription()||'')+' / bound '+eventId);}catch(_){}
   out.push(f.getUrl());
 }); return out;
}
function createOrderFromEvent_(eventId,ev,rawUserId,deviceId,mediaUrls){
 ensureStep2Schema_();
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1);
 const existing=t.rows.find(function(r){return String(valueBy_(t,r,'last_event_id')||'')===String(eventId);});
 if(existing){
   const no=cleanOut_(valueBy_(t,existing,'№ заказа'));
   return {handled:true,ok:true,processing_status:'processed',operation_id:no,order_id:no,source_revision:'order='+no+'; idempotent_existing=true'};
 }
 const meta=ev.meta||{}, title=cleanText_(meta.title||meta.name||ev.text||'Новый заказ',160), desc=cleanText_(meta.description||meta.comment||'',5000);
 const price=parseAmount_(meta.clientPrice!=null?meta.clientPrice:meta.amount), prepay=parseAmount_(meta.prepayment);
 const deadline=orderDeadlineValue_(cleanText_(meta.deadline||'',40)), comment=cleanText_(meta.comment||'',5000);
 if(!title&&!desc)return {handled:true,ok:true,processing_status:'pending_review',error:'ORDER_TITLE_REQUIRED',source_revision:'route=ORDER_CREATE;reason=ORDER_TITLE_REQUIRED'};
 const ids=nextOrderNumber_(), folder=createOrderFolder_(ids.number,title), photos=childFolder_(folder,'04_Фото');
 const moved=moveMediaUrls_(mediaUrls,photos,eventId);
 const actor=actorFromIds_(rawUserId,deviceId), today=new Date();
 const debt=price!=null?Math.max(0,Number(price)-Number(prepay||0)):'';
 const obj={
   'ID заказа':ids.systemId,'№ заказа':ids.number,'Статус':'Новый','Дата создания':today,'Дата принятия':today,
   'Срок сдачи':deadline||'','Название заказа':title,'Краткое описание':desc,'Цена клиенту':price||'',
   'Получено':prepay||0,'Долг':debt,'Папка Google Drive':folder.getUrl(),'Комментарий':comment,'Последнее изменение':today,
   'created_by_user_id':actor.userId,'created_by_name':actor.name,'updated_by_user_id':actor.userId,'updated_by_name':actor.name,
   'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1
 };
 const appended=appendByHeaders_('Заказы',obj);
 if(prepay&&Number(prepay)>0){
   const opId='APP-ORDER-'+eventId+'-PREPAY';
   if(!findFinanceOperation_(opId)){
     const fobj={
       'ID операции':opId,'Дата':today,'Тип':'Приход','Категория':'Оплата клиента','Подкатегория':'Предоплата','№ заказа':ids.number,
       'Описание':'Предоплата при создании заказа '+ids.number,'Количество':1,'Единица':'операция','Цена единицы':Number(prepay),'Сумма':Number(prepay),
       'Сотрудник':actor.name,'Фактическая операция':'Да','Источник':'Приложение / order-create event_id '+eventId,
       'Комментарий':'AUTO APP-Q014; создано вместе с заказом','Дата изменения':today,
       'created_by_user_id':actor.userId,'created_by_name':actor.name,'updated_by_user_id':actor.userId,'updated_by_name':actor.name,
       'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1
     };
     w1AppendFinance_(fobj,eventId);
   }
 }
 const fakeAuth={user:{userId:actor.userId,name:actor.name},deviceId:deviceId};
 auditMutation_('order',ids.number,'create',fakeAuth,eventId,{},obj,'photos='+moved.length);
 return {handled:true,ok:true,processing_status:'processed',operation_id:ids.number,order_id:ids.number,folder_url:folder.getUrl(),media_urls:moved,source_revision:'order='+ids.number+'; idempotent_insert=true'};
}
function buildAppIssues_(){
 ensureStep2Schema_();
 const t=tableByHeader_(CFG.SPREADSHEET_ID,CFG.APPDEV_SHEET,1), out=[], seen={};
 t.rows.forEach(function(r){
   const local=cleanOut_(valueBy_(t,r,'local_id')); if(!local)return;
   let media=[]; try{media=JSON.parse(String(valueBy_(t,r,'media_urls_json')||'[]'))||[]}catch(_){}
   const item={
     local_id:local, issue_id:cleanOut_(valueBy_(t,r,'issue_id')), status:cleanOut_(valueBy_(t,r,'status')),
     title:cleanOut_(valueBy_(t,r,'title')), original_text:cleanOut_(valueBy_(t,r,'original_text')), working_text:cleanOut_(valueBy_(t,r,'working_text')),
     created_at:cleanOut_(valueBy_(t,r,'created_at')), created_by_user_id:cleanOut_(valueBy_(t,r,'created_by_user_id')),
     created_by_name:cleanOut_(valueBy_(t,r,'created_by_name')), app_version:cleanOut_(valueBy_(t,r,'app_version')), screen:cleanOut_(valueBy_(t,r,'screen')),
     folder_url:cleanOut_(valueBy_(t,r,'folder_url')), doc_url:cleanOut_(valueBy_(t,r,'doc_url')), media_urls:media,
     updated_at:cleanOut_(valueBy_(t,r,'updated_at')), updated_by_name:cleanOut_(valueBy_(t,r,'updated_by_name')),
     approved_at:cleanOut_(valueBy_(t,r,'approved_at')), admin_note:cleanOut_(valueBy_(t,r,'admin_note')), record_version:numberOrNull_(valueBy_(t,r,'record_version'))||0
   };
   out.push(item); seen[String(item.issue_id||item.local_id)]=true;
 });
 try{
   const jss=SpreadsheetApp.openById(CFG.APPDEV_JOURNAL_SPREADSHEET_ID), jsh=jss.getSheetByName(CFG.APPDEV_JOURNAL_SHEET);
   if(jsh&&jsh.getLastRow()>1){
     const rows=jsh.getRange(2,1,jsh.getLastRow()-1,Math.min(18,jsh.getLastColumn())).getDisplayValues();
     rows.forEach(function(r){
       const id=String(r[0]||'').trim(); if(!id||seen[id])return;
       const status=String(r[3]||'').trim();
       out.push({
         local_id:id,issue_id:id,status:status,title:String(r[6]||'Замечание'),
         original_text:String(r[7]||''),working_text:String(r[7]||''),created_at:String(r[1]||''),
         created_by_user_id:'',created_by_name:String(r[2]||''),app_version:'',screen:'',
         folder_url:String(r[8]||''),doc_url:String(r[9]||''),media_urls:[],
         updated_at:String(r[16]||r[1]||''),updated_by_name:'',approved_at:'',admin_note:String(r[17]||''),record_version:1,
         historical:true
       });
       seen[id]=true;
     });
   }
 }catch(_){}
 out.sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));});
 return out.slice(0,300);
}
function issueText_(issueId,localId,title,status,actorName,original,working,adminNote){
 return [
   (issueId||localId)+' — '+(title||'Замечание'),
   'Статус: '+(status||''),
   'Автор: '+(actorName||''),
   '',
   'Исходный текст:',
   original||'',
   '',
   'Рабочий текст:',
   working||original||'',
   adminNote?('\nКомментарий ADMIN1:\n'+adminNote):''
 ].join('\n');
}
function createIssueDoc_(folder,title,original,working,actorName,status,localId,issueId){
 const base=(issueId||localId)+' — '+safeFolderPart_(title).replace(/_/g,' ');
 const file=folder.createFile(base+'.txt',issueText_(issueId,localId,title,status,actorName,original,working,''),MimeType.PLAIN_TEXT);
 return {id:file.getId(),url:file.getUrl()};
}
function rewriteIssueDoc_(row){
 const docId=String(row.doc_id||''); if(!docId)return;
 const file=DriveApp.getFileById(docId);
 const base=(row.issue_id||row.local_id)+' — '+safeFolderPart_(row.title||'Замечание').replace(/_/g,' ');
 file.setName(base+'.txt');
 file.setContent(issueText_(row.issue_id,row.local_id,row.title,row.status,row.created_by_name||row.created_by_user_id,row.original_text,row.working_text,row.admin_note));
}
function createAppDevIssueFromEvent_(eventId,ev,rawUserId,deviceId,mediaUrls){
 ensureStep2Schema_(); const t=tableByHeader_(CFG.SPREADSHEET_ID,CFG.APPDEV_SHEET,1);
 const existing=t.rows.find(function(r){return String(valueBy_(t,r,'last_event_id')||'')===String(eventId);});
 if(existing){
   const local=cleanOut_(valueBy_(t,existing,'local_id')), official=cleanOut_(valueBy_(t,existing,'issue_id'));
   return {handled:true,ok:true,processing_status:'processed',operation_id:official||local,issue_id:official,local_id:local,source_revision:'appdev='+(official||local)+'; idempotent_existing=true'};
 }
 const meta=ev.meta||{}, localId=cleanText_(meta.local_id||ev.objectId||('LOCAL-'+eventId),180);
 const explicitTitle=cleanText_(meta.title||'',180), title=explicitTitle||'Замечание к приложению';
 const original=cleanText_(ev.text||meta.text||'',12000), working=original, actor=actorFromIds_(rawUserId,deviceId);
 if(!original&&!mediaUrls.length&&!explicitTitle)return {handled:true,ok:true,processing_status:'pending_review',error:'APPDEV_CONTENT_REQUIRED',source_revision:'route=APPDEV;reason=APPDEV_CONTENT_REQUIRED'};
 const parent=DriveApp.getFolderById(CFG.APPDEV_INCOMING_FOLDER_ID);
 const folder=childFolder_(parent,'PENDING_'+safeFolderPart_(localId)), mediaFolder=childFolder_(folder,'МЕДИА');
 const moved=moveMediaUrls_(mediaUrls,mediaFolder,eventId);
 const doc=createIssueDoc_(folder,title,original,working,actor.name,'НА РАССМОТРЕНИИ',localId,'');
 const obj={
   'local_id':localId,'issue_id':'','status':'НА РАССМОТРЕНИИ','title':title,'original_text':original,'working_text':working,
   'created_at':nowIso_(),'created_by_user_id':actor.userId,'created_by_name':actor.name,'device_id':deviceId,
   'app_version':cleanText_(meta.app_version||'',80),'screen':cleanText_(meta.screen||'',120),'folder_id':folder.getId(),'folder_url':folder.getUrl(),
   'doc_id':doc.id,'doc_url':doc.url,'media_urls_json':JSON.stringify(moved),'updated_at':nowIso_(),'updated_by_user_id':actor.userId,
   'updated_by_name':actor.name,'approved_at':'','approved_by_user_id':'','admin_note':'','last_event_id':eventId,'record_version':1
 };
 appendByHeaders_(CFG.APPDEV_SHEET,obj);
 const fakeAuth={user:{userId:actor.userId,name:actor.name},deviceId:deviceId}; auditMutation_('appdev',localId,'submit',fakeAuth,eventId,{},obj,'');
 return {handled:true,ok:true,processing_status:'processed',operation_id:localId,local_id:localId,folder_url:folder.getUrl(),media_urls:moved,source_revision:'appdev='+localId+'; stored=true'};
}
function appDevRowByKey_(key){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,CFG.APPDEV_SHEET,1); let hit=null;
 t.rows.forEach(function(r,i){if(hit)return; if(String(valueBy_(t,r,'local_id')||'')===String(key)||String(valueBy_(t,r,'issue_id')||'')===String(key))hit={table:t,row:i+2,values:r};});
 return hit;
}
function handleAppDevList_(body,requestId){
 ensureStep2Schema_(); const auth=authSession_(body.session_token,'appdev.view',requestId); touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,items:buildAppIssues_(),serverTime:nowIso_()};
}
function nextOfficialIssueId_(){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,CFG.APPDEV_SHEET,1); let max=6; const year=Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy');
 t.rows.forEach(function(r){const m=String(valueBy_(t,r,'issue_id')||'').match(/^APP-ISSUE-(\d{4})-(\d+)$/);if(m&&m[1]===year)max=Math.max(max,Number(m[2]||0));});
 return 'APP-ISSUE-'+year+'-'+String(max+1).padStart(3,'0');
}
function appDevObjectFromHit_(hit){
 const o=tableRowObject_(hit.table,hit.values); let media=[]; try{media=JSON.parse(String(o.media_urls_json||'[]'))||[]}catch(_){}
 o.media_urls=media; return o;
}
function writeAppDevJournal_(row){
 if(!row.issue_id)return;
 const ss=SpreadsheetApp.openById(CFG.APPDEV_JOURNAL_SPREADSHEET_ID), sh=ss.getSheetByName(CFG.APPDEV_JOURNAL_SHEET); if(!sh)return;
 const last=Math.max(1,sh.getLastRow()), ids=last>1?sh.getRange(2,1,last-1,1).getDisplayValues().flat():[];
 if(ids.indexOf(row.issue_id)>=0)return;
 sh.appendRow([row.issue_id,formatDate_(new Date()),row.created_by_name||row.created_by_user_id,'ТРЕБУЕТ ОБНОВЛЕНИЯ','MEDIUM','Разработка приложения',
   row.title||'Замечание к приложению',cleanText_(row.working_text||row.original_text||'',600),row.folder_url||'',row.doc_url||'',
   '', 'Утверждено в приложении ADMIN1', '', '', 'NOT_STARTED', '', formatDate_(new Date()), row.admin_note||'']);
}
function handleAppDevUpdate_(body,requestId){
 ensureStep2Schema_(); const auth=authSession_(body.session_token,'appdev.admin',requestId), key=cleanText_(body.issue_key||body.issue_id||body.local_id,180);
 const hit=appDevRowByKey_(key); if(!hit)return deny_('APPDEV_NOT_FOUND',auth.user.userId,auth.deviceId,'appdev_update',requestId,auth.sessionId);
 const before=appDevObjectFromHit_(hit), action=String(body.issue_action||body.mode||'edit').toLowerCase();
 if(body.title!=null)setByHeader_(hit.table,hit.row,'title',cleanText_(body.title,180));
 if(body.working_text!=null)setByHeader_(hit.table,hit.row,'working_text',cleanText_(body.working_text,12000));
 if(body.admin_note!=null)setByHeader_(hit.table,hit.row,'admin_note',cleanText_(body.admin_note,3000));
 let media=before.media_urls||[];
 if(Array.isArray(body.remove_media_urls)&&body.remove_media_urls.length){
   const rm=new Set(body.remove_media_urls.map(String)); media=media.filter(function(u){if(!rm.has(String(u)))return true; const f=driveFileFromUrl_(u);if(f)try{f.setTrashed(true)}catch(_){} return false;});
 }
 if(Array.isArray(body.new_media)&&body.new_media.length){
   const folder=DriveApp.getFolderById(String(before.folder_id||'')), mf=childFolder_(folder,'МЕДИА');
   body.new_media.slice(0,8).forEach(function(m,idx){
     if(!m||!m.base64)return; const bytes=Utilities.base64Decode(String(m.base64)); if(bytes.length>CFG.MAX_MEDIA_BYTES)throw new Error('MEDIA_TOO_LARGE');
     const file=mf.createFile(Utilities.newBlob(bytes,cleanText_(m.mimeType||'image/jpeg',120),safeFileName_(m.fileName||('APPDEV_'+uuid_()+'.jpg')))); media.push(file.getUrl());
   });
 }
 setByHeader_(hit.table,hit.row,'media_urls_json',JSON.stringify(media));
 let status=String(valueBy_(hit.table,hit.values,'status')||'НА РАССМОТРЕНИИ'), issueId=String(valueBy_(hit.table,hit.values,'issue_id')||'');
 const moveIssueFolder_=function(folderId){
   const fid=String(before.folder_id||''); if(!fid||!folderId)return;
   try{DriveApp.getFolderById(fid).moveTo(DriveApp.getFolderById(folderId));}catch(_){}
 };
 if(action==='reject'){status='ОТКЛОНЕНО';setByHeader_(hit.table,hit.row,'status',status);moveIssueFolder_(CFG.APPDEV_ARCHIVE_FOLDER_ID);}
 if(action==='approve'){
   const lock=LockService.getScriptLock(); lock.waitLock(20000);
   try{
     issueId=issueId||nextOfficialIssueId_(); status='ТРЕБУЕТ ОБНОВЛЕНИЯ';
     setByHeader_(hit.table,hit.row,'issue_id',issueId);setByHeader_(hit.table,hit.row,'status',status);
     setByHeader_(hit.table,hit.row,'approved_at',nowIso_());setByHeader_(hit.table,hit.row,'approved_by_user_id',auth.user.userId);
     const folder=DriveApp.getFolderById(String(before.folder_id||'')); folder.setName(issueId+' — '+safeFolderPart_(body.title!=null?body.title:before.title).replace(/_/g,' '));
     try{folder.moveTo(DriveApp.getFolderById(CFG.APPDEV_REQUIRED_FOLDER_ID));}catch(_){}
   } finally{lock.releaseLock();}
 }
 if(action==='work'||action==='reopen'){
   status='В РАБОТЕ'; setByHeader_(hit.table,hit.row,'status',status); moveIssueFolder_(CFG.APPDEV_WORK_FOLDER_ID);
 }
 if(action==='fixed'){
   status='ИСПРАВЛЕНО'; setByHeader_(hit.table,hit.row,'status',status); moveIssueFolder_(CFG.APPDEV_DONE_FOLDER_ID);
   if(body.admin_note==null)setByHeader_(hit.table,hit.row,'admin_note','Исправлено в текущем обновлении. Требуется подтверждение ADMIN1.');
 }
 if(action==='archive'){
   status='В АРХИВЕ'; setByHeader_(hit.table,hit.row,'status',status); moveIssueFolder_(CFG.APPDEV_ARCHIVE_FOLDER_ID);
 }
 if(action==='delete'){
   status='УДАЛЕНО'; setByHeader_(hit.table,hit.row,'status',status); moveIssueFolder_(CFG.APPDEV_ARCHIVE_FOLDER_ID);
 }
 const allowed=['edit','approve','reject','work','reopen','fixed','archive','delete'];
 if(allowed.indexOf(action)<0)throw new Error('APPDEV_ACTION_INVALID');
 setByHeader_(hit.table,hit.row,'updated_at',nowIso_());setByHeader_(hit.table,hit.row,'updated_by_user_id',auth.user.userId);setByHeader_(hit.table,hit.row,'updated_by_name',auth.user.name);
 const oldVer=numberOrNull_(valueBy_(hit.table,hit.values,'record_version'))||0; setByHeader_(hit.table,hit.row,'record_version',oldVer+1);
 const afterHit=appDevRowByKey_(issueId||key), after=appDevObjectFromHit_(afterHit); rewriteIssueDoc_(after); if(action==='approve')writeAppDevJournal_(after);
 auditMutation_('appdev',issueId||key,action,auth,requestId,before,after,'');
 touchSessionAndDevice_(auth); return {ok:true,request_id:requestId,item:after,serverTime:nowIso_()};
}
function mutationPermission_(auth,domain,action,ownerId){
 if(auth.user.role==='ADMIN1')return true;
 const own=ownerId&&String(ownerId)===String(auth.user.userId), p=auth.user.permissions||{};
 const hasNew=Object.prototype.hasOwnProperty.call(p,domain+'.edit-own')||
   Object.prototype.hasOwnProperty.call(p,domain+'.edit-all')||
   Object.prototype.hasOwnProperty.call(p,domain+'.delete-own')||
   Object.prototype.hasOwnProperty.call(p,domain+'.delete-all');
 if(action==='update'){
   if(hasPermission_(auth.user,domain+'.edit-all'))return true;
   if(own&&hasPermission_(auth.user,domain+'.edit-own'))return true;
   if(!hasNew&&domain==='wallet'&&hasPermission_(auth.user,'wallet.edit'))return true;
   if(!hasNew&&domain==='orders'&&hasPermission_(auth.user,'orders.edit'))return true;
   return false;
 }
 if(action==='delete'){
   if(hasPermission_(auth.user,domain+'.delete-all')||hasPermission_(auth.user,'data.delete'))return true;
   return own&&hasPermission_(auth.user,domain+'.delete-own');
 }
 return false;
}
function mutationFieldMap_(entityType){
 if(entityType==='order')return {title:'Название заказа',description:'Краткое описание',client_price:'Цена клиенту',received:'Получено',calc_cost:'Себестоимость расчётная',actual_cost:'Фактические прямые затраты',deadline:'Срок сдачи',completed_at:'Дата завершения',comment:'Комментарий',status:'Статус'};
 if(entityType==='finance')return {type:'Тип',amount:'Сумма',order_id:'№ заказа',category:'Категория',subcategory:'Подкатегория',comment:'Описание',actual:'Фактическая операция'};
 return {};
}
function mutationCompareValue_(key,v){
 if(v==null)return '';
 if(['client_price','received','calc_cost','actual_cost','amount'].indexOf(key)>=0){const n=numberOrNull_(v);return n==null?'':String(Number(n));}
 if(key==='actual'){if(v===true||yes_(v))return 'true';if(v===false||String(v).toLowerCase()==='false'||String(v).toLowerCase()==='нет')return 'false';return String(v);}
 if(key==='deadline'||key==='completed_at')return formatDateMaybe_(v);
 if(key==='status'&&String(v)==='В архив')return 'Архив';
 if(key==='status'&&String(v)==='Завершен')return 'Завершён';
 return String(v);
}
function currentMutationValues_(entityType,table,vals,patch){
 const map=mutationFieldMap_(entityType),out={};
 Object.keys(patch||{}).forEach(function(k){const h=map[k];if(!h)return;out[k]=mutationCompareValue_(k,valueBy_(table,vals,h));});
 return out;
}
function findConflictByEvent_(eventId){
 const sh=sheet_(CFG.CONFLICTS_SHEET),hit=findRowBy_(sh,6,eventId,2);return hit;
}
function createMutationConflict_(entityType,entityId,eventId,baseVersion,serverVersion,fields,baseValues,patch,serverValues,auth){
 ensureStep2Schema_();const existing=findConflictByEvent_(eventId);if(existing)return String(existing.values[0]||'');
 const id='CONFLICT-'+uuid_();
 sheet_(CFG.CONFLICTS_SHEET).appendRow([id,nowIso_(),'OPEN',entityType,entityId,eventId,baseVersion,serverVersion,JSON.stringify(fields||[]),JSON.stringify(baseValues||{}),JSON.stringify(patch||{}),JSON.stringify(serverValues||{}),auth.user.userId,auth.user.name,auth.deviceId,'','','','']);
 auditMutation_('conflict',id,'create',auth,eventId,{}, {entity_type:entityType,entity_id:entityId,fields:fields,base_record_version:baseVersion,server_record_version:serverVersion},'Offline mutation conflict');
 return id;
}
function mutationConflictGuard_(entityType,entityId,table,vals,body,auth,eventId){
 const patch=body.patch||{},hasBase=body.base_record_version!==undefined&&body.base_record_version!==null&&body.base_record_version!=='',baseVersion=Number(body.base_record_version==null?0:body.base_record_version)||0,serverVersion=numberOrNull_(valueBy_(table,vals,'record_version'))||0;
 if(!hasBase||baseVersion===serverVersion)return {ok:true,serverVersion:serverVersion};
 const base=body.base_values&&typeof body.base_values==='object'?body.base_values:{},current=currentMutationValues_(entityType,table,vals,patch),fields=[];
 if(String(body.record_action||'update').toLowerCase()==='delete'){
   const conflictId=createMutationConflict_(entityType,entityId,eventId,baseVersion,serverVersion,['__delete__'],base,patch,{record_version:serverVersion},auth);
   return {ok:false,conflict:true,conflict_id:conflictId,conflicting_fields:['__delete__'],server_record_version:serverVersion};
 }
 Object.keys(patch).forEach(function(k){
   if(!Object.prototype.hasOwnProperty.call(base,k)){fields.push(k);return;}
   if(mutationCompareValue_(k,base[k])!==mutationCompareValue_(k,current[k]))fields.push(k);
 });
 if(!fields.length)return {ok:true,serverVersion:serverVersion,autoMerged:true};
 const conflictId=createMutationConflict_(entityType,entityId,eventId,baseVersion,serverVersion,fields,base,patch,current,auth);
 return {ok:false,conflict:true,conflict_id:conflictId,conflicting_fields:fields,server_record_version:serverVersion};
}
function mutationEventBody_(ev){
 const m=ev.meta||{};return {entity_type:String(m.entityType||ev.entity_type||''),entity_id:String(m.entityId||ev.entity_id||ev.objectId||''),record_action:String(m.recordAction||'update'),patch:m.patch||{},note:String(m.note||''),base_record_version:m.baseRecordVersion||0,base_values:m.baseValues||{},force_conflict_resolution:false};
}
function handleRecordMutationEvent_(eventId,ev,rawUserId,deviceId){
 const actorId=correctedActorUserId_(rawUserId,deviceId),user=getUser_(actorId);if(!user)return {handled:true,ok:false,processing_status:'error',error:'USER_NOT_FOUND'};
 const auth={user:user,deviceId:deviceId,sessionId:''},body=mutationEventBody_(ev),type=String(body.entity_type||'').toLowerCase(),action=String(body.record_action||'update').toLowerCase();
 let r;if(type==='order')r=mutateOrder_(body,auth,eventId,action);else if(type==='finance')r=mutateFinance_(body,auth,eventId,action);else return {handled:true,ok:false,processing_status:'error',error:'MUTATION_ENTITY_UNSUPPORTED'};
 if(r&&r.conflict)return {handled:true,ok:true,processing_status:'pending_review',operation_id:r.conflict_id,source_revision:'conflict='+r.conflict_id+'; entity='+type+':'+body.entity_id};
 if(r&&r.ok)return {handled:true,ok:true,processing_status:'processed',operation_id:body.entity_id,source_revision:'mutation='+type+':'+body.entity_id+'; record_version='+(r.record_version||'')};
 return {handled:true,ok:false,processing_status:'error',error:(r&&r.error)||'MUTATION_FAILED'};
}
function handleRecordMutate_(body,requestId){
 ensureStep2Schema_(); const auth=authSession_(body.session_token,null,requestId), type=String(body.entity_type||'').toLowerCase(), action=String(body.record_action||body.action_type||'update').toLowerCase();
 if(['update','delete'].indexOf(action)<0)throw new Error('MUTATION_ACTION_INVALID');
 if(type==='finance')return mutateFinance_(body,auth,requestId,action);
 if(type==='order')return mutateOrder_(body,auth,requestId,action);
 throw new Error('MUTATION_ENTITY_UNSUPPORTED');
}
function mutateFinance_(body,auth,requestId,action){
 const id=cleanId_(body.entity_id||body.operation_id,'operation_id'), t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1), hit=findRowBy_(t.sheet,1,id,2);
 if(!hit)return deny_('FINANCE_NOT_FOUND',auth.user.userId,auth.deviceId,'record_mutate',requestId,auth.sessionId);
 const row=hit.row, vals=hit.values, owner=cleanOut_(valueBy_(t,vals,'created_by_user_id')), before=tableRowObject_(t,vals);
 if(String(valueBy_(t,vals,'last_event_id')||'')===String(requestId))return {ok:true,request_id:requestId,entity_type:'finance',entity_id:id,action:action,duplicate:true,record_version:numberOrNull_(valueBy_(t,vals,'record_version'))||0};
 if(!mutationPermission_(auth,'wallet',action,owner))return deny_('MUTATION_DENIED',auth.user.userId,auth.deviceId,'record_mutate',requestId,auth.sessionId);
 if(body.force_conflict_resolution!==true){const cg=mutationConflictGuard_('finance',id,t,vals,body,auth,requestId);if(!cg.ok)return {ok:true,request_id:requestId,conflict:true,conflict_id:cg.conflict_id,conflicting_fields:cg.conflicting_fields,server_record_version:cg.server_record_version};}
 const currentPlan=String(valueBy_(t,vals,'plan_state')||'').toUpperCase();
 if(action==='delete'){if(currentPlan==='EXECUTED')throw new Error('EXECUTED_PLAN_REQUIRES_CORRECTION');setByHeader_(t,row,'Фактическая операция','Нет');if(currentPlan==='PLANNED'||currentPlan==='RESERVED')setByHeader_(t,row,'plan_state','CANCELLED');else setByHeader_(t,row,'is_deleted',true);}
 else{
   const p=body.patch||{};
   if(p.plan_state!=null){const ps=String(p.plan_state||'').toUpperCase();if(['NONE','PLANNED','RESERVED','EXECUTED','CANCELLED'].indexOf(ps)<0)throw new Error('PLAN_STATE_INVALID');if(currentPlan==='EXECUTED'&&ps!=='EXECUTED')throw new Error('EXECUTED_PLAN_REQUIRES_CORRECTION');if(ps==='CANCELLED'&&currentPlan==='EXECUTED')throw new Error('EXECUTED_PLAN_REQUIRES_CORRECTION');setByHeader_(t,row,'plan_state',ps);}
   if(p.due_date!=null)setByHeader_(t,row,'due_date',cleanText_(p.due_date,40));
   if(p.type!=null){const type=mapFinanceType_(p.type);if(!type)throw new Error('FINANCE_TYPE_INVALID');setByHeader_(t,row,'Тип',type);}
   if(p.amount!=null){const n=parseAmount_(p.amount);if(!n)throw new Error('FINANCE_AMOUNT_INVALID');setByHeader_(t,row,'Сумма',n);setByHeader_(t,row,'Цена единицы',n);}
   if(p.order_id!=null)setByHeader_(t,row,'№ заказа',cleanText_(p.order_id,80));
   if(p.category!=null)setByHeader_(t,row,'Категория',cleanText_(p.category,160));
   if(p.subcategory!=null)setByHeader_(t,row,'Подкатегория',cleanText_(p.subcategory,160));
   if(p.comment!=null)setByHeader_(t,row,'Описание',cleanText_(p.comment,3000));
   if(p.actual!=null){setByHeader_(t,row,'Фактическая операция',p.actual===true?'Да':'Нет');if(p.actual===true){setByHeader_(t,row,'Дата',new Date());if(currentPlan==='PLANNED'||currentPlan==='RESERVED')setByHeader_(t,row,'plan_state','EXECUTED');}}
   if(p.actual===true&&String(valueBy_(t,vals,'Источник денег / оплаты')||'')==='PERSON'&&!String(valueBy_(t,vals,'partner_settlement_entry_id')||'')){const pid=String(valueBy_(t,vals,'partner_party_id')||'');if(!pid)throw new Error('PARTNER_PARTY_REQUIRED');const party={party_id:pid},amt=Number(valueBy_(t,vals,'Сумма')||0),se=financeWaveAppendSettlement_(requestId,'PERSONAL_PAID_BUSINESS_EXPENSE',party,amt,amt,0,id,String(valueBy_(t,vals,'№ заказа')||''),auth.user.userId,'Executed planned personal-paid expense',String(valueBy_(t,vals,'Группа операции')||requestId));setByHeader_(t,row,'partner_effect','FUNDING_INCREASE');setByHeader_(t,row,'partner_settlement_entry_id',se.settlement_entry_id);}
 }
 setByHeader_(t,row,'updated_by_user_id',auth.user.userId);setByHeader_(t,row,'updated_by_name',auth.user.name);setByHeader_(t,row,'updated_at_app',nowIso_());
 setByHeader_(t,row,'Дата изменения',new Date());setByHeader_(t,row,'last_event_id',requestId);setByHeader_(t,row,'record_version',(numberOrNull_(valueBy_(t,vals,'record_version'))||0)+1);
 w1TouchDomainRow_('finance',t,row,requestId);
 const afterHit=findRowBy_(t.sheet,1,id,2), after=tableRowObject_(tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),afterHit.values);
 auditMutation_('finance',id,action,auth,requestId,before,after,cleanText_(body.note||'',500)); touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,entity_type:'finance',entity_id:id,action:action,record_version:(numberOrNull_(valueBy_(tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),afterHit.values,'record_version'))||0),serverTime:nowIso_()};
}
function findOrderHit_(id){
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1); let hit=null;
 t.rows.forEach(function(r,i){if(hit)return; if(String(valueBy_(t,r,'№ заказа')||'')===String(id)||String(valueBy_(t,r,'ID заказа')||'')===String(id))hit={table:t,row:i+2,values:r};});
 return hit;
}
function ensureOrderCompletionIncome_(hit,id,auth,requestId){
 const fresh=hit.table.sheet.getRange(hit.row,1,1,hit.table.sheet.getLastColumn()).getValues()[0];
 const price=numberOrNull_(valueBy_(hit.table,fresh,'Цена клиенту'))||0,finance=buildOrderFinanceIndex_(),received=Number((finance[id]&&finance[id].income)||0),remaining=Math.max(0,price-received);
 if(!(remaining>0)){setByHeader_(hit.table,hit.row,'Получено',received);setByHeader_(hit.table,hit.row,'Долг',0);setByHeader_(hit.table,hit.row,'Предоплаты достаточно',received>=price*0.5?'Да':'Нет');return;}
 const opId='ORDER-COMPLETE-'+id;if(findFinanceOperation_(opId))return;
 const fobj={'ID операции':opId,'Дата':new Date(),'Тип':'Приход','Категория':'Оплата по заказу','Подкатегория':'Завершение заказа','№ заказа':id,
   'Описание':'Остаток оплаты при завершении заказа','Количество':1,'Единица':'операция','Цена единицы':remaining,'Сумма':remaining,'Сотрудник':auth.user.name,
   'Фактическая операция':'Да','Источник':'Приложение / завершение заказа','Комментарий':'AUTO APP-Q015 Stage2C','Дата изменения':new Date(),
   'created_by_user_id':auth.user.userId,'created_by_name':auth.user.name,'updated_by_user_id':auth.user.userId,'updated_by_name':auth.user.name,
   'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':requestId+'-order-complete','record_version':1};
 w1AppendFinance_(fobj,fobj.last_event_id);auditMutation_('finance',opId,'create',auth,requestId,{},fobj,'Автоматический приход остатка при завершении заказа');
 const afterFinance=buildOrderFinanceIndex_(),receivedAfter=Number((afterFinance[id]&&afterFinance[id].income)||0);
 setByHeader_(hit.table,hit.row,'Получено',receivedAfter);setByHeader_(hit.table,hit.row,'Долг',Math.max(0,price-receivedAfter));setByHeader_(hit.table,hit.row,'Предоплаты достаточно',receivedAfter>=price*0.5?'Да':'Нет');
}
function mutateOrder_(body,auth,requestId,action){
 const id=cleanText_(body.entity_id||body.order_id,80), hit=findOrderHit_(id);
 if(!hit)return deny_('ORDER_NOT_FOUND',auth.user.userId,auth.deviceId,'record_mutate',requestId,auth.sessionId);
 const owner=cleanOut_(valueBy_(hit.table,hit.values,'created_by_user_id')), before=tableRowObject_(hit.table,hit.values);
 if(String(valueBy_(hit.table,hit.values,'last_event_id')||'')===String(requestId))return {ok:true,request_id:requestId,entity_type:'order',entity_id:id,action:action,duplicate:true,record_version:numberOrNull_(valueBy_(hit.table,hit.values,'record_version'))||0};
 if(!mutationPermission_(auth,'orders',action,owner))return deny_('MUTATION_DENIED',auth.user.userId,auth.deviceId,'record_mutate',requestId,auth.sessionId);
 if(body.force_conflict_resolution!==true){const cg=mutationConflictGuard_('order',id,hit.table,hit.values,body,auth,requestId);if(!cg.ok)return {ok:true,request_id:requestId,conflict:true,conflict_id:cg.conflict_id,conflicting_fields:cg.conflicting_fields,server_record_version:cg.server_record_version};}
 if(action==='delete'){setByHeader_(hit.table,hit.row,'Статус','Архив');setByHeader_(hit.table,hit.row,'is_deleted',true);}
 else{
   const p=body.patch||{};
   if(p.title!=null)setByHeader_(hit.table,hit.row,'Название заказа',cleanText_(p.title,180));
   if(p.description!=null)setByHeader_(hit.table,hit.row,'Краткое описание',cleanText_(p.description,5000));
   if(p.client_price!=null)setByHeader_(hit.table,hit.row,'Цена клиенту',parseAmount_(p.client_price)||'');
   if(p.received!=null)setByHeader_(hit.table,hit.row,'Получено',parseAmount_(p.received)||0);
   if(p.calc_cost!=null)setByHeader_(hit.table,hit.row,'Себестоимость расчётная',parseAmount_(p.calc_cost)||0);
   if(p.actual_cost!=null)setByHeader_(hit.table,hit.row,'Фактические прямые затраты',parseAmount_(p.actual_cost)||0);
   if(p.deadline!=null)setByHeader_(hit.table,hit.row,'Срок сдачи',orderDeadlineValue_(cleanText_(p.deadline,40)));
   if(p.completed_at!=null)setByHeader_(hit.table,hit.row,'Дата завершения',orderDeadlineValue_(cleanText_(p.completed_at,40)));
   if(p.comment!=null)setByHeader_(hit.table,hit.row,'Комментарий',cleanText_(p.comment,5000));
   if(p.status!=null){
     let st=cleanText_(p.status,80);if(st==='В архив')st='Архив';
     const allowed=['Новый','Расчет','Расчёт','В работе','Завершён','Завершен','Архив'];
     if(allowed.indexOf(st)<0)throw new Error('ORDER_STATUS_INVALID');
     if(st==='Завершен')st='Завершён';setByHeader_(hit.table,hit.row,'Статус',st);
     if(st==='Архив')setByHeader_(hit.table,hit.row,'is_deleted',true);
     if(st==='В работе'){setByHeader_(hit.table,hit.row,'is_deleted',false);setByHeader_(hit.table,hit.row,'Дата завершения','');}
     if(st==='Завершён'){setByHeader_(hit.table,hit.row,'is_deleted',false);if(!valueBy_(hit.table,hit.values,'Дата завершения'))setByHeader_(hit.table,hit.row,'Дата завершения',new Date());ensureOrderCompletionIncome_(hit,id,auth,requestId);}
   }
   if(p.stage!=null){
     const st=cleanText_(p.stage,80), allowed=['','В разработке','В работе','Завершён'], currentStage=cleanOut_(valueBy_(hit.table,hit.values,'Ближайший этап'));
     if(allowed.indexOf(st)<0&&st!==currentStage)throw new Error('ORDER_STAGE_INVALID');
     setByHeader_(hit.table,hit.row,'Ближайший этап',st);
   }
   const fresh=hit.table.sheet.getRange(hit.row,1,1,hit.table.sheet.getLastColumn()).getValues()[0], price=numberOrNull_(valueBy_(hit.table,fresh,'Цена клиенту')), rec=numberOrNull_(valueBy_(hit.table,fresh,'Получено'));
   if(price!=null){
     setByHeader_(hit.table,hit.row,'Долг',Math.max(0,price-Number(rec||0)));
     setByHeader_(hit.table,hit.row,'Предоплаты достаточно',Number(rec||0)>=price*0.5?'Да':'Нет');
   }
 }
 setByHeader_(hit.table,hit.row,'updated_by_user_id',auth.user.userId);setByHeader_(hit.table,hit.row,'updated_by_name',auth.user.name);setByHeader_(hit.table,hit.row,'updated_at_app',nowIso_());setByHeader_(hit.table,hit.row,'Последнее изменение',new Date());
 setByHeader_(hit.table,hit.row,'last_event_id',requestId);setByHeader_(hit.table,hit.row,'record_version',(numberOrNull_(valueBy_(hit.table,hit.values,'record_version'))||0)+1);
 const afterHit=findOrderHit_(id), after=tableRowObject_(afterHit.table,afterHit.values); auditMutation_('order',id,action,auth,requestId,before,after,cleanText_(body.note||'',500));touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,entity_type:'order',entity_id:id,action:action,record_version:(numberOrNull_(valueBy_(afterHit.table,afterHit.values,'record_version'))||0),serverTime:nowIso_()};
}
const NOM_SYNC=Object.freeze({
 SHEET:'Номенклатура',
 DATA_COLS:47,
 REV_COL:48,
 UPDATED_COL:49,
 HASH_COL:50,
 HASH_CHUNK_ROWS:200,
 PROP_REV:'NOM_SYNC_REV',
 PROP_DIRTY:'NOM_SYNC_DIRTY',
 PROP_SWEEP_CURSOR:'NOM_SYNC_SWEEP_CURSOR',
 PROP_TRIGGERS:'NOM_SYNC_TRIGGERS'
});
function nomenclatureHeaders_() {
 const sh = sheet_(NOM_SYNC.SHEET);
 const headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), NOM_SYNC.HASH_COL)).getDisplayValues()[0];
 if (String(headers[NOM_SYNC.REV_COL - 1] || '').trim() !== '_SYNC_REV') throw new Error('NOM_SYNC_COLUMNS_MISSING');
 if (String(headers[NOM_SYNC.UPDATED_COL - 1] || '').trim() !== '_UPDATED_AT') throw new Error('NOM_SYNC_COLUMNS_MISSING');
 if (String(headers[NOM_SYNC.HASH_COL - 1] || '').trim() !== '_ROW_HASH') throw new Error('NOM_SYNC_COLUMNS_MISSING');
 return headers;
}
function fnv1aHex_(text) {
 let h = 0x811c9dc5;
 const s = String(text == null ? '' : text);
 for (let i = 0; i < s.length; i++) {
   h ^= s.charCodeAt(i);
   h = Math.imul(h, 0x01000193) >>> 0;
 }
 return ('00000000' + h.toString(16)).slice(-8);
}
function nomenclatureRowHash_(displayRow) {
 const a = [];
 for (let i = 0; i < NOM_SYNC.DATA_COLS; i++) {
   a.push(String(displayRow[i] == null ? '' : displayRow[i]).replace(/\r\n/g, '\n'));
 }
 return fnv1aHex_(a.join('\u001f'));
}
function maxNomenclatureRevision_() {
 const sh = sheet_(NOM_SYNC.SHEET);
 const lastRow = sh.getLastRow();
 if (lastRow < 2) return 0;
 const vals = sh.getRange(2, NOM_SYNC.REV_COL, lastRow - 1, 1).getValues();
 let max = 0;
 for (let i = 0; i < vals.length; i++) {
   const n = Math.floor(Number(vals[i][0] || 0));
   if (isFinite(n) && n > max) max = n;
 }
 return max;
}
function currentNomenclatureRevision_() {
 const props = PropertiesService.getScriptProperties();
 let n = Math.floor(Number(props.getProperty(NOM_SYNC.PROP_REV) || 0));
 if (!(n >= 1)) {
   n = Math.max(1, maxNomenclatureRevision_());
   props.setProperty(NOM_SYNC.PROP_REV, String(n));
 }
 return n;
}
function nextNomenclatureRevision_() {
 const props = PropertiesService.getScriptProperties();
 const n = currentNomenclatureRevision_() + 1;
 props.setProperty(NOM_SYNC.PROP_REV, String(n));
 return n;
}
function writeNomenclatureSyncRows_(rowNumbers, revision, timestamp) {
 if (!rowNumbers || !rowNumbers.length) return 0;
 const sh = sheet_(NOM_SYNC.SHEET);
 const unique = Array.from(new Set(rowNumbers.map(Number).filter(function (r) {
   return r >= 2 && r <= sh.getLastRow();
 }))).sort(function (a, b) { return a - b; });
 if (!unique.length) return 0;
 const stamp = timestamp || nowIso_();
 let count = 0;
 unique.forEach(function (rowNum) {
   const display = sh.getRange(rowNum, 1, 1, NOM_SYNC.DATA_COLS).getDisplayValues()[0];
   const id = String(display[0] || '').trim();
   if (!id) {
     sh.getRange(rowNum, NOM_SYNC.REV_COL, 1, 3).clearContent();
     return;
   }
   sh.getRange(rowNum, NOM_SYNC.REV_COL, 1, 3).setValues([[
     revision,
     stamp,
     nomenclatureRowHash_(display)
   ]]);
   count++;
 });
 return count;
}
function rebuildNomenclatureSyncMetadata_() {
 nomenclatureHeaders_();
 const lock = LockService.getScriptLock();
 lock.waitLock(20000);
 try {
   const sh = sheet_(NOM_SYNC.SHEET);
   const lastRow = sh.getLastRow();
   const rev = nextNomenclatureRevision_();
   const stamp = nowIso_();
   if (lastRow >= 2) {
     const data = sh.getRange(2, 1, lastRow - 1, NOM_SYNC.DATA_COLS).getDisplayValues();
     const out = data.map(function (row) {
       const id = String(row[0] || '').trim();
       return id ? [rev, stamp, nomenclatureRowHash_(row)] : ['', '', ''];
     });
     sh.getRange(2, NOM_SYNC.REV_COL, out.length, 3).setValues(out);
   }
   const props = PropertiesService.getScriptProperties();
   props.deleteProperty(NOM_SYNC.PROP_DIRTY);
   props.setProperty(NOM_SYNC.PROP_SWEEP_CURSOR, '2');
   return rev;
 } finally {
   lock.releaseLock();
 }
}
function maybeRebuildNomenclatureStructure_() {
 const props = PropertiesService.getScriptProperties();
 if (props.getProperty(NOM_SYNC.PROP_DIRTY) === '1') return rebuildNomenclatureSyncMetadata_();
 return currentNomenclatureRevision_();
}
function nomenclatureIntegritySweep_() {
 nomenclatureHeaders_();
 const lock = LockService.getScriptLock();
 if (!lock.tryLock(5000)) return;
 try {
   const sh = sheet_(NOM_SYNC.SHEET);
   const lastRow = sh.getLastRow();
   if (lastRow < 2) return;
   const props = PropertiesService.getScriptProperties();
   let start = Math.max(2, Math.floor(Number(props.getProperty(NOM_SYNC.PROP_SWEEP_CURSOR) || 2)));
   if (start > lastRow) start = 2;
   const count = Math.min(NOM_SYNC.HASH_CHUNK_ROWS, lastRow - start + 1);
   const display = sh.getRange(start, 1, count, NOM_SYNC.DATA_COLS).getDisplayValues();
   const sync = sh.getRange(start, NOM_SYNC.REV_COL, count, 3).getValues();
   const changed = [];
   for (let i = 0; i < count; i++) {
     const id = String(display[i][0] || '').trim();
     const storedHash = String(sync[i][2] || '');
     const actualHash = id ? nomenclatureRowHash_(display[i]) : '';
     const rev = Math.floor(Number(sync[i][0] || 0));
     if (id && (actualHash !== storedHash || rev < 1)) changed.push(start + i);
     if (!id && (storedHash || rev)) changed.push(start + i);
   }
   if (changed.length) {
     const rev = nextNomenclatureRevision_();
     writeNomenclatureSyncRows_(changed, rev, nowIso_());
   }
   const next = start + count > lastRow ? 2 : start + count;
   props.setProperty(NOM_SYNC.PROP_SWEEP_CURSOR, String(next));
 } finally {
   lock.releaseLock();
 }
}
function nomenclatureOnEdit_(e) {
 try {
   if (!e || !e.range) return;
   const sh = e.range.getSheet();
   if (!sh || sh.getName() !== NOM_SYNC.SHEET) return;
   if (e.range.getColumn() > NOM_SYNC.DATA_COLS) return;
   const startRow = Math.max(2, e.range.getRow());
   const endRow = Math.max(startRow, e.range.getLastRow());
   if (endRow < 2) return;
   const lock = LockService.getScriptLock();
   lock.waitLock(10000);
   try {
     const rev = nextNomenclatureRevision_();
     const rows = [];
     for (let r = startRow; r <= endRow; r++) rows.push(r);
     writeNomenclatureSyncRows_(rows, rev, nowIso_());
   } finally {
     lock.releaseLock();
   }
 } catch (err) {
   try { authLog_('', '', 'nomenclature_on_edit', 'ERROR', safeErr_(err), '', ''); } catch (_) {}
 }
}
function nomenclatureOnChange_(e) {
 try {
   const type = String(e && e.changeType || '');
   if (/^(INSERT_ROW|REMOVE_ROW|INSERT_COLUMN|REMOVE_COLUMN)$/.test(type)) {
     PropertiesService.getScriptProperties().setProperty(NOM_SYNC.PROP_DIRTY, '1');
   }
 } catch (_) {}
}
function ensureNomenclatureSyncTriggers_() {
 const props = PropertiesService.getScriptProperties();
 const triggers = ScriptApp.getProjectTriggers();
 const handlers = {};
 triggers.forEach(function (t) { handlers[t.getHandlerFunction()] = true; });
 const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
 if (!handlers['nomenclatureOnEdit_']) ScriptApp.newTrigger('nomenclatureOnEdit_').forSpreadsheet(ss).onEdit().create();
 if (!handlers['nomenclatureOnChange_']) ScriptApp.newTrigger('nomenclatureOnChange_').forSpreadsheet(ss).onChange().create();
 if (!handlers['nomenclatureIntegritySweep_']) ScriptApp.newTrigger('nomenclatureIntegritySweep_').timeBased().everyMinutes(5).create();
 props.setProperty(NOM_SYNC.PROP_TRIGGERS, '1');
 return { edit: true, change: true, integrity: true };
}
function handleNomenclatureSyncInstall_(body, requestId) {
 const auth = authSession_(body.session_token, null, requestId);
 if (!auth.user || auth.user.role !== 'ADMIN1') throw new Error('PERMISSION_DENIED:admin.nomenclature_sync');
 nomenclatureHeaders_();
 const rev = maybeRebuildNomenclatureStructure_();
 let triggers;
 try {
   triggers = ensureNomenclatureSyncTriggers_();
 } catch (err) {
   triggers = { edit: false, change: false, integrity: false, error: safeErr_(err) };
 }
 touchSessionAndDevice_(auth);
 authLog_(auth.user.userId, auth.deviceId, 'nomenclature_sync_install', 'OK',
   'rev=' + rev + '; triggers=' + JSON.stringify(triggers), requestId, auth.sessionId);
 return {
   ok: true,
   request_id: requestId,
   current_rev: rev,
   triggers: triggers,
   serverTime: nowIso_()
 };
}
function nomenclatureItemFromRow_(t, r, includeInactive) {
 const id = cleanOut_(valueBy_(t, r, 'ID позиции'));
 const active = yes_(valueBy_(t, r, 'Активна'));
 if (!id) return null;
 if (!includeInactive && !active) return null;
 return {
   id: id,
   active: active,
   syncRev: Math.floor(Number(valueBy_(t, r, '_SYNC_REV') || 0)),
   updatedAt: cleanOut_(valueBy_(t, r, '_UPDATED_AT')),
   type: cleanOut_(valueBy_(t, r, 'Тип записи')),
   category: cleanOut_(valueBy_(t, r, 'Категория')),
   subcategory: cleanOut_(valueBy_(t, r, 'Подкатегория')),
   name: cleanOut_(valueBy_(t, r, 'Наименование')),
   manufacturer: cleanOut_(valueBy_(t, r, 'Марка / производитель')),
   spec: cleanOut_(valueBy_(t, r, 'Характеристика')),
   calcUnit: cleanOut_(valueBy_(t, r, 'Единица расчёта')),
   buyUnit: cleanOut_(valueBy_(t, r, 'Единица закупки')),
   price: numberOrNull_(valueBy_(t, r, 'Текущая цена')),
   priceBasis: cleanOut_(valueBy_(t, r, 'Основа цены')),
   priceDate: formatDateMaybe_(valueBy_(t, r, 'Дата цены')),
   supplier: cleanOut_(valueBy_(t, r, 'Поставщик')),
   minBuy: numberOrNull_(valueBy_(t, r, 'Минимальная закупка')),
   packQty: numberOrNull_(valueBy_(t, r, 'Количество в упаковке')),
   packPrice: numberOrNull_(valueBy_(t, r, 'Цена упаковки')),
   stdLengthMm: numberOrNull_(valueBy_(t, r, 'Стандартная длина, мм')),
   thicknessMm: numberOrNull_(valueBy_(t, r, 'Толщина, мм')),
   consumptionKgM2: numberOrNull_(valueBy_(t, r, 'Расход кг/м²')),
   workRateType: cleanOut_(valueBy_(t, r, 'Вид ставки')),
   workRate: numberOrNull_(valueBy_(t, r, 'Ставка работы')),
   previousPrice: numberOrNull_(valueBy_(t, r, 'Предыдущая цена')),
   previousPriceDate: formatDateMaybe_(valueBy_(t, r, 'Дата предыдущей цены')),
   comment: cleanOut_(valueBy_(t, r, 'Комментарий')),
   gost: cleanOut_(valueBy_(t, r, 'ГОСТ')),
   steelGrade: cleanOut_(valueBy_(t, r, 'Марка стали')),
   massPerM: numberOrNull_(valueBy_(t, r, 'Масса 1 м, кг')),
   source: cleanOut_(valueBy_(t, r, 'Источник')),
   pricePerM: numberOrNull_(valueBy_(t, r, 'Цена 1 м, ₽')),
   price6m: numberOrNull_(valueBy_(t, r, 'Цена 6 м, ₽')),
   price2m: numberOrNull_(valueBy_(t, r, 'Цена 2 м, ₽')),
   price4m: numberOrNull_(valueBy_(t, r, 'Цена 4 м, ₽')),
   sheetPrice: numberOrNull_(valueBy_(t, r, 'Цена листа/щита, ₽')),
   priceM2: numberOrNull_(valueBy_(t, r, 'Цена 1 м², ₽')),
   price3m: numberOrNull_(valueBy_(t, r, 'Цена 3 м, ₽')),
   metalPricePerT: numberOrNull_(valueBy_(t, r, 'Цена металла, ₽/т')),
   mainSizeMm: numberOrNull_(valueBy_(t, r, 'Размер основной, мм')),
   coilWeightKg: numberOrNull_(valueBy_(t, r, 'Вес бухты, кг')),
   coilLengthM: numberOrNull_(valueBy_(t, r, 'Расчётная длина бухты, м'))
 };
}
function handleNomenclatureHead_(body, requestId) {
 const auth = authSession_(body.session_token, 'nomenclature.view', requestId);
 nomenclatureHeaders_();
 const dirty = PropertiesService.getScriptProperties().getProperty(NOM_SYNC.PROP_DIRTY) === '1';
 const current = currentNomenclatureRevision_();
 touchSessionAndDevice_(auth);
 authLog_(auth.user.userId, auth.deviceId, 'nomenclature_head', 'OK',
   'current=' + current + '; dirty=' + dirty, requestId, auth.sessionId);
 return {
   ok: true,
   request_id: requestId,
   current_rev: current,
   reset_required: dirty,
   reason: dirty ? 'NOM_STRUCTURE_CHANGED' : '',
   serverTime: nowIso_()
 };
}
function nomenclatureDeltaTable_() {
 const sh = sheet_(NOM_SYNC.SHEET);
 const lastCol = Math.max(sh.getLastColumn(), NOM_SYNC.HASH_COL);
 const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
 const index = {};
 headers.forEach(function (h, i) {
   const key = String(h || '').trim();
   if (key) index[key] = i;
 });
 return { sheet: sh, headers: headers, index: index, lastCol: lastCol };
}
function nomenclatureChangedRowsSince_(since) {
 const sh = sheet_(NOM_SYNC.SHEET);
 const lastRow = sh.getLastRow();
 if (lastRow < 2) return [];
 const revs = sh.getRange(2, NOM_SYNC.REV_COL, lastRow - 1, 1).getValues();
 const out = [];
 for (let i = 0; i < revs.length; i++) {
   const rev = Math.floor(Number(revs[i][0] || 0));
   if (rev > since) out.push(i + 2);
 }
 return out;
}
function handleNomenclatureDelta_(body, requestId) {
 const auth = authSession_(body.session_token, 'nomenclature.view', requestId);
 nomenclatureHeaders_();
 if (PropertiesService.getScriptProperties().getProperty(NOM_SYNC.PROP_DIRTY) === '1') {
   touchSessionAndDevice_(auth);
   return {
     ok: true,
     request_id: requestId,
     reset_required: true,
     reason: 'NOM_STRUCTURE_CHANGED',
     current_rev: currentNomenclatureRevision_(),
     serverTime: nowIso_()
   };
 }
 const since = Math.max(0, Math.floor(Number(body.since_rev || body.sinceRevision || 0)));
 const current = currentNomenclatureRevision_();
 if (since <= 0) {
   touchSessionAndDevice_(auth);
   return {
     ok: true,
     request_id: requestId,
     bootstrap_required: true,
     current_rev: current,
     changes: [],
     total_count: 0,
     serverTime: nowIso_()
   };
 }
 if (since > current) {
   touchSessionAndDevice_(auth);
   return {
     ok: true,
     request_id: requestId,
     reset_required: true,
     reason: 'CLIENT_REV_AHEAD',
     current_rev: current,
     serverTime: nowIso_()
   };
 }
 if (since === current) {
   touchSessionAndDevice_(auth);
   return {
     ok: true,
     request_id: requestId,
     current_rev: current,
     changes: [],
     count: 0,
     total_count: 0,
     offset: 0,
     next_offset: 0,
     has_more: false,
     serverTime: nowIso_()
   };
 }
 const changedRows = nomenclatureChangedRowsSince_(since);
 if (changedRows.length > 1500) {
   touchSessionAndDevice_(auth);
   return {
     ok: true,
     request_id: requestId,
     reset_required: true,
     reason: 'DELTA_TOO_LARGE',
     current_rev: current,
     count: changedRows.length,
     total_count: changedRows.length,
     serverTime: nowIso_()
   };
 }
 const offset = Math.max(0, Math.floor(Number(body.offset || 0)));
 const limit = Math.max(20, Math.min(250, Math.floor(Number(body.limit || 150))));
 const pageRows = changedRows.slice(offset, offset + limit);
 const t = nomenclatureDeltaTable_();
 const changes = [];
 pageRows.forEach(function (rowNum) {
   const row = t.sheet.getRange(rowNum, 1, 1, t.lastCol).getValues()[0];
   const item = nomenclatureItemFromRow_(t, row, true);
   if (item) changes.push(item);
 });
 const nextOffset = offset + pageRows.length;
 const hasMore = nextOffset < changedRows.length;
 touchSessionAndDevice_(auth);
 authLog_(auth.user.userId, auth.deviceId, 'nomenclature_delta', 'OK',
   'since=' + since + '; current=' + current + '; total=' + changedRows.length + '; offset=' + offset + '; page=' + changes.length,
   requestId, auth.sessionId);
 return {
   ok: true,
   request_id: requestId,
   current_rev: current,
   changes: changes,
   count: changes.length,
   total_count: changedRows.length,
   offset: offset,
   next_offset: nextOffset,
   has_more: hasMore,
   serverTime: nowIso_()
 };
}
/* ===== backend v0.2: live snapshot + admin/audit API ===== */
function backfillQ014HotfixInbox_(){
 const props=PropertiesService.getScriptProperties(); if(props.getProperty('APP_Q014_HOTFIX_BACKFILL_DONE')==='1')return 0;
 const sh=sheet_(CFG.INBOX_SHEET),last=sh.getLastRow(); if(last<2){props.setProperty('APP_Q014_HOTFIX_BACKFILL_DONE','1');return 0;}
 const vals=sh.getRange(2,1,last-1,20).getValues(); let n=0;
 for(let i=0;i<vals.length;i++){
   const v=vals[i],st=String(v[15]||'');
   if(!/^(error|pending_review)$/i.test(st))continue;
   const ev=eventFromInboxRow_(v),kind=String(ev.kind||ev.event_type||'').toLowerCase();
   if(kind==='appdev-issue'||isGalleryEvent_(ev)){routeGeneralInboxRow_(i+2,ev);n++;}
 }
 props.setProperty('APP_Q014_HOTFIX_BACKFILL_DONE','1'); return n;
}
function handleSnapshotPull_(body, requestId) {
 ensureStep2Schema_();
 const auth = authSession_(body.session_token, null, requestId);
 if(String(auth.user.role||'')==='ADMIN1'){try{backfillQ014HotfixInbox_();}catch(_){}}
 if (hasPermission_(auth.user, 'nomenclature.view')) maybeRebuildNomenclatureStructure_();
 const snapshot = buildSnapshot_(auth.user, body || {});
 touchSessionAndDevice_(auth);
 authLog_(auth.user.userId, auth.deviceId, 'snapshot_pull', 'OK',
   'orders=' + snapshot.orders.length + '; nomenclature=' + snapshot.nomenclature.length + '; gallery=' + snapshot.gallery.length + '; appIssues=' + snapshot.appIssues.length,
   requestId, auth.sessionId);
 return {
   ok: true,
   request_id: requestId,
   schema_version: 1,
   backend_version: CFG.VERSION,
   snapshot: snapshot,
   user: publicUser_(auth.user),
   device_id: auth.deviceId,
   session_id: auth.sessionId,
   offline_access_until: auth.offlineAccessUntil,
   serverTime: nowIso_()
 };
}
function buildSnapshot_(user, options) {
 options = options || {};
 const allowOrders = hasPermission_(user, 'orders.view');
 const allowPurchase = hasPermission_(user, 'purchase.view');
 const allowWallet = hasPermission_(user, 'wallet.view');
 const allowNom = hasPermission_(user, 'nomenclature.view');
 const allowGallery = hasPermission_(user, 'gallery.view');
 const omitNom = options.omit_nomenclature === true || String(options.omit_nomenclature || '').toLowerCase() === 'true';
 const allNom = (allowNom && !omitNom) ? buildNomenclature_() : [];
 const includeOrderMedia = supportsOrderMedia_(options.app_version);
 const orders = allowOrders ? buildOrders_(includeOrderMedia) : [];
 const archivedOrders = allowOrders ? buildArchivedOrders_(includeOrderMedia) : [];
 const calculations = allowOrders ? buildCalculations_(orders, allNom) : {};
 const purchaseLines = allowPurchase ? buildPurchaseLines_(calculations, allNom) : [];
 const purchaseAggregated = allowPurchase ? aggregatePurchaseLines_(purchaseLines) : [];
 const purchaseWarnings = allowPurchase ? buildPurchaseWarnings_(orders, calculations, purchaseLines) : [];
 return {
   meta: {
     version: CFG.VERSION,
     snapshotDate: formatDate_(new Date()),
     snapshotTime: Utilities.formatDate(new Date(), spreadsheetTz_(), 'HH:mm'),
     timezone: spreadsheetTz_(),
     backendConnected: true,
     source: 'Google Sheets live / server-side auth',
     schemaVersion: 1,
     nomenclatureRevision: allowNom ? currentNomenclatureRevision_() : 0,
     nomenclatureDeltaSupported: true,
     nomenclatureOmitted: allowNom && omitNom
   },
   orders: orders,
   archivedOrders: archivedOrders,
   calculations: calculations,
   wallet: allowWallet ? q046BuildCanonicalWallet_({horizon:'month'}) : emptyWallet_(),
   plannedFinance: allowWallet ? q046PlannedFinance_(q046ForecastDate_({horizon:'month'})) : [],
   nomenclature: (allowNom && !omitNom) ? allNom : [],
   purchaseLines: purchaseLines,
   purchaseAggregated: purchaseAggregated,
   gallery: allowGallery ? buildGallery_() : [],
   appIssues: hasPermission_(user, 'appdev.view') ? buildAppIssues_() : [],
   purchaseWarnings: purchaseWarnings
 };
}
function supportsOrderMedia_(appVersion) {
 const m = String(appVersion || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
 if (!m) return false;
 const major = Number(m[1] || 0), minor = Number(m[2] || 0), patch = Number(m[3] || 0);
 if (major > 0) return true;
 if (minor > 3) return true;
 return minor === 3 && patch >= 3;
}
function financeMovementClass_(type,orderId,category,subcategory,financialMeaning){
 const t=String(type||''),oid=String(orderId||'').trim(),cat=(String(category||'')+' '+String(subcategory||'')).toLowerCase(),meaning=String(financialMeaning||'').trim().toUpperCase();
 if(['NON_OPERATING_LOAN_INFLOW','NON_OPERATING_PARTNER_REPAYMENT','NON_OPERATING_OWNER_DISTRIBUTION','NON_OPERATING_OBLIGATION_PAYMENT','FUNDING_REPAYMENT','PARTNER_DISTRIBUTION'].indexOf(meaning)>=0)return 'non_operating';
 if(/вывод|вклад владельц|внутренн/.test(cat))return 'owner_internal';
 if(/^Приход$/i.test(t)&&oid)return 'order_income';
 if(/^Расход$/i.test(t)&&oid)return 'order_direct_expense';
 if(/^Расход$/i.test(t))return 'general_expense';
 if(/^Приход$/i.test(t))return 'general_income';
 return 'other';
}
function buildOrderFinanceIndex_(){
 const ft=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),idx={};
 ft.rows.forEach(function(r,rowIndex){
   if(yes_(valueBy_(ft,r,'is_deleted'))||!yes_(valueBy_(ft,r,'Фактическая операция')))return;
   const oid=cleanOut_(valueBy_(ft,r,'№ заказа'));if(!oid)return;
   const type=String(valueBy_(ft,r,'Тип')||''),amount=numberOrNull_(valueBy_(ft,r,'Сумма'));if(amount==null)return;
   const cls=financeMovementClass_(type,oid,valueBy_(ft,r,'Категория'),valueBy_(ft,r,'Подкатегория'),valueBy_(ft,r,'Финансовый смысл'));
   if(!idx[oid])idx[oid]={income:0,directExpense:0,otherExpense:0,operations:0};
   idx[oid].operations++;
   if(cls==='order_income')idx[oid].income+=Number(amount);
   else if(cls==='order_direct_expense')idx[oid].directExpense+=Number(amount);
   else if(cls!=='non_operating'&&cls!=='owner_internal'&&/^Расход$/i.test(type))idx[oid].otherExpense+=Number(amount);
 });
 return idx;
}
function attachOrderFinance_(o,finance){
 const f=finance&&finance[o.id]?finance[o.id]:{income:0,directExpense:0,otherExpense:0,operations:0},price=Number(o.clientPrice||0);
 o.financeReceived=Number(f.income||0);
 o.financeDirectExpense=Number(f.directExpense||0);
 o.financeOtherExpense=Number(f.otherExpense||0);
 o.financeOperations=Number(f.operations||0);
 o.financeDebt=Math.max(0,price-o.financeReceived);
 o.futureIncome=Math.max(0,price-o.financeReceived);
 o.financeReceivedMismatch=Math.abs(Number(o.received||0)-o.financeReceived)>0.009;
 o.financeCostMismatch=Math.abs(Number(o.actualCost||0)-o.financeDirectExpense)>0.009;
 return o;
}
function buildOrders_(includeOrderMedia) {
 const t = tableByHeader_(CFG.SPREADSHEET_ID, 'Заказы', 1);
 const out = [], finance=buildOrderFinanceIndex_();
 t.rows.forEach(function (r) {
   const no = String(valueBy_(t, r, '№ заказа') || '').trim();
   if (!no) return;
   const status = String(valueBy_(t, r, 'Статус') || '').trim();
   if (yes_(valueBy_(t, r, 'is_deleted'))) return;
   if (/^(Отменён|Отменен|Закрыт|Архив|В архив|Завершён|Завершен)$/i.test(status)) return;
   const orderFolder = cleanOut_(valueBy_(t, r, 'Папка Google Drive'));
   const orderImages = includeOrderMedia ? buildOrderMedia_(no, orderFolder) : [];
   out.push({
     id: no,
     systemId: cleanOut_(valueBy_(t, r, 'ID заказа')),
     status: status,
     created: formatDateMaybe_(valueBy_(t, r, 'Дата создания')),
     accepted: formatDateMaybe_(valueBy_(t, r, 'Дата принятия')),
     deadline: formatDateMaybe_(valueBy_(t, r, 'Срок сдачи')),
     completedAt: formatDateMaybe_(valueBy_(t, r, 'Дата завершения')),
     name: cleanOut_(valueBy_(t, r, 'Название заказа')),
     description: cleanOut_(valueBy_(t, r, 'Краткое описание')),
     clientPrice: numberOrNull_(valueBy_(t, r, 'Цена клиенту')),
     received: numberOrNull_(valueBy_(t, r, 'Получено')),
     debt: numberOrNull_(valueBy_(t, r, 'Долг')),
     calcCost: numberOrNull_(valueBy_(t, r, 'Себестоимость расчётная')),
     actualCost: numberOrNull_(valueBy_(t, r, 'Фактические прямые затраты')),
     prepaymentEnough:cleanOut_(valueBy_(t,r,'Предоплаты достаточно')),
     stage: cleanOut_(valueBy_(t, r, 'Ближайший этап')),
     stageDate: formatDateMaybe_(valueBy_(t, r, 'Дата ближайшего этапа')),
     folder: orderFolder,
     comment: cleanOut_(valueBy_(t, r, 'Комментарий')),
     updated: formatDateMaybe_(valueBy_(t, r, 'Последнее изменение')),
     createdByUserId: cleanOut_(valueBy_(t, r, 'created_by_user_id')),
     createdByName: cleanOut_(valueBy_(t, r, 'created_by_name')),
     updatedByUserId: cleanOut_(valueBy_(t, r, 'updated_by_user_id')),
     updatedByName: cleanOut_(valueBy_(t, r, 'updated_by_name')),
     updatedAtApp: cleanOut_(valueBy_(t, r, 'updated_at_app')),
     recordVersion: numberOrNull_(valueBy_(t, r, 'record_version')) || 0,
     image: '',
     images: orderImages
   });
 });
 return out.map(function(o){return attachOrderFinance_(o,finance);});
}
function buildArchivedOrders_(includeOrderMedia) {
 const t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1),out=[],finance=buildOrderFinanceIndex_();
 t.rows.forEach(function(r){
   const no=String(valueBy_(t,r,'№ заказа')||'').trim();if(!no)return;
   const status=String(valueBy_(t,r,'Статус')||'').trim(),deleted=yes_(valueBy_(t,r,'is_deleted'));
   if(!deleted&&!/^(Отменён|Отменен|Закрыт|Архив|В архив|Завершён|Завершен)$/i.test(status))return;
   const orderFolder=cleanOut_(valueBy_(t,r,'Папка Google Drive'));
   out.push({
     id:no,systemId:cleanOut_(valueBy_(t,r,'ID заказа')),status:status||'Архив',
     created:formatDateMaybe_(valueBy_(t,r,'Дата создания')),accepted:formatDateMaybe_(valueBy_(t,r,'Дата принятия')),
     deadline:formatDateMaybe_(valueBy_(t,r,'Срок сдачи')),completedAt:formatDateMaybe_(valueBy_(t,r,'Дата завершения')),
     name:cleanOut_(valueBy_(t,r,'Название заказа')),description:cleanOut_(valueBy_(t,r,'Краткое описание')),
     clientPrice:numberOrNull_(valueBy_(t,r,'Цена клиенту')),received:numberOrNull_(valueBy_(t,r,'Получено')),
     debt:numberOrNull_(valueBy_(t,r,'Долг')),calcCost:numberOrNull_(valueBy_(t,r,'Себестоимость расчётная')),
     actualCost:numberOrNull_(valueBy_(t,r,'Фактические прямые затраты')),folder:orderFolder,
     comment:cleanOut_(valueBy_(t,r,'Комментарий')),updated:formatDateMaybe_(valueBy_(t,r,'Последнее изменение')),
     updatedAtApp:cleanOut_(valueBy_(t,r,'updated_at_app')),recordVersion:numberOrNull_(valueBy_(t,r,'record_version'))||0,
     image:'',images:includeOrderMedia?buildOrderMedia_(no,orderFolder):[]
   });
 });
 out.sort(function(a,b){return String(b.completedAt||b.updated||b.created||'').localeCompare(String(a.completedAt||a.updated||a.created||''));});
 return out.map(function(o){return attachOrderFinance_(o,finance);});
}
function driveIdFromUrl_(v) {
 const s = String(v || '').trim();
 if (!s) return '';
 if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;
 const m = s.match(/\/folders\/([A-Za-z0-9_-]+)/) || s.match(/\/d\/([A-Za-z0-9_-]+)/) || s.match(/[?&]id=([A-Za-z0-9_-]+)/);
 return m ? m[1] : '';
}
function orderPhotoFolder_(orderId, knownOrderFolderUrl) {
 let orderFolderUrl = String(knownOrderFolderUrl || '');
 if (!orderFolderUrl) {
   const t = tableByHeader_(CFG.SPREADSHEET_ID, 'Заказы', 1);
   for (let i = 0; i < t.rows.length; i++) {
     const r = t.rows[i];
     if (String(valueBy_(t, r, '№ заказа') || '').trim() !== String(orderId)) continue;
     orderFolderUrl = cleanOut_(valueBy_(t, r, 'Папка Google Drive'));
     break;
   }
 }
 const rootId = driveIdFromUrl_(orderFolderUrl);
 if (!rootId) return null;
 const root = DriveApp.getFolderById(rootId);
 const folders = root.getFoldersByName('04_Фото');
 return folders.hasNext() ? folders.next() : null;
}
function buildOrderMedia_(orderId, orderFolderUrl) {
 try {
   const folder = orderPhotoFolder_(orderId, orderFolderUrl);
   if (!folder) return [];
   const out = [];
   const files = folder.getFiles();
   while (files.hasNext() && out.length < 100) {
     const f = files.next();
     const mime = String(f.getMimeType() || '');
     if (mime.indexOf('image/') !== 0) continue;
     const updated = f.getLastUpdated();
     out.push({
       mediaId: f.getId(),
       name: cleanOut_(f.getName()),
       mimeType: mime,
       size: Number(f.getSize() || 0),
       modifiedAt: updated ? updated.toISOString() : ''
     });
   }
   out.sort(function (a, b) { return String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')); });
   return out;
 } catch (_) {
   return [];
 }
}
function fileIsDirectChild_(file, folderId) {
 const parents = file.getParents();
 while (parents.hasNext()) {
   if (parents.next().getId() === folderId) return true;
 }
 return false;
}
function fileMediaPayload_(file){
 const mime=String(file.getMimeType()||''); if(mime.indexOf('image/')!==0)throw new Error('MEDIA_NOT_IMAGE');
 const size=Number(file.getSize()||0); if(size>CFG.MAX_MEDIA_BYTES)throw new Error('MEDIA_TOO_LARGE');
 const bytes=file.getBlob().getBytes();
 return {mediaId:file.getId(),name:cleanOut_(file.getName()),mimeType:mime,size:size,modifiedAt:file.getLastUpdated().toISOString(),base64:Utilities.base64Encode(bytes)};
}
function handleGalleryMediaGet_(body,requestId){
 const auth=authSession_(body.session_token,'gallery.view',requestId), id=cleanText_(body.gallery_id||body.item_id,180), hit=findGalleryHit_(id);
 if(!hit)throw new Error('GALLERY_ITEM_NOT_FOUND');
 const url=cleanOut_(valueBy_(hit.table,hit.values,'Google Drive')), allowed=driveIdFromUrl_(url), fileId=cleanId_(body.media_id||allowed,'media_id');
 if(!allowed||fileId!==allowed)throw new Error('GALLERY_MEDIA_NOT_ALLOWED');
 const media=fileMediaPayload_(DriveApp.getFileById(fileId)); touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,gallery_id:id,media:media,serverTime:nowIso_()};
}
function handleAppDevMediaGet_(body,requestId){
 const auth=authSession_(body.session_token,'appdev.view',requestId), key=cleanText_(body.issue_key||body.issue_id||body.local_id,180), hit=appDevRowByKey_(key);
 if(!hit)throw new Error('APPDEV_NOT_FOUND');
 let urls=[]; try{urls=JSON.parse(String(valueBy_(hit.table,hit.values,'media_urls_json')||'[]'))||[];}catch(_){}
 const fileId=cleanId_(body.media_id,'media_id'), allowed=urls.some(function(u){return driveIdFromUrl_(u)===fileId;});
 if(!allowed)throw new Error('APPDEV_MEDIA_NOT_ALLOWED');
 const media=fileMediaPayload_(DriveApp.getFileById(fileId)); touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,issue_key:key,media:media,serverTime:nowIso_()};
}
function handleGalleryUpdate_(body,requestId){
 ensureStep2Schema_(); const action=String(body.gallery_action||body.mode||'favorite').toLowerCase();
 const perm=action==='approve'?'gallery.approve':action==='delete'?'gallery.delete':action==='edit'?'gallery.edit':'gallery.view', auth=authSession_(body.session_token,perm,requestId);
 const id=cleanText_(body.gallery_id||body.item_id,180), hit=findGalleryHit_(id); if(!hit)throw new Error('GALLERY_ITEM_NOT_FOUND');
 const before=tableRowObject_(hit.table,hit.values);
 if(action==='approve'){
   setByHeader_(hit.table,hit.row,'Кандидат в портфолио',false); setByHeader_(hit.table,hit.row,'Одобрен в портфолио',true); setByHeader_(hit.table,hit.row,'Требует разбора',false); setByHeader_(hit.table,hit.row,'Актуальный',true); setByHeader_(hit.table,hit.row,'lifecycle_state','INTERNAL_SHARED'); setByHeader_(hit.table,hit.row,'portfolio_state','APPROVED');
 }else if(action==='favorite'||action==='unfavorite'||action==='toggle-favorite'){
   let fav=[]; try{const x=JSON.parse(String(valueBy_(hit.table,hit.values,'favorite_user_ids_json')||'[]'));if(Array.isArray(x))fav=x.map(String);}catch(_){}
   const set=new Set(fav), uid=String(auth.user.userId||''); const shouldOn=action==='favorite'||(action==='toggle-favorite'&&!set.has(uid));
   if(shouldOn)set.add(uid);else set.delete(uid); setByHeader_(hit.table,hit.row,'favorite_user_ids_json',JSON.stringify(Array.from(set)));
 }else if(action==='edit'){
   if(body.title!=null)setByHeader_(hit.table,hit.row,'Название файла',cleanText_(body.title,240));
   if(body.comment!=null){const c=cleanText_(body.comment,5000);setByHeader_(hit.table,hit.row,'Комментарий',c);setByHeader_(hit.table,hit.row,'Описание',c);}
   if(body.order_id!=null){const ono=cleanText_(body.order_id,80);setByHeader_(hit.table,hit.row,'№ заказа',ono);const oh=findOrderHit_(ono),sid=oh?cleanOut_(valueBy_(oh.table,oh.values,'ID заказа')):'';setByHeader_(hit.table,hit.row,'parent_entity_type',sid?'order':'');setByHeader_(hit.table,hit.row,'parent_entity_id',sid);}
   if(body.category!=null)setByHeader_(hit.table,hit.row,'Категория',cleanText_(body.category,120));
 }else if(action==='delete'){
   setByHeader_(hit.table,hit.row,'Актуальный',false);setByHeader_(hit.table,hit.row,'Кандидат в портфолио',false);setByHeader_(hit.table,hit.row,'Одобрен в портфолио',false);setByHeader_(hit.table,hit.row,'Требует разбора',false);setByHeader_(hit.table,hit.row,'lifecycle_state','TRASHED');setByHeader_(hit.table,hit.row,'trashed_at',nowIso_());setByHeader_(hit.table,hit.row,'trash_expires_at',new Date(Date.now()+30*86400000).toISOString());
 }else throw new Error('GALLERY_ACTION_INVALID');
 setByHeader_(hit.table,hit.row,'updated_by_user_id',auth.user.userId);setByHeader_(hit.table,hit.row,'updated_by_name',auth.user.name);
 setByHeader_(hit.table,hit.row,'record_version',(numberOrNull_(valueBy_(hit.table,hit.values,'record_version'))||0)+1);
 w1TouchDomainRow_('gallery',hit.table,hit.row,requestId);
 const afterHit=findGalleryHit_(id), after=tableRowObject_(afterHit.table,afterHit.values); auditMutation_('gallery',id,action,auth,requestId,before,after,''); touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,gallery_id:id,action:action,serverTime:nowIso_()};
}
function handleOrderMediaGet_(body, requestId) {
 const auth = authSession_(body.session_token, 'orders.view', requestId);
 const orderId = cleanId_(body.order_id, 'order_id');
 const fileId = cleanId_(body.media_id || body.file_id, 'media_id');
 const folder = orderPhotoFolder_(orderId, '');
 if (!folder) throw new Error('ORDER_MEDIA_FOLDER_NOT_FOUND');
 const file = DriveApp.getFileById(fileId);
 if (!fileIsDirectChild_(file, folder.getId())) throw new Error('ORDER_MEDIA_NOT_ALLOWED');
 const mime = String(file.getMimeType() || '');
 if (mime.indexOf('image/') !== 0) throw new Error('ORDER_MEDIA_NOT_IMAGE');
 const size = Number(file.getSize() || 0);
 if (size > CFG.MAX_MEDIA_BYTES) throw new Error('ORDER_MEDIA_TOO_LARGE');
 const blob = file.getBlob();
 const bytes = blob.getBytes();
 touchSessionAndDevice_(auth);
 authLog_(auth.user.userId, auth.deviceId, 'order_media_get', 'OK',
   orderId + ':' + fileId + '; bytes=' + bytes.length, requestId, auth.sessionId);
 return {
   ok: true,
   request_id: requestId,
   order_id: orderId,
   media: {
     mediaId: fileId,
     name: cleanOut_(file.getName()),
     mimeType: mime,
     size: size,
     modifiedAt: file.getLastUpdated().toISOString(),
     base64: Utilities.base64Encode(bytes)
   },
   serverTime: nowIso_()
 };
}
function buildNomenclature_() {
 const t = tableByHeader_(CFG.SPREADSHEET_ID, NOM_SYNC.SHEET, 1);
 const out = [];
 t.rows.forEach(function (r) {
   const item = nomenclatureItemFromRow_(t, r, false);
   if (item) out.push(item);
 });
 return out;
}
function buildCalculations_(orders, nomenclature) {
 const active = {};
 (orders || []).forEach(function (o) { active[o.id] = true; });
 const nomMap = {};
 (nomenclature || []).forEach(function (n) { nomMap[n.id] = n; });
 const t = tableByHeader_(CFG.SPREADSHEET_ID, 'Расчёты', 1);
 const grouped = {};
 t.rows.forEach(function (r) {
   const orderId = String(valueBy_(t, r, '№ заказа') || '').trim();
   if (!active[orderId]) return;
   const mode = String(valueBy_(t, r, 'Режим') || '').trim();
   if (mode && mode !== 'Заказ') return;
   const version = String(valueBy_(t, r, 'Версия') || '').trim() || 'v1';
   if (!grouped[orderId]) grouped[orderId] = {};
   if (!grouped[orderId][version]) grouped[orderId][version] = [];
   grouped[orderId][version].push(r);
 });
 const out = {};
 Object.keys(grouped).forEach(function (orderId) {
   const versions = Object.keys(grouped[orderId]).sort(function (a, b) {
     return versionRank_(a) - versionRank_(b);
   });
   const version = versions[versions.length - 1];
   const rows = grouped[orderId][version];
   const first = rows[0] || [];
   out[orderId] = {
     version: version,
     date: formatDateMaybe_(valueBy_(t, first, 'Дата расчёта')),
     lines: rows.map(function (r) {
       const itemId = cleanOut_(valueBy_(t, r, 'ID Номенклатуры'));
       const nom = nomMap[itemId] || {};
       const section = cleanOut_(valueBy_(t, r, 'Раздел'));
       return {
         calcId: cleanOut_(valueBy_(t, r, 'ID расчёта')),
         orderId: orderId,
         version: version,
         status: cleanOut_(valueBy_(t, r, 'Статус')),
         date: formatDateMaybe_(valueBy_(t, r, 'Дата расчёта')),
         section: section,
         itemId: itemId,
         name: cleanOut_(valueBy_(t, r, 'Наименование')),
         params: cleanOut_(valueBy_(t, r, 'Параметры / размеры')),
         qtyPer: numberOrNull_(valueBy_(t, r, 'Количество на изделие')),
         qtyTech: numberOrNull_(valueBy_(t, r, 'Общее техническое количество')),
         unit: cleanOut_(valueBy_(t, r, 'Единица')),
         buyUnit: cleanOut_(valueBy_(t, r, 'Закупочная единица')),
         stdSize: cleanOut_(valueBy_(t, r, 'Стандартный размер')),
         minPack: numberOrNull_(valueBy_(t, r, 'Минимальная упаковка')),
         qtyBuy: numberOrNull_(valueBy_(t, r, 'Закупаемое количество')),
         price: numberOrNull_(valueBy_(t, r, 'Цена')),
         priceDate: formatDateMaybe_(valueBy_(t, r, 'Дата цены')),
         priceSource: cleanOut_(valueBy_(t, r, 'Источник цены')),
         amount: numberOrNull_(valueBy_(t, r, 'Стоимость')),
         comment: cleanOut_(valueBy_(t, r, 'Комментарий')),
         priceBasis: nom.priceBasis || '',
         currentPrice: nom.price == null ? null : nom.price,
         currentPriceBasis: nom.priceBasis || '',
         currentPriceDate: nom.priceDate || '',
         category: nom.category || '',
         subcategory: nom.subcategory || ''
       };
     })
   };
 });
 return out;
}
function buildPurchaseLines_(calculations, nomenclature) {
 const out = [];
 Object.keys(calculations || {}).forEach(function (orderId) {
   const calc = calculations[orderId];
   (calc.lines || []).forEach(function (line) {
     const copy = JSON.parse(JSON.stringify(line));
     copy.group = copy.category || copy.section || 'Другое';
     out.push(copy);
   });
 });
 return out;
}
function aggregatePurchaseLines_(lines) {
 const m = {};
 (lines || []).forEach(function (x) {
   const key = x.itemId || (String(x.name || '') + '|' + String(x.buyUnit || x.unit || ''));
   if (!m[key]) {
     m[key] = {
       key: key,
       itemId: x.itemId || '',
       name: x.name || '',
       group: x.group || 'Другое',
       qtyBuy: 0,
       buyUnit: x.buyUnit || x.unit || '',
       amount: 0,
       hasUnknownAmount: false,
       orders: [],
       stdSizes: [],
       comments: []
     };
   }
   const a = m[key];
   if (x.qtyBuy != null && isFinite(Number(x.qtyBuy))) a.qtyBuy += Number(x.qtyBuy);
   if (x.amount == null || !isFinite(Number(x.amount))) a.hasUnknownAmount = true;
   else a.amount += Number(x.amount);
   if (a.orders.indexOf(x.orderId) < 0) a.orders.push(x.orderId);
   if (x.stdSize && a.stdSizes.indexOf(x.stdSize) < 0) a.stdSizes.push(x.stdSize);
   if (x.comment && a.comments.indexOf(x.comment) < 0) a.comments.push(x.comment);
 });
 return Object.keys(m).map(function (k) { return m[k]; });
}
function buildPurchaseWarnings_(orders, calculations, lines) {
 const out = [];
 (orders || []).forEach(function (o) {
   if (!calculations[o.id]) {
     out.push({ orderId: o.id, text: 'Расчёт по заказу ещё не сформирован — закупочный список может быть неполным.' });
   }
 });
 (lines || []).forEach(function (x) {
   if (x.amount == null) {
     out.push({ orderId: x.orderId, text: 'Не определена цена: ' + String(x.name || 'позиция') + '.' });
   }
 });
 return out.slice(0, 100);
}
function buildPlannedFinance_(){
 const ft=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),out=[];
 ft.rows.forEach(function(r,idx){
   if(yes_(valueBy_(ft,r,'is_deleted'))||yes_(valueBy_(ft,r,'Фактическая операция')))return;
   const planState=String(valueBy_(ft,r,'plan_state')||'').toUpperCase();if(planState==='CANCELLED')return;
   const type=String(valueBy_(ft,r,'Тип')||''),amount=numberOrNull_(valueBy_(ft,r,'Сумма'));
   if(amount==null||!/^(Приход|Расход)$/i.test(type))return;
   out.push({
     operationId:cleanOut_(valueBy_(ft,r,'ID операции')),date:formatDateMaybe_(valueBy_(ft,r,'Дата')),
     direction:/^Приход$/i.test(type)?'income':'expense',amount:Number(amount),orderId:cleanOut_(valueBy_(ft,r,'№ заказа')),
     category:cleanOut_(valueBy_(ft,r,'Категория')),subcategory:cleanOut_(valueBy_(ft,r,'Подкатегория')),
     movementClass:financeMovementClass_(type,cleanOut_(valueBy_(ft,r,'№ заказа')),valueBy_(ft,r,'Категория'),valueBy_(ft,r,'Подкатегория'),valueBy_(ft,r,'Финансовый смысл')),
     comment:cleanOut_(valueBy_(ft,r,'Описание'))||cleanOut_(valueBy_(ft,r,'Комментарий')),
     createdByUserId:cleanOut_(valueBy_(ft,r,'created_by_user_id')),createdByName:cleanOut_(valueBy_(ft,r,'created_by_name'))||cleanOut_(valueBy_(ft,r,'Сотрудник')),
     updatedAt:cleanOut_(valueBy_(ft,r,'updated_at_app'))||formatDateMaybe_(valueBy_(ft,r,'Дата изменения')),recordVersion:numberOrNull_(valueBy_(ft,r,'record_version'))||0,
     paymentSource:cleanOut_(valueBy_(ft,r,'Источник денег / оплаты')),operationGroup:cleanOut_(valueBy_(ft,r,'Группа операции')),financialMeaning:cleanOut_(valueBy_(ft,r,'Финансовый смысл')),
     counterpartyPartyId:cleanOut_(valueBy_(ft,r,'counterparty_party_id')),cashDestination:cleanOut_(valueBy_(ft,r,'cash_destination')),partnerPartyId:cleanOut_(valueBy_(ft,r,'partner_party_id')),partnerEffect:cleanOut_(valueBy_(ft,r,'partner_effect')),partnerSettlementEntryId:cleanOut_(valueBy_(ft,r,'partner_settlement_entry_id')),obligationId:cleanOut_(valueBy_(ft,r,'obligation_id')),planState:cleanOut_(valueBy_(ft,r,'plan_state')),dueDate:formatDateMaybe_(valueBy_(ft,r,'due_date')),correctionOfFinanceId:cleanOut_(valueBy_(ft,r,'correction_of_finance_id')),_row:idx
   });
 });
 out.sort(function(a,b){return b._row-a._row;});out.forEach(function(x){delete x._row;});return out;
}
function ownerNameKey_(v){
 const s=String(v||'').toLowerCase();
 if(s.indexOf('серге')>=0)return 'sergey';
 if(s.indexOf('евген')>=0)return 'evgeny';
 return '';
}
function walletOwnerStats_(ft,startMs,balance){
 const out={sergey:{contrib:0,returned:0,withdrawn:0,grossDebt:0,debt:0},evgeny:{contrib:0,returned:0,withdrawn:0,grossDebt:0,debt:0}};
 const events=[];
 ft.rows.forEach(function(r,idx){
   if(yes_(valueBy_(ft,r,'is_deleted'))||!yes_(valueBy_(ft,r,'Фактическая операция')))return;
   const ms=dateMs_(valueBy_(ft,r,'Дата'));if(startMs&&ms&&ms<startMs)return;
   const type=String(valueBy_(ft,r,'Тип')||''),cat=String(valueBy_(ft,r,'Категория')||''),amount=Number(numberOrNull_(valueBy_(ft,r,'Сумма'))||0);
   if(!(amount>0))return;
   const owner=ownerNameKey_(valueBy_(ft,r,'Контрагент / поставщик'))||ownerNameKey_(valueBy_(ft,r,'Подкатегория'))||ownerNameKey_(valueBy_(ft,r,'Описание'))||ownerNameKey_(valueBy_(ft,r,'Комментарий'));
   if(!owner||!out[owner])return;
   if(/^Приход$/i.test(type)&&/^Вклад владельца$/i.test(cat))events.push({kind:'contribution',owner:owner,amount:amount,ms:ms||0,idx:idx});
   if(/^Расход$/i.test(type)&&/^Возврат владельцу$/i.test(cat))events.push({kind:'return',owner:owner,amount:amount,ms:ms||0,idx:idx});
   if(/^Расход$/i.test(type)&&/^Вывод средств$/i.test(cat))events.push({kind:'withdraw',owner:owner,amount:amount,ms:ms||0,idx:idx});
 });
 events.sort(function(a,b){return (a.ms-b.ms)||(a.idx-b.idx);});
 const claims=[];
 events.forEach(function(ev){
   if(ev.kind==='withdraw'){out[ev.owner].withdrawn+=ev.amount;return;}
   if(ev.kind==='contribution'){out[ev.owner].contrib+=ev.amount;claims.push({owner:ev.owner,remaining:ev.amount,ms:ev.ms,idx:ev.idx});return;}
   if(ev.kind==='return'){
     out[ev.owner].returned+=ev.amount;let left=ev.amount;
     for(let i=0;i<claims.length&&left>0.0001;i++){const c=claims[i];if(c.owner!==ev.owner||c.remaining<=0)continue;const take=Math.min(c.remaining,left);c.remaining-=take;left-=take;}
   }
 });
 ['sergey','evgeny'].forEach(function(k){out[k].grossDebt=claims.filter(function(c){return c.owner===k;}).reduce(function(s,c){return s+Math.max(0,c.remaining);},0);});
 let available=Math.max(0,Number(balance||0));
 for(let i=0;i<claims.length&&available>0.0001;i++){const c=claims[i];if(c.remaining<=0)continue;const take=Math.min(c.remaining,available);c.remaining-=take;available-=take;}
 ['sergey','evgeny'].forEach(function(k){out[k].debt=claims.filter(function(c){return c.owner===k;}).reduce(function(s,c){return s+Math.max(0,c.remaining);},0);});
 out.grossTotal=out.sergey.grossDebt+out.evgeny.grossDebt;out.debtTotal=out.sergey.debt+out.evgeny.debt;out.netPosition=Number(balance||0)-out.grossTotal;
 return out;
}
function walletPeriodStartMs_(){
 const sh=sheet_('Кошелёк'),lastRow=Math.max(sh.getLastRow(),3),vals=sh.getRange(1,1,lastRow,Math.min(sh.getLastColumn(),14)).getValues();
 return dateMs_((vals[2]||[])[3]);
}
function walletPhysicalBalance_(){const sh=sheet_('Кошелёк');return numberOrNull_(sh.getRange(1,2).getValue())||0;}
function currentOwnerDebt_(owner){
 const ft=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),stats=walletOwnerStats_(ft,walletPeriodStartMs_(),walletPhysicalBalance_());return Number((stats[owner]&&stats[owner].debt)||0);
}
function buildWallet_() {
 const sh = sheet_('Кошелёк');
 const lastRow = Math.max(sh.getLastRow(), 1);
 const vals = sh.getRange(1, 1, lastRow, Math.min(sh.getLastColumn(), 14)).getValues();
 function at(r, c) { return (vals[r - 1] || [])[c - 1]; }
 const periodStart = at(3, 4);
 const startMs = dateMs_(periodStart);
 const ft = tableByHeader_(CFG.SPREADSHEET_ID, 'Финансы', 1);
 const transactions = [];
 ft.rows.forEach(function (r, idx) {
   if (yes_(valueBy_(ft, r, 'is_deleted'))) return;
   if (!yes_(valueBy_(ft, r, 'Фактическая операция'))) return;
   const d = valueBy_(ft, r, 'Дата');
   const ms = dateMs_(d);
   if (startMs && ms && ms < startMs) return;
   const type = String(valueBy_(ft, r, 'Тип') || '');
   const amount = numberOrNull_(valueBy_(ft, r, 'Сумма'));
   if (amount == null || !/^(Приход|Расход)$/i.test(type)) return;
   const creatorName = cleanOut_(valueBy_(ft, r, 'created_by_name')) || cleanOut_(valueBy_(ft, r, 'Сотрудник'));
   transactions.push({
     operationId: cleanOut_(valueBy_(ft, r, 'ID операции')),
     date: formatDateMaybe_(d),
     dateMs: ms || 0,
     direction: /^Приход$/i.test(type) ? 'income' : 'expense',
     amount: Number(amount),
     orderId: cleanOut_(valueBy_(ft, r, '№ заказа')),
     category: cleanOut_(valueBy_(ft, r, 'Категория')),
     subcategory: cleanOut_(valueBy_(ft, r, 'Подкатегория')),
     counterparty: cleanOut_(valueBy_(ft, r, 'Контрагент / поставщик')),
     movementClass: financeMovementClass_(type,cleanOut_(valueBy_(ft,r,'№ заказа')),valueBy_(ft,r,'Категория'),valueBy_(ft,r,'Подкатегория'),valueBy_(ft,r,'Финансовый смысл')),
     comment: cleanOut_(valueBy_(ft, r, 'Описание')) || cleanOut_(valueBy_(ft, r, 'Комментарий')),
     createdByUserId: cleanOut_(valueBy_(ft, r, 'created_by_user_id')),
     createdByName: creatorName,
     updatedByUserId: cleanOut_(valueBy_(ft, r, 'updated_by_user_id')),
     updatedByName: cleanOut_(valueBy_(ft, r, 'updated_by_name')),
     updatedAt: cleanOut_(valueBy_(ft, r, 'updated_at_app')) || formatDateMaybe_(valueBy_(ft, r, 'Дата изменения')),
     recordVersion: numberOrNull_(valueBy_(ft, r, 'record_version')) || 0,
     paymentSource:cleanOut_(valueBy_(ft,r,'Источник денег / оплаты')),operationGroup:cleanOut_(valueBy_(ft,r,'Группа операции')),financialMeaning:cleanOut_(valueBy_(ft,r,'Финансовый смысл')),
     counterpartyPartyId:cleanOut_(valueBy_(ft,r,'counterparty_party_id')),cashDestination:cleanOut_(valueBy_(ft,r,'cash_destination')),partnerPartyId:cleanOut_(valueBy_(ft,r,'partner_party_id')),partnerEffect:cleanOut_(valueBy_(ft,r,'partner_effect')),partnerSettlementEntryId:cleanOut_(valueBy_(ft,r,'partner_settlement_entry_id')),obligationId:cleanOut_(valueBy_(ft,r,'obligation_id')),planState:cleanOut_(valueBy_(ft,r,'plan_state')),dueDate:formatDateMaybe_(valueBy_(ft,r,'due_date')),correctionOfFinanceId:cleanOut_(valueBy_(ft,r,'correction_of_finance_id')),
     _row: idx
   });
 });
 transactions.sort(function(a,b){ return (b.dateMs-a.dateMs) || (b._row-a._row); });
 const allPeriodTransactions=transactions.slice();
 transactions.forEach(function(x){ delete x.dateMs; delete x._row; });
 if (transactions.length > 300) transactions.length = 300;
 const future = [];
 let marker = -1;
 for (let i = 0; i < vals.length; i++) {
   if (String((vals[i] || [])[0] || '').trim() === 'ПРЕДСТОЯЩИЕ РАСХОДЫ') { marker = i; break; }
 }
 if (marker >= 0) {
   for (let i = marker + 2; i < vals.length; i++) {
     const r = vals[i] || [];
     if (!r[0] && !r[1] && !r[3]) { if (future.length) break; continue; }
     const status = String(r[6] || '').trim();
     if (/^(Оплачено|Отменено|Отменён)$/i.test(status)) continue;
     if (!r[0] && !r[1]) continue;
     future.push({
       date: formatDateMaybe_(r[0]),
       amount: numberOrNull_(r[1]) || 0,
       orderId: cleanOut_(r[2]),
       category: cleanOut_(r[3]),
       to: cleanOut_(r[4]),
       comment: cleanOut_(r[5]),
       status: status
     });
   }
 }
 const balance = numberOrNull_(at(1, 2)) || 0;
 const ownerStats=walletOwnerStats_(ft,startMs,balance);
 const periodIncome=allPeriodTransactions.filter(function(x){return x.direction==='income'&&x.movementClass!=='non_operating'&&x.movementClass!=='owner_internal'&&x.category!=='Вклад владельца'&&x.category!=='Внутренние расчёты';}).reduce(function(s,x){return s+Number(x.amount||0);},0);
 const periodExpense=allPeriodTransactions.filter(function(x){return x.direction==='expense'&&x.movementClass!=='non_operating'&&x.movementClass!=='owner_internal'&&['Вывод средств','Возврат владельцу','Внутренние расчёты'].indexOf(x.category)<0;}).reduce(function(s,x){return s+Number(x.amount||0);},0);
 const ownerDebtSergey=Number(ownerStats.sergey.debt||0),ownerDebtEvgeny=Number(ownerStats.evgeny.debt||0),ownerDebtTotal=Number(ownerStats.debtTotal||0);
 const ownerGrossDebtSergey=Number(ownerStats.sergey.grossDebt||0),ownerGrossDebtEvgeny=Number(ownerStats.evgeny.grossDebt||0),ownerGrossDebtTotal=Number(ownerStats.grossTotal||0);
 const netPosition=Number(ownerStats.netPosition||0);
 const futureTotalCell = numberOrNull_(at(2, 9));
 const futureTotal = futureTotalCell == null ?
   future.reduce(function (sum, x) { return sum + Number(x.amount || 0); }, 0) : futureTotalCell;
 return {
   balance: balance,
   income: numberOrNull_(at(1, 4)) || 0,
   expense: numberOrNull_(at(1, 6)) || 0,
   periodIncome: periodIncome,
   periodExpense: periodExpense,
   reserve: numberOrNull_(at(1, 8)) || 0,
   freeNow: numberOrNull_(at(1, 10)) == null ? balance : numberOrNull_(at(1, 10)),
   expense7: numberOrNull_(at(1, 12)) || 0,
   free7: numberOrNull_(at(1, 14)) == null ? balance : numberOrNull_(at(1, 14)),
   futureExpenses: future,
   transactions: transactions,
   futureTotal: futureTotal,
   futureIncome: 0,
   ownerDebt: ownerDebtSergey,
   ownerDebtSergey: ownerDebtSergey,
   ownerDebtEvgeny: ownerDebtEvgeny,
   ownerDebtTotal: ownerDebtTotal,
   ownerGrossDebtSergey: ownerGrossDebtSergey,
   ownerGrossDebtEvgeny: ownerGrossDebtEvgeny,
   ownerGrossDebtTotal: ownerGrossDebtTotal,
   withdrawSergey: Number(ownerStats.sergey.withdrawn||0),
   withdrawEvgeny: Number(ownerStats.evgeny.withdrawn||0),
   netPosition: netPosition,
   afterObligations: numberOrNull_(at(2, 11)) == null ? balance - futureTotal : numberOrNull_(at(2, 11))
 };
}
function emptyWallet_() {
 return {
   balance: 0, income: 0, expense: 0, periodIncome:0, periodExpense:0, reserve: 0, freeNow: 0,
   expense7: 0, free7: 0, futureExpenses: [], transactions: [], futureTotal: 0,
   futureIncome: 0, ownerDebt:0, ownerDebtSergey:0, ownerDebtEvgeny:0, ownerDebtTotal:0, ownerGrossDebtSergey:0, ownerGrossDebtEvgeny:0, ownerGrossDebtTotal:0, withdrawSergey:0, withdrawEvgeny:0, netPosition:0, afterObligations: 0
 };
}
function buildGallery_() {
 const t=tableByHeader_(CFG.SPREADSHEET_ID, 'Файлы и портфолио', 1);
 return t.rows.filter(function (r) {
   const actual=String(valueBy_(t,r,'Актуальный')==null?'':valueBy_(t,r,'Актуальный')).toLowerCase();
   return actual!=='false' && String(valueBy_(t, r, 'ID файла') || '').trim() &&
     (yes_(valueBy_(t, r, 'Кандидат в портфолио')) || yes_(valueBy_(t, r, 'Одобрен в портфолио')));
 }).map(function (r) {
   const driveUrl=cleanOut_(valueBy_(t, r, 'Google Drive')); let fav=[];
   try{const x=JSON.parse(String(valueBy_(t,r,'favorite_user_ids_json')||'[]')); if(Array.isArray(x))fav=x.map(String);}catch(_){}
   const name=cleanOut_(valueBy_(t, r, 'Название файла')), comment=cleanOut_(valueBy_(t, r, 'Комментарий'));
   return {
     id: cleanOut_(valueBy_(t, r, 'ID файла')),
     orderId: cleanOut_(valueBy_(t, r, '№ заказа')),
     date: formatDateMaybe_(valueBy_(t, r, 'Дата')),
     type: cleanOut_(valueBy_(t, r, 'Тип')),
     category: cleanOut_(valueBy_(t, r, 'Категория')),
     name: name, title:name,
     description: cleanOut_(valueBy_(t, r, 'Описание')),
     driveUrl: driveUrl, image:'', mediaId:driveIdFromUrl_(driveUrl),
     candidate: yes_(valueBy_(t, r, 'Кандидат в портфолио')),
     approved: yes_(valueBy_(t, r, 'Одобрен в портфолио')),
     source: cleanOut_(valueBy_(t, r, 'Откуда получен')),
     comment: comment, note:comment,
     createdByUserId:cleanOut_(valueBy_(t,r,'created_by_user_id')),
     createdByName:cleanOut_(valueBy_(t,r,'created_by_name')),
     updatedByName:cleanOut_(valueBy_(t,r,'updated_by_name')),
     favoriteUserIds:fav,favoriteCount:fav.length,
     recordVersion:numberOrNull_(valueBy_(t,r,'record_version'))||0
   };
 });
}
function handleActivityList_(body, requestId) {
 const auth = authSession_(body.session_token, 'activity.view', requestId);
 const limit = Math.max(1, Math.min(300, Number(body.limit || 100)));
 const userFilter = cleanText_(body.user_id || '', 80);
 const orderFilter = cleanText_(body.order_id || '', 80);
 const items = [];
 const authSheet = sheet_(CFG.AUTH_LOG_SHEET);
 const authRows = authSheet.getLastRow() > 1 ?
   authSheet.getRange(2, 1, authSheet.getLastRow() - 1, authSheet.getLastColumn()).getValues() : [];
 authRows.forEach(function (r) {
   const userId = String(r[1] || '');
   if (userFilter && userId !== userFilter) return;
   items.push({
     source: 'auth',
     at: cleanOut_(r[0]),
     user_id: userId,
     device_id: cleanOut_(r[2]),
     action: cleanOut_(r[3]),
     result: cleanOut_(r[4]),
     detail: cleanOut_(r[5]),
     request_id: cleanOut_(r[6]),
     session_id: cleanOut_(r[7]),
     order_id: ''
   });
 });
 const syncSheet = sheet_(CFG.SYNC_LOG_SHEET);
 const syncRows = syncSheet.getLastRow() > 1 ?
   syncSheet.getRange(2, 1, syncSheet.getLastRow() - 1, syncSheet.getLastColumn()).getValues() : [];
 syncRows.forEach(function (r) {
   const userId = String(r[2] || '');
   if (userFilter && userId !== userFilter) return;
   let raw = {};
   try { raw = JSON.parse(String(r[5] || '{}')); } catch (_) {}
   const orderId = String(raw.objectId || raw.entity_id || raw.related_order_id || '');
   if (orderFilter && orderId !== orderFilter) return;
   items.push({
     source: 'sync',
     at: cleanOut_(r[0]),
     event_id: cleanOut_(r[1]),
     user_id: userId,
     device_id: cleanOut_(r[3]),
     action: cleanOut_(r[4]),
     result: String(r[6] || '').indexOf('OK') === 0 ? 'OK' : cleanOut_(r[6]),
     detail: cleanOut_(r[8]) || cleanOut_(r[9]),
     order_id: orderId,
     raw: raw
   });
 });
 const auditSheet=sheet_(CFG.AUDIT_SHEET);
 const auditRows=auditSheet.getLastRow()>1?auditSheet.getRange(2,1,auditSheet.getLastRow()-1,auditSheet.getLastColumn()).getValues():[];
 auditRows.forEach(function(r){
   const entityType=String(r[2]||''),entityId=String(r[3]||''),userId=String(r[5]||'');
   if(entityType!=='order')return;if(userFilter&&userId!==userFilter)return;if(orderFilter&&entityId!==orderFilter)return;
   let before={},after={};try{before=JSON.parse(String(r[9]||'{}'))||{}}catch(_){}try{after=JSON.parse(String(r[10]||'{}'))||{}}catch(_){}
   const bs=String(before['Статус']||''),as=String(after['Статус']||''),statusChange=bs!==as?[bs,as].filter(Boolean).join(' → '):'';
   items.push({source:'audit',at:cleanOut_(r[1]),event_id:cleanOut_(r[8]),user_id:userId,user_name:cleanOut_(r[6]),device_id:cleanOut_(r[7]),action:cleanOut_(r[4]),result:'OK',detail:statusChange||cleanOut_(r[11]),order_id:entityId,entity_type:entityType});
 });
 items.sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, items: items.slice(0, limit), serverTime: nowIso_() };
}
function handleAdminConflictsList_(body,requestId){
 ensureStep2Schema_();const auth=authSession_(body.session_token,'users.manage',requestId),sh=sheet_(CFG.CONFLICTS_SHEET);
 const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues():[];
 const statusFilter=String(body.status||'OPEN').toUpperCase(),items=[];
 rows.forEach(function(r){
   const st=String(r[2]||'OPEN').toUpperCase();if(statusFilter&&statusFilter!=='ALL'&&st!==statusFilter)return;
   let fields=[],base={},patch={},server={};try{fields=JSON.parse(String(r[8]||'[]'))||[]}catch(_){}try{base=JSON.parse(String(r[9]||'{}'))||{}}catch(_){}try{patch=JSON.parse(String(r[10]||'{}'))||{}}catch(_){}try{server=JSON.parse(String(r[11]||'{}'))||{}}catch(_){}
   items.push({conflict_id:cleanOut_(r[0]),created_at:cleanOut_(r[1]),status:st,entity_type:cleanOut_(r[3]),entity_id:cleanOut_(r[4]),event_id:cleanOut_(r[5]),base_record_version:Number(r[6]||0),server_record_version:Number(r[7]||0),conflicting_fields:fields,base_values:base,proposed_patch:patch,server_values:server,actor_user_id:cleanOut_(r[12]),actor_name:cleanOut_(r[13]),device_id:cleanOut_(r[14]),resolved_at:cleanOut_(r[15]),resolved_by:cleanOut_(r[16]),resolution:cleanOut_(r[17]),resolution_note:cleanOut_(r[18])});
 });
 items.sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at));});touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,items:items,serverTime:nowIso_()};
}
function handleAdminConflictResolve_(body,requestId){
 ensureStep2Schema_();const auth=authSession_(body.session_token,'users.manage',requestId),id=cleanId_(body.conflict_id,'conflict_id'),resolution=String(body.resolution||'').toLowerCase();
 if(['server','client'].indexOf(resolution)<0)throw new Error('CONFLICT_RESOLUTION_INVALID');
 const sh=sheet_(CFG.CONFLICTS_SHEET),hit=findRowBy_(sh,1,id,2);if(!hit)return deny_('CONFLICT_NOT_FOUND',auth.user.userId,auth.deviceId,'admin_conflict_resolve',requestId,auth.sessionId);
 if(String(hit.values[2]||'OPEN').toUpperCase()!=='OPEN')return {ok:true,request_id:requestId,conflict_id:id,duplicate:true,status:String(hit.values[2]||'')};
 let patch={};try{patch=JSON.parse(String(hit.values[10]||'{}'))||{}}catch(_){}
 const entityType=String(hit.values[3]||''),entityId=String(hit.values[4]||''),eventId=String(hit.values[5]||'');
 if(resolution==='client'){
   const mutationBody={entity_type:entityType,entity_id:entityId,record_action:'update',patch:patch,note:'ADMIN1 conflict resolution '+id,force_conflict_resolution:true};
   let r;if(entityType==='order')r=mutateOrder_(mutationBody,auth,requestId+'-resolve', 'update');else if(entityType==='finance')r=mutateFinance_(mutationBody,auth,requestId+'-resolve','update');else throw new Error('MUTATION_ENTITY_UNSUPPORTED');
   if(!r||!r.ok)throw new Error((r&&r.error)||'CONFLICT_APPLY_FAILED');
 }
 sh.getRange(hit.row,3).setValue('RESOLVED');sh.getRange(hit.row,16).setValue(nowIso_());sh.getRange(hit.row,17).setValue(auth.user.userId);sh.getRange(hit.row,18).setValue(resolution.toUpperCase());sh.getRange(hit.row,19).setValue(cleanText_(body.note||'',1000));
 auditMutation_('conflict',id,'resolve',auth,eventId,{status:'OPEN'},{status:'RESOLVED',resolution:resolution},cleanText_(body.note||'',500));touchSessionAndDevice_(auth);
 return {ok:true,request_id:requestId,conflict_id:id,status:'RESOLVED',resolution:resolution,serverTime:nowIso_()};
}
function handleAdminUsersList_(body, requestId) {
 ensureStep2Schema_();
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const t = userTable_();
 const users = t.rows.filter(function (r) {
   return String(r[0] || '').trim();
 }).map(function (r, idx) {
   const user = getUser_(String(r[0] || ''));
   if (!user) return null;
   return {
     user_id: user.userId,
     name: user.name,
     role: user.role,
     role_label: user.roleLabel,
     status: user.status,
     offline_hours: user.offlineHours,
     permissions: user.permissions
   };
 }).filter(Boolean);
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, users: users, serverTime: nowIso_() };
}
function handleAdminUserUpdate_(body, requestId) {
 ensureStep2Schema_();
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const targetId = cleanId_(body.user_id, 'user_id');
 if (targetId === 'ADMIN1' && auth.user.userId !== 'ADMIN1') {
   return deny_('ADMIN1_PROTECTED', auth.user.userId, auth.deviceId, 'admin_user_update', requestId, auth.sessionId);
 }
 if (targetId === 'ADMIN1' && String(body.status || '').toUpperCase() === 'INACTIVE') {
   return deny_('ADMIN1_CANNOT_BE_DISABLED', auth.user.userId, auth.deviceId, 'admin_user_update', requestId, auth.sessionId);
 }
 const t = userTable_();
 const hit = findRowBy_(t.sheet, 1, targetId, 3);
 if (!hit) return deny_('USER_NOT_FOUND', auth.user.userId, auth.deviceId, 'admin_user_update', requestId, auth.sessionId);
 const updates = [];
 function setByKey(key, value) {
   const col = t.keyIndex[key];
   if (col == null) return;
   t.sheet.getRange(hit.row, col + 1).setValue(value);
   updates.push(key);
 }
 if (body.name != null) setByKey('name', cleanText_(body.name, 120));
 if (body.role_label != null) setByKey('role_label', cleanText_(body.role_label, 120));
 if (body.status != null) {
   const status = String(body.status).toUpperCase();
   if (!/^(ACTIVE|INACTIVE|BLOCKED)$/.test(status)) throw new Error('STATUS_INVALID');
   setByKey('status', status);
 }
 if (body.offline_hours != null) {
   const h = Math.max(1, Math.min(24 * 30, Number(body.offline_hours)));
   if (!isFinite(h)) throw new Error('OFFLINE_HOURS_INVALID');
   const col = t.keyIndex.offline_hours != null ? 'offline_hours' : 'offline_access_until';
   setByKey(col, h);
 }
 if (body.permissions && typeof body.permissions === 'object') {
   Object.keys(body.permissions).forEach(function (key) {
     if (t.keyIndex[key] == null) return;
     if (targetId === 'ADMIN1') return;
     setByKey(key, body.permissions[key] === true);
   });
 }
 authLog_(auth.user.userId, auth.deviceId, 'admin_user_update', 'OK',
   targetId + '; ' + updates.join(','), requestId, auth.sessionId);
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, user: publicUser_(getUser_(targetId)), updated: updates, serverTime: nowIso_() };
}
function handleAdminAccessList_(body, requestId) {
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const sh = sheet_(CFG.ACCESS_REQUESTS_SHEET);
 const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
 const items = rows.map(function (r) {
   return {
     request_id: cleanOut_(r[0]),
     created_at: cleanOut_(r[1]),
     name_entered: cleanOut_(r[2]),
     device_id: cleanOut_(r[3]),
     app_version: cleanOut_(r[4]),
     status: cleanOut_(r[5]),
     resolved_by: cleanOut_(r[6]),
     resolved_at: cleanOut_(r[7]),
     linked_user_id: cleanOut_(r[8]),
     note: cleanOut_(r[9]),
     approved_at: cleanOut_(r[11]),
     last_poll_at: cleanOut_(r[12])
   };
 }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, items: items, serverTime: nowIso_() };
}
function handleAdminAccessResolve_(body, requestId) {
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const reqId = cleanId_(body.access_request_id, 'access_request_id');
 const status = String(body.status || '').toUpperCase();
 if (!/^(APPROVED|DENIED)$/.test(status)) throw new Error('ACCESS_STATUS_INVALID');
 const sh = sheet_(CFG.ACCESS_REQUESTS_SHEET);
 const hit = findRowBy_(sh, 1, reqId, 2);
 if (!hit) return deny_('ACCESS_REQUEST_NOT_FOUND', auth.user.userId, auth.deviceId, 'admin_access_resolve', requestId, auth.sessionId);
 let linkedUser = '';
 if (status === 'APPROVED') {
   linkedUser = cleanId_(body.user_id, 'user_id');
   const u = getUser_(linkedUser);
   if (!u || !u.active) return deny_('TARGET_USER_INACTIVE', auth.user.userId, auth.deviceId, 'admin_access_resolve', requestId, auth.sessionId);
   const exact = findActiveUsersByName_(String(hit.values[2] || ''));
   if (exact.length === 1 && String(exact[0].userId) !== String(linkedUser)) {
     return deny_('ACCESS_USER_NAME_MISMATCH', auth.user.userId, auth.deviceId, 'admin_access_resolve', requestId, auth.sessionId);
   }
 }
 sh.getRange(hit.row, 6).setValue(status);
 sh.getRange(hit.row, 7).setValue(auth.user.userId);
 sh.getRange(hit.row, 8).setValue(nowIso_());
 sh.getRange(hit.row, 9).setValue(linkedUser);
 sh.getRange(hit.row, 10).setValue(cleanText_(body.note || '', 500));
 if (status === 'APPROVED') sh.getRange(hit.row, 12).setValue(nowIso_());
 authLog_(auth.user.userId, auth.deviceId, 'admin_access_resolve', 'OK',
   reqId + '=' + status + (linkedUser ? '; user=' + linkedUser : ''), requestId, auth.sessionId);
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, access_request_id: reqId, status: status, linked_user_id: linkedUser, serverTime: nowIso_() };
}
function handleAdminDevicesList_(body, requestId) {
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const sh = sheet_(CFG.DEVICES_SHEET);
 const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
 const filterUser = cleanText_(body.user_id || '', 80);
 const items = rows.map(function (r) {
   return {
     device_id: cleanOut_(r[0]),
     user_id: cleanOut_(r[1]),
     device_name: cleanOut_(r[2]),
     status: cleanOut_(r[3]),
     first_seen: cleanOut_(r[4]),
     last_seen: cleanOut_(r[5]),
     offline_access_until: cleanOut_(r[7]),
     revoked_at: cleanOut_(r[8]),
     revocation_reason: cleanOut_(r[9]),
     wipe_on_next_online: yes_(r[10]),
     notes: cleanOut_(r[11])
   };
 }).filter(function (x) { return !filterUser || x.user_id === filterUser; });
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, items: items, serverTime: nowIso_() };
}
function handleAdminDeviceUpdate_(body, requestId) {
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const deviceId = cleanId_(body.device_id, 'device_id');
 const sh = sheet_(CFG.DEVICES_SHEET);
 const hit = findRowBy_(sh, 1, deviceId, 2);
 if (!hit) return deny_('DEVICE_NOT_FOUND', auth.user.userId, auth.deviceId, 'admin_device_update', requestId, auth.sessionId);
 const targetUser = String(hit.values[1] || '');
 if (targetUser === 'ADMIN1' && auth.user.userId !== 'ADMIN1') {
   return deny_('ADMIN1_DEVICE_PROTECTED', auth.user.userId, auth.deviceId, 'admin_device_update', requestId, auth.sessionId);
 }
 const action = String(body.device_action || '').toLowerCase();
 if (action === 'revoke') {
   sh.getRange(hit.row, 4).setValue('REVOKED');
   sh.getRange(hit.row, 9).setValue(nowIso_());
   sh.getRange(hit.row, 10).setValue(cleanText_(body.reason || 'Revoked by admin', 500));
   sh.getRange(hit.row, 11).setValue(body.wipe_on_next_online !== false);
   revokeSessionsBy_('', deviceId, 'device revoked by ' + auth.user.userId);
 } else if (action === 'activate') {
   sh.getRange(hit.row, 4).setValue('ACTIVE');
   sh.getRange(hit.row, 9).setValue('');
   sh.getRange(hit.row, 10).setValue('');
   sh.getRange(hit.row, 11).setValue(false);
 } else if (action === 'wipe') {
   sh.getRange(hit.row, 11).setValue(true);
 } else if (action === 'clear-wipe') {
   sh.getRange(hit.row, 11).setValue(false);
 } else {
   throw new Error('DEVICE_ACTION_INVALID');
 }
 authLog_(auth.user.userId, auth.deviceId, 'admin_device_update', 'OK',
   deviceId + '=' + action, requestId, auth.sessionId);
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, device_id: deviceId, action: action, serverTime: nowIso_() };
}
function handleAdminSessionsRevoke_(body, requestId) {
 const auth = authSession_(body.session_token, 'users.manage', requestId);
 const userId = cleanText_(body.user_id || '', 80);
 const deviceId = cleanText_(body.device_id || '', 180);
 const sessionId = cleanText_(body.session_id || '', 180);
 if (!userId && !deviceId && !sessionId) throw new Error('REVOKE_TARGET_REQUIRED');
 if (userId === 'ADMIN1' && auth.user.userId !== 'ADMIN1') {
   return deny_('ADMIN1_SESSION_PROTECTED', auth.user.userId, auth.deviceId, 'admin_sessions_revoke', requestId, auth.sessionId);
 }
 const count = revokeSessionsBy_(userId, deviceId, cleanText_(body.reason || ('revoked by ' + auth.user.userId), 500), sessionId);
 authLog_(auth.user.userId, auth.deviceId, 'admin_sessions_revoke', 'OK',
   'count=' + count + '; user=' + userId + '; device=' + deviceId + '; session=' + sessionId,
   requestId, auth.sessionId);
 touchSessionAndDevice_(auth);
 return { ok: true, request_id: requestId, revoked: count, serverTime: nowIso_() };
}
function revokeSessionsBy_(userId, deviceId, reason, sessionId) {
 const sh = sheet_(CFG.SESSIONS_SHEET);
 if (sh.getLastRow() < 2) return 0;
 const rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
 let count = 0;
 rows.forEach(function (r, i) {
   if (sessionId && String(r[0] || '') !== sessionId) return;
   if (userId && String(r[1] || '') !== userId) return;
   if (deviceId && String(r[2] || '') !== deviceId) return;
   if (String(r[7] || '')) return;
   const row = i + 2;
   sh.getRange(row, 8).setValue(nowIso_());
   sh.getRange(row, 10).setValue(cleanText_(reason || 'revoked', 500));
   count++;
 });
 return count;
}
function userTable_() {
 const sh = sheet_(CFG.USERS_SHEET);
 const lastCol = sh.getLastColumn();
 const lastRow = sh.getLastRow();
 const keys = lastCol ? sh.getRange(2, 1, 1, lastCol).getDisplayValues()[0] : [];
 const keyIndex = {};
 keys.forEach(function (k, i) { if (String(k || '').trim()) keyIndex[String(k).trim()] = i; });
 const rows = lastRow >= 3 ? sh.getRange(3, 1, lastRow - 2, lastCol).getValues() : [];
 return { sheet: sh, keys: keys, keyIndex: keyIndex, rows: rows };
}
function tableByHeader_(spreadsheetId, sheetName, headerRow) {
 const sh = sheet_(sheetName);
 const lastCol = sh.getLastColumn();
 const lastRow = sh.getLastRow();
 const headers = lastCol ? sh.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0] : [];
 const index = {};
 headers.forEach(function (h, i) {
   const key = String(h || '').trim();
   if (key) index[key] = i;
 });
 const rows = lastRow > headerRow ? sh.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues() : [];
 return { sheet: sh, headers: headers, index: index, rows: rows };
}
function valueBy_(table, row, header) {
 const i = table.index[header];
 return i == null ? '' : row[i];
}
function yes_(v) {
 if (v === true) return true;
 const s = String(v == null ? '' : v).trim().toUpperCase();
 return s === 'TRUE' || s === 'ДА' || s === 'YES' || s === '1' || s === 'ACTIVE';
}
function numberOrNull_(v) {
 if (v === '' || v == null) return null;
 const n = typeof v === 'number' ? v : Number(String(v).replace(/\s|\u00A0|₽/g, '').replace(',', '.'));
 return isFinite(n) ? n : null;
}
function versionRank_(v) {
 const m = String(v || '').match(/(\d+(?:\.\d+)?)/);
 return m ? Number(m[1]) : 0;
}
function cleanOut_(v) {
 if (v == null) return '';
 if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return formatDateMaybe_(v);
 return String(v);
}
function spreadsheetTz_() {
 try { return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Etc/GMT'; }
 catch (_) { return Session.getScriptTimeZone() || 'Etc/GMT'; }
}
function formatDate_(d) {
 return Utilities.formatDate(d, spreadsheetTz_(), 'dd.MM.yyyy');
}
function formatDateMaybe_(v) {
 if (v == null || v === '') return '';
 if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
   return Utilities.formatDate(v, spreadsheetTz_(), 'dd.MM.yyyy');
 }
 if (typeof v === 'number' && isFinite(v)) {
   // Google Sheets serial date fallback.
   const ms = Math.round((v - 25569) * 86400000);
   const d = new Date(ms);
   if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Etc/GMT', 'dd.MM.yyyy');
 }
 return String(v);
}
var SS_CACHE_;
function ss_() {
 if (!SS_CACHE_) SS_CACHE_ = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
 return SS_CACHE_;
}
function sheet_(name) {
 const s = ss_().getSheetByName(name);
 if (!s) throw new Error('SHEET_NOT_FOUND:' + name);
 return s;
}
function findRowBy_(sheet, column1Based, value, startRow) {
 const lastRow = sheet.getLastRow();
 const start = startRow || 2;
 if (lastRow < start) return null;
 const vals = sheet.getRange(start, column1Based, lastRow - start + 1, 1).getValues();
 const needle = String(value);
 for (let i = 0; i < vals.length; i++) {
   if (String(vals[i][0]) === needle) {
     const rowNum = start + i;
     return { row: rowNum, values: sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0] };
   }
 }
 return null;
}
function parseBody_(e) {
 const raw = e && e.postData ? String(e.postData.contents || '') : '';
 if (!raw) return {};
 return JSON.parse(raw);
}
function stripMediaBase64_(obj) {
 const clone = JSON.parse(JSON.stringify(obj || {}));
 if (clone.media && clone.media.base64) {
   clone.media.base64_bytes_omitted = String(clone.media.base64).length;
   delete clone.media.base64;
 }
 if (Array.isArray(clone.mediaList)) {
   clone.mediaList = clone.mediaList.map(function(m) {
     const x = Object.assign({}, m || {});
     if (x.base64) { x.base64_bytes_omitted = String(x.base64).length; delete x.base64; }
     return x;
   });
 }
 return clone;
}
function cleanId_(v, name) {
 const s = String(v || '').trim();
 if (!s || s.length > 180 || !/^[A-Za-z0-9._:-]+$/.test(s)) throw new Error((name || 'id') + '_INVALID');
 return s;
}
function cleanHex_(v, len) {
 const s = String(v || '').trim().toLowerCase();
 return new RegExp('^[0-9a-f]{' + Number(len) + '}$').test(s) ? s : '';
}
function cleanText_(v, max) {
 return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max || 5000);
}
function safeFileName_(name) {
 const s = cleanText_(name, 180).replace(/[\\/:*?"<>|]+/g, '_').trim();
 return s || ('PROD_' + uuid_());
}
function sha256Hex_(text) {
 const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
 return bytes.map(function (b) { const n = b < 0 ? b + 256 : b; return ('0' + n.toString(16)).slice(-2); }).join('');
}
function constantTimeEq_(a, b) {
 a = String(a || ''); b = String(b || '');
 if (a.length !== b.length) return false;
 let diff = 0;
 for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
 return diff === 0;
}
function nowIso_() { return new Date().toISOString(); }
function uuid_() { return Utilities.getUuid(); }
function safeErr_(err) { return cleanText_(err && err.message ? err.message : String(err), 500); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function authorizeNomenclatureSync() {
 return ensureNomenclatureSyncTriggers_();
}
function runNomenclatureIntegritySweep() {
 return nomenclatureIntegritySweep_();
}








/* ===== backend v0.2.22 / Q-029 Wave 1 additive data contract ===== */
const W1_DOMAIN_SCHEMA = Object.freeze({
 parties:{sheet:'Контрагенты',id:'party_id',prefix:'PTY-',view:'parties.view',write:'parties.edit',create:'parties.create',archive:'parties.archive',sync:true},
 order_lines:{sheet:'Позиции заказов',id:'order_line_id',prefix:'OLN-',view:'order_lines.view',write:'order_lines.edit',create:'order_lines.edit',archive:'order_lines.edit',sync:true},
 partner_settlement:{sheet:'Расчёты с партнёрами',id:'settlement_entry_id',prefix:'PSET-',view:'partner_settlement.view',write:'partner_settlement.post',create:'partner_settlement.post',archive:'partner_settlement.correct',sync:true},
 reconciliations:{sheet:'Финансовые сверки',id:'reconciliation_id',prefix:'RECON-',view:'partner_settlement.view',write:'partner_settlement.correct',create:'partner_settlement.correct',archive:'partner_settlement.correct',sync:true},
 obligations:{sheet:'Обязательства',id:'obligation_id',prefix:'OBL-',view:'obligations.view',write:'obligations.edit',create:'obligations.edit',archive:'obligations.edit',sync:true},
 resource_movements:{sheet:'Движения ресурсов',id:'resource_movement_id',prefix:'RMV-',view:'resource_movements.view',write:'resource_movements.post',create:'resource_movements.post',archive:'resource_movements.correct',sync:true},
 finance:{sheet:'Финансы',id:'ID операции',view:'wallet.view',sync:true},
 gallery:{sheet:'Файлы и портфолио',id:'ID файла',view:'gallery.view',sync:true},
 activity:{sheet:'_APP_AUDIT',id:'audit_id',view:'activity.view-own',sync:false}
});
const W1_ENUMS = Object.freeze({
 party_type:['PERSON','ORGANIZATION'],
 party_status:['ACTIVE','ARCHIVED'],
 party_roles:['CLIENT','SUPPLIER','PARTNER','OTHER'],
 order_line_type:['CUSTOM','CALCULATION','STANDARD_PRODUCT','PAINTING'],
 order_line_status:['ACTIVE','ARCHIVED'],
 settlement_status:['POSTED','REVERSED'],
 settlement_type:['RECONCILIATION_OPENING','PERSONAL_FUNDING_IN','PERSONAL_PAID_BUSINESS_EXPENSE','FUNDING_REPAYMENT','BUSINESS_INCOME_RECEIVED_PERSONALLY','PROFIT_SHARE_ACCRUAL','PARTNER_WITHDRAWAL','LOSS_SHARE_ACCRUAL','CORRECTION','REVERSAL'],
 reconciliation_status:['DRAFT','APPLIED','SUPERSEDED','CANCELLED'],
 obligation_type:['CREDIT','INSTALLMENT','SUPPLIER_DEBT','OTHER'],
 obligation_frequency:['NONE','WEEKLY','MONTHLY','CUSTOM'],
 obligation_status:['ACTIVE','PAID','CANCELLED'],
 movement_type:['RECEIPT','CONSUMPTION','RETURN','WRITE_OFF','ADJUSTMENT'],
 movement_status:['POSTED','REVERSED']
});
function w1Enum_(value,allowed,code){const v=String(value||'').trim();if(allowed.indexOf(v)<0)throw new Error(code||'ENUM_INVALID');return v;}
function w1Bool_(v){return v===true||String(v||'').toUpperCase()==='TRUE';}
function w1EventId_(body){const e=String(body.event_id||'').trim();if(!e)throw new Error('EVENT_ID_REQUIRED');return cleanId_(e,'event_id');}
function w1DomainCfg_(domain){const d=String(domain||'').trim(),cfg=W1_DOMAIN_SCHEMA[d];if(!cfg)throw new Error('DOMAIN_INVALID');return {domain:d,cfg:cfg};}
function w1AuthDomain_(body,domain,requestId){
 const dc=w1DomainCfg_(domain),auth=authSession_(body.session_token,null,requestId),u=auth.user,p=dc.cfg.view;
 if(p){let ok=hasPermission_(u,p);if(domain==='activity')ok=ok||hasPermission_(u,'activity.view-all');if(!ok)throw new Error('PERMISSION_DENIED:'+p);}
 return {auth:auth,domain:dc.domain,cfg:dc.cfg};
}
function w1HeadHit_(domain){const sh=sheet_('_DOMAIN_HEADS'),hit=findRowBy_(sh,1,domain,2);if(!hit)throw new Error('DOMAIN_HEAD_NOT_FOUND:'+domain);return {sheet:sh,row:hit.row,values:hit.values};}
function w1HeadObject_(domain){const h=w1HeadHit_(domain),v=h.values;return {domain:String(v[0]||domain),schema_version:String(v[1]||'1.0'),current_rev:Math.floor(Number(v[2]||0)),updated_at:cleanOut_(v[3]),row_count:Math.floor(Number(v[4]||0)),last_event_id:cleanOut_(v[5]),checksum:cleanOut_(v[6])};}
function w1PhysicalRowCount_(cfg){const sh=sheet_(cfg.sheet),last=sh.getLastRow();if(last<2)return 0;const vals=sh.getRange(2,1,last-1,1).getValues();let n=0;vals.forEach(function(r){if(String(r[0]||'').trim())n++;});return n;}
function w1CommitHead_(domain,nextRev,eventId){const h=w1HeadHit_(domain),cfg=W1_DOMAIN_SCHEMA[domain],now=nowIso_();h.sheet.getRange(h.row,3,1,5).setValues([[nextRev,now,w1PhysicalRowCount_(cfg),eventId||'','']]);}
function w1RowHash_(table,obj){const a=[];table.headers.forEach(function(h){const k=String(h||'').trim();if(!k||k==='_SYNC_REV'||k==='_UPDATED_AT'||k==='_ROW_HASH')return;a.push([k,Object.prototype.hasOwnProperty.call(obj,k)?obj[k]:'']);});return sha256Hex_(JSON.stringify(a));}
function w1ReadTable_(domain){const dc=w1DomainCfg_(domain);return {domain:dc.domain,cfg:dc.cfg,table:tableByHeader_(CFG.SPREADSHEET_ID,dc.cfg.sheet,1)};}
function w1ReadRow_(domain,id){const x=w1ReadTable_(domain),hit=findRowBy_(x.table.sheet,1,String(id||''),2);if(!hit)return null;return {table:x.table,cfg:x.cfg,domain:x.domain,row:hit.row,values:hit.values,obj:tableRowObject_(x.table,hit.values)};}
function w1List_(body,requestId,domain,filters){
 const x=w1AuthDomain_(body,domain,requestId),t=tableByHeader_(CFG.SPREADSHEET_ID,x.cfg.sheet,1),offset=Math.max(0,Math.floor(Number(body.offset||0))),limit=Math.max(1,Math.min(250,Math.floor(Number(body.limit||100)))),all=[];
 t.rows.forEach(function(r){
   if(!String(valueBy_(t,r,x.cfg.id)||'').trim())return;
   if(valueBy_(t,r,'is_deleted')!==''&&w1Bool_(valueBy_(t,r,'is_deleted'))&&!body.include_deleted)return;
   const o=tableRowObject_(t,r);if(filters&&!filters(o))return;all.push(o);
 });
 const items=all.slice(offset,offset+limit),next=offset+items.length;touchSessionAndDevice_(x.auth);
 return {ok:true,request_id:requestId,items:items,total_count:all.length,offset:offset,next_offset:next,has_more:next<all.length,serverTime:nowIso_()};
}
function handlePartyList_(body,requestId){return w1List_(body,requestId,'parties');}
function handlePartyGet_(body,requestId){const x=w1AuthDomain_(body,'parties',requestId),id=cleanId_(body.party_id||body.entity_id,'party_id'),r=w1ReadRow_('parties',id);touchSessionAndDevice_(x.auth);return r?{ok:true,request_id:requestId,item:r.obj,serverTime:nowIso_()}:{ok:false,error:'PARTY_NOT_FOUND',request_id:requestId};}
function handleOrderLineList_(body,requestId){const oid=String(body.order_id||'').trim();return w1List_(body,requestId,'order_lines',oid?function(o){return String(o.order_id||'')===oid;}:null);}
function handleSettlementList_(body,requestId){const pid=String(body.partner_party_id||'').trim();return w1List_(body,requestId,'partner_settlement',pid?function(o){return String(o.partner_party_id||'')===pid;}:null);}
function handleObligationList_(body,requestId){return w1List_(body,requestId,'obligations');}
function handleResourceList_(body,requestId){const oid=String(body.order_id||'').trim();return w1List_(body,requestId,'resource_movements',oid?function(o){return String(o.order_id||'')===oid;}:null);}
function handleReconciliationGet_(body,requestId){
 const x=w1AuthDomain_(body,'reconciliations',requestId),id=String(body.reconciliation_id||body.entity_id||'').trim();
 if(!id){touchSessionAndDevice_(x.auth);return w1List_(body,requestId,'reconciliations');}
 const r=w1ReadRow_('reconciliations',id);touchSessionAndDevice_(x.auth);
 return r?{ok:true,request_id:requestId,item:r.obj,serverTime:nowIso_()}:{ok:false,error:'RECONCILIATION_NOT_FOUND',request_id:requestId};
}
function financeWaveQ030Preview_(auth,requestId){
 const sergey=financeWaveFindPartnerParty_('sergey'),evgeny=financeWaveFindPartnerParty_('evgeny'),gun=findFinanceOperation_('FIN-REC-F105'),gunObj=gun?tableRowObject_(tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),gun.values):null;
 return {ok:true,request_id:requestId,profile:'Q030',mode:'PREVIEW_ONLY',targets:{production_cash:11108,sergey_funding_due:14084.83,evgeny_distribution_balance:-2000,gun_original:21662,gun_first_payment:2708,gun_remaining:18954,gun_first_payment_date:'2026-10-04'},legacy:{wallet_balance:walletPhysicalBalance_(),sergey_party_id:sergey?sergey.party_id:'',evgeny_party_id:evgeny?evgeny.party_id:'',gun_finance_found:!!gun,gun_finance_date:gunObj?cleanOut_(gunObj['Дата']):'',gun_finance_amount:gunObj?Number(gunObj['Сумма']||0):0},apply_ready:!!gun,serverTime:nowIso_()};
}
function handleReconciliationPreview_(body,requestId){
 const auth=authSession_(body.session_token,'partner_settlement.view',requestId);if(String(body.profile||'').toUpperCase()==='Q030'){const x=financeWaveQ030Preview_(auth,requestId);touchSessionAndDevice_(auth);return x;}
 const x=w1AuthDomain_(body,'reconciliations',requestId),t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансовые сверки',1),drafts=[];
 t.rows.forEach(function(r){if(String(valueBy_(t,r,'status')||'')==='DRAFT')drafts.push(tableRowObject_(t,r));});touchSessionAndDevice_(x.auth);
 return {ok:true,request_id:requestId,mode:'PREVIEW_ONLY',drafts:drafts,applied:false,serverTime:nowIso_()};
}
function financeWaveSettlementByLastEvent_(eventId){const t=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1);for(let i=0;i<t.rows.length;i++)if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===String(eventId))return tableRowObject_(t,t.rows[i]);return null;}
function financeWaveAppendSettlementAt_(subEvent,entryType,partyId,amount,fundingDelta,distributionDelta,effectiveDate,reconciliationId,financeId,actorId,comment,operationGroup){
 const existing=financeWaveSettlementByLastEvent_(subEvent);if(existing)return existing;const t=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1),head=w1HeadObject_('partner_settlement'),nextRev=head.current_rev+1,now=nowIso_(),id='PSET-'+uuid_();
 const obj={settlement_entry_id:id,occurred_at:String(effectiveDate)+'T12:00:00',effective_date:String(effectiveDate),partner_party_id:String(partyId),entry_type:entryType,funding_delta:Number(fundingDelta||0),distribution_delta:Number(distributionDelta||0),amount:Number(amount||0),currency:'RUB',order_id:'',finance_id:String(financeId||''),obligation_id:'',reconciliation_id:String(reconciliationId||''),operation_group:String(operationGroup||subEvent),source_event_id:String(subEvent),comment:cleanText_(comment||'',1000),status:'POSTED',reversal_of_entry_id:'',created_at:now,created_by_user_id:String(actorId||''),last_event_id:String(subEvent),record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('partner_settlement',nextRev,subEvent);return obj;
}
function financeWaveFindReconByEvent_(eventId){const t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансовые сверки',1);for(let i=0;i<t.rows.length;i++)if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===String(eventId))return {table:t,row:i+2,obj:tableRowObject_(t,t.rows[i])};return null;}
function financeWaveCreateReconDraft_(eventId,auth){const found=financeWaveFindReconByEvent_(eventId);if(found)return found;const t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансовые сверки',1),head=w1HeadObject_('reconciliations'),nextRev=head.current_rev+1,now=nowIso_(),id='RECON-'+Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyyMMdd')+'-'+uuid_().replace(/-/g,'').slice(0,8).toUpperCase(),obj={reconciliation_id:id,effective_at:now,status:'DRAFT',production_cash_target:11108,currency:'RUB',source_document_id:'1ZYAx7Fwke2rFqKbb4FpC8QH1z4UpW5tf1HDCaUW59C0',note:'Q-030 Finance cutover: preserve legacy history; canonical current settlement/cash target',applied_at:'',applied_by_user_id:'',last_event_id:eventId,record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('reconciliations',nextRev,eventId);return financeWaveFindReconByEvent_(eventId);}
function financeWaveDirectPartyCreate_(owner,eventId,auth){let p=financeWaveFindPartnerParty_(owner);if(p)return p;const t=tableByHeader_(CFG.SPREADSHEET_ID,'Контрагенты',1),head=w1HeadObject_('parties'),nextRev=head.current_rev+1,now=nowIso_(),id='PTY-'+uuid_(),obj={party_id:id,display_name:ownerDisplayName_(owner),party_type:'PERSON',roles:JSON.stringify(['PARTNER']),phone:'',email:'',organization_name:'',linked_user_id:owner==='sergey'?'ADMIN1':'EMR-002',aliases_json:'[]',comment:'Q-030 canonical partner identity',status:'ACTIVE',created_at:now,created_by_user_id:auth.user.userId,updated_at:now,updated_by_user_id:auth.user.userId,is_deleted:false,last_event_id:eventId,record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('parties',nextRev,eventId);w1Audit_('parties',id,'create',auth,eventId,{},obj,'','');return obj;}
function financeWaveEnsureObligation_(eventId,auth){const t=tableByHeader_(CFG.SPREADSHEET_ID,'Обязательства',1);for(let i=0;i<t.rows.length;i++){const o=tableRowObject_(t,t.rows[i]);if(String(o.source_finance_id||'')==='FIN-REC-F105'&&String(o.status||'')!=='CANCELLED')return o;}const head=w1HeadObject_('obligations'),nextRev=head.current_rev+1,now=nowIso_(),id='OBL-'+uuid_(),obj={obligation_id:id,obligation_type:'INSTALLMENT',title:'Пистолет порошковой краски',counterparty_party_id:'',order_id:'',opened_date:'2026-10-04',original_amount:21662,currency:'RUB',payment_frequency:'CUSTOM',regular_payment_amount:2708,next_due_date:'',status:'ACTIVE',source_finance_id:'FIN-REC-F105',comment:'Q-030: original 21,662; first payment 2,708; corrected first payment date 04.10.2026',created_at:now,created_by_user_id:auth.user.userId,updated_at:now,updated_by_user_id:auth.user.userId,is_deleted:false,last_event_id:eventId,record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('obligations',nextRev,eventId);w1Audit_('obligations',id,'create',auth,eventId,{},obj,'','');return obj;}
function financeWaveEnsureGunDateCorrection_(eventId,obligation,auth){const original=findFinanceOperation_('FIN-REC-F105');if(!original)throw new Error('GUN_SOURCE_FINANCE_MISSING');const revId='Q030-GUN-DATE-REVERSAL',fixId='Q030-GUN-DATE-CORRECTED',group='Q030-GUN-DATE-CORRECTION';
 if(!findFinanceOperation_(revId)){const r={'ID операции':revId,'Дата':new Date('2026-09-30T12:00:00'),'Тип':'Приход','Категория':'Корректировка','Подкатегория':'Исправление даты оплаты','№ заказа':'','Контрагент / поставщик':'Яндекс Сплит','Описание':'Reversal исходной даты оплаты пистолета 2 708 ₽','Количество':1,'Единица':'операция','Цена единицы':2708,'Сумма':2708,'Сотрудник':auth.user.name,'Фактическая операция':'Да','Источник':'Q-030 Finance migration','Комментарий':'Компенсирует FIN-REC-F105 только для исправления даты; исходная строка сохранена','Дата изменения':new Date(),'created_by_user_id':auth.user.userId,'created_by_name':auth.user.name,'updated_by_user_id':auth.user.userId,'updated_by_name':auth.user.name,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId+'-GUN-REV','record_version':1,'Источник денег / оплаты':'OTHER','Группа операции':group,'Финансовый смысл':'CORRECTION_REVERSAL',cash_destination:'PRODUCTION_WALLET',partner_effect:'CORRECTION',obligation_id:String(obligation.obligation_id||''),plan_state:'NONE',correction_of_finance_id:'FIN-REC-F105'};w1AppendFinance_(r,r.last_event_id);auditMutation_('finance',revId,'create',auth,r.last_event_id,{},r,'Q-030 auditable date correction reversal');}
 if(!findFinanceOperation_(fixId)){const r={'ID операции':fixId,'Дата':new Date('2026-10-04T12:00:00'),'Тип':'Расход','Категория':'Оборудование и инструмент','Подкатегория':'Порошковая покраска / пистолет','№ заказа':'','Контрагент / поставщик':'Яндекс Сплит','Описание':'Пистолет порошковой краски — первый платёж 2 708 ₽, дата подтверждена 04.10.2026','Количество':1,'Единица':'шт','Цена единицы':2708,'Сумма':2708,'Сотрудник':auth.user.name,'Фактическая операция':'Да','Источник':'Q-030 Finance migration','Комментарий':'Исправленная дата оплаты; исходная FIN-REC-F105 сохранена + reversal','Дата изменения':new Date(),'created_by_user_id':auth.user.userId,'created_by_name':auth.user.name,'updated_by_user_id':auth.user.userId,'updated_by_name':auth.user.name,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId+'-GUN-FIX','record_version':1,'Источник денег / оплаты':'PRODUCTION_WALLET','Группа операции':group,'Финансовый смысл':'OBLIGATION_PAYMENT_CORRECTION',cash_destination:'NONE',partner_effect:'NONE',obligation_id:String(obligation.obligation_id||''),plan_state:'NONE',correction_of_finance_id:'FIN-REC-F105'};w1AppendFinance_(r,r.last_event_id);auditMutation_('finance',fixId,'create',auth,r.last_event_id,{},r,'Q-030 corrected first installment payment date');}
}
function handleReconciliationApply_(body,requestId){const auth=authSession_(body.session_token,null,requestId);if(String(auth.user.role||'')!=='ADMIN1')throw new Error('ADMIN1_REQUIRED');if(String(body.profile||'').toUpperCase()!=='Q030'||String(body.confirm_code||'')!=='Q030_APPLY')throw new Error('Q030_CONFIRM_REQUIRED');const eventId=w1EventId_(body),lock=LockService.getScriptLock();lock.waitLock(30000);try{let recon=financeWaveFindReconByEvent_(eventId);if(recon&&String(recon.obj.status||'')==='APPLIED'){touchSessionAndDevice_(auth);return {ok:true,duplicate:true,request_id:requestId,reconciliation_id:recon.obj.reconciliation_id,status:'APPLIED',serverTime:nowIso_()};}recon=financeWaveCreateReconDraft_(eventId,auth);const rid=recon.obj.reconciliation_id,sergey=financeWaveDirectPartyCreate_('sergey',eventId+'-PARTY-SERGEY',auth),evgeny=financeWaveDirectPartyCreate_('evgeny',eventId+'-PARTY-EVGENY',auth);
 const hist=[['S-BENCH-ACC','PROFIT_SHARE_ACCRUAL',sergey.party_id,5000,0,5000,'2026-09-16','Скамейка: начисление доли Сергею 5 000'],['S-BENCH-WD','PARTNER_WITHDRAWAL',sergey.party_id,5000,0,-5000,'2026-09-16','Скамейка: выплата Сергею 5 000; событие закрыто'],['E-BENCH-ACC','PROFIT_SHARE_ACCRUAL',evgeny.party_id,5000,0,5000,'2026-09-16','Скамейка: начисление доли Евгению 5 000'],['E-BENCH-WD','PARTNER_WITHDRAWAL',evgeny.party_id,5000,0,-5000,'2026-09-16','Скамейка: выплата Евгению 5 000; событие закрыто'],['S-PAINT-ACC','PROFIT_SHARE_ACCRUAL',sergey.party_id,1100,0,1100,'2026-09-18','Покраска: начисление Сергею 1 100'],['S-PAINT-WD','PARTNER_WITHDRAWAL',sergey.party_id,1100,0,-1100,'2026-09-18','Покраска: выплата Сергею 1 100; история сентября'],['E-OCT-WD','PARTNER_WITHDRAWAL',evgeny.party_id,2000,0,-2000,'2026-10-04','Авансовый вывод Евгению 2 000; текущий distribution_balance -2 000'],['S-OPEN-FUND','RECONCILIATION_OPENING',sergey.party_id,14084.83,14084.83,0,Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy-MM-dd'),'Q-030 opening funding_due Сергея +14 084,83']];hist.forEach(function(x){financeWaveAppendSettlementAt_(eventId+'-'+x[0],x[1],x[2],x[3],x[4],x[5],x[6],rid,'',auth.user.userId,x[7],eventId);});const obligation=financeWaveEnsureObligation_(eventId+'-GUN-OBL',auth);financeWaveEnsureGunDateCorrection_(eventId,obligation,auth);
 recon=financeWaveFindReconByEvent_(eventId);const t=recon.table,now=nowIso_();setByHeader_(t,recon.row,'status','APPLIED');setByHeader_(t,recon.row,'applied_at',now);setByHeader_(t,recon.row,'applied_by_user_id',auth.user.userId);setByHeader_(t,recon.row,'record_version',Number(recon.obj.record_version||1)+1);w1TouchDomainRow_('reconciliations',t,recon.row,eventId+'-APPLIED');const after=financeWaveFindReconByEvent_(eventId).obj;w1Audit_('reconciliations',rid,'apply',auth,eventId,recon.obj,after,'','');touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,reconciliation_id:rid,status:'APPLIED',production_cash_target:11108,sergey_party_id:sergey.party_id,evgeny_party_id:evgeny.party_id,obligation_id:obligation.obligation_id,serverTime:now};}finally{lock.releaseLock();}}
function handleDomainHead_(body,requestId){
 const domain=String(body.domain||'').trim(),x=w1AuthDomain_(body,domain,requestId),h=w1HeadObject_(domain);
 touchSessionAndDevice_(x.auth);
 return Object.assign({ok:true,request_id:requestId,serverTime:nowIso_()},h);
}
function handleDomainDelta_(body,requestId){
 const domain=String(body.domain||'').trim(),x=w1AuthDomain_(body,domain,requestId),h=w1HeadObject_(domain),since=Math.max(0,Math.floor(Number(body.since_rev||0))),offset=Math.max(0,Math.floor(Number(body.offset||0))),limit=Math.max(20,Math.min(250,Math.floor(Number(body.limit||150))));
 if(since>h.current_rev)return {ok:true,request_id:requestId,domain:domain,reset_required:true,reason:'CLIENT_REV_AHEAD',current_rev:h.current_rev,serverTime:nowIso_()};
 if(!x.cfg.sync){touchSessionAndDevice_(x.auth);return {ok:true,request_id:requestId,domain:domain,from_rev:since,to_rev:h.current_rev,items:[],total_count:0,next_offset:0,has_more:false,reason:'LEGACY_ACTIVITY_BASELINE',serverTime:nowIso_()};}
 const t=tableByHeader_(CFG.SPREADSHEET_ID,x.cfg.sheet,1);
 if(t.index['_SYNC_REV']==null){touchSessionAndDevice_(x.auth);return {ok:true,request_id:requestId,domain:domain,from_rev:since,to_rev:h.current_rev,items:[],total_count:0,next_offset:0,has_more:false,reason:'NO_SYNC_REV_COLUMN',serverTime:nowIso_()};}
 const changed=[];t.rows.forEach(function(r){const rev=Math.floor(Number(valueBy_(t,r,'_SYNC_REV')||0));if(rev>since)changed.push(tableRowObject_(t,r));});
 const items=changed.slice(offset,offset+limit),next=offset+items.length;touchSessionAndDevice_(x.auth);
 return {ok:true,request_id:requestId,domain:domain,from_rev:since,to_rev:h.current_rev,items:items,total_count:changed.length,next_offset:next,has_more:next<changed.length,serverTime:nowIso_()};
}








function w1TouchDomainRow_(domain,table,rowNum,eventId){
 const head=w1HeadObject_(domain),nextRev=head.current_rev+1,now=nowIso_();
 setByHeader_(table,rowNum,'_SYNC_REV',nextRev);
 setByHeader_(table,rowNum,'_UPDATED_AT',now);
 const fresh=table.sheet.getRange(rowNum,1,1,table.headers.length).getValues()[0],obj=tableRowObject_(table,fresh);
 setByHeader_(table,rowNum,'_ROW_HASH',w1RowHash_(table,obj));
 w1CommitHead_(domain,nextRev,eventId||'');
 return nextRev;
}
function w1AppendFinance_(obj,eventId){const r=appendByHeaders_('Финансы',obj);w1TouchDomainRow_('finance',r.table,r.row,eventId||obj.last_event_id||'');return r;}
function w1AppendGallery_(obj,eventId){const r=appendByHeaders_('Файлы и портфолио',obj);w1TouchDomainRow_('gallery',r.table,r.row,eventId||obj.last_event_id||'');return r;}




function w1MutableFields_(domain){return ({
 parties:['display_name','party_type','roles','phone','email','organization_name','linked_user_id','aliases_json','comment','status','updated_at','updated_by_user_id','is_deleted'],
 order_lines:['position_no','line_type','title','quantity','unit','source_standard_product_id','source_standard_product_version','source_calculation_id','source_snapshot_id','client_unit_price','client_line_total','status','comment','updated_at','updated_by_user_id','is_deleted'],
 obligations:['obligation_type','title','counterparty_party_id','order_id','opened_date','original_amount','currency','payment_frequency','regular_payment_amount','next_due_date','status','source_finance_id','comment','updated_at','updated_by_user_id','is_deleted']
})[domain]||[];}
function w1ValidateRoles_(v){
 let arr;
 if(Array.isArray(v))arr=v;
 else{
   const s=String(v||'').trim();
   if(!s)return '';
   if(s.charAt(0)==='['){try{arr=JSON.parse(s);}catch(_){arr=s.split(',');}}
   else arr=s.split(',');
 }
 arr=arr.map(function(x){return String(x||'').trim().toUpperCase();}).filter(Boolean);
 if(!arr.length)throw new Error('PARTY_ROLES_REQUIRED');
 arr.forEach(function(x){w1Enum_(x,W1_ENUMS.party_roles,'PARTY_ROLE_INVALID');});
 arr=Array.from(new Set(arr)).sort();
 return JSON.stringify(arr);
}
function w1ValidateObject_(domain,o,isCreate){
 function req(k){if(o[k]==null||String(o[k]).trim()==='')throw new Error('FIELD_REQUIRED:'+k);}
 if(domain==='parties'){
   if(isCreate)['party_id','display_name','party_type','roles','status','created_at','created_by_user_id','record_version'].forEach(req);
   o.party_type=w1Enum_(o.party_type,W1_ENUMS.party_type,'PARTY_TYPE_INVALID');
   o.status=w1Enum_(o.status||'ACTIVE',W1_ENUMS.party_status,'PARTY_STATUS_INVALID');
   o.roles=w1ValidateRoles_(o.roles);
 }
 if(domain==='order_lines'){
   if(isCreate)['order_line_id','order_id','position_no','line_type','title','quantity','unit','status','created_at','created_by_user_id','record_version'].forEach(req);
   o.line_type=w1Enum_(o.line_type,W1_ENUMS.order_line_type,'ORDER_LINE_TYPE_INVALID');
   o.status=w1Enum_(o.status||'ACTIVE',W1_ENUMS.order_line_status,'ORDER_LINE_STATUS_INVALID');
 }
 if(domain==='obligations'){
   if(isCreate)['obligation_id','obligation_type','title','opened_date','original_amount','currency','payment_frequency','status','created_at','created_by_user_id','record_version'].forEach(req);
   o.obligation_type=w1Enum_(o.obligation_type,W1_ENUMS.obligation_type,'OBLIGATION_TYPE_INVALID');
   o.payment_frequency=w1Enum_(o.payment_frequency||'NONE',W1_ENUMS.obligation_frequency,'PAYMENT_FREQUENCY_INVALID');
   o.status=w1Enum_(o.status||'ACTIVE',W1_ENUMS.obligation_status,'OBLIGATION_STATUS_INVALID');
 }
 return o;
}
function w1ConflictGuardGeneric_(domain,id,t,row,body,auth,eventId){
 const hasBase=body.base_record_version!=null&&body.base_record_version!=='',baseVersion=Math.floor(Number(body.base_record_version||0)),serverVersion=Math.floor(Number(valueBy_(t,row,'record_version')||0));
 if(!hasBase||baseVersion===serverVersion)return {ok:true,serverVersion:serverVersion};
 const base=body.base_values&&typeof body.base_values==='object'?body.base_values:{},patch=body.patch&&typeof body.patch==='object'?body.patch:{},current=tableRowObject_(t,row),fields=[];
 Object.keys(patch).forEach(function(k){if(!Object.prototype.hasOwnProperty.call(base,k)||JSON.stringify(base[k])!==JSON.stringify(current[k]))fields.push(k);});
 if(!fields.length)return {ok:true,serverVersion:serverVersion,autoMerged:true};
 const cid=createMutationConflict_(domain,id,eventId,baseVersion,serverVersion,fields,base,patch,current,auth);
 return {ok:false,conflict:true,conflict_id:cid,conflicting_fields:fields,server_record_version:serverVersion};
}
function w1Audit_(domain,id,action,auth,eventId,before,after,parentType,parentId){
 const sh=sheet_(CFG.AUDIT_SHEET),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],
   o={audit_id:'AUD-'+uuid_(),at:nowIso_(),entity_type:domain,entity_id:id,action:action,actor_user_id:auth.user.userId,actor_name:auth.user.name,device_id:auth.deviceId,event_id:eventId,before_json:JSON.stringify(before||{}),after_json:JSON.stringify(after||{}),note:'',source:'BACKEND',parent_entity_type:parentType||'',parent_entity_id:parentId||'',summary:action+' '+domain+' '+id,old_version:before&&before.record_version||'',new_version:after&&after.record_version||'',status:'CONFIRMED',metadata_json:'{}'},
   row=headers.map(function(h){return Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';});
 sh.appendRow(row);
}
function w1GenericMutate_(body,requestId,domain){
 const dc=w1DomainCfg_(domain),eventId=w1EventId_(body),auth=authSession_(body.session_token,null,requestId),
   action=String(body.record_action||body.action_type||'update').toLowerCase(),
   perm=action==='create'?dc.cfg.create:(action==='archive'?dc.cfg.archive:dc.cfg.write);
 if(perm&&!hasPermission_(auth.user,perm))throw new Error('PERMISSION_DENIED:'+perm);
 if(['create','update','archive'].indexOf(action)<0)throw new Error('MUTATION_ACTION_INVALID');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
   const t=tableByHeader_(CFG.SPREADSHEET_ID,dc.cfg.sheet,1);
   if(action==='create'){
     for(let i=0;i<t.rows.length;i++){
       if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===eventId){
         const existingId=String(valueBy_(t,t.rows[i],dc.cfg.id)||'');
         touchSessionAndDevice_(auth);
         return {ok:true,duplicate:true,request_id:requestId,event_id:eventId,entity_id:existingId,record_version:Number(valueBy_(t,t.rows[i],'record_version')||0)};
       }
     }
   }
   let id=String(body.entity_id||body[dc.cfg.id]||'').trim();
   if(action==='create'&&!id)id=dc.cfg.prefix+uuid_();
   id=cleanId_(id,dc.cfg.id);
   let hit=findRowBy_(t.sheet,1,id,2);
   if(hit&&String(valueBy_(t,hit.values,'last_event_id')||'')===eventId){
     touchSessionAndDevice_(auth);
     return {ok:true,duplicate:true,request_id:requestId,event_id:eventId,entity_id:id,record_version:Number(valueBy_(t,hit.values,'record_version')||0)};
   }
   if(action==='create'&&hit)throw new Error('ENTITY_ALREADY_EXISTS');
   if(action!=='create'&&!hit)throw new Error('ENTITY_NOT_FOUND');
   const head=w1HeadObject_(domain),nextRev=head.current_rev+1,now=nowIso_(),
     before=hit?tableRowObject_(t,hit.values):{},obj=hit?Object.assign({},before):{},
     patch=body.patch&&typeof body.patch==='object'?body.patch:{};
   if(action!=='create'){
     const cg=w1ConflictGuardGeneric_(domain,id,t,hit.values,body,auth,eventId);
     if(!cg.ok)return {ok:true,request_id:requestId,event_id:eventId,conflict:true,conflict_id:cg.conflict_id,conflicting_fields:cg.conflicting_fields,server_record_version:cg.server_record_version};
   }
   if(action==='create'){
     obj[dc.cfg.id]=id;
     Object.keys(patch).forEach(function(k){obj[k]=patch[k];});
     obj.created_at=obj.created_at||now;
     obj.created_by_user_id=obj.created_by_user_id||auth.user.userId;
     obj.record_version=1;
     if(domain==='parties'){obj.status=obj.status||'ACTIVE';obj.is_deleted=false;}
     if(domain==='order_lines'){obj.status=obj.status||'ACTIVE';obj.is_deleted=false;}
     if(domain==='obligations'){obj.currency=obj.currency||'RUB';obj.payment_frequency=obj.payment_frequency||'NONE';obj.status=obj.status||'ACTIVE';obj.is_deleted=false;}
   }else{
     const allowed=w1MutableFields_(domain);
     Object.keys(patch).forEach(function(k){if(allowed.indexOf(k)<0)throw new Error('FIELD_NOT_MUTABLE:'+k);obj[k]=patch[k];});
     if(action==='archive'){
       if(domain==='parties'||domain==='order_lines')obj.status='ARCHIVED';
       else if(domain==='obligations')obj.status='CANCELLED';
     }
     obj.record_version=Math.floor(Number(before.record_version||0))+1;
   }
   obj.updated_at=now;obj.updated_by_user_id=auth.user.userId;obj.last_event_id=eventId;obj._SYNC_REV=nextRev;obj._UPDATED_AT=now;
   w1ValidateObject_(domain,obj,action==='create');
   obj._ROW_HASH=w1RowHash_(t,obj);
   const row=t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';});
   if(action==='create'){t.sheet.appendRow(row);hit=findRowBy_(t.sheet,1,id,2);}
   else t.sheet.getRange(hit.row,1,1,t.headers.length).setValues([row]);
   w1CommitHead_(domain,nextRev,eventId);
   const after=w1ReadRow_(domain,id).obj;
   w1Audit_(domain,id,action,auth,eventId,before,after,domain==='order_lines'?'order':'',domain==='order_lines'?String(after.order_id||''):'');
   touchSessionAndDevice_(auth);
   return {ok:true,request_id:requestId,event_id:eventId,entity_id:id,record_version:Number(after.record_version||0),domain_rev:nextRev,serverTime:nowIso_()};
 }finally{lock.releaseLock();}
}
function handlePartyMutate_(body,requestId){return w1GenericMutate_(body,requestId,'parties');}
function handleOrderLineMutate_(body,requestId){return w1GenericMutate_(body,requestId,'order_lines');}
function handleObligationMutate_(body,requestId){return w1GenericMutate_(body,requestId,'obligations');}
function w1AppendImmutable_(body,requestId,domain,permission,normalize){
 const eventId=w1EventId_(body),auth=authSession_(body.session_token,permission,requestId),dc=w1DomainCfg_(domain),lock=LockService.getScriptLock();
 lock.waitLock(20000);
 try{
   const t=tableByHeader_(CFG.SPREADSHEET_ID,dc.cfg.sheet,1);
   for(let i=0;i<t.rows.length;i++){
     if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===eventId){
       const id=String(valueBy_(t,t.rows[i],dc.cfg.id)||'');touchSessionAndDevice_(auth);
       return {ok:true,duplicate:true,request_id:requestId,event_id:eventId,entity_id:id,record_version:Number(valueBy_(t,t.rows[i],'record_version')||0)};
     }
   }
   let obj=Object.assign({},body.item||body.patch||{});
   obj=normalize(obj,auth,eventId);
   const head=w1HeadObject_(domain),nextRev=head.current_rev+1,now=nowIso_();
   obj.last_event_id=eventId;obj.record_version=1;obj._SYNC_REV=nextRev;obj._UPDATED_AT=now;obj._ROW_HASH=w1RowHash_(t,obj);
   const row=t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';});
   t.sheet.appendRow(row);
   w1CommitHead_(domain,nextRev,eventId);
   w1Audit_(domain,obj[dc.cfg.id],'post',auth,eventId,{},obj,domain==='partner_settlement'&&obj.order_id?'order':'',obj.order_id||'');
   touchSessionAndDevice_(auth);
   return {ok:true,request_id:requestId,event_id:eventId,entity_id:obj[dc.cfg.id],record_version:1,domain_rev:nextRev,serverTime:nowIso_()};
 }finally{lock.releaseLock();}
}
function w1NormalizeSettlement_(o,auth,eventId){
 const now=nowIso_();
 o.settlement_entry_id=o.settlement_entry_id||('PSET-'+uuid_());
 o.occurred_at=o.occurred_at||now;
 o.effective_date=o.effective_date||formatDate_(new Date());
 o.entry_type=w1Enum_(o.entry_type,W1_ENUMS.settlement_type,'SETTLEMENT_TYPE_INVALID');
 o.partner_party_id=cleanId_(o.partner_party_id,'partner_party_id');
 o.amount=Number(o.amount||0);if(!isFinite(o.amount))throw new Error('SETTLEMENT_AMOUNT_INVALID');
 o.currency=o.currency||'RUB';
 o.status=w1Enum_(o.status||'POSTED',W1_ENUMS.settlement_status,'SETTLEMENT_STATUS_INVALID');
 const fd=Number(o.funding_delta||0),dd=Number(o.distribution_delta||0);
 if(fd&&dd)throw new Error('SETTLEMENT_SUBBALANCE_MIX_FORBIDDEN');
 o.funding_delta=isFinite(fd)?fd:0;o.distribution_delta=isFinite(dd)?dd:0;
 o.created_at=o.created_at||now;o.created_by_user_id=o.created_by_user_id||auth.user.userId;o.source_event_id=o.source_event_id||eventId;
 return o;
}
function handleSettlementPost_(body,requestId){return w1AppendImmutable_(body,requestId,'partner_settlement','partner_settlement.post',w1NormalizeSettlement_);}
function handleSettlementCorrect_(body,requestId){
 const auth=authSession_(body.session_token,'partner_settlement.correct',requestId);touchSessionAndDevice_(auth);
 const b=Object.assign({},body,{session_token:body.session_token,item:Object.assign({},body.item||body.patch||{},{entry_type:(body.item&&body.item.entry_type)||(body.patch&&body.patch.entry_type)||'CORRECTION'})});
 return w1AppendImmutable_(b,requestId,'partner_settlement','partner_settlement.correct',w1NormalizeSettlement_);
}
function w1NormalizeResource_(o,auth,eventId){
 const now=nowIso_();
 o.resource_movement_id=o.resource_movement_id||('RMV-'+uuid_());
 o.occurred_at=o.occurred_at||now;
 o.movement_type=w1Enum_(o.movement_type,W1_ENUMS.movement_type,'MOVEMENT_TYPE_INVALID');
 o.nomenclature_id=cleanId_(o.nomenclature_id,'nomenclature_id');
 o.quantity=Number(o.quantity||0);if(!(o.quantity>0))throw new Error('RESOURCE_QUANTITY_INVALID');
 o.status=w1Enum_(o.status||'POSTED',W1_ENUMS.movement_status,'MOVEMENT_STATUS_INVALID');
 o.created_at=o.created_at||now;o.created_by_user_id=o.created_by_user_id||auth.user.userId;
 return o;
}
function handleResourcePost_(body,requestId){return w1AppendImmutable_(body,requestId,'resource_movements','resource_movements.post',w1NormalizeResource_);}
function handleResourceCorrect_(body,requestId){
 const b=Object.assign({},body,{item:Object.assign({},body.item||body.patch||{},{movement_type:(body.item&&body.item.movement_type)||(body.patch&&body.patch.movement_type)||'ADJUSTMENT'})});
 return w1AppendImmutable_(b,requestId,'resource_movements','resource_movements.correct',w1NormalizeResource_);
}
/* ===== backend v0.2.26 / Q-041 canonical Finance cutover technical path ===== */
var Q041_CUTOVER = Object.freeze({
  profile: 'Q029_FINANCE_CUTOVER',
  confirmCode: 'Q029_FINANCE_APPLY',
  sourceQ040: '1gkR0JgyiN5RIItEqB3xI8OUtnGqzwhZWDDYMHJS1_w0',
  targets: Object.freeze({
    productionCash: 11108,
    sergeyFundingDue: 26109.52,
    evgenyDistribution: -2000,
    gunOriginal: 21662,
    gunFirstPayment: 2708,
    gunRemaining: 18954,
    dimaReceived: 14000,
    septemberBenchCarryover: 0
  }),
  defaultBaseline: Object.freeze({
    financeDataRows: 116,
    financeLastRow: 117,
    financeLastId: 'APP-4f29fa50-ac0e-4bec-8e36-3d99529f0085',
    orderCount: 8,
    nextOrderNumber: '2026-009'
  }),
  ownerRows: Object.freeze([
    Object.freeze({id:'APP-73311a1e-a901-40b4-a517-b8ca8820e4f9', amount:3872}),
    Object.freeze({id:'APP-fab9cf62-fc0c-42e0-b121-9ae378fca23a', amount:501}),
    Object.freeze({id:'APP-e410adc3-f235-433c-b343-98890ba4faf5', amount:750}),
    Object.freeze({id:'APP-f6f02b21-38cc-4d0a-8a3c-ee5c677a0baf', amount:5568.48})
  ]),
  testPlanId: 'APP-de9d746b-fb05-41d2-9fbb-1e491dd8fb14',
  gunFinanceId: 'FIN-REC-F105',
  dimaFinanceId: 'APP-2269e60f-5c72-4dfa-adc5-70df55f4298c'
});


function q041CutoverSuffix_(eventId){ return sha256Hex_('Q041:'+String(eventId||'')).slice(0,12).toUpperCase(); }
function q041StableIds_(eventId){
  var s=q041CutoverSuffix_(eventId);
  return {
    reconciliationId:'RECON-Q029-'+s,
    sergeyPartyId:'PTY-Q029-SERGEY',
    evgenyPartyId:'PTY-Q029-EVGENY',
    sergeySettlementId:'PSET-Q029-SERGEY-'+s,
    evgenySettlementId:'PSET-Q029-EVGENY-'+s,
    obligationId:'OBL-Q029-GUN',
    dimaOrderEventId:String(eventId)+'-DIMA-ORDER'
  };
}
function q041AsNumber_(v){
  if(v==null||v==='')return null;
  if(typeof v==='number')return isFinite(v)?v:null;
  var n=Number(String(v).replace(/\s|\u00A0|₽/g,'').replace(',','.'));
  return isFinite(n)?n:null;
}
function q041IsDeleted_(v){ var s=String(v==null?'':v).trim().toUpperCase(); return s==='TRUE'||s==='ДА'||s==='YES'||s==='1'; }
function q041Roles_(v){
  if(Array.isArray(v))return v.map(function(x){return String(x||'').toUpperCase();});
  var s=String(v||'').trim(); if(!s)return [];
  if(s.charAt(0)==='['){try{return JSON.parse(s).map(function(x){return String(x||'').toUpperCase();});}catch(_){}}
  return s.split(',').map(function(x){return String(x||'').trim().toUpperCase();}).filter(Boolean);
}
function q041IsActivePartner_(t,r){
  var status=String(valueBy_(t,r,'status')||'ACTIVE').toUpperCase();
  return status!=='ARCHIVED'&&!q041IsDeleted_(valueBy_(t,r,'is_deleted'))&&q041Roles_(valueBy_(t,r,'roles')).indexOf('PARTNER')>=0;
}
function q041FinanceState_(){
  var t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),count=0,lastRow=1,lastId='';
  t.rows.forEach(function(r,i){var id=String(valueBy_(t,r,'ID операции')||'').trim();if(!id)return;count++;lastRow=i+2;lastId=id;});
  return {table:t,dataRows:count,lastRow:lastRow,lastId:lastId};
}
function q041OrdersState_(){
  var t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1),count=0,dima=[],max=0,year=Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy');
  t.rows.forEach(function(r){
    var id=String(valueBy_(t,r,'ID заказа')||'').trim(); if(!id)return; count++;
    var no=String(valueBy_(t,r,'№ заказа')||''); var m=no.match(new RegExp('^'+year+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]||0));
    if(q041IsDeleted_(valueBy_(t,r,'is_deleted')))return;
    var hay=[valueBy_(t,r,'Имя клиента'),valueBy_(t,r,'Фамилия клиента'),valueBy_(t,r,'Название заказа'),valueBy_(t,r,'Краткое описание'),valueBy_(t,r,'Комментарий')].join(' ').toLowerCase();
    if(hay.indexOf('дима')>=0)dima.push(tableRowObject_(t,r));
  });
  return {table:t,count:count,dima:dima,nextOrderNumber:year+'-'+String(max+1).padStart(3,'0')};
}
function q041ExpectedBaseline_(body,requireExplicit){
  var b=body&&body.baseline&&typeof body.baseline==='object'?body.baseline:{};
  if(requireExplicit&&(!b.finance_data_rows||!b.finance_last_row||!b.finance_last_id))return null;
  return {
    financeDataRows:Number(b.finance_data_rows||Q041_CUTOVER.defaultBaseline.financeDataRows),
    financeLastRow:Number(b.finance_last_row||Q041_CUTOVER.defaultBaseline.financeLastRow),
    financeLastId:String(b.finance_last_id||Q041_CUTOVER.defaultBaseline.financeLastId),
    orderCount:b.order_count==null?Q041_CUTOVER.defaultBaseline.orderCount:Number(b.order_count),
    nextOrderNumber:String(b.next_order_number||Q041_CUTOVER.defaultBaseline.nextOrderNumber)
  };
}
function q041FindFinanceObject_(id){
  var st=q041FinanceState_(),hit=findRowBy_(st.table.sheet,1,id,2);if(!hit)return null;
  return {table:st.table,row:hit.row,obj:tableRowObject_(st.table,hit.values)};
}
function q041CheckFinanceSource_(id,amount,factual,extra){
  var hit=q041FindFinanceObject_(id);if(!hit)return {ok:false,reason:'FINANCE_SOURCE_MISSING',id:id};
  var o=hit.obj,actual=q041AsNumber_(o['Сумма']);
  if(actual==null||Math.abs(actual-Number(amount))>0.009)return {ok:false,reason:'FINANCE_AMOUNT_CHANGED',id:id,expected:Number(amount),actual:actual};
  if(factual!=null&&String(o['Фактическая операция']||'')!==String(factual))return {ok:false,reason:'FINANCE_FACT_FLAG_CHANGED',id:id,expected:String(factual),actual:String(o['Фактическая операция']||'')};
  if(q041IsDeleted_(o.is_deleted))return {ok:false,reason:'FINANCE_SOURCE_DELETED',id:id};
  if(extra&&extra.testPlan&&String(o['Описание']||'').indexOf('1100')<0)return {ok:false,reason:'TEST2_DESCRIPTION_CHANGED',id:id,actual:String(o['Описание']||'')};
  return {ok:true,row:hit.row,obj:o};
}
function q041BusinessRows_(eventId){
  function scan(sheetName,idHeader){
    var t=tableByHeader_(CFG.SPREADSHEET_ID,sheetName,1),all=[];
    t.rows.forEach(function(r){var id=String(valueBy_(t,r,idHeader)||'').trim();if(!id)return;all.push(tableRowObject_(t,r));});
    return all;
  }
  var pset=scan('Расчёты с партнёрами','settlement_entry_id');
  var recon=scan('Финансовые сверки','reconciliation_id');
  var obl=scan('Обязательства','obligation_id');
  function unrelated(rows){return rows.filter(function(o){var le=String(o.last_event_id||o.source_event_id||'');return !(eventId&&le.indexOf(String(eventId))===0);});}
  return {pset:pset,recon:recon,obl:obl,unrelatedPset:unrelated(pset),unrelatedRecon:unrelated(recon),unrelatedObl:unrelated(obl)};
}
function q041PartnerState_(){
  var t=tableByHeader_(CFG.SPREADSHEET_ID,'Контрагенты',1),sergey=[],evgeny=[];
  t.rows.forEach(function(r){if(!q041IsActivePartner_(t,r))return;var o=tableRowObject_(t,r),name=normalizePersonName_(o.display_name),uid=String(o.linked_user_id||'');if(uid==='ADMIN1'||name===normalizePersonName_('Сергей'))sergey.push(o);if(name===normalizePersonName_('Евгений'))evgeny.push(o);});
  return {sergey:sergey,evgeny:evgeny};
}
function q041BaselineGuard_(body,eventId,requireExplicit){
  var expected=q041ExpectedBaseline_(body,requireExplicit),issues=[];
  if(!expected)return {ok:false,error:'BASELINE_REQUIRED',issues:[{reason:'BASELINE_REQUIRED'}]};
  var fs=q041FinanceState_();
  if(fs.dataRows!==expected.financeDataRows)issues.push({reason:'FINANCE_ROW_COUNT_MISMATCH',expected:expected.financeDataRows,actual:fs.dataRows});
  if(fs.lastRow!==expected.financeLastRow)issues.push({reason:'FINANCE_LAST_ROW_MISMATCH',expected:expected.financeLastRow,actual:fs.lastRow});
  if(fs.lastId!==expected.financeLastId)issues.push({reason:'FINANCE_LAST_ID_MISMATCH',expected:expected.financeLastId,actual:fs.lastId});
  Q041_CUTOVER.ownerRows.forEach(function(x){var z=q041CheckFinanceSource_(x.id,x.amount,'Да');if(!z.ok)issues.push(z);});
  var test=q041CheckFinanceSource_(Q041_CUTOVER.testPlanId,1,'Нет',{testPlan:true});if(!test.ok)issues.push(test);
  var gun=q041CheckFinanceSource_(Q041_CUTOVER.gunFinanceId,2708,'Да');if(!gun.ok)issues.push(gun);
  var dima=q041CheckFinanceSource_(Q041_CUTOVER.dimaFinanceId,14000,'Да');if(!dima.ok)issues.push(dima);
  var ps=q041PartnerState_();if(ps.sergey.length>1)issues.push({reason:'SERGEY_PARTNER_DUPLICATES',count:ps.sergey.length});if(ps.evgeny.length>1)issues.push({reason:'EVGENY_PARTNER_DUPLICATES',count:ps.evgeny.length});
  var br=q041BusinessRows_(eventId);if(br.unrelatedPset.length)issues.push({reason:'UNEXPECTED_PARTNER_SETTLEMENT_ROWS',count:br.unrelatedPset.length});if(br.unrelatedRecon.length)issues.push({reason:'UNEXPECTED_RECONCILIATION_ROWS',count:br.unrelatedRecon.length});if(br.unrelatedObl.length)issues.push({reason:'UNEXPECTED_OBLIGATION_ROWS',count:br.unrelatedObl.length});
  var os=q041OrdersState_();var ownDima=os.dima.filter(function(o){return eventId&&String(o.last_event_id||'')===String(eventId)+'-DIMA-ORDER';});var otherDima=os.dima.filter(function(o){return ownDima.indexOf(o)<0;});if(otherDima.length)issues.push({reason:'DIMA_ORDER_COLLISION',count:otherDima.length});
  if(!ownDima.length&&os.count!==expected.orderCount)issues.push({reason:'ORDER_COUNT_MISMATCH',expected:expected.orderCount,actual:os.count});
  if(!ownDima.length&&os.nextOrderNumber!==expected.nextOrderNumber)issues.push({reason:'NEXT_ORDER_NUMBER_MISMATCH',expected:expected.nextOrderNumber,actual:os.nextOrderNumber});
  return {ok:issues.length===0,error:issues.length?'PRECONDITION_MISMATCH':'',issues:issues,expected:expected,current:{financeDataRows:fs.dataRows,financeLastRow:fs.lastRow,financeLastId:fs.lastId,orderCount:os.count,nextOrderNumber:os.nextOrderNumber,dimaMatches:os.dima.length,sergeyPartners:ps.sergey.length,evgenyPartners:ps.evgeny.length,partnerSettlementRows:br.pset.length,reconciliationRows:br.recon.length,obligationRows:br.obl.length}};
}
function q041Plan_(){
  return {party_create_max:2,reconciliation_create:1,settlement_opening_create:2,obligation_create:1,dima_order_create_max:1,finance_update:7,finance_create:0,hard_delete:0};
}
function q041PreviewResult_(body,requestId,auth){
  var guard=q041BaselineGuard_(body,'',false);touchSessionAndDevice_(auth);
  return {ok:true,request_id:requestId,profile:Q041_CUTOVER.profile,mode:'PREVIEW_ONLY',precondition_ok:guard.ok,precondition_error:guard.error,issues:guard.issues,current:guard.current,targets:Q041_CUTOVER.targets,plan:q041Plan_(),q030_apply_disabled:true,business_writes:0,serverTime:nowIso_()};
}
function handleReconciliationPreviewQ041_(body,requestId){
  var profile=String(body.profile||'').toUpperCase();
  if(profile==='Q030'){var a=authSession_(body.session_token,'partner_settlement.view',requestId);touchSessionAndDevice_(a);return {ok:false,error:'Q030_SUPERSEDED',apply_allowed:false,replacement_profile:Q041_CUTOVER.profile,request_id:requestId,serverTime:nowIso_()};}
  if(profile===Q041_CUTOVER.profile){var auth=authSession_(body.session_token,'partner_settlement.view',requestId);if(String(auth.user.role||'')!=='ADMIN1')throw new Error('ADMIN1_REQUIRED');return q041PreviewResult_(body,requestId,auth);}
  return handleReconciliationPreview_(body,requestId);
}
function q041FindPartyById_(id){var t=tableByHeader_(CFG.SPREADSHEET_ID,'Контрагенты',1),hit=findRowBy_(t.sheet,1,id,2);return hit?tableRowObject_(t,hit.values):null;}
function q041EnsureParty_(kind,eventId,auth,body){
  var st=q041PartnerState_(),list=kind==='sergey'?st.sergey:st.evgeny;if(list.length>1)throw new Error('PARTNER_DUPLICATE_'+kind.toUpperCase());if(list.length===1)return list[0];
  var ids=q041StableIds_(eventId),id=kind==='sergey'?ids.sergeyPartyId:ids.evgenyPartyId,existing=q041FindPartyById_(id);if(existing)return existing;
  var linked='';if(kind==='sergey')linked='ADMIN1';else if(body&&body.evgeny_identity_confirmed===true&&String(body.evgeny_linked_user_id||'').trim())linked=cleanId_(body.evgeny_linked_user_id,'evgeny_linked_user_id');
  var t=tableByHeader_(CFG.SPREADSHEET_ID,'Контрагенты',1),head=w1HeadObject_('parties'),nextRev=head.current_rev+1,now=nowIso_(),obj={party_id:id,display_name:kind==='sergey'?'Сергей':'Евгений',party_type:'PERSON',roles:JSON.stringify(['PARTNER']),phone:'',email:'',organization_name:'',linked_user_id:linked,aliases_json:'[]',comment:'Q-041 canonical Q-029 Finance cutover partner',status:'ACTIVE',created_at:now,created_by_user_id:auth.user.userId,updated_at:now,updated_by_user_id:auth.user.userId,is_deleted:false,last_event_id:String(eventId)+'-PARTY-'+kind.toUpperCase(),record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};
  obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('parties',nextRev,obj.last_event_id);w1Audit_('parties',id,'create',auth,obj.last_event_id,{},obj,'','');return obj;
}
function q041FindRecon_(eventId){var t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансовые сверки',1),id=q041StableIds_(eventId).reconciliationId,hit=findRowBy_(t.sheet,1,id,2);return hit?{table:t,row:hit.row,obj:tableRowObject_(t,hit.values)}:null;}
function q041EnsureReconDraft_(eventId,auth){var found=q041FindRecon_(eventId);if(found)return found;var t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансовые сверки',1),head=w1HeadObject_('reconciliations'),nextRev=head.current_rev+1,now=nowIso_(),id=q041StableIds_(eventId).reconciliationId,obj={reconciliation_id:id,effective_at:now,status:'DRAFT',production_cash_target:Q041_CUTOVER.targets.productionCash,currency:'RUB',source_document_id:Q041_CUTOVER.sourceQ040,note:'Q-041 canonical Q-029 Finance cutover; resumable event='+String(eventId),applied_at:'',applied_by_user_id:'',last_event_id:String(eventId),record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('reconciliations',nextRev,eventId);w1Audit_('reconciliations',id,'create',auth,eventId,{},obj,'','');return q041FindRecon_(eventId);}
function q041EnsureSettlementOpening_(eventId,kind,party,recon,auth){
  var ids=q041StableIds_(eventId),id=kind==='sergey'?ids.sergeySettlementId:ids.evgenySettlementId,t=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1),hit=findRowBy_(t.sheet,1,id,2);if(hit)return tableRowObject_(t,hit.values);
  var head=w1HeadObject_('partner_settlement'),nextRev=head.current_rev+1,now=nowIso_(),fd=kind==='sergey'?Q041_CUTOVER.targets.sergeyFundingDue:0,dd=kind==='evgeny'?Q041_CUTOVER.targets.evgenyDistribution:0,amt=Math.abs(fd||dd),obj={settlement_entry_id:id,occurred_at:now,effective_date:Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy-MM-dd'),partner_party_id:String(party.party_id),entry_type:'RECONCILIATION_OPENING',funding_delta:fd,distribution_delta:dd,amount:amt,currency:'RUB',order_id:'',finance_id:'',obligation_id:'',reconciliation_id:String(recon.obj.reconciliation_id),operation_group:String(eventId),source_event_id:String(eventId)+'-OPEN-'+kind.toUpperCase(),comment:'Q-041 canonical current opening only; no historical replay',status:'POSTED',reversal_of_entry_id:'',created_at:now,created_by_user_id:auth.user.userId,last_event_id:String(eventId)+'-OPEN-'+kind.toUpperCase(),record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('partner_settlement',nextRev,obj.last_event_id);w1Audit_('partner_settlement',id,'create',auth,obj.last_event_id,{},obj,'reconciliations',recon.obj.reconciliation_id);return obj;
}
function q041UpdateFinance_(id,eventId,auth,patch,note){
  var t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),hit=findRowBy_(t.sheet,1,id,2);if(!hit)throw new Error('FINANCE_SOURCE_MISSING:'+id);var before=tableRowObject_(t,hit.values),marker=String(eventId);
  if(String(before.last_event_id||'')===marker)return before;
  Object.keys(patch).forEach(function(k){setByHeader_(t,hit.row,k,patch[k]);});
  if(t.index.record_version!=null)setByHeader_(t,hit.row,'record_version',Math.floor(Number(before.record_version||0))+1);
  if(t.index.updated_by_user_id!=null)setByHeader_(t,hit.row,'updated_by_user_id',auth.user.userId);
  if(t.index.updated_by_name!=null)setByHeader_(t,hit.row,'updated_by_name',auth.user.name);
  if(t.index.updated_at_app!=null)setByHeader_(t,hit.row,'updated_at_app',nowIso_());
  if(t.index.last_event_id!=null)setByHeader_(t,hit.row,'last_event_id',marker);
  w1TouchDomainRow_('finance',t,hit.row,marker);
  var afterHit=findRowBy_(t.sheet,1,id,2),after=tableRowObject_(t,afterHit.values);auditMutation_('finance',id,'update',auth,marker,before,after,note||'Q-041 Finance cutover semantic update');return after;
}
function q041EnsureOwnerAnnotations_(eventId,sergey,auth){Q041_CUTOVER.ownerRows.forEach(function(x,i){q041UpdateFinance_(x.id,String(eventId)+'-OWNER-'+String(i+1),auth,{'Источник денег / оплаты':'PERSON',cash_destination:'NONE',partner_party_id:String(sergey.party_id),partner_effect:'FUNDING_INCREASE',partner_settlement_entry_id:''},'Q-041 owner-confirmed personal-paid expense annotation; no extra settlement effect');});}
function q041EnsureTest2Cancelled_(eventId,auth){return q041UpdateFinance_(Q041_CUTOVER.testPlanId,String(eventId)+'-TEST2-CANCEL',auth,{plan_state:'CANCELLED',is_deleted:false},'Q-041 cancel legacy Test2 plan; no cash effect');}
function q041EnsureGunObligation_(eventId,sergey,auth){
  var ids=q041StableIds_(eventId),t=tableByHeader_(CFG.SPREADSHEET_ID,'Обязательства',1),hit=findRowBy_(t.sheet,1,ids.obligationId,2);var obj;
  if(hit)obj=tableRowObject_(t,hit.values);else{var head=w1HeadObject_('obligations'),nextRev=head.current_rev+1,now=nowIso_();obj={obligation_id:ids.obligationId,obligation_type:'INSTALLMENT',title:'Пистолет порошковой краски',counterparty_party_id:'',order_id:'',opened_date:'2026-10-04',original_amount:Q041_CUTOVER.targets.gunOriginal,currency:'RUB',payment_frequency:'WEEKLY',regular_payment_amount:Q041_CUTOVER.targets.gunFirstPayment,next_due_date:'',status:'ACTIVE',source_finance_id:Q041_CUTOVER.gunFinanceId,comment:'Q-041 canonical obligation; remaining derived from original minus linked principal history',created_at:now,created_by_user_id:auth.user.userId,updated_at:now,updated_by_user_id:auth.user.userId,is_deleted:false,last_event_id:String(eventId)+'-GUN-OBL',record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('obligations',nextRev,obj.last_event_id);w1Audit_('obligations',obj.obligation_id,'create',auth,obj.last_event_id,{},obj,'','');}
  q041UpdateFinance_(Q041_CUTOVER.gunFinanceId,String(eventId)+'-GUN-LINK',auth,{obligation_id:String(obj.obligation_id)},'Q-042 safety: link gun obligation_id only; preserve payment/cash/partner semantics');return obj;
}
function q041FindOrderByEvent_(eventId){var t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1);for(var i=0;i<t.rows.length;i++)if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===String(eventId))return tableRowObject_(t,t.rows[i]);return null;}
function q041EnsureDimaOrder_(eventId,auth,expectedNext){
  var orderEvent=String(eventId)+'-DIMA-ORDER',existing=q041FindOrderByEvent_(orderEvent);if(existing)return existing;
  var os=q041OrdersState_();if(os.dima.length)throw new Error('DIMA_ORDER_COLLISION');if(expectedNext&&os.nextOrderNumber!==String(expectedNext))throw new Error('NEXT_ORDER_NUMBER_MISMATCH');
  var no=os.nextOrderNumber,systemId='ORD-'+no,title='Покраска — Дима',folder=createOrderFolder_(no,title),now=new Date(),t=tableByHeader_(CFG.SPREADSHEET_ID,'Заказы',1),obj={'ID заказа':systemId,'№ заказа':no,'Статус':'В работе','Дата создания':now,'Дата принятия':now,'Срок сдачи':'','Имя клиента':'Дима','Фамилия клиента':'','Организация':'','Телефон':'','Название заказа':title,'Краткое описание':'Q-041 canonical order for existing Dima prepayment; price pending','Цена клиенту':'','Получено':Q041_CUTOVER.targets.dimaReceived,'Долг':'','Себестоимость расчётная':'','Фактические прямые затраты':'','Фактические трудозатраты':'','Прогноз прибыли':'','Фактическая маржа':'','Предоплаты достаточно':'','Ближайший этап':'','Дата ближайшего этапа':'','Через самозанятого':'','Ставка самозанятого %':'','Папка Google Drive':folder.getUrl(),'Комментарий':'Q-041: price_state UNKNOWN; existing 14,000 Finance receipt linked separately','Последнее изменение':now,'created_by_user_id':auth.user.userId,'created_by_name':auth.user.name,'updated_by_user_id':auth.user.userId,'updated_by_name':auth.user.name,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':orderEvent,'record_version':1,'client_party_id':'','price_state':'UNKNOWN'};
  appendByHeaders_('Заказы',obj);auditMutation_('order',systemId,'create',auth,orderEvent,{},obj,'Q-041 Dima canonical order');return obj;
}
function q041EnsureDimaLink_(eventId,order,auth){return q041UpdateFinance_(Q041_CUTOVER.dimaFinanceId,String(eventId)+'-DIMA-LINK',auth,{'№ заказа':String(order['№ заказа']||''),cash_destination:'PRODUCTION_WALLET'},'Q-041 link existing Dima 14,000 receipt to canonical order exactly once');}
function q041FinalizeRecon_(eventId,auth){var recon=q041FindRecon_(eventId);if(!recon)throw new Error('RECON_NOT_FOUND');if(String(recon.obj.status||'')==='APPLIED')return recon.obj;var before=recon.obj,now=nowIso_();setByHeader_(recon.table,recon.row,'status','APPLIED');setByHeader_(recon.table,recon.row,'applied_at',now);setByHeader_(recon.table,recon.row,'applied_by_user_id',auth.user.userId);setByHeader_(recon.table,recon.row,'record_version',Math.floor(Number(before.record_version||1))+1);w1TouchDomainRow_('reconciliations',recon.table,recon.row,String(eventId)+'-APPLIED');var after=q041FindRecon_(eventId).obj;w1Audit_('reconciliations',after.reconciliation_id,'apply',auth,String(eventId)+'-APPLIED',before,after,'','');return after;}


function q041CommittedState_(eventId){
  var ids=q041StableIds_(eventId),recon=q041FindRecon_(eventId),sergey=q041FindPartyById_(ids.sergeyPartyId),evgeny=q041FindPartyById_(ids.evgenyPartyId),pt=tableByHeader_(CFG.SPREADSHEET_ID,'Расчёты с партнёрами',1),ot=tableByHeader_(CFG.SPREADSHEET_ID,'Обязательства',1),ps=findRowBy_(pt.sheet,1,ids.sergeySettlementId,2),pe=findRowBy_(pt.sheet,1,ids.evgenySettlementId,2),ob=findRowBy_(ot.sheet,1,ids.obligationId,2),ord=q041FindOrderByEvent_(String(eventId)+'-DIMA-ORDER'),finance={};
  Q041_CUTOVER.ownerRows.forEach(function(x,i){var h=q041FindFinanceObject_(x.id);finance[x.id]=!!(h&&String(h.obj.last_event_id||'')===String(eventId)+'-OWNER-'+String(i+1));});
  var test=q041FindFinanceObject_(Q041_CUTOVER.testPlanId),gun=q041FindFinanceObject_(Q041_CUTOVER.gunFinanceId),dima=q041FindFinanceObject_(Q041_CUTOVER.dimaFinanceId);
  return {reconciliation:recon?String(recon.obj.status||'DRAFT'):'NONE',sergey_party:!!sergey,evgeny_party:!!evgeny,sergey_opening:!!ps,evgeny_opening:!!pe,owner_annotations:finance,test2_cancelled:!!(test&&String(test.obj.plan_state||'')==='CANCELLED'),gun_obligation:!!ob,gun_linked:!!(gun&&String(gun.obj.obligation_id||'')===ids.obligationId),dima_order:ord?String(ord['ID заказа']||''):'',dima_linked:!!(dima&&ord&&String(dima.obj['№ заказа']||'')===String(ord['№ заказа']||''))};
}
function handleReconciliationApplyQ041_(body,requestId){
  return {ok:false,error:'Q041_SOURCE_SUPERSEDED',apply_allowed:false,replacement_handler:'handleReconciliationApplyQ042_',request_id:requestId,serverTime:nowIso_()};
}
/* ===== backend v0.2.27 / Q-042 source corrections (authoritative public cutover path) =====
 * Q-041 R2 helper source above is retained for audit history only.
 * doPost routes reconciliation.preview/apply to Q-042 handlers below.
 */
function q042FieldIssue_(issues,id,o,field,expected){
  var actual=String(o&&o[field]!=null?o[field]:'');
  var exp=String(expected==null?'':expected);
  if(actual!==exp)issues.push({reason:'FINANCE_SEMANTIC_MISMATCH',id:id,field:field,expected:exp,actual:actual});
}
function q042FinancePrestateIssues_(){
  var issues=[];
  Q041_CUTOVER.ownerRows.forEach(function(x){
    var z=q041CheckFinanceSource_(x.id,x.amount,'Да');
    if(!z.ok){issues.push(z);return;}
    var o=z.obj;
    q042FieldIssue_(issues,x.id,o,'Источник денег / оплаты','');
    q042FieldIssue_(issues,x.id,o,'cash_destination','');
    q042FieldIssue_(issues,x.id,o,'partner_party_id','');
    q042FieldIssue_(issues,x.id,o,'partner_effect','');
    q042FieldIssue_(issues,x.id,o,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,x.id,o,'obligation_id','');
    q042FieldIssue_(issues,x.id,o,'№ заказа','');
  });
  var test=q041CheckFinanceSource_(Q041_CUTOVER.testPlanId,1,'Нет',{testPlan:true});
  if(!test.ok)issues.push(test);else{
    var to=test.obj,td=String(to['Описание']||'');
    if(td.indexOf('1100')<0||td.toLowerCase().indexOf('тест2')<0)issues.push({reason:'TEST2_DESCRIPTION_CHANGED',id:Q041_CUTOVER.testPlanId,expected:'contains 1100 and Test2',actual:td});
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'plan_state','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'Источник денег / оплаты','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'cash_destination','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'partner_party_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'partner_effect','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'obligation_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,to,'№ заказа','');
  }
  var gun=q041CheckFinanceSource_(Q041_CUTOVER.gunFinanceId,2708,'Да');
  if(!gun.ok)issues.push(gun);else{
    var go=gun.obj;
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'Источник денег / оплаты','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'cash_destination','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'partner_party_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'partner_effect','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'obligation_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,go,'№ заказа','');
  }
  var dima=q041CheckFinanceSource_(Q041_CUTOVER.dimaFinanceId,14000,'Да');
  if(!dima.ok)issues.push(dima);else{
    var di=dima.obj;
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'№ заказа','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'Источник денег / оплаты','Деньги производства');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'cash_destination','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'partner_party_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'partner_effect','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,di,'obligation_id','');
  }
  return issues;
}
function q042DimaFolderName_(orderNo){
  return String(orderNo)+'_'+safeFolderPart_('Покраска — Дима');
}
function q042InspectDimaFolder_(orderNo,eventId){
  var root=DriveApp.getFolderById(CFG.ORDERS_ROOT_FOLDER_ID),name=q042DimaFolderName_(orderNo),it=root.getFoldersByName(name),matches=[];
  while(it.hasNext()){
    var f=it.next(),desc='';
    try{desc=String(f.getDescription()||'');}catch(_){}
    matches.push({id:f.getId(),url:f.getUrl(),name:f.getName(),description:desc,bound_to_event:!!(eventId&&desc.indexOf('Q042 cutover event '+String(eventId))>=0)});
  }
  return {name:name,count:matches.length,matches:matches};
}
function q042EnsureDimaFolder_(orderNo,eventId){
  var state=q042InspectDimaFolder_(orderNo,eventId);
  if(state.count>1)throw new Error('DIMA_FOLDER_DUPLICATE:'+state.matches.map(function(x){return x.id;}).join(','));
  var folder;
  if(state.count===1){
    var one=state.matches[0];
    if(!one.bound_to_event)throw new Error('DIMA_FOLDER_IDENTITY_CONFLICT:'+one.id);
    folder=DriveApp.getFolderById(one.id);
  }else{
    var root=DriveApp.getFolderById(CFG.ORDERS_ROOT_FOLDER_ID);
    folder=root.createFolder(state.name);
    try{folder.setDescription('Q042 cutover event '+String(eventId));}catch(_){}
  }
  ['01_Расчёты','02_Документы','03_Чертежи','04_Фото','05_Аудио','06_Прочее'].forEach(function(n){childFolder_(folder,n);});
  return {id:folder.getId(),url:folder.getUrl(),name:folder.getName()};
}
function q042StrictBaselineGuard_(body,eventId,requireExplicit){
  var expected=q041ExpectedBaseline_(body,requireExplicit),issues=[];
  if(!expected)return {ok:false,error:'BASELINE_REQUIRED',issues:[{reason:'BASELINE_REQUIRED'}]};
  var fs=q041FinanceState_();
  if(fs.dataRows!==expected.financeDataRows)issues.push({reason:'FINANCE_ROW_COUNT_MISMATCH',expected:expected.financeDataRows,actual:fs.dataRows});
  if(fs.lastRow!==expected.financeLastRow)issues.push({reason:'FINANCE_LAST_ROW_MISMATCH',expected:expected.financeLastRow,actual:fs.lastRow});
  if(fs.lastId!==expected.financeLastId)issues.push({reason:'FINANCE_LAST_ID_MISMATCH',expected:expected.financeLastId,actual:fs.lastId});
  issues=issues.concat(q042FinancePrestateIssues_());
  var ps=q041PartnerState_();
  if(ps.sergey.length>1)issues.push({reason:'SERGEY_PARTNER_DUPLICATES',count:ps.sergey.length});
  if(ps.evgeny.length>1)issues.push({reason:'EVGENY_PARTNER_DUPLICATES',count:ps.evgeny.length});
  var br=q041BusinessRows_(eventId);
  if(br.unrelatedPset.length)issues.push({reason:'UNEXPECTED_PARTNER_SETTLEMENT_ROWS',count:br.unrelatedPset.length});
  if(br.unrelatedRecon.length)issues.push({reason:'UNEXPECTED_RECONCILIATION_ROWS',count:br.unrelatedRecon.length});
  if(br.unrelatedObl.length)issues.push({reason:'UNEXPECTED_OBLIGATION_ROWS',count:br.unrelatedObl.length});
  var os=q041OrdersState_();
  var ownDima=os.dima.filter(function(o){return eventId&&String(o.last_event_id||'')===String(eventId)+'-DIMA-ORDER';});
  var otherDima=os.dima.filter(function(o){return ownDima.indexOf(o)<0;});
  if(otherDima.length)issues.push({reason:'DIMA_ORDER_COLLISION',count:otherDima.length});
  if(!ownDima.length&&os.count!==expected.orderCount)issues.push({reason:'ORDER_COUNT_MISMATCH',expected:expected.orderCount,actual:os.count});
  if(!ownDima.length&&os.nextOrderNumber!==expected.nextOrderNumber)issues.push({reason:'NEXT_ORDER_NUMBER_MISMATCH',expected:expected.nextOrderNumber,actual:os.nextOrderNumber});
  var folder=q042InspectDimaFolder_(expected.nextOrderNumber,eventId);
  if(folder.count>0)issues.push({reason:'DIMA_FOLDER_PREEXISTS_BEFORE_FIRST_MUTATION',folder_ids:folder.matches.map(function(x){return x.id;})});
  return {ok:issues.length===0,error:issues.length?'PRECONDITION_MISMATCH':'',issues:issues,expected:expected,current:{financeDataRows:fs.dataRows,financeLastRow:fs.lastRow,financeLastId:fs.lastId,orderCount:os.count,nextOrderNumber:os.nextOrderNumber,dimaMatches:os.dima.length,sergeyPartners:ps.sergey.length,evgenyPartners:ps.evgeny.length,partnerSettlementRows:br.pset.length,reconciliationRows:br.recon.length,obligationRows:br.obl.length,dimaFolderCount:folder.count,dimaFolderIds:folder.matches.map(function(x){return x.id;})}};
}
function q042PreviewResult_(body,requestId,auth){
  var guard=q042StrictBaselineGuard_(body,'',false);touchSessionAndDevice_(auth);
  return {ok:true,request_id:requestId,profile:Q041_CUTOVER.profile,mode:'PREVIEW_ONLY',precondition_ok:guard.ok,precondition_error:guard.error,apply_allowed:!!guard.ok,issues:guard.issues,current:guard.current,targets:Q041_CUTOVER.targets,plan:q041Plan_(),q030_apply_disabled:true,business_writes:0,serverTime:nowIso_()};
}
function handleReconciliationPreviewQ042_(body,requestId){
  var profile=String(body.profile||'').toUpperCase();
  if(profile==='Q030'){
    var a=authSession_(body.session_token,'partner_settlement.view',requestId);touchSessionAndDevice_(a);
    return {ok:false,error:'Q030_SUPERSEDED',apply_allowed:false,replacement_profile:Q041_CUTOVER.profile,request_id:requestId,serverTime:nowIso_()};
  }
  if(profile===Q041_CUTOVER.profile){
    var auth=authSession_(body.session_token,'partner_settlement.view',requestId);
    if(String(auth.user.role||'')!=='ADMIN1')throw new Error('ADMIN1_REQUIRED');
    return q042PreviewResult_(body,requestId,auth);
  }
  return handleReconciliationPreview_(body,requestId);
}
function q042CheckFinalOwner_(issues,id,o,sergeyPartyId,marker){
  if(String(o.last_event_id||'')!==marker)return false;
  q042FieldIssue_(issues,id,o,'Источник денег / оплаты','PERSON');
  q042FieldIssue_(issues,id,o,'cash_destination','NONE');
  q042FieldIssue_(issues,id,o,'partner_party_id',sergeyPartyId);
  q042FieldIssue_(issues,id,o,'partner_effect','FUNDING_INCREASE');
  q042FieldIssue_(issues,id,o,'partner_settlement_entry_id','');
  q042FieldIssue_(issues,id,o,'obligation_id','');
  q042FieldIssue_(issues,id,o,'№ заказа','');
  return true;
}
function q042ResumeGuard_(body,eventId){
  var expected=q041ExpectedBaseline_(body,true),issues=[];
  if(!expected)return {ok:false,error:'BASELINE_REQUIRED',issues:[{reason:'BASELINE_REQUIRED'}]};
  var fs=q041FinanceState_();
  if(fs.dataRows!==expected.financeDataRows)issues.push({reason:'FINANCE_ROW_COUNT_MISMATCH',expected:expected.financeDataRows,actual:fs.dataRows});
  if(fs.lastRow!==expected.financeLastRow)issues.push({reason:'FINANCE_LAST_ROW_MISMATCH',expected:expected.financeLastRow,actual:fs.lastRow});
  if(fs.lastId!==expected.financeLastId)issues.push({reason:'FINANCE_LAST_ID_MISMATCH',expected:expected.financeLastId,actual:fs.lastId});


  var pre=q042FinancePrestateIssues_(),committedIds={},ids=q041StableIds_(eventId);
  Q041_CUTOVER.ownerRows.forEach(function(x,i){
    var hit=q041FindFinanceObject_(x.id);
    if(!hit)return;
    var marker=String(eventId)+'-OWNER-'+String(i+1);
    if(q042CheckFinalOwner_(issues,x.id,hit.obj,ids.sergeyPartyId,marker))committedIds[x.id]=true;
  });
  var test=q041FindFinanceObject_(Q041_CUTOVER.testPlanId);
  if(test&&String(test.obj.last_event_id||'')===String(eventId)+'-TEST2-CANCEL'){
    committedIds[Q041_CUTOVER.testPlanId]=true;
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,test.obj,'plan_state','CANCELLED');
    if(q041IsDeleted_(test.obj.is_deleted))issues.push({reason:'TEST2_HARD_DELETE_FORBIDDEN',id:Q041_CUTOVER.testPlanId,actual:String(test.obj.is_deleted||'')});
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,test.obj,'partner_party_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,test.obj,'partner_effect','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,test.obj,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.testPlanId,test.obj,'obligation_id','');
  }
  var gun=q041FindFinanceObject_(Q041_CUTOVER.gunFinanceId);
  if(gun&&String(gun.obj.last_event_id||'')===String(eventId)+'-GUN-LINK'){
    committedIds[Q041_CUTOVER.gunFinanceId]=true;
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'Источник денег / оплаты','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'cash_destination','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'partner_party_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'partner_effect','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'obligation_id',ids.obligationId);
    q042FieldIssue_(issues,Q041_CUTOVER.gunFinanceId,gun.obj,'№ заказа','');
  }
  var ownOrder=q041FindOrderByEvent_(String(eventId)+'-DIMA-ORDER');
  var dima=q041FindFinanceObject_(Q041_CUTOVER.dimaFinanceId);
  if(dima&&String(dima.obj.last_event_id||'')===String(eventId)+'-DIMA-LINK'){
    committedIds[Q041_CUTOVER.dimaFinanceId]=true;
    var orderNo=ownOrder?String(ownOrder['№ заказа']||''):'';
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'№ заказа',orderNo);
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'Источник денег / оплаты','Деньги производства');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'cash_destination','PRODUCTION_WALLET');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'partner_party_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'partner_effect','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'partner_settlement_entry_id','');
    q042FieldIssue_(issues,Q041_CUTOVER.dimaFinanceId,dima.obj,'obligation_id','');
  }
  pre.forEach(function(x){if(!committedIds[x.id])issues.push(x);});


  var ps=q041PartnerState_();
  if(ps.sergey.length>1)issues.push({reason:'SERGEY_PARTNER_DUPLICATES',count:ps.sergey.length});
  if(ps.evgeny.length>1)issues.push({reason:'EVGENY_PARTNER_DUPLICATES',count:ps.evgeny.length});
  var br=q041BusinessRows_(eventId);
  if(br.unrelatedPset.length)issues.push({reason:'UNEXPECTED_PARTNER_SETTLEMENT_ROWS',count:br.unrelatedPset.length});
  if(br.unrelatedRecon.length)issues.push({reason:'UNEXPECTED_RECONCILIATION_ROWS',count:br.unrelatedRecon.length});
  if(br.unrelatedObl.length)issues.push({reason:'UNEXPECTED_OBLIGATION_ROWS',count:br.unrelatedObl.length});


  var os=q041OrdersState_(),ownDima=os.dima.filter(function(o){return String(o.last_event_id||'')===String(eventId)+'-DIMA-ORDER';});
  var otherDima=os.dima.filter(function(o){return ownDima.indexOf(o)<0;});
  if(otherDima.length)issues.push({reason:'DIMA_ORDER_COLLISION',count:otherDima.length});
  if(ownDima.length>1)issues.push({reason:'DIMA_SAME_EVENT_ORDER_DUPLICATE',count:ownDima.length});
  if(!ownDima.length&&os.count!==expected.orderCount)issues.push({reason:'ORDER_COUNT_MISMATCH',expected:expected.orderCount,actual:os.count});
  if(!ownDima.length&&os.nextOrderNumber!==expected.nextOrderNumber)issues.push({reason:'NEXT_ORDER_NUMBER_MISMATCH',expected:expected.nextOrderNumber,actual:os.nextOrderNumber});
  if(ownDima.length&&os.count!==expected.orderCount+1)issues.push({reason:'ORDER_COUNT_AFTER_DIMA_MISMATCH',expected:expected.orderCount+1,actual:os.count});


  var folder=q042InspectDimaFolder_(expected.nextOrderNumber,eventId);
  if(folder.count>1)issues.push({reason:'DIMA_FOLDER_DUPLICATE',folder_ids:folder.matches.map(function(x){return x.id;})});
  if(folder.count===1&&!folder.matches[0].bound_to_event)issues.push({reason:'DIMA_FOLDER_IDENTITY_CONFLICT',folder_id:folder.matches[0].id,description:folder.matches[0].description});
  if(ownDima.length===1){
    var orderFolderId=driveIdFromUrl_(String(ownDima[0]['Папка Google Drive']||''));
    if(folder.count!==1||String(orderFolderId||'')!==String(folder.matches[0]&&folder.matches[0].id||''))issues.push({reason:'DIMA_ORDER_FOLDER_LINK_MISMATCH',order_folder_id:String(orderFolderId||''),folder_ids:folder.matches.map(function(x){return x.id;})});
  }


  var recon=q041FindRecon_(eventId);
  if(!recon)issues.push({reason:'PARTIAL_RECONCILIATION_MISSING'});
  else{
    if(Math.abs(Number(recon.obj.production_cash_target||0)-Q041_CUTOVER.targets.productionCash)>0.009)issues.push({reason:'RECON_TARGET_CHANGED',expected:Q041_CUTOVER.targets.productionCash,actual:recon.obj.production_cash_target});
    if(['DRAFT','APPLIED'].indexOf(String(recon.obj.status||''))<0)issues.push({reason:'RECON_STATUS_INVALID',actual:String(recon.obj.status||'')});
  }


  return {ok:issues.length===0,error:issues.length?'PARTIAL_PRECONDITION_MISMATCH':'',issues:issues,expected:expected,current:{financeDataRows:fs.dataRows,financeLastRow:fs.lastRow,financeLastId:fs.lastId,orderCount:os.count,nextOrderNumber:os.nextOrderNumber,dimaMatches:os.dima.length,sergeyPartners:ps.sergey.length,evgenyPartners:ps.evgeny.length,partnerSettlementRows:br.pset.length,reconciliationRows:br.recon.length,obligationRows:br.obl.length,dimaFolderCount:folder.count,dimaFolderIds:folder.matches.map(function(x){return x.id;})}};
}
function q042EnsureGunObligation_(eventId,auth){
  return q041EnsureGunObligation_(eventId,null,auth);
}
function q042EnsureDimaOrder_(eventId,auth,expectedNext){
  var orderEvent=String(eventId)+'-DIMA-ORDER',existing=q041FindOrderByEvent_(orderEvent);
  if(existing){
    var existingNo=String(existing['№ заказа']||''),folderState=q042InspectDimaFolder_(existingNo,eventId),linkedId=driveIdFromUrl_(String(existing['Папка Google Drive']||''));
    if(folderState.count!==1||!folderState.matches[0].bound_to_event||String(folderState.matches[0].id)!==String(linkedId||''))throw new Error('DIMA_EXISTING_ORDER_FOLDER_MISMATCH');
    return existing;
  }
  var os=q041OrdersState_();
  if(os.dima.length)throw new Error('DIMA_ORDER_COLLISION');
  if(expectedNext&&os.nextOrderNumber!==String(expectedNext))throw new Error('NEXT_ORDER_NUMBER_MISMATCH');
  var no=os.nextOrderNumber,systemId='ORD-'+no,title='Покраска — Дима',folder=q042EnsureDimaFolder_(no,eventId),now=new Date();
  var obj={'ID заказа':systemId,'№ заказа':no,'Статус':'В работе','Дата создания':now,'Дата принятия':now,'Срок сдачи':'','Имя клиента':'Дима','Фамилия клиента':'','Организация':'','Телефон':'','Название заказа':title,'Краткое описание':'Q-042 canonical order for existing Dima prepayment; price pending','Цена клиенту':'','Получено':Q041_CUTOVER.targets.dimaReceived,'Долг':'','Себестоимость расчётная':'','Фактические прямые затраты':'','Фактические трудозатраты':'','Прогноз прибыли':'','Фактическая маржа':'','Предоплаты достаточно':'','Ближайший этап':'','Дата ближайшего этапа':'','Через самозанятого':'','Ставка самозанятого %':'','Папка Google Drive':folder.url,'Комментарий':'Q-042: price_state UNKNOWN; existing 14,000 Finance receipt linked separately; deterministic folder '+folder.id,'Последнее изменение':now,'created_by_user_id':auth.user.userId,'created_by_name':auth.user.name,'updated_by_user_id':auth.user.userId,'updated_by_name':auth.user.name,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':orderEvent,'record_version':1,'client_party_id':'','price_state':'UNKNOWN'};
  appendByHeaders_('Заказы',obj);
  auditMutation_('order',systemId,'create',auth,orderEvent,{},obj,'Q-042 Dima canonical order; deterministic folder='+folder.id);
  return obj;
}
function q042CommittedState_(eventId,body){
  var base=q041CommittedState_(eventId),expected=q041ExpectedBaseline_(body,false)||Q041_CUTOVER.defaultBaseline;
  var order=q041FindOrderByEvent_(String(eventId)+'-DIMA-ORDER'),orderNo=order?String(order['№ заказа']||''):String(expected.nextOrderNumber||Q041_CUTOVER.defaultBaseline.nextOrderNumber);
  var state=q042InspectDimaFolder_(orderNo,eventId);
  base.dima_folder_count=state.count;
  base.dima_folder_ids=state.matches.map(function(x){return x.id;});
  base.dima_folder_id=state.count===1?state.matches[0].id:'';
  base.dima_folder_url=state.count===1?state.matches[0].url:'';
  base.dima_folder_bound_to_event=state.count===1?state.matches[0].bound_to_event:false;
  return base;
}
function handleReconciliationApplyQ042_(body,requestId){
  var auth=authSession_(body.session_token,null,requestId);
  if(String(auth.user.role||'')!=='ADMIN1')throw new Error('ADMIN1_REQUIRED');
  var profile=String(body.profile||'').toUpperCase();
  if(profile==='Q030')return {ok:false,error:'Q030_APPLY_SUPERSEDED',apply_allowed:false,replacement_profile:Q041_CUTOVER.profile,request_id:requestId,serverTime:nowIso_()};
  if(profile!==Q041_CUTOVER.profile||String(body.confirm_code||'')!==Q041_CUTOVER.confirmCode||body.apply_authorized!==true)return {ok:false,error:'Q029_CUTOVER_CONFIRM_REQUIRED',apply_allowed:false,request_id:requestId,serverTime:nowIso_()};


  var eventId=w1EventId_(body),lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    var existing=q041FindRecon_(eventId);
    if(existing&&String(existing.obj.status||'')==='APPLIED'){
      touchSessionAndDevice_(auth);
      return {ok:true,duplicate:true,request_id:requestId,event_id:eventId,reconciliation_id:existing.obj.reconciliation_id,status:'APPLIED',targets:Q041_CUTOVER.targets,serverTime:nowIso_()};
    }


    // Q-042 race fix: the authoritative guard is evaluated while holding the mutation lock.
    // No business write occurs before this branch returns clean.
    var guard=existing?q042ResumeGuard_(body,eventId):q042StrictBaselineGuard_(body,eventId,true);
    if(!guard.ok){
      touchSessionAndDevice_(auth);
      return {ok:false,error:existing?'PARTIAL_PRECONDITION_MISMATCH':'PRECONDITION_MISMATCH',request_id:requestId,event_id:eventId,issues:guard.issues,current:guard.current,business_writes:0,committed_state:existing?q042CommittedState_(eventId,body):null,resume_with_same_event_id:!!existing,serverTime:nowIso_()};
    }


    var recon=q041EnsureReconDraft_(eventId,auth);
    var sergey=q041EnsureParty_('sergey',eventId,auth,body);
    var evgeny=q041EnsureParty_('evgeny',eventId,auth,body);
    q041EnsureSettlementOpening_(eventId,'sergey',sergey,recon,auth);
    q041EnsureSettlementOpening_(eventId,'evgeny',evgeny,recon,auth);
    q041EnsureOwnerAnnotations_(eventId,sergey,auth);
    q041EnsureTest2Cancelled_(eventId,auth);
    var obligation=q042EnsureGunObligation_(eventId,auth);
    var expected=q041ExpectedBaseline_(body,true);
    var order=q042EnsureDimaOrder_(eventId,auth,expected.nextOrderNumber);
    q041EnsureDimaLink_(eventId,order,auth);
    var finalRecon=q041FinalizeRecon_(eventId,auth);
    touchSessionAndDevice_(auth);
    return {ok:true,request_id:requestId,event_id:eventId,reconciliation_id:finalRecon.reconciliation_id,status:'APPLIED',sergey_party_id:sergey.party_id,evgeny_party_id:evgeny.party_id,obligation_id:obligation.obligation_id,dima_order_id:order['ID заказа'],dima_order_no:order['№ заказа'],dima_folder_id:driveIdFromUrl_(String(order['Папка Google Drive']||'')),dima_folder_url:String(order['Папка Google Drive']||''),targets:Q041_CUTOVER.targets,plan:q041Plan_(),serverTime:nowIso_()};
  }catch(err){
    touchSessionAndDevice_(auth);
    return {ok:false,error:'PARTIAL',detail:safeErr_(err),request_id:requestId,event_id:eventId,reconciliation_id:(q041FindRecon_(eventId)||{obj:{}}).obj.reconciliation_id||'',committed_state:q042CommittedState_(eventId,body),resume_with_same_event_id:true,serverTime:nowIso_()};
  }finally{
    lock.releaseLock();
  }




}
/* ===== backend v0.2.28-staging-q046 / canonical Wallet staging ===== */
const Q046_WALLET = Object.freeze({
  schemaVersion:'1.0',
  allocationSheet:'Резервы и распределения',
  allocationDomain:'wallet_allocations',
  financeFields:['cash_epoch_id','executed_finance_id'],
  allocationStates:['PLANNED','RESERVED','EXECUTED','CANCELLED'],
  purposeTypes:['OWNER_REIMBURSEMENT','PARTNER_DISTRIBUTION','OBLIGATION_PAYMENT','SUPPLIER_DEBT_PAYMENT','RENT','MATERIALS','WORKER_PAYMENT','ORDER_RESERVE','OTHER'],
  allocationHeaders:['allocation_id','created_at','effective_date','source_finance_id','source_order_id','planned_finance_id','purpose_type','purpose_label','amount','currency','state','due_date','partner_party_id','counterparty_party_id','obligation_id','target_order_id','principal_amount','executed_finance_id','comment','created_by_user_id','updated_at','updated_by_user_id','is_deleted','last_event_id','record_version','_SYNC_REV','_UPDATED_AT','_ROW_HASH']
});
function q046SchemaSpec_(){return {version:Q046_WALLET.schemaVersion,finance_additive_fields:Q046_WALLET.financeFields.slice(),wallet_allocations:{sheet:Q046_WALLET.allocationSheet,domain_key:Q046_WALLET.allocationDomain,columns:Q046_WALLET.allocationHeaders.slice(),states:Q046_WALLET.allocationStates.slice(),purpose_types:Q046_WALLET.purposeTypes.slice()},migration_rule:'ADDITIVE_ONLY_NO_PRODUCTION_RUN_IN_Q046'};}
function q046EnsureSchemaMigration_(){
  ensureColumns_('Финансы',Q046_WALLET.financeFields);
  ensureDataSheet_(Q046_WALLET.allocationSheet,Q046_WALLET.allocationHeaders);
  const heads=sheet_('_DOMAIN_HEADS'),hit=findRowBy_(heads,1,Q046_WALLET.allocationDomain,2);
  if(!hit)heads.appendRow([Q046_WALLET.allocationDomain,Q046_WALLET.schemaVersion,0,nowIso_(),0,'','']);
  return q046SchemaSpec_();
}
function q046SafeTable_(sheetName){const sh=ss_().getSheetByName(sheetName);return sh?tableByHeader_(CFG.SPREADSHEET_ID,sheetName,1):null;}
function q046IsDeleted_(v){return v===true||['TRUE','ДА','YES','1'].indexOf(String(v==null?'':v).trim().toUpperCase())>=0;}
function q046Money_(v){const n=numberOrNull_(v);return n==null?0:Number(n);}
function q046DateMs_(v){const m=dateMs_(v);return m||0;}
function q046LatestAppliedRecon_(){
  const t=q046SafeTable_('Финансовые сверки');if(!t)return null;let best=null;
  t.rows.forEach(function(r,i){if(String(valueBy_(t,r,'status')||'').toUpperCase()!=='APPLIED')return;const o=tableRowObject_(t,r),ms=q046DateMs_(o.applied_at||o.effective_at);if(!best||ms>best.ms||(ms===best.ms&&i>best.i))best={obj:o,ms:ms,i:i};});
  return best?best.obj:null;
}
function q046ActiveEpochId_(){const r=q046LatestAppliedRecon_();return r?String(r.reconciliation_id||''):'';}
function q046FinanceCashDelta_(t,r,epochId){
  if(!epochId||String(valueBy_(t,r,'cash_epoch_id')||'')!==epochId)return 0;
  if(q046IsDeleted_(valueBy_(t,r,'is_deleted'))||!yes_(valueBy_(t,r,'Фактическая операция')))return 0;
  const type=String(valueBy_(t,r,'Тип')||''),amount=q046Money_(valueBy_(t,r,'Сумма'));
  const dest=String(valueBy_(t,r,'cash_destination')||'').toUpperCase(),src=String(valueBy_(t,r,'Источник денег / оплаты')||'').toUpperCase();
  if(/^ПРИХОД$/i.test(type)&&dest==='PRODUCTION_WALLET')return amount;
  if(/^РАСХОД$/i.test(type)&&src==='PRODUCTION_WALLET')return -amount;
  return 0;
}
function q046AllocationRows_(){
  const t=q046SafeTable_(Q046_WALLET.allocationSheet);if(!t)return [];
  return t.rows.filter(function(r){return String(valueBy_(t,r,'allocation_id')||'').trim()&&!q046IsDeleted_(valueBy_(t,r,'is_deleted'));}).map(function(r){return tableRowObject_(t,r);});
}
function q046ReservedTotal_(){return q046AllocationRows_().filter(function(o){return String(o.state||'').toUpperCase()==='RESERVED';}).reduce(function(s,o){return s+q046Money_(o.amount);},0);}
function q046PartnerCards_(){
  const pt=q046SafeTable_('Контрагенты'),st=q046SafeTable_('Расчёты с партнёрами');if(!st)return [];
  const parties={};if(pt)pt.rows.forEach(function(r){const id=String(valueBy_(pt,r,'party_id')||'');if(id)parties[id]=tableRowObject_(pt,r);});
  const by={},now=new Date(),ym=Utilities.formatDate(now,spreadsheetTz_(),'yyyy-MM');
  st.rows.forEach(function(r){if(String(valueBy_(st,r,'status')||'').toUpperCase()!=='POSTED')return;const pid=String(valueBy_(st,r,'partner_party_id')||'');if(!pid)return;const o=tableRowObject_(st,r);if(!by[pid])by[pid]={party_id:pid,display_name:parties[pid]?String(parties[pid].display_name||''):pid,funding_due:0,distribution_balance:0,current_month_rows:[],history_rows:[]};by[pid].funding_due+=q046Money_(o.funding_delta);by[pid].distribution_balance+=q046Money_(o.distribution_delta);const row={settlement_entry_id:o.settlement_entry_id,effective_date:o.effective_date,entry_type:o.entry_type,funding_delta:q046Money_(o.funding_delta),distribution_delta:q046Money_(o.distribution_delta),amount:q046Money_(o.amount),order_id:o.order_id||'',finance_id:o.finance_id||'',comment:o.comment||''};by[pid].history_rows.push(row);if(String(o.effective_date||'').slice(0,7)===ym)by[pid].current_month_rows.push(row);});
  return Object.keys(by).map(function(k){const x=by[k];x.funding_due=Math.round(x.funding_due*100)/100;x.distribution_balance=Math.round(x.distribution_balance*100)/100;return x;});
}
function q046Obligations_(){
  const ot=q046SafeTable_('Обязательства'),ft=q046SafeTable_('Финансы');if(!ot)return [];
  return ot.rows.filter(function(r){return String(valueBy_(ot,r,'obligation_id')||'').trim()&&!q046IsDeleted_(valueBy_(ot,r,'is_deleted'))&&String(valueBy_(ot,r,'status')||'').toUpperCase()!=='CANCELLED';}).map(function(r){
    const o=tableRowObject_(ot,r),id=String(o.obligation_id||''),original=q046Money_(o.original_amount);let paid=0;
    if(ft)ft.rows.forEach(function(fr){
      if(String(valueBy_(ft,fr,'obligation_id')||'')!==id||q046IsDeleted_(valueBy_(ft,fr,'is_deleted'))||!yes_(valueBy_(ft,fr,'Фактическая операция')))return;
      if(!/^Расход$/i.test(String(valueBy_(ft,fr,'Тип')||'')))return;
      const src=String(valueBy_(ft,fr,'Источник денег / оплаты')||'').toUpperCase();
      if(src==='SUPPLIER_DEBT'||src==='CREDIT')return;
      paid+=q046Money_(valueBy_(ft,fr,'Сумма'));
    });
    const paidRounded=Math.round(paid*100)/100,remaining=Math.round((original-paidRounded)*100)/100,regular=q046Money_(o.regular_payment_amount);
    return {obligation_id:id,title:o.title||'',obligation_type:o.obligation_type||'',original_amount:original,paid_principal:paidRounded,remaining:remaining,overpayment_amount:remaining<0?Math.abs(remaining):0,currency:o.currency||'RUB',payment_frequency:o.payment_frequency||'NONE',regular_payment_amount:regular,next_payment_amount:remaining>0?(regular>0?Math.min(regular,remaining):remaining):0,next_due_date:o.next_due_date||'',status:o.status||'',source_finance_id:o.source_finance_id||''};
  });
}
function q046PlannedFinance_(horizonDate){
  const ft=q046SafeTable_('Финансы');if(!ft)return [];const end=horizonDate?q046DateMs_(horizonDate):0,out=[];
  ft.rows.forEach(function(r){if(!String(valueBy_(ft,r,'ID операции')||'').trim()||q046IsDeleted_(valueBy_(ft,r,'is_deleted'))||yes_(valueBy_(ft,r,'Фактическая операция')))return;const state=String(valueBy_(ft,r,'plan_state')||'').toUpperCase();if(['PLANNED','RESERVED'].indexOf(state)<0)return;const amount=q046Money_(valueBy_(ft,r,'Сумма'));if(!(amount>0))return;const due=valueBy_(ft,r,'due_date'),dueMs=q046DateMs_(due);if(end&&dueMs&&dueMs>end)return;out.push({finance_id:String(valueBy_(ft,r,'ID операции')||''),type:String(valueBy_(ft,r,'Тип')||''),amount:amount,due_date:formatDateMaybe_(due),state:state,order_id:String(valueBy_(ft,r,'№ заказа')||''),category:String(valueBy_(ft,r,'Категория')||''),comment:String(valueBy_(ft,r,'Описание')||''),executed_finance_id:String(valueBy_(ft,r,'executed_finance_id')||'')});});return out;
}
function q046ForecastDate_(body){const h=String(body&&body.horizon||'month').toLowerCase(),now=new Date();if(h==='today')return new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59);if(h==='7d')return new Date(now.getTime()+7*86400000);if(h==='date'&&body.chosen_date)return new Date(String(body.chosen_date)+'T23:59:59');return new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59);}
function q046OrderSummary_(){
  const t=q046SafeTable_('Заказы');
  if(!t)return {known_receivable_total:0,known_orders:[],unknown_price_orders:[],known_future_completion_cash_need_total:0,unknown_future_completion_cost_orders:[],unknown_future_completion_cost_order_count:0};
  const known=[],unknown=[],unknownNeed=[];let total=0,knownNeedTotal=0;
  const plans=q046PlannedFinance_(null).filter(function(x){return /^Расход$/i.test(String(x.type||''))&&Number(x.amount||0)>0&&['PLANNED','RESERVED'].indexOf(String(x.state||'').toUpperCase())>=0;});
  const allocations=q046AllocationRows_().filter(function(a){return ['PLANNED','RESERVED'].indexOf(String(a.state||'').toUpperCase())>=0&&!q046IsDeleted_(a.is_deleted);});
  t.rows.forEach(function(r){
    if(q046IsDeleted_(valueBy_(t,r,'is_deleted')))return;
    const st=String(valueBy_(t,r,'Статус')||'').toLowerCase();if(/архив|заверш|отмен/.test(st))return;
    const id=String(valueBy_(t,r,'ID заказа')||''),no=String(valueBy_(t,r,'№ заказа')||'');if(!id&&!no)return;
    const priceState=String(valueBy_(t,r,'price_state')||'').toUpperCase(),price=numberOrNull_(valueBy_(t,r,'Цена клиенту')),received=q046Money_(valueBy_(t,r,'Получено'));
    const item={order_id:id,order_no:no,title:String(valueBy_(t,r,'Название заказа')||''),client:String(valueBy_(t,r,'Имя клиента')||''),received:received,price_state:priceState||((price==null)?'UNKNOWN':'KNOWN')};
    let need=0,needKnown=false;
    plans.forEach(function(p){const oid=String(p.order_id||'');if(oid&&(oid===no||oid===id)){need+=Number(p.amount||0);needKnown=true;}});
    allocations.forEach(function(a){
      if(String(a.planned_finance_id||''))return;
      const oid=String(a.target_order_id||a.source_order_id||'');
      if(oid&&(oid===no||oid===id)){need+=Number(a.amount||0);needKnown=true;}
    });
    if(needKnown){
      item.future_completion_cash_need=Math.round(need*100)/100;
      item.future_completion_cash_need_state='CALCULATED';
      item.future_completion_cash_need_display=String(item.future_completion_cash_need);
      knownNeedTotal+=item.future_completion_cash_need;
    }else{
      item.future_completion_cash_need=null;
      item.future_completion_cash_need_state='NOT_CALCULATED';
      item.future_completion_cash_need_display='не рассчитано';
      unknownNeed.push({order_id:id,order_no:no,title:item.title,state:'NOT_CALCULATED',display:'не рассчитано'});
    }
    if(price==null||priceState==='UNKNOWN'){item.price=null;item.receivable=null;unknown.push(item);}
    else{item.price=Number(price);item.receivable=Math.max(0,Number(price)-received);total+=item.receivable;known.push(item);}
  });
  return {known_receivable_total:Math.round(total*100)/100,known_orders:known,unknown_price_orders:unknown,known_future_completion_cash_need_total:Math.round(knownNeedTotal*100)/100,unknown_future_completion_cost_orders:unknownNeed,unknown_future_completion_cost_order_count:unknownNeed.length};
}
function q046BuildCanonicalWallet_(body){
  const recon=q046LatestAppliedRecon_();if(!recon)throw new Error('APPLIED_RECONCILIATION_REQUIRED');const epochId=String(recon.reconciliation_id||''),opening=q046Money_(recon.production_cash_target),ft=q046SafeTable_('Финансы');let delta=0;if(ft)ft.rows.forEach(function(r){delta+=q046FinanceCashDelta_(ft,r,epochId);});const physical=Math.round((opening+delta)*100)/100,reserved=Math.round(q046ReservedTotal_()*100)/100,free=Math.round((physical-reserved)*100)/100,forecastDate=q046ForecastDate_(body||{}),planned=q046PlannedFinance_(forecastDate),futureIn=planned.filter(function(x){return /^Приход$/i.test(x.type);}).reduce(function(s,x){return s+x.amount;},0),futureOut=planned.filter(function(x){return /^Расход$/i.test(x.type);}).reduce(function(s,x){return s+x.amount;},0),orders=q046OrderSummary_();let legacy={};try{const sh=sheet_('Кошелёк');legacy={wallet_b1:q046Money_(sh.getRange(1,2).getValue()),wallet_b2:q046Money_(sh.getRange(2,2).getValue())};}catch(_){}
  return {schema_version:Q046_WALLET.schemaVersion,source:'CANONICAL_RECONCILIATION_EPOCH',active_reconciliation_id:epochId,opening_cash:opening,post_cutover_cash_delta:Math.round(delta*100)/100,physical_cash:physical,reserved_total:reserved,free_now:free,partners:q046PartnerCards_(),obligations:q046Obligations_(),planned_items:planned,allocations:q046AllocationRows_(),forecast:{horizon_end:Utilities.formatDate(forecastDate,spreadsheetTz_(),'yyyy-MM-dd'),expected_real_inflows:Math.round(futureIn*100)/100,planned_future_real_payments:Math.round(futureOut*100)/100,forecast_cash:Math.round((physical+futureIn-futureOut)*100)/100},orders:orders,legacy_compatibility_only:legacy};
}
function handleWalletCanonicalGetQ046_(body,requestId){const auth=authSession_(body.session_token,'wallet.view',requestId),model=q046BuildCanonicalWallet_(body);touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,wallet:model,serverTime:nowIso_()};}
function handleWalletSchemaSpecQ046_(body,requestId){const auth=authSession_(body.session_token,'wallet.view',requestId);touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,spec:q046SchemaSpec_(),migration_executed:false,serverTime:nowIso_()};}










/* ===== Q-046 staging actions / idempotency / permissions ===== */
function q046RequireSchemaReady_(){
  const ft=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1);Q046_WALLET.financeFields.forEach(function(h){if(ft.index[h]==null)throw new Error('WALLET_SCHEMA_NOT_MIGRATED:'+h);});
  if(!ss_().getSheetByName(Q046_WALLET.allocationSheet))throw new Error('WALLET_SCHEMA_NOT_MIGRATED:wallet_allocations');
  const heads=sheet_('_DOMAIN_HEADS');if(!findRowBy_(heads,1,Q046_WALLET.allocationDomain,2))throw new Error('WALLET_SCHEMA_NOT_MIGRATED:wallet_allocations_head');
  return true;
}
function q046EventId_(body){return w1EventId_(body);}
function q046FinanceByEvent_(eventId){const t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1);for(let i=0;i<t.rows.length;i++)if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===String(eventId))return {table:t,row:i+2,values:t.rows[i],obj:tableRowObject_(t,t.rows[i])};return null;}
function q046FinanceById_(id){const t=tableByHeader_(CFG.SPREADSHEET_ID,'Финансы',1),hit=findRowBy_(t.sheet,1,String(id||''),2);return hit?{table:t,row:hit.row,values:hit.values,obj:tableRowObject_(t,hit.values)}:null;}
function q046StableId_(prefix,eventId){return prefix+sha256Hex_(String(eventId||'')).slice(0,16).toUpperCase();}
function q046PermissionEdit_(auth,owner){return mutationPermission_(auth,'wallet','update',String(owner||''));}
function q046CanonicalPaymentSource_(v){const s=String(v||'').trim().toUpperCase();if(['PRODUCTION_WALLET','PERSON','CREDIT','SUPPLIER_DEBT','NONE'].indexOf(s)<0)throw new Error('PAYMENT_SOURCE_INVALID');return s;}
function q046CanonicalCashDest_(v){const s=String(v||'').trim().toUpperCase();if(['PRODUCTION_WALLET','PERSON','NONE'].indexOf(s)<0)throw new Error('CASH_DESTINATION_INVALID');return s;}
function q046CreateFinanceInternal_(spec,auth,eventId){
  q046RequireSchemaReady_();const dup=q046FinanceByEvent_(eventId);if(dup){let repaired=null;const o=dup.obj||{},dps=String(o['Источник денег / оплаты']||'').toUpperCase();if(yes_(o['Фактическая операция'])&&/^Расход$/i.test(String(o['Тип']||''))&&dps==='PERSON'&&!String(o.partner_settlement_entry_id||'')){const pid=String(o.partner_party_id||'');if(!pid)throw new Error('PARTNER_PARTY_REQUIRED');repaired=financeWaveAppendSettlement_(eventId,'PERSONAL_PAID_BUSINESS_EXPENSE',{party_id:pid},q046Money_(o['Сумма']),q046Money_(o['Сумма']),0,String(o['ID операции']||''),String(o['№ заказа']||''),auth.user.userId,String(o['Описание']||''),String(o['Группа операции']||eventId));q046LinkSettlement_(String(o['ID операции']||''),repaired,'FUNDING_INCREASE',eventId);const fresh=q046FinanceById_(String(o['ID операции']||''));return {duplicate:true,item:fresh?fresh.obj:o,settlement:repaired,repaired_partial:true};}return {duplicate:true,item:o,settlement:null,repaired_partial:false};}
  const type=String(spec.type||''),amount=Number(spec.amount||0);if(!/^(Приход|Расход)$/i.test(type)||!(amount>0))throw new Error('FINANCE_INPUT_INVALID');
  const actual=spec.actual!==false,epoch=actual?q046ActiveEpochId_():'',id=String(spec.finance_id||q046StableId_('FIN-Q046-',eventId)),now=new Date(),ps=type==='Расход'?q046CanonicalPaymentSource_(spec.payment_source||'NONE'):'NONE',dest=type==='Приход'?q046CanonicalCashDest_(spec.cash_destination||'NONE'):'NONE';
  if(actual&&!epoch)throw new Error('ACTIVE_RECONCILIATION_REQUIRED');
  if(type==='Расход'&&actual&&ps==='PERSON'&&!String(spec.partner_party_id||''))throw new Error('PARTNER_PARTY_REQUIRED');
  const obj={'ID операции':id,'Дата':actual?now:(spec.date||now),'Тип':type,'Категория':cleanText_(spec.category||'',160),'Подкатегория':cleanText_(spec.subcategory||'',160),'№ заказа':cleanText_(spec.order_id||'',80),'Контрагент / поставщик':cleanText_(spec.counterparty||'',160),'Описание':cleanText_(spec.comment||'',3000),'Количество':1,'Единица':'операция','Цена единицы':amount,'Сумма':amount,'Сотрудник':auth.user.name,'Фактическая операция':actual?'Да':'Нет','Источник':'Q-046 canonical Wallet / event '+eventId,'Комментарий':'Q-046 staging contract','Дата изменения':new Date(),'created_by_user_id':auth.user.userId,'created_by_name':auth.user.name,'updated_by_user_id':auth.user.userId,'updated_by_name':auth.user.name,'updated_at_app':nowIso_(),'is_deleted':false,'last_event_id':eventId,'record_version':1,'Источник денег / оплаты':ps,'Группа операции':eventId,'Финансовый смысл':cleanText_(spec.financial_meaning||'',120),counterparty_party_id:String(spec.counterparty_party_id||''),cash_destination:dest,partner_party_id:String(spec.partner_party_id||''),partner_effect:String(spec.partner_effect||''),partner_settlement_entry_id:'',obligation_id:String(spec.obligation_id||''),plan_state:actual?'NONE':String(spec.plan_state||'PLANNED').toUpperCase(),due_date:String(spec.due_date||''),correction_of_finance_id:'',cash_epoch_id:actual?epoch:'',executed_finance_id:''};
  w1AppendFinance_(obj,eventId);
  let settlement=null;if(actual&&type==='Расход'&&ps==='PERSON'){const party={party_id:String(spec.partner_party_id)},se=financeWaveAppendSettlement_(eventId,'PERSONAL_PAID_BUSINESS_EXPENSE',party,amount,amount,0,id,String(spec.order_id||''),auth.user.userId,String(spec.comment||''),eventId);settlement=se;const hit=q046FinanceById_(id);if(hit){setByHeader_(hit.table,hit.row,'partner_effect','FUNDING_INCREASE');setByHeader_(hit.table,hit.row,'partner_settlement_entry_id',se.settlement_entry_id);w1TouchDomainRow_('finance',hit.table,hit.row,eventId+'-settlement-link');}}
  const final=q046FinanceById_(id);auditMutation_('finance',id,'create',auth,eventId,{},final?final.obj:obj,'Q-046 canonical Wallet Finance create');return {duplicate:false,item:final?final.obj:obj,settlement:settlement};
}
function q046PatchFinance_(id,patch,auth,eventId,note){
  const hit=q046FinanceById_(id);if(!hit)throw new Error('FINANCE_NOT_FOUND');if(String(hit.obj.last_event_id||'')===String(eventId))return {duplicate:true,item:hit.obj};const before=hit.obj;
  Object.keys(patch).forEach(function(k){if(hit.table.index[k]==null)throw new Error('COLUMN_MISSING:'+k);setByHeader_(hit.table,hit.row,k,patch[k]);});
  setByHeader_(hit.table,hit.row,'updated_by_user_id',auth.user.userId);setByHeader_(hit.table,hit.row,'updated_by_name',auth.user.name);setByHeader_(hit.table,hit.row,'updated_at_app',nowIso_());setByHeader_(hit.table,hit.row,'Дата изменения',new Date());setByHeader_(hit.table,hit.row,'last_event_id',eventId);setByHeader_(hit.table,hit.row,'record_version',Math.floor(Number(before.record_version||0))+1);w1TouchDomainRow_('finance',hit.table,hit.row,eventId);const after=q046FinanceById_(id).obj;auditMutation_('finance',id,'update',auth,eventId,before,after,note||'Q-046 Finance update');return {duplicate:false,item:after};
}
function q046AllocationHead_(){const h=sheet_('_DOMAIN_HEADS'),hit=findRowBy_(h,1,Q046_WALLET.allocationDomain,2);if(!hit)throw new Error('WALLET_ALLOCATIONS_HEAD_MISSING');return {sheet:h,row:hit.row,values:hit.values,current_rev:Math.floor(Number(hit.values[2]||0))};}
function q046CommitAllocationHead_(nextRev,eventId){const h=q046AllocationHead_(),t=tableByHeader_(CFG.SPREADSHEET_ID,Q046_WALLET.allocationSheet,1);let count=0;t.rows.forEach(function(r){if(String(valueBy_(t,r,'allocation_id')||'').trim())count++;});h.sheet.getRange(h.row,3,1,5).setValues([[nextRev,nowIso_(),count,eventId||'','']]);}
function q046AllocationByEvent_(eventId){const t=q046SafeTable_(Q046_WALLET.allocationSheet);if(!t)return null;for(let i=0;i<t.rows.length;i++)if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===String(eventId))return {table:t,row:i+2,obj:tableRowObject_(t,t.rows[i])};return null;}
function q046AllocationById_(id){const t=q046SafeTable_(Q046_WALLET.allocationSheet);if(!t)return null;const hit=findRowBy_(t.sheet,1,String(id||''),2);return hit?{table:t,row:hit.row,obj:tableRowObject_(t,hit.values)}:null;}
function q046AppendAllocation_(body,auth,eventId){
  q046RequireSchemaReady_();
  const dup=q046AllocationByEvent_(eventId);if(dup)return {duplicate:true,item:dup.obj};
  const state=String(body.state||'PLANNED').toUpperCase(),purpose=String(body.purpose_type||'OTHER').toUpperCase(),amount=Number(body.amount||0),plannedFinanceId=String(body.planned_finance_id||'').trim();
  if(Q046_WALLET.allocationStates.indexOf(state)<0||['PLANNED','RESERVED'].indexOf(state)<0)throw new Error('ALLOCATION_STATE_INVALID');
  if(Q046_WALLET.purposeTypes.indexOf(purpose)<0)throw new Error('ALLOCATION_PURPOSE_INVALID');
  if(!(amount>0))throw new Error('ALLOCATION_AMOUNT_INVALID');
  if(plannedFinanceId){
    const plan=q046FinanceById_(plannedFinanceId);if(!plan)throw new Error('PLANNED_FINANCE_NOT_FOUND');
    const planState=String(plan.obj.plan_state||'').toUpperCase();if(['EXECUTED','CANCELLED'].indexOf(planState)>=0)throw new Error('PLAN_NOT_ACTIVE');
    const linked=q047LinkedAllocations_(plannedFinanceId);if(linked.active.length)throw new Error('ACTIVE_LINKED_ALLOCATION_EXISTS');
  }
  if(state==='RESERVED'){const model=q046BuildCanonicalWallet_({});if(amount>model.free_now+0.009)throw new Error('RESERVE_EXCEEDS_FREE_NOW');}
  const t=tableByHeader_(CFG.SPREADSHEET_ID,Q046_WALLET.allocationSheet,1),head=q046AllocationHead_(),nextRev=head.current_rev+1,now=nowIso_(),id=String(body.allocation_id||q046StableId_('ALLOC-Q046-',eventId)),obj={allocation_id:id,created_at:now,effective_date:String(body.effective_date||Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy-MM-dd')),source_finance_id:String(body.source_finance_id||''),source_order_id:String(body.source_order_id||''),planned_finance_id:plannedFinanceId,purpose_type:purpose,purpose_label:cleanText_(body.purpose_label||'',200),amount:amount,currency:'RUB',state:state,due_date:String(body.due_date||''),partner_party_id:String(body.partner_party_id||''),counterparty_party_id:String(body.counterparty_party_id||''),obligation_id:String(body.obligation_id||''),target_order_id:String(body.target_order_id||''),principal_amount:Number(body.principal_amount||0),executed_finance_id:'',comment:cleanText_(body.comment||'',1000),created_by_user_id:auth.user.userId,updated_at:now,updated_by_user_id:auth.user.userId,is_deleted:false,last_event_id:eventId,record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};
  obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));q046CommitAllocationHead_(nextRev,eventId);w1Audit_('wallet_allocations',id,'create',auth,eventId,{},obj,'','');return {duplicate:false,item:obj};
}
function q046UpdateAllocation_(id,patch,auth,eventId,note){const hit=q046AllocationById_(id);if(!hit)throw new Error('ALLOCATION_NOT_FOUND');if(String(hit.obj.last_event_id||'')===String(eventId))return {duplicate:true,item:hit.obj};const before=hit.obj,head=q046AllocationHead_(),nextRev=head.current_rev+1,obj=Object.assign({},before,patch);obj.record_version=Math.floor(Number(before.record_version||0))+1;obj.updated_at=nowIso_();obj.updated_by_user_id=auth.user.userId;obj.last_event_id=eventId;obj._SYNC_REV=nextRev;obj._UPDATED_AT=obj.updated_at;obj._ROW_HASH=w1RowHash_(hit.table,obj);hit.table.sheet.getRange(hit.row,1,1,hit.table.headers.length).setValues([hit.table.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';})]);q046CommitAllocationHead_(nextRev,eventId);w1Audit_('wallet_allocations',id,'update',auth,eventId,before,obj,'','');return {duplicate:false,item:obj};}
function handleWalletFinanceCreateQ046_(body,requestId){const auth=authSession_(body.session_token,'wallet.add',requestId),eventId=q046EventId_(body),lock=LockService.getScriptLock();lock.waitLock(20000);try{const r=q046CreateFinanceInternal_(body,auth,eventId);touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:r.duplicate,finance:r.item,serverTime:nowIso_()};}finally{lock.releaseLock();}}
function handleWalletPlanCreateQ046_(body,requestId){const auth=authSession_(body.session_token,'wallet.add',requestId),eventId=q046EventId_(body),lock=LockService.getScriptLock();lock.waitLock(20000);try{const r=q046CreateFinanceInternal_({type:String(body.type||'Расход'),amount:body.amount,actual:false,category:body.category,subcategory:body.subcategory,order_id:body.order_id,counterparty:body.counterparty,comment:body.comment,due_date:body.due_date,plan_state:'PLANNED'},auth,eventId);touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:r.duplicate,planned_finance:r.item,serverTime:nowIso_()};}finally{lock.releaseLock();}}
function handleWalletPlanEditQ046_(body,requestId){q046RequireSchemaReady_();const auth=authSession_(body.session_token,null,requestId),eventId=q046EventId_(body),id=cleanId_(body.planned_finance_id,'planned_finance_id'),hit=q046FinanceById_(id);if(!hit)throw new Error('PLANNED_FINANCE_NOT_FOUND');if(!q046PermissionEdit_(auth,hit.obj.created_by_user_id))throw new Error('PERMISSION_DENIED:wallet.edit');const state=String(hit.obj.plan_state||'').toUpperCase();if(['EXECUTED','CANCELLED'].indexOf(state)>=0)throw new Error('PLAN_NOT_EDITABLE');const p=body.patch||{},patch={};if(p.amount!=null){const n=Number(p.amount);if(!(n>0))throw new Error('FINANCE_AMOUNT_INVALID');patch['Сумма']=n;patch['Цена единицы']=n;}if(p.due_date!=null)patch.due_date=String(p.due_date||'');if(p.category!=null)patch['Категория']=cleanText_(p.category,160);if(p.subcategory!=null)patch['Подкатегория']=cleanText_(p.subcategory,160);if(p.comment!=null)patch['Описание']=cleanText_(p.comment,3000);if(p.order_id!=null)patch['№ заказа']=cleanText_(p.order_id,80);const r=q046PatchFinance_(id,patch,auth,eventId,'Q-046 planned expense edit');touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:r.duplicate,planned_finance:r.item,serverTime:nowIso_()};}
function handleWalletPlanCancelQ046_(body,requestId){
  q046RequireSchemaReady_();const auth=authSession_(body.session_token,null,requestId),eventId=q046EventId_(body),id=cleanId_(body.planned_finance_id,'planned_finance_id'),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const hit=q046FinanceById_(id);if(!hit)throw new Error('PLANNED_FINANCE_NOT_FOUND');if(!q046PermissionEdit_(auth,hit.obj.created_by_user_id))throw new Error('PERMISSION_DENIED:wallet.edit');
    const state=String(hit.obj.plan_state||'').toUpperCase();if(state==='EXECUTED')throw new Error('EXECUTED_PLAN_REQUIRES_CORRECTION');
    q047AssertLinkedAllocationSafe_(id);
    if(state==='CANCELLED'){touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:true,planned_finance:hit.obj,serverTime:nowIso_()};}
    const r=q046PatchFinance_(id,{plan_state:'CANCELLED'},auth,eventId,'Q-047 planned expense cancel');
    q046MarkLinkedAllocation_(id,'CANCELLED','',auth,eventId+'-ALLOC-CANCEL');
    touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:r.duplicate,planned_finance:r.item,serverTime:nowIso_()};
  }finally{lock.releaseLock();}
}
function handleWalletAllocationCreateQ046_(body,requestId){const auth=authSession_(body.session_token,'wallet.add',requestId),eventId=q046EventId_(body),lock=LockService.getScriptLock();lock.waitLock(20000);try{const r=q046AppendAllocation_(body,auth,eventId);touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:r.duplicate,allocation:r.item,wallet:q046BuildCanonicalWallet_({}),serverTime:nowIso_()};}finally{lock.releaseLock();}}
function handleWalletAllocationCancelQ046_(body,requestId){q046RequireSchemaReady_();const auth=authSession_(body.session_token,null,requestId),eventId=q046EventId_(body),id=cleanId_(body.allocation_id,'allocation_id'),hit=q046AllocationById_(id);if(!hit)throw new Error('ALLOCATION_NOT_FOUND');if(!q046PermissionEdit_(auth,hit.obj.created_by_user_id))throw new Error('PERMISSION_DENIED:wallet.edit');if(String(hit.obj.state||'').toUpperCase()==='EXECUTED')throw new Error('EXECUTED_ALLOCATION_REQUIRES_CORRECTION');const r=q046UpdateAllocation_(id,{state:'CANCELLED'},auth,eventId,'Q-046 allocation cancel');touchSessionAndDevice_(auth);return {ok:true,request_id:requestId,event_id:eventId,duplicate:r.duplicate,allocation:r.item,wallet:q046BuildCanonicalWallet_({}),serverTime:nowIso_()};}


function q047LinkedAllocations_(plannedFinanceId){
  const t=q046SafeTable_(Q046_WALLET.allocationSheet),all=[],active=[];if(!t)return {table:null,all:all,active:active};
  t.rows.forEach(function(r){
    if(String(valueBy_(t,r,'planned_finance_id')||'')!==String(plannedFinanceId||''))return;
    if(q046IsDeleted_(valueBy_(t,r,'is_deleted')))return;
    const obj=tableRowObject_(t,r),state=String(obj.state||'').toUpperCase();all.push(obj);if(['PLANNED','RESERVED'].indexOf(state)>=0)active.push(obj);
  });
  return {table:t,all:all,active:active};
}
function q047AssertLinkedAllocationSafe_(plannedFinanceId){const linked=q047LinkedAllocations_(plannedFinanceId);if(linked.active.length>1)throw new Error('DUPLICATE_ACTIVE_LINKED_ALLOCATIONS');return linked;}
function q046MarkLinkedAllocation_(plannedFinanceId,state,executedFinanceId,auth,eventId){
  const linked=q047AssertLinkedAllocationSafe_(plannedFinanceId);if(!linked.table)return null;
  if(linked.active.length===1){
    const x=linked.active[0],id=String(x.allocation_id||'');if(!id)throw new Error('ALLOCATION_ID_REQUIRED');
    return q046UpdateAllocation_(id,{state:String(state||'').toUpperCase(),executed_finance_id:String(executedFinanceId||'')},auth,eventId,'Q-047 linked allocation state').item;
  }
  const desired=String(state||'').toUpperCase(),done=linked.all.filter(function(x){return String(x.state||'').toUpperCase()===desired;});
  return done.length?done[0]:null;
}
function handleWalletPlanSpendQ046_(body,requestId){
  q046RequireSchemaReady_();const auth=authSession_(body.session_token,null,requestId),eventId=q046EventId_(body),id=cleanId_(body.planned_finance_id,'planned_finance_id'),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const hit=q046FinanceById_(id);if(!hit)throw new Error('PLANNED_FINANCE_NOT_FOUND');if(!q046PermissionEdit_(auth,hit.obj.created_by_user_id))throw new Error('PERMISSION_DENIED:wallet.edit');
    const state=String(hit.obj.plan_state||'').toUpperCase();if(state==='CANCELLED')throw new Error('PLAN_CANCELLED');
    q047AssertLinkedAllocationSafe_(id);
    if(String(hit.obj.executed_finance_id||'')){touchSessionAndDevice_(auth);return {ok:true,duplicate:true,request_id:requestId,event_id:eventId,planned_finance_id:id,executed_finance_id:String(hit.obj.executed_finance_id),serverTime:nowIso_()};}
    const type=String(hit.obj['Тип']||'Расход'),amount=q046Money_(hit.obj['Сумма']),spec={type:type,amount:amount,actual:true,category:hit.obj['Категория'],subcategory:hit.obj['Подкатегория'],order_id:hit.obj['№ заказа'],counterparty:hit.obj['Контрагент / поставщик'],comment:hit.obj['Описание'],payment_source:body.payment_source||'NONE',cash_destination:body.cash_destination||'NONE',partner_party_id:body.partner_party_id||'',counterparty_party_id:body.counterparty_party_id||'',obligation_id:body.obligation_id||''};
    const fact=q046CreateFinanceInternal_(spec,auth,eventId),fid=String(fact.item['ID операции']||'');
    q046PatchFinance_(id,{plan_state:'EXECUTED',executed_finance_id:fid},auth,eventId+'-PLAN-LINK','Q-047 planned expense spent');
    q046MarkLinkedAllocation_(id,'EXECUTED',fid,auth,eventId+'-ALLOC-EXEC');
    touchSessionAndDevice_(auth);return {ok:true,duplicate:fact.duplicate,request_id:requestId,event_id:eventId,planned_finance_id:id,executed_finance_id:fid,wallet:q046BuildCanonicalWallet_({}),serverTime:nowIso_()};
  }finally{lock.releaseLock();}
}
function q046LinkSettlement_(financeId,settlement,partnerEffect,eventId){const hit=q046FinanceById_(financeId);if(!hit)return;setByHeader_(hit.table,hit.row,'partner_effect',String(partnerEffect||''));setByHeader_(hit.table,hit.row,'partner_settlement_entry_id',String(settlement&&settlement.settlement_entry_id||''));w1TouchDomainRow_('finance',hit.table,hit.row,eventId+'-settlement-link');}
function q046ObligationByEvent_(eventId){const t=tableByHeader_(CFG.SPREADSHEET_ID,'Обязательства',1);for(let i=0;i<t.rows.length;i++)if(String(valueBy_(t,t.rows[i],'last_event_id')||'')===String(eventId))return tableRowObject_(t,t.rows[i]);return null;}
function q046CreateObligationInternal_(spec,auth,eventId){const dup=q046ObligationByEvent_(eventId);if(dup)return {duplicate:true,item:dup};const t=tableByHeader_(CFG.SPREADSHEET_ID,'Обязательства',1),head=w1HeadObject_('obligations'),nextRev=head.current_rev+1,now=nowIso_(),id=String(spec.obligation_id||q046StableId_('OBL-Q046-',eventId)),obj={obligation_id:id,obligation_type:String(spec.obligation_type||'OTHER').toUpperCase(),title:cleanText_(spec.title||'Обязательство',200),counterparty_party_id:String(spec.counterparty_party_id||''),order_id:String(spec.order_id||''),opened_date:String(spec.opened_date||Utilities.formatDate(new Date(),spreadsheetTz_(),'yyyy-MM-dd')),original_amount:Number(spec.original_amount||0),currency:'RUB',payment_frequency:String(spec.payment_frequency||'NONE').toUpperCase(),regular_payment_amount:Number(spec.regular_payment_amount||0),next_due_date:String(spec.next_due_date||''),status:'ACTIVE',source_finance_id:String(spec.source_finance_id||''),comment:cleanText_(spec.comment||'',1000),created_at:now,created_by_user_id:auth.user.userId,updated_at:now,updated_by_user_id:auth.user.userId,is_deleted:false,last_event_id:eventId,record_version:1,_SYNC_REV:nextRev,_UPDATED_AT:now};w1ValidateObject_('obligations',obj,true);obj._ROW_HASH=w1RowHash_(t,obj);t.sheet.appendRow(t.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';}));w1CommitHead_('obligations',nextRev,eventId);w1Audit_('obligations',id,'create',auth,eventId,{},obj,'','');return {duplicate:false,item:obj};}
function q046RequireSensitive_(auth){if(String(auth.user&&auth.user.role||'')!=='ADMIN1')throw new Error('PERMISSION_DENIED:ADMIN1_WALLET_SENSITIVE');}
function q047ObligationState_(obligationId){const id=String(obligationId||''),x=q046Obligations_().find(function(o){return String(o.obligation_id||'')===id;});if(!x)throw new Error('OBLIGATION_NOT_FOUND');return x;}
function q047SensitivePriorResult_(kind,eventId){
  const compound=['THIRD_PARTY_LOAN_INFLOW','SUPPLIER_CREDIT_PURCHASE'].indexOf(kind)>=0,financeEvent=compound?eventId+'-FIN':eventId,fh=q046FinanceByEvent_(financeEvent),ob=compound?q046ObligationByEvent_(eventId):null;
  let complete=false;
  if(kind==='OWNER_REIMBURSEMENT'||kind==='PARTNER_DISTRIBUTION')complete=!!(fh&&String(fh.obj.partner_settlement_entry_id||''));
  else if(kind==='OBLIGATION_PAYMENT')complete=!!fh;
  else if(compound)complete=!!(fh&&ob);
  return {complete:complete,partial:!!fh||!!ob,finance:fh?fh.obj:null,obligation:ob||null,finance_event_id:financeEvent};
}
function q047SensitiveResponse_(prior,kind,eventId,requestId,body,auth){
  const f=prior.finance||{},o=prior.obligation||{};
  touchSessionAndDevice_(auth);
  return {ok:true,duplicate:true,prior_result:true,request_id:requestId,event_id:eventId,action_type:kind,finance_id:String(f['ID операции']||''),settlement_id:String(f.partner_settlement_entry_id||''),obligation_id:String(o.obligation_id||body.obligation_id||f.obligation_id||''),wallet:q046BuildCanonicalWallet_({}),serverTime:nowIso_()};
}
function handleWalletSensitiveExecuteQ046_(body,requestId){
  q046RequireSchemaReady_();const auth=authSession_(body.session_token,null,requestId);q046RequireSensitive_(auth);const eventId=q046EventId_(body),kind=String(body.action_type||'').toUpperCase(),amount=Number(body.amount||0);if(!(amount>0))throw new Error('AMOUNT_INVALID');const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const prior=q047SensitivePriorResult_(kind,eventId);if(prior.complete)return q047SensitiveResponse_(prior,kind,eventId,requestId,body,auth);
    let fact=null,settlement=null,obligation=null;
    if(kind==='OWNER_REIMBURSEMENT'){
      const pid=cleanId_(body.partner_party_id,'partner_party_id'),card=q046PartnerCards_().find(function(x){return String(x.party_id)===pid;});if(!card)throw new Error('PARTNER_NOT_FOUND');if(amount>Number(card.funding_due||0)+0.009)throw new Error('REIMBURSEMENT_EXCEEDS_FUNDING_DUE');
      fact=q046CreateFinanceInternal_({type:'Расход',amount:amount,actual:true,category:'Возврат финансирования партнёру',comment:body.comment||'Возврат вложенных средств',payment_source:'PRODUCTION_WALLET',partner_party_id:pid,partner_effect:'FUNDING_REPAYMENT',financial_meaning:'NON_OPERATING_PARTNER_REPAYMENT'},auth,eventId);
      settlement=financeWaveAppendSettlement_(eventId,'FUNDING_REPAYMENT',{party_id:pid},amount,-amount,0,String(fact.item['ID операции']||''),'',auth.user.userId,String(body.comment||''),eventId);q046LinkSettlement_(String(fact.item['ID операции']||''),settlement,'FUNDING_REPAYMENT',eventId);
    }else if(kind==='PARTNER_DISTRIBUTION'){
      const pid=cleanId_(body.partner_party_id,'partner_party_id');
      fact=q046CreateFinanceInternal_({type:'Расход',amount:amount,actual:true,category:'Вывод партнёру',comment:body.comment||'Распределение партнёру',payment_source:'PRODUCTION_WALLET',partner_party_id:pid,partner_effect:'DISTRIBUTION_DECREASE',financial_meaning:'NON_OPERATING_OWNER_DISTRIBUTION'},auth,eventId);
      settlement=financeWaveAppendSettlement_(eventId,'PARTNER_WITHDRAWAL',{party_id:pid},amount,0,-amount,String(fact.item['ID операции']||''),'',auth.user.userId,String(body.comment||''),eventId);q046LinkSettlement_(String(fact.item['ID операции']||''),settlement,'DISTRIBUTION_DECREASE',eventId);
    }else if(kind==='OBLIGATION_PAYMENT'){
      const oid=cleanId_(body.obligation_id,'obligation_id'),state=q047ObligationState_(oid),remaining=Number(state.remaining||0);
      if(remaining<=0.009)throw new Error('OBLIGATION_ALREADY_PAID');
      if(amount>remaining+0.009)throw new Error('OBLIGATION_PAYMENT_EXCEEDS_REMAINING');
      fact=q046CreateFinanceInternal_({type:'Расход',amount:amount,actual:true,category:'Платёж по обязательству',comment:body.comment||'Платёж по обязательству',payment_source:'PRODUCTION_WALLET',obligation_id:oid,financial_meaning:'NON_OPERATING_OBLIGATION_PAYMENT'},auth,eventId);
    }else if(kind==='THIRD_PARTY_LOAN_INFLOW'){
      const finEvent=eventId+'-FIN',expectedFinanceId=q046StableId_('FIN-Q046-',finEvent);
      obligation=q046CreateObligationInternal_({obligation_type:String(body.obligation_type||'CREDIT'),title:body.title||'Займ',counterparty_party_id:body.counterparty_party_id||'',original_amount:amount,payment_frequency:body.payment_frequency||'NONE',regular_payment_amount:body.regular_payment_amount||0,next_due_date:body.next_due_date||'',comment:body.comment||'Q-047 loan inflow',source_finance_id:expectedFinanceId},auth,eventId);
      fact=q046CreateFinanceInternal_({type:'Приход',amount:amount,actual:true,category:'Займ / кредит',comment:body.comment||'Получение займа',cash_destination:'PRODUCTION_WALLET',obligation_id:String(obligation.item.obligation_id||''),financial_meaning:'NON_OPERATING_LOAN_INFLOW'},auth,finEvent);
    }else if(kind==='SUPPLIER_CREDIT_PURCHASE'){
      const finEvent=eventId+'-FIN',expectedFinanceId=q046StableId_('FIN-Q046-',finEvent);
      obligation=q046CreateObligationInternal_({obligation_type:'SUPPLIER_DEBT',title:body.title||'Долг поставщику',counterparty_party_id:body.counterparty_party_id||'',original_amount:amount,payment_frequency:body.payment_frequency||'NONE',next_due_date:body.next_due_date||'',comment:body.comment||'Q-047 supplier credit',source_finance_id:expectedFinanceId},auth,eventId);
      fact=q046CreateFinanceInternal_({type:'Расход',amount:amount,actual:true,category:body.category||'Материалы',counterparty:body.counterparty||'',comment:body.comment||'Покупка в долг поставщику',payment_source:'SUPPLIER_DEBT',obligation_id:String(obligation.item.obligation_id||''),financial_meaning:'OPERATING_SUPPLIER_CREDIT_PURCHASE'},auth,finEvent);
    }else throw new Error('SENSITIVE_ACTION_INVALID');
    const duplicate=prior.partial||!!(fact&&fact.duplicate)||!!(obligation&&obligation.duplicate),financeObj=fact&&fact.item?fact.item:{};
    touchSessionAndDevice_(auth);return {ok:true,duplicate:duplicate,prior_result:duplicate,repaired_partial:prior.partial&&!prior.complete,request_id:requestId,event_id:eventId,action_type:kind,finance_id:String(financeObj['ID операции']||''),settlement_id:String((settlement&&settlement.settlement_entry_id)||financeObj.partner_settlement_entry_id||''),obligation_id:obligation?String(obligation.item.obligation_id||''):String(body.obligation_id||financeObj.obligation_id||''),wallet:q046BuildCanonicalWallet_({}),serverTime:nowIso_()};
  }finally{lock.releaseLock();}
}