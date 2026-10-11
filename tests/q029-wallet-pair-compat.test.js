'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const client=fs.readFileSync('assets/app.js','utf8');
const backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
const release=JSON.parse(fs.readFileSync('version.json','utf8'));
function section(text,start,end){const i=text.indexOf(start),j=text.indexOf(end,i+start.length);assert(i>=0&&j>i,'actual-source anchors '+start);return text.slice(i,j);}
const clientSource=[
 section(client,'const Q029_WALLET_BACKEND_VERSION=','function q046EvtPart(){'),
 section(client,'async function q046Action(','function q046PartnerLabel(')
].join('\n');
const backendGuard=section(backend,'const Q029_WALLET_PAIR_CONTRACT=','function q029SheetFinanceHistory_(financeTable){');
const VERSION='backend-0.2.33-staging-q069',CONTRACT='Q029_FINANCE_IDSET_V1';
function wallet(){
 return {contract_id:CONTRACT,source:'CANONICAL_RECONCILIATION_EPOCH',physical_cash:11108,
  finance_ledger:{source:'GOOGLE_SHEETS_FINANCE',source_generation:'FINANCE_ROWS_SHA256_V1',source_rows_hash:'a'.repeat(64),
   row_count:2,items:[{finance_id:'FIN-A'},{finance_id:'FIN-B'}]}};
}
function response(version=VERSION,contract=CONTRACT){
 const w=wallet();w.contract_id=contract;return {ok:true,backend_version:version,wallet:w};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function create(){
 let token='SESS-A',user='USER-A',permitted=true,pingVersion=VERSION,afterPing=null,remoteRead=response();
 let posts=[],events=0,cleared=0,renders=0;
 const dom={classList:{contains:s=>s==='active'}};
 const ctx={console,Date,Math,Number,String,Array,Object,JSON,Promise,Error,Set,Map,
  S:{walletCanonical:null},SESSION:{userId:user},navigator:{onLine:true},
  document:{getElementById:n=>n==='wallet'?dom:null},
  backendSession:()=>token,backendDeviceId:()=> 'DEVICE',
  hasPermission:p=>permitted&&(p==='wallet.view'||p==='wallet.add'),
  canMutateRecord:()=>false,isAdmin1:()=>false,renderWallet(){renders++},
  backendPost:async p=>{posts.push(p);return p.action==='wallet.canonical.get'?remoteRead:{ok:true,accepted:true}},
  backendPing:async()=>{if(afterPing)await afterPing();return{ok:true,version:pingVersion}},
  q046PendingEvent:()=>{events++;return{key:'EVENT',event_id:'Q029-PAIR-IDEMPOTENT'}},
  q046ClearPending:()=>{cleared++},renderBottomNav(){},
 };
 vm.createContext(ctx);vm.runInContext(clientSource,ctx,{filename:'actual-wallet-pair'});
 return {ctx,run:e=>vm.runInContext(e,ctx),setResponse:v=>remoteRead=v,setPing:v=>pingVersion=v,
  setAfterPing:fn=>afterPing=fn,setToken:t=>token=t,setUser:u=>{user=u;ctx.SESSION.userId=u},
  posts:()=>posts,events:()=>events,cleared:()=>cleared,renders:()=>renders};
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
(async()=>{
await test('new staging backend version differs from old deployed source and is required by PWA',()=>{
 assert.equal(release.minBackend,VERSION);
 assert.match(client,/const Q029_WALLET_BACKEND_VERSION='backend-0.2.33-staging-q069'/);
 assert.match(backend,/VERSION: 'backend-0.2.33-staging-q069'/);
 assert.match(backend,/backend_version:CFG.VERSION/);
 assert.match(backend,/contract_id:Q029_WALLET_PAIR_CONTRACT/);
 assert.equal(release.dbSchema,5);assert.equal(release.rolloutStage,'staging-only');
});
await test('normal full Wallet read accepts only matching source contract and version',async()=>{
 const t=create();await t.run('q046LoadCanonicalWallet(true)');
 assert.equal(t.run('Q046_WALLET_STAGE.loaded'),true);
 assert.equal(t.run('Q046_WALLET_STAGE.backendVersion'),VERSION);
 assert.equal(t.run('q046WalletModel().contract_id'),CONTRACT);
 assert.equal(t.posts().length,1);
});
await test('old production backend version cannot enter new Wallet or dispatch money action',async()=>{
 const t=create();t.setResponse(response('backend-0.2.31-staging-q049'));
 await t.run('q046LoadCanonicalWallet(true)');
 assert.equal(t.run('Q046_WALLET_STAGE.loaded'),false);
 assert.match(t.run('Q046_WALLET_STAGE.error'),/WALLET_BACKEND_PAIR_INCOMPATIBLE/);
 await assert.rejects(()=>t.run("q046Action('finance',{action:'wallet.finance.create'})"),/WALLET_BACKEND_PAIR_NOT_VERIFIED/);
 assert.equal(t.events(),0);assert.equal(t.posts().length,1);
});
await test('same version but missing Wallet contract fails before actions',async()=>{
 const t=create();t.setResponse(response(VERSION,'OLD_CONTRACT'));
 await t.run('q046LoadCanonicalWallet(true)');
 assert.equal(t.run('Q046_WALLET_STAGE.loaded'),false);
 assert.equal(t.events(),0);
});
await test('pre-read permission allows no financial mutation without full authoritative model',async()=>{
 const t=create();
 await assert.rejects(()=>t.run("q046Action('finance',{action:'wallet.finance.create'})"),/WALLET_BACKEND_PAIR_NOT_VERIFIED/);
 assert.equal(t.events(),0);assert.equal(t.posts().length,0);
});
await test('backend rollback detected by fresh ping, without allocating event id or POST write',async()=>{
 const t=create();await t.run('q046LoadCanonicalWallet(true)');t.setPing('backend-0.2.31-staging-q049');
 await assert.rejects(()=>t.run("q046Action('finance',{action:'wallet.finance.create'})"),/WALLET_BACKEND_VERSION_CHANGED/);
 assert.equal(t.events(),0);assert.equal(t.posts().filter(x=>x.action==='wallet.finance.create').length,0);
});
await test('session switch during prewrite ping blocks mutation and preserves outbox',async()=>{
 const t=create();await t.run('q046LoadCanonicalWallet(true)');
 t.setAfterPing(async()=>{t.setToken('SESS-B');});
 await assert.rejects(()=>t.run("q046Action('finance',{action:'wallet.finance.create'})"),/WALLET_SESSION_CHANGED_BEFORE_WRITE/);
 assert.equal(t.events(),0);assert.equal(t.posts().filter(x=>x.action==='wallet.finance.create').length,0);
});
await test('compatible server and session emit paired idempotent request with unchanged event',async()=>{
 const t=create();await t.run('q046LoadCanonicalWallet(true)');
 const x=await t.run("q046Action('finance',{action:'wallet.finance.create',amount:100})");
 assert.equal(x.accepted,true);const writes=t.posts().filter(p=>p.action==='wallet.finance.create');
 assert.equal(writes.length,1);assert.equal(writes[0].wallet_contract_id,CONTRACT);
 assert.equal(writes[0].event_id,'Q029-PAIR-IDEMPOTENT');assert.equal(t.events(),1);assert.equal(t.cleared(),1);
});
await test('late IndexedDB completion cannot publish Wallet for revoked token',async()=>{
 const t=create(),d={};d.promise=new Promise(resolve=>d.resolve=resolve);
 t.ctx.openDB=()=>({});t.ctx.q029PersistFinanceSourceBaseline=async()=>d.promise;
 const loading=t.run('q046LoadCanonicalWallet(true)');await tick();t.setToken('SESS-OTHER');
 d.resolve(true);await loading;
 assert.equal(t.run('Q046_WALLET_STAGE.loaded'),false);
 assert.equal(t.ctx.S.walletCanonical,null);
});
await test('backend rejects absent/wrong pair contract on write path, preserves older read routes',async()=>{
 const c={Error,String};vm.createContext(c);vm.runInContext(backendGuard,c);
 assert.throws(()=>vm.runInContext('q029RequireWalletPair_({})',c),/WALLET_CLIENT_CONTRACT_REQUIRED/);
 assert.throws(()=>vm.runInContext("q029RequireWalletPair_({wallet_contract_id:'OLD'})",c),/WALLET_CLIENT_CONTRACT_REQUIRED/);
 assert.doesNotThrow(()=>vm.runInContext("q029RequireWalletPair_({wallet_contract_id:'Q029_FINANCE_IDSET_V1'})",c));
 assert(backend.includes("q029RequireWalletPair_(body);"));
 assert(backend.includes("if (q046Action === 'wallet.canonical.get')"));
 assert(backend.includes("if (q046Action === 'wallet.schema.spec')"));
 assert(!clientSource.includes('deleteDatabase('));
});
console.log(JSON.stringify({kind:'Q029_WALLET_BACKEND_CLIENT_PAIR_AND_ROLLBACK',ok:true,passed,scope:'actual-source VM and simulated transport; no live sessions or money writes'}));
})().catch(e=>{console.error(e);process.exitCode=1});
