'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
const client=fs.readFileSync('assets/app.js','utf8');
function extract(s,a,b){let i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,'source anchor '+a);return s.slice(i,j)}
const realRead=extract(backend,'function q029SheetFinanceHistory_(){','function q046BuildCanonicalWallet_(');
const realUi=extract(client,'function q029FinanceHistoryRowHtml(x){','function q046AllocationRow(a){');
const financeHeaders=['ID операции','Дата','Тип','Сумма','Категория','Описание','№ заказа','Источник денег / оплаты','cash_destination','Фактическая операция','is_deleted'];
const headHeaders=['domain','schema_version','current_rev','updated_at','row_count'];
const data=[];
for(let i=0;i<99;i++)data.push(['FAKE-PREV-'+i,'04.10.2026',i%2?'Расход':'Приход',i+1,'Ранние операции','','','','','Да',i<13]);
for(let i=0;i<7;i++)data.push(['FAKE-OCT05-'+i,'05.10.2026',i===2?'Приход':'Расход',i===2?14:5,'Категория','<не доверять HTML>','TEST-ORDER','','','Да',false]);
const heads=[['finance','1.0',7,'',116]];
const writes=[];
function table(headers,rows){return {rows,headers,index:Object.fromEntries(headers.map((x,i)=>[x,i]))};}
const t=table(financeHeaders,data),h=table(headHeaders,heads);
const ctx={console,Date,Math,Number,String,Array,Object,JSON,Promise,
 q046SafeTable_:name=>name==='Финансы'?t:name==='_DOMAIN_HEADS'?h:null,
 valueBy_:(tab,row,key)=>row[tab.index[key]],
 formatDateMaybe_:x=>String(x||''),q046Money_:x=>Number(x)||0,
 q046IsDeleted_:x=>x===true||x==='TRUE',yes_:x=>x==='Да'||x===true,
 rub:x=>Number(x).toFixed(2)+' ₽',
 esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
vm.createContext(ctx);vm.runInContext(realRead+'\n'+realUi,ctx,{filename:'real-frontend-and-backend-functions'});
const read=()=>vm.runInContext('q029SheetFinanceHistory_()',ctx);
const html=(w)=>{ctx.__w=w;return vm.runInContext('q029FinanceHistoryHtml(__w)',ctx)};
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS '+name)};
test('reads 106 physical Finance rows instead of HEAD declared 116',()=>{const x=read();assert.equal(x.row_count,106);assert.equal(x.head_row_count,116);assert.equal(x.head_matches_source,false);assert.equal(x.source,'GOOGLE_SHEETS_FINANCE');});
test('retains all seven 5 Oct rows without creating or restoring 6 Oct rows',()=>{const x=read();assert.equal(x.items.filter(r=>r.finance_date==='05.10.2026').length,7);assert(!x.items.some(r=>r.finance_date==='06.10.2026'));assert.equal(writes.length,0);});
test('read-only history includes earlier soft-deleted rows, marked as archived',()=>{const x=read();assert.equal(x.items.filter(r=>r.is_deleted).length,13);assert.equal(x.items.length,106);});
test('UI makes Oct 5 operations visible immediately and full history accessible',()=>{const page=html({finance_ledger:read()});assert(page.includes('<details open>'));assert(page.includes('Операции за 05.10.2026 · 7'));assert(page.includes('Все записи Google Sheets · 106'));});
test('UI warns about HEAD mismatch without substituting HEAD count',()=>{const page=html({finance_ledger:read()});assert(page.includes('Счётчик синхронизации: 116'));assert(page.includes('фактически в таблице: 106'));});
test('HTML of untrusted category and comment is escaped',()=>{const page=html({finance_ledger:read()});assert(page.includes('&lt;не доверять HTML&gt;'));assert(!page.includes('<не доверять HTML>'));});
test('new authoritative Finance record immediately appears after server re-read',()=>{
 const last=data.length;data.push(['FAKE-NEW-AFTER-SAVE','11.10.2026','Приход',80,'Новый доход','Новая запись','','','PRODUCTION_WALLET','Да',false]);
 const x=read(),page=html({finance_ledger:x});assert.equal(data.length,last+1);assert.equal(x.row_count,107);
 assert.equal(x.items[0].finance_id,'FAKE-NEW-AFTER-SAVE');assert(page.includes('Новый доход'));assert(page.includes('Все записи Google Sheets · 107'));
});
test('Finance/Wallet money rules stay reconciliation-epoch based and unchanged',()=>{
 assert(backend.includes("function q046FinanceCashDelta_(t,r,epochId)"));
 assert(backend.includes("String(valueBy_(t,r,'cash_epoch_id')||'')!==epochId"));
 assert(backend.includes("opening+delta"));
 assert(backend.includes("physical-reserved"));
 assert(backend.includes("finance_ledger:q029SheetFinanceHistory_()"));
});
test('UI history cannot create, delete, or update source records',()=>{assert(!/\b(?:appendRow|setValue|setValues|deleteRow|deleteRows)\s*\(/.test(realRead));assert(!/\b(?:backendPost|q046Action)\s*\(/.test(realUi));assert.deepEqual(writes,[])});
test('sensitive ledger only attached to authenticated wallet.view canonical handler',()=>{
 assert(backend.includes("authSession_(body.session_token,'wallet.view',requestId),model=q046BuildCanonicalWallet_(body)"));
 assert(client.includes("if(!q029WalletUiAllowed())return q046WalletNoAccess()"));
});
const version=JSON.parse(fs.readFileSync('version.json','utf8'));assert.equal(version.rolloutStage,'staging-only');assert.equal(version.dbSchema,5);
console.log(JSON.stringify({kind:'Q029_FINANCE_SHEET_SOURCE_OF_TRUTH_REAL_SOURCE',ok:true,passed:n,scope:'actual frontend/backend source in synthetic VM only; no production authenticated reads or business writes'}));
