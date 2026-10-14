'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('staging/q046/backend-q046.js','utf8');
function actual(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert(i>=0&&j>i,'Actual handler anchor: '+a);return source.slice(i,j)}
const code=[
  actual('function numberOrNull_(', 'function versionRank_('),
  actual('function tableRowObject_(', 'function appendByHeaders_('),
  actual('function mutateOrder_(', 'const NOM_SYNC='),
  actual('function q046OrderSummary_(', 'function q046BuildCanonicalWallet_(')
].join('\n');
const headers=[
'ID заказа','№ заказа','Статус','Название заказа','Имя клиента',
'Цена клиенту','Получено','Долг','price_state','Предоплаты достаточно',
'created_by_user_id','record_version','last_event_id','updated_by_user_id',
'updated_by_name','updated_at_app','Последнее изменение','is_deleted','Комментарий'
];
function fixture(opts={}){
 const row=Object.assign({
 'ID заказа':'ORD-2026-009','№ заказа':'2026-009','Статус':'В работе',
 'Название заказа':'Покраска — Дима','Имя клиента':'Дима',
 'Цена клиенту':'','Получено':14000,'Долг':'','price_state':'UNKNOWN',
 'Предоплаты достаточно':'','created_by_user_id':'ADMIN1',
 'record_version':1,'last_event_id':'Q044-FINANCE-CUTOVER-20261008-V1-DIMA-ORDER',
 'is_deleted':false
 },opts.row||{});
 const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
 const values=headers.map(h=>row[h]??'');
 const writes=[],audit=[],touches=[],finance=[];
 let failKey=null,allowed=opts.allowed!==false;
 const table={headers,index,rows:[values],sheet:{
   getLastColumn:()=>headers.length,
   getRange(r,c,n,m){
     assert.equal(r,2);assert(c>=1&&c<=headers.length);
     if(n===1&&m===headers.length)return {getValues:()=>[values.slice()]};
     return {setValue(v){
       const k=headers[c-1];
       if(failKey===k){failKey=null;throw new Error('INJECTED_'+k);}
       values[c-1]=v;writes.push({field:k,value:v});
     }};
   }
 }};
 const ctx={console,Date,Math,Number,String,JSON,Object,Array,Set,Map,Boolean,
  Error,RegExp,isFinite,
  CFG:{SPREADSHEET_ID:'SYNTHETIC'},
  cleanText_:(v,n)=>String(v==null?'':v).slice(0,n||5000),
  cleanOut_:v=>String(v==null?'':v),
  valueBy_:(t,r,k)=>r[t.index[k]],
  findOrderHit_:id=>(id==='ORD-2026-009'||id==='2026-009')?{table,row:2,values:values.slice()}:null,
  mutationPermission_:()=>allowed,
  mutationConflictGuard_:(typ,id,t,initial,body)=>{
    const current=Number(initial[t.index.record_version]||0);
    if(body.base_record_version!=null&&Number(body.base_record_version)!==current)
      return {ok:false,conflict_id:'CONFLICT',conflicting_fields:['client_price'],server_record_version:current};
    return {ok:true};
  },
  deny_:(error)=>({ok:false,error}),
  orderDeadlineValue_:x=>x,
  ensureOrderCompletionIncome_:()=>finance.push('UNEXPECTED_COMPLETION_FINANCE'),
  auditMutation_:(domain,id,action,auth,event,before,after,note)=>
    audit.push({domain,id,action,event,before,after,note}),
  touchSessionAndDevice_:()=>touches.push('session-only'),
  nowIso_:()=> '2026-10-10T15:00:00.000Z',
  q046SafeTable_:name=>name==='Заказы'?table:null,
  q046PlannedFinance_:()=>[],
  q046AllocationRows_:()=>[],
  q046IsDeleted_:v=>v===true||String(v).toUpperCase()==='TRUE',
  q046Money_:v=>Number(v||0)
 };
 vm.createContext(ctx);vm.runInContext(code,ctx,{filename:'actual-staging-backend-price-and-wallet.js'});
 const auth={user:{userId:'ADMIN1',name:'Test ADMIN1',role:'ADMIN1'},deviceId:'FAKE'};
 const body=(patch,event='DIMA-PRICE-20261010-ONE')=>({
   entity_id:'ORD-2026-009',record_action:'update',base_record_version:1,
   event_id:event,patch,note:'Q066 authorized correction; synthetic test'
 });
 return {ctx,table,values,writes,audit,touches,finance,body,auth,
   mutate:(payload)=>vm.runInContext('mutateOrder_(globalThis.__BODY,globalThis.__AUTH,globalThis.__BODY.event_id,globalThis.__BODY.record_action)',Object.assign(ctx,{__BODY:payload,__AUTH:auth})),
   summary:()=>vm.runInContext('q046OrderSummary_()',ctx),
   get:key=>values[index[key]],
   setAllowed:v=>{allowed=v;},failOn:key=>{failKey=key;}
 };
}
let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name)}
test('Before: Dima has UNKNOWN price and existing 14000 prepayment, not receivable',()=>{
 const x=fixture(),s=x.summary();
 assert.equal(s.known_receivable_total,0);
 assert.equal(s.unknown_price_orders.length,1);
 assert.equal(s.unknown_price_orders[0].received,14000);
 assert.equal(x.writes.length,0);
});
test('Valid price mutation moves UNKNOWN to KNOWN and sets receivable=12332 with no finance append',()=>{
 const x=fixture(),r=x.mutate(x.body({client_price:26332}));
 assert.equal(r.ok,true);assert.equal(r.duplicate,undefined);
 assert.equal(x.get('Цена клиенту'),26332);
 assert.equal(x.get('price_state'),'KNOWN');
 assert.equal(x.get('Получено'),14000);
 assert.equal(x.get('Долг'),12332);
 assert.equal(x.get('Предоплаты достаточно'),'Да');
 assert.equal(x.get('record_version'),2);
 assert.equal(x.get('last_event_id'),'DIMA-PRICE-20261010-ONE');
 assert.equal(x.audit.length,1);assert.equal(x.audit[0].after.price_state,'KNOWN');
 assert.equal(x.audit[0].before.price_state,'UNKNOWN');
 assert.equal(x.touches.length,1);
 assert.deepEqual(x.finance,[]);
 const s=x.summary();
 assert.equal(s.known_receivable_total,12332);
 assert.equal(s.known_orders.length,1);
 assert.equal(s.known_orders[0].price,26332);
 assert.equal(s.known_orders[0].received,14000);
 assert.equal(s.known_orders[0].receivable,12332);
 assert.equal(s.unknown_price_orders.length,0);
});
test('Same request ID is idempotent, even on changed order version',()=>{
 const x=fixture(),cmd=x.body({client_price:26332});x.mutate(cmd);
 const w=x.writes.length,r=x.mutate(cmd);
 assert.equal(r.ok,true);assert.equal(r.duplicate,true);
 assert.equal(r.record_version,2);assert.equal(x.writes.length,w);
 assert.equal(x.audit.length,1);assert.deepEqual(x.finance,[]);
});
test('Invalid, blank, zero, negative and non-finite prices fail before writes',()=>{
 for(const price of ['nonsense','',0,-5,'Infinity',Infinity,'0.00']){
   const x=fixture();
   assert.throws(()=>x.mutate(x.body({client_price:price})),/ORDER_PRICE_INVALID/);
   assert.equal(x.writes.length,0,String(price));
   assert.equal(x.get('price_state'),'UNKNOWN');assert.equal(x.get('Получено'),14000);
 }
});
test('No price patch must not change UNKNOWN price state',()=>{
 const x=fixture(),r=x.mutate(x.body({comment:'Комментарий без цены'}));
 assert.equal(r.ok,true);assert.equal(x.get('price_state'),'UNKNOWN');
 assert.equal(x.get('Цена клиенту'),'');assert.equal(x.get('Получено'),14000);
});
test('Denied permission is fail closed before any business write',()=>{
 const x=fixture({allowed:false}),r=x.mutate(x.body({client_price:26332}));
 assert.equal(r.ok,false);assert.equal(r.error,'MUTATION_DENIED');
 assert.equal(x.writes.length,0);assert.equal(x.audit.length,0);
});
test('Stale version returns conflict, without changing Order or Finance',()=>{
 const x=fixture(),cmd=x.body({client_price:26332});cmd.base_record_version=0;
 const r=x.mutate(cmd);
 assert.equal(r.conflict,true);assert.equal(r.server_record_version,1);
 assert.equal(x.writes.length,0);assert.deepEqual(x.finance,[]);
});
test('Partial failure before price_state can retry same event without double receipt',()=>{
 const x=fixture();x.failOn('price_state');
 const cmd=x.body({client_price:26332});
 assert.throws(()=>x.mutate(cmd),/INJECTED_price_state/);
 assert.equal(x.get('Цена клиенту'),26332);assert.equal(x.get('price_state'),'UNKNOWN');
 assert.equal(x.get('last_event_id'),'Q044-FINANCE-CUTOVER-20261008-V1-DIMA-ORDER');
 assert.equal(x.audit.length,0);assert.deepEqual(x.finance,[]);
 const r=x.mutate(cmd);assert.equal(r.ok,true);
 assert.equal(x.get('price_state'),'KNOWN');assert.equal(x.get('Получено'),14000);
 assert.equal(x.get('Долг'),12332);assert.equal(x.audit.length,1);
});
test('Update of an already KNOWN price stays known, recalculates due, no income',()=>{
 const x=fixture({row:{'Цена клиенту':20000,'price_state':'KNOWN','Долг':6000}});
 const r=x.mutate(x.body({client_price:26332}));
 assert.equal(r.ok,true);assert.equal(x.get('Долг'),12332);assert.equal(x.get('price_state'),'KNOWN');
 assert.deepEqual(x.finance,[]);
});
test('Price correction never infers cost or completion income',()=>{
 const x=fixture();x.mutate(x.body({client_price:26332}));
 assert.equal(x.get('Статус'),'В работе');
 assert.deepEqual(x.finance,[]);
 assert.equal(x.writes.some(z=>['Статус','Фактические прямые затраты','Себестоимость расчётная','Получено'].includes(z.field)),false);
});
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.equal(version.rolloutStage,'staging-only');
assert.equal(version.dbSchema,5);
console.log(JSON.stringify({kind:'Q066_DIMA_ORDER_PRICE_REAL_HANDLER_AND_REAL_WALLET_READ_MODEL',passed:n,total:10,ok:true,financeWrites:0,scope:'synthetic in-memory adapter; not authenticated production'}));
