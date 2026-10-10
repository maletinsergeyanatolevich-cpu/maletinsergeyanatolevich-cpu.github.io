'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const sourcePath='staging/q046/backend-q046.js';
const schemaPath='docs/q046-wallet-schema.json';
const source=fs.readFileSync(sourcePath,'utf8');
const schema=JSON.parse(fs.readFileSync(schemaPath,'utf8'));

function runtime(){
  const ctx={
    console,
    Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Map,Set,
    parseInt,parseFloat,isFinite,
    Utilities:{
      formatDate(){return '2026-10-09';},
      getUuid(){return 'UUID-TEST';},
      computeDigest(){return [1,2,3,4,5,6,7,8];},
      DigestAlgorithm:{SHA_256:'SHA_256'},
      Charset:{UTF_8:'UTF_8'}
    },
    LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}};}}
  };
  vm.createContext(ctx);
  const expose=`
;globalThis.__Q047_TEST_API__={
 CFG,Q046_WALLET,
 financeMovementClass_,
 q046FinanceCashDelta_,
 q046BuildCanonicalWallet_,
 q046OrderSummary_,
 q046MarkLinkedAllocation_,
 q047LinkedAllocations_,
 q047AssertLinkedAllocationSafe_,
 q046Obligations_,
 handleWalletSensitiveExecuteQ046_,
 handleWalletPlanSpendQ046_,handleWalletPlanCancelQ046_,q046ReservedTotal_,handleWalletSchemaMigrationPreviewQ049_,handleWalletSchemaMigrationApplyQ049_
};`;
  vm.runInContext(source+expose,ctx,{filename:sourcePath});
  return {ctx,api:ctx.__Q047_TEST_API__};
}
function setFn(rt,name,fn){rt.ctx.__stub=fn;vm.runInContext(name+'=globalThis.__stub',rt.ctx);delete rt.ctx.__stub;}
function table(headers,objects){
  const index={};headers.forEach((h,i)=>index[h]=i);
  const rows=objects.map(o=>headers.map(h=>Object.prototype.hasOwnProperty.call(o,h)?o[h]:''));
  return {headers,index,rows,sheet:{}};
}
function errCode(fn,code){let got='';try{fn();}catch(e){got=String(e&&e.message||e);}assert.strictEqual(got,code);}
function baseSensitive(rt,role='ADMIN1'){
  setFn(rt,'q046RequireSchemaReady_',()=>true);
  setFn(rt,'authSession_',()=>({user:{userId:'U1',name:'Test',role},deviceId:'DEV1'}));
  setFn(rt,'q046EventId_',b=>String(b.event_id||''));
  setFn(rt,'cleanId_',v=>String(v||''));
  setFn(rt,'touchSessionAndDevice_',()=>{});
  setFn(rt,'q046BuildCanonicalWallet_',()=>({physical_cash:11108,obligations:[]}));
  rt.ctx.LockService={getScriptLock(){return {waitLock(){},releaseLock(){}};}};
}

const results=[];
function test(n,name,fn){fn();results.push({n,name,pass:true});}

test(1,'canonical Wallet ignores legacy B1/B2',()=>{
  const rt=runtime();
  setFn(rt,'q046LatestAppliedRecon_',()=>({reconciliation_id:'EPOCH-1',production_cash_target:11108}));
  setFn(rt,'q046SafeTable_',name=>name==='Финансы'?table(['cash_epoch_id'],[]):null);
  setFn(rt,'q046ReservedTotal_',()=>0);
  setFn(rt,'q046PartnerCards_',()=>[{party_id:'SERGEY',funding_due:26109.52},{party_id:'EVGENY',distribution_balance:-2000}]);
  setFn(rt,'q046Obligations_',()=>[{obligation_id:'GUN',remaining:18954}]);
  setFn(rt,'q046PlannedFinance_',()=>[]);
  setFn(rt,'q046AllocationRows_',()=>[]);
  setFn(rt,'q046OrderSummary_',()=>({known_receivable_total:0,unknown_price_orders:[{order_no:'2026-009',received:14000}]}));
  setFn(rt,'spreadsheetTz_',()=> 'Etc/GMT');
  setFn(rt,'sheet_',name=>({getRange(r,c){return {getValue(){return r===1?23981.15:39028.02;}};}}));
  const w=rt.api.q046BuildCanonicalWallet_({horizon:'month'});
  assert.strictEqual(w.physical_cash,11108);
  assert.strictEqual(w.free_now,11108);
  assert.strictEqual(w.legacy_compatibility_only.wallet_b1,23981.15);
  assert.strictEqual(w.partners[0].funding_due,26109.52);
});

