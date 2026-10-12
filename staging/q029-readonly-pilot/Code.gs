/**
 * Q029 / RH9 — ISOLATED READ-ONLY WALLET BACKEND.
 * IMPORTANT: CREATE A SEPARATE, NEW Apps Script PROJECT.
 * Never paste into, redeploy, or modify the existing production project.
 * Source: accepted Q072 review, PR26 pinned 5f569d4a1f56acf9cea3daee3dd8bcfcc7b94269.
 * Derived from staging/q046/backend-q046.js (read-only call closure).
 * Production source spreadsheet is READ ONLY. Requires an existing valid
 * application session token with wallet.view. No tokens stored in this file.
 * PUBLIC HTTP API: GET ping; POST ping; POST wallet.canonical.get ONLY.
 * No create/finance/write/auth touch, no reconciliation.apply, no state writes.
 * If you need to test NORMAL authentication, use a separate isolated client
 * and normal authorized identity, never send tokens in chat or screenshots.
 */
'use strict';
const Q029_PILOT_SOURCE_SHA='5f569d4a1f56acf9cea3daee3dd8bcfcc7b94269';


// Only the functions below are HTTP entry points.
function doGet(e) {
  var action=String(e && e.parameter && e.parameter.action || 'ping');
  if(action!=='ping')return json_({ok:false,error:'READ_ONLY_PILOT_GET_DENIED'});
  return json_({ok:true,service:'q029-isolated-readonly-pilot',mode:'READ_ONLY',
    version:CFG.VERSION,source_sha:Q029_PILOT_SOURCE_SHA,serverTime:nowIso_()});
}
function doPost(e) {
  var body;
  try{body=parseBody_(e)}catch(_){return json_({ok:false,error:'BAD_JSON'});}
  var action=String(body && body.action || '');
  if(action==='ping')return json_({ok:true,service:'q029-isolated-readonly-pilot',
    mode:'READ_ONLY',version:CFG.VERSION,source_sha:Q029_PILOT_SOURCE_SHA});
  if(action!=='wallet.canonical.get')return json_({ok:false,
    error:'READ_ONLY_PILOT_ACTION_DENIED',action:action.slice(0,48)});
  try{
    var requestId=String(body.request_id||body.requestId||'Q029-PILOT');
    authSession_(body.session_token,'wallet.view',requestId);
    var wallet=q046BuildCanonicalWallet_(body);
    return json_({ok:true,request_id:requestId,backend_version:CFG.VERSION,
      pilot_mode:'READ_ONLY',wallet:wallet,serverTime:nowIso_()});
  }catch(err){
    return json_({ok:false,error:'READ_ONLY_PILOT_WALLET_FAILED',detail:safeErr_(err)});
  }
}

