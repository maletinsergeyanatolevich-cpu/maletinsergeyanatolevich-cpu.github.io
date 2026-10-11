'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const b=fs.readFileSync('staging/q046/backend-q046.js','utf8');
const a=fs.readFileSync('assets/app.js','utf8');
function section(s,start,end){const i=s.indexOf(start),j=s.indexOf(end,i+start.length);assert(i>=0&&j>i,'missing actual source '+start);return s.slice(i,j);}
const realBackend=section(b,'function q029CashSourceProvenance_(', 'function q046BuildCanonicalWallet_(');
const realClient=section(a,'function q029FinanceHistoryRowHtml(', 'function q046AllocationRow(');
const headers=['ID операции','cash_epoch_id','Тип','Источник денег / оплаты','cash_destination','is_deleted','Фактическая операция','Сумма'];
const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
const fake=(id,epoch='',type='Расход',src='PERSON',dest='NONE',deleted=false,actual=true,amount=3)=>
 [id,epoch,type,src,dest,deleted,actual,amount];
const rows=Array.from({length:106},(_,i)=>fake('SYNTHETIC-'+String(i).padStart(3,'0'),'','Расход',i%3?'PERSON':'PRODUCTION_WALLET'));
rows[5][idx['is_deleted']]=true;
const t={headers,index:idx,rows};
const fixture={source:'GOOGLE_SHEETS_FINANCE',row_count:106,items:rows.map((r,i)=>({
 finance_id:r[0],finance_date:i<7?'05.10.2026':'04.10.2026',
 type:r[2],amount:r[7],category:'Тестовые операции',comment:'',is_deleted:r[5],actual:r[6]})),
 head_row_count:116,head_matches_source:false};
const c={console,Math,Date,JSON,Number,String,Array,Object,Set,Map,
 q046IsDeleted_:v=>v===true,yes_:v=>v===true,
 valueBy_:(tb,row,key)=>row[tb.index[key]],
 rub:n=>String(n)+' ₽',esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
vm.createContext(c);vm.runInContext(realBackend+'\n'+realClient,c,{filename:'actual-stage-provenance-source'});
const provenance=(recon,table,epoch)=>{c.__args={recon,table,epoch};return vm.runInContext('q029CashSourceProvenance_(__args.recon,__args.table,__args.epoch)',c)};
const html=(ledger,proof)=>{c.__wallet={finance_ledger:ledger,cash_provenance:proof};return vm.runInContext('q029FinanceHistoryHtml(__wallet)',c)};
let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name);}
const recon={reconciliation_id:'SYNTHETIC-Q044',applied_at:'2026-10-08T13:20:00.000Z',production_cash_target:11108};
test('106 existing untagged Sheet rows belong to history, not 106 new cash movements',()=>{
 const p=provenance(recon,t,recon.reconciliation_id);
 assert.equal(p.source_finance_count,106);assert.equal(p.historical_without_epoch_count,106);
 assert.equal(p.epoch_linked_count,0);assert.equal(p.cash_movement_count,0);
});
test('Provenance reports audited reconciliation date and epoch ID without relabelling cutoff date',()=>{
 const p=provenance(recon,t,recon.reconciliation_id);
 assert.equal(p.applied_date,'2026-10-08');assert.equal(p.reconciliation_id,'SYNTHETIC-Q044');
 assert.equal(p.source,'APPLIED_RECONCILIATION');
});
test('UI explicitly explains why historical Finance rows do not double-count physical cash',()=>{
 const p=provenance(recon,t,recon.reconciliation_id),s=html(fixture,p);
 assert(s.includes('Исторических операций вне кассовой эпохи: 106'));
 assert(s.includes('Операций с кассовым движением после сверки: 0'));
 assert(s.includes('2026-10-08'));
 assert(s.includes('не прибавляются к кассе повторно'));
});
test('Head 116 vs source 106 mismatch warning remains present next to provenance',()=>{
 const s=html(fixture,provenance(recon,t,recon.reconciliation_id));
 assert(s.includes('Счётчик синхронизации: 116'));
 assert(s.includes('фактически в таблице: 106'));
});
test('Actual new epoch Wallet income counts one eligible movement',()=>{
 const x={headers,index:idx,rows:rows.concat([fake('NEW-INCOME','SYNTHETIC-Q044','Приход','NONE','PRODUCTION_WALLET')])};
 const p=provenance(recon,x,recon.reconciliation_id);
 assert.equal(p.source_finance_count,107);assert.equal(p.historical_without_epoch_count,106);
 assert.equal(p.epoch_linked_count,1);assert.equal(p.cash_movement_count,1);
});
test('Actual new epoch Wallet expense counts another eligible movement',()=>{
 const x={headers,index:idx,rows:rows.concat([
 fake('NEW-INCOME','SYNTHETIC-Q044','Приход','NONE','PRODUCTION_WALLET'),
 fake('NEW-EXPENSE','SYNTHETIC-Q044','Расход','PRODUCTION_WALLET','NONE')])};
 const p=provenance(recon,x,recon.reconciliation_id);
 assert.equal(p.cash_movement_count,2);assert.equal(p.historical_without_epoch_count,106);
});
test('Personal-funded or archived actual epoch rows do not count as cash',()=>{
 const x={headers,index:idx,rows:rows.concat([
 fake('PERSON','SYNTHETIC-Q044','Расход','PERSON','NONE'),
 fake('ARCHIVED','SYNTHETIC-Q044','Расход','PRODUCTION_WALLET','NONE',true),
 fake('PLANNED','SYNTHETIC-Q044','Приход','NONE','PRODUCTION_WALLET',false,false)])};
 const p=provenance(recon,x,recon.reconciliation_id);assert.equal(p.epoch_linked_count,3);assert.equal(p.cash_movement_count,0);
});
test('Only real nonempty IDs are counted, not empty table padding',()=>{
 const x={headers,index:idx,rows:[...rows,fake(''),'']};
 // The second item is not a valid table row, so model realistic blank cells.
 x.rows[x.rows.length-1]=Array(headers.length).fill('');
 const p=provenance(recon,x,recon.reconciliation_id);assert.equal(p.source_finance_count,106);
});
test('Backend actual cash and free-money formulas remain exact unchanged semantics',()=>{
 assert(b.includes('const physical=Math.round((opening+delta)*100)/100'));
 assert(b.includes('free=Math.round((physical-reserved)*100)/100'));
 assert(b.includes('cash_provenance:q029CashSourceProvenance_(recon,ft,epochId)'));
 assert(b.includes('finance_ledger:q029SheetFinanceHistory_()'));
});
test('Provenance is strictly read-only, and UI escapes derived labels',()=>{
 assert(!/\b(?:setValue|setValues|appendRow|deleteRow|w1CommitHead_)\s*\(/.test(realBackend));
 assert(!/\b(?:backendPost|q046Action)\s*\(/.test(realClient));
 const p=provenance({...recon,applied_at:'<script>bad</script>'},t,recon.reconciliation_id);
 const s=html(fixture,p);assert(!s.includes('<script>bad</script>'));assert(s.includes('&lt;script&gt;'));
});
const v=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.equal(v.dbSchema,5);assert.equal(v.rolloutStage,'staging-only');
console.log(JSON.stringify({kind:'Q029_CANONICAL_CASH_SOURCE_PROVENANCE',passed:n,ok:true,scope:'actual staged read-only source on synthetic rows; not deployed or live-auth E2E'}));
