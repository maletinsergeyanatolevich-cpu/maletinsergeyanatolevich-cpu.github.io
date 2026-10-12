'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('staging/q046/backend-q046.js','utf8');
function extract(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i,'source anchor '+a);return src.slice(i,j);}
const cashCode=extract('function q029CashCutoverPosition_(','function q046AllocationRows_(');
const provenance=extract('function q029CashSourceProvenance_(','function q046BuildCanonicalWallet_(');
const HEAD=['ID операции','Дата','cash_epoch_id','Тип','Сумма','is_deleted','Фактическая операция',
 'Источник денег / оплаты','cash_destination','partner_party_id','partner_effect'];
const make=(a)=>HEAD.map(h=>a[h]??'');
const t={headers:HEAD,index:Object.fromEntries(HEAD.map((h,i)=>[h,i])),rows:[]};
const rec={reconciliation_id:'Q044-EPOCH',effective_at:'2026-10-08T13:20:30.992Z',applied_at:'2026-10-08T13:21:13.931Z',production_cash_target:11108};
const formatDate=d=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tomsk',
 year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
 }).formatToParts(d).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day+' '+p.hour+':'+p.minute+':'+p.second;
};
const ctx={Date,Math,Number,String,Boolean,Array,Object,JSON,RegExp,Error,Set,Map,console,
 Utilities:{formatDate},spreadsheetTz_:()=> 'Asia/Tomsk',
 q046IsDeleted_:v=>String(v??'').toUpperCase()==='TRUE',
 yes_:v=>v===true||String(v??'').toUpperCase()==='ДА'||String(v??'').toUpperCase()==='TRUE',
 valueBy_:(table,row,key)=>row[table.index[key]],
 numberOrNull_:v=>Number.isFinite(Number(v))&&v!==''?Number(v):null
};
vm.createContext(ctx);vm.runInContext(cashCode+'\n'+provenance,ctx);
const call=(func,table=t,row)=>{ctx.__t=table;ctx.__r=row;ctx.__rec=rec;return vm.runInContext(func+'(__t,__r,__rec.reconciliation_id,__rec)',ctx)};
const sum=(table=t)=>Math.round(table.rows.reduce((s,r)=>s+call('q046FinanceCashDelta_',table,r),0)*100)/100;
const meta=()=>{ctx.__t=t;ctx.__rec=rec;return vm.runInContext('q029CashSourceProvenance_(__rec,__t,__rec.reconciliation_id)',ctx)};
const entry=(id,date,type='Приход',amount=200,attrs={})=>make({'ID операции':id,'Дата':date,Тип:type,'Сумма':amount,
 'Фактическая операция':'Да','Источник денег / оплаты':type==='Расход'?'PRODUCTION_WALLET':'NONE',
 cash_destination:type==='Приход'?'PRODUCTION_WALLET':'NONE',...attrs});
