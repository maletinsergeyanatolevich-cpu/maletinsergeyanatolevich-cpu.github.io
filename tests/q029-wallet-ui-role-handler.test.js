'use strict';
const assert=require('assert');
const vm=require('vm');
const fs=require('fs');
const source=fs.readFileSync('assets/app.js','utf8');

function extract(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'real-source function anchors: '+start+' / '+end);
  return source.slice(a,b);
}
const code=[
  extract('function q029LegacyRenderWalletBalance(){','function q029LegacyRenderWallet(){'),
  extract('function q029LegacyRenderWallet(){','let nomLimit=70;'),
  extract('function q029WalletUiAllowed(){','function q046WalletModel(){'),
  extract('function q046WalletModel(){','function q046EvtPart(){'),
  extract('async function q046Action(','async function q046LoadCanonicalWallet('),
  extract('async function q046LoadCanonicalWallet(','function q046PartnerLabel('),
  extract('function renderWalletBalance(){','function renderWallet(){'),
  extract('function renderWallet(){','function q046FinanceModal('),
  extract('function setWalletView(','function walletOwnerKey('),
  extract('function go(','function badge(')
].join('\n');

const guardNames=[
'q046FinanceModal','q046SaveFinance','q046PlanModal','q046CreatePlan',
'q046EditPlan','q046CancelPlan','q046SpendPlan','q046ReserveModal',
'q046CreateReserve','q046CancelAllocation','q046PartnerDetail',
'q046ObligationDetail','q046SensitivePrompt'];
const guarded=guardNames.map((name,index)=>{
  const begin=source.search(new RegExp('(?:async )?function '+name+'\\('));
  assert.ok(begin>=0,'guard implementation missing: '+name);
  const line=source.slice(begin,source.indexOf('\n',begin));
  assert.ok(line.includes('if(!q029WalletUiAllowed())return;'),'role guard missing on '+name);
  const m=line.match(/^(?:async )?function [A-Za-z0-9_]+\(/);
  assert.ok(m);
  return line;
});

function fakeWallet(){
  return {physical_cash:11108,reserved_total:0,free_now:11108,
    partners:[],obligations:[],planned_items:[],allocations:[],orders:{},
    forecast:{planned_future_real_payments:0,forecast_cash:11108,horizon_end:'2026-11-09'}};
}
function runtime(role='WORKER',session='SESSION'){
  const stats={posts:[],draftRenders:0,nav:0,modals:0,legacyBalance:0,role,session};
  const wallet={innerHTML:'',classList:{contains(name){return name==='active';},add(){},remove(){}}};
  const home={classList:{contains(){return false;},add(){},remove(){}}};
  const title={textContent:''};
  const nodes={wallet,home,pageTitle:title};
  const doc={
    getElementById(id){return nodes[id]||null;},
    querySelectorAll(){return [wallet,home];},
    querySelector(){return wallet;}
  };
  const state={
    wallet:{balance:345,income:0,expense:0,netPosition:300,
      ownerDebtTotal:45,transactions:[]},
    walletCanonical:fakeWallet()
  };
  const ctx={console,Date,Math,JSON,Object,Array,String,Number,Boolean,Promise,
    Error,RegExp,Set,Map,navigator:{onLine:true},
    document:doc,window:{scrollTo(){}},S:state,
    q046PartnerCard:()=>'',q046ObligationCard:()=>'',q046PlanRow:()=>'',q046AllocationRow:()=>'',q046OrderSummaryHtml:()=>'', 
    walletFutureIncomeItems:()=>[],walletFutureExpenseItems:()=>[],
    walletBalanceRow:(label,value)=>'<div>'+label+':'+value+'</div>',
    standardActions:()=>'<span>LEGACY_OFFLINE_ACTION</span>',
    renderWalletDrafts(){stats.draftRenders++;},
    walletMovementRow:()=>'',actionIcon:()=>'<svg></svg>',
    rub:v=>String(v),esc:v=>String(v||''),
    q046PendingEvent(){throw Error('UNEXPECTED_MUTATION_PENDING_EVENT');},
    q046ClearPending(){throw Error('UNEXPECTED_EVENT_CLEAR');},
    q046EvtPart:()=> 'NO_EVENT',
    isAdmin1:()=>stats.role==='ADMIN1',
    backendSession:()=>stats.session,
    backendDeviceId:()=> 'DEV-TEST',
    backendPost:async payload=>{stats.posts.push(payload);return {ok:true,wallet:fakeWallet()};},
    renderBottomNav(){stats.nav++;},
    titles:{wallet:'Кошелёк'},
    renderHome(){},renderChecklists(){},renderSync(){},renderNom(){},renderGallery(){},
    renderAdmin(){},renderActivityLog(){},renderAnalytics(){},renderCalculator(){},
    renderSalesAnalytics(){},renderAppDev(){},
    modal(){stats.modals++;},
    prompt(){stats.modals++;return null;},
    confirm(){stats.modals++;return false;},
    showAppToast(){},
    setBusy(){},clearBusy(){},
    renderOrders(){},renderBuy(){},runCoreSync:async()=>({ok:true})
  };
  vm.createContext(ctx);
  vm.runInContext('let WALLET_VIEW="main";const Q046_WALLET_STAGE=globalThis.stage;',Object.assign(ctx,{stage:{loading:false,loaded:false,error:''}}));
  vm.runInContext(code,ctx,{filename:'assets/app.js (actual Wallet functions)'});
  return {ctx,stats,state,wallet,stage:ctx.stage,setRole(r){stats.role=r;},setSession(v){stats.session=v;},
    run(src){return vm.runInContext(src,ctx)}};
}
const results=[];
async function test(label,run){await run();results.push(label);console.log('PASS '+label);}
(async()=>{
await test('worker navigation uses original legacy wallet DOM, never new canonical controls',async()=>{
 const x=runtime('WORKER');x.run("go('wallet')");
 assert.ok(x.wallet.innerHTML.includes('чистая позиция'));
 assert.ok(x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
 assert.ok(!x.wallet.innerHTML.includes('Канонический Кошелёк'));
 assert.ok(!x.wallet.innerHTML.includes('Зарезервировать'));
 assert.deepStrictEqual(x.stats.posts,[]);assert.strictEqual(x.stats.draftRenders,1);
});
await test('worker original balance navigation remains functional',async()=>{
 const x=runtime('WORKER');x.run("go('wallet');setWalletView('balance')");
 assert.ok(x.wallet.innerHTML.includes('Текущий долг владельцам'));
 assert.ok(x.wallet.innerHTML.includes('Остаток · чистая позиция'));
 assert.ok(!x.wallet.innerHTML.includes('Q-046 staging'));
 assert.strictEqual(x.stats.posts.length,0);
 x.run("setWalletView('main')");
 assert.ok(x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
});
await test('ADMIN1 with active session sees canonical main and balance screens',async()=>{
 const x=runtime('ADMIN1');x.run("go('wallet')");
 assert.ok(x.wallet.innerHTML.includes('Деньги производства'));
 assert.ok(x.wallet.innerHTML.includes('11108'));
 assert.ok(x.wallet.innerHTML.includes('Добавить доход'));
 assert.ok(!x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
 x.run("setWalletView('balance')");
 assert.ok(x.wallet.innerHTML.includes('Q-046 staging'));
 assert.ok(x.wallet.innerHTML.includes('Свободно сейчас'));
});
await test('cached ADMIN1 role with removed session fails closed to legacy',async()=>{
 const x=runtime('ADMIN1',null);
 x.run("go('wallet')");
 assert.ok(x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
 assert.strictEqual(x.stats.posts.length,0);
 assert.strictEqual(x.run("q046WalletModel()"),null);
});
await test('role downgrade on same screen switches to legacy and hides canonical cached state',async()=>{
 const x=runtime('ADMIN1');x.run("go('wallet')");
 assert.ok(x.wallet.innerHTML.includes('11108'));
 x.setRole('WORKER');x.run("renderWallet()");
 assert.ok(x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
 assert.ok(!x.wallet.innerHTML.includes('Добавить доход'));
 assert.strictEqual(x.run("q046WalletModel()"),null);
});
await test('worker direct canonical read is denied without network',async()=>{
 const x=runtime('WORKER');
 await x.run("q046LoadCanonicalWallet(true)");
 assert.strictEqual(x.stats.posts.length,0);
 assert.strictEqual(x.stage.loaded,false);
});
await test('worker direct mutation is denied before event creation or server call',async()=>{
 const x=runtime('WORKER');
 await assert.rejects(x.run("q046Action('finance_create',{action:'wallet.finance.create'})"),/ADMIN1_WALLET_UI_REQUIRED/);
 assert.strictEqual(x.stats.posts.length,0);
});
await test('worker direct modal and action entrypoints never open a modal or call backend',async()=>{
 const x=runtime('WORKER');
 const guardedNames=guardNames;
 const guardCode=guarded.join('\n');
 vm.runInContext(guardCode,x.ctx);
 for(const name of guardedNames){
   const args={
     q046FinanceModal:"'income'",q046SaveFinance:"'income'",
     q046EditPlan:"'PLAN'",q046CancelPlan:"'PLAN'",q046SpendPlan:"'PLAN'",
     q046CancelAllocation:"'ALOC'",q046PartnerDetail:"'SERGEY'",
     q046ObligationDetail:"'GUN'",q046SensitivePrompt:"'OBLIGATION_PAYMENT','GUN'"
   }[name]||'';
   await x.run(name+'('+args+')');
 }
 assert.strictEqual(x.stats.modals,0);assert.strictEqual(x.stats.posts.length,0);
});
await test('admin read fetches exactly canonical read action then displays data',async()=>{
 const x=runtime('ADMIN1');x.state.walletCanonical=null;
 x.run("go('wallet')");
 await new Promise(resolve=>setImmediate(resolve));
 assert.strictEqual(x.stats.posts.length,1);
 assert.strictEqual(x.stats.posts[0].action,'wallet.canonical.get');
 assert.ok(x.wallet.innerHTML.includes('11108'));
 assert.ok(!x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
});
await test('admin offline and missing backend session do not issue read or leak canonical view',async()=>{
 const x=runtime('ADMIN1');x.state.walletCanonical=null;
 x.ctx.navigator.onLine=false;
 await x.run('q046LoadCanonicalWallet(true)');
 assert.strictEqual(x.stats.posts.length,0);
 assert.ok(x.stage.error.includes('Офлайн'));
 x.setSession(null);x.run("renderWallet()");
 assert.ok(x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
});
await test('network error shows retry notice, does not issue mutation',async()=>{
 const x=runtime('ADMIN1');x.state.walletCanonical=null;
 x.ctx.backendPost=async p=>{x.stats.posts.push(p);throw Error('NETWORK_OFFLINE_TEST');};
 await x.run('q046LoadCanonicalWallet(true)');
 assert.strictEqual(x.stats.posts.length,1);
 assert.strictEqual(x.stats.posts[0].action,'wallet.canonical.get');
 assert.ok(x.wallet.innerHTML.includes('NETWORK_OFFLINE_TEST'));
 assert.ok(x.wallet.innerHTML.includes('Повторить'));
});
await test('pending ADMIN1 read discarded after role downgrade and view becomes legacy',async()=>{
 const x=runtime('ADMIN1');x.state.walletCanonical=null;
 let resolve;
 x.ctx.backendPost=p=>{x.stats.posts.push(p);return new Promise(res=>{resolve=res;});};
 const pending=x.run('q046LoadCanonicalWallet(true)');
 x.setRole('WORKER');
 resolve({ok:true,wallet:fakeWallet()});
 await pending;
 assert.strictEqual(x.state.walletCanonical,null);
 assert.ok(x.wallet.innerHTML.includes('LEGACY_OFFLINE_ACTION'));
 assert.strictEqual(x.stats.posts.length,1);
});
await test('pending read discarded after session replacement even if role remains ADMIN1',async()=>{
 const x=runtime('ADMIN1');x.state.walletCanonical=null;
 let resolve;
 x.ctx.backendPost=p=>new Promise(res=>{resolve=res;});
 const pending=x.run('q046LoadCanonicalWallet(true)');
 x.setSession('OTHER_SESSION');
 resolve({ok:true,wallet:fakeWallet()});
 await pending;
 assert.strictEqual(x.state.walletCanonical,null);
 assert.strictEqual(x.stage.loaded,false);
});
console.log(JSON.stringify({kind:'Q029_WALLET_UI_ROLE_ACTUAL_SOURCE',ok:true,passed:results.length,total:13},null,2));
})().catch(err=>{console.error(err);process.exitCode=1;});
