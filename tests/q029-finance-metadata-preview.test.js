'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const code=fs.readFileSync('staging/q046/backend-q046.js','utf8');
const from=code.indexOf('function q029FinanceSourceParity_('),until=code.indexOf('function w1TouchDomainRow_(',from+1);
assert(from>=0&&until>from,'actual staging domain handler anchors');
const actual=code.slice(from,until);
const hash=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
function fixture(options={}){
 let ids=options.ids||Array.from({length:106},(_,i)=>'TEST-'+String(i).padStart(3,'0'));
 let rows=ids.map((id,i)=>[id,i%2?7:0]),count=options.count??rows.length;
 let head={domain:'finance',current_rev:7,row_count:116},reads=0,writes=0,auth=true;
 const table={headers:['ID операции','_SYNC_REV'],index:{'ID операции':0,'_SYNC_REV':1},rows};
 const ctx={console,Date,Math,Number,String,Array,Object,Set,Map,JSON,Error,
 W1_DOMAIN_SCHEMA:{finance:{sheet:'Финансы',sync:true},parties:{sheet:'Контрагенты',sync:true}},
 w1AuthDomain_:(body,domain)=>{if(!auth)throw Error('PERMISSION_DENIED');return{auth:{},cfg:{sheet:domain==='finance'?'Финансы':'Контрагенты',sync:true}};},
 w1HeadObject_:domain=>({...head,domain}),
 w1PhysicalRowCount_:()=>{reads++;return count;},
 q046SafeTable_:sheet=>{assert.equal(sheet,'Финансы');reads++;return table;},
 q029FinanceSourceStamp_:()=>({row_count:count,source_ids_hash:hash(JSON.stringify(rows.map(r=>r[0]).sort())),source_rows_hash:'b'.repeat(64),source_generation:'FINANCE_ROWS_SHA256_V1'}),
 sha256Hex_:hash,valueBy_:(t,r,key)=>r[t.index[key]],
 tableByHeader_:(_,sheet)=>table,tableRowObject_:(t,r)=>({id:r[0],_SYNC_REV:r[1]}),
 touchSessionAndDevice_:()=>{},nowIso_:()=> '2026-10-11T07:00:00.000Z',
 CFG:{SPREADSHEET_ID:'FAKE'}
 };
 vm.createContext(ctx);vm.runInContext(actual,ctx,{filename:'actual-staging-q029-metadata-preview'});
 const call=(action,body)=>{ctx._body=body;return vm.runInContext(action+'(_body,"RID")',ctx)};
 return {call,ids,rows,table,head,setCount:n=>{count=n},setAuth:a=>{auth=a},setHead:x=>{head={...head,...x}},reads:()=>reads,writes:()=>writes};
}
let passed=0;const t=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
t('metadata preview is only on authorized Finance HEAD mismatch',()=>{
 const x=fixture(),r=x.call('handleDomainHead_',{domain:'finance'}),p=r.metadata_preview;
 assert.equal(r.reset_required,true);assert.equal(p.kind,'FINANCE_METADATA_PREVIEW');
 assert.equal(p.mode,'READ_ONLY');assert.equal(p.applied,false);
 assert.equal(p.expected_rev,7);assert.equal(p.stored_count,116);
 assert.equal(p.observed_count,106);assert.equal(p.unique_count,106);
 assert.equal(p.duplicate_count,0);assert.equal(p.reviewable,true);
});
t('preview hashes sorted source IDs without leaking raw IDs',()=>{
 const x=fixture(),r=x.call('handleDomainHead_',{domain:'finance'}),p=r.metadata_preview;
 assert.equal(p.source_ids_hash,hash(JSON.stringify(x.ids.slice().sort())));
 assert(!JSON.stringify(p).includes('TEST-000'));
});
t('Finance DELTA also returns preview and reset_required, without invented tombstones',()=>{
 const x=fixture(),r=x.call('handleDomainDelta_',{domain:'finance',since_rev:7});
 assert.equal(r.reset_required,true);assert.equal(r.metadata_preview.observed_count,106);
 assert.equal(r.items.length,0);assert.equal(r.total_count,0);
});
t('same IDs and same HEAD produce deterministic read-only previews',()=>{
 const x=fixture();const a=x.call('handleDomainHead_',{domain:'finance'}),b=x.call('handleDomainHead_',{domain:'finance'});
 assert.deepEqual(JSON.parse(JSON.stringify(a.metadata_preview)),JSON.parse(JSON.stringify(b.metadata_preview)));
 assert.equal(x.writes(),0);
});
t('shuffling source row positions does not change fingerprint',()=>{
 const x=fixture(),a=x.call('handleDomainHead_',{domain:'finance'}).metadata_preview.source_ids_hash;
 x.rows.reverse();const b=x.call('handleDomainHead_',{domain:'finance'}).metadata_preview.source_ids_hash;
 assert.equal(a,b);
});
t('even one changed ID yields different fingerprint',()=>{
 const x=fixture(),a=x.call('handleDomainHead_',{domain:'finance'}).metadata_preview.source_ids_hash;
 x.rows[8][0]='NEW-ID';const b=x.call('handleDomainHead_',{domain:'finance'}).metadata_preview.source_ids_hash;
 assert.notEqual(a,b);
});
t('duplicate ID prevents independent review',()=>{
 const x=fixture();x.rows[8][0]=x.rows[0][0];
 const p=x.call('handleDomainHead_',{domain:'finance'}).metadata_preview;
 assert.equal(p.unique_count,105);assert.equal(p.duplicate_count,1);assert.equal(p.reviewable,false);
});
t('physical count changing between reads prevents approval',()=>{
 const x=fixture();x.setCount(105);
 const r=x.call('handleDomainHead_',{domain:'finance'});
 assert.equal(r.metadata_preview.source_read_matches,false);
 assert.equal(r.metadata_preview.reviewable,false);
});
t('head already equals actual count has no repair proposal or reset',()=>{
 const x=fixture();x.setHead({row_count:106});
 const r=x.call('handleDomainHead_',{domain:'finance'});
 assert.equal(r.reset_required,true);assert.equal(r.reason,'FINANCE_SOURCE_GENERATION_CHANGED');assert.equal(r.metadata_preview,null);
});
t('non-Finance domains are not inspected or mutated',()=>{
 const x=fixture(),r=x.call('handleDomainHead_',{domain:'parties'});
 assert.equal(r.metadata_preview,undefined);assert.equal(x.reads(),0);assert.equal(x.writes(),0);
});
t('unauthorized sessions cannot get diagnostic ID fingerprints',()=>{
 const x=fixture();x.setAuth(false);
 assert.throws(()=>x.call('handleDomainHead_',{domain:'finance'}),/PERMISSION_DENIED/);
 assert.throws(()=>x.call('handleDomainDelta_',{domain:'finance',since_rev:7}),/PERMISSION_DENIED/);
 assert.equal(x.reads(),0);
});
t('source preview cannot write and does not alter Q044 cash math',()=>{
 assert(!/\b(?:setValue|setValues|appendRow|deleteRow|deleteRows|w1CommitHead_|w1TouchDomainRow_)\s*\(/.test(actual));
 assert(code.includes('const physical=Math.round((opening+delta)*100)/100'));
 assert(code.includes('free=Math.round((physical-reserved)*100)/100'));
 const ver=JSON.parse(fs.readFileSync('version.json','utf8'));
 assert.equal(ver.rolloutStage,'staging-only');assert.equal(ver.dbSchema,5);
});
console.log(JSON.stringify({kind:'Q029_FINANCE_METADATA_PREVIEW_REAL_STAGING_SOURCE',passed,ok:true,scope:'only synthetic source VM; no prod auth or source writes'}));
