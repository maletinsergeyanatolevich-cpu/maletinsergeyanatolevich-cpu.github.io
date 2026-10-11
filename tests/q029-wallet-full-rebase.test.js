'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const client=fs.readFileSync('assets/app.js','utf8'),backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
function source(start,end){const i=client.indexOf(start),j=client.indexOf(end,i+start.length);assert(i>=0&&j>i,'actual source anchor '+start);return client.slice(i,j)}
const script=[
 source('const Q029_WALLET_BACKEND_VERSION=','const Q046_WALLET_STAGE='),
 source('function q029WalletUiAllowed(){','function q046EvtPart(){'),
 source('async function q046LoadCanonicalWallet(','function q046PartnerLabel('),
 source('function go(','function badge(')
].join('\n');
function full(count,options={}){
 const ids=Array.from({length:count},(_,i)=>({finance_id:'SOURCE-FIN-'+String(i).padStart(3,'0'),
   finance_date:i%2?'04.10.2026':'05.10.2026',type:'Приход',amount:2}));
 return {contract_id:'Q029_FINANCE_IDSET_V1',physical_cash:11108,free_now:11108,reserved_total:0,
  finance_ledger:{source:'GOOGLE_SHEETS_FINANCE',source_generation:'FINANCE_IDS_SHA256_V1',row_count:count,items:ids,
    head_row_count:options.head||count,head_matches_source:(options.head||count)===count}};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
function create(){
 let token='AUTH-A',role=true,online=true,renderCount=0,requests=[],remote=async()=>({ok:true,wallet:full(106,{head:116})});
 const active=new Set(['wallet']),walletEl={classList:{contains:x=>x==='active'&&active.has('wallet'),remove:x=>{if(x==='active')active.delete('wallet')},add:x=>{if(x==='active')active.add('wallet')}},innerHTML:''};
 const dom={wallet:walletEl,pageTitle:{textContent:''}};
 const ctx={console,Date,Math,Number,String,Array,Object,JSON,Error,Promise,Set,Map,
  S:{walletCanonical:full(116)},Q046_WALLET_STAGE:{loaded:true,loading:false,error:'',generation:0,session:'AUTH-A',userId:'A'},SESSION:{userId:'A'},
  navigator:{get onLine(){return online}},WALLET_VIEW:'main',titles:{wallet:'Кошелёк'},
  document:{getElementById:name=>dom[name]||null,querySelectorAll:()=>[walletEl]},
  window:{scrollTo(){}},renderBottomNav(){},renderWallet(){renderCount++},
  backendSession:()=>token,backendDeviceId:()=> 'DEV',
  hasPermission:x=>role&&x==='wallet.view',isAdmin1:()=>false,
  backendPost:async req=>{requests.push(req);return {backend_version:'backend-0.2.32-staging-q067',...await remote(req)};},
  esc:v=>String(v),rub:v=>String(v),go(){},
 };
 vm.createContext(ctx);vm.runInContext(script,ctx,{filename:'actual-wallet-client-rebase'});
 return {ctx,run:s=>vm.runInContext(s,ctx),requests,setResponse:fn=>{remote=fn},
   setToken:x=>{token=x},setRole:x=>{role=x},setOnline:x=>{online=x},
   render:()=>renderCount,ledger:()=>ctx.S.walletCanonical?.finance_ledger,
   stage:()=>ctx.Q046_WALLET_STAGE};
}
let passed=0;
async function check(title,fn){await fn();passed++;console.log('PASS '+title)}
(async()=>{
await check('Validated server rebase REPLACES 116 cached Finance IDs with 106, including deletions',async()=>{
 const x=create();await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger().row_count,106);assert.equal(x.ledger().items.length,106);
 assert(!x.ledger().items.some(y=>y.finance_id==='SOURCE-FIN-115'));
 assert.equal(x.stage().loaded,true);assert.equal(x.requests.length,1);
});
await check('When domain HEAD has auto-corrected to 106, a new canonical full read still replaces 116',async()=>{
 const x=create();x.setResponse(async()=>({ok:true,wallet:full(106,{head:106})}));
 await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger().row_count,106);assert.equal(x.ledger().head_matches_source,true);
});
await check('New authoritative row after user saves is present immediately in full rebase',async()=>{
 const x=create();x.setResponse(async()=>({ok:true,wallet:full(107)}));
 await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger().row_count,107);assert.equal(x.ledger().items[106].finance_id,'SOURCE-FIN-106');
});
await check('Entering Wallet resets stale view and invokes one fresh view render',async()=>{
 const x=create();x.run("go('wallet')");
 assert.equal(x.ledger(),undefined);assert.equal(x.stage().loaded,false);assert.equal(x.render(),1);
});
await check('Offline stale snapshot is cleared and not marked current',async()=>{
 const x=create();x.setOnline(false);
 await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger(),undefined);assert.equal(x.stage().loaded,false);
 assert.match(x.stage().error,/Офлайн/);assert.equal(x.requests.length,0);
});
await check('When backend fails, old ledger remains unavailable instead of silently shown',async()=>{
 const x=create();x.setResponse(async()=>({ok:false,error:'UPSTREAM_DOWN'}));
 await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger(),undefined);assert.equal(x.stage().loaded,false);
 assert.match(x.stage().error,/UPSTREAM_DOWN/);
});
await check('Partial backend snapshot with mismatched count fails closed',async()=>{
 const x=create();x.setResponse(async()=>{const w=full(106);w.finance_ledger.row_count=116;return{ok:true,wallet:w}});
 await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger(),undefined);assert.match(x.stage().error,/FINANCE_REBASE_INCOMPLETE/);
});
await check('Missing and duplicate Finance IDs are rejected, old data is not preserved',async()=>{
 const x=create();x.setResponse(async()=>{const w=full(106);w.finance_ledger.items[1].finance_id=w.finance_ledger.items[0].finance_id;return{ok:true,wallet:w}});
 await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.ledger(),undefined);assert.match(x.stage().error,/FINANCE_REBASE_DUPLICATE/);
 const y=create();y.setResponse(async()=>{const w=full(106);w.finance_ledger.items[3].finance_id='';return{ok:true,wallet:w}});
 await y.run('q046LoadCanonicalWallet(true)');assert.equal(y.ledger(),undefined);
});
await check('Delayed OLD response cannot override a NEW session-generation response',async()=>{
 const x=create(),a=deferred(),b=deferred();let n=0;
 x.setResponse(()=>++n===1?a.promise:b.promise);
 const first=x.run('q046LoadCanonicalWallet(true)');
 const second=x.run('q046LoadCanonicalWallet(true)');
 b.resolve({ok:true,wallet:full(106)});await second;
 a.resolve({ok:true,wallet:full(116)});await first;
 assert.equal(x.ledger().row_count,106);assert.equal(x.stage().loaded,true);
});
await check('Session changes while reading cannot publish former user data',async()=>{
 const x=create(),d=deferred();x.setResponse(()=>d.promise);
 const request=x.run('q046LoadCanonicalWallet(true)');x.setToken('AUTH-B');
 d.resolve({ok:true,wallet:full(116)});await request;assert.equal(x.ledger(),undefined);
});
await check('Current user changes while reading cannot publish former user data',async()=>{
 const x=create(),d=deferred();x.setResponse(()=>d.promise);
 const request=x.run('q046LoadCanonicalWallet(true)');x.ctx.SESSION.userId='B';
 d.resolve({ok:true,wallet:full(116)});await request;assert.equal(x.ledger(),undefined);
});
await check('Cached Wallet model is discarded on user/session identity change',async()=>{
 const x=create();x.setToken('AUTH-B');
 assert.equal(x.run('q046WalletModel()'),null);assert.equal(x.ledger(),undefined);
});
await check('Viewer permission revoked before refresh prevents network and stale view',async()=>{
 const x=create();x.setRole(false);await x.run('q046LoadCanonicalWallet(true)');
 assert.equal(x.requests.length,0);assert.equal(x.ledger(),undefined);
});
await check('Backend Finance sync HEAD drift signal requires reset, never invents IDs',async()=>{
 assert(backend.includes("reason:'FINANCE_SOURCE_HEAD_DRIFT'"));
 assert(backend.includes("source_row_count:actual"));
 assert(client.includes('function q029WalletInvalidate(){'));
});
await check('Rebase does not alter cash, partner, obligation, event-id, Sheet or schema rules',async()=>{
 assert(backend.includes("const physical=Math.round((opening+delta)*100)/100"));
 assert(backend.includes("free=Math.round((physical-reserved)*100)/100"));
 const s=source('function q029WalletInvalidate(){','function q046EvtPart(){')+
   source('async function q046LoadCanonicalWallet(','function q046PartnerLabel(');
 assert(!/\b(?:deleteRow|setValue|appendRow|putSnapshotCache|localStorage\.setItem)\s*\(/.test(s));
 const v=JSON.parse(fs.readFileSync('version.json','utf8'));
 assert.equal(v.dbSchema,5);assert.equal(v.rolloutStage,'staging-only');
});
console.log(JSON.stringify({kind:'Q029_WALLET_FULL_CANONICAL_REBASE_ACTUAL_CLIENT',ok:true,passed,scope:'synthetic VM, no production session, no Drive writes'}));
})().catch(e=>{console.error(e);process.exitCode=1});
