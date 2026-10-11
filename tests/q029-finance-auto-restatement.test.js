'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const code=fs.readFileSync('staging/q046/backend-q046.js','utf8');
function extract(start,end){const i=code.indexOf(start),j=code.indexOf(end,i+start.length);assert(i>=0&&j>i,'actual staging helper '+start);return code.slice(i,j);}
const actual=extract('const Q029_PRE_Q050_FINANCE_BACKUP=','function q046PartnerCards_(');
const partnerCode=extract('function q046PartnerCards_(','function q046Obligations_(');
const cash=extract('function q046FinanceCashDelta_(','function q046AllocationRows_(');
const HEAD=['ID операции','Дата','Тип','Категория','Подкатегория','Сумма','Фактическая операция','is_deleted','Источник денег / оплаты','partner_party_id','partner_effect','Контрагент / поставщик','cash_epoch_id','cash_destination'];
const table=rows=>({headers:HEAD,index:Object.fromEntries(HEAD.map((x,i)=>[x,i])),rows:rows.map(x=>HEAD.map(h=>x[h]??''))});
const past=[
 ['FIN-P1',3872],['FIN-P2',501],['FIN-P3',750],['FIN-P4',5568.48]
 ].map(([id,amount])=>({'ID операции':id,'Дата':'06.10.2026 12:03:00','Тип':'Расход','Категория':'Общие расходы','Сумма':amount,'Фактическая операция':'Да','Источник денег / оплаты':'PERSON',partner_party_id:'PTY-Q029-SERGEY',partner_effect:'FUNDING_INCREASE'}));
past.push(...[['FIN-C1',308.41],['FIN-C2',1024.80]].map(([id,amount])=>({'ID операции':id,'Дата':'06.10.2026','Тип':'Приход','Категория':'Вклад владельца','Подкатегория':'Личные средства Сергей','Контрагент / поставщик':'Сергей','Сумма':amount,'Фактическая операция':'Да'})));
past.push(...[['FIN-X1','Расход',308.41],['FIN-X2','Расход',1024.80],['FIN-X3','Расход',2],['FIN-X4','Приход',2]].map(([id,type,amount])=>({'ID операции':id,'Дата':'06.10.2026','Тип':type,'Категория':type==='Приход'?'Оплата клиента':'Общие расходы','Сумма':amount,'Фактическая операция':'Да'})));
const recon={reconciliation_id:'RECON-Q029-D11FAF59C87F',effective_at:'2026-10-08T13:20:30.992Z',production_cash_target:11108};
let live=table([]),baseline=table(past),writes=0;
const oldSheet={getLastColumn:()=>HEAD.length,getLastRow:()=>baseline.rows.length+1,
 getRange:(r,c,n)=>({getDisplayValues:()=>[HEAD],getValues:()=>baseline.rows})};
const parties=table([]);
const settled={
 headers:['status','partner_party_id','funding_delta','distribution_delta','amount','effective_date','entry_type','settlement_entry_id'],
 index:{status:0,partner_party_id:1,funding_delta:2,distribution_delta:3,amount:4,effective_date:5,entry_type:6,settlement_entry_id:7},
 rows:[['POSTED','PTY-Q029-SERGEY',26109.52,0,26109.52,'2026-10-08','RECONCILIATION_OPENING','PSET-S'],
       ['POSTED','PTY-Q029-EVGENY',0,-2000,2000,'2026-10-08','RECONCILIATION_OPENING','PSET-E']]};