let count=0;
function check(name,fn){t.rows=[];fn();count++;console.log('PASS '+name);}
check('106 pre-Q044 untagged historical Finance rows never replay',()=>{
 t.rows=Array.from({length:106},(_,i)=>entry('OLD-'+i,'05.10.2026','Расход',1));
 assert.strictEqual(sum(),0);const p=meta();
 assert.strictEqual(p.historical_without_epoch_count,106);
 assert.strictEqual(p.manual_post_cutover_count,0);
});
check('new direct post-Q044 client receipt is auto-counted and reflected in provenance',()=>{
 t.rows=[entry('NEW-IN','12.10.2026','Приход',700)];
 assert.strictEqual(sum(),700);
 const p=meta();assert.strictEqual(p.manual_post_cutover_count,1);assert.strictEqual(p.cash_movement_count,1);
 assert.strictEqual(11108+sum(),11808);
});
check('direct cash expense is included, direct PERSONAL funding is not cash',()=>{
 t.rows=[entry('IN','12.10.2026','Приход',600),
 entry('OUT','12.10.2026','Расход',350),
 entry('PERSON','12.10.2026','Расход',100,{'Источник денег / оплаты':'PERSON',partner_party_id:'PTY-S',
 partner_effect:'FUNDING_INCREASE'})];
 assert.strictEqual(sum(),250);assert.strictEqual(meta().manual_post_cutover_count,3);
});
check('manual amount editing recalculates same Finance ID without stale cash',()=>{
 const a=entry('SAME-ID','12.10.2026','Приход',150);t.rows=[a];
 assert.strictEqual(sum(),150);a[t.index['Сумма']]=175;assert.strictEqual(sum(),175);
});
check('manual deletion drops the cash exactly once; tombstones need no complete date',()=>{
 const a=entry('SAME-ID','12.10.2026','Приход',190);t.rows=[a];
 assert.strictEqual(sum(),190);a[t.index.is_deleted]=true;assert.strictEqual(sum(),0);
 a[t.index['Дата']]='';assert.strictEqual(sum(),0);
});
check('pre-cutover rows on or before Q044 timestamp stay historical',()=>{
 t.rows=[entry('BEFORE','08.10.2026 20:19:00','Приход',300),
 entry('EQUAL','08.10.2026 20:20:30','Приход',400),
 entry('AFTER','08.10.2026 20:20:31','Приход',500)];
 assert.strictEqual(sum(),500);
});
check('same-day date-only ambiguous row fails closed, not silently omitted',()=>{
 t.rows=[entry('AMBIG','08.10.2026','Приход',200)];
 assert.throws(()=>sum(),/FINANCE_MANUAL_DATE_NEEDS_CLARIFICATION:AMBIG/);
});
check('ISO timestamp with Z and typed Sheets Date classify in sheet timezone',()=>{
 t.rows=[entry('ISO','2026-10-08T14:00:00Z','Приход',125),
 entry('DATEOBJ',new Date('2026-10-12T04:00:00Z'),'Расход',40)];
 assert.strictEqual(sum(),85);
});
check('new manual actual missing date fails closed',()=>{
 t.rows=[entry('NO-DATE','', 'Приход',200)];
 assert.throws(()=>sum(),/FINANCE_MANUAL_DATE_NEEDS_CLARIFICATION:NO-DATE/);
});
check('new manual income destination unspecified fails closed',()=>{
 t.rows=[entry('NO-DEST','12.10.2026','Приход',200,{cash_destination:''})];
 assert.throws(()=>sum(),/FINANCE_MANUAL_CASH_DESTINATION_REQUIRED:NO-DEST/);
});
check('new manual expense source missing/none fails closed',()=>{
 t.rows=[entry('NO-SRC','12.10.2026','Расход',200,{'Источник денег / оплаты':'NONE'})];
 assert.throws(()=>sum(),/FINANCE_MANUAL_PAYMENT_SOURCE_REQUIRED:NO-SRC/);
});
check('new direct personal expense needs partner identity/classification to prevent incorrect debt',()=>{
 t.rows=[entry('NO-PARTNER','12.10.2026','Расход',200,{'Источник денег / оплаты':'PERSON'})];
 assert.throws(()=>sum(),/FINANCE_MANUAL_PARTNER_CLASSIFICATION_REQUIRED:NO-PARTNER/);
});
check('manual planned nonfactual row never enters cash, even with no date',()=>{
 t.rows=[entry('PLANNED','','Приход',300,{'Фактическая операция':'Нет'})];assert.strictEqual(sum(),0);
});
check('new direct actual missing actual flag fails closed rather than silently skipped',()=>{
 t.rows=[entry('ACTUAL-EMPTY','12.10.2026','Приход',300,{'Фактическая операция':''})];
 assert.throws(()=>sum(),/FINANCE_MANUAL_ACTUAL_FLAG_REQUIRED:ACTUAL-EMPTY/);
});
check('old tagged Q044 epoch still counted by unchanged canonical route',()=>{
 t.rows=[entry('TAGGED','12.10.2026','Расход',75,{cash_epoch_id:'Q044-EPOCH'})];
 assert.strictEqual(sum(),-75);
});
check('old unrelated epoch remains excluded and old Q044 opening immutable',()=>{
 t.rows=[entry('OLD-EPOCH','12.10.2026','Приход',1000,{cash_epoch_id:'OLD-RECON'})];
 assert.strictEqual(sum(),0);assert.strictEqual(rec.production_cash_target,11108);
});
check('new income without positive amount fails closed',()=>{
 t.rows=[entry('ZERO','12.10.2026','Приход',0)];
 assert.throws(()=>sum(),/FINANCE_MANUAL_TYPE_OR_AMOUNT_INVALID:ZERO/);
});
check('manual date 31.02 rejected; read model is strictly read-only',()=>{
 t.rows=[entry('INVALID-DAY','31.02.2026','Приход',100)];
 assert.throws(()=>sum(),/FINANCE_MANUAL_DATE_NEEDS_CLARIFICATION:INVALID-DAY/);
 assert(!/\b(?:setValue|setValues|appendRow|deleteRow|w1CommitHead_|reconciliation\.apply)\s*\(/.test(cashCode+provenance));
});
assert(src.includes('delta+=q046FinanceCashDelta_(ft,r,epochId,recon)'));
assert(src.includes('!['+"'"+"TAGGED"+"'"+"','"+"'"+"MANUAL_POST"+"'"+"'].includes(q029FinanceCashEpochClass_"));
const manifest=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.strictEqual(manifest.rolloutStage,'staging-only');
console.log(JSON.stringify({suite:'Q029_POST_CUTOVER_MANUAL_FINANCE_ACTUAL_SOURCE',passed:count,ok:true,scope:'staging VM; no Google Sheet writes, no client session, no deploy'}));
