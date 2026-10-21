'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const mod=require('../staging/q079/stage-readonly-gateway.js');
const {GENERATION,STAGE_ID,LEGACY_ID,REQUIRED_CONTROL,controlGate,createReadOnlyGateway,
  auditCatalogMetadata,auditIdentityMetadata,summarizeReleaseGate}=mod;
const t=Date.parse('2026-10-21T07:00:00Z');
const row=()=>({...REQUIRED_CONTROL,historical_finance_rows:'0',historical_order_rows:'0',historical_stock_rows:'0'});
const admin={serverVerified:true,userId:'ADMIN1',role:'ADMIN1',status:'ACTIVE',revoked:false,
  deviceId:'DEVICE-001',expiresAtMs:t+60000,permissions:[]};
const user={...admin,userId:'SYNTHETIC-U',role:'USER',permissions:['wallet.view']};
const req=(x={})=>({action:'stage.status',businessGeneration:GENERATION,
  sessionToken:'SYNTHETIC-SESSION-NOT-REAL',deviceId:'DEVICE-001',...x});
function create({principal=admin,control=row(),headers=['A','B'],authError=null}={}){
  const calls=[];
  const gateway=createReadOnlyGateway({
    authenticate:async arg=>{calls.push('AUTH');if(authError)throw authError;return principal;},
    readStageControl:async arg=>{calls.push('CONTROL:'+arg.spreadsheetId);return control;},
    readStageHeader:async arg=>{calls.push('HEADER:'+arg.sheetName);return headers;},
    now:()=>t
  });
  return {gateway,calls};
}
async function err(p,code){await assert.rejects(p,e=>e.code===code);}
function catalog(x={}){return {sourceItems:12,indexRows:12,uniqueIds:12,idFormulaCells:2,
  indexArrayFormulas:1,missingIndexRows:0,indexBeyondIdRows:0,
  stageNomRows:0,stageIndexRows:0,stageNomCapacity:2000,stageIndexCapacity:50001,
  stageNomFormulaCells:0,stageIndexArrayFormulas:0,...x};}
function identity(x={}){return {sourceAccounts:3,sourceActiveAccounts:2,
  sourceDevices:4,sourceSessions:7,unmatchedDeviceAccounts:0,unmatchedSessionAccounts:0,
  stagingAccounts:0,stagingDevices:0,stagingRightsRows:0,stagingSessions:0,
  permissionPolicyApproved:false,stableUserIdsCompared:false,...x};}