test(2,'cash epoch route semantics use only production-wallet factual rows',()=>{
  const rt=runtime();
  const t=table(['cash_epoch_id','is_deleted','Фактическая операция','Тип','Сумма','cash_destination','Источник денег / оплаты'],[
    {cash_epoch_id:'E1',is_deleted:false,'Фактическая операция':'Да','Тип':'Приход','Сумма':100,cash_destination:'PRODUCTION_WALLET'},
    {cash_epoch_id:'E1',is_deleted:false,'Фактическая операция':'Да','Тип':'Расход','Сумма':30,'Источник денег / оплаты':'PRODUCTION_WALLET'},
    {cash_epoch_id:'E1',is_deleted:false,'Фактическая операция':'Да','Тип':'Расход','Сумма':50,'Источник денег / оплаты':'PERSON'},
    {cash_epoch_id:'OLD',is_deleted:false,'Фактическая операция':'Да','Тип':'Приход','Сумма':999,cash_destination:'PRODUCTION_WALLET'}
  ]);
  const delta=t.rows.reduce((s,r)=>s+rt.api.q046FinanceCashDelta_(t,r,'E1'),0);
  assert.strictEqual(delta,70);
});

test(3,'linked reserve Plan->Spent leaves no active RESERVED balance',()=>{
  const rt=runtime();
  const t=table(['allocation_id','planned_finance_id','state','is_deleted'],[
    {allocation_id:'A1',planned_finance_id:'P1',state:'RESERVED',is_deleted:false}
  ]);
  setFn(rt,'q046SafeTable_',()=>t);
  setFn(rt,'q046UpdateAllocation_',(id,patch)=>{
    const row=t.rows.find(r=>r[t.index.allocation_id]===id);Object.keys(patch).forEach(k=>row[t.index[k]]=patch[k]);
    return {item:Object.fromEntries(t.headers.map((h,i)=>[h,row[i]]))};
  });
  rt.api.q046MarkLinkedAllocation_('P1','EXECUTED','FIN1',{user:{userId:'U1'}},'EV1');
  assert.strictEqual(rt.api.q047LinkedAllocations_('P1').active.length,0);
  assert.strictEqual(t.rows[0][t.index.state],'EXECUTED');
});

test(4,'duplicate active linked reserve fails closed',()=>{
  const rt=runtime();
  const t=table(['allocation_id','planned_finance_id','state','is_deleted'],[
    {allocation_id:'A1',planned_finance_id:'P1',state:'RESERVED',is_deleted:false},
    {allocation_id:'A2',planned_finance_id:'P1',state:'PLANNED',is_deleted:false}
  ]);
  setFn(rt,'q046SafeTable_',()=>t);
  let updates=0;setFn(rt,'q046UpdateAllocation_',()=>{updates++;return {item:{}};});
  errCode(()=>rt.api.q046MarkLinkedAllocation_('P1','EXECUTED','FIN1',{user:{userId:'U1'}},'EV1'),'DUPLICATE_ACTIVE_LINKED_ALLOCATIONS');
  assert.strictEqual(updates,0);
});

test(5,'obligation exact residual payment passes and remaining becomes zero once',()=>{
  const rt=runtime();baseSensitive(rt);
  setFn(rt,'q046FinanceByEvent_',()=>null);setFn(rt,'q046ObligationByEvent_',()=>null);
  setFn(rt,'q046Obligations_',()=>[{obligation_id:'OB1',remaining:1000,regular_payment_amount:2708}]);
  let creates=0,specSeen=null;
  setFn(rt,'q046CreateFinanceInternal_',(spec)=>{creates++;specSeen=spec;return {duplicate:false,item:{'ID операции':'FIN1',obligation_id:'OB1'}};});
  setFn(rt,'q046BuildCanonicalWallet_',()=>({obligations:[{obligation_id:'OB1',remaining:creates?0:1000}]}));
  const r=rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E5',action_type:'OBLIGATION_PAYMENT',amount:1000,obligation_id:'OB1'},'R5');
  assert.strictEqual(r.ok,true);assert.strictEqual(creates,1);assert.strictEqual(r.wallet.obligations[0].remaining,0);
  assert.strictEqual(specSeen.financial_meaning,'NON_OPERATING_OBLIGATION_PAYMENT');
});

