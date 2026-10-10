'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('assets/app.js','utf8'),backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
function section(a,b){let i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert(i>=0&&j>i,'anchors '+a);return source.slice(i,j)}
const js=[
section('function q029WalletUiAllowed(){','function q046EvtPart(){'),
section('async function q046Action(','function q046PartnerLabel('),
section('function q046PlanRow(','function q046OrderSummaryHtml('),
section('function renderWalletBalance(){','function q046FinanceModal(')
].join('\n');
function make(role='USER',permissions={},session='SESSION'){
 const wallet={physical_cash:11108,free_now:11108,reserved_total:0,planned_items:[{finance_id:'P1',type:'Расход',amount:100,created_by_user_id:'OWNER'}],allocations:[{allocation_id:'A1',state:'RESERVED',amount:20,created_by_user_id:'OWNER'}],partners:[],obligations:[],forecast:{}};
 const elem={innerHTML:'',classList:{contains:()=>false}},posts=[];
 const ctx={console,Date,Math,JSON,Object,Array,String,Number,Boolean,Promise,Error,Set,Map,RegExp,
 S:{walletCanonical:wallet},Q046_WALLET_STAGE:{loaded:true,loading:false,error:''},WALLET_VIEW:'main',navigator:{onLine:true},
 document:{getElementById:key=>key==='wallet'?elem:null},backendSession:()=>session,backendDeviceId:()=> 'DEV',
 isAdmin1:()=>role==='ADMIN1',hasPermission:key=>role==='ADMIN1'||permissions[key]===true,
 canMutateRecord:(domain,action,owner)=>role==='ADMIN1'||(action==='update'&&(permissions['wallet.edit-all']===true||(owner==='OWNER'&&permissions['wallet.edit-own']===true))),
 q046PendingEvent:()=>({event_id:'ID',key:'K'}),q046ClearPending(){},
 backendPost:async p=>{posts.push(p);return {ok:true,wallet}},
 rub:n=>String(n),esc:n=>String(n||''),q046PartnerCard:()=>'',q046ObligationCard:()=>'',q046OrderSummaryHtml:()=>'',go(){},setWalletView(){}
 };
 vm.createContext(ctx);vm.runInContext(js,ctx,{filename:'Wallet real source rh3'});
 return {ctx,wallet,elem,posts,run:s=>vm.runInContext(s,ctx)};
}
(async()=>{
const none=make();none.run('renderWallet()');assert(none.elem.innerHTML.includes('Кошелёк недоступен'));assert(!none.elem.innerHTML.includes('11108'));
await assert.rejects(none.run("q046Action('finance_create',{action:'wallet.finance.create'})"),/WALLET_PERMISSION_DENIED/);
const view=make('USER',{'wallet.view':true});view.run('renderWallet()');assert(view.elem.innerHTML.includes('11108'));assert(!view.elem.innerHTML.includes('Добавить доход'));assert(!view.elem.innerHTML.includes('Отменить</button>'));
const add=make('USER',{'wallet.view':true,'wallet.add':true});add.run('renderWallet()');assert(add.elem.innerHTML.includes('Добавить доход'));assert(add.elem.innerHTML.includes('Запланировать доход'));assert(!add.elem.innerHTML.includes('Отменить</button>'));
assert(add.run("q046WalletActionAllowed({action:'wallet.finance.create'})"));assert(add.run("q046WalletActionAllowed({action:'wallet.allocation.create'})"));assert(!add.run("q046WalletActionAllowed({action:'wallet.plan.edit',planned_finance_id:'P1'})"));
const own=make('USER',{'wallet.view':true,'wallet.add':true,'wallet.edit-own':true,'wallet.edit-all':false});own.run('renderWallet()');assert(own.elem.innerHTML.includes('Отменить</button>'));
assert(own.run("q046WalletActionAllowed({action:'wallet.plan.cancel',planned_finance_id:'P1'})"));assert(own.run("q046WalletActionAllowed({action:'wallet.allocation.cancel',allocation_id:'A1'})"));
own.wallet.planned_items[0].created_by_user_id='OTHER';assert(!own.run("q046WalletActionAllowed({action:'wallet.plan.spend',planned_finance_id:'P1'})"));own.run('renderWallet()');assert(!own.elem.innerHTML.includes('Отменить</button>'));
const all=make('USER',{'wallet.view':true,'wallet.edit-all':true});all.wallet.planned_items[0].created_by_user_id='OTHER';assert(all.run("q046WalletActionAllowed({action:'wallet.plan.edit',planned_finance_id:'P1'})"));assert(!all.run("q046WalletActionAllowed({action:'wallet.sensitive.execute'})"));
const admin=make('ADMIN1');assert(admin.run("q046WalletActionAllowed({action:'wallet.sensitive.execute'})"));
const expired=make('ADMIN1',{},null);expired.run('renderWallet()');assert(expired.elem.innerHTML.includes('Кошелёк недоступен'));
assert(backend.includes("created_by_user_id:String(valueBy_(ft,r,'created_by_user_id')||'')"));
const v=JSON.parse(fs.readFileSync('version.json','utf8'));assert.equal(v.rolloutStage,'staging-only');assert.equal(v.dbSchema,5);assert(v.eligibleRoles.includes('USER'));
console.log(JSON.stringify({kind:'Q066_WALLET_MULTIUSER_ACTUAL_SOURCE',ok:true,assertions:19}));
})().catch(e=>{console.error(e);process.exitCode=1});