test('01 owner controls remain locked and unconfirmed',()=>{const x=controlGate(row());assert.equal(x.writeAllowed,false);assert.equal(x.cutoverAllowed,false);});
test('02 historic finance count above zero immediately fails closed',()=>{assert.throws(()=>controlGate({...row(),historical_finance_rows:'1'}),{code:'HISTORICAL_BUSINESS_ROWS_FORBIDDEN'});});
test('03 source master could never be substituted for new staging master',async()=>{const {gateway,calls}=create();const r=await gateway.query(req());assert.equal(r.newMaster,STAGE_ID);assert.notEqual(r.newMaster,LEGACY_ID);assert.equal(calls[1],'CONTROL:'+STAGE_ID);});
test('04 status returns only a safe summary and no token',async()=>{const {gateway}=create();const r=await gateway.query(req());assert.equal(r.mode,'STAGING_READ_ONLY');assert.equal(r.cutover,'NO_GO');assert.equal(JSON.stringify(r).includes('SYNTHETIC-SESSION'),false);});
test('05 old generation is rejected before any auth or source reads',async()=>{const {gateway,calls}=create();await err(gateway.query(req({businessGeneration:'OLD-GENERATION'})),'BUSINESS_GENERATION_MISMATCH');assert.equal(calls.length,0);});
test('06 missing generation fails closed',async()=>{const {gateway}=create();await err(gateway.query(req({businessGeneration:undefined})),'BUSINESS_GENERATION_MISMATCH');});
test('07 never accept an arbitrary write action',async()=>{const {gateway,calls}=create();await err(gateway.query(req({action:'wallet.event.commit'})),'STAGE_READ_ACTION_ONLY');assert.equal(calls.length,0);});
test('08 old outbox item in read request is forbidden',async()=>{const {gateway}=create();await err(gateway.query(req({outbox:[{generation:'OLD'}]})),'CLIENT_UNTRUSTED_FIELD_FORBIDDEN');});
test('09 client-provided ADMIN role cannot escalate',async()=>{const {gateway}=create({principal:user});await err(gateway.query(req({role:'ADMIN1'})),'CLIENT_UNTRUSTED_FIELD_FORBIDDEN');});
test('10 client-provided master ID is refused',async()=>{const {gateway}=create();await err(gateway.query(req({masterId:STAGE_ID})),'CLIENT_UNTRUSTED_FIELD_FORBIDDEN');});
test('11 user marked active but not server verified is rejected',async()=>{const {gateway}=create({principal:{...user,serverVerified:'true'}});await err(gateway.query(req()),'NOT_SERVER_VERIFIED');});
test('12 inactive user access is rejected',async()=>{const {gateway}=create({principal:{...user,status:'INACTIVE'}});await err(gateway.query(req()),'USER_OR_SESSION_DISABLED');});
test('13 expired and fractional session expiry rejected',async()=>{for(const ms of [t,t-10,t+0.5,NaN,Infinity]){const {gateway}=create({principal:{...user,expiresAtMs:ms}});await err(gateway.query(req()),'SESSION_EXPIRED');}});
test('14 mismatched device rejected',async()=>{const {gateway}=create({principal:{...user,deviceId:'DEVICE-OTHER'}});await err(gateway.query(req()),'DEVICE_MISMATCH');});
test('15 USER without wallet.view denied',async()=>{const {gateway}=create({principal:{...user,permissions:['wallet.add']}});await err(gateway.query(req()),'WALLET_VIEW_DENIED');});
test('16 USER with verified view allowed for status',async()=>{const {gateway}=create({principal:user});const r=await gateway.query(req());assert.equal(r.actorId,'SYNTHETIC-U');});
test('17 spoofed ADMIN1 label with incorrect trusted ID denied',async()=>{const {gateway}=create({principal:{...admin,userId:'SYNTHETIC-U'}});await err(gateway.query(req()),'ADMIN_ID_MISMATCH');});
test('18 limited header inspection succeeds without business rows',async()=>{const {gateway,calls}=create({headers:['nom_id','category']});const r=await gateway.query(req({action:'stage.header',sheetName:'Номенклатура'}));assert.deepEqual(r.headers,['nom_id','category']);assert.deepEqual(calls,['AUTH','CONTROL:'+STAGE_ID,'HEADER:Номенклатура']);});
test('19 user rights data sheet is not exposed',async()=>{const {gateway,calls}=create();await err(gateway.query(req({action:'stage.header',sheetName:'Пользователи и права'})),'HEADER_SHEET_NOT_WHITELISTED');assert.equal(calls.length,0);});
test('20 Wallet events payload rows cannot be fetched via header endpoint',async()=>{const {gateway}=create();await err(gateway.query(req({action:'stage.event',sheetName:'_WALLET_EVENTS'})),'STAGE_READ_ACTION_ONLY');});
test('21 missing/altered stage lock fails',async()=>{for(const [key,v] of [['production_binding','ACTIVE'],['owner_authorization','GRANTED'],['business_write_policy','OPEN'],['opening_status','CONFIRMED']]){const {gateway}=create({control:{...row(),[key]:v}});await err(gateway.query(req()),'STAGE_CONTROL_NO_GO_'+key.toUpperCase());}});
test('22 stage event row count must remain zero',()=>{assert.throws(()=>controlGate({...row(),historical_stock_rows:'4'}),{code:'HISTORICAL_BUSINESS_ROWS_FORBIDDEN'});});
test('23 audit flags source ID/index mismatch',()=>{const r=auditCatalogMetadata(catalog({indexRows:11}));assert.ok(r.blockers.includes('SOURCE_CATALOG_ID_OR_INDEX_PARITY'));});
test('24 audit flags missing index array formula',()=>{const r=auditCatalogMetadata(catalog({indexArrayFormulas:0}));assert.ok(r.blockers.includes('SOURCE_INDEX_GENERATOR_PARITY'));});
test('25 current zero stage data remains NO-GO despite matched source index',()=>{const r=auditCatalogMetadata(catalog());assert.equal(r.ready,false);assert.ok(r.blockers.includes('NOM_INDEX_NOT_COPIED_OR_OUT_OF_SYNC'));assert.ok(r.blockers.includes('FORMULA_ID_PRESERVATION_REQUIRED'));});
test('26 catalog readiness requires preserved computed IDs + ARRAYFORMULA',()=>{const r=auditCatalogMetadata(catalog({stageNomRows:12,stageIndexRows:12,stageNomFormulaCells:2,stageIndexArrayFormulas:1}));assert.equal(r.ready,true);});
test('27 grid capacity too small fails',()=>{const r=auditCatalogMetadata(catalog({stageNomCapacity:10,stageIndexCapacity:9}));assert.ok(r.blockers.includes('STAGING_GRID_CAPACITY'));});
test('28 rights and device parity pending until deliberate migration',()=>{const r=auditIdentityMetadata(identity());assert.equal(r.ready,false);assert.ok(r.blockers.includes('STAGING_RIGHTS_OR_DEVICE_PARITY_MISSING'));});
test('29 copying old session hashes to stage is not approved by default',()=>{const r=auditIdentityMetadata(identity({stagingAccounts:3,stagingDevices:4,stagingRightsRows:3,stagingSessions:7,permissionPolicyApproved:true,stableUserIdsCompared:true}));assert.ok(r.blockers.includes('SESSION_TOKEN_COPY_NOT_AUTHORIZED'));});
test('30 explicit new rights approval is mandatory despite legacy wallet.add',()=>{const r=auditIdentityMetadata(identity({stagingAccounts:3,stagingDevices:4,stagingRightsRows:3,stableUserIdsCompared:true}));assert.ok(r.blockers.includes('NEW_SENSITIVE_RIGHTS_POLICY_NOT_APPROVED'));});
test('31 identity reconciles only after explicit policy + stable ID checks, no token copies',()=>{const r=auditIdentityMetadata(identity({stagingAccounts:3,stagingDevices:4,stagingRightsRows:3,stagingSessions:0,permissionPolicyApproved:true,stableUserIdsCompared:true}));assert.equal(r.ready,true);});
test('32 even if all twelve gates are marked passed, staging generation never turns production on',()=>{const c=auditCatalogMetadata(catalog({stageNomRows:12,stageIndexRows:12,stageNomFormulaCells:2,stageIndexArrayFormulas:1}));const a=auditIdentityMetadata(identity({stagingAccounts:3,stagingDevices:4,stagingRightsRows:3,permissionPolicyApproved:true,stableUserIdsCompared:true}));const r=summarizeReleaseGate({control:row(),cutoverGateStatuses:Array(12).fill('PASS'),catalog:c,identity:a,independentQa:true,ownerDangerousApproval:true});assert.equal(r.productionGo,false);});
test('33 twelve-gate current matrix reports all pending',()=>{const r=summarizeReleaseGate({control:row(),cutoverGateStatuses:Array(12).fill('PENDING'),catalog:{ready:false},identity:{ready:false}});assert.equal(r.pendingGates,12);assert.equal(r.productionGo,false);});
test('34 malformed cutover gate matrix rejected',()=>{assert.throws(()=>summarizeReleaseGate({control:row(),cutoverGateStatuses:['PENDING'],catalog:{},identity:{}}),{code:'EXACT_CUTOVER_GATE_MATRIX_REQUIRED'});});
test('35 injected readers are exclusively read method names',()=>{const a=create();assert.equal(typeof a.gateway.commit,'undefined');assert.equal(typeof a.gateway.write,'undefined');assert.deepEqual(a.gateway.actions,['stage.status','stage.header']);});
test('36 invalid/empty stage header denied',async()=>{const {gateway}=create({headers:[]});await err(gateway.query(req({action:'stage.header',sheetName:'Номенклатура'})),'STAGE_HEADER_INVALID');});
