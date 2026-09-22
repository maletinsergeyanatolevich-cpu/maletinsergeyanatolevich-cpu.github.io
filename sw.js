'use strict';
const BUILD='2026-09-22.1';
const CACHE='production-pwa-'+BUILD;
const APP_SHELL=[
  './','./index.html','./assets/app.css','./assets/media.css','./assets/app.js','./bootstrap.js',
  './manifest.webmanifest','./version.json',
  './icons/icon.svg','./icons/icon-maskable.svg','./offline.html'
];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    for(const path of APP_SHELL){
      const request=new Request(path,{cache:'reload'});
      const response=await fetch(request);
      if(!response.ok) throw new Error('APP_SHELL_FETCH_FAILED:'+path+':'+response.status);
      await c.put(path,response.clone());
    }
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(async keys=>{
      const previous=keys.filter(k=>k!==CACHE&&k.startsWith('production-pwa-')).sort().reverse()[0]||'';
      await Promise.all(keys.filter(k=>k.startsWith('production-pwa-')&&k!==CACHE&&k!==previous).map(k=>caches.delete(k)));
      await self.clients.claim();
    })
  );
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.hostname.includes('script.google.com')||url.hostname.includes('googleusercontent.com')) return;
  if(url.origin!==self.location.origin) return;
  if(url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match(req)));
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE);
      const cached=await c.match('./index.html');
      if(cached) return cached;
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh.ok) await c.put('./index.html',fresh.clone());
        return fresh;
      }catch(_){
        return c.match('./offline.html');
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const cached=await c.match(req);
    if(cached) return cached;
    const fresh=await fetch(req,{cache:'no-store'});
    if(fresh.ok) await c.put(req,fresh.clone());
    return fresh;
  })());
});