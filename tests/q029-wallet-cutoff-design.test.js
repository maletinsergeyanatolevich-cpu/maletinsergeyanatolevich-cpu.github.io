'use strict';
// Q029 B CUTOFF DESIGN REFERENCE FIXTURE ONLY.
// No real IDs or amounts. Not integrated into backend and cannot mutate Sheets.
const assert=require('assert'),crypto=require('crypto');
const KEEP_THROUGH='2026-10-05',TZONE='Asia/Tomsk';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function businessDate(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('INVALID_BUSINESS_DATE');
  const date=new Date(s+'T12:00:00.000Z');
  if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==s)throw Error('INVALID_BUSINESS_DATE');
  return s;
}
function inventory(records,heads){
 const ids=new Set();
 for(const r of records){
   if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('UNIQUE_IDS_REQUIRED');
   ids.add(r.id); businessDate(r.business_date);
 }
 return hash({records:records.map(x=>({...x})).sort((a,b)=>a.id.localeCompare(b.id)),heads});
}
function prepare(rows,heads){
 const sourceDigest=inventory(rows,heads);
 const excluded=rows.filter(r=>r.business_date>KEEP_THROUGH).map(r=>r.id).sort();
 return Object.freeze({status:'PREVIEW_ONLY',timezone:TZONE,keepThrough:KEEP_THROUGH,
    excludedIds:Object.freeze(excluded),sourceDigest,headDigest:hash(heads),
    nextEpochId:null,openingCash:null,backupDigest:null,approved:false});
}
function assertFresh(preview,rows,heads){
 if(preview.status!=='PREVIEW_ONLY'||inventory(rows,heads)!==preview.sourceDigest||hash(heads)!==preview.headDigest)
   throw Error('SOURCE_DRIFT_STOP');
 return true;
}
function assignView(row,preview,activatedEpoch){
 // New epoch takes precedence: a NEW business event with an old business_date stays visible.
 if(activatedEpoch&&row.epoch_id===activatedEpoch)return 'NEW_WORKING';
 if(preview.excludedIds.includes(row.id))return 'ISOLATED_HISTORY';
 return 'RETAINED_HISTORY';
}
function canActivate(decision){
 return !!(decision&&decision.sysAccepted===true&&decision.sergeyApproved===true&&
  decision.backupRestored===true&&decision.openingVerified===true&&
  decision.authEvidence===true&&decision.role==='ADMIN1'&&
  /^[a-f0-9]{64}$/.test(String(decision.backupSha256||''))&&
  typeof decision.activationEventId==='string'&&decision.activationEventId.length>8);
}
const old=[
 {id:'HISTORY-EARLIER',business_date:'2026-10-04',type:'Расход',amount:34},
 {id:'PROTECTED-PREPAY',business_date:'2026-10-05',type:'Приход',amount:20,order_id:'FAKE-ORDER'},
 {id:'SOURCE-PERSONAL',business_date:'2026-10-06',type:'Расход',amount:11,source:'PERSON'},
 {id:'SOURCE-MIRROR',business_date:'2026-10-06',type:'Приход',amount:11,source:'MIRROR'},
 {id:'TEST-OLD',business_date:'2026-10-06',type:'Расход',amount:2,order_id:'FAKE-ORDER-2'}
];
const heads={finance:{rev:7,row_count:5},reconciliation:{rev:2,row_count:1}};
let passed=0;
function ok(name,fn){fn();passed++;console.log('PASS design-only: '+name);}
ok('05 Oct inclusive, 04 Oct retained',()=>{
 const p=prepare(old,heads);
 assert.deepStrictEqual(p.excludedIds,['SOURCE-MIRROR','SOURCE-PERSONAL','TEST-OLD']);
 assert.equal(assignView(old[1],p),'RETAINED_HISTORY');
 assert.equal(assignView(old[0],p),'RETAINED_HISTORY');
});
ok('old 06 Oct excluded only by frozen IDs, but underlying record unchanged',()=>{
 const before=JSON.stringify(old),p=prepare(old,heads);
 for(const x of old.slice(2))assert.equal(assignView(x,p),'ISOLATED_HISTORY');
 assert.equal(JSON.stringify(old),before);
});
ok('new activity entered after activation shows even if business-dated Oct 06',()=>{
 const p=prepare(old,heads),newRow={id:'NEW-ACTIVITY',business_date:'2026-10-06',epoch_id:'NEW-EPOCH',amount:77};
 assert.equal(assignView(newRow,p,'NEW-EPOCH'),'NEW_WORKING');
 assert.equal(assignView(newRow,p),'RETAINED_HISTORY');
});
ok('retained historical advance remains linked once with no duplicate income',()=>{
 const p=prepare(old,heads);assert.equal(old.filter(x=>x.id==='PROTECTED-PREPAY').length,1);
 assert.equal(assignView(old[1],p),'RETAINED_HISTORY');
 assert.equal(old[1].order_id,'FAKE-ORDER');
});
ok('money totals not inferred from raw mirrored operations',()=>{
 const p=prepare(old,heads);assert.equal(p.openingCash,null);
 assert.equal(p.nextEpochId,null);assert.equal(p.approved,false);
 assert.equal(p.backupDigest,null);
});
ok('source row content drift stops activation',()=>{
 const p=prepare(old,heads);
 assert.throws(()=>assertFresh(p,old.map(x=>x.id==='SOURCE-MIRROR'?{...x,amount:99}:x),heads),/SOURCE_DRIFT_STOP/);
});
ok('source revision drift stops activation',()=>{
 const p=prepare(old,heads);
 assert.throws(()=>assertFresh(p,old,{...heads,finance:{rev:8,row_count:5}}),/SOURCE_DRIFT_STOP/);
});
ok('ambiguous date and duplicate IDs fail closed',()=>{
 assert.throws(()=>prepare([{id:'X',business_date:'2026-02-30'}],heads),/INVALID_BUSINESS_DATE/);
 assert.throws(()=>prepare([{id:'X',business_date:'2026-10-05'},{id:'X',business_date:'2026-10-06'}],heads),/UNIQUE_IDS_REQUIRED/);
 assert.throws(()=>prepare([{id:'X',business_date:'05.10.2026'}],heads),/INVALID_BUSINESS_DATE/);
});
ok('permissions, backup restore, independent QA and opening all mandatory',()=>{
 const good={sysAccepted:true,sergeyApproved:true,backupRestored:true,openingVerified:true,
   authEvidence:true,role:'ADMIN1',backupSha256:'a'.repeat(64),activationEventId:'SYNTHETIC-EVENT-ID'};
 assert.equal(canActivate(good),true);
 for(const k of ['sysAccepted','sergeyApproved','backupRestored','openingVerified','authEvidence'])
   assert.equal(canActivate({...good,[k]:false}),false,k);
 assert.equal(canActivate({...good,role:'USER'}),false);
 assert.equal(canActivate({...good,backupSha256:''}),false);
 assert.equal(canActivate({...good,activationEventId:''}),false);
});
ok('source inventory is immutable even if input ordering differs',()=>{
 const p=prepare(old,heads);assert.equal(assertFresh(p,old.slice().reverse(),heads),true);
 assert.notEqual(p.sourceDigest,'');assert.equal(p.excludedIds.length,3);
});
const version=JSON.parse(require('fs').readFileSync('version.json','utf8'));
assert.equal(version.rolloutStage,'staging-only');
assert.equal(version.dbSchema,5);
console.log(JSON.stringify({kind:'Q029_CUTOFF_OPTION_B_DESIGN_ONLY',ok:true,passed,total:10,scope:'synthetic pure reference; not wired to production or staging backend'}));
