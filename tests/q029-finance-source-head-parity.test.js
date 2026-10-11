'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const backend=fs.readFileSync('staging/q046/backend-q046.js','utf8');
const client=fs.readFileSync('assets/app.js','utf8');
function sourceSection(start,end){const i=backend.indexOf(start),j=backend.indexOf(end,i+start.length);assert(i>=0&&j>i,'missing actual handler anchor '+start);return backend.slice(i,j)}
const realHandlers=sourceSection('function q029FinanceSourceParity_(', 'function w1TouchDomainRow_(');
function sandbox(){
 let count=106,head={domain:'finance',row_count:116,current_rev:7,checksum:'',last_event_id:'Q044'},
   denied=false,touched=0,physicalReads=0,rows=[['ROW-1',7],['ROW-2',8]];
 const table={headers:['ID операции','_SYNC_REV'],index:{'ID операции':0,_SYNC_REV:1},rows};
 const env={console,Math,Number,String,Array,Object,Date,JSON,Error,
 W1_DOMAIN_SCHEMA:{finance:{sheet:'Финансы',sync:true},parties:{sheet:'Контрагенты',sync:true}},
 w1AuthDomain_:(body,domain,requestId)=>{if(denied)throw Error('PERMISSION_DENIED:wallet.view');return {auth:{user:{userId:'SYNTHETIC'}},domain,cfg:domain==='finance'?{sheet:'Финансы',sync:true}:{sheet:'Контрагенты',sync:true}};},
 w1HeadObject_:domain=>({...head,domain}),
 w1PhysicalRowCount_:cfg=>{assert.equal(cfg.sheet,'Финансы');physicalReads++;return count;},
 touchSessionAndDevice_:()=>{touched++},nowIso_:()=> '2026-10-11T02:00:00.000Z',
 tableByHeader_:(id,sheet)=>{assert(sheet==='Финансы'||sheet==='Контрагенты');return table;},
 q046SafeTable_:sheet=>sheet==='Финансы'?table:null,
 sha256Hex_:input=>require('crypto').createHash('sha256').update(String(input)).digest('hex'),
 CFG:{SPREADSHEET_ID:'TEST_SPREADSHEET'},
 valueBy_:(t,r,k)=>r[t.index[k]],tableRowObject_:(t,r)=>({finance_id:r[0],_SYNC_REV:r[1]})
 };
 vm.createContext(env);vm.runInContext(realHandlers,env,{filename:'actual source domain head and delta'});
 const call=(name,body)=>{env._body=body;return vm.runInContext(name+'(_body,"RID")',env)};
 return {env,call,head:(h)=>{head={...head,...h}},count:n=>{count=n},deny:v=>{denied=v},touched:()=>touched,reads:()=>physicalReads,rows};
}
let passed=0;const check=(title,fn)=>{fn();passed++;console.log('PASS '+title)};
check('Finance domain HEAD shows both 106 physical and 116 stale rows without overwrite',()=>{
 const x=sandbox(),r=x.call('handleDomainHead_',{domain:'finance'});
 assert.equal(r.ok,true);assert.equal(r.row_count,116);assert.equal(r.source_row_count,106);
 assert.equal(r.head_row_count,116);assert.equal(r.head_matches_source,false);
 assert.equal(r.reset_required,true);assert.equal(r.reason,'FINANCE_SOURCE_HEAD_DRIFT');
 assert.equal(x.touched(),1);
});
check('Finance delta from stale rev7 cannot falsely claim no changes',()=>{
 const x=sandbox(),r=x.call('handleDomainDelta_',{domain:'finance',since_rev:7});
 assert.equal(r.reset_required,true);assert.equal(r.source_row_count,106);
 assert.equal(r.current_rev,7);assert.equal(r.reason,'FINANCE_SOURCE_HEAD_DRIFT');
 assert.equal(r.items.length,0);assert.equal(r.has_more,false);
});
check('Finance delta bootstrap since0 also requires reset when physical IDs disappeared',()=>{
 const x=sandbox(),r=x.call('handleDomainDelta_',{domain:'finance',since_rev:0});
 assert.equal(r.reset_required,true);assert.equal(r.head_matches_source,false);
});
check('Reconciliation does not return fabricated deletion tombstones',()=>{
 const x=sandbox(),r=x.call('handleDomainDelta_',{domain:'finance',since_rev:5});
 assert.equal(r.items.length,0);assert.equal(r.total_count,0);
 assert.equal(x.rows.length,2);
});
check('Unrelated domain sync is not blocked by Finance-only source mismatch',()=>{
 const x=sandbox(),r=x.call('handleDomainDelta_',{domain:'parties',since_rev:7});
 assert.equal(r.reset_required,undefined);assert.equal(r.to_rev,7);
 assert.equal(r.items[0].finance_id,'ROW-2');assert.equal(x.reads(),0);
});
check('Other domain HEAD remains compatible, no Finance counters exposed',()=>{
 const x=sandbox(),r=x.call('handleDomainHead_',{domain:'parties'});
 assert.equal(r.reset_required,undefined);assert.equal(r.source_row_count,undefined);
 assert.equal(x.reads(),0);
});
check('Matching authoritative source and HEAD allows ordinary delta',()=>{
 const x=sandbox();x.head({row_count:106});const h=x.call('handleDomainHead_',{domain:'finance'});
 assert.equal(h.source_row_count,106);assert.equal(h.head_matches_source,true);assert.equal(h.reset_required,undefined);
 const d=x.call('handleDomainDelta_',{domain:'finance',since_rev:7});
 assert.equal(d.reset_required,undefined);assert.equal(d.total_count,1);
 assert.equal(d.items[0].finance_id,'ROW-2');
});
check('Normal new authorized operation increments physical/HEAD counts without phantom restoration',()=>{
 const x=sandbox();x.count(107);x.head({row_count:107,current_rev:8});
 const d=x.call('handleDomainDelta_',{domain:'finance',since_rev:7});
 assert.equal(d.reset_required,undefined);assert.equal(d.to_rev,8);
 assert.equal(d.items.length,1);
});
check('Auth is checked before Finance row-count read',()=>{
 const x=sandbox();x.deny(true);
 assert.throws(()=>x.call('handleDomainHead_',{domain:'finance'}),/PERMISSION_DENIED/);
 assert.throws(()=>x.call('handleDomainDelta_',{domain:'finance'}),/PERMISSION_DENIED/);
 assert.equal(x.reads(),0);assert.equal(x.touched(),0);
});
check('Handlers are read-only for financial and HEAD tables',()=>{
 assert(!/\b(?:setValue|setValues|appendRow|deleteRow|deleteRows|w1CommitHead_)\s*\(/.test(realHandlers));
 assert(!/\b(?:reconciliation.apply|w1AppendFinance_)\b/.test(realHandlers));
});
check('Current source-of-truth Wallet list displays real rows, not HEAD count',()=>{
 assert(backend.includes("source:'GOOGLE_SHEETS_FINANCE'"));
 assert(backend.includes("head_matches_source:headCount===null?null:headCount===items.length"));
 assert(client.includes("Все записи Google Sheets"));
});
check('Q044 accounting and allowed user wallet permissions are not changed',()=>{
 assert(backend.includes("const physical=Math.round((opening+delta)*100)/100"));
 assert(backend.includes("free=Math.round((physical-reserved)*100)/100"));
 assert(backend.includes("authSession_(body.session_token,'wallet.view',requestId),model=q046BuildCanonicalWallet_(body)"));
});
const v=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.equal(v.rolloutStage,'staging-only');assert.equal(v.dbSchema,5);
console.log(JSON.stringify({kind:'Q029_FINANCE_SOURCE_HEAD_PARITY_REAL_HANDLERS',passed,ok:true,scope:'synthetic read-only VM of actual staging backend; not production, not a metadata correction'}));
