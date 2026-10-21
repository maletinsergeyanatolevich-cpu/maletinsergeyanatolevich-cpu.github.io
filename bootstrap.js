'use strict';
(function(){
  const s=document.createElement('script');
  s.src='./assets/app.js';
  s.async=false;
  s.onerror=()=>{document.body.innerHTML='<main style="padding:24px;font-family:sans-serif"><h1>Не удалось запустить приложение</h1><p>Не загружен основной модуль приложения.</p></main>'};
  // Source-only Q079. Flag is OFF until a separately approved production release.
  // Keep the original 16-screen startup path unchanged while Wallet2 is disabled.
  s.onload=()=>{
    if(window.__Q079_WALLET2_ENABLED_BY_RELEASE!==true)return;
    const style=document.createElement('link');style.rel='stylesheet';style.href='./assets/wallet2.css';document.head.appendChild(style);
    const next=document.createElement('script');next.src='./assets/wallet2.js';next.async=false;
    next.onload=()=>{
      const bridge=document.createElement('script');bridge.src='./assets/wallet2-bridge.js';bridge.async=false;
      bridge.onerror=()=>{const el=document.getElementById('wallet');if(el)el.innerHTML='<div class="w2-root"><p role="alert">Новый Кошелёк недоступен. Старые финансы не показываются.</p></div>';};
      document.head.appendChild(bridge);
    };
    // app.js renderWallet independently fails closed when enabled but module absent.
    document.head.appendChild(next);
  };
  document.head.appendChild(s);
})();