// Original rh9 read-only transitive function set below.
const CFG = Object.freeze({
 VERSION: 'backend-0.2.34-staging-q029',
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

function dateMs_(v){
 if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return v.getTime();
 if(typeof v==='number'&&isFinite(v))return Math.round((v-25569)*86400000);
 const t=Date.parse(String(v||'')); return isFinite(t)?t:0;
}

function tableRowObject_(table,row){
 const o={}; table.headers.forEach(function(h,i){if(String(h||'').trim())o[String(h).trim()]=cleanOut_(row[i]);}); return o;
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

function cleanOut_(v) {
 if (v == null) return '';
 if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return formatDateMaybe_(v);
 return String(v);
}

function spreadsheetTz_() {
 try { return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Etc/GMT'; }
 catch (_) { return Session.getScriptTimeZone() || 'Etc/GMT'; }
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

function cleanText_(v, max) {
 return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max || 5000);
}

function sha256Hex_(text) {
 const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
 return bytes.map(function (b) { const n = b < 0 ? b + 256 : b; return ('0' + n.toString(16)).slice(-2); }).join('');
}

function nowIso_() { return new Date().toISOString(); }

function safeErr_(err) { return cleanText_(err && err.message ? err.message : String(err), 500); }

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

const Q046_WALLET = Object.freeze({
  schemaVersion:'1.0',
  allocationSheet:'Резервы и распределения',
  allocationDomain:'wallet_allocations',
  financeFields:['cash_epoch_id','executed_finance_id'],
  allocationStates:['PLANNED','RESERVED','EXECUTED','CANCELLED'],
  purposeTypes:['OWNER_REIMBURSEMENT','PARTNER_DISTRIBUTION','OBLIGATION_PAYMENT','SUPPLIER_DEBT_PAYMENT','RENT','MATERIALS','WORKER_PAYMENT','ORDER_RESERVE','OTHER'],
  allocationHeaders:['allocation_id','created_at','effective_date','source_finance_id','source_order_id','planned_finance_id','purpose_type','purpose_label','amount','currency','state','due_date','partner_party_id','counterparty_party_id','obligation_id','target_order_id','principal_amount','executed_finance_id','comment','created_by_user_id','updated_at','updated_by_user_id','is_deleted','last_event_id','record_version','_SYNC_REV','_UPDATED_AT','_ROW_HASH']
});

function q046SafeTable_(sheetName){const sh=ss_().getSheetByName(sheetName);return sh?tableByHeader_(CFG.SPREADSHEET_ID,sheetName,1):null;}

function q046IsDeleted_(v){return v===true||['TRUE','ДА','YES','1'].indexOf(String(v==null?'':v).trim().toUpperCase())>=0;}

function q046Money_(v){const n=numberOrNull_(v);return n==null?0:Number(n);}

function q046DateMs_(v){const m=dateMs_(v);return m||0;}

function q046LatestAppliedRecon_(){
  const t=q046SafeTable_('Финансовые сверки');if(!t)return null;let best=null;
  t.rows.forEach(function(r,i){if(String(valueBy_(t,r,'status')||'').toUpperCase()!=='APPLIED')return;const o=tableRowObject_(t,r),ms=q046DateMs_(o.applied_at||o.effective_at);if(!best||ms>best.ms||(ms===best.ms&&i>best.i))best={obj:o,ms:ms,i:i};});
  return best?best.obj:null;
}

function q029CashCutoverPosition_(value,recon){
  const effective=String(recon&&recon.effective_at||'');
  if(!/^\d{4}-\d{2}-\d{2}T/.test(effective)||!Number.isFinite(new Date(effective).getTime()))
    throw new Error('FINANCE_CASH_CUTOVER_TIME_UNVERIFIED');
  const tz=spreadsheetTz_(),cutoff=Utilities.formatDate(new Date(effective),tz,'yyyy-MM-dd HH:mm:ss');
  let local='',dateOnly=false;
  if(Object.prototype.toString.call(value)==='[object Date]'&&!isNaN(value.getTime())){
    local=Utilities.formatDate(value,tz,'yyyy-MM-dd HH:mm:ss');
    dateOnly=local.slice(11)==='00:00:00';
  }else{
    const raw=String(value==null?'':value).trim();
    const dmy=raw.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if(dmy||iso){
      const m=dmy||iso,day=dmy?m[3]+'-'+m[2]+'-'+m[1]:m[1]+'-'+m[2]+'-'+m[3];
      dateOnly=!m[4];
      local=day+' '+(m[4]?m[4]+':'+m[5]+':'+(m[6]||'00'):'00:00:00');
      const yr=Number(day.slice(0,4)),mo=Number(day.slice(5,7)),dd=Number(day.slice(8,10)),
        h=Number(m[4]||0),mi=Number(m[5]||0),sec=Number(m[6]||0);
      const valid=new Date(Date.UTC(yr,mo-1,dd,h,mi,sec));
      if(valid.getUTCFullYear()!==yr||valid.getUTCMonth()!==mo-1||valid.getUTCDate()!==dd||
         valid.getUTCHours()!==h||valid.getUTCMinutes()!==mi||valid.getUTCSeconds()!==sec)local='';
    }else if(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(raw)&&
             Number.isFinite(new Date(raw).getTime())){
      local=Utilities.formatDate(new Date(raw),tz,'yyyy-MM-dd HH:mm:ss');
    }
  }
  if(!local) return 'INVALID';
  if(dateOnly&&local.slice(0,10)===cutoff.slice(0,10))return 'AMBIGUOUS';
  return local<=cutoff?'HISTORICAL':'POST_CUTOVER';
}

function q029FinanceCashEpochClass_(t,r,epochId,recon){
  const id=String(valueBy_(t,r,'ID операции')||'').trim();
  if(!id)return 'BLANK';
  const epoch=String(valueBy_(t,r,'cash_epoch_id')||'').trim();
  if(epoch===String(epochId||'')&&epoch)return 'TAGGED';
  if(epoch)return 'HISTORICAL';
  if(q046IsDeleted_(valueBy_(t,r,'is_deleted')))return 'DELETED';
  const actual=String(valueBy_(t,r,'Фактическая операция')||'').trim().toUpperCase();
  if(['НЕТ','FALSE','NO','0'].includes(actual))return 'NON_FACTUAL';
  if(!recon)return 'HISTORICAL'; // Legacy callers: only live Wallet passes a verified reconciliation
  const state=q029CashCutoverPosition_(valueBy_(t,r,'Дата'),recon);
  if(state==='INVALID'||state==='AMBIGUOUS')
    throw new Error('FINANCE_MANUAL_DATE_NEEDS_CLARIFICATION:'+id);
  return state==='POST_CUTOVER'?'MANUAL_POST':'HISTORICAL';
}

function q029FinanceCashDelta_(t,r,epochId,recon){
  const classification=q029FinanceCashEpochClass_(t,r,epochId,recon);
  if(classification!=='TAGGED'&&classification!=='MANUAL_POST')return 0;
  if(q046IsDeleted_(valueBy_(t,r,'is_deleted')))return 0;
  const actual=valueBy_(t,r,'Фактическая операция');
  if(!yes_(actual)){
    if(classification==='MANUAL_POST'&&String(actual==null?'':actual).trim()==='')
      throw new Error('FINANCE_MANUAL_ACTUAL_FLAG_REQUIRED:'+String(valueBy_(t,r,'ID операции')||''));
    return 0;
  }
  const id=String(valueBy_(t,r,'ID операции')||'');
  const type=String(valueBy_(t,r,'Тип')||''),amount=numberOrNull_(valueBy_(t,r,'Сумма')),
    dest=String(valueBy_(t,r,'cash_destination')||'').trim().toUpperCase(),
    src=String(valueBy_(t,r,'Источник денег / оплаты')||'').trim().toUpperCase();
  if(classification==='MANUAL_POST'&&(!(amount>0)||!Number.isFinite(amount)||
       !/^(Приход|Расход)$/i.test(type)))
    throw new Error('FINANCE_MANUAL_TYPE_OR_AMOUNT_INVALID:'+id);
  if(/^Приход$/i.test(type)){
    if(classification==='MANUAL_POST'&&!['PRODUCTION_WALLET','PERSON','NONE'].includes(dest))
      throw new Error('FINANCE_MANUAL_CASH_DESTINATION_REQUIRED:'+id);
    return dest==='PRODUCTION_WALLET'?amount:0;
  }
  if(/^Расход$/i.test(type)){
    if(classification==='MANUAL_POST'&&!['PRODUCTION_WALLET','PERSON','CREDIT','SUPPLIER_DEBT'].includes(src))
      throw new Error('FINANCE_MANUAL_PAYMENT_SOURCE_REQUIRED:'+id);
    if(classification==='MANUAL_POST'&&src==='PERSON'&&
       (!String(valueBy_(t,r,'partner_party_id')||'').trim()||
        String(valueBy_(t,r,'partner_effect')||'').trim().toUpperCase()!=='FUNDING_INCREASE'))
      throw new Error('FINANCE_MANUAL_PARTNER_CLASSIFICATION_REQUIRED:'+id);
    return src==='PRODUCTION_WALLET'?-amount:0;
  }
  return 0;
}
// Backwards-compatible existing handler/tests use q046FinanceCashDelta_.

function q046FinanceCashDelta_(t,r,epochId,recon){return q029FinanceCashDelta_(t,r,epochId,recon);}

function q046AllocationRows_(){
  const t=q046SafeTable_(Q046_WALLET.allocationSheet);if(!t)return [];
  return t.rows.filter(function(r){return String(valueBy_(t,r,'allocation_id')||'').trim()&&!q046IsDeleted_(valueBy_(t,r,'is_deleted'));}).map(function(r){return tableRowObject_(t,r);});
}

function q046ReservedTotal_(){return q046AllocationRows_().filter(function(o){return String(o.state||'').toUpperCase()==='RESERVED';}).reduce(function(s,o){return s+q046Money_(o.amount);},0);}
/* Q029: readonly authoritative physical Finance generation and cutover attribution.
   Historical reconciliation is immutable; its displayed partner balance is a
   view over the approved opening plus subsequent source corrections. No Sheet writes. */

const Q029_PRE_Q050_FINANCE_BACKUP='1-04uDJefawl5Koqsw3OkRLLWkNq31OvX5dZZi8QE3-8';

function q029FinanceSourceStamp_(t){
  if(!t)throw new Error('FINANCE_SOURCE_UNAVAILABLE');
  const rows=[],seen=Object.create(null);
  t.rows.forEach(function(r){
    const id=String(valueBy_(t,r,'ID операции')||'').trim();if(!id)return;
    if(seen[id])throw new Error('FINANCE_DUPLICATE_SOURCE_ID');
    seen[id]=1;
    const values=t.headers.map(function(k){const v=valueBy_(t,r,k);
      return Object.prototype.toString.call(v)==='[object Date]'?v.toISOString():String(v==null?'':v).trim();
    });
    rows.push({id:id,values:values});
  });
  rows.sort(function(a,b){return a.id.localeCompare(b.id);});
  return {row_count:rows.length,source_ids_hash:sha256Hex_(JSON.stringify(rows.map(function(x){return x.id;}))),
    source_rows_hash:sha256Hex_(JSON.stringify(rows)),source_generation:'FINANCE_ROWS_SHA256_V1'};
}

function q029LegacyFinanceSourceTable_(){
  const sh=SpreadsheetApp.openById(Q029_PRE_Q050_FINANCE_BACKUP).getSheetByName('Финансы');
  if(!sh)throw new Error('Q029_HISTORICAL_SOURCE_UNAVAILABLE');
  const col=sh.getLastColumn(),last=sh.getLastRow(),headers=sh.getRange(1,1,1,col).getDisplayValues()[0],index={};
  headers.forEach(function(h,i){const key=String(h||'').trim();if(key)index[key]=i;});
  const rows=last>1?sh.getRange(2,1,last-1,col).getValues():[];
  return {headers:headers,index:index,rows:rows};
}

function q029IsBeforeCutover_(v,iso){
  const str=Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime())?
     Utilities.formatDate(v,spreadsheetTz_(),'yyyy-MM-dd'):String(v||'');
  const m=str.match(/^([0-9]{2})\.([0-9]{2})\.([0-9]{4})/);
  const day=m?m[3]+'-'+m[2]+'-'+m[1]:str.slice(0,10);
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)&&day<String(iso||'').slice(0,10);
}

function q029FinancePartnerEffect_(t,r,cutoff){
  if(!r||q046IsDeleted_(valueBy_(t,r,'is_deleted'))||!yes_(valueBy_(t,r,'Фактическая операция'))||
     !q029IsBeforeCutover_(valueBy_(t,r,'Дата'),cutoff))return null;
  const amount=q046Money_(valueBy_(t,r,'Сумма')),kind=String(valueBy_(t,r,'Тип')||''),
    category=String(valueBy_(t,r,'Категория')||''),src=String(valueBy_(t,r,'Источник денег / оплаты')||'').toUpperCase(),
    effect=String(valueBy_(t,r,'partner_effect')||'').toUpperCase();
  if(!(amount>0))return null;
  if(effect==='FUNDING_INCREASE'&&src==='PERSON'&&/^Расход$/i.test(kind))
    return {party_id:String(valueBy_(t,r,'partner_party_id')||''),funding_delta:amount,distribution_delta:0};
  if(/^Приход$/i.test(kind)&&category==='Вклад владельца'){
    const label=[valueBy_(t,r,'Подкатегория'),valueBy_(t,r,'Контрагент / поставщик')].join(' ').toLowerCase();
    if(label.includes('серге'))return {party_id:'PTY-Q029-SERGEY',funding_delta:amount,distribution_delta:0};
    if(label.includes('евген'))return {party_id:'PTY-Q029-EVGENY',funding_delta:amount,distribution_delta:0};
  }
  return null;
}

function q029HistoricPartnerCorrections_(live,recon){
  const baseline=q029LegacyFinanceSourceTable_(),cutoff=String(recon.effective_at||recon.applied_at||'').slice(0,10),
    past={},now={},adjustments={},affected={},unclassified=[];
  function collect(t,out){
    t.rows.forEach(function(r){const id=String(valueBy_(t,r,'ID операции')||'').trim();if(id)out[id]=r;});
  }
  collect(baseline,past);collect(live,now);
  const ids=Object.keys(Object.assign({},past,now));
  let changed=0;
  ids.forEach(function(id){
    const old=q029FinancePartnerEffect_(baseline,past[id],cutoff),
      fresh=q029FinancePartnerEffect_(live,now[id],cutoff);
    const oldParty=old?.party_id||'',newParty=fresh?.party_id||'';
    const oldAmount=old?.funding_delta||0,newAmount=fresh?.funding_delta||0;
    if(oldParty===newParty&&oldAmount===newAmount)return;
    changed++;
    if(oldParty){adjustments[oldParty]=(adjustments[oldParty]||0)-oldAmount;affected[id]=true;}
    if(newParty){adjustments[newParty]=(adjustments[newParty]||0)+newAmount;affected[id]=true;}
    if((old&&!oldParty)||(fresh&&!newParty))unclassified.push(id);
  });
  if(unclassified.length)throw new Error('FINANCE_HISTORICAL_PARTNER_ID_MISSING');
  Object.keys(adjustments).forEach(function(id){adjustments[id]=Math.round(adjustments[id]*100)/100;});
  return {source:'Q044_HISTORICAL_SOURCE_AUDIT_ONLY',applied_partner_adjustment:0,
    accounting_rule:'APPROVED_Q044_OPENING_NOT_HISTORICALLY_REPLAYED',baseline_file_id:Q029_PRE_Q050_FINANCE_BACKUP,
    baseline_row_count:Object.keys(past).length,source_row_count:Object.keys(now).length,
    changed_partner_ids:Object.keys(affected).length,changed_compared_to_baseline:changed,
    funding_delta_by_partner:adjustments,reconciliation_id:String(recon.reconciliation_id||'')};
}

function q046PartnerCards_(financeTable,recon){
  const pt=q046SafeTable_('Контрагенты'),st=q046SafeTable_('Расчёты с партнёрами');if(!st)return [];
  const parties={};if(pt)pt.rows.forEach(function(r){const id=String(valueBy_(pt,r,'party_id')||'');if(id)parties[id]=tableRowObject_(pt,r);});
  const by={},now=new Date(),ym=Utilities.formatDate(now,spreadsheetTz_(),'yyyy-MM');
  st.rows.forEach(function(r){if(String(valueBy_(st,r,'status')||'').toUpperCase()!=='POSTED')return;const pid=String(valueBy_(st,r,'partner_party_id')||'');if(!pid)return;const o=tableRowObject_(st,r);if(!by[pid])by[pid]={party_id:pid,display_name:parties[pid]?String(parties[pid].display_name||''):pid,funding_due:0,distribution_balance:0,current_month_rows:[],history_rows:[]};by[pid].funding_due+=q046Money_(o.funding_delta);by[pid].distribution_balance+=q046Money_(o.distribution_delta);const row={settlement_entry_id:o.settlement_entry_id,effective_date:o.effective_date,entry_type:o.entry_type,funding_delta:q046Money_(o.funding_delta),distribution_delta:q046Money_(o.distribution_delta),amount:q046Money_(o.amount),order_id:o.order_id||'',finance_id:o.finance_id||'',comment:o.comment||''};by[pid].history_rows.push(row);if(String(o.effective_date||'').slice(0,7)===ym)by[pid].current_month_rows.push(row);});
  // Q044 opening is an independently approved as-of balance, not the sum
  // of replayed pre-cutover Finance rows. NEVER subtract prior removed
  // PERSON/OWNER rows from Q044 again: that recreates the rejected 14084.83.
  // Only real post-cutover Finance changes may affect this live projection.
  const activeRecon=recon||q046LatestAppliedRecon_(),epochId=String(activeRecon?.reconciliation_id||'');
  const ft=financeTable||q046SafeTable_('Финансы'),financeById={};
  if(ft)ft.rows.forEach(function(fr){
    const id=String(valueBy_(ft,fr,'ID операции')||'').trim();if(id)financeById[id]=fr;
  });
  const linkedFinance={};
  st.rows.forEach(function(r){const obj=tableRowObject_(st,r);
    if(String(obj.status||'').toUpperCase()!=='POSTED'||!String(obj.finance_id||''))return;
    const id=String(obj.finance_id),fr=financeById[id];
    linkedFinance[id]=true;
    const pid=String(obj.partner_party_id||'');if(!pid||!by[pid])return;
    if(fr&&!q046IsDeleted_(valueBy_(ft,fr,'is_deleted'))){
      // A manually edited real Finance amount supersedes a linked historic
      // settlement's original amount in the derived view, not the audit row.
      const oldAmount=q046Money_(obj.amount),newAmount=q046Money_(valueBy_(ft,fr,'Сумма'));
      const actual=yes_(valueBy_(ft,fr,'Фактическая операция')),
        kind=String(valueBy_(ft,fr,'Тип')||''),src=String(valueBy_(ft,fr,'Источник денег / оплаты')||'').toUpperCase(),
        effect=String(valueBy_(ft,fr,'partner_effect')||'').toUpperCase(),
        matchParty=String(valueBy_(ft,fr,'partner_party_id')||'')===pid;
      const expected=(Number(obj.funding_delta)>0&&effect==='FUNDING_INCREASE'&&src==='PERSON')||
       (Number(obj.funding_delta)<0&&effect==='FUNDING_REPAYMENT'&&src==='PRODUCTION_WALLET')||
       (Number(obj.distribution_delta)<0&&effect==='DISTRIBUTION_DECREASE'&&src==='PRODUCTION_WALLET');
      if(!actual||!(newAmount>0)||!/^Расход$/i.test(kind)||!matchParty||!expected){
        by[pid].funding_due-=q046Money_(obj.funding_delta);
        by[pid].distribution_balance-=q046Money_(obj.distribution_delta);return;
      }
      if(oldAmount>0&&Math.abs(newAmount-oldAmount)>0.009){
        const ratio=newAmount/oldAmount;
        by[pid].funding_due+=q046Money_(obj.funding_delta)*(ratio-1);
        by[pid].distribution_balance+=q046Money_(obj.distribution_delta)*(ratio-1);
      }
      return;
    }
    // Physical removal removes linked settlement from the read projection,
    // never deleting the posted settlement record or its audit history.
    by[pid].funding_due-=q046Money_(obj.funding_delta);
    by[pid].distribution_balance-=q046Money_(obj.distribution_delta);
  });
  if(ft&&epochId)ft.rows.forEach(function(fr){
    const id=String(valueBy_(ft,fr,'ID операции')||'').trim();
    if(!id||linkedFinance[id]||q046IsDeleted_(valueBy_(ft,fr,'is_deleted'))||
       !yes_(valueBy_(ft,fr,'Фактическая операция'))||
       !['TAGGED','MANUAL_POST'].includes(q029FinanceCashEpochClass_(ft,fr,epochId,activeRecon)))return;
    const effect=String(valueBy_(ft,fr,'partner_effect')||'').toUpperCase(),
      source=String(valueBy_(ft,fr,'Источник денег / оплаты')||'').toUpperCase(),
      type=String(valueBy_(ft,fr,'Тип')||''),pid=String(valueBy_(ft,fr,'partner_party_id')||''),
      amount=q046Money_(valueBy_(ft,fr,'Сумма'));
    if(!/^Расход$/i.test(type)||!pid||!(amount>0))return;
    const fundingDelta=effect==='FUNDING_INCREASE'&&source==='PERSON'?amount:
      effect==='FUNDING_REPAYMENT'&&source==='PRODUCTION_WALLET'?-amount:0,
      distributionDelta=effect==='DISTRIBUTION_DECREASE'&&source==='PRODUCTION_WALLET'?-amount:0;
    if(!fundingDelta&&!distributionDelta)return;
    if(!by[pid])by[pid]={party_id:pid,display_name:parties[pid]?String(parties[pid].display_name||''):pid,
      funding_due:0,distribution_balance:0,current_month_rows:[],history_rows:[]};
    by[pid].funding_due+=fundingDelta;by[pid].distribution_balance+=distributionDelta;
    by[pid].history_rows.push({entry_type:'SOURCE_ONLY_CLASSIFIED_FINANCE',funding_delta:fundingDelta,
      distribution_delta:distributionDelta,amount:amount,finance_id:id,
      comment:'Источник: Финансы; без дублирования проводки'});
  });
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
  ft.rows.forEach(function(r){if(!String(valueBy_(ft,r,'ID операции')||'').trim()||q046IsDeleted_(valueBy_(ft,r,'is_deleted'))||yes_(valueBy_(ft,r,'Фактическая операция')))return;const state=String(valueBy_(ft,r,'plan_state')||'').toUpperCase();if(['PLANNED','RESERVED'].indexOf(state)<0)return;const amount=q046Money_(valueBy_(ft,r,'Сумма'));if(!(amount>0))return;const due=valueBy_(ft,r,'due_date'),dueMs=q046DateMs_(due);if(end&&dueMs&&dueMs>end)return;out.push({finance_id:String(valueBy_(ft,r,'ID операции')||''),type:String(valueBy_(ft,r,'Тип')||''),amount:amount,due_date:formatDateMaybe_(due),state:state,order_id:String(valueBy_(ft,r,'№ заказа')||''),category:String(valueBy_(ft,r,'Категория')||''),comment:String(valueBy_(ft,r,'Описание')||''),created_by_user_id:String(valueBy_(ft,r,'created_by_user_id')||''),executed_finance_id:String(valueBy_(ft,r,'executed_finance_id')||'')});});return out;
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

const Q029_WALLET_PAIR_CONTRACT='Q029_FINANCE_IDSET_V1';

function q029SheetFinanceHistory_(financeTable){
  // Authoritative source is the actual Finance sheet rows, not _DOMAIN_HEADS.row_count
  // and not the legacy Wallet summary. This is a wallet.view-protected read only.
  const t=financeTable||q046SafeTable_('Финансы'),items=[];if(t)t.rows.forEach(function(r){
    const id=String(valueBy_(t,r,'ID операции')||'').trim();if(!id)return;
    items.push({finance_id:id,finance_date:formatDateMaybe_(valueBy_(t,r,'Дата')),
      type:String(valueBy_(t,r,'Тип')||''),amount:q046Money_(valueBy_(t,r,'Сумма')),
      category:String(valueBy_(t,r,'Категория')||''),comment:String(valueBy_(t,r,'Описание')||''),
      order_no:String(valueBy_(t,r,'№ заказа')||''),source:String(valueBy_(t,r,'Источник денег / оплаты')||''),
      cash_destination:String(valueBy_(t,r,'cash_destination')||''),
      actual:yes_(valueBy_(t,r,'Фактическая операция')),
      is_deleted:q046IsDeleted_(valueBy_(t,r,'is_deleted'))});
  });
  // Last sheet rows first; read-model does not alter source order or money.
  items.reverse();
  const h=q046SafeTable_('_DOMAIN_HEADS');
  let headCount=null,headRev=null;
  if(h)h.rows.some(function(r){
    if(String(valueBy_(h,r,'domain')||'')!=='finance')return false;
    const c=Number(valueBy_(h,r,'row_count'));
    headCount=Number.isFinite(c)?c:null;headRev=Number(valueBy_(h,r,'current_rev')||0);return true;
  });
  // Persisted client generation uses the physical ID set, never the HEAD row count
  // alone (old 116-row cache must remain invalid after HEAD reaches 106).
  const sourceHash=sha256Hex_(JSON.stringify(items.map(function(x){return x.finance_id;}).sort()));
  const stamp=q029FinanceSourceStamp_(t);
  if(stamp.row_count!==items.length||stamp.source_ids_hash!==sourceHash)throw new Error('FINANCE_SOURCE_TORN_READ');
  return {source:'GOOGLE_SHEETS_FINANCE',items:items,row_count:items.length,
    source_generation:'FINANCE_ROWS_SHA256_V1',source_ids_hash:sourceHash,
    source_rows_hash:stamp.source_rows_hash,
    head_row_count:headCount,head_current_rev:headRev,
    head_matches_source:headCount===null?null:headCount===items.length};
}

function q029CashSourceProvenance_(recon,financeTable,epochId){
  // Exactly the same authoritative source membership rules as cash math.
  let sourceRows=0,historicalRows=0,epochRows=0,manualRows=0,eligibleRows=0;
  if(financeTable)financeTable.rows.forEach(function(r){
    if(!String(valueBy_(financeTable,r,'ID операции')||'').trim())return;
    sourceRows++;
    const kind=q029FinanceCashEpochClass_(financeTable,r,epochId,recon);
    if(kind==='HISTORICAL'||kind==='DELETED'||kind==='NON_FACTUAL'){historicalRows++;return;}
    if(kind==='TAGGED')epochRows++;
    if(kind==='MANUAL_POST')manualRows++;
    if((kind==='TAGGED'||kind==='MANUAL_POST')&&
       q029FinanceCashDelta_(financeTable,r,epochId,recon)!==0)eligibleRows++;
  });
  return {source:'APPLIED_RECONCILIATION',reconciliation_id:epochId,
    applied_date:String(recon.applied_at||recon.effective_at||'').slice(0,10),
    historical_without_epoch_count:historicalRows,epoch_linked_count:epochRows,
    manual_post_cutover_count:manualRows,cash_movement_count:eligibleRows,
    source_finance_count:sourceRows};
}

function q046BuildCanonicalWallet_(body){
  const recon=q046LatestAppliedRecon_();if(!recon)throw new Error('APPLIED_RECONCILIATION_REQUIRED');const epochId=String(recon.reconciliation_id||''),opening=q046Money_(recon.production_cash_target),ft=q046SafeTable_('Финансы');let delta=0;if(ft)ft.rows.forEach(function(r){delta+=q046FinanceCashDelta_(ft,r,epochId,recon);});const physical=Math.round((opening+delta)*100)/100,reserved=Math.round(q046ReservedTotal_()*100)/100,free=Math.round((physical-reserved)*100)/100,forecastDate=q046ForecastDate_(body||{}),planned=q046PlannedFinance_(forecastDate),futureIn=planned.filter(function(x){return /^Приход$/i.test(x.type);}).reduce(function(s,x){return s+x.amount;},0),futureOut=planned.filter(function(x){return /^Расход$/i.test(x.type);}).reduce(function(s,x){return s+x.amount;},0),orders=q046OrderSummary_();let legacy={};try{const sh=sheet_('Кошелёк');legacy={wallet_b1:q046Money_(sh.getRange(1,2).getValue()),wallet_b2:q046Money_(sh.getRange(2,2).getValue())};}catch(_){}
  return {schema_version:Q046_WALLET.schemaVersion,contract_id:Q029_WALLET_PAIR_CONTRACT,source:'CANONICAL_RECONCILIATION_EPOCH',active_reconciliation_id:epochId,opening_cash:opening,post_cutover_cash_delta:Math.round(delta*100)/100,physical_cash:physical,reserved_total:reserved,free_now:free,partners:q046PartnerCards_(ft,recon),obligations:q046Obligations_(),planned_items:planned,allocations:q046AllocationRows_(),forecast:{horizon_end:Utilities.formatDate(forecastDate,spreadsheetTz_(),'yyyy-MM-dd'),expected_real_inflows:Math.round(futureIn*100)/100,planned_future_real_payments:Math.round(futureOut*100)/100,forecast_cash:Math.round((physical+futureIn-futureOut)*100)/100},orders:orders,finance_ledger:q029SheetFinanceHistory_(ft),source_provenance:q029HistoricPartnerCorrections_(ft,recon),cash_provenance:q029CashSourceProvenance_(recon,ft,epochId),legacy_compatibility_only:legacy};
}
