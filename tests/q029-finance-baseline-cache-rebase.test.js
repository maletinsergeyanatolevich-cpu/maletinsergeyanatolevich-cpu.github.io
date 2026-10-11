'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const app=fs.readFileSync('assets/app.js','utf8');
const backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
const from=app.indexOf('function q029FinanceCacheClean(snapshot){');
const to=app.indexOf('async function purgeExpiredSnapshotCache(){',from+1);
assert(from>=0&&to>from,'actual client finance cache-safe source anchors');
const actual=app.slice(from,to);
const records=new Map(),drafts=new Map([['PENDING-1',{id:'PENDING-1',event_id:'EVENT-1',status:'ready'}]]);
const calls=[];
function openDB(){
 return Promise.resolve({transaction(name,mode){
   calls.push(name+':'+mode);
   assert.equal(name,'snapshotCache','do not open or clear draft/outbox stores');
   const tx={oncomplete:null,onerror:null,onabort:null};
   tx.objectStore=()=>({
     put(rec){records.set(rec.id,structuredClone(rec));queueMicrotask(()=>tx.oncomplete?.());return{}},
     get(id){const req={result:undefined,onsuccess:null,onerror:null};queueMicrotask(()=>{req.result=records.get(id);req.onsuccess?.()});return req}
   });
   return tx;
 }});
}
const ctx={console,Date,Math,Number,String,Array,Object,JSON,Promise,Set,
 crypto:crypto.webcrypto,TextEncoder,Uint8Array,openDB,
 emptySnapshot:()=>({wallet:{cash:0,transactions:[]}}),
 normalizeSnapshot:x=>structuredClone(x)};
vm.createContext(ctx);
vm.runInContext(actual,ctx,{filename:'Q029-actual-client-baseline'});
const run=(expr,vars={})=>{Object.assign(ctx,vars);return vm.runInContext(expr,ctx)};
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x.slice().sort())).digest('hex');
const ledger=(ids,head=116)=>({source:'GOOGLE_SHEETS_FINANCE',items:ids.map(finance_id=>({finance_id})),
 row_count:ids.length,head_current_rev:7,head_row_count:head,source_ids_hash:hash(ids),source_generation:'FINANCE_IDS_SHA256_V1'});
let pass=0;
async function test(name,fn){await fn();pass++;console.log('PASS '+name)}
(async()=>{
 const ids116=Array.from({length:116},(_,i)=>'FIN-OLD-'+String(i).padStart(3,'0'));
 const ids106=ids116.slice(0,106);
 const old={id:'current',user:{user_id:'USER-1'},offlineAccessUntil:'2099-01-01',savedAt:'2026-10-06',
  snapshot:{meta:{nomenclatureRevision:9},orders:[{order_id:'O-1'}],nomenclature:[{id:'N-1'}],
   wallet:{cash:23981,transactions:ids116.map(id=>({id}))},plannedFinance:ids116.map(finance_id=>({finance_id})),
   walletCanonical:{finance_ledger:ledger(ids116)}}};
 records.set('current',structuredClone(old));
 await test('116-entry old offline snapshot rebases by stripping Finance without resetting other data',async()=>{
   const v=await run('q029RepairOldSnapshotCache(_rec)',{_rec:old});
   assert.equal(v.snapshot.wallet.transactions.length,0);
   assert.equal(v.snapshot.plannedFinance.length,0);
   assert.equal(v.snapshot.walletCanonical,null);
   assert.equal(v.snapshot.orders.length,1);assert.equal(v.snapshot.nomenclature.length,1);
   assert.equal(records.get('current').snapshot.wallet.transactions.length,0);
   assert.equal(records.get('current').snapshot.meta.nomenclatureRevision,9);
 });
 await test('No lost unsent drafts/outbox and no other IndexedDB stores opened',async()=>{
   assert.equal(drafts.get('PENDING-1').event_id,'EVENT-1');
   assert(calls.every(x=>x==='snapshotCache:readwrite'));
 });
 await test('106 canonical IDs produce durable SHA256 baseline despite HEAD=116',async()=>{
   await run('q029PersistFinanceSourceBaseline(_ledger,_uid)',{_ledger:ledger(ids106),_uid:'USER-1'});
   const v=records.get('finance-source-baseline:USER-1');
   assert.equal(v.row_count,106);assert.equal(v.source_ids_hash,hash(ids106));
   assert.equal(v.mode,'AUTHORITATIVE_FULL_READ_V1');
 });
 await test('HEAD auto-parity 106 does not reuse obsolete 116 source fingerprint',async()=>{
   const original=records.get('finance-source-baseline:USER-1').source_ids_hash;
   const changed=[...ids106];changed[0]='FIN-NEW-001';
   await run('q029PersistFinanceSourceBaseline(_ledger,_uid)',{_ledger:ledger(changed,106),_uid:'USER-1'});
   const v=records.get('finance-source-baseline:USER-1');
   assert.equal(v.row_count,106);assert.notEqual(v.source_ids_hash,original);
 });
 await test('Missing/false server source fingerprint fails closed without replacing good marker',async()=>{
   const before=records.get('finance-source-baseline:USER-1').source_ids_hash;
   const bad=ledger(ids106);bad.source_ids_hash='0'.repeat(64);
   await assert.rejects(()=>run('q029PersistFinanceSourceBaseline(_ledger,_uid)',{_ledger:bad,_uid:'USER-1'}),/HASH_MISMATCH/);
   const incomplete=ledger(ids106);incomplete.source_ids_hash='';
   await assert.rejects(()=>run('q029PersistFinanceSourceBaseline(_ledger,_uid)',{_ledger:incomplete,_uid:'USER-1'}),/PROOF_MISSING/);
   assert.equal(records.get('finance-source-baseline:USER-1').source_ids_hash,before);
 });
 await test('Actual client and backend are limited to source generation and snapshotCache only',async()=>{
   assert(backend.includes("source_generation:'FINANCE_IDS_SHA256_V1'"));
   assert(backend.includes("source_ids_hash:sourceHash"));
   assert(app.includes('snapshot:q029FinanceCacheClean(snapshot)'));
   assert(app.includes('const safe=await q029RepairOldSnapshotCache(rec)'));
   assert(app.includes("if(typeof openDB==='function')await q029PersistFinanceSourceBaseline(full.finance_ledger,userId)"));
   assert(!/\b(clearStore\('drafts'\)|deleteDatabase\(|deleteRow\(|appendRow\(|setValues\()/.test(actual));
   const ver=JSON.parse(fs.readFileSync('version.json','utf8'));
   assert.equal(ver.rolloutStage,'staging-only');assert.equal(ver.dbSchema,5);
 });
 console.log(JSON.stringify({kind:'Q029_Q067_PERSISTENT_FINANCE_SOURCE_BASELINE',passed:pass,ok:true,scope:'actual-source synthetic IndexedDB harness; no real auth/live/backend deploy'}));
})().catch(e=>{console.error(e);process.exitCode=1});
