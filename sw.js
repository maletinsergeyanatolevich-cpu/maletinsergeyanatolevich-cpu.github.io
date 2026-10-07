'use strict';
const BUILD='2026-10-07.3c';
const CACHE='production-pwa-'+BUILD;
const APP_SHELL=[
  './index.html','./assets/app.css','./assets/media.css','./assets/app.js','./bootstrap.js',
  './manifest.webmanifest','./version.json','./icons/icon.svg','./icons/icon-maskable.svg','./offline.html'
];
async function cachedAdmin1(){
  try{
    if(typeof indexedDB.databases==='function'){
      const dbs=await indexedDB.databases();
      if(Array.isArray(dbs)&&!dbs.some(x=>x&&x.name==='production-v011'))return false;
    }
    return await new Promise(resolve=>{
      let settled=false;const done=v=>{if(settled)return;settled=true;resolve(!!v)};
      const req=indexedDB.open('production-v011');
      req.onerror=()=>done(false);
      req.onblocked=()=>done(false);
      req.onsuccess=()=>{
        const db=req.result;
        try{
          if(!db.objectStoreNames.contains('snapshotCache')){db.close();done(false);return}
          const tx=db.transaction('snapshotCache','readonly'),get=tx.objectStore('snapshotCache').get('current');
          get.onsuccess=()=>{const role=String(get.result?.user?.role||'');db.close();done(role==='ADMIN1')};
          get.onerror=()=>{db.close();done(false)};
        }catch(_){try{db.close()}catch(__){}done(false)}
      };
      setTimeout(()=>done(false),2500);
    })
  }catch(_){return false}
}
async function postUpdateProgress(data={}){
  const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of list)client.postMessage({type:'PROD_UPDATE_PROGRESS',...data});
}
async function fetchShellAsset(cache,path){
  const response=await fetch(new Request(path,{cache:'reload'}));
  if(!response.ok)throw new Error('APP_SHELL_FETCH_FAILED:'+path+':'+response.status);
  const bytes=await response.arrayBuffer();
  await cache.put(path,new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers}));
  return bytes.byteLength;
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),total=APP_SHELL.length;
    let next=0,done=0,bytesLoaded=0;
    await postUpdateProgress({stage:'downloading',label:'Скачиваю файлы приложения',done,total,bytesLoaded});
    const worker=async()=>{
      while(true){
        const i=next++;if(i>=total)return;
        const path=APP_SHELL[i];
        try{
          const bytes=await fetchShellAsset(cache,path);done++;bytesLoaded+=Number(bytes||0);
          await postUpdateProgress({stage:'downloading',label:'Скачиваю файлы приложения',done,total,bytesLoaded,file:path});
        }catch(err){
          await postUpdateProgress({stage:'error',label:'Ошибка загрузки '+path,done,total,bytesLoaded,error:String(err&&err.message||err)});
          throw err;
        }
      }
    };
    const concurrency=Math.min(4,total);
    await Promise.all(Array.from({length:concurrency},()=>worker()));
    await postUpdateProgress({stage:'ready',label:'Файлы обновления готовы',done:total,total,bytesLoaded});
    if(await cachedAdmin1()){await postUpdateProgress({stage:'activating',label:'Активирую обновление ADMIN1',done:total,total,bytesLoaded});await self.skipWaiting()}
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(async keys=>{
      await Promise.all(keys.filter(k=>k.startsWith('production-pwa-')&&k!==CACHE).map(k=>caches.delete(k)));
      await self.clients.claim();
    })
  );
});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname.includes('script.google.com')||url.hostname.includes('googleusercontent.com'))return;
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/version.json')){event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match(req)));return;}
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE),cached=await c.match('./index.html');
      if(cached)return cached;
      try{
        const fresh=await fetch(req,{cache:'reload'});
        if(fresh.ok)await c.put('./index.html',fresh.clone());
        return fresh
      }catch(_){
        return c.match('./offline.html')
      }
    })());return;
  }
  event.respondWith((async()=>{const c=await caches.open(CACHE),cached=await c.match(req);if(cached)return cached;const fresh=await fetch(req,{cache:'no-store'});if(fresh.ok)await c.put(req,fresh.clone());return fresh})());
});
async function notifyDraftSyncClients(reason){
  const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of list)client.postMessage({type:'PROD_SYNC_DRAFTS',reason:reason||'service-worker'});
  return list.length;
}
self.addEventListener('sync',event=>{if(event.tag!=='prod-draft-sync')return;event.waitUntil(notifyDraftSyncClients('background-sync'));});
self.addEventListener('periodicsync',event=>{if(event.tag!=='prod-draft-periodic')return;event.waitUntil(notifyDraftSyncClients('periodic-sync'));});
