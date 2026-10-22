/* Q079 Wallet2 — source-only GAS adapter for EXISTING Production backend.
 * No live deployment or setup. Only the two minimal NEW wallet sheets: _W2_CONTROL, _W2_EVENTS.
 * Old Finance, Orders, users, NOM, other tabs and snapshot NEVER READ as wallet source.
 * Safe configuration requires separately approved activation; no migration/reset endpoint.
 * Inject existing server functions: authSession_, hasPermission_, LockService, spreadsheet.
 * Sheets row: _W2_CONTROL A2:G2 = [generation,status,writeEnabled,startDate,timezone,currency,ownerApproval]
 * Event ledger: _W2_EVENTS A1='event_json'; A2.. = one immutable complete JSON record per row.
 */
'use strict';
const {opening,apply,summarize,REQUIRED_PERMISSION}=require('./wallet-engine.js');
const CONTRACT='Q079-WALLET2-API-v1';
const CONTROL='_W2_CONTROL',EVENTS='_W2_EVENTS';
// Existing USER wallet.add is not a grant to create loans, stock liabilities or custody movements.
// Remain restrictive until the owner approves type-specific mapping; do not alter the users sheet.
const USER_ALLOWED=new Set(['CASH_RECEIPT','OPERATING_EXPENSE']);
const SENSITIVE=new Set(Object.keys(REQUIRED_PERMISSION).filter(type=>!USER_ALLOWED.has(type)));
function reject(message){const e=new Error(message);e.code=message;throw e;}
function str(v,label){if(typeof v!=='string'||!v.trim())reject(label+'_REQUIRED');return v;}
function obj(v,label){if(!v||typeof v!=='object'||Array.isArray(v))reject(label+'_OBJECT_REQUIRED');return v;}
function create({getSheet,authSession,hasPermission,lock,sha256,clock}={}){
 if([getSheet,authSession,hasPermission,sha256].some(x=>typeof x!=='function')||!lock||typeof lock.waitLock!=='function'||typeof lock.releaseLock!=='function')reject('TRUSTED_EXISTING_BACKEND_REQUIRED');
 const now=clock||(()=>new Date().toISOString());
 function tab(name){const sheet=getSheet(name);if(!sheet)reject('W2_NEW_SCHEMA_NOT_INSTALLED');return sheet;}
 function config(){
  const row=tab(CONTROL).getRange(2,1,1,7).getValues()[0]||[];
  const x={generation:String(row[0]||''),status:String(row[1]||''),writeEnabled:row[2]===true,startDate:String(row[3]||''),timezone:String(row[4]||''),currency:String(row[5]||''),approval:String(row[6]||'')};
  if(!/^Q079[.:-][A-Za-z0-9.:-]+$/.test(x.generation)||!['STAGING_ONLY','ACTIVE_V2'].includes(x.status)||x.startDate!=='2026-10-21'||x.timezone!=='Asia/Tomsk'||x.currency!=='RUB')reject('W2_CONTROL_INVALID');
  return x;
 }
 function auth(req,key){
  obj(req,'REQUEST');str(req.session_token,'SESSION_TOKEN');str(req.device_id,'DEVICE_ID');
  const a=authSession(req.session_token,key,req.request_id||'Q079-READ');
  if(!a?.user?.active||!a?.user?.userId||!a.deviceId||String(a.deviceId)!==req.device_id)reject('W2_SESSION_DEVICE_OR_USER_INVALID');
  if(!hasPermission(a.user,key))reject('PERMISSION_DENIED:'+key);
  return a;
 }
 function epoch(req,c){if(req.business_generation!==c.generation)reject('BUSINESS_GENERATION_MISMATCH');}
 function rawEvents(){const t=tab(EVENTS),count=t.getLastRow()-1;
  if(count<0||t.getRange(1,1).getValue()!=='event_json')reject('W2_EVENTS_HEADER_MISSING');
  if(count===0)return [];
  const a=t.getRange(2,1,count,1).getValues();
  return a.map((r,i)=>{const s=r?.[0];if(typeof s!=='string'||!s||s.length>48000)reject('W2_EVENT_CORRUPTED_AT_ROW_'+(i+2));
   let v;try{v=JSON.parse(s)}catch(_){reject('W2_EVENT_JSON_CORRUPTED_AT_ROW_'+(i+2));}
   if(v.version!==1||typeof v.hash!=='string'||v.hash!==sha256(JSON.stringify(v.event))||!v.event)reject('W2_EVENT_HASH_INVALID_AT_ROW_'+(i+2));
   return v;});
 }
 function state(c){let s=opening(c.generation);const raws=rawEvents();
  for(const [index,r] of raws.entries()){
   const before=s.revision;
   if(r.event.expectedRevision!==before)reject('W2_LEDGER_REVISION_GAP_'+index);
   const out=apply(s,r.event);
   if(out.duplicate||out.state.revision!==before+1)reject('W2_LEDGER_NONMONOTONIC_'+index);
   s=out.state;
  }
  return s;
 }
 function totals(map){return Object.values(map||{}).reduce((a,b)=>a+Number(b||0),0);}
 function response(s,c){const z=summarize(s);
  return {ok:true,contract:CONTRACT,generation:c.generation,revision:s.revision,openingStatus:s.openingStatus,
   mode:c.status,summary:z,ledgers:{supplierDebtKop:totals(s.supplierDebt),loanDebtKop:totals(s.loanDebt),wageDebtKop:totals(s.wageDebt),partnerReturnableKop:totals(s.partnerReturnable),partnerProfitDueKop:totals(s.partnerProfitDue),plannedKop:totals(Object.fromEntries(Object.entries(s.plans).map(([k,v])=>[k,v.remainingKop]))),periodIncomeKop:null,periodExpenseKop:null},
   recentEvents:s.events.slice(-30).reverse().map(e=>({eventId:e.eventId,type:e.type,effectiveDate:e.effectiveDate})),
   legacyFinanceRowsRead:0,legacyOrdersRowsRead:0};
 }
 function bootstrap(req){auth(req,'wallet.view');const c=config();const ledger=state(c);return {ok:true,contract:CONTRACT,generation:c.generation,mode:c.status,writeEnabled:c.status==='ACTIVE_V2'&&c.writeEnabled&&c.approval==='GRANTED',openingStatus:ledger.openingStatus,revision:ledger.revision};}
 function read(req){auth(req,'wallet.view');const c=config();epoch(req,c);return response(state(c),c);}
 function commit(req){
  obj(req,'REQUEST');obj(req.event,'EVENT');
  // Do not accept a caller's identity/role/masterId; only the session resolver supplies them.
  for(const k of ['actor','role','permissions','userId','masterId','authContext'])if(Object.prototype.hasOwnProperty.call(req,k)||Object.prototype.hasOwnProperty.call(req.event,k))reject('W2_CLIENT_IDENTITY_SPOOF');
  const a=auth(req,'wallet.add');const requested=req.event.type;
  if(!REQUIRED_PERMISSION[requested])reject('W2_UNSUPPORTED_EVENT');
  if(SENSITIVE.has(requested)&&a.user.role!=='ADMIN1')reject('W2_SENSITIVE_ADMIN1_ONLY');
  lock.waitLock(20000);
  try{
   // Revalidate live authentication, generation and mutation permission inside lock.
   const actual=auth(req,'wallet.add'),c=config();epoch(req,c);
   if(c.status!=='ACTIVE_V2'||c.writeEnabled!==true||c.approval!=='GRANTED')reject('W2_WRITE_GATE_CLOSED');
   if(req.event.generation!==c.generation)reject('BUSINESS_GENERATION_MISMATCH');
   if(SENSITIVE.has(requested)&&actual.user.role!=='ADMIN1')reject('W2_SENSITIVE_ADMIN1_ONLY');
   if(actual.user.userId!==a.user.userId||actual.deviceId!==a.deviceId)reject('W2_PRINCIPAL_CHANGED');
   const s=state(c);
   const event={...req.event,actor:{userId:String(actual.user.userId),role:String(actual.user.role),permissions:[REQUIRED_PERMISSION[requested]]}};
   const applied=apply(s,event);
   if(applied.duplicate)return {...response(s,c),duplicate:true,acceptedEventId:event.eventId,acceptedRequestId:event.requestId};
   const e=Object.freeze({version:1,event,hash:sha256(JSON.stringify(event)),acceptedAt:now()});
   const payload=JSON.stringify(e);if(payload.length>48000)reject('W2_EVENT_TOO_LARGE');
   const t=tab(EVENTS),row=t.getLastRow()+1;
   // One self-contained authoritative cell; no multi-tab partial projections to double-post.
   t.getRange(row,1).setValue(payload);
   if(t.getRange(row,1).getValue()!==payload)reject('W2_EVENT_READBACK_FAILED_RETRY_WITH_SAME_REQUEST');
   return {...response(applied.state,c),duplicate:false,acceptedEventId:event.eventId,acceptedRequestId:event.requestId};
  }finally{lock.releaseLock();}
 }
 return Object.freeze({bootstrap,read,commit,CONTRACT,CONTROL,EVENTS});
}
module.exports={create,CONTRACT,CONTROL,EVENTS,SENSITIVE,USER_ALLOWED};
