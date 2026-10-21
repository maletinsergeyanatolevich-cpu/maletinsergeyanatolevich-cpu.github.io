'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAdapter,createInMemoryStore,partitionOfflineQueue,assertPrincipal,assertGeneration}=require('../staging/q079/wallet-adapter.js');
const {summarize}=require('../staging/q079/wallet-engine.js');
const GEN='Q079-FRESH-STAGING-20261021'; const MASTER='ISOLATED-EMPTY-MASTER-ONLY';
const DEVICE='TEST-DEVICE-A'; const now=Date.now();
const admin={serverVerified:true,userId:'ADMIN1',role:'ADMIN1',status:'ACTIVE',deviceId:DEVICE,expiresAtMs:now+100000,permissions:[]};
const user={serverVerified:true,userId:'USER-A',role:'USER',status:'ACTIVE',deviceId:DEVICE,expiresAtMs:now+100000,permissions:['wallet.view','wallet.add']};
function harness({principal=admin,writeEnabled=true,authFail=false}={}){
 const store=createInMemoryStore({generation:GEN,masterId:MASTER});
 const authenticate=async({sessionToken})=> authFail||sessionToken!=='SYNTHETIC-TOKEN'?null:principal;
 const adapter=createAdapter({store,authenticate,activeGeneration:GEN,stagingMasterId:MASTER,writeEnabled});
 return {store,adapter};
}
function req(type='CASH_RECEIPT',num=1){return {sessionToken:'SYNTHETIC-TOKEN',deviceId:DEVICE,businessGeneration:GEN,event:{generation:GEN,eventId:'EVT-B3-'+num,requestId:'REQ-B3-'+num,type,expectedRevision:num-1,effectiveDate:'2026-10-21',amountKop:10000,custodyLocation:'CUSTODY-SYNTHETIC',purpose:'UNCLASSIFIED_RECEIPT'}};}
async function err(fn,code){await assert.rejects(fn,e=>e.code===code,code);}
test('1 new isolated workbook state has empty and UNCONFIRMED opening',()=>{let {store}=harness();let s=store.snapshot();assert.equal(s.revision,0);assert.equal(s.events.length,0);assert.equal(s.openingStatus,'UNCONFIRMED');assert.equal(summarize(s).cashKop,0);});
test('2 missing trusted authentication backend forbidden',()=>{assert.throws(()=>createAdapter({store:createInMemoryStore({generation:GEN,masterId:MASTER}),activeGeneration:GEN,stagingMasterId:MASTER}),/TRUSTED_AUTH_PROVIDER_REQUIRED/);});
test('3 owner can read empty business data from generation only',async()=>{let {adapter}=harness();let x=await adapter.read(req());assert.equal(x.summary.openingStatus,'UNCONFIRMED');assert.equal(x.mode,'STAGING_READ_ONLY');});
test('4 legacy generation read denied',async()=>{let {adapter}=harness();await err(()=>adapter.read({...req(),businessGeneration:'OLD-GEN'}),'BUSINESS_GENERATION_MISMATCH');});
test('5 missing generation denied',async()=>{let {adapter}=harness();let q=req();delete q.businessGeneration;await err(()=>adapter.read(q),'BUSINESS_GENERATION_MISMATCH');});
test('6 forged ADMIN1 role in browser body denied',async()=>{let {adapter,store}=harness({principal:user});await err(()=>adapter.commit({...req(),role:'ADMIN1'}),'CLIENT_IDENTITY_OR_MASTER_SPOOF');assert.equal(store.snapshot().events.length,0);});
test('7 forged nested actor permissions denied',async()=>{let {adapter}=harness({principal:user});let q=req();q.event.actor={userId:'ADMIN1',role:'ADMIN1',permissions:['wallet.profit_pay']};await err(()=>adapter.commit(q),'CLIENT_IDENTITY_OR_MASTER_SPOOF');});
test('8 legitimate active user with server-side rights can add synthetic event',async()=>{let {adapter}=harness({principal:user});let x=await adapter.commit(req());assert.equal(x.summary.cashKop,10000);});
test('9 read permission alone does not grant write',async()=>{let {adapter}=harness({principal:{...user,permissions:['wallet.view']}});await err(()=>adapter.commit(req()),'PERMISSION_DENIED');});
test('10 write right without view right does not grant access to sensitive data',async()=>{let {adapter}=harness({principal:{...user,permissions:['wallet.add']}});await err(()=>adapter.read(req()),'PERMISSION_DENIED');});
test('11 admin1 role label is bound to exact verified account',async()=>{let {adapter}=harness({principal:{...admin,userId:'USER-A'}});await err(()=>adapter.commit(req()),'ADMIN1_IDENTITY_MISMATCH');});
test('12 revoked user denied',async()=>{let {adapter}=harness({principal:{...user,revoked:true}});await err(()=>adapter.read(req()),'SESSION_DISABLED');});
test('13 disabled user denied',async()=>{let {adapter}=harness({principal:{...user,status:'DISABLED'}});await err(()=>adapter.commit(req()),'SESSION_DISABLED');});
test('14 expired session denied',async()=>{let {adapter}=harness({principal:{...user,expiresAtMs:now-1}});await err(()=>adapter.read(req()),'SESSION_EXPIRED');});
test('15 wrong device denied',async()=>{let {adapter}=harness({principal:{...user,deviceId:'OTHER-DEVICE'}});await err(()=>adapter.commit(req()),'DEVICE_BINDING_MISMATCH');});
test('16 absent session token denied',async()=>{let {adapter}=harness();let q=req();q.sessionToken='';await err(()=>adapter.read(q),'SESSION_TOKEN_REQUIRED');});
test('17 backend does not accept a remote unverified principal',async()=>{let {adapter}=harness({principal:{...user,serverVerified:false}});await err(()=>adapter.commit(req()),'SESSION_NOT_SERVER_VERIFIED');});
test('18 invalid token returns no data',async()=>{let {adapter}=harness({authFail:true});await err(()=>adapter.read(req()),'SERVER_SESSION_OBJECT_REQUIRED');});
test('19 type-specific sensitive rights are checked by server',async()=>{let {adapter}=harness({principal:user});let q=req('PARTNER_RETURN');q.event.partyId='PARTNER-1';await err(()=>adapter.commit(q),'PERMISSION_DENIED');});
test('20 write gate fails closed by default',async()=>{let {adapter}=harness({writeEnabled:false});await err(()=>adapter.commit(req()),'B3_WRITE_GATE_CLOSED');});
test('21 valid commit uses CAS version and no money double count on retry',async()=>{let {adapter,store}=harness();let q=req();let one=await adapter.commit(q),two=await adapter.commit(q);assert.equal(one.duplicate,false);assert.equal(two.duplicate,true);assert.equal(store.snapshot().events.length,1);assert.equal(two.summary.cashKop,10000);});
test('22 reused event ID with modified amount rejected',async()=>{let {adapter,store}=harness();let q=req();await adapter.commit(q);await err(()=>adapter.commit({...q,event:{...q.event,amountKop:90000}}),'IDEMPOTENCY_KEY_REUSE_CONFLICT');assert.equal(store.snapshot().events.length,1);});
test('23 concurrent stale expected revision rejected',async()=>{let {adapter}=harness();await adapter.commit(req());let q=req('CASH_RECEIPT',2);q.event.expectedRevision=0;await err(()=>adapter.commit(q),'REVISION_CONFLICT');});
test('24 client must supply same generation at outer and event level',async()=>{let {adapter}=harness();let q=req();q.event.generation='OLD-GEN';await err(()=>adapter.commit(q),'BUSINESS_GENERATION_MISMATCH');});
test('25 metadata pin rejects a substituted business sheet',()=>{assert.throws(()=>createAdapter({store:createInMemoryStore({generation:GEN,masterId:'WRONG'}),authenticate:async()=>admin,activeGeneration:GEN,stagingMasterId:MASTER}),/STORE_PIN_MISMATCH/);});
test('26 arbitrary external data store or live Google adapter is explicitly forbidden in B3',()=>{assert.throws(()=>createAdapter({store:{type:'GOOGLE_SHEETS',generation:GEN,masterId:MASTER},authenticate:async()=>admin,activeGeneration:GEN,stagingMasterId:MASTER}),/B3_NON_ISOLATED_STORE_FORBIDDEN/);});
test('27 a mismatched CAS proposal can never be persisted',()=>{let store=createInMemoryStore({generation:GEN,masterId:MASTER});let old=store.load();let next={...old,generation:'OLD-GEN',revision:1};assert.throws(()=>store.cas(0,next),/CAS_GENERATION_OR_REVISION_INVALID/);assert.equal(store.load().revision,0);});
test('28 old outbox is quarantined without deleting source',()=>{const input=[{businessGeneration:'OLD-GEN',event:{generation:'OLD-GEN',eventId:'EVT-OLD'}},{businessGeneration:GEN,event:{generation:GEN,eventId:'EVT-NEW'}}];let before=JSON.stringify(input),r=partitionOfflineQueue({entries:input,activeGeneration:GEN});assert.equal(r.fresh.length,1);assert.equal(r.quarantine.length,1);assert.equal(r.quarantine[0].autoReplay,false);assert.equal(before,JSON.stringify(input));});
test('29 absent generation in outbox is also quarantined, not assumed new',()=>{let r=partitionOfflineQueue({entries:[{event:{eventId:'OLD'}}],activeGeneration:GEN});assert.equal(r.fresh.length,0);assert.equal(r.quarantine.length,1);});
test('30 no wholesale deletion/reset endpoint is available',()=>{let {adapter}=harness();assert.deepEqual(Object.keys(adapter).sort(),['commit','generation','masterId','read','writeEnabled']);});
test('31 no active master writes happen when proof of permission fails',async()=>{let {store,adapter}=harness({principal:{...user,permissions:[]}});let original=JSON.stringify(store.load());await err(()=>adapter.commit(req()),'PERMISSION_DENIED');assert.equal(JSON.stringify(store.load()),original);});
test('32 no master data created merely by reading empty state',async()=>{let {store,adapter}=harness();let before=JSON.stringify(store.load());await adapter.read(req());assert.equal(JSON.stringify(store.load()),before);});

