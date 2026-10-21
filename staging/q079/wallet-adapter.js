/* Q079 / Q029 B3 — isolated backend contract adapter (NO Google API, no production wiring).
   Caller must provide a server-owned authentication provider and durable CAS storage.
   This module NEVER trusts client-provided roles/permissions and fails closed on generation mismatch.
 */
'use strict';
const engine = require('./wallet-engine.js');
const PERMISSIONS = Object.freeze({view:'wallet.view',mutate:'wallet.add'});
// Prevent a caller from spoofing the store's type label to bind this rehearsal adapter to live I/O.
const ISOLATED_STORES = new WeakSet();
function abort(code){const err=new Error(code);err.code=code;throw err;}
function string(x,label){if(typeof x!=='string'||!x.trim())abort(label+'_REQUIRED');return x;}
function object(x,label){if(!x||typeof x!=='object'||Array.isArray(x))abort(label+'_OBJECT_REQUIRED');return x;}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function clone(x){return JSON.parse(JSON.stringify(x));}
function assertGeneration({provided,active,stagingMasterId,expectedMasterId}){
  if(!provided||provided!==active)abort('BUSINESS_GENERATION_MISMATCH');
  if(!stagingMasterId||stagingMasterId!==expectedMasterId)abort('MASTER_ID_PIN_MISMATCH');
}
// No token values, role lists or retained user data are persisted here; auth is supplied by trusted backend.
function assertPrincipal(principal,deviceId,requiredPermission,actionType){
  object(principal,'SERVER_SESSION');
  if(principal.serverVerified!==true)abort('SESSION_NOT_SERVER_VERIFIED');
  string(principal.userId,'USER_ID');
  if(principal.status!=='ACTIVE'||principal.revoked===true)abort('SESSION_DISABLED');
  if(!principal.deviceId||principal.deviceId!==deviceId)abort('DEVICE_BINDING_MISMATCH');
  if(!Number.isSafeInteger(principal.expiresAtMs)||principal.expiresAtMs<=Date.now())abort('SESSION_EXPIRED');
  const permissions=Array.isArray(principal.permissions)?principal.permissions:[];
  if(principal.role!=='ADMIN1'&& !permissions.includes(requiredPermission))abort('PERMISSION_DENIED');
  if(actionType&&principal.role!=='ADMIN1'&&!permissions.includes(engine.REQUIRED_PERMISSION[actionType]))abort('PERMISSION_DENIED');
  // The remote caller cannot select an ADMIN1 role or elevate via userId; server owns principal.
  if(principal.role==='ADMIN1'&&principal.userId!=='ADMIN1')abort('ADMIN1_IDENTITY_MISMATCH');
  return {userId:principal.userId,role:principal.role,permissions:permissions.slice()};
}
function denyImpersonation(payload){
  const forbidden=['actor','role','permissions','userId','isAdmin','serverVerified','masterId','newMasterId','authContext'];
  if(forbidden.some(k=>own(payload,k)))abort('CLIENT_IDENTITY_OR_MASTER_SPOOF');
}
function createInMemoryStore({generation,masterId}){
  string(generation,'GENERATION');string(masterId,'MASTER_ID');
  let state=engine.opening(generation);
  const store = {
    type:'ISOLATED_MEMORY_ONLY',generation,masterId,
    load(){return clone(state);},
    cas(expectedRevision,candidate){
      if(state.revision!==expectedRevision)abort('CAS_REVISION_CONFLICT');
      if(candidate.generation!==generation||candidate.revision!==expectedRevision+1)abort('CAS_GENERATION_OR_REVISION_INVALID');
      state=clone(candidate);return clone(state);
    },
    snapshot(){return clone(state);}
  };
  ISOLATED_STORES.add(store);
  return store;
}
function createAdapter({store,authenticate,activeGeneration,stagingMasterId,writeEnabled=false}){
  object(store,'STORE');
  if(typeof authenticate!=='function')abort('TRUSTED_AUTH_PROVIDER_REQUIRED');
  string(activeGeneration,'ACTIVE_GENERATION');string(stagingMasterId,'STAGING_MASTER_ID');
  if(store.type!=='ISOLATED_MEMORY_ONLY'||!ISOLATED_STORES.has(store))abort('B3_NON_ISOLATED_STORE_FORBIDDEN');
  if(store.generation!==activeGeneration||store.masterId!==stagingMasterId)abort('STORE_PIN_MISMATCH');
  async function context(request,permission,type){
    object(request,'REQUEST');
    string(request.sessionToken,'SESSION_TOKEN');string(request.deviceId,'DEVICE_ID');
    assertGeneration({provided:request.businessGeneration,active:activeGeneration,
      stagingMasterId:store.masterId,expectedMasterId:stagingMasterId});
    const principal=await authenticate({sessionToken:request.sessionToken,deviceId:request.deviceId});
    return assertPrincipal(principal,request.deviceId,permission,type);
  }
  async function read(request){
    const principal=await context(request,PERMISSIONS.view);
    denyImpersonation(request);
    const state=store.load();
    if(state.generation!==activeGeneration)abort('STORE_GENERATION_MISMATCH');
    return {ok:true,mode:'STAGING_READ_ONLY',generation:state.generation,
      revision:state.revision,viewerId:principal.userId,summary:engine.summarize(state)};
  }
  async function commit(request){
    if(!writeEnabled)abort('B3_WRITE_GATE_CLOSED');
    object(request,'REQUEST');object(request.event,'EVENT');
    denyImpersonation(request.event);
    denyImpersonation(request);
    if(request.event.generation!==request.businessGeneration)abort('BUSINESS_GENERATION_MISMATCH');
    const principal=await context(request,PERMISSIONS.mutate,request.event.type);
    const state=store.load();
    if(state.generation!==activeGeneration)abort('STORE_GENERATION_MISMATCH');
    const authenticatedEvent={...clone(request.event),actor:principal};
    const output=engine.apply(state,authenticatedEvent);
    if(output.duplicate)return {ok:true,duplicate:true,revision:state.revision,summary:output.summary};
    const accepted=store.cas(state.revision,output.state);
    return {ok:true,duplicate:false,revision:accepted.revision,effects:output.effects,
      issues:output.issues,summary:engine.summarize(accepted)};
  }
  return Object.freeze({read,commit,writeEnabled,masterId:stagingMasterId,generation:activeGeneration});
}
function partitionOfflineQueue({entries,activeGeneration}){
  string(activeGeneration,'ACTIVE_GENERATION');if(!Array.isArray(entries))abort('OUTBOX_ENTRIES_ARRAY_REQUIRED');
  const fresh=[],quarantine=[];
  for(const raw of entries){const entry=clone(object(raw,'OUTBOX_ENTRY'));
    if(entry.businessGeneration===activeGeneration && entry.event?.generation===activeGeneration) fresh.push(entry);
    else quarantine.push({...entry,syncStatus:'QUARANTINED_OLD_GENERATION',autoReplay:false});
  }
  return {fresh,quarantine}; // leaves original untouched; actual device storage handling remains B4/B5.
}
module.exports={createAdapter,createInMemoryStore,partitionOfflineQueue,assertPrincipal,assertGeneration};