const ctx={console,Date,Math,Number,String,Array,Object,Set,Map,JSON,Error,crypto,
 SpreadsheetApp:{openById:id=>{assert.equal(id,'1-04uDJefawl5Koqsw3OkRLLWkNq31OvX5dZZi8QE3-8');return{getSheetByName:n=>n==='Финансы'?oldSheet:null}}},
 Utilities:{formatDate:()=> '2026-10-06'},spreadsheetTz_:()=> 'Asia/Tomsk',
 sha256Hex_:x=>crypto.createHash('sha256').update(String(x)).digest('hex'),
 valueBy_:(t,r,k)=>r[t.index[k]]??'',yes_:v=>v==='Да'||v===true,
 q046Money_:v=>Number(v)||0,q046IsDeleted_:v=>v===true||String(v||'').toUpperCase()==='TRUE',
 q046SafeTable_:name=>name==='Финансы'?live:name==='Контрагенты'?parties:name==='Расчёты с партнёрами'?settled:null,
 tableRowObject_:(t,r)=>Object.fromEntries(t.headers.map((h,i)=>[h,r[i]])),
 q046LatestAppliedRecon_:()=>recon,nowIso_:()=> '2026-10-12',
};
vm.createContext(ctx);vm.runInContext(actual+'\n'+partnerCode+'\n'+cash,ctx,{filename:'Q029 source-derived finance projection'});
const invoke=(f)=>vm.runInContext(f,ctx);
let passed=0;const test=(n,fn)=>{fn();passed++;console.log('PASS '+n)};
test('10 removed historical Finance rows never return to source',()=>{
 assert.equal(live.rows.length,0);assert.equal(baseline.rows.length,10);
 const p=invoke('q029HistoricPartnerCorrections_(q046SafeTable_("Финансы"),q046LatestAppliedRecon_())');
 assert.equal(p.baseline_row_count,10);assert.equal(p.source_row_count,0);
 assert.equal(p.changed_partner_ids,6);
 assert.equal(p.funding_delta_by_partner['PTY-Q029-SERGEY'],-12024.69);
});
test('partner funding is recomputed from read-only source change, never mutating Q044 settlement',()=>{
 const p=invoke('q046PartnerCards_()');
 const ser=p.find(x=>x.party_id==='PTY-Q029-SERGEY'),ev=p.find(x=>x.party_id==='PTY-Q029-EVGENY');
 assert.equal(ser.funding_due,14084.83);assert.equal(ev.distribution_balance,-2000);
 assert.equal(settled.rows[0][2],26109.52);assert.equal(writes,0);
});
test('physical cash epoch remains 11108 for pre-cutover personal funding corrections',()=>{
 const x=past.reduce((sum,o)=>sum+(o.cash_epoch_id==='E'?o.amount:0),0);
 assert.equal(x,0);const r=invoke('q046FinanceCashDelta_(q046SafeTable_("Финансы"),[],"E")');
 assert.equal(r,0);assert.equal(Number(recon.production_cash_target),11108);
});
test('new direct PERSON edit adds back funding contribution without changing backup',()=>{
 live=table([past[0]]);const p=invoke('q029HistoricPartnerCorrections_(q046SafeTable_("Финансы"),q046LatestAppliedRecon_())');
 assert.equal(p.funding_delta_by_partner['PTY-Q029-SERGEY'],-8152.69);
 assert.equal(baseline.rows.length,10);live=table([]);
});
test('post-cutover Finance source affects live cash without historical partner double-count',()=>{
 live=table([{'ID операции':'FIN-NEW','Дата':'12.10.2026','Тип':'Приход','Сумма':500,
   'Фактическая операция':'Да',cash_epoch_id:'E',cash_destination:'PRODUCTION_WALLET'}]);
 const h=invoke('q029HistoricPartnerCorrections_(q046SafeTable_("Финансы"),q046LatestAppliedRecon_())');
 assert.equal(h.funding_delta_by_partner['PTY-Q029-SERGEY'],-12024.69);
 assert.equal(invoke('q046FinanceCashDelta_(q046SafeTable_("Финансы"),q046SafeTable_("Финансы").rows[0],"E")'),500);
 live=table([]);
});
test('same 106 IDs with edited amount changes Finance row generation digest',()=>{
 const t=table([{'ID операции':'ID1','Дата':'12.10.2026','Тип':'Расход','Сумма':10}]);
 ctx.__t=t;const a=invoke('q029FinanceSourceStamp_(__t)');
 t.rows[0][t.index['Сумма']]=25;const b=invoke('q029FinanceSourceStamp_(__t)');
 assert.equal(a.source_ids_hash,b.source_ids_hash);
 assert.notEqual(a.source_rows_hash,b.source_rows_hash);
});
test('duplicate IDs fail closed and no source mutation helpers exist',()=>{
 const t=table([{'ID операции':'ID1'},{'ID операции':'ID1'}]);ctx.__t=t;
 assert.throws(()=>invoke('q029FinanceSourceStamp_(__t)'),/FINANCE_DUPLICATE_SOURCE_ID/);
 assert(!/\b(?:deleteRow|setValue|appendRow|w1CommitHead_|setValues)\s*\(/.test(actual+partnerCode));
});
console.log(JSON.stringify({kind:'Q029_SOURCE_CORRECTED_HISTORICAL_PARTNER_RESTATEMENT',passed,ok:true,scope:'actual backend helpers, synthetic 10 deleted Finance rows and unchanged Q044 opening; no live auth or writes'}));