test('33 spoofed store object with memory-only label cannot trigger side effects',()=>{
 const forged={type:'ISOLATED_MEMORY_ONLY',generation:GEN,masterId:MASTER,load:()=>({}),cas:()=>{throw Error('SHOULD_NOT_CALL');}};
 assert.throws(()=>createAdapter({store:forged,authenticate:async()=>admin,activeGeneration:GEN,stagingMasterId:MASTER}),/B3_NON_ISOLATED_STORE_FORBIDDEN/);
});
test('34 non-boolean serverVerified marker is not authoritative',async()=>{
 const {adapter}=harness({principal:{...admin,serverVerified:'true'}});
 await err(()=>adapter.read(req()),'SESSION_NOT_SERVER_VERIFIED');
});
test('35 invalid non-finite or fractional session expiries are forbidden',async()=>{
 for(const expiresAtMs of [NaN,Infinity,-Infinity,Date.now()+100000.3]){
  const {adapter}=harness({principal:{...admin,expiresAtMs}});
  await err(()=>adapter.read(req()),'SESSION_EXPIRED');
 }
});
test('36 read request with client masterId or role spoof is rejected',async()=>{
 const {adapter}=harness();
 await err(()=>adapter.read({...req(),masterId:'FAKE-MASTER'}),'CLIENT_IDENTITY_OR_MASTER_SPOOF');
 await err(()=>adapter.read({...req(),role:'ADMIN1'}),'CLIENT_IDENTITY_OR_MASTER_SPOOF');
});
test('37 createAdapter will not trust a copied cloned memory store',()=>{
 const legit=createInMemoryStore({generation:GEN,masterId:MASTER});const shadow={...legit};
 assert.throws(()=>createAdapter({store:shadow,authenticate:async()=>admin,activeGeneration:GEN,stagingMasterId:MASTER}),/B3_NON_ISOLATED_STORE_FORBIDDEN/);
});
