/*
 * Q-079 / Q-029 — isolated Wallet 2.0 financial semantics core, B2 SOURCE ONLY.
 * NO DOM, Google Sheets, Apps Script, local storage, network, or real-user access.
 * Not imported by the production PWA or GAS. No business data is embedded here.
 * Values are integer kopeks; quantities are integer milli-units (1/1000).
 * All events are immutable, generation-bound, version-checked, and auditable.
 */
'use strict';

const CONTRACT = 'Q079-WALLET-ENGINE-B2-v1';
const START_DATE = '2026-10-21'; // Asia/Tomsk business date, supplied by server adapter.
const TYPES = Object.freeze([
  'OPENING_CONFIRM', 'CASH_RECEIPT', 'CUSTODY_TRANSFER', 'PARTNER_CONTRIBUTION', 'PARTNER_RETURN',
  'MATERIAL_PURCHASE', 'MATERIAL_ALLOCATE', 'WAGE_ACCRUE', 'WAGE_PAY',
  'SUPPLIER_PAY', 'LOAN_RECEIVE', 'LOAN_REPAY', 'OPERATING_EXPENSE',
  'PLAN_CREATE', 'PLAN_SPEND', 'RESERVE_CREATE', 'RESERVE_RELEASE',
  'REVENUE_RECOGNIZE', 'ORDER_COSTS_CONFIRM', 'PROFIT_VERIFY',
  'PROFIT_ASSIGN', 'PROFIT_PAY', 'PARTNER_WITHDRAWAL', 'PROFIT_OFFSET'
]);
const REQUIRED_PERMISSION = Object.freeze({
  OPENING_CONFIRM:'wallet.opening_confirm', CASH_RECEIPT:'wallet.add', CUSTODY_TRANSFER:'wallet.transfer',
  PARTNER_CONTRIBUTION:'wallet.partner_funding', PARTNER_RETURN:'wallet.partner_return',
  MATERIAL_PURCHASE:'wallet.add', MATERIAL_ALLOCATE:'wallet.resources',
  WAGE_ACCRUE:'wallet.wage_accrue', WAGE_PAY:'wallet.wage_pay',
  SUPPLIER_PAY:'wallet.obligation_pay', LOAN_RECEIVE:'wallet.loan_manage',
  LOAN_REPAY:'wallet.obligation_pay', OPERATING_EXPENSE:'wallet.add',
  PLAN_CREATE:'wallet.plan', PLAN_SPEND:'wallet.add',
  RESERVE_CREATE:'wallet.reserve', RESERVE_RELEASE:'wallet.reserve',
  REVENUE_RECOGNIZE:'wallet.revenue_recognize', ORDER_COSTS_CONFIRM:'wallet.order_cost_confirm',
  PROFIT_VERIFY:'wallet.profit_verify', PROFIT_ASSIGN:'wallet.profit_assign',
  PROFIT_PAY:'wallet.profit_pay', PARTNER_WITHDRAWAL:'wallet.partner_withdraw',
  PROFIT_OFFSET:'wallet.profit_offset'
});
function fail(code){const e=new Error(code);e.code=code;throw e;}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function obj(v, label){if(!v||typeof v!=='object'||Array.isArray(v))fail(label+'_OBJECT_REQUIRED');return v;}
function id(v,label){if(typeof v!=='string'||['__proto__','prototype','constructor'].includes(v)||!/^[-_A-Za-z0-9.:]{3,110}$/.test(v))fail(label+'_INVALID');return v;}
function int(v,label,allowZero=false){if(!Number.isSafeInteger(v)||v<0||(!allowZero&&v===0))fail(label+'_POSITIVE_SAFE_INTEGER_REQUIRED');return v;}
function signed(v,label){if(!Number.isSafeInteger(v))fail(label+'_SAFE_INTEGER_REQUIRED');return v;}
function sum(a,b){let r=BigInt(a)+BigInt(b);if(r>BigInt(Number.MAX_SAFE_INTEGER)||r<BigInt(Number.MIN_SAFE_INTEGER))fail('AMOUNT_OVERFLOW');return Number(r);}
function sumValues(vals){return vals.reduce((acc,val)=>sum(acc,val),0);}
function checkedDate(s,label='DATE') {
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))fail(label+'_INVALID');
 const dt=new Date(s+'T00:00:00Z');
 if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==s)fail(label+'_INVALID');return s;
}
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
function copy(x){return JSON.parse(JSON.stringify(x));}
function mapAdd(map,key,delta){id(key,'KEY');let old=own(map,key)?signed(map[key],'LEDGER'):0;map[key]=sum(old,delta);}
function effect(effects,account,key,delta){if(delta===0)return;const full=key?account+':'+key:account;effects[full]=sum(effects[full]||0,delta);}
function mutation(map,effects,account,key,delta){mapAdd(map,key,delta);effect(effects,account,key,delta);}
function moneyOut(s,effects,location,amount){id(location,'CUSTODY_LOCATION');int(amount,'AMOUNT');mutation(s.cash,effects,'CASH',location,-amount);}
function moneyIn(s,effects,location,amount){id(location,'CUSTODY_LOCATION');int(amount,'AMOUNT');mutation(s.cash,effects,'CASH',location,amount);}
function requireMapRecord(map,key,label){id(key,label+'_ID');const v=map[key];if(!v)fail(label+'_NOT_FOUND');return v;}
function assertLimited(amount,available,label){if(amount>available)fail(label+'_OVERPAYMENT');}
function requireDistinctId(map,key,label){id(key,label+'_ID');if(own(map,key))fail(label+'_DUPLICATE');}
function opening(generation){
 id(generation,'GENERATION');
 return {contract:CONTRACT,generation,timezone:'Asia/Tomsk',currency:'RUB',startDate:START_DATE,
  revision:0,openingStatus:'UNCONFIRMED',cash:{},partnerReturnable:{},partnerSupport:{},
  partnerWithdrawals:{},partnerProfitDue:{},supplierDebt:{},loanDebt:{},wageDebt:{},
  stockLots:{},orderCosts:{},orderCostComplete:{},customerAdvances:{},
  plans:{},reserves:{},revenueKop:0,costKop:0,assignedProfitKop:0,profitVerifiedRev:null,
  events:[],idempotency:{},eventIdIndex:{}};
}
function summarize(s){
 obj(s,'STATE');const cash=sumValues(Object.values(s.cash));
 const reserved=sumValues(Object.values(s.reserves).filter(r=>r.status==='ACTIVE').map(r=>r.remainingKop));
 const stock=sumValues(Object.values(s.stockLots).map(r=>r.remainingCostKop));
 const profit=sum(s.revenueKop,-s.costKop);
 const profitUnassigned=sum(profit,-s.assignedProfitKop);
 const issues=[];
 if(cash<0)issues.push('NEGATIVE_CASH_SOURCE_UNVERIFIED');
 if(Object.values(s.cash).some(v=>v<0))issues.push('NEGATIVE_CUSTODY_SOURCE_UNVERIFIED');
 if(s.openingStatus!=='CONFIRMED')issues.push('OPENING_NOT_CONFIRMED');
 if(Object.keys(s.orderCostComplete).some(k=>s.orderCostComplete[k]!==true))issues.push('ORDER_COST_UNKNOWN');
 if(profit<0)issues.push('OPERATING_LOSS');
 return {generation:s.generation,revision:s.revision,cashKop:cash,reservedKop:reserved,
  freeKop:sum(cash,-reserved),stockCostKop:stock,recognizedProfitKop:profit,
  unassignedProfitKop:profitUnassigned,profitVerified:s.profitVerifiedRev!==null&&s.profitVerifiedRev<=s.revision,
  openingStatus:s.openingStatus,issues};
}
function settlePlan(s,effects,planId,amount,issues){
 if(planId===undefined||planId===null)return;
 const p=requireMapRecord(s.plans,planId,'PLAN');
 if(p.status!=='ACTIVE')fail('PLAN_NOT_ACTIVE');
 const paid=Math.min(amount,p.remainingKop);p.remainingKop=sum(p.remainingKop,-paid);
 if(amount>paid)issues.push('PLAN_ACTUAL_OVER_ESTIMATE');
 effect(effects,'PLAN_REMAINING',planId,-paid);
 if(p.remainingKop===0)p.status='SPENT';
 if(p.reserveId){const r=requireMapRecord(s.reserves,p.reserveId,'RESERVE');
   const freed=Math.min(r.remainingKop,amount);
   r.remainingKop=sum(r.remainingKop,-freed);
   effect(effects,'RESERVE_REMAINING',r.id,-freed);
   if(r.remainingKop===0)r.status='CONSUMED';
 }
}
function cost(s,effects,amount,orderId){
 int(amount,'COST');s.costKop=sum(s.costKop,amount);effect(effects,'RECOGNIZED_COST',null,amount);
 if(orderId){id(orderId,'ORDER_ID');mutation(s.orderCosts,effects,'ORDER_COST',orderId,amount);s.orderCostComplete[orderId]=false;}
 s.profitVerifiedRev=null;
}
function requireEventEnvelope(s,e){
 obj(e,'EVENT');if(e.generation!==s.generation)fail('BUSINESS_GENERATION_MISMATCH');
 id(e.eventId,'EVENT_ID');id(e.requestId,'REQUEST_ID');
 if(!TYPES.includes(e.type))fail('EVENT_TYPE_UNSUPPORTED');
 checkedDate(e.effectiveDate);if(e.effectiveDate<s.startDate)fail('PRE_GENERATION_BUSINESS_DATE');
 obj(e.actor,'ACTOR');id(e.actor.userId,'ACTOR_USER_ID');
 const perms=Array.isArray(e.actor.permissions)?e.actor.permissions:[];
 if(e.actor.role!=='ADMIN1'&&!perms.includes(REQUIRED_PERMISSION[e.type]))fail('PERMISSION_DENIED');
}
function apply(state,event){
 const s=obj(state,'STATE');if(s.contract!==CONTRACT)fail('STATE_CONTRACT_MISMATCH');
 requireEventEnvelope(s,event);
 // Idempotency check occurs before revision check: timed-out ACK / same immutable request.
 const fingerprint=stable({...event,actor:{userId:event.actor.userId}}); // session permissions/role may change after ACK loss
 const byRequest=s.idempotency[event.requestId],byEvent=s.eventIdIndex[event.eventId];
 if(byRequest||byEvent){
  if(!byRequest||!byEvent||byRequest.eventId!==event.eventId||byEvent.requestId!==event.requestId||byRequest.fingerprint!==fingerprint||byEvent.fingerprint!==fingerprint)
    fail('IDEMPOTENCY_KEY_REUSE_CONFLICT');
  return {duplicate:true,state:s,effects:copy(byRequest.effects),issues:copy(byRequest.issues),summary:summarize(s)};
 }
 if(!Number.isSafeInteger(event.expectedRevision)||event.expectedRevision!==s.revision)fail('REVISION_CONFLICT');
 const n=copy(s),effects={},issues=[];const e=event;
 switch(e.type){
 case 'OPENING_CONFIRM':{
   if(n.openingStatus==='CONFIRMED')fail('OPENING_ALREADY_CONFIRMED');
   if(n.events.length||summarize(n).cashKop!==0||n.revenueKop!==0||n.costKop!==0)fail('OPENING_CONFIRM_REQUIRES_EMPTY_DATASET');
   id(e.evidenceId,'OPENING_EVIDENCE');n.openingStatus='CONFIRMED';break;
 }
 case 'CASH_RECEIPT': {
   int(e.amountKop,'AMOUNT');moneyIn(n,effects,e.custodyLocation,e.amountKop);
   if(e.purpose==='CUSTOMER_ADVANCE'){
     id(e.orderId,'ORDER_ID');mutation(n.customerAdvances,effects,'CUSTOMER_ADVANCE',e.orderId,e.amountKop);
   }else if(e.purpose!=='UNCLASSIFIED_RECEIPT')fail('RECEIPT_PURPOSE_INVALID');
   break;
 }
 case 'CUSTODY_TRANSFER': {
   if(e.fromLocation===e.toLocation)fail('TRANSFER_SAME_LOCATION');
   moneyOut(n,effects,e.fromLocation,e.amountKop);moneyIn(n,effects,e.toLocation,e.amountKop);break;
 }
 case 'PARTNER_CONTRIBUTION':{
   id(e.partyId,'PARTNER');int(e.amountKop,'AMOUNT');
   if(e.kind==='RETURNABLE')mutation(n.partnerReturnable,effects,'PARTNER_REFUNDABLE',e.partyId,e.amountKop);
   else if(e.kind==='SUPPORT')mutation(n.partnerSupport,effects,'PARTNER_SUPPORT',e.partyId,e.amountKop);
   else fail('PARTNER_CONTRIBUTION_KIND_INVALID');
   moneyIn(n,effects,e.custodyLocation,e.amountKop);break;
 }
 case 'PARTNER_RETURN':{
   id(e.partyId,'PARTNER');int(e.amountKop,'AMOUNT');
   assertLimited(e.amountKop,n.partnerReturnable[e.partyId]||0,'PARTNER_REFUNDABLE');
   moneyOut(n,effects,e.custodyLocation,e.amountKop);
   mutation(n.partnerReturnable,effects,'PARTNER_REFUNDABLE',e.partyId,-e.amountKop);break;
 }
 case 'MATERIAL_PURCHASE':{
   requireDistinctId(n.stockLots,e.lotId,'LOT');id(e.nomenclatureId,'NOMENCLATURE');
   int(e.quantityMilli,'QUANTITY');int(e.totalCostKop,'TOTAL_COST');
   if(!Array.isArray(e.legs)||!e.legs.length)fail('PAYMENT_LEGS_REQUIRED');
   let legSum=0;
   for(const leg of e.legs){obj(leg,'PAYMENT_LEG');int(leg.amountKop,'PAYMENT_LEG');legSum=sum(legSum,leg.amountKop);
    if(leg.kind==='BUSINESS')moneyOut(n,effects,leg.custodyLocation,leg.amountKop);
    else if(leg.kind==='PERSONAL_RETURNABLE'){
      id(leg.partyId,'PARTNER');mutation(n.partnerReturnable,effects,'PARTNER_REFUNDABLE',leg.partyId,leg.amountKop);
    }else if(leg.kind==='PERSONAL_SUPPORT'){
      id(leg.partyId,'PARTNER');mutation(n.partnerSupport,effects,'PARTNER_SUPPORT',leg.partyId,leg.amountKop);
    }else if(leg.kind==='SUPPLIER_DEBT'){
      id(leg.obligationId,'OBLIGATION');mutation(n.supplierDebt,effects,'SUPPLIER_PAYABLE',leg.obligationId,leg.amountKop);
    }else fail('PAYMENT_LEG_KIND_INVALID');
   }
   if(legSum!==e.totalCostKop)fail('PAYMENT_LEGS_TOTAL_MISMATCH');
   n.stockLots[e.lotId]={id:e.lotId,nomenclatureId:e.nomenclatureId,
     initialQuantityMilli:e.quantityMilli,remainingQuantityMilli:e.quantityMilli,
     totalCostKop:e.totalCostKop,remainingCostKop:e.totalCostKop};
   effect(effects,'STOCK_COST',e.lotId,e.totalCostKop);break;
 }
 case 'MATERIAL_ALLOCATE':{
   const lot=requireMapRecord(n.stockLots,e.lotId,'LOT');id(e.orderId,'ORDER_ID');
   int(e.quantityMilli,'QUANTITY');assertLimited(e.quantityMilli,lot.remainingQuantityMilli,'LOT_QUANTITY');
   const alloc=e.quantityMilli===lot.remainingQuantityMilli?lot.remainingCostKop:
     Number(BigInt(lot.remainingCostKop)*BigInt(e.quantityMilli)/BigInt(lot.remainingQuantityMilli));
   if(alloc<=0)fail('ALLOCATION_COST_ROUNDS_TO_ZERO');
   lot.remainingQuantityMilli-=e.quantityMilli;lot.remainingCostKop-=alloc;
   effect(effects,'STOCK_COST',e.lotId,-alloc);cost(n,effects,alloc,e.orderId);break;
 }
 case 'WAGE_ACCRUE':{
   id(e.accrualId,'ACCRUAL');requireDistinctId(n.wageDebt,e.accrualId,'ACCRUAL');
   int(e.amountKop,'AMOUNT');n.wageDebt[e.accrualId]=e.amountKop;effect(effects,'WAGE_PAYABLE',e.accrualId,e.amountKop);
   cost(n,effects,e.amountKop,e.orderId);break;
 }
 case 'WAGE_PAY':{
   const amount=int(e.amountKop,'AMOUNT'),due=requireMapRecord(n.wageDebt,e.accrualId,'ACCRUAL');
   assertLimited(amount,due,'WAGE');moneyOut(n,effects,e.custodyLocation,amount);
   mutation(n.wageDebt,effects,'WAGE_PAYABLE',e.accrualId,-amount);
   settlePlan(n,effects,e.planId,amount,issues);break;
 }
 case 'SUPPLIER_PAY':{
   const amount=int(e.amountKop,'AMOUNT'),due=requireMapRecord(n.supplierDebt,e.obligationId,'OBLIGATION');
   assertLimited(amount,due,'SUPPLIER');moneyOut(n,effects,e.custodyLocation,amount);
   mutation(n.supplierDebt,effects,'SUPPLIER_PAYABLE',e.obligationId,-amount);
   settlePlan(n,effects,e.planId,amount,issues);break;
 }
 case 'LOAN_RECEIVE':{
   requireDistinctId(n.loanDebt,e.loanId,'LOAN');int(e.amountKop,'AMOUNT');
   n.loanDebt[e.loanId]=e.amountKop;effect(effects,'LOAN_PRINCIPAL',e.loanId,e.amountKop);
   moneyIn(n,effects,e.custodyLocation,e.amountKop);break;
 }
 case 'LOAN_REPAY':{
   const loan=requireMapRecord(n.loanDebt,e.loanId,'LOAN');
   int(e.principalKop,'PRINCIPAL',true);int(e.interestKop,'INTEREST',true);
   const total=sum(e.principalKop,e.interestKop);int(total,'AMOUNT');
   assertLimited(e.principalKop,loan,'LOAN_PRINCIPAL');
   moneyOut(n,effects,e.custodyLocation,total);
   mutation(n.loanDebt,effects,'LOAN_PRINCIPAL',e.loanId,-e.principalKop);
   if(e.interestKop)cost(n,effects,e.interestKop,e.orderId);
   settlePlan(n,effects,e.planId,total,issues);break;
 }
 case 'OPERATING_EXPENSE':{
   moneyOut(n,effects,e.custodyLocation,e.amountKop);cost(n,effects,e.amountKop,e.orderId);
   settlePlan(n,effects,e.planId,e.amountKop,issues);break;
 }
 case 'PLAN_CREATE':{
   requireDistinctId(n.plans,e.planId,'PLAN');int(e.amountKop,'AMOUNT');checkedDate(e.dueDate,'DUE_DATE');
   n.plans[e.planId]={id:e.planId,amountKop:e.amountKop,remainingKop:e.amountKop,
     dueDate:e.dueDate,status:'ACTIVE',reserveId:null};
   effect(effects,'PLAN_REMAINING',e.planId,e.amountKop);break;
 }
 case 'PLAN_SPEND':{
   int(e.amountKop,'AMOUNT');moneyOut(n,effects,e.custodyLocation,e.amountKop);
   const p=requireMapRecord(n.plans,e.planId,'PLAN');if(p.status!=='ACTIVE')fail('PLAN_NOT_ACTIVE');
   cost(n,effects,e.amountKop,e.orderId);settlePlan(n,effects,e.planId,e.amountKop,issues);break;
 }
 case 'RESERVE_CREATE':{
   requireDistinctId(n.reserves,e.reserveId,'RESERVE');int(e.amountKop,'AMOUNT');
   const p=requireMapRecord(n.plans,e.planId,'PLAN');if(p.status!=='ACTIVE'||p.reserveId)fail('PLAN_RESERVE_CONFLICT');
   const current=summarize(n);if(n.openingStatus!=='CONFIRMED'||current.issues.includes('NEGATIVE_CUSTODY_SOURCE_UNVERIFIED'))fail('CASH_UNVERIFIED_FOR_RESERVE');
   if(e.amountKop>p.remainingKop||e.amountKop>current.freeKop)fail('INSUFFICIENT_FREE_CASH_FOR_RESERVE');
   n.reserves[e.reserveId]={id:e.reserveId,planId:e.planId,remainingKop:e.amountKop,status:'ACTIVE'};
   p.reserveId=e.reserveId;effect(effects,'RESERVE_REMAINING',e.reserveId,e.amountKop);break;
 }
 case 'RESERVE_RELEASE':{
   const r=requireMapRecord(n.reserves,e.reserveId,'RESERVE');if(r.status!=='ACTIVE')fail('RESERVE_NOT_ACTIVE');
   int(e.amountKop,'AMOUNT');assertLimited(e.amountKop,r.remainingKop,'RESERVE');
   r.remainingKop=sum(r.remainingKop,-e.amountKop);
   effect(effects,'RESERVE_REMAINING',e.reserveId,-e.amountKop);
   if(!r.remainingKop)r.status='RELEASED';break;
 }
 case 'REVENUE_RECOGNIZE':{
   id(e.orderId,'ORDER_ID');int(e.amountKop,'AMOUNT');
   if(e.priceState!=='KNOWN')fail('ORDER_PRICE_UNKNOWN');
   n.revenueKop=sum(n.revenueKop,e.amountKop);effect(effects,'RECOGNIZED_REVENUE',null,e.amountKop);
   const advance=Math.min(n.customerAdvances[e.orderId]||0,e.amountKop);
   if(advance)mutation(n.customerAdvances,effects,'CUSTOMER_ADVANCE',e.orderId,-advance);
   n.orderCostComplete[e.orderId]=false;n.profitVerifiedRev=null;break;
 }
 case 'ORDER_COSTS_CONFIRM':{
   id(e.orderId,'ORDER_ID');
   if(!own(n.orderCostComplete,e.orderId))fail('ORDER_NOT_IN_LEDGER');
   n.orderCostComplete[e.orderId]=true;n.profitVerifiedRev=null;break;
 }
 case 'PROFIT_VERIFY':{
   if(n.openingStatus!=='CONFIRMED')fail('OPENING_UNCONFIRMED');
   if(Object.values(n.orderCostComplete).some(x=>x!==true))fail('ORDER_COST_UNKNOWN');
   if(summarize(n).issues.some(x=>x==='NEGATIVE_CASH_SOURCE_UNVERIFIED'||x==='NEGATIVE_CUSTODY_SOURCE_UNVERIFIED'))fail('NEGATIVE_CASH_UNVERIFIED');
   if(sum(n.revenueKop,-n.costKop)<0)fail('PROFIT_NEGATIVE');
   // Audit approval is a business gate, not a calculated side-effect.
   id(e.evidenceId,'PROFIT_EVIDENCE');n.profitVerifiedRev=n.revision+1;break;
 }
 case 'PROFIT_ASSIGN':{
   if(n.profitVerifiedRev===null)fail('PROFIT_NOT_VERIFIED');
   if(summarize(n).issues.some(x=>x==='NEGATIVE_CASH_SOURCE_UNVERIFIED'||x==='NEGATIVE_CUSTODY_SOURCE_UNVERIFIED'))fail('NEGATIVE_CASH_UNVERIFIED');
   int(e.amountKop,'AMOUNT');if(e.amountKop>sum(sum(n.revenueKop,-n.costKop),-n.assignedProfitKop))fail('INSUFFICIENT_UNASSIGNED_PROFIT');
   if(!Array.isArray(e.shares)||!e.shares.length)fail('PROFIT_SHARES_REQUIRED');
   id(e.policyId,'PROFIT_POLICY');let shareSum=0;const seen=new Set(),entries=[];
   for(const x of e.shares){id(x.partyId,'PARTNER');int(x.basisPoints,'SHARE');shareSum+=x.basisPoints;
     if(seen.has(x.partyId))fail('PROFIT_SHARE_DUPLICATE');seen.add(x.partyId);
     const base=BigInt(e.amountKop)*BigInt(x.basisPoints);entries.push({partyId:x.partyId,
       amount:Number(base/10000n),remainder:Number(base%10000n)});
   }
   if(shareSum!==10000)fail('PROFIT_SHARES_NOT_100_PERCENT');
   let rest=e.amountKop-sumValues(entries.map(x=>x.amount));
   entries.sort((a,b)=>b.remainder-a.remainder||a.partyId.localeCompare(b.partyId,'en'));
   for(const x of entries){if(rest>0){x.amount++;rest--;}mutation(n.partnerProfitDue,effects,'PROFIT_DUE',x.partyId,x.amount);}
   n.assignedProfitKop=sum(n.assignedProfitKop,e.amountKop);
   effect(effects,'UNASSIGNED_PROFIT',null,-e.amountKop);break;
 }
 case 'PROFIT_PAY':{
   id(e.partyId,'PARTNER');int(e.amountKop,'AMOUNT');assertLimited(e.amountKop,n.partnerProfitDue[e.partyId]||0,'PROFIT_DUE');
   moneyOut(n,effects,e.custodyLocation,e.amountKop);
   mutation(n.partnerProfitDue,effects,'PROFIT_DUE',e.partyId,-e.amountKop);break;
 }
 case 'PARTNER_WITHDRAWAL':{
   id(e.partyId,'PARTNER');int(e.amountKop,'AMOUNT');moneyOut(n,effects,e.custodyLocation,e.amountKop);
   mutation(n.partnerWithdrawals,effects,'PARTNER_WITHDRAWAL_RECEIVABLE',e.partyId,e.amountKop);break;
 }
 case 'PROFIT_OFFSET':{
   id(e.partyId,'PARTNER');int(e.amountKop,'AMOUNT');
   assertLimited(e.amountKop,n.partnerWithdrawals[e.partyId]||0,'WITHDRAWAL_RECEIVABLE');
   assertLimited(e.amountKop,n.partnerProfitDue[e.partyId]||0,'PROFIT_DUE');
   mutation(n.partnerWithdrawals,effects,'PARTNER_WITHDRAWAL_RECEIVABLE',e.partyId,-e.amountKop);
   mutation(n.partnerProfitDue,effects,'PROFIT_DUE',e.partyId,-e.amountKop);break;
 }
 default:fail('EVENT_UNIMPLEMENTED');
 }
 n.revision++;
 // Negative balances are NOT overwritten with zero or silently marked healthy.
 for(const warning of summarize(n).issues.filter(x=>x==='NEGATIVE_CASH_SOURCE_UNVERIFIED'||x==='NEGATIVE_CUSTODY_SOURCE_UNVERIFIED'))
   if(!issues.includes(warning))issues.push(warning);
 const audit={eventId:e.eventId,requestId:e.requestId,type:e.type,actorUserId:e.actor.userId,
  expectedRevision:e.expectedRevision,revision:n.revision,effectiveDate:e.effectiveDate,
  fingerprint,effects:copy(effects),issues:copy(issues)};
 n.events.push(audit);
 n.idempotency[e.requestId]={fingerprint,eventId:e.eventId,effects:copy(effects),issues:copy(issues)};
 n.eventIdIndex[e.eventId]={fingerprint,requestId:e.requestId};
 return {duplicate:false,state:n,effects,issues,summary:summarize(n)};
}
function preview(state,event){return apply(state,event);}// Caller MUST NOT persist preview.state.
function assertCurrentGeneration({activeGeneration,requestGeneration,localOutboxGeneration}){
 id(activeGeneration,'ACTIVE_GENERATION');
 if(requestGeneration!==activeGeneration)fail('BUSINESS_GENERATION_MISMATCH');
 if(localOutboxGeneration!==undefined&&localOutboxGeneration!==activeGeneration)fail('OLD_OUTBOX_QUARANTINE_REQUIRED');
 return true;
}
module.exports={CONTRACT,TYPES,REQUIRED_PERMISSION,opening,apply,preview,summarize,assertCurrentGeneration};
