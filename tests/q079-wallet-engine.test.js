/* Isolated synthetic tests only. No live APIs or credentials. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {opening,apply,preview,summarize,assertCurrentGeneration,TYPES}=require('../staging/q079/wallet-engine.js');
let serial=0;
const ADMIN={userId:'ADMIN1',role:'ADMIN1',permissions:[]};
const USER={userId:'USER1',role:'USER',permissions:['wallet.add','wallet.plan']};
function fresh(){return opening('Q079-SYNTHETIC-GEN-B2');}
function event(s,type,params={},actor=ADMIN){const n=++serial;
 return {generation:s.generation,eventId:`EVT-Q079-${n}`,requestId:`REQ-Q079-${n}`,
  expectedRevision:s.revision,effectiveDate:'2026-10-21',actor,type,...params};}
function next(s,type,params={},actor=ADMIN){return apply(s,event(s,type,params,actor)).state;}
function seeded(kop=1000000){let s=fresh();s=next(s,'OPENING_CONFIRM',{evidenceId:'SYNTHETIC-START'});
 if(kop)s=next(s,'PARTNER_CONTRIBUTION',{partyId:'PARTNER-S',kind:'SUPPORT',amountKop:kop,custodyLocation:'CASH-MAIN'});
 return s;}
function receipt(s,amount=1000000){return next(s,'CASH_RECEIPT',{amountKop:amount,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});}
function material(s,id='LOT-001',cost=1000000,legs=[{kind:'BUSINESS',amountKop:cost,custodyLocation:'CASH-MAIN'}],qty=10000){return next(s,'MATERIAL_PURCHASE',{lotId:id,nomenclatureId:'NOM-STEEL',quantityMilli:qty,totalCostKop:cost,legs});}
function code(fn,expected){assert.throws(fn,err=>err.code===expected);}

test('T01 — new empty data, no historical balances and unconfirmed opening',()=>{
 const s=fresh(),x=summarize(s);assert.equal(x.cashKop,0);assert.equal(x.stockCostKop,0);
 assert.equal(x.openingStatus,'UNCONFIRMED');assert.equal(s.events.length,0);
 assert.ok(!JSON.stringify(s).includes('26109.52'));
});
test('T02 — refundable contribution increases cash/debt, not profit',()=>{
 let s=seeded(0);s=next(s,'PARTNER_CONTRIBUTION',{partyId:'PARTNER-S',kind:'RETURNABLE',amountKop:1000000,custodyLocation:'CASH-MAIN'});
 assert.equal(s.cash['CASH-MAIN'],1000000);assert.equal(s.partnerReturnable['PARTNER-S'],1000000);assert.equal(summarize(s).recognizedProfitKop,0);
});
test('T03 — personally purchased material creates lot and refundable payable without cash movement',()=>{
 let s=seeded(0);s=material(s,'LOT-P',1000000,[{kind:'PERSONAL_RETURNABLE',partyId:'PARTNER-S',amountKop:1000000}]);
 assert.equal(summarize(s).cashKop,0);assert.equal(summarize(s).stockCostKop,1000000);
 assert.equal(s.partnerReturnable['PARTNER-S'],1000000);
});
test('T04 — split 10000 purchase: business 4000 + partner 3000 + supplier 3000',()=>{
 let s=seeded(400000);s=material(s,'LOT-MIX',1000000,[
 {kind:'BUSINESS',amountKop:400000,custodyLocation:'CASH-MAIN'},
 {kind:'PERSONAL_RETURNABLE',amountKop:300000,partyId:'PARTNER-S'},
 {kind:'SUPPLIER_DEBT',amountKop:300000,obligationId:'SUPPLIER-1'}]);
 assert.equal(summarize(s).cashKop,0);assert.equal(s.stockLots['LOT-MIX'].remainingCostKop,1000000);
 assert.equal(s.partnerReturnable['PARTNER-S'],300000);assert.equal(s.supplierDebt['SUPPLIER-1'],300000);
});
test('T05 — lot allocation reduces stock and creates order cost without cash second debit',()=>{
 let s=seeded(1000000);s=material(s);const cashBefore=summarize(s).cashKop;
 s=next(s,'MATERIAL_ALLOCATE',{lotId:'LOT-001',orderId:'ORDER-A',quantityMilli:3500});
 assert.equal(s.stockLots['LOT-001'].remainingCostKop,650000);
 assert.equal(s.orderCosts['ORDER-A'],350000);assert.equal(summarize(s).cashKop,cashBefore);
 s=next(s,'MATERIAL_ALLOCATE',{lotId:'LOT-001',orderId:'ORDER-A',quantityMilli:2000});
 assert.equal(s.stockLots['LOT-001'].remainingCostKop,450000);assert.equal(s.orderCosts['ORDER-A'],550000);
});
test('T06 — wages accrued 5000, paid 2000, cost only once and payable 3000',()=>{
 let s=seeded(200000);s=next(s,'WAGE_ACCRUE',{accrualId:'ACCRUAL-1',orderId:'ORDER-A',amountKop:500000});
 s=next(s,'WAGE_PAY',{accrualId:'ACCRUAL-1',amountKop:200000,custodyLocation:'CASH-MAIN'});
 assert.equal(s.wageDebt['ACCRUAL-1'],300000);assert.equal(s.costKop,500000);assert.equal(summarize(s).cashKop,0);
});
test('T07 — supplier material on credit 8000, settlement 3000 does not re-cost stock',()=>{
 let s=seeded(300000);s=material(s,'LOT-CREDIT',800000,[{kind:'SUPPLIER_DEBT',amountKop:800000,obligationId:'BILL-8'}]);
 s=next(s,'SUPPLIER_PAY',{obligationId:'BILL-8',amountKop:300000,custodyLocation:'CASH-MAIN'});
 assert.equal(s.supplierDebt['BILL-8'],500000);assert.equal(s.costKop,0);
 assert.equal(s.stockLots['LOT-CREDIT'].remainingCostKop,800000);
});
test('T08 — reserve 6000 against 10000 cash, payment 2000 results free 4000',()=>{
 let s=seeded(1000000);s=next(s,'PLAN_CREATE',{planId:'PLAN-RENT',amountKop:600000,dueDate:'2026-10-25'});
 s=next(s,'RESERVE_CREATE',{reserveId:'RES-RENT',planId:'PLAN-RENT',amountKop:600000});
 s=next(s,'PLAN_SPEND',{planId:'PLAN-RENT',custodyLocation:'CASH-MAIN',amountKop:200000});
 const x=summarize(s);assert.equal(x.cashKop,800000);assert.equal(x.reservedKop,400000);assert.equal(x.freeKop,400000);
 assert.equal(s.plans['PLAN-RENT'].remainingKop,400000);
});
test('T09 — client transfers production money to participant-held custody: no partner debt',()=>{
 let s=seeded(0);s=next(s,'CASH_RECEIPT',{amountKop:1000000,custodyLocation:'CUSTODY-SERGEY',purpose:'CUSTOMER_ADVANCE',orderId:'ORDER-A'});
 s=next(s,'CUSTODY_TRANSFER',{fromLocation:'CUSTODY-SERGEY',toLocation:'CASH-MAIN',amountKop:1000000});
 assert.equal(summarize(s).cashKop,1000000);assert.equal(s.partnerReturnable['PARTNER-S']||0,0);
 assert.equal(s.customerAdvances['ORDER-A'],1000000);
});
test('T10 — plan partial 20000/5000 leaves 15000, no future full cash debit',()=>{
 let s=seeded(500000);s=next(s,'PLAN_CREATE',{planId:'PLAN-20',amountKop:2000000,dueDate:'2026-11-01'});
 s=next(s,'PLAN_SPEND',{planId:'PLAN-20',amountKop:500000,custodyLocation:'CASH-MAIN'});
 assert.equal(s.plans['PLAN-20'].remainingKop,1500000);
 assert.equal(summarize(s).cashKop,0);assert.equal(s.costKop,500000);
});
test('T11 — profit due, withdrawal offset and payout must each affect only own ledger once',()=>{
 let s=seeded(2000000);s=next(s,'REVENUE_RECOGNIZE',{orderId:'ORDER-A',amountKop:1000000,priceState:'KNOWN'});
 s=next(s,'ORDER_COSTS_CONFIRM',{orderId:'ORDER-A'});s=next(s,'PROFIT_VERIFY',{evidenceId:'SYNTHETIC-PROFIT-AUDIT'});
 s=next(s,'PROFIT_ASSIGN',{amountKop:500000,policyId:'POLICY-1',shares:[{partyId:'PARTNER-S',basisPoints:10000}]});
 let cash=summarize(s).cashKop;
 s=next(s,'PARTNER_WITHDRAWAL',{partyId:'PARTNER-S',amountKop:200000,custodyLocation:'CASH-MAIN'});
 s=next(s,'PROFIT_OFFSET',{partyId:'PARTNER-S',amountKop:200000});
 assert.equal(summarize(s).cashKop,cash-200000);assert.equal(s.partnerProfitDue['PARTNER-S'],300000);
 assert.equal(s.partnerWithdrawals['PARTNER-S'],0);assert.equal(s.assignedProfitKop,500000);
 s=next(s,'PROFIT_PAY',{partyId:'PARTNER-S',amountKop:300000,custodyLocation:'CASH-MAIN'});
 assert.equal(s.partnerProfitDue['PARTNER-S'],0);assert.equal(s.assignedProfitKop,500000);
 assert.equal(summarize(s).cashKop,cash-500000);
});
test('T12 — UNKNOWN price not recognized, order with unknown costs blocks verified profit',()=>{
 let s=seeded(0);
 code(()=>next(s,'REVENUE_RECOGNIZE',{orderId:'ORDER-A',amountKop:400000,priceState:'UNKNOWN'}),'ORDER_PRICE_UNKNOWN');
 s=next(s,'REVENUE_RECOGNIZE',{orderId:'ORDER-A',amountKop:400000,priceState:'KNOWN'});
 code(()=>next(s,'PROFIT_VERIFY',{evidenceId:'PROOF-A'}),'ORDER_COST_UNKNOWN');
});
test('T13 — separate loan obligations and principal/interest partial installments',()=>{
 let s=seeded(0);
 s=next(s,'LOAN_RECEIVE',{loanId:'LOAN-A',amountKop:2000000,custodyLocation:'CASH-MAIN'});
 s=next(s,'LOAN_RECEIVE',{loanId:'LOAN-B',amountKop:300000,custodyLocation:'CASH-MAIN'});
 s=next(s,'LOAN_REPAY',{loanId:'LOAN-A',principalKop:400000,interestKop:5000,custodyLocation:'CASH-MAIN'});
 assert.equal(s.loanDebt['LOAN-A'],1600000);assert.equal(s.loanDebt['LOAN-B'],300000);
 assert.equal(s.costKop,5000);assert.equal(summarize(s).cashKop,1895000);
});
test('T14 — insufficient cash never becomes zero or confirmed, impossible reserve denied',()=>{
 let s=seeded(0);s=next(s,'OPERATING_EXPENSE',{amountKop:50000,custodyLocation:'CASH-MAIN'});
 assert.equal(summarize(s).cashKop,-50000);assert.ok(summarize(s).issues.includes('NEGATIVE_CASH_SOURCE_UNVERIFIED'));
 s=next(s,'PLAN_CREATE',{planId:'PLAN-A',amountKop:10000,dueDate:'2026-10-25'});
 code(()=>next(s,'RESERVE_CREATE',{reserveId:'RES-A',planId:'PLAN-A',amountKop:10000}), 'CASH_UNVERIFIED_FOR_RESERVE');
});
test('T15 — timeout retry with same request/event returns duplicate, version conflict fails',()=>{
 const s=seeded(0),e=event(s,'CASH_RECEIPT',{amountKop:50000,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});
 const first=apply(s,e),dup=apply(first.state,e);assert.equal(dup.duplicate,true);
 assert.strictEqual(dup.state,first.state);assert.equal(dup.summary.cashKop,50000);
 const clash=event(s,'CASH_RECEIPT',{amountKop:100,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});
 code(()=>apply(first.state,clash),'REVISION_CONFLICT');
});
test('T16 — old generation, missing generation and prior offline outbox fail closed',()=>{
 const s=seeded(0),e=event(s,'CASH_RECEIPT',{amountKop:10,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});
 code(()=>apply(s,{...e,generation:'OLD-GEN'}),'BUSINESS_GENERATION_MISMATCH');
 code(()=>apply(s,{...e,generation:undefined}),'BUSINESS_GENERATION_MISMATCH');
 code(()=>assertCurrentGeneration({activeGeneration:s.generation,requestGeneration:s.generation,localOutboxGeneration:'OLD-GEN'}),'OLD_OUTBOX_QUARANTINE_REQUIRED');
});
test('T17 — ADMIN1 permitted, USER with specific right permitted, USER without denied',()=>{
 let s=seeded(100000);s=next(s,'OPERATING_EXPENSE',{amountKop:20000,custodyLocation:'CASH-MAIN'},USER);
 assert.equal(summarize(s).cashKop,80000);
 const noRight={userId:'USER2',role:'USER',permissions:['wallet.view']};
 code(()=>next(s,'PROFIT_PAY',{partyId:'PARTNER-S',amountKop:5000,custodyLocation:'CASH-MAIN'},noRight),'PERMISSION_DENIED');
});
test('Mixed payment legs must sum exactly and illegal supplier overpay is refused',()=>{
 let s=seeded(1000000);
 code(()=>material(s,'LOT-X',1000000,[{kind:'BUSINESS',amountKop:900000,custodyLocation:'CASH-MAIN'}]),'PAYMENT_LEGS_TOTAL_MISMATCH');
 s=material(s,'LOT-S',500000,[{kind:'SUPPLIER_DEBT',amountKop:500000,obligationId:'SUP-A'}]);
 code(()=>next(s,'SUPPLIER_PAY',{obligationId:'SUP-A',amountKop:600000,custodyLocation:'CASH-MAIN'}),'SUPPLIER_OVERPAYMENT');
});
test('Reserve double-link, oversubscription and release overrun rejected',()=>{
 let s=seeded(100000);s=next(s,'PLAN_CREATE',{planId:'PLAN-A',amountKop:90000,dueDate:'2026-10-31'});
 s=next(s,'RESERVE_CREATE',{reserveId:'RES-A',planId:'PLAN-A',amountKop:80000});
 code(()=>next(s,'RESERVE_CREATE',{reserveId:'RES-B',planId:'PLAN-A',amountKop:10000}),'PLAN_RESERVE_CONFLICT');
 code(()=>next(s,'RESERVE_RELEASE',{reserveId:'RES-A',amountKop:90000}),'RESERVE_OVERPAYMENT');
 s=next(s,'RESERVE_RELEASE',{reserveId:'RES-A',amountKop:30000});assert.equal(summarize(s).freeKop,50000);
});
test('Planner overspend is explicit warning, but actual payment not lost',()=>{
 let s=seeded(30000);s=next(s,'PLAN_CREATE',{planId:'PLAN-X',amountKop:10000,dueDate:'2026-10-25'});
 const out=apply(s,event(s,'PLAN_SPEND',{planId:'PLAN-X',amountKop:15000,custodyLocation:'CASH-MAIN'}));
 assert.ok(out.issues.includes('PLAN_ACTUAL_OVER_ESTIMATE'));
 assert.equal(out.state.plans['PLAN-X'].remainingKop,0);assert.equal(out.summary.cashKop,15000);
});
test('Personal support and owner business cash custody never create debt or profit',()=>{
 let s=seeded(0);s=next(s,'PARTNER_CONTRIBUTION',{kind:'SUPPORT',partyId:'PARTNER-S',amountKop:70000,custodyLocation:'CUSTODY-SERGEY'});
 assert.equal(s.partnerReturnable['PARTNER-S']||0,0);assert.equal(summarize(s).recognizedProfitKop,0);
 assert.equal(s.cash['CUSTODY-SERGEY'],70000);
});
test('Single event cannot be replayed with altered amount or reused event ID',()=>{
 let s=seeded(0),e=event(s,'CASH_RECEIPT',{amountKop:10000,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});
 s=apply(s,e).state;
 code(()=>apply(s,{...e,amountKop:20000}),'IDEMPOTENCY_KEY_REUSE_CONFLICT');
 code(()=>apply(s,{...e,requestId:'REQ-Q079-OTHER'}),'IDEMPOTENCY_KEY_REUSE_CONFLICT');
 code(()=>apply(s,{...e,eventId:'EVT-Q079-OTHER'}),'IDEMPOTENCY_KEY_REUSE_CONFLICT');
});
test('Preview is pure and original state untouched even on a failed complex event',()=>{
 const s=seeded(50000),before=JSON.stringify(s),e=event(s,'OPERATING_EXPENSE',{amountKop:10000,custodyLocation:'CASH-MAIN'});
 const p=preview(s,e);assert.equal(JSON.stringify(s),before);assert.equal(p.summary.cashKop,40000);
 code(()=>material(s,'LOT-Z',200000,[{kind:'BUSINESS',amountKop:100000,custodyLocation:'CASH-MAIN'}]),'PAYMENT_LEGS_TOTAL_MISMATCH');
 assert.equal(JSON.stringify(s),before);
});
test('Material lot cannot allocate beyond original quantity or double allocate',()=>{
 let s=seeded(100000);s=material(s,'LOT-1',100000,undefined,1000);
 code(()=>next(s,'MATERIAL_ALLOCATE',{lotId:'LOT-1',orderId:'ORDER-A',quantityMilli:1001}),'LOT_QUANTITY_OVERPAYMENT');
 s=next(s,'MATERIAL_ALLOCATE',{lotId:'LOT-1',orderId:'ORDER-A',quantityMilli:1000});
 assert.equal(s.stockLots['LOT-1'].remainingCostKop,0);
 code(()=>next(s,'MATERIAL_ALLOCATE',{lotId:'LOT-1',orderId:'ORDER-A',quantityMilli:1}),'LOT_QUANTITY_OVERPAYMENT');
});
test('After recognized new cost, profit must be independently reverified',()=>{
 let s=seeded(100000);s=next(s,'REVENUE_RECOGNIZE',{orderId:'ORDER-A',amountKop:50000,priceState:'KNOWN'});
 s=next(s,'ORDER_COSTS_CONFIRM',{orderId:'ORDER-A'});s=next(s,'PROFIT_VERIFY',{evidenceId:'REVIEW-1'});
 s=next(s,'OPERATING_EXPENSE',{amountKop:10000,custodyLocation:'CASH-MAIN',orderId:'ORDER-A'});
 code(()=>next(s,'PROFIT_ASSIGN',{policyId:'POL-1',amountKop:1000,shares:[{partyId:'PARTNER-S',basisPoints:10000}]}),'PROFIT_NOT_VERIFIED');
});
test('Profit assignment must not exceed verified unassigned amount and percentages must total 100%',()=>{
 let s=seeded(100000);s=next(s,'REVENUE_RECOGNIZE',{orderId:'ORDER-A',amountKop:50001,priceState:'KNOWN'});
 s=next(s,'ORDER_COSTS_CONFIRM',{orderId:'ORDER-A'});s=next(s,'PROFIT_VERIFY',{evidenceId:'REVIEW-2'});
 code(()=>next(s,'PROFIT_ASSIGN',{policyId:'POL-1',amountKop:50002,shares:[{partyId:'PARTNER-S',basisPoints:10000}]}),'INSUFFICIENT_UNASSIGNED_PROFIT');
 code(()=>next(s,'PROFIT_ASSIGN',{policyId:'POL-1',amountKop:10000,shares:[{partyId:'PARTNER-S',basisPoints:5000}]}),'PROFIT_SHARES_NOT_100_PERCENT');
 s=next(s,'PROFIT_ASSIGN',{policyId:'POL-1',amountKop:50001,shares:[{partyId:'PARTNER-S',basisPoints:5000},{partyId:'PARTNER-E',basisPoints:5000}]});
 assert.equal(s.partnerProfitDue['PARTNER-S']+s.partnerProfitDue['PARTNER-E'],50001);
 assert.equal(summarize(s).unassignedProfitKop,0);
});
test('No pending privilege escalation via role label: only ADMIN1 or explicit permission',()=>{
 const s=seeded(0);const bad={userId:'USER-7',role:'ADMIN2',permissions:[]};
 code(()=>next(s,'PARTNER_CONTRIBUTION',{kind:'RETURNABLE',partyId:'PARTNER-7',amountKop:10,custodyLocation:'CASH-MAIN'},bad),'PERMISSION_DENIED');
});
test('Date before generation is forbidden, malformed dates and floats rejected',()=>{
 let s=seeded(0);let e=event(s,'CASH_RECEIPT',{amountKop:12,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});
 code(()=>apply(s,{...e,effectiveDate:'2026-10-20'}),'PRE_GENERATION_BUSINESS_DATE');
 code(()=>apply(s,{...e,effectiveDate:'2026-13-90'}),'DATE_INVALID');
 code(()=>apply(s,{...e,amountKop:12.5}),'AMOUNT_POSITIVE_SAFE_INTEGER_REQUIRED');
});
test('Opening confirmation may occur only once on empty dataset and must cite evidence',()=>{
 let s=fresh();code(()=>next(s,'OPENING_CONFIRM',{}),'OPENING_EVIDENCE_INVALID');
 s=next(s,'OPENING_CONFIRM',{evidenceId:'OWNER-APPROVAL'});
 code(()=>next(s,'OPENING_CONFIRM',{evidenceId:'AGAIN'}),'OPENING_ALREADY_CONFIRMED');
});
test('Negative custody bucket with positive total cash blocks profit review and assignment',()=>{
 let s=seeded(100000);s=next(s,'REVENUE_RECOGNIZE',{orderId:'ORDER-A',amountKop:30000,priceState:'KNOWN'});
 s=next(s,'ORDER_COSTS_CONFIRM',{orderId:'ORDER-A'});s=next(s,'PROFIT_VERIFY',{evidenceId:'REVIEW-OK'});
 // Money moved out of an empty custody wallet: overall cash stays positive, but source is incomplete.
 s=next(s,'CUSTODY_TRANSFER',{fromLocation:'CUSTODY-UNKNOWN',toLocation:'CASH-MAIN',amountKop:50000});
 assert.equal(summarize(s).cashKop,100000);
 assert.ok(summarize(s).issues.includes('NEGATIVE_CUSTODY_SOURCE_UNVERIFIED'));
 code(()=>next(s,'PROFIT_ASSIGN',{policyId:'POL-1',amountKop:100,shares:[{partyId:'PARTNER-S',basisPoints:10000}]}),'NEGATIVE_CASH_UNVERIFIED');
 code(()=>next(s,'PROFIT_VERIFY',{evidenceId:'REVIEW-AGAIN'}),'NEGATIVE_CASH_UNVERIFIED');
});
test('Unconfirmed opening prevents reserves even if a provisional cash receipt exists',()=>{
 let s=fresh();s=next(s,'CASH_RECEIPT',{amountKop:50000,custodyLocation:'CASH-MAIN',purpose:'UNCLASSIFIED_RECEIPT'});
 s=next(s,'PLAN_CREATE',{planId:'PLAN-A',amountKop:20000,dueDate:'2026-10-31'});
 code(()=>next(s,'RESERVE_CREATE',{reserveId:'RES-A',planId:'PLAN-A',amountKop:20000}),'CASH_UNVERIFIED_FOR_RESERVE');
});
test('No accidental export of unimplemented network, storage or mutation integrations' ,()=>{
 assert.ok(TYPES.includes('MATERIAL_PURCHASE'));assert.ok(!TYPES.includes('DELETE_ALL_FINANCE'));
 const x=fresh();assert.deepEqual(Object.keys(x.idempotency),[]);
});
