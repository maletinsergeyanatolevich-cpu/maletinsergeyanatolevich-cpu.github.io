/* Q-079 source-only integration into EXISTING Production #wallet.
 * Not activated by default. When activated, old financial backend/caches are NEVER fallback.
 * A release authority must set __Q079_WALLET2_ENABLED_BY_RELEASE only after owner-approved cutover.
 */
(function (w) {
 'use strict';
 if(!w || w.__Q079_WALLET2_ENABLED_BY_RELEASE!==true)return;
 let wallet=null;
 const walletScreen=document.getElementById('wallet');
 // Keep the global transfer panel intact and move it below Wallet2 only while that
 // screen is visible. Other 15 screens retain the existing panel placement.
 const transferPanel=document.getElementById('transferProgress');
 const transferAnchor=transferPanel&&transferPanel.parentNode?document.createComment('Wallet2 transfer return anchor'):null;
 if(transferAnchor)transferPanel.parentNode.insertBefore(transferAnchor,transferPanel);
 function placeTransferPanel(){
   if(!transferPanel||!transferAnchor||!walletScreen)return;
   if(walletScreen.classList.contains('active')){
     const slot=walletScreen.querySelector('.w2-technical')||walletScreen;
     if(transferPanel.parentNode!==slot)slot.appendChild(transferPanel);
   }else if(transferAnchor.parentNode&&transferPanel.previousSibling!==transferAnchor){
     transferAnchor.parentNode.insertBefore(transferPanel,transferAnchor.nextSibling);
   }
 }
 let lastAutomaticAttempt=0;
 let lastPassiveAttempt=0;
 // Wallet-only, foreground throttling. Nothing starts a finance transfer from a service worker.
 function goodForBackground(){
   if(document.hidden||navigator.onLine===false)return false;
   const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
   if(c?.saveData||['slow-2g','2g'].includes(String(c?.effectiveType||'')))return false;
   return true;
 }
 function backgroundTick(){
   if(!wallet||!goodForBackground()||!backendSession()||!SESSION.userId)return;
   const st=wallet.state;
   if(st.loading||st.sending||st.editing)return;
   const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
   const minInterval=c?.effectiveType==='3g'?12*60000:4*60000;
   const now=Date.now();
   if(now-lastPassiveAttempt<minInterval||st.lastReadAt&&now-st.lastReadAt<minInterval)return;
   lastPassiveAttempt=now;
   // Authoritative revision check first; full read only if changed.
   void wallet.refresh({background:true});
 }

 function maybeReadWallet(){
   if(!wallet||!walletScreen?.classList.contains('active')||navigator.onLine===false)return;
   if(!backendSession()||!SESSION.userId)return;
   const state=wallet.state;
   if(state.loading||state.sending||state.editing)return;
   const needsRead=!state.hasData||!state.lastReadAt||(Date.now()-state.lastReadAt>120000);
   if(!needsRead||Date.now()-lastAutomaticAttempt<12000)return;
   lastAutomaticAttempt=Date.now();
   // Server-owned Q079 data only; never repopulate from legacy finance caches.
   void wallet.refresh();
 }
 function render(){
  const node=walletScreen;
  if(!node)return;
  if(!w.ProductionWallet2?.create){
   node.innerHTML='<div class="w2-root"><h2>Кошелёк</h2><p role="alert">Новый Кошелёк не загружен. Старые финансовые данные заблокированы.</p></div>';return;
  }
  if(!wallet){
    wallet=w.ProductionWallet2.create({
      rootElement:node,
      api:(body,opts)=>backendPost(body,opts),
      session:()=>({userId:String(SESSION.userId||''),token:backendSession(),offlineUntil:lsGet(BACKEND_KEYS.offlineUntil)}),
      deviceId:()=>backendDeviceId(),
      allow:permission=>permission==='wallet.sensitive'?isAdmin1():hasPermission(permission),
      requestIds:()=>crypto.randomUUID()
    });
  }
  wallet.render();
  // Restore only an already authenticated Q079 Wallet2 cache; NEVER legacy S.wallet.
  void wallet.restoreCache();
  placeTransferPanel();
  maybeReadWallet();
 }
 // A closing/reopening mobile PWA returns to a current server read automatically.
 // Never retry a failed request in a rapid loop or interrupt an unfinished form.
 const resume=()=>{maybeReadWallet();if(!walletScreen?.classList.contains('active'))backgroundTick();};
 w.addEventListener('focus',resume);
 w.addEventListener('pageshow',resume);
 w.addEventListener('online',resume);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});
 if(walletScreen&&transferPanel&&typeof MutationObserver==='function'){
   new MutationObserver(placeTransferPanel).observe(walletScreen,{attributes:true,attributeFilter:['class'],childList:true});
 }
 w.__Q079_WALLET2_RENDER=render;
 // App startup can activate #wallet before deferred wallet2 files arrive.
 // Re-render only the existing wallet screen when the bridge becomes ready.
 if(walletScreen) render();
 // While the application is visible, perform small revision checks approximately
 // every 4 minutes on good connections. The phone OS may suspend these timers.
 w.setInterval(backgroundTick,60000);
})(typeof window!=='undefined'?window:null);
