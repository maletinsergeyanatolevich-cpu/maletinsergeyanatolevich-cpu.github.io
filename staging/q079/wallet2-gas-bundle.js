/* Q079 / Q029: STAGING-ONLY Apps Script V8 bundling of wallet engine and adapter.
 * Add as a separate file to EXISTING GAS project only after exact owner DANGEROUS approval.
 * NEVER alter CFG.SPREADSHEET_ID; uses existing ss_(), authSession_(), hasPermission_().
 * Source build has NO secret/token/master URL. DO NOT DEPLOY.
 */
const Q079Wallet2Engine = (function() {
 const module={exports:{}};
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
function sum(a,b){
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b))fail('AMOUNT_OVERFLOW');
 const r=a+b;
 if(!Number.isSafeInteger(r))fail('AMOUNT_OVERFLOW');
 return r;
}
/** Exact floor(amount * part / total), and exact division remainder.
 * Does not use BigInt or unsafe floating-point multiplication. Each intermediate
 * is a safe integer; repeated modular doubling needs at most 53 iterations.
 * 0 <= part <= total, 0 <= amount <= Number.MAX_SAFE_INTEGER.
 */
function ratioWithRemainder_(amount,part,total){
 int(amount,'RATIO_AMOUNT',true);
 int(part,'RATIO_PART',true);
 int(total,'RATIO_TOTAL');
 if(part>total)fail('RATIO_PART_EXCEEDS_TOTAL');
 const whole=Math.floor(amount/total),fraction=amount%total;
 let quotient=0,remainder=0;
 const bits=[];let cursor=part;
 while(cursor>0){bits.push(cursor%2);cursor=Math.floor(cursor/2);}
 for(let i=bits.length-1;i>=0;i--){
  quotient=sum(quotient,quotient);
  if(remainder>=total-remainder){remainder=remainder-(total-remainder);quotient=sum(quotient,1);}
  else remainder+=remainder;
  if(bits[i]){
   if(remainder>=total-fraction){remainder=remainder-(total-fraction);quotient=sum(quotient,1);}
   else remainder+=fraction;
  }
 }
 return {amount:sum(whole*part,quotient),remainder};
}
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
     ratioWithRemainder_(lot.remainingCostKop,e.quantityMilli,lot.remainingQuantityMilli).amount;
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
     if(x.basisPoints>10000)fail('PROFIT_SHARE_INVALID');
     const share=ratioWithRemainder_(e.amountKop,x.basisPoints,10000);
     entries.push({partyId:x.partyId,amount:share.amount,remainder:share.remainder});
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

 return module.exports;
})();
const Q079Wallet2Server = (function() {
 const module={exports:{}};
 function require(path){if(path==='./wallet-engine.js')return Q079Wallet2Engine;throw new Error('W2_MODULE_FORBIDDEN');}
/* Q079 Wallet2 — source-only GAS adapter for EXISTING Production backend.
 * No live deployment or setup. Only the two minimal NEW wallet sheets: _W2_CONTROL, _W2_EVENTS.
 * Old Finance, Orders, users, NOM, other tabs and snapshot NEVER READ as wallet source.
 * Safe configuration requires separately approved activation; no migration/reset endpoint.
 * Inject existing server functions: authSession_, hasPermission_, LockService, spreadsheet.
 * Sheets row: _W2_CONTROL A2:G2 = [generation,status,writeEnabled,startDate,timezone,currency,ownerApproval]
 * Event ledger: _W2_EVENTS A1='event_json'; A2.. = one immutable complete JSON record per row.
 */
'use strict';
const {opening,apply,summarize,REQUIRED_PERMISSION}=require('./wallet-engine.js');
const CONTRACT='Q079-WALLET2-API-v1';
const CONTROL='_W2_CONTROL',EVENTS='_W2_EVENTS';
// Existing USER wallet.add is not a grant to create loans, stock liabilities or custody movements.
// Remain restrictive until the owner approves type-specific mapping; do not alter the users sheet.
const USER_ALLOWED=new Set(['CASH_RECEIPT','OPERATING_EXPENSE']);
const SENSITIVE=new Set(Object.keys(REQUIRED_PERMISSION).filter(type=>!USER_ALLOWED.has(type)));
function reject(message){const e=new Error(message);e.code=message;throw e;}
function str(v,label){if(typeof v!=='string'||!v.trim())reject(label+'_REQUIRED');return v;}
function obj(v,label){if(!v||typeof v!=='object'||Array.isArray(v))reject(label+'_OBJECT_REQUIRED');return v;}
function create({getSheet,authSession,hasPermission,lock,sha256,clock}={}){
 if([getSheet,authSession,hasPermission,sha256].some(x=>typeof x!=='function')||!lock||typeof lock.waitLock!=='function'||typeof lock.releaseLock!=='function')reject('TRUSTED_EXISTING_BACKEND_REQUIRED');
 const now=clock||(()=>new Date().toISOString());
 function tab(name){const sheet=getSheet(name);if(!sheet)reject('W2_NEW_SCHEMA_NOT_INSTALLED');return sheet;}
 function config(){
  const row=tab(CONTROL).getRange(2,1,1,7).getValues()[0]||[];
  const x={generation:String(row[0]||''),status:String(row[1]||''),writeEnabled:row[2]===true,startDate:String(row[3]||''),timezone:String(row[4]||''),currency:String(row[5]||''),approval:String(row[6]||'')};
  if(!/^Q079[.:-][A-Za-z0-9.:-]+$/.test(x.generation)||!['STAGING_ONLY','ACTIVE_V2'].includes(x.status)||x.startDate!=='2026-10-21'||x.timezone!=='Asia/Tomsk'||x.currency!=='RUB')reject('W2_CONTROL_INVALID');
  return x;
 }
 function auth(req,key){
  obj(req,'REQUEST');str(req.session_token,'SESSION_TOKEN');str(req.device_id,'DEVICE_ID');
  const a=authSession(req.session_token,key,req.request_id||'Q079-READ');
  if(!a?.user?.active||!a?.user?.userId||!a.deviceId||String(a.deviceId)!==req.device_id)reject('W2_SESSION_DEVICE_OR_USER_INVALID');
  if(!hasPermission(a.user,key))reject('PERMISSION_DENIED:'+key);
  return a;
 }
 function epoch(req,c){if(req.business_generation!==c.generation)reject('BUSINESS_GENERATION_MISMATCH');}
 function rawEvents(){const t=tab(EVENTS),count=t.getLastRow()-1;
  if(count<0||t.getRange(1,1).getValue()!=='event_json')reject('W2_EVENTS_HEADER_MISSING');
  if(count===0)return [];
  const a=t.getRange(2,1,count,1).getValues();
  return a.map((r,i)=>{const s=r?.[0];if(typeof s!=='string'||!s||s.length>48000)reject('W2_EVENT_CORRUPTED_AT_ROW_'+(i+2));
   let v;try{v=JSON.parse(s)}catch(_){reject('W2_EVENT_JSON_CORRUPTED_AT_ROW_'+(i+2));}
   if(v.version!==1||typeof v.hash!=='string'||v.hash!==sha256(JSON.stringify(v.event))||!v.event)reject('W2_EVENT_HASH_INVALID_AT_ROW_'+(i+2));
   return v;});
 }
 function state(c){let s=opening(c.generation);const raws=rawEvents();
  for(const [index,r] of raws.entries()){
   const before=s.revision;
   if(r.event.expectedRevision!==before)reject('W2_LEDGER_REVISION_GAP_'+index);
   const out=apply(s,r.event);
   if(out.duplicate||out.state.revision!==before+1)reject('W2_LEDGER_NONMONOTONIC_'+index);
   s=out.state;
  }
  return s;
 }
 function totals(map){return Object.values(map||{}).reduce((a,b)=>a+Number(b||0),0);}
 function response(s,c){const z=summarize(s);
  return {ok:true,contract:CONTRACT,generation:c.generation,revision:s.revision,openingStatus:s.openingStatus,
   mode:c.status,summary:z,ledgers:{supplierDebtKop:totals(s.supplierDebt),loanDebtKop:totals(s.loanDebt),wageDebtKop:totals(s.wageDebt),partnerReturnableKop:totals(s.partnerReturnable),partnerProfitDueKop:totals(s.partnerProfitDue),plannedKop:totals(Object.fromEntries(Object.entries(s.plans).map(([k,v])=>[k,v.remainingKop]))),periodIncomeKop:null,periodExpenseKop:null},
   recentEvents:s.events.slice(-30).reverse().map(e=>({eventId:e.eventId,type:e.type,effectiveDate:e.effectiveDate})),
   legacyFinanceRowsRead:0,legacyOrdersRowsRead:0};
 }
 function bootstrap(req){auth(req,'wallet.view');const c=config();const ledger=state(c);return {ok:true,contract:CONTRACT,generation:c.generation,mode:c.status,writeEnabled:c.status==='ACTIVE_V2'&&c.writeEnabled&&c.approval==='GRANTED',openingStatus:ledger.openingStatus,revision:ledger.revision};}
 function read(req){auth(req,'wallet.view');const c=config();epoch(req,c);return response(state(c),c);}
 function commit(req){
  obj(req,'REQUEST');obj(req.event,'EVENT');
  // Do not accept a caller's identity/role/masterId; only the session resolver supplies them.
  for(const k of ['actor','role','permissions','userId','masterId','authContext'])if(Object.prototype.hasOwnProperty.call(req,k)||Object.prototype.hasOwnProperty.call(req.event,k))reject('W2_CLIENT_IDENTITY_SPOOF');
  const a=auth(req,'wallet.add');const requested=req.event.type;
  if(!REQUIRED_PERMISSION[requested])reject('W2_UNSUPPORTED_EVENT');
  if(SENSITIVE.has(requested)&&a.user.role!=='ADMIN1')reject('W2_SENSITIVE_ADMIN1_ONLY');
  lock.waitLock(20000);
  try{
   // Revalidate live authentication, generation and mutation permission inside lock.
   const actual=auth(req,'wallet.add'),c=config();epoch(req,c);
   if(c.status!=='ACTIVE_V2'||c.writeEnabled!==true||c.approval!=='GRANTED')reject('W2_WRITE_GATE_CLOSED');
   if(req.event.generation!==c.generation)reject('BUSINESS_GENERATION_MISMATCH');
   if(SENSITIVE.has(requested)&&actual.user.role!=='ADMIN1')reject('W2_SENSITIVE_ADMIN1_ONLY');
   if(actual.user.userId!==a.user.userId||actual.deviceId!==a.deviceId)reject('W2_PRINCIPAL_CHANGED');
   const s=state(c);
   const event={...req.event,actor:{userId:String(actual.user.userId),role:String(actual.user.role),permissions:[REQUIRED_PERMISSION[requested]]}};
   const applied=apply(s,event);
   if(applied.duplicate)return {...response(s,c),duplicate:true,acceptedEventId:event.eventId,acceptedRequestId:event.requestId};
   const e=Object.freeze({version:1,event,hash:sha256(JSON.stringify(event)),acceptedAt:now()});
   const payload=JSON.stringify(e);if(payload.length>48000)reject('W2_EVENT_TOO_LARGE');
   const t=tab(EVENTS),row=t.getLastRow()+1;
   // One self-contained authoritative cell; no multi-tab partial projections to double-post.
   t.getRange(row,1).setValue(payload);
   if(t.getRange(row,1).getValue()!==payload)reject('W2_EVENT_READBACK_FAILED_RETRY_WITH_SAME_REQUEST');
   return {...response(applied.state,c),duplicate:false,acceptedEventId:event.eventId,acceptedRequestId:event.requestId};
  }finally{lock.releaseLock();}
 }
 return Object.freeze({bootstrap,read,commit,CONTRACT,CONTROL,EVENTS});
}
module.exports={create,CONTRACT,CONTROL,EVENTS,SENSITIVE,USER_ALLOWED};
 return module.exports;
})();
function q079Wallet2Gateway_(){
 if(typeof CFG!=='object'||!CFG.SPREADSHEET_ID)throw new Error('EXISTING_MASTER_CONFIG_REQUIRED');
 return Q079Wallet2Server.create({
   getSheet:function(name){return ss_().getSheetByName(name);},
   authSession:function(token,permission,requestId){return authSession_(token,permission,requestId);},
   hasPermission:function(user,key){return hasPermission_(user,key);},
   lock:LockService.getScriptLock(),
   sha256:function(message){return sha256Hex_(message);},
   clock:function(){return nowIso_();}
 });
}
function handleWallet2BootstrapQ079_(body,requestId){body=body||{};return q079Wallet2Gateway_().bootstrap(Object.assign({},body,{request_id:requestId}));}
function handleWallet2ReadQ079_(body,requestId){body=body||{};return q079Wallet2Gateway_().read(Object.assign({},body,{request_id:requestId}));}
function handleWallet2CommitQ079_(body,requestId){body=body||{};return q079Wallet2Gateway_().commit(Object.assign({},body,{request_id:requestId}));}
/* Three routing statements to insert inside EXISTING doPost after parseBody:
 if(q046Action==='wallet2.bootstrap')return json_(handleWallet2BootstrapQ079_(body,requestId));
 if(q046Action==='wallet2.read')return json_(handleWallet2ReadQ079_(body,requestId));
 if(q046Action==='wallet2.commit')return json_(handleWallet2CommitQ079_(body,requestId));
 No other doPost route, no changes to any other screen/API. */
