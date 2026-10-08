'use strict';
const assert=require('assert');
function base(){
  return {
    openingCash:11108,
    legacy:{cash:23981.15,sergeyDebt:39028.02},
    epochFacts:[],
    partners:{SERGEY:{funding:26109.52,distribution:0},EVGENY:{funding:0,distribution:-2000}},
    obligations:{GUN:{original:21662,paid:2708,remaining:18954}},
    allocations:[],
    plans:{},
    orders:{DIMA:{price:null,received:14000}},
    seen:new Set()
  };
}
function cash(s){return s.openingCash+s.epochFacts.reduce((n,x)=>n+(x.cashDelta||0),0)}
function freeNow(s){return cash(s)-s.allocations.filter(x=>x.state==='RESERVED').reduce((n,x)=>n+x.amount,0)}
function once(s,id,fn){if(s.seen.has(id))return false;s.seen.add(id);fn();return true}
function reserve(s,id,amount){return once(s,id,()=>{if(amount>freeNow(s))throw Error('reserve>free');s.allocations.push({id,amount,state:'RESERVED'})})}
function cancelReserve(s,id,event){return once(s,event,()=>{const a=s.allocations.find(x=>x.id===id);if(a)a.state='CANCELLED'})}
function personalExpense(s,id,amount){return once(s,id,()=>{s.epochFacts.push({id,cashDelta:0,route:'PERSON'});s.partners.SERGEY.funding+=amount})}
function walletExpense(s,id,amount){return once(s,id,()=>s.epochFacts.push({id,cashDelta:-amount,route:'PRODUCTION_WALLET'}))}
function reimbursement(s,id,amount){return once(s,id,()=>{s.epochFacts.push({id,cashDelta:-amount,route:'PRODUCTION_WALLET'});s.partners.SERGEY.funding-=amount})}
function loanIn(s,id,amount){return once(s,id,()=>{s.epochFacts.push({id,cashDelta:amount,route:'PRODUCTION_WALLET'});s.obligations[id]={original:amount,paid:0,remaining:amount}})}
function supplierCredit(s,id,amount){return once(s,id,()=>{s.epochFacts.push({id,cashDelta:0,route:'SUPPLIER_DEBT'});s.obligations[id]={original:amount,paid:0,remaining:amount}})}
function prepayment(s,id,order,amount){return once(s,id,()=>{s.epochFacts.push({id,cashDelta:amount,route:'PRODUCTION_WALLET'});s.orders[order]=s.orders[order]||{price:null,received:0};s.orders[order].received+=amount})}
function createPlan(s,id,amount){s.plans[id]={amount,state:'PLANNED',executed:null}}
function spendPlan(s,planId,event,source){const p=s.plans[planId];if(p.executed)return false;return once(s,event,()=>{p.executed='FIN-'+event;p.state='EXECUTED';s.epochFacts.push({id:p.executed,cashDelta:source==='PRODUCTION_WALLET'?-p.amount:0,route:source})})}
function receivable(s){let known=0,unknown=[];for(const [id,o] of Object.entries(s.orders)){if(o.price==null)unknown.push(id);else known+=Math.max(0,o.price-o.received)}return {known,unknown}}
function can(user,action){if(action==='read')return user.permissions.includes('wallet.view');if(action==='sensitive')return user.role==='ADMIN1';return false}
const results=[];function test(n,name,fn){fn();results.push({n,name,pass:true})}

test(1,'canonical opening ignores legacy wallet cells',()=>{const s=base();assert.equal(cash(s),11108);assert.equal(s.partners.SERGEY.funding,26109.52)});
test(2,'reserve 6000 changes Free now only',()=>{const s=base();reserve(s,'R1',6000);assert.equal(cash(s),11108);assert.equal(freeNow(s),5108)});
test(3,'cancel reserve restores Free now',()=>{const s=base();reserve(s,'R1',6000);cancelReserve(s,'R1','R1-C');assert.equal(cash(s),11108);assert.equal(freeNow(s),11108)});
test(4,'planned rent does not affect cash/free until reserved/executed',()=>{const s=base();createPlan(s,'P-RENT',31000);assert.equal(cash(s),11108);assert.equal(freeNow(s),11108)});
test(5,'Sergey personal-paid expense adds funding once, no cash delta',()=>{const s=base();personalExpense(s,'E1',1000);personalExpense(s,'E1',1000);assert.equal(cash(s),11108);assert.equal(s.partners.SERGEY.funding,27109.52)});
test(6,'production-wallet expense reduces cash once',()=>{const s=base();walletExpense(s,'E2',1000);walletExpense(s,'E2',1000);assert.equal(cash(s),10108)});
test(7,'Sergey reimbursement reduces cash and funding once',()=>{const s=base();reimbursement(s,'RMB1',1000);reimbursement(s,'RMB1',1000);assert.equal(cash(s),10108);assert.equal(s.partners.SERGEY.funding,25109.52)});
test(8,'third-party loan inflow increases cash and obligation, not profit',()=>{const s=base();loanIn(s,'LOAN1',5000);assert.equal(cash(s),16108);assert.equal(s.obligations.LOAN1.remaining,5000)});
test(9,'supplier-credit purchase increases obligation without cash change',()=>{const s=base();supplierCredit(s,'SUP1',7000);assert.equal(cash(s),11108);assert.equal(s.obligations.SUP1.remaining,7000)});
test(10,'client prepayment increases cash once and stays linked to order',()=>{const s=base();prepayment(s,'PAY1','O1',3000);prepayment(s,'PAY1','O1',3000);assert.equal(cash(s),14108);assert.equal(s.orders.O1.received,3000)});
test(11,'planned Spent duplicate retry creates one factual Finance effect',()=>{const s=base();createPlan(s,'P1',1000);spendPlan(s,'P1','SP1','PRODUCTION_WALLET');spendPlan(s,'P1','SP1','PRODUCTION_WALLET');assert.equal(cash(s),10108);assert.equal(s.epochFacts.filter(x=>x.id==='FIN-SP1').length,1)});
test(12,'same event_id for reserve/payment has no duplicate effect',()=>{const s=base();reserve(s,'RES-EVT',1000);reserve(s,'RES-EVT',1000);walletExpense(s,'PAY-EVT',500);walletExpense(s,'PAY-EVT',500);assert.equal(s.allocations.length,1);assert.equal(cash(s),10608)});
test(13,'Dima UNKNOWN-price order excluded from known receivable',()=>{const s=base(),r=receivable(s);assert.equal(r.known,0);assert.deepEqual(r.unknown,['DIMA'])});
test(14,'legacy owner-funded paired history is ignored by canonical epoch model',()=>{const s=base();s.legacy.pairedContribution=12000;s.legacy.pairedExpense=12000;assert.equal(cash(s),11108);assert.equal(s.partners.SERGEY.funding,26109.52)});
test(15,'wallet.view can read but regular user cannot sensitive actions',()=>{const u={role:'WORKER',permissions:['wallet.view']};assert.equal(can(u,'read'),true);assert.equal(can(u,'sensitive'),false);assert.equal(can({role:'ADMIN1',permissions:['wallet.view']},'sensitive'),true)});
console.log(JSON.stringify({ok:true,passed:results.length,total:15,results},null,2));