test(6,'obligation overpayment rejects with zero mutation',()=>{
  const rt=runtime();baseSensitive(rt);
  setFn(rt,'q046FinanceByEvent_',()=>null);setFn(rt,'q046ObligationByEvent_',()=>null);
  setFn(rt,'q046Obligations_',()=>[{obligation_id:'OB1',remaining:1000,regular_payment_amount:2708}]);
  let creates=0;setFn(rt,'q046CreateFinanceInternal_',()=>{creates++;return {duplicate:false,item:{}};});
  errCode(()=>rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E6',action_type:'OBLIGATION_PAYMENT',amount:1100,obligation_id:'OB1'},'R6'),'OBLIGATION_PAYMENT_EXCEEDS_REMAINING');
  assert.strictEqual(creates,0);
});

test(7,'repeated obligation payment same event produces one business effect',()=>{
  const rt=runtime();baseSensitive(rt);
  let prior=null,creates=0;
  setFn(rt,'q046FinanceByEvent_',()=>prior?{obj:prior}:null);setFn(rt,'q046ObligationByEvent_',()=>null);
  setFn(rt,'q046Obligations_',()=>[{obligation_id:'OB1',remaining:1000}]);
  setFn(rt,'q046CreateFinanceInternal_',(spec)=>{creates++;prior={'ID операции':'FIN-E7',obligation_id:'OB1','Финансовый смысл':spec.financial_meaning};return {duplicate:false,item:prior};});
  const a=rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E7',action_type:'OBLIGATION_PAYMENT',amount:1000,obligation_id:'OB1'},'R7a');
  const b=rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E7',action_type:'OBLIGATION_PAYMENT',amount:1000,obligation_id:'OB1'},'R7b');
  assert.strictEqual(a.duplicate,false);assert.strictEqual(b.duplicate,true);assert.strictEqual(b.prior_result,true);assert.strictEqual(creates,1);
});

test(8,'third-party loan increases cash route + obligation and is non-operating',()=>{
  const rt=runtime();baseSensitive(rt);
  setFn(rt,'q046FinanceByEvent_',()=>null);setFn(rt,'q046ObligationByEvent_',()=>null);setFn(rt,'q046StableId_',()=> 'FIN-LOAN');
  let obSpec=null,finSpec=null;
  setFn(rt,'q046CreateObligationInternal_',(s)=>{obSpec=s;return {duplicate:false,item:{obligation_id:'OB-LOAN'}};});
  setFn(rt,'q046CreateFinanceInternal_',(s)=>{finSpec=s;return {duplicate:false,item:{'ID операции':'FIN-LOAN',obligation_id:'OB-LOAN'}};});
  const r=rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E8',action_type:'THIRD_PARTY_LOAN_INFLOW',amount:5000},'R8');
  assert.strictEqual(r.ok,true);assert.strictEqual(obSpec.original_amount,5000);assert.strictEqual(finSpec.cash_destination,'PRODUCTION_WALLET');
  assert.strictEqual(finSpec.financial_meaning,'NON_OPERATING_LOAN_INFLOW');
  assert.strictEqual(rt.api.financeMovementClass_('Приход','','Займ / кредит','',finSpec.financial_meaning),'non_operating');
});

test(9,'owner reimbursement reduces funding route but not operating expense class',()=>{
  const rt=runtime();baseSensitive(rt);
  setFn(rt,'q046FinanceByEvent_',()=>null);setFn(rt,'q046ObligationByEvent_',()=>null);
  setFn(rt,'q046PartnerCards_',()=>[{party_id:'P1',funding_due:5000}]);
  let finSpec=null,delta=null;
  setFn(rt,'q046CreateFinanceInternal_',(s)=>{finSpec=s;return {duplicate:false,item:{'ID операции':'FIN9',partner_settlement_entry_id:''}};});
  setFn(rt,'financeWaveAppendSettlement_',(event,type,party,amount,fundingDelta)=>{delta=fundingDelta;return {settlement_entry_id:'S9'};});
  setFn(rt,'q046LinkSettlement_',()=>{});
  rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E9',action_type:'OWNER_REIMBURSEMENT',amount:1000,partner_party_id:'P1'},'R9');
  assert.strictEqual(finSpec.payment_source,'PRODUCTION_WALLET');assert.strictEqual(delta,-1000);
  assert.strictEqual(finSpec.financial_meaning,'NON_OPERATING_PARTNER_REPAYMENT');
  assert.strictEqual(rt.api.financeMovementClass_('Расход','','Возврат финансирования партнёру','',finSpec.financial_meaning),'non_operating');
});

test(10,'partner distribution reduces distribution balance but not operating expense class',()=>{
  const rt=runtime();baseSensitive(rt);
  setFn(rt,'q046FinanceByEvent_',()=>null);setFn(rt,'q046ObligationByEvent_',()=>null);
  let finSpec=null,distDelta=null;
  setFn(rt,'q046CreateFinanceInternal_',(s)=>{finSpec=s;return {duplicate:false,item:{'ID операции':'FIN10',partner_settlement_entry_id:''}};});
  setFn(rt,'financeWaveAppendSettlement_',(event,type,party,amount,fundingDelta,distributionDelta)=>{distDelta=distributionDelta;return {settlement_entry_id:'S10'};});
  setFn(rt,'q046LinkSettlement_',()=>{});
  rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E10',action_type:'PARTNER_DISTRIBUTION',amount:700,partner_party_id:'P2'},'R10');
  assert.strictEqual(distDelta,-700);assert.strictEqual(finSpec.financial_meaning,'NON_OPERATING_OWNER_DISTRIBUTION');
  assert.strictEqual(rt.api.financeMovementClass_('Расход','','Вывод партнёру','',finSpec.financial_meaning),'non_operating');
});

test(11,'planned Spent retry uses one factual Finance row',()=>{
  const rt=runtime();
  setFn(rt,'q046RequireSchemaReady_',()=>true);setFn(rt,'authSession_',()=>({user:{userId:'U1'},deviceId:'D1'}));setFn(rt,'q046EventId_',b=>b.event_id);setFn(rt,'cleanId_',v=>String(v));setFn(rt,'q046PermissionEdit_',()=>true);setFn(rt,'touchSessionAndDevice_',()=>{});setFn(rt,'q047AssertLinkedAllocationSafe_',()=>({active:[]}));setFn(rt,'q046BuildCanonicalWallet_',()=>({}));
  rt.ctx.LockService={getScriptLock(){return {waitLock(){},releaseLock(){}};}};
  const plan={created_by_user_id:'U1',plan_state:'PLANNED',executed_finance_id:'','Тип':'Расход','Сумма':900,'Категория':'Материалы','Подкатегория':'','№ заказа':'','Контрагент / поставщик':'','Описание':'test'};
  setFn(rt,'q046FinanceById_',()=>({obj:plan}));
  let creates=0;setFn(rt,'q046CreateFinanceInternal_',()=>{creates++;return {duplicate:false,item:{'ID операции':'FIN11'}};});
  setFn(rt,'q046PatchFinance_',(id,patch)=>{Object.assign(plan,patch);return {duplicate:false,item:plan};});
  setFn(rt,'q046MarkLinkedAllocation_',()=>null);
  const a=rt.api.handleWalletPlanSpendQ046_({event_id:'E11',planned_finance_id:'P11',payment_source:'PRODUCTION_WALLET'},'R11a');
  const b=rt.api.handleWalletPlanSpendQ046_({event_id:'E11',planned_finance_id:'P11',payment_source:'PRODUCTION_WALLET'},'R11b');
  assert.strictEqual(a.executed_finance_id,'FIN11');assert.strictEqual(b.duplicate,true);assert.strictEqual(creates,1);
});

test(12,'sensitive same-event retry returns prior-result duplicate semantics',()=>{
  const rt=runtime();baseSensitive(rt);
  setFn(rt,'q046FinanceByEvent_',()=>({obj:{'ID операции':'FIN12',partner_settlement_entry_id:'SET12',partner_party_id:'P1'}}));
  setFn(rt,'q046ObligationByEvent_',()=>null);
  let creates=0;setFn(rt,'q046CreateFinanceInternal_',()=>{creates++;return {duplicate:false,item:{}};});
  const r=rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E12',action_type:'OWNER_REIMBURSEMENT',amount:1000,partner_party_id:'P1'},'R12');
  assert.strictEqual(r.duplicate,true);assert.strictEqual(r.prior_result,true);assert.strictEqual(r.finance_id,'FIN12');assert.strictEqual(r.settlement_id,'SET12');assert.strictEqual(creates,0);
});

test(13,'regular wallet.view user is denied sensitive action',()=>{
  const rt=runtime();baseSensitive(rt,'WORKER');
  errCode(()=>rt.api.handleWalletSensitiveExecuteQ046_({event_id:'E13',action_type:'OBLIGATION_PAYMENT',amount:100,obligation_id:'OB1'},'R13'),'PERMISSION_DENIED:ADMIN1_WALLET_SENSITIVE');
});

test(14,'order future completion need is numeric when supported and null when unknown',()=>{
  const rt=runtime();
  const orders=table(['ID заказа','№ заказа','Статус','is_deleted','price_state','Цена клиенту','Получено','Название заказа','Имя клиента'],[
    {'ID заказа':'OID1','№ заказа':'2026-001','Статус':'В работе',is_deleted:false,price_state:'KNOWN','Цена клиенту':10000,'Получено':2000,'Название заказа':'Known need'},
    {'ID заказа':'OID2','№ заказа':'2026-002','Статус':'В работе',is_deleted:false,price_state:'UNKNOWN','Цена клиенту':'','Получено':3000,'Название заказа':'Unknown need'}
  ]);
  setFn(rt,'q046SafeTable_',name=>name==='Заказы'?orders:null);
  setFn(rt,'q046PlannedFinance_',()=>[{finance_id:'P1',type:'Расход',amount:500,order_id:'2026-001',state:'PLANNED'}]);
  setFn(rt,'q046AllocationRows_',()=>[{allocation_id:'A1',state:'RESERVED',amount:200,target_order_id:'OID1',planned_finance_id:'',is_deleted:false}]);
  const o=rt.api.q046OrderSummary_();
  assert.strictEqual(o.known_future_completion_cash_need_total,700);
  assert.strictEqual(o.known_orders[0].future_completion_cash_need,700);
  assert.strictEqual(o.unknown_price_orders[0].future_completion_cash_need,null);
  assert.strictEqual(o.unknown_price_orders[0].future_completion_cash_need_display,'не рассчитано');
  assert.strictEqual(o.unknown_future_completion_cost_order_count,1);
});

test(15,'actual source syntax and schema artifact are consistent',()=>{
  new vm.Script(source,{filename:sourcePath});
  const rt=runtime();
  assert.deepStrictEqual(Array.from(rt.api.Q046_WALLET.financeFields),schema.finance_additive_fields);
  assert.strictEqual(schema.packet,'Q-047');
  assert.strictEqual(schema.version,'1.1');
  assert.strictEqual(schema.wallet_allocations.active_link_contract.rule,'AT_MOST_ONE_ACTIVE_PER_PLANNED_FINANCE_ID');
  assert.strictEqual(schema.obligation_payment_guard.clamp_overpayment,false);
  assert.ok(schema.non_operating_financial_meanings.includes('NON_OPERATING_LOAN_INFLOW'));
  assert.strictEqual(rt.api.CFG.VERSION,'backend-0.2.31-staging-q049');
});


function q048Fixture(mode,dups){
  const rt=runtime(),plan={created_by_user_id:'U1',plan_state:'PLANNED',executed_finance_id:'',
    'Тип':'Расход','Сумма':200,'Категория':'Материалы','Подкатегория':'','№ заказа':'',
    'Контрагент / поставщик':'','Описание':'Q048 fixture'};
  const list=[{allocation_id:'A48',planned_finance_id:'P48',state:'RESERVED',executed_finance_id:'',amount:200,is_deleted:false}];
  if(dups)list.push({allocation_id:'A49',planned_finance_id:'P48',state:'PLANNED',executed_finance_id:'',amount:25,is_deleted:false});
  const t=table(['allocation_id','planned_finance_id','state','executed_finance_id','amount','is_deleted'],list);
  const counters={created:0,allocUpdated:0,planPatched:0,failOnce:true};
  setFn(rt,'q046RequireSchemaReady_',()=>true);
  setFn(rt,'authSession_',()=>({user:{userId:'U1',name:'Q048',role:'ADMIN1'},deviceId:'DEV'}));
  setFn(rt,'q046EventId_',b=>b.event_id);
  setFn(rt,'cleanId_',v=>String(v));
  setFn(rt,'q046PermissionEdit_',()=>true);
  setFn(rt,'touchSessionAndDevice_',()=>{});
  setFn(rt,'q046FinanceById_',()=>({obj:plan}));
  setFn(rt,'q046SafeTable_',()=>t);
  setFn(rt,'q046AllocationRows_',()=>t.rows.map(row=>Object.fromEntries(t.headers.map((h,i)=>[h,row[i]]))));
  setFn(rt,'q046BuildCanonicalWallet_',()=>({physical_cash:11108,free_now:11108-rt.api.q046ReservedTotal_()}));
  setFn(rt,'q046CreateFinanceInternal_',()=>{counters.created++;return {duplicate:false,item:{'ID операции':'FIN48'}};});
  setFn(rt,'q046PatchFinance_',(_id,patch)=>{counters.planPatched++;Object.assign(plan,patch);return {duplicate:false,item:plan};});
  setFn(rt,'q046UpdateAllocation_',(_id,patch)=>{
    if(counters.failOnce){counters.failOnce=false;throw new Error('INJECTED_LINK_WRITE_FAIL');}
    counters.allocUpdated++;
    Object.keys(patch).forEach(k=>t.rows[0][t.index[k]]=patch[k]);
    return {duplicate:false,item:Object.fromEntries(t.headers.map((h,i)=>[h,t.rows[0][i]]))};
  });
  const b={event_id:'Q048-SAME-EVENT',planned_finance_id:'P48',payment_source:'PRODUCTION_WALLET'};
  const run=(req)=>mode==='SPEND'?rt.api.handleWalletPlanSpendQ046_(b,req):rt.api.handleWalletPlanCancelQ046_(b,req);
  return {rt,t,plan,counters,run};
}
test(16,'Q048 Spend partial failure after Finance+plan patch preserves a RESERVED allocation',()=>{
  const x=q048Fixture('SPEND');errCode(()=>x.run('S1'),'INJECTED_LINK_WRITE_FAIL');
  assert.strictEqual(x.counters.created,1);assert.strictEqual(x.plan.plan_state,'EXECUTED');
  assert.strictEqual(x.plan.executed_finance_id,'FIN48');assert.strictEqual(x.rt.api.q046ReservedTotal_(),200);
  assert.strictEqual(x.t.rows[0][x.t.index.state],'RESERVED');
});
test(17,'Q048 Spend same-event retry repairs reserve and third retry is a no-op',()=>{
  const x=q048Fixture('SPEND');errCode(()=>x.run('S1'),'INJECTED_LINK_WRITE_FAIL');
  const b=x.run('S2');
  assert.strictEqual(b.duplicate,true);assert.strictEqual(b.prior_result,true);
  assert.strictEqual(b.repaired_partial,true);assert.strictEqual(b.executed_finance_id,'FIN48');
  assert.strictEqual(x.counters.created,1);assert.strictEqual(x.counters.allocUpdated,1);
  assert.strictEqual(x.t.rows[0][x.t.index.executed_finance_id],'FIN48');
  assert.strictEqual(x.rt.api.q046ReservedTotal_(),0);assert.strictEqual(b.wallet.free_now,11108);
  const before=JSON.stringify(x.t.rows),c=x.run('S3');
  assert.strictEqual(c.duplicate,true);assert.strictEqual(c.prior_result,true);assert.strictEqual(c.repaired_partial,false);
  assert.strictEqual(x.counters.created,1);assert.strictEqual(x.counters.allocUpdated,1);
  assert.strictEqual(JSON.stringify(x.t.rows),before);
});
test(18,'Q048 Cancel partial failure after plan patch leaves cash unchanged',()=>{
  const x=q048Fixture('CANCEL');errCode(()=>x.run('C1'),'INJECTED_LINK_WRITE_FAIL');
  assert.strictEqual(x.plan.plan_state,'CANCELLED');assert.strictEqual(x.counters.created,0);
  assert.strictEqual(x.rt.api.q046ReservedTotal_(),200);
});
test(19,'Q048 Cancel same-event retry repairs reserve and third retry is a no-op',()=>{
  const x=q048Fixture('CANCEL');errCode(()=>x.run('C1'),'INJECTED_LINK_WRITE_FAIL');
  const r=x.run('C2');
  assert.strictEqual(r.duplicate,true);assert.strictEqual(r.prior_result,true);assert.strictEqual(r.repaired_partial,true);
  assert.strictEqual(x.counters.created,0);assert.strictEqual(x.counters.allocUpdated,1);
  assert.strictEqual(x.t.rows[0][x.t.index.state],'CANCELLED');
  assert.strictEqual(x.rt.api.q046ReservedTotal_(),0);assert.strictEqual(r.wallet.free_now,11108);
  const before=JSON.stringify(x.t.rows),c=x.run('C3');
  assert.strictEqual(c.repaired_partial,false);assert.strictEqual(c.duplicate,true);assert.strictEqual(c.prior_result,true);
  assert.strictEqual(x.counters.created,0);assert.strictEqual(x.counters.allocUpdated,1);
  assert.strictEqual(JSON.stringify(x.t.rows),before);
});
test(20,'Q048 Spend partial retry with duplicate active links fails closed',()=>{
  const x=q048Fixture('SPEND',true);x.plan.plan_state='EXECUTED';x.plan.executed_finance_id='FIN48';
  errCode(()=>x.run('S-DUP'),'DUPLICATE_ACTIVE_LINKED_ALLOCATIONS');
  assert.strictEqual(x.counters.created,0);assert.strictEqual(x.counters.planPatched,0);assert.strictEqual(x.counters.allocUpdated,0);
});
test(21,'Q048 Cancel partial retry with duplicate active links fails closed',()=>{
  const x=q048Fixture('CANCEL',true);x.plan.plan_state='CANCELLED';
  errCode(()=>x.run('C-DUP'),'DUPLICATE_ACTIVE_LINKED_ALLOCATIONS');
  assert.strictEqual(x.counters.created,0);assert.strictEqual(x.counters.planPatched,0);assert.strictEqual(x.counters.allocUpdated,0);
});


function q049Fixture(opt={}){
  const rt=runtime(),writes=[],db={},F=rt.api.Q046_WALLET.financeFields,
    H=rt.api.Q046_WALLET.allocationHeaders,alloc=rt.api.Q046_WALLET.allocationSheet;
  let locked=false,fail='',failed=false;
  function check(stage){
    if(!locked)throw Error('MIGRATION_WITHOUT_LOCK');
    if(stage===fail&&!failed){failed=true;throw Error('INJECTED_'+stage);}
    writes.push(stage);
  }
  class TestSheet{
    constructor(rows){this.rows=rows.map(r=>r.slice());}
    getLastRow(){return this.rows.length;}
    getLastColumn(){return this.rows[0]?this.rows[0].length:0;}
    getRange(r,c,n=1,w=1){const sh=this;
      const values=()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>(sh.rows[r+i-1]||[])[c+j-1]??''));
      return {getValues:values,getDisplayValues(){return values().map(v=>v.map(String));},getValue(){return values()[0][0];},getDisplayValue(){return String(values()[0][0]);},
        setValue(v){check('column-'+c);while(sh.rows.length<r)sh.rows.push([]);sh.rows[r-1][c-1]=v;},
        setValues(v){check('setValues');v.forEach((a,i)=>{while(sh.rows.length<r+i)sh.rows.push([]);a.forEach((z,j)=>sh.rows[r+i-1][c+j-1]=z);});}};
    }
    appendRow(r){check('appendHead');this.rows.push(r.slice());}
    hideSheet(){}
  }
  function put(n,rows){db[n]=new TestSheet(rows);return db[n];}
  put('Финансы',[['ID операции','Тип','Сумма'],...Array.from({length:116},(_,i)=>['FIN-'+(i+1),'Расход',100])]);
  put('_DOMAIN_HEADS',[['domain','schema_version','current_rev','updated_at','row_count','last_event_id','checksum'],['finance','1.0',7,'',116,'','']]);
  if(opt.field1)db['Финансы'].rows[0].push(F[0]);
  if(opt.field2)db['Финансы'].rows[0].push(F[1]);
  if(opt.alloc==='exact')put(alloc,[Array.from(H)]);
  if(opt.alloc==='wrong')put(alloc,[['allocation_id','WRONG']]);
  if(opt.alloc==='prefix')put(alloc,[Array.from(H).slice(0,4)]);
  if(opt.head)db['_DOMAIN_HEADS'].rows.push(['wallet_allocations','1.0',opt.head.rev||0,'',opt.head.count||0,'','']);
  if(opt.addData){const d=Array(H.length).fill('');d[0]='ALLOC-1';db[alloc].rows.push(d);}
  const ss={getSheetByName(n){return db[n]||null;},insertSheet(n){check('insertSheet');const s=put(n,[]);if(fail==='afterInsert'&&!failed){failed=true;throw Error('INJECTED_afterInsert');}return s;}};
  setFn(rt,'ss_',()=>ss);
  setFn(rt,'authSession_',token=>{if(token!=='Q049_SESSION')throw Error('SESSION_INVALID');return {user:{userId:'U1',role:opt.role||'ADMIN1'}};});
  setFn(rt,'nowIso_',()=> '2026-10-09T00:00:00Z');
  rt.ctx.LockService={getScriptLock(){return {waitLock(){locked=true;},releaseLock(){locked=false;}};}};
  const body={session_token:'Q049_SESSION',event_id:'Q049-EVENT',apply_authorized:true,confirm_code:'Q049_WALLET_SCHEMA_APPLY'};
  return {rt,db,writes,body,F,H,alloc,
    preview:(b=body)=>rt.api.handleWalletSchemaMigrationPreviewQ049_(b,'R49P'),
    apply:(b=body)=>rt.api.handleWalletSchemaMigrationApplyQ049_(b,'R49A'),
    fail:(s)=>{fail=s;failed=false;},snap:n=>JSON.stringify(db[n].rows)};
}
test(22,'Q049 pristine preview exact plan and no writes',()=>{
 const x=q049Fixture(),r=x.preview();
 assert.strictEqual(r.read_only,true);assert.strictEqual(r.finance_row_count,116);
 assert.strictEqual(r.finance_last_id,'FIN-116');assert.strictEqual(r.planned_changes.length,4);
 assert.strictEqual(x.writes.length,0);
});
test(23,'Q049 non ADMIN1 cannot preview or apply',()=>{
 const x=q049Fixture({role:'WORKER'});
 errCode(()=>x.preview(),'PERMISSION_DENIED:ADMIN1_WALLET_SCHEMA');
 errCode(()=>x.apply(),'PERMISSION_DENIED:ADMIN1_WALLET_SCHEMA');
 assert.strictEqual(x.writes.length,0);
});
test(24,'Q049 valid session, event and confirmation mandatory',()=>{
 const x=q049Fixture();
 errCode(()=>x.preview({...x.body,session_token:'BAD'}),'SESSION_INVALID');
 errCode(()=>x.apply({...x.body,event_id:''}),'EVENT_ID_REQUIRED');
 errCode(()=>x.apply({...x.body,apply_authorized:false}),'MIGRATION_CONFIRMATION_REQUIRED');
 errCode(()=>x.apply({...x.body,confirm_code:'BAD'}),'MIGRATION_CONFIRMATION_REQUIRED');
 assert.strictEqual(x.writes.length,0);
});
test(25,'Q049 pristine apply creates fields sheet head, blank historical values',()=>{
 const x=q049Fixture(),pre=x.snap('Финансы'),r=x.apply();
 assert.strictEqual(r.schema_ready,true);assert.strictEqual(r.business_writes,0);
 assert.strictEqual(r.existing_finance_rows_backfilled,0);
 assert.deepStrictEqual(Array.from(r.added_finance_fields),Array.from(x.F));
 assert.deepStrictEqual(x.db[x.alloc].rows[0],Array.from(x.H));
 assert.strictEqual(x.db['_DOMAIN_HEADS'].rows.length,3);
 for(let i=1;i<117;i++){
   assert.deepStrictEqual(x.db['Финансы'].rows[i].slice(0,3),JSON.parse(pre)[i].slice(0,3));
   assert.ok(x.db['Финансы'].rows[i][3]==null||x.db['Финансы'].rows[i][3]==='');
   assert.ok(x.db['Финансы'].rows[i][4]==null||x.db['Финансы'].rows[i][4]==='');
 }
});
test(26,'Q049 same event after apply is a no-op',()=>{
 const x=q049Fixture();x.apply();const n=x.writes.length;
 const r=x.apply();assert.strictEqual(r.duplicate,true);assert.strictEqual(r.prior_result,true);
 assert.strictEqual(x.writes.length,n);
});
test(27,'Q049 different event after completed migration is also a no-op',()=>{
 const x=q049Fixture();x.apply();const n=x.writes.length;
 const r=x.apply({...x.body,event_id:'Q049-NEW'});assert.strictEqual(r.duplicate,true);assert.strictEqual(x.writes.length,n);
});
test(28,'Q049 partial first Finance column resumes safely',()=>{
 const x=q049Fixture();x.fail('column-5');
 errCode(()=>x.apply(),'INJECTED_column-5');x.fail('');const r=x.apply();
 assert.strictEqual(r.repaired_partial,true);
 assert.strictEqual(x.db['Финансы'].rows[0].filter(v=>v===x.F[0]).length,1);
 assert.strictEqual(x.db['Финансы'].rows[0].filter(v=>v===x.F[1]).length,1);
});
test(29,'Q049 existing compatible allocation headers reused',()=>{
 const x=q049Fixture({alloc:'exact'}),pre=x.snap(x.alloc),r=x.apply();
 assert.strictEqual(r.wallet_allocations_sheet_created,false);assert.strictEqual(x.snap(x.alloc),pre);
});
test(30,'Q049 incompatible allocation headers fail closed',()=>{
 const x=q049Fixture({alloc:'wrong'});
 errCode(()=>x.preview(),'MIGRATION_SCHEMA_CONFLICT');
 errCode(()=>x.apply(),'MIGRATION_SCHEMA_CONFLICT');assert.strictEqual(x.writes.length,0);
});
test(31,'Q049 existing head rev/count preserved',()=>{
 const x=q049Fixture({field1:true,field2:true,alloc:'exact',head:{rev:7,count:1},addData:true}),pre=x.snap('_DOMAIN_HEADS'),r=x.apply();
 assert.strictEqual(r.duplicate,true);assert.strictEqual(r.wallet_allocations_head_state.current_rev,7);
 assert.strictEqual(x.snap('_DOMAIN_HEADS'),pre);assert.strictEqual(x.writes.length,0);
});
test(32,'Q049 failure after allocation sheet insertion resumes blank sheet',()=>{
 const x=q049Fixture();x.fail('afterInsert');errCode(()=>x.apply(),'INJECTED_afterInsert');
 assert.strictEqual(x.db[x.alloc].getLastColumn(),0);x.fail('');const r=x.apply();
 assert.strictEqual(r.repaired_partial,true);assert.deepStrictEqual(x.db[x.alloc].rows[0],Array.from(x.H));
});
test(33,'Q049 partial allocation header prefix resumes',()=>{
 const x=q049Fixture({field1:true,field2:true,alloc:'prefix'}),r=x.apply();
 assert.strictEqual(r.repaired_partial,true);assert.deepStrictEqual(x.db[x.alloc].rows[0],Array.from(x.H));
});
test(34,'Q049 failure after sheet before head append resumes',()=>{
 const x=q049Fixture();x.fail('appendHead');errCode(()=>x.apply(),'INJECTED_appendHead');
 const pre=x.snap(x.alloc);x.fail('');const r=x.apply();
 assert.strictEqual(r.repaired_partial,true);assert.strictEqual(x.snap(x.alloc),pre);
});

console.log(JSON.stringify({ok:true,kind:'Q047_Q048_Q049_ACTUAL_SOURCE_HANDLER_FIXTURES',q047:{passed:15,total:15},q048:{passed:6,total:6},q049:{passed:results.length-21,total:13},passed:results.length,total:34,results},null,2));
