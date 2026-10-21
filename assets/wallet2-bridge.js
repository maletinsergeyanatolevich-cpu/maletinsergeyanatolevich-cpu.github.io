/* Q-079 source-only integration into EXISTING Production #wallet.
 * Not activated by default. When activated, old financial backend/caches are NEVER fallback.
 * A release authority must set __Q079_WALLET2_ENABLED_BY_RELEASE only after owner-approved cutover.
 */
(function (w) {
 'use strict';
 if(!w || w.__Q079_WALLET2_ENABLED_BY_RELEASE!==true)return;
 let wallet=null;
 function render(){
  const node=document.getElementById('wallet');
  if(!node)return;
  if(!w.ProductionWallet2?.create){
   node.innerHTML='<div class="w2-root"><h2>Кошелёк</h2><p role="alert">Новый Кошелёк не загружен. Старые финансовые данные заблокированы.</p></div>';return;
  }
  if(!wallet){
    wallet=w.ProductionWallet2.create({
      rootElement:node,
      api:(body,opts)=>backendPost(body,opts),
      session:()=>({userId:String(SESSION.userId||''),token:backendSession()}),
      deviceId:()=>backendDeviceId(),
      allow:permission=>permission==='wallet.sensitive'?isAdmin1():hasPermission(permission),
      requestIds:()=>crypto.randomUUID()
    });
  }
  wallet.render();
  // Never show stored q029 Finance or S.wallet; no old server/snapshot cache fallback.
  if(navigator.onLine!==false && !wallet.state.hasData && !wallet.state.loading)void wallet.refresh();
 }
 w.__Q079_WALLET2_RENDER=render;
})(typeof window!=='undefined'?window:null);
