/*
 * Q079 B3.3 - no-production, dependency-injected staging schema gateway.
 * This is NOT a deployable Apps Script backend; it does not import Google APIs,
 * does not expose business rows, and has NO write method. This module also cannot
 * elevate a legacy broad Wallet edit permission into new profit/settlement rights.
 */
'use strict';
const STAGE_ID = '1EOe47err4z3bPWQ-GJLl6cJfE9mwE8kkM3ZPFegR0JE';
const LEGACY_ID = '177IVzLUaNrzKScoRo0CjT5Zo7tJm5Bo0am2z9whAWdg';
const GENERATION = 'Q079.STAGING.20261021.001';
const PINNED_HEADER_SHEETS = Object.freeze(['Номенклатура','_NOM_SEARCH','_BUSINESS_GENERATIONS','_WALLET_EVENTS']);
const FORBIDDEN_FIELDS = Object.freeze(['actor','userId','role','permissions','isAdmin','masterId',
  'sourceMasterId','targetMasterId','spreadsheetId','authContext','event','outbox','changes','operations']);
const REQUIRED_CONTROL = Object.freeze({
  generation_id:GENERATION,
  timezone:'Asia/Tomsk',currency:'RUB',opening_status:'UNCONFIRMED',
  dataset_role:'STAGING_ONLY',business_write_policy:'LOCKED_NO_BUSINESS_MUTATIONS',
  production_binding:'FORBIDDEN',nomenclature_copy:'NOT_COPIED',rights_copy:'NOT_COPIED',
  cutover_status:'NO_GO',owner_authorization:'NOT_GRANTED'
});
function reject(code){const e=new Error(code);e.code=code;throw e;}
function record(x,name){if(!x||typeof x!=='object'||Array.isArray(x))reject(name+'_OBJECT_REQUIRED');return x;}
function nonempty(x,name){if(typeof x!=='string'||!x.trim())reject(name+'_REQUIRED');return x;}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function safeInt(n,name){if(!Number.isSafeInteger(n)||n<0)reject(name+'_INTEGER_INVALID');return n;}
function controlGate(row){
  record(row,'STAGE_CONTROL');
  for(const [k,v] of Object.entries(REQUIRED_CONTROL))if(row[k]!==v)reject('STAGE_CONTROL_NO_GO_'+k.toUpperCase());
  for(const field of ['historical_finance_rows','historical_order_rows','historical_stock_rows']){
    if(String(row[field])!=='0')reject('HISTORICAL_BUSINESS_ROWS_FORBIDDEN');
  }
  return {ok:true,writeAllowed:false,cutoverAllowed:false,openingConfirmed:false,generation:GENERATION};
}
function rightsGate(principal,deviceId,nowMs){
  record(principal,'TRUSTED_PRINCIPAL');
  if(principal.serverVerified!==true)reject('NOT_SERVER_VERIFIED');
  if(principal.status!=='ACTIVE'||principal.revoked===true)reject('USER_OR_SESSION_DISABLED');
  nonempty(principal.userId,'USER_ID');
  if(principal.deviceId!==deviceId)reject('DEVICE_MISMATCH');
  if(!Number.isSafeInteger(principal.expiresAtMs)||principal.expiresAtMs<=nowMs)reject('SESSION_EXPIRED');
  if(principal.role==='ADMIN1'&&principal.userId!=='ADMIN1')reject('ADMIN_ID_MISMATCH');
  const perms=Array.isArray(principal.permissions)?principal.permissions:[];
  if(principal.role!=='ADMIN1'&&!perms.includes('wallet.view'))reject('WALLET_VIEW_DENIED');
  // Required new rights are deliberately not inferred from legacy wallet.add/edit.
  return {userId:principal.userId,displayRole:principal.role};
}
function createReadOnlyGateway({authenticate,readStageControl,readStageHeader,now=()=>Date.now()}){
  if(typeof authenticate!=='function'||typeof readStageControl!=='function'||
     typeof readStageHeader!=='function'||typeof now!=='function')reject('TRUSTED_READ_DEPENDENCIES_REQUIRED');
  async function query(request){
    record(request,'REQUEST');
    for(const k of FORBIDDEN_FIELDS)if(own(request,k))reject('CLIENT_UNTRUSTED_FIELD_FORBIDDEN');
    const allowed=new Set(['action','businessGeneration','deviceId','sessionToken','sheetName']);
    if(Object.keys(request).some(k=>!allowed.has(k)))reject('UNRECOGNIZED_REQUEST_FIELD');
    if(request.businessGeneration!==GENERATION)reject('BUSINESS_GENERATION_MISMATCH');
    if(request.action!=='stage.status'&&request.action!=='stage.header')reject('STAGE_READ_ACTION_ONLY');
    nonempty(request.deviceId,'DEVICE_ID');nonempty(request.sessionToken,'SESSION_TOKEN');
    if(request.action==='stage.status'&&own(request,'sheetName'))reject('UNEXPECTED_SHEET_SELECTION');
    if(request.action==='stage.header'&&!PINNED_HEADER_SHEETS.includes(request.sheetName))
      reject('HEADER_SHEET_NOT_WHITELISTED');
    const t=now();if(!Number.isSafeInteger(t)||t<0)reject('SERVER_TIME_INVALID');
    const principal=rightsGate(await authenticate({sessionToken:request.sessionToken,deviceId:request.deviceId}),request.deviceId,t);
    const stageRow=await readStageControl({spreadsheetId:STAGE_ID,sheetName:'_BUSINESS_GENERATIONS'});
    const gate=controlGate(stageRow);
    if(request.action==='stage.status')return Object.freeze({ok:true,mode:'STAGING_READ_ONLY',
      generation:GENERATION,opening:'UNCONFIRMED',cutover:'NO_GO',newMaster:STAGE_ID,actorId:principal.userId,
      writeAllowed:false});
    const headers=await readStageHeader({spreadsheetId:STAGE_ID,sheetName:request.sheetName});
    if(!Array.isArray(headers)||headers.length===0||headers.some(x=>typeof x!=='string'||!x.trim()))
      reject('STAGE_HEADER_INVALID');
    return Object.freeze({ok:true,mode:'STAGING_HEADER_ONLY',generation:GENERATION,
      sheetName:request.sheetName,headers:headers.slice(),actorId:principal.userId,
      writeAllowed:gate.writeAllowed});
  }
  return Object.freeze({query,actions:Object.freeze(['stage.status','stage.header']),writeAllowed:false});
}
function auditCatalogMetadata(facts){
  record(facts,'CATALOG_FACTS');
  for(const key of ['sourceItems','indexRows','uniqueIds','idFormulaCells','indexArrayFormulas',
    'missingIndexRows','indexBeyondIdRows','stageNomRows','stageIndexRows','stageNomCapacity','stageIndexCapacity'])
    safeInt(facts[key],key.toUpperCase());
  const blockers=[];
  if(facts.sourceItems===0||facts.sourceItems!==facts.indexRows||facts.uniqueIds!==facts.sourceItems)
    blockers.push('SOURCE_CATALOG_ID_OR_INDEX_PARITY');
  if(facts.missingIndexRows||facts.indexBeyondIdRows||facts.indexArrayFormulas!==1)
    blockers.push('SOURCE_INDEX_GENERATOR_PARITY');
  if(facts.stageNomCapacity<facts.sourceItems+1||facts.stageIndexCapacity<facts.indexRows+1)
    blockers.push('STAGING_GRID_CAPACITY');
  if(facts.idFormulaCells&&facts.stageNomFormulaCells!==facts.idFormulaCells)
    blockers.push('FORMULA_ID_PRESERVATION_REQUIRED');
  if(facts.stageNomRows!==facts.sourceItems||facts.stageIndexRows!==facts.indexRows)
    blockers.push('NOM_INDEX_NOT_COPIED_OR_OUT_OF_SYNC');
  if(facts.stageIndexArrayFormulas!==1)blockers.push('STAGING_INDEX_FORMULA_MISSING');
  return Object.freeze({ready:blockers.length===0,blockers,sourceItems:facts.sourceItems,
    stagedItems:facts.stageNomRows,formulaIdCells:facts.idFormulaCells});
}
function auditIdentityMetadata(facts){
  record(facts,'IDENTITY_FACTS');
  for(const k of ['sourceAccounts','sourceActiveAccounts','sourceDevices','sourceSessions',
    'unmatchedDeviceAccounts','unmatchedSessionAccounts','stagingAccounts','stagingDevices',
    'stagingRightsRows','stagingSessions'])safeInt(facts[k],k.toUpperCase());
  const blockers=[];
  if(facts.unmatchedDeviceAccounts||facts.unmatchedSessionAccounts)blockers.push('SOURCE_ACCOUNT_LINKS_MISSING');
  if(facts.stagingAccounts!==facts.sourceAccounts||facts.stagingDevices!==facts.sourceDevices||
     facts.stagingRightsRows!==facts.sourceAccounts)blockers.push('STAGING_RIGHTS_OR_DEVICE_PARITY_MISSING');
  if(facts.stagingSessions!==0)blockers.push('SESSION_TOKEN_COPY_NOT_AUTHORIZED');
  if(facts.permissionPolicyApproved!==true)blockers.push('NEW_SENSITIVE_RIGHTS_POLICY_NOT_APPROVED');
  if(facts.stableUserIdsCompared!==true)blockers.push('STABLE_USER_ID_READBACK_REQUIRED');
  return Object.freeze({ready:blockers.length===0,blockers,accountsChecked:facts.sourceAccounts,
    devicesChecked:facts.sourceDevices,sessionsInspected:facts.sourceSessions});
}
function summarizeReleaseGate({control,cutoverGateStatuses,catalog,identity,independentQa=false,ownerDangerousApproval=false}){
  controlGate(control);record(catalog,'CATALOG_AUDIT');record(identity,'IDENTITY_AUDIT');
  if(!Array.isArray(cutoverGateStatuses)||cutoverGateStatuses.length!==12)
    reject('EXACT_CUTOVER_GATE_MATRIX_REQUIRED');
  const pending=cutoverGateStatuses.filter(s=>s!=='PASS').length;
  // Current staging is NEVER authorized for writes. A production transition requires
  // a NEW, explicitly authorized generation/mode handshake and separate audited route.
  return Object.freeze({safeToPrepare:true,productionGo:false,pendingGates:pending,
    catalogReady:catalog.ready===true,identityReady:identity.ready===true,
    qaComplete:independentQa===true,ownerApproved:ownerDangerousApproval===true,
    reason:'STAGING_GENERATION_IS_NOT_A_PRODUCTION_DATASET'});
}
module.exports={STAGE_ID,LEGACY_ID,GENERATION,PINNED_HEADER_SHEETS,
  REQUIRED_CONTROL,controlGate,rightsGate,createReadOnlyGateway,
  auditCatalogMetadata,auditIdentityMetadata,summarizeReleaseGate};
