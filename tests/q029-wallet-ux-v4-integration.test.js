'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('assets/app.js','utf8');
const backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
function extract(start,end){const i=source.indexOf(start),j=source.indexOf(end,i+start.length);assert(i>=0&&j>i,'source anchors '+start);return source.slice(i,j)}
const script=[
extract('function q046PlanRow(','function q046AllocationRow('),
extract('function renderWallet(){','function q046FinanceModal('),
extract('function q046PlanModal(','async function q046EditPlan('),
extract('async function q046SpendPlan(','async function q046CancelAllocation(')
].join('\n');
const wallet={physical_cash:11108,free_now:11108,reserved_total:0,forecast:{expected_real_inflows:0,planned_future_real_payments:0,forecast_cash:11108,horizon_end:'2026-11-09'},planned_items:[],partners:[],allocations:[]};
const elements={wallet:{innerHTML:''},q046PlanAmt:{value:'2000'},q046PlanDue:{value:'2026-10-24'},q046PlanCat:{value:'Ожидаемая оплата'},q046PlanComment:{value:'Тест'},q046ResAmt:{value:'8800'},q046ResType:{value:'MATERIALS'},q046ResLabel:{value:'Тестовый резерв'}};
let admin=true,modalHtml='',toast='',actions=[];
const ctx={console,Date,Number,String,Math,Promise,Array,Object,JSON,Map,Set,
  S:{walletCanonical:wallet},Q046_WALLET_STAGE:{loaded:true,loading:false,error:''},WALLET_VIEW:'main',q046WalletCanAdd:()=>true,q046WalletCanEdit:()=>true,
  document:{getElementById(id){return elements[id]||null}},q029WalletUiAllowed:()=>admin,
  q046WalletModel:()=>admin?wallet:null,q029LegacyRenderWallet:()=>{elements.wallet.innerHTML='LEGACY'},q046WalletNoAccess:()=>{elements.wallet.innerHTML='ACCESS_DENIED'},
  q046LoadCanonicalWallet:async()=>({ok:true}),
  rub:n=>String(n)+' ₽',esc:x=>String(x||''),q046PartnerCard:()=>'',q046FinanceModal:()=>{},
  closeModal(){},showAppToast:s=>{toast=s},modal:(title,body)=>{modalHtml=title+': '+body},
  prompt:()=> 'PRODUCTION_WALLET',confirm:()=>true,go:()=>{},setWalletView:()=>{},
  q046Action:async (kind,body)=>{
    actions.push({kind,...body});if(body.action==='wallet.plan.create'){wallet.planned_items.push({finance_id:'PLAN-'+actions.length,type:body.type,amount:body.amount,state:'PLANNED',category:body.category,due_date:body.due_date});if(body.type==='Приход')wallet.forecast.expected_real_inflows+=body.amount;}
    if(body.action==='wallet.plan.spend'){const item=wallet.planned_items.find(p=>p.finance_id===body.planned_finance_id);if(item){if(item.type==='Приход'){wallet.physical_cash+=item.amount;wallet.free_now+=item.amount;wallet.forecast.expected_real_inflows-=item.amount;}else{wallet.physical_cash-=item.amount;wallet.free_now-=item.amount;}wallet.planned_items=wallet.planned_items.filter(p=>p!==item)}}
    return {ok:true};
  }
};
vm.createContext(ctx);vm.runInContext(script,ctx,{filename:'actual-client-wallet-UX-functions'});
async function run(js){return vm.runInContext(js,ctx)}
(async()=>{
await run('renderWallet()');const html=elements.wallet.innerHTML;
assert(html.includes('Плановые доходы')&&html.includes('Запланировать доход'));
assert(html.indexOf('Добавить расход')<html.indexOf('Запланировать расход'));
assert(html.includes('q029-wallet-secondary-actions'));
await run("q046PlanModal('income')");assert(modalHtml.includes('Запланировать доход'));
await run("q046CreatePlan('income')");assert.equal(actions[0].type,'Приход');assert.equal(wallet.physical_cash,11108);
assert.equal(wallet.forecast.expected_real_inflows,2000);
await run('renderWallet()');assert(elements.wallet.innerHTML.includes('Получено'));
await run("q046SpendPlan('PLAN-1')");assert.equal(actions[1].cash_destination,'PRODUCTION_WALLET');assert.equal(actions[1].payment_source,undefined);
assert.equal(wallet.physical_cash,13108);assert.equal(wallet.forecast.expected_real_inflows,0);
await run('q046ReserveModal()');assert(modalHtml.includes('value="MATERIALS">Материалы'));assert(modalHtml.includes('Свободно для резерва'));
wallet.free_now=8108;const n=actions.length;await run('q046CreateReserve()');
assert.equal(actions.length,n);assert(toast.includes('Доступно 8108 ₽')&&toast.includes('8800 ₽'));
elements.q046ResAmt.value='1000';await run('q046CreateReserve()');assert.equal(actions.length,n+1);
assert.equal(actions[n].purpose_type,'MATERIALS');
admin=false;const k=actions.length;await run("q046CreatePlan('income')");await run('q046CreateReserve()');
assert.equal(actions.length,k);await run('renderWallet()');assert.equal(elements.wallet.innerHTML,'ACCESS_DENIED');
assert(backend.includes("if (q046Action === 'wallet.plan.create')"));
assert(backend.includes("expected_real_inflows:"));
assert(backend.includes("cash_destination:body.cash_destination||'NONE'"));
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.equal(version.rolloutStage,'staging-only');assert.equal(version.dbSchema,5);
console.log(JSON.stringify({kind:'Q029_WALLET_UX_V4_STAGING_ACTUAL_SOURCE',ok:true,passed:13,scope:'staging-only; synthetic VM, not production E2E'}));
})().catch(e=>{console.error(e);process.exitCode=1});
