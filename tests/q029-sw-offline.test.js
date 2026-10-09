'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const sw=fs.readFileSync('sw.js','utf8');
const build=(sw.match(/const BUILD='([^']+)'/)||[])[1];
assert.ok(build);

const ORIGIN='https://q029-staging.invalid/';
function key(value){return new URL(typeof value==='string'?value:value.url,ORIGIN).href;}
class ResponseMock{
  constructor(text){this.body=String(text||'');this.ok=true;this.status=200;this.statusText='OK';this.headers={};}
  clone(){return new ResponseMock(this.body);}
  async text(){return this.body;}
  async json(){return JSON.parse(this.body);}
  async arrayBuffer(){return Buffer.from(this.body);}
}
function harness(){
  const callbacks={},items=new Map(),meta={network:false,networkCalls:[],claimed:0,removed:[]};
  const cache={
    match:async request=>items.get(key(request))||null,
    put:async(request,response)=>items.set(key(request),response.clone())
  };
  const caches={
    open:async()=>cache,
    match:async req=>cache.match(req),
    keys:async()=>['production-pwa-PREV','production-pwa-'+build,'unrelated-cache'],
    delete:async name=>{meta.removed.push(name);return true;}
  };
  const self={
    location:{origin:new URL(ORIGIN).origin},
    clients:{async matchAll(){return [];},async claim(){meta.claimed++;}},
    addEventListener(n,callback){callbacks[n]=callback;},
    async skipWaiting(){throw Error('UNEXPECTED_ACTIVATION');}
  };
  const ctx={console,URL,Date,Math,JSON,Promise,Array,Number,String,Boolean,Error,Map,Set,Uint8Array,
    self,caches,setTimeout,
    fetch:async request=>{
      meta.networkCalls.push(key(request));
      if(!meta.network)throw Error('OFFLINE_TEST');
      return new ResponseMock('NETWORK:'+key(request));
    }
  };
  vm.createContext(ctx);
  vm.runInContext(sw,ctx,{filename:'sw.js'});
  async function get(request){
    let response;
    callbacks.fetch({
      request:request,
      respondWith(p){response=p;}
    });
    return response?await response:undefined;
  }
  async function activate(){
    let running;
    callbacks.activate({waitUntil(p){running=p;}});
    await running;
  }
  return {items,meta,cache,get,activate,ctx,
    request(url,mode='same-origin',method='GET'){return {url:key(url),mode,method};}};
}
const tests=[];
async function test(name,fn){await fn();tests.push(name);console.log('PASS '+name);}
(async()=>{
  await test('offline navigation loads cached shell without network',async()=>{
    const x=harness();
    await x.cache.put('./index.html',new ResponseMock('CACHED_INDEX'));
    const response=await x.get(x.request('/wallet','navigate'));
    assert.strictEqual(await response.text(),'CACHED_INDEX');
    assert.strictEqual(x.meta.networkCalls.length,0);
  });
  await test('offline app.js and css load from SW cache',async()=>{
    const x=harness();
    await x.cache.put('./assets/app.js',new ResponseMock('CACHED_APP'));
    await x.cache.put('./assets/app.css',new ResponseMock('CACHED_CSS'));
    assert.strictEqual(await (await x.get(x.request('/assets/app.js'))).text(),'CACHED_APP');
    assert.strictEqual(await (await x.get(x.request('/assets/app.css'))).text(),'CACHED_CSS');
    assert.deepStrictEqual(x.meta.networkCalls,[]);
  });
  await test('offline version.json falls back to cached manifest',async()=>{
    const x=harness();
    await x.cache.put('./version.json',new ResponseMock(JSON.stringify({buildId:build,rolloutStage:'staging-only'})));
    const response=await x.get(x.request('/version.json'));
    assert.strictEqual((await response.json()).buildId,build);
    assert.strictEqual(x.meta.networkCalls.length,1);
  });
  await test('failed navigation with no index loads offline fallback',async()=>{
    const x=harness();
    await x.cache.put('./offline.html',new ResponseMock('OFFLINE_PAGE'));
    const response=await x.get(x.request('/deep/link','navigate'));
    assert.strictEqual(await response.text(),'OFFLINE_PAGE');
  });
  await test('network GET is cached; subsequent offline read succeeds',async()=>{
    const x=harness();x.meta.network=true;
    const route='/assets/one-later.svg';
    const online=await x.get(x.request(route));
    assert.strictEqual(await online.text(),'NETWORK:'+key(route));
    x.meta.network=false;
    const offline=await x.get(x.request(route));
    assert.strictEqual(await offline.text(),'NETWORK:'+key(route));
    assert.strictEqual(x.meta.networkCalls.length,1);
  });
  await test('POST and backend/foreign-origin requests never intercepted',async()=>{
    const x=harness();
    assert.strictEqual(await x.get(x.request('/api/test','same-origin','POST')),undefined);
    assert.strictEqual(await x.get(x.request('https://script.google.com/macros/s/ID/exec')),undefined);
    assert.strictEqual(await x.get(x.request('https://script.googleusercontent.com/macros/echo')),undefined);
    assert.strictEqual(await x.get(x.request('https://untrusted.invalid/logo.png')),undefined);
    assert.deepStrictEqual(x.meta.networkCalls,[]);
  });
  await test('activation cleans obsolete app cache but leaves unrelated storage',async()=>{
    const x=harness();
    await x.activate();
    assert.deepStrictEqual(x.meta.removed,['production-pwa-PREV']);
    assert.strictEqual(x.meta.claimed,1);
  });
  console.log(JSON.stringify({kind:'Q029_SW_OFFLINE_FETCH_SIMULATOR',ok:true,passed:tests.length,total:7},null,2));
})().catch(err=>{console.error(err);process.exitCode=1;});
