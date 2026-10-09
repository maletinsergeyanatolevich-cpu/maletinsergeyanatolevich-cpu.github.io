'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const app=fs.readFileSync('assets/app.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const release=JSON.parse(fs.readFileSync('version.json','utf8'));
const results=[];
function test(label,fn){results.push({label,fn});}
const declaration=app.match(/const APP_RELEASE=Object\.freeze\((\{[^\r\n]+\})\)/);
assert.ok(declaration,'APP_RELEASE declaration missing');
const embedded=vm.runInNewContext('('+declaration[1]+')');
const swBuild=sw.match(/const BUILD='([^']+)'/);
assert.ok(swBuild,'SW BUILD missing');

test('staging manifest, embedded version, and SW build agree',()=>{
  assert.strictEqual(release.buildId,embedded.buildId);
  assert.strictEqual(release.version,embedded.version);
  assert.strictEqual(release.channel,embedded.channel);
  assert.strictEqual(release.dbSchema,embedded.dbSchema);
  assert.strictEqual(release.rolloutStage,embedded.rolloutStage);
  assert.strictEqual(swBuild[1],release.buildId);
  assert.strictEqual(embedded.updateStrategy,'manifest-service-worker');
});
test('safe offline IndexedDB migration and rollback contract',()=>{
  assert.strictEqual(release.dbSchema,5);
  assert.strictEqual(embedded.dbSchema,5);
  assert.strictEqual(release.rollback.dbSchema,5);
  assert.strictEqual(release.rollback.buildId,'2026-10-07.3d');
  assert.strictEqual(release.previousBuildId,'2026-10-07.3d');
  assert.strictEqual(release.rollback.safeWithoutDataReset,true);
  assert.ok(app.includes("const DB_SCHEMA=APP_RELEASE.dbSchema;"));
  assert.ok(app.includes("const DB_NAME='production-v011';"));
  assert.strictEqual(release.publishedAt,null);
});
test('declared staging source requires accepted backend version',()=>{
  assert.strictEqual(release.minBackend,'backend-0.2.31-staging-q049');
  assert.strictEqual(release.rolloutStage,'staging-only');
  assert.deepStrictEqual(release.eligibleRoles,['ADMIN1']);
});
const allowSource=app.match(/function updateEligible\(v=\{\}\)\{[^\r\n]+\}/);
assert.ok(allowSource,'updateEligible not found');
function eligible(manifest,role){
  const scope={isAdmin1:()=>role==='ADMIN1'};
  vm.runInNewContext(allowSource[0]+';globalThis.check=updateEligible;',scope);
  return scope.check(manifest);
}
test('staging-only, paused, malformed, empty and unknown release stages fail closed',()=>{
  for(const role of ['ADMIN1','WORKER']){
    for(const stage of ['staging-only','paused','preview','all','STAGING-ONLY']){
      assert.strictEqual(eligible({buildId:release.buildId,rolloutStage:stage},role),false,stage+'/'+role);
    }
    assert.strictEqual(eligible({},role),false);
    assert.strictEqual(eligible({buildId:'B'},role),false);
    assert.strictEqual(eligible({buildId:'B',rolloutStage:'admin1'},role),false);
  }
});
test('a later explicit admin1 gate can allow only ADMIN1',()=>{
  const x={buildId:'B',rolloutStage:'admin1',eligibleRoles:['ADMIN1']};
  assert.strictEqual(eligible(x,'ADMIN1'),true);
  assert.strictEqual(eligible(x,'WORKER'),false);
  assert.strictEqual(eligible({...x,eligibleRoles:['WORKER']},'ADMIN1'),false);
  assert.strictEqual(eligible({...x,rolloutStage:'stable'},'WORKER'),true);
});
test('user activation also requires manifest and role eligibility',()=>{
  assert.ok(app.includes('if(!manifest.buildId||!updateEligible(manifest))'));
});
class FakeResponse{
  constructor(body,init={}){
    this.body=Buffer.from(body instanceof Uint8Array?body:Buffer.isBuffer(body)?body:String(body||''));
    this.status=init.status||200;
    this.statusText=init.statusText||'OK';
    this.headers=init.headers||{};
    this.ok=true;
  }
  async arrayBuffer(){return this.body;}
  async json(){return JSON.parse(this.body.toString('utf8'));}
}
class FakeRequest{constructor(url){this.url=url;}}
async function install(stage,role,manifestBuild){
  const events={},entries=new Map();let waiting=0;
  const cache={
    async put(name,response){entries.set(name,response);},
    async match(name){return entries.get(name)||null;}
  };
  const snap=release;
  const manifest={...snap,rolloutStage:stage,eligibleRoles:['ADMIN1'],buildId:manifestBuild||snap.buildId};
  const ctx={
    console,Date,Math,JSON,Promise,Array,String,Number,Boolean,Error,Map,Set,Buffer,Uint8Array,
    Request:FakeRequest,Response:FakeResponse,setTimeout,
    caches:{async open(){return cache;}},
    fetch:async req=>new FakeResponse(
      req.url==='./version.json'?JSON.stringify(manifest):'ASSET:'+req.url),
    self:{
      clients:{async matchAll(){return [];}},
      addEventListener(n,handler){events[n]=handler;},
      async skipWaiting(){waiting++;}
    },
    indexedDB:{
      async databases(){return [{name:'production-v011'}];},
      open(){const q={};queueMicrotask(()=>q.onsuccess());q.result={
        objectStoreNames:{contains(){return true;}},
        transaction(){
          return {
            objectStore(){
              return {
                get(){
                  const g={result:{user:{role}}};
                  queueMicrotask(()=>g.onsuccess());
                  return g;
                }
              };
            }
          };
        },
        close(){}
      };return q;}
    }
  };
  vm.runInNewContext(sw,ctx,{filename:'sw.js'});
  assert.ok(events.install,'SW install listener missing');
  let installation;
  events.install({waitUntil(p){installation=p;}});
  let error=null;
  try{await installation;}catch(e){error=String(e.message||e);}
  return {waiting,error,cacheEntries:[...entries.keys()],
    async postSkipWaiting(){
      let p=null;
      events.message({data:{type:'SKIP_WAITING'},waitUntil(x){p=x;}});
      if(p)await p;
      return waiting;
    }
  };
}
test('staging-only install rejected before caching, including after last client closes',async()=>{
  for(const role of ['ADMIN1','WORKER']){
    const r=await install('staging-only',role);
    assert.strictEqual(r.error,'CLIENT_RELEASE_GATE_NOT_OPEN');
    assert.strictEqual(r.waiting,0);
    assert.deepStrictEqual(r.cacheEntries,[]);
    assert.strictEqual(await r.postSkipWaiting(),0);
  }
});
test('admin1 rollout cannot install for cached worker',async()=>{
  const r=await install('admin1','WORKER');
  assert.strictEqual(r.error,'CLIENT_RELEASE_GATE_NOT_OPEN');
  assert.strictEqual(r.waiting,0);
  assert.deepStrictEqual(r.cacheEntries,[]);
  assert.strictEqual(await r.postSkipWaiting(),0);
});
test('explicit admin1 rollout allows cached ADMIN1 installation',async()=>{
  const r=await install('admin1','ADMIN1');
  assert.strictEqual(r.error,null);
  assert.strictEqual(r.waiting,1);
  assert.ok(r.cacheEntries.includes('./version.json'));
});
test('service worker refuses mismatched manifest build before caching',async()=>{
  const r=await install('admin1','ADMIN1','UNEXPECTED-BUILD');
  assert.strictEqual(r.waiting,0);
  assert.strictEqual(r.error,'APP_SHELL_VERSION_MISMATCH');
  assert.deepStrictEqual(r.cacheEntries,[]);
});
test('staging-only message SKIP_WAITING cannot bypass install gate',async()=>{
  const r=await install('paused','ADMIN1');
  assert.strictEqual(r.error,'CLIENT_RELEASE_GATE_NOT_OPEN');
  assert.strictEqual(await r.postSkipWaiting(),0);
});
test('stable release installation can proceed only with matching manifest',async()=>{
  const r=await install('stable','WORKER');
  assert.strictEqual(r.error,null);
  assert.strictEqual(r.waiting,0);
  assert.ok(r.cacheEntries.includes('./index.html'));
  assert.strictEqual(await r.postSkipWaiting(),1);
});
test('application keeps rollback-compatible DB schema5 and no destructive db upgrade',()=>{
  assert.ok(app.includes("const DB_NAME='production-v011';"));
  assert.ok(app.includes("const DB_SCHEMA=APP_RELEASE.dbSchema;"));
  assert.strictEqual(release.dbSchema,5);
  assert.strictEqual(release.rollback.dbSchema,5);
  assert.ok(!app.includes('indexedDB.deleteDatabase(DB_NAME)'));
});
(async()=>{
 for(const t of results){await t.fn();console.log('PASS '+t.label);}
 console.log(JSON.stringify({kind:'Q029_PWA_CLIENT_RELEASE_VERSION_AND_SW_GATE',passed:results.length,total:results.length,ok:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
