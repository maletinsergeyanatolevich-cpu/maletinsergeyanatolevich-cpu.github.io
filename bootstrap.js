'use strict';
(function(){
  const s=document.createElement('script');
  s.src='./assets/app.js';
  s.async=false;
  s.onerror=()=>{document.body.innerHTML='<main style="padding:24px;font-family:sans-serif"><h1>Не удалось запустить приложение</h1><p>Не загружен основной модуль приложения.</p></main>'};
  document.head.appendChild(s);
})();
