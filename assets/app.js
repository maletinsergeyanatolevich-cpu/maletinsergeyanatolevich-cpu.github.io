const APP_RELEASE=Object.freeze({version:'v0.3.9',buildId:'2026-09-22.2',channel:'step2-stage',dbSchema:5,updateStrategy:'manifest-service-worker',rolloutStage:'admin1',previousBuildId:'2026-09-22.1'});window.APP_RELEASE=APP_RELEASE;
function emptySnapshot(){return {meta:{version:APP_RELEASE.version,snapshotDate:'',snapshotTime:'',timezone:'',backendConnected:false,source:'Нет загруженных бизнес-данных',schemaVersion:1},orders:[],calculations:{},wallet:{balance:0,income:0,expense:0,reserve:0,freeNow:0,expense7:0,free7:0,futureExpenses:[],transactions:[],futureTotal:0,futureIncome:0,afterObligations:0},nomenclature:[],purchaseLines:[],purchaseAggregated:[],gallery:[],appIssues:[],purchaseWarnings:[]}}
function normalizeSnapshot(x){const b=emptySnapshot();if(!x||typeof x!=='object')return b;return {...b,...x,meta:{...b.meta,...(x.meta||{})},wallet:{...b.wallet,...(x.wallet||{})},orders:Array.isArray(x.orders)?x.orders:[],calculations:x.calculations&&typeof x.calculations==='object'?x.calculations:{},nomenclature:Array.isArray(x.nomenclature)?x.nomenclature:[],purchaseLines:Array.isArray(x.purchaseLines)?x.purchaseLines:[],purchaseAggregated:Array.isArray(x.purchaseAggregated)?x.purchaseAggregated:[],gallery:Array.isArray(x.gallery)?x.gallery:[],appIssues:Array.isArray(x.appIssues)?x.appIssues:[],purchaseWarnings:Array.isArray(x.purchaseWarnings)?x.purchaseWarnings:[]}}
let S=emptySnapshot(); window.SNAPSHOT=S;
const titles={home:'Главная',checklists:'Чек-листы',analytics:'Общая информация',calculator:'Калькулятор заказов',salesAnalytics:'Аналитика продаж',orders:'Заказы',gallery:'Галерея',avito:'Avito',admin:'Настройки',activityLog:'Журнал действий',orderDetail:'Заказ',buy:'Закупки по заказам',wallet:'Кошелёк',nom:'Номенклатура',sync:'Загрузки',appdev:'Разработка приложения'};
































































































































































































































































const SESSION={userId:'',name:'',role:'GUEST',permissions:{}}; function applyBackendUser(u={}){SESSION.userId=String(u.user_id||u.id||'');SESSION.name=String(u.name||'');SESSION.role=String(u.role||'GUEST');SESSION.permissions=(u.permissions&&typeof u.permissions==='object')?u.permissions:{};return SESSION} function hydrateBackendUser(){try{const u=JSON.parse(lsGet(BACKEND_KEYS.user)||'{}');applyBackendUser(u)}catch(_){applyBackendUser({})}} function isAdmin1(){return SESSION.role==='ADMIN1'};
const BACKEND_URL='https://script.google.com/macros/s/AKfycbw9LwsZcvSylhVtZPNL2_o0Thkz1eDKTuUBe6KS5V-D7Jzco7sXv4ynGzD1JTurXpUD/exec';
const BACKEND_KEYS={device:'prodDeviceId',secret:'prodActivationSecret',request:'prodAccessRequestId',session:'prodSessionToken',sessionId:'prodSessionId',offlineUntil:'prodOfflineUntil',user:'prodBackendUser',nomRev:'prodNomRevision',nomSetup:'prodNomDeltaSetup'};
let backendState={ping:'unknown',lastError:'',syncing:false,recovering:false};
const DATA_STATE={source:'',lastCacheAt:'',lastPullAt:'',lastAttemptAt:'',lastError:'',network:'unknown',refreshing:false};
let BUSY_COUNT=0;
function setBusy(text='Выполняю…'){BUSY_COUNT++;const box=document.getElementById('busyOverlay'),label=document.getElementById('busyText');if(label)label.textContent=text;if(box)box.classList.remove('hidden')}
function clearBusy(){BUSY_COUNT=Math.max(0,BUSY_COUNT-1);if(BUSY_COUNT===0)document.getElementById('busyOverlay')?.classList.add('hidden')}
async function withBusy(text,fn){setBusy(text);try{return await fn()}finally{clearBusy()}}
let APP_TOAST_TIMER=null;
function showAppToast(message,kind='ok',duration=3200){
  const box=document.getElementById('appToast'),txt=document.getElementById('appToastText'),icon=document.getElementById('appToastIcon');
  if(!box||!txt)return;
  txt.textContent=String(message||'');
  box.classList.remove('hidden','ok','bad','info','recording');
  box.classList.add(kind||'info');
  if(icon)icon.textContent=kind==='bad'?'!':kind==='recording'?'●':'✓';
  if(APP_TOAST_TIMER)clearTimeout(APP_TOAST_TIMER);
  if(duration>0)APP_TOAST_TIMER=setTimeout(()=>box.classList.add('hidden'),duration);
}
function hideAppToast(){const box=document.getElementById('appToast');if(box)box.classList.add('hidden');if(APP_TOAST_TIMER)clearTimeout(APP_TOAST_TIMER);APP_TOAST_TIMER=null}
function friendlySyncError(v){const t=String(v||'');if(/signal is aborted|aborterror|timeout/i.test(t))return 'Сервер не успел подтвердить приём. Файл сохранён на телефоне — нажмите «Проверить приём».';return t||'нет подтверждения'}
function orderRefResolve(raw){
  const v=String(raw||'').trim();if(!v)return {id:''};
  if(/^\d{1,3}$/.test(v)){
    const suffix=v.padStart(3,'0'),matches=(S.orders||[]).filter(o=>String(o.id||'').endsWith('-'+suffix));
    if(matches.length===1)return {id:String(matches[0].id),short:true};
    if(matches.length===0)return {error:'Заказ '+suffix+' не найден. Укажите полный номер, например 2026-'+suffix+'.'};
    return {error:'Номер '+suffix+' неоднозначен. Выберите заказ из списка.'};
  }
  const m=v.match(/^(20\d{2})-(\d{1,3})$/);
  if(m){const full=m[1]+'-'+m[2].padStart(3,'0'),hit=(S.orders||[]).find(o=>String(o.id)===full);return {id:hit?String(hit.id):full};}
  return {id:v};
}
let LAST_AUTO_REFRESH_ERROR_AT=0;
async function autoRefreshData(reason='auto'){if(!backendSession()||navigator.onLine===false)return {ok:false,error:'NO_SESSION_OR_OFFLINE'};const d=await refreshBackendData();if(d?.ok){if(document.getElementById('sync')?.classList.contains('active'))await renderSync();return d}const now=Date.now();if(now-LAST_AUTO_REFRESH_ERROR_AT>60000){LAST_AUTO_REFRESH_ERROR_AT=now;showAppToast('Не получилось обновить данные. Показываю последние сохранённые.','bad',4200)}return d}
async function manualRefreshData(){if(!backendSession()){showAppToast('Сначала подключите и активируйте устройство.','bad',3600);return {ok:false,error:'NO_SESSION'}}return withBusy('Обновляю данные…',async()=>{const d=await refreshBackendData();if(document.getElementById('sync')?.classList.contains('active'))await renderSync();showAppToast(d?.ok?'Данные обновлены.':'Не получилось обновить данные.',''+(d?.ok?'ok':'bad'),3200);return d})}
































































function localNomRevision(){const n=Math.floor(Number(lsGet(BACKEND_KEYS.nomRev)||0));return Number.isFinite(n)&&n>0?n:0}
function setLocalNomRevision(v){const n=Math.floor(Number(v||0));if(n>0)lsSet(BACKEND_KEYS.nomRev,String(n));return n}
async function ensureNomenclatureDeltaSetup(){
  if(!backendSession()||!isAdmin1()||lsGet(BACKEND_KEYS.nomSetup)==='1'||navigator.onLine===false)return {ok:false,skipped:true};
  try{
    const d=await backendPost({action:'nomenclature.sync.install',session_token:backendSession(),device_id:backendDeviceId(),app_version:APP_RELEASE.version},{timeoutMs:15000});
    if(d?.ok){const t=d.triggers||{};if(t.edit&&t.change&&t.integrity)lsSet(BACKEND_KEYS.nomSetup,'1')}
    return d||{ok:false};
  }catch(e){return {ok:false,error:String(e?.message||e)}}
}
async function mergeNomenclatureDelta(changes,currentRev){
  const map=new Map((Array.isArray(S.nomenclature)?S.nomenclature:[]).filter(x=>x&&x.id).map(x=>[String(x.id),x]));
  (Array.isArray(changes)?changes:[]).forEach(x=>{if(!x||!x.id)return;if(x.active===false)map.delete(String(x.id));else map.set(String(x.id),x)});
  const next=normalizeSnapshot({...S,nomenclature:[...map.values()],meta:{...(S.meta||{}),nomenclatureRevision:Number(currentRev||localNomRevision()||0),nomenclatureDeltaSupported:true,nomenclatureOmitted:false}});
  if(currentRev)setLocalNomRevision(currentRev);
  await putSnapshotCache(next);applySnapshot(next);return next;
}
async function pullNomenclatureDelta(opts={}){
  const token=backendSession();if(!token||navigator.onLine===false)return {ok:false,error:'NO_SESSION_OR_OFFLINE'};
  const since=localNomRevision()||Math.floor(Number(S.meta?.nomenclatureRevision||0));
  try{
    const d=await backendPost({action:'nomenclature.delta',session_token:token,device_id:backendDeviceId(),since_rev:since,app_version:APP_RELEASE.version},{timeoutMs:Number(opts.timeoutMs||15000)});
    if(!d?.ok)return d||{ok:false,error:'NOM_DELTA_FAILED'};
    if(d.bootstrap_required||d.reset_required){
      if(opts.allowFullFallback===false)return d;
      const full=await pullLiveSnapshot({silent:true,timeoutMs:22000,forceFullNomenclature:true,skipNomDelta:true});
      return {...d,fullReloaded:!!full?.ok,fullResult:full};
    }
    await mergeNomenclatureDelta(d.changes||[],d.current_rev||since);return d;
  }catch(e){return {ok:false,error:String(e?.name==='AbortError'?'NOM_DELTA_TIMEOUT':(e?.message||e))}}
}
































































function lsGet(k){try{return localStorage.getItem(k)||''}catch(_){return ''}}
function lsSet(k,v){try{localStorage.setItem(k,String(v??''))}catch(_){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(_){}}
const THEME_KEY='prodTheme';
function applyTheme(theme,save=true){const t=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=t;if(save)lsSet(THEME_KEY,t);const btn=document.getElementById('themeToggle');if(btn){btn.textContent=t==='dark'?'🌙':'☀️';btn.setAttribute('aria-label',t==='dark'?'Включить светлую тему':'Включить тёмную тему');btn.setAttribute('title',t==='dark'?'Ночная тема — нажмите для дневной':'Дневная тема — нажмите для ночной')}const meta=document.getElementById('themeColorMeta')||document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',t==='dark'?'#121519':'#f7f3ed');return t}
function initTheme(){const saved=lsGet(THEME_KEY)||document.documentElement.dataset.theme||'light';applyTheme(saved,false)}
window.toggleTheme=function(){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true)};
function backendSession(){return lsGet(BACKEND_KEYS.session)}
function backendDeviceId(){let v=lsGet(BACKEND_KEYS.device);if(!v){v='DEV-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));lsSet(BACKEND_KEYS.device,v)}return v}
function randomSecret(){const a=new Uint8Array(32);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function activationSecret(){let v=lsGet(BACKEND_KEYS.secret);if(!v){v=randomSecret();lsSet(BACKEND_KEYS.secret,v)}return v}
async function sha256HexBrowser(text){if(!crypto.subtle)throw new Error('WEB_CRYPTO_UNAVAILABLE');const b=new TextEncoder().encode(String(text));const d=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function backendPost(body,opts={}){const timeoutMs=Math.max(1500,Number(opts.timeoutMs||20000));const ctrl=typeof AbortController!=='undefined'?new AbortController():null;const timer=ctrl?setTimeout(()=>ctrl.abort(),timeoutMs):null;try{const r=await fetch(BACKEND_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow',cache:'no-store',signal:ctrl?.signal});const txt=await r.text();let data;try{data=JSON.parse(txt)}catch(_){throw new Error('BAD_BACKEND_RESPONSE')};return data}finally{if(timer)clearTimeout(timer)}}
async function backendPing(opts={}){const timeoutMs=Math.max(1200,Number(opts.timeoutMs||3500));const ctrl=typeof AbortController!=='undefined'?new AbortController():null;const timer=ctrl?setTimeout(()=>ctrl.abort(),timeoutMs):null;const started=performance.now();try{const r=await fetch(BACKEND_URL+'?action=ping',{cache:'no-store',redirect:'follow',signal:ctrl?.signal});const d=await r.json();const latency=Math.round(performance.now()-started);backendState.ping=d?.ok?'ok':'error';backendState.lastError=d?.ok?'':String(d?.error||'PING_FAILED');return {...d,latencyMs:latency}}catch(e){backendState.ping='error';backendState.lastError=String(e?.name==='AbortError'?'PING_TIMEOUT':(e?.message||e));return {ok:false,error:backendState.lastError,latencyMs:Math.round(performance.now()-started)}}finally{if(timer)clearTimeout(timer)}}
function networkHints(){const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;return {online:navigator.onLine!==false,saveData:!!c?.saveData,type:String(c?.type||''),effectiveType:String(c?.effectiveType||''),rtt:Number(c?.rtt||0),downlink:Number(c?.downlink||0)}}
function autoRefreshAllowedByHint(){const n=networkHints();if(!n.online||n.saveData)return false;if(['slow-2g','2g'].includes(n.effectiveType))return false;if(n.rtt>1400)return false;if(n.downlink>0&&n.downlink<0.45)return false;return true}
function heavyDraft(x){return !!(x?.blob instanceof Blob)||Array.isArray(x?.attachments)&&x.attachments.some(a=>a?.blob instanceof Blob)||['photo','audio','document','order-create','appdev-issue'].includes(String(x?.kind||''))}
function wifiConfirmed(){const t=networkHints().type.toLowerCase();return t==='wifi'||t==='ethernet'}
function heavyNetworkLabel(){const n=networkHints();return wifiConfirmed()?'Wi‑Fi':(n.type?n.type:'тип сети не определяется браузером')}
function allowHeavyManual(){if(wifiConfirmed())return true;return confirm('Тяжёлые файлы автоматически отправляются только при Wi‑Fi. Сейчас '+heavyNetworkLabel()+'. Отправить выбранные файлы через текущую сеть вручную?')}
async function probeStableNetwork(){if(!autoRefreshAllowedByHint()){DATA_STATE.network='poor-or-offline';return {ok:false,error:'NETWORK_HINT_POOR'}}const p=await backendPing({timeoutMs:3000});if(!p?.ok){DATA_STATE.network='poor-or-offline';return p}if(Number(p.latencyMs||0)>2500){DATA_STATE.network='slow';return {ok:false,error:'NETWORK_SLOW',latencyMs:p.latencyMs}}DATA_STATE.network='good';return p}
async function requestDeviceAccess(){const name=prompt('Имя пользователя для заявки на доступ','Сергей');if(!name)return;try{const secret=activationSecret();const hash=await sha256HexBrowser(secret);setBusy('Отправляю заявку…');const d=await backendPost({action:'access.request',device_id:backendDeviceId(),device_name:navigator.userAgent.slice(0,120),name:name.trim(),app_version:APP_RELEASE.version,activation_hash:hash});if(d?.ok){lsSet(BACKEND_KEYS.request,d.request_id||'');alert(d.status==='PENDING'?'Заявка отправлена. Статус: PENDING. Теперь ADMIN1 должен одобрить это устройство.':'Заявка найдена. Статус: '+String(d.status||''));}else alert('Backend: '+String(d?.error||'ошибка заявки'));await renderSync()}catch(e){alert('Не удалось отправить заявку: '+String(e?.message||e));}finally{clearBusy()}}
async function activateApprovedDevice(){const req=lsGet(BACKEND_KEYS.request);if(!req){alert('Сначала отправьте заявку на доступ.');return}try{setBusy('Проверяю одобрение…');const d=await backendPost({action:'access.activate',access_request_id:req,device_id:backendDeviceId(),device_name:navigator.userAgent.slice(0,120),activation_secret:activationSecret()});if(d?.ok&&d.session_token){lsSet(BACKEND_KEYS.session,d.session_token);lsSet(BACKEND_KEYS.sessionId,d.session_id||'');lsSet(BACKEND_KEYS.offlineUntil,d.offline_access_until||'');lsSet(BACKEND_KEYS.user,JSON.stringify(d.user||{}));applyBackendUser(d.user||{});const pulled=await pullLiveSnapshot({silent:true});alert(pulled?.ok?'Устройство активировано. Реальные данные загружены с сервера.':'Устройство активировано. Серверная сессия есть, но данные пока не загружены.');}else if(d?.status){alert('Заявка ещё не одобрена. Статус: '+d.status)}else alert('Backend: '+String(d?.error||'активация не выполнена'));await renderSync()}catch(e){alert('Ошибка активации: '+String(e?.message||e));}finally{clearBusy()}}
function backendErrorCode(d,fallback='BACKEND_ERROR'){const raw=String((d?.error==='SERVER_ERROR'&&d?.detail)?d.detail:(d?.error||fallback));return raw.split(':')[0]}
async function checkBackendAuth(){const token=backendSession();if(!token)return {ok:false,error:'NO_SESSION'};try{const d=await backendPost({action:'auth.check',session_token:token,device_id:backendDeviceId()});if(d?.ok){lsSet(BACKEND_KEYS.offlineUntil,d.offline_access_until||'');lsSet(BACKEND_KEYS.user,JSON.stringify(d.user||{}));applyBackendUser(d.user||{});if(d.wipe_on_next_online){await performRemoteWipe();return {ok:false,error:'REMOTE_WIPE_COMPLETED'}}return d}const err=backendErrorCode(d,'AUTH_FAILED');if(d?.wipe_on_next_online){await performRemoteWipe();return {ok:false,error:'REMOTE_WIPE_COMPLETED'}}if(/^(SESSION_|USER_|DEVICE_)/.test(err)){await handleAuthFailure(err)}return {...d,error:err}}catch(e){return {ok:false,error:String(e?.message||e)}}}
function blobToBase64(blob){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result||'').split(',')[1]||'');fr.onerror=()=>rej(fr.error);fr.readAsDataURL(blob)})}
async function draftToEvent(x){const ev={event_id:x.id,event_type:x.kind||'unknown',kind:x.kind||'unknown',created_at:x.createdAt||'',holdUntil:x.holdUntil||'',sendNowRequested:!!x.meta?.sendNowRequested,context:x.context||'',entity_id:x.objectId||'',objectId:x.objectId||'',text:x.text||'',amount:x.meta?.amount??'',category:x.meta?.type||'',finance_type:x.meta?.financeType||x.meta?.type||'',currency:x.meta?.currency||'',meta:{...(x.meta||{}),appName:x.appName||'',originalName:x.originalName||'',app_version:APP_RELEASE.version}};
 if(x.blob instanceof Blob){if(x.blob.size>7*1024*1024)throw new Error('Файл больше 7 МБ: '+(x.appName||x.text||x.id));ev.media={base64:await blobToBase64(x.blob),mimeType:x.mime||x.blob.type||'application/octet-stream',fileName:x.appName||x.originalName||('PROD_'+x.id)}}
 if(Array.isArray(x.attachments)&&x.attachments.length){ev.mediaList=[];for(const a of x.attachments.slice(0,8)){const b=a?.blob;if(!(b instanceof Blob))continue;if(b.size>7*1024*1024)throw new Error('Файл больше 7 МБ: '+(a.name||x.id));ev.mediaList.push({base64:await blobToBase64(b),mimeType:a.mime||b.type||'application/octet-stream',fileName:a.name||('PROD_'+x.id)})}}
 return ev}
async function checkEventStatus(eventId,token){if(!eventId||!token||navigator.onLine===false)return {ok:false,received:false,error:'OFFLINE_OR_NO_SESSION'};try{const d=await backendPost({action:'event.status',session_token:token,device_id:backendDeviceId(),event_id:eventId,app_version:APP_RELEASE.version},{timeoutMs:10000});if(d?.ok&&d?.received)return {event_id:eventId,ok:true,server_received:true,received:true,status:'synced',confirmed_by:'event.status',detail:d.detail||null};return {event_id:eventId,ok:!!d?.ok,server_received:false,received:false,status:d?.status||'not_found',error:d?.error||''}}catch(e){return {event_id:eventId,ok:false,server_received:false,received:false,error:String(e?.message||e)}}}
async function syncEventWithRetry(x,token,maxAttempts=2){let last={event_id:x.id,ok:false,error:'NO_ACK'};const prior=String(x.meta?.syncState||'');if(['sending','confirming','error'].includes(prior)){const seen=await checkEventStatus(x.id,token);if(seen?.server_received)return seen}const ev=await draftToEvent(x);for(let attempt=1;attempt<=maxAttempts;attempt++){try{const current=await getDraft(x.id);if(current){current.meta={...(current.meta||{}),syncState:attempt===1?'sending':'confirming',syncAttempt:attempt,lastSyncAttemptAt:new Date().toISOString(),lastSyncError:''};await updateDraft(current)}const d=await backendPost({action:'sync.push',session_token:token,device_id:backendDeviceId(),events:[ev],app_version:APP_RELEASE.version},{timeoutMs:heavyDraft(x)?60000:25000});const r=d?.results?.[0]||{event_id:x.id,ok:false,error:d?.error||'NO_RESULT'};last=r;if(r?.ok&&r?.server_received)return r;if(r?.error&&String(r.error).startsWith('PERMISSION_DENIED'))return r}catch(e){last={event_id:x.id,ok:false,error:String(e?.message||e)}}const seen=await checkEventStatus(x.id,token);if(seen?.server_received)return seen;if(attempt<maxAttempts)await sleep(1500*attempt)}return last}
async function recoverPendingAcks(){if(backendState.recovering||backendState.syncing||navigator.onLine===false)return {ok:false,error:'BUSY_OR_OFFLINE'};const token=backendSession();if(!token)return {ok:false,error:'NO_SESSION'};backendState.recovering=true;let recovered=0;try{const all=await drafts();const pending=all.filter(x=>draftState(x)==='ready'&&['sending','confirming','error'].includes(String(x.meta?.syncState||'')));for(const x of pending){const r=await checkEventStatus(x.id,token);if(r?.server_received){await rememberDelivered(x,r);await deleteDraftDirect(x.id);recovered++;continue}if(['sending','confirming'].includes(String(x.meta?.syncState||''))){const rec=await getDraft(x.id);if(rec){rec.meta={...(rec.meta||{}),syncState:'error',lastSyncError:'Сервер пока не подтвердил запись. Можно проверить ещё раз или повторить отправку.'};await updateDraft(rec)}}}if(recovered||pending.length){await refreshPending();if(document.getElementById('sync').classList.contains('active'))await renderSync()}return {ok:true,recovered}}finally{backendState.recovering=false}}
async function syncReadyDrafts(opts={}){if(backendState.syncing)return {ok:false,error:'SYNC_BUSY'};if(!navigator.onLine)return {ok:false,error:'OFFLINE'};const token=backendSession();if(!token)return {ok:false,error:'NO_SESSION'};backendState.syncing=true;try{const all=await drafts();let ready=all.filter(x=>draftState(x)==='ready');const heavyReady=ready.filter(heavyDraft);if(opts.manual===true&&heavyReady.length&&!wifiConfirmed()&&!allowHeavyManual())ready=ready.filter(x=>!heavyDraft(x));if(opts.manual!==true&&!wifiConfirmed())ready=ready.filter(x=>!heavyDraft(x));const waitingHeavy=heavyReady.filter(x=>!ready.includes(x)).length;if(!ready.length){if(opts.notify&&waitingHeavy)alert('Тяжёлые файлы ждут Wi‑Fi либо ручной отправки. Текстовые записи при устойчивой сети отправляются отдельно.');return {ok:true,count:0,results:[],waitingHeavy}};const results=[];for(const x of ready){let r;try{await logActivity(x.meta?.syncState==='error'?'ack_recheck':'sync_started',x);r=await syncEventWithRetry(x,token,2);results.push(r);if(r?.ok&&r?.server_received){await rememberDelivered(x,r);await deleteDraftDirect(x.id)}else{const rec=await getDraft(x.id);if(rec){rec.meta={...(rec.meta||{}),syncState:'error',lastSyncError:String(r?.error||'Сервер не подтвердил приём')};await updateDraft(rec);await logActivity('sync_error',rec,rec.meta.lastSyncError)}}}catch(e){r={event_id:x.id,ok:false,error:String(e?.message||e)};results.push(r);const rec=await getDraft(x.id);if(rec){rec.meta={...(rec.meta||{}),syncState:'error',lastSyncError:r.error};await updateDraft(rec);await logActivity('sync_error',rec,r.error)}}}await refreshPending();if(results.some(r=>r?.ok&&r?.server_received&&(r?.operation_id||r?.order_id))){await autoRefreshData('post-sync')}if(document.getElementById('sync').classList.contains('active'))await renderSync();if(document.getElementById('appdev')?.classList.contains('active'))await renderAppDev();if(opts.notify){const ok=results.filter(r=>r?.ok&&r?.server_received).length;const bad=results.length-ok;alert(waitingHeavy?`Синхронизация: подтверждено ${ok}${bad?`, требуют проверки ${bad}`:''}. Тяжёлых файлов ждут Wi‑Fi: ${waitingHeavy}.`:ok&&bad===0?`Сервер подтвердил приём: ${ok}. Записи перенесены в историю.`:`Синхронизация: подтверждено ${ok}${bad?`, требуют проверки ${bad}`:''}. Неподтверждённые записи остаются локально.`)}return {ok:true,count:results.length,results,waitingHeavy}}finally{backendState.syncing=false}}
async function syncDraftById(id){const token=backendSession();if(!token)return {ok:false,error:'NO_SESSION'};const x=await getDraft(id);if(!x||draftState(x)!=='ready'||!navigator.onLine)return {ok:false,error:'NOT_READY'};if(heavyDraft(x)&&!wifiConfirmed()&&!allowHeavyManual())return {ok:false,error:'WAIT_WIFI'};const seen=await checkEventStatus(x.id,token);if(seen?.server_received){await rememberDelivered(x,seen);await deleteDraftDirect(x.id);await refreshPending();if(document.getElementById('sync').classList.contains('active'))await renderSync();return seen}await logActivity(x.meta?.syncState==='error'?'ack_recheck':'sync_started',x);const r=await syncEventWithRetry(x,token,2);if(r?.ok&&r?.server_received){await rememberDelivered(x,r);await deleteDraftDirect(x.id);await refreshPending();if(document.getElementById('sync').classList.contains('active'))await renderSync();return r}const rec=await getDraft(id);if(rec){rec.meta={...(rec.meta||{}),syncState:'error',lastSyncError:String(r?.error||'Сервер не подтвердил приём')};await updateDraft(rec);await logActivity('sync_error',rec,rec.meta.lastSyncError)}await refreshPending();if(document.getElementById('sync').classList.contains('active'))await renderSync();return r}
function backendAccessLabel(){if(backendSession())return 'сессия активна';if(lsGet(BACKEND_KEYS.request))return 'заявка PENDING / ждёт одобрения';return 'устройство не подключено'}
































































































































































































































































const fmt=n=>n==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n); const rub=n=>n==null?'—':fmt(n)+' ₽'; const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function go(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(id).classList.add('active');document.getElementById('pageTitle').textContent=titles[id]||'Производство';document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.screen===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='home')renderHome();if(id==='checklists')renderChecklists();if(id==='sync')renderSync();if(id==='wallet')renderWallet();if(id==='nom')renderNom();if(id==='avito')renderAvito();if(id==='gallery')renderGallery();if(id==='admin')renderAdmin();if(id==='activityLog')renderActivityLog();if(id==='analytics')renderAnalytics();if(id==='calculator')renderCalculator();if(id==='salesAnalytics')renderSalesAnalytics();if(id==='appdev')renderAppDev();}
function badge(text,kind=''){return `<span class="badge ${kind}">${esc(text)}</span>`}
function orderImage(o,cls='order-img'){if(typeof o.image==='string'&&o.image)return `<img class="${cls}" src="${o.image}" alt="${esc(o.name)}" loading="lazy">`;const media=Array.isArray(o.images)?o.images.filter(x=>x&&typeof x==='object'&&x.mediaId):[];return media.length?`<div class="order-placeholder order-media-card" id="order-card-media-${domSafe(o.id)}"><span>📷</span><small>${media.length}</small></div>`:`<div class="order-placeholder">${esc(o.id.slice(-3))}</div>`}
function calcFor(id){return S.calculations[id]||null}
function actionIcon(type){
 const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
 const icons={
  photo:`<svg ${common}><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>`,
  screenshot:`<svg ${common}><path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/><rect x="8" y="8" width="8" height="8" rx="1.5"/></svg>`,
  mic:`<svg ${common}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"/></svg>`,
  note:`<svg ${common}><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>`,
  money:`<svg ${common}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M17 14h.01"/><circle cx="12" cy="12" r="2.3"/></svg>`,
  document:`<svg ${common}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>`,
  finished:`<svg ${common}><rect x="3.5" y="6" width="17" height="13" rx="2"/><circle cx="9" cy="12" r="2.2"/><path d="M13 14l2-2 3 3M16.5 3.5v4M14.5 5.5h4"/></svg>`
 };
 return `<span class="action-icon">${icons[type]||''}</span>`;
}
function actionButton(label,icon,handler,extra=''){return `<button class="quick-action ${extra}" onclick="${handler}"><span class="action-label">${label}</span>${actionIcon(icon)}</button>`}
function standardActions(context,id,noteTitle='Заметка'){
 const c=String(context||'general').replace(/'/g,"\\'"); const oid=String(id||'').replace(/'/g,"\\'"); const nt=String(noteTitle||'Заметка').replace(/'/g,"\\'");
 return `<div class="std-actions visual-actions">${actionButton('Фото','photo',`pickPhoto('${c}','${oid}')`)}${actionButton('Скриншот','screenshot',`pickScreenshot('${c}','${oid}')`)}${actionButton('Диктофон','mic',`toggleVoice('${c}','${oid}')`)}${actionButton('Заметка','note',`contextNote('${c}','${oid}','${nt}')`)}</div>`;
}
function homeActionGrid(){return `<div class="std-actions visual-actions home-action-grid">${actionButton('Фото','photo',`pickPhoto('general','')`)}${actionButton('Скриншот','screenshot',`pickScreenshot('general','')`)}${actionButton('Диктофон','mic',`toggleVoice('general','')`)}${actionButton('Заметка','note',`contextNote('general','','Заметка')`)}${actionButton('Доход / расход','money',`walletModal()`,'long-label')}${actionButton('Документ','document',`pickDocument('general','')`)}${actionButton('Фото готового изделия','finished',`galleryCandidateModal()`,'long-label')}</div>`}
function orderActionGrid(id){const oid=String(id||'').replace(/'/g,"\\'");return `<div class="std-actions visual-actions order-action-grid">${actionButton('Фото','photo',`pickPhoto('order','${oid}')`)}${actionButton('Скриншот','screenshot',`pickScreenshot('order','${oid}')`)}${actionButton('Диктофон','mic',`toggleVoice('order','${oid}')`)}${actionButton('Заметка','note',`contextNote('order','${oid}','Заметка к заказу')`)}${actionButton('Доход / расход','money',`walletModal('${oid}')`,'long-label')}${actionButton('Фото готового изделия','finished',`galleryCandidateForOrder('${oid}')`,'long-label')}</div>`}
function contextNote(context,id,title='Заметка'){noteCtx={context,id};modal(title,`<div class="field"><label>Текст</label><textarea id="contextNoteText" placeholder="Что нужно запомнить / передать в систему"></textarea></div><button class="primary" onclick="saveContextNote()">Сохранить офлайн</button>`)}
let noteCtx={context:'general',id:''};
async function saveContextNote(){const text=(document.getElementById('contextNoteText')?.value||'').trim();if(!text)return;await putDraft({kind:'note',objectId:noteCtx.id||'',text,context:noteCtx.context||'general'});closeModal();await refreshPending();if(document.getElementById('wallet').classList.contains('active'))renderWallet();if(document.getElementById('buy').classList.contains('active'))renderBuy();if(document.getElementById('avito').classList.contains('active'))renderAvito();}
































































































































































































































































let currentChecklistId='';
async function allChecklists(){const db=await openDB();const tx=db.transaction('checklists','readonly');const r=tx.objectStore('checklists').getAll();return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function getChecklist(id){const db=await openDB();const tx=db.transaction('checklists','readonly');const r=tx.objectStore('checklists').get(id);return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function saveChecklistRecord(rec){const db=await openDB();const tx=db.transaction('checklists','readwrite');tx.objectStore('checklists').put(rec);return new Promise((res,rej)=>{tx.oncomplete=()=>res(rec);tx.onerror=()=>rej(tx.error)})}
async function nextChecklistId(){const rows=await allChecklists(),year=new Date().getFullYear();let max=0;for(const r of rows){const m=String(r.id||'').match(new RegExp('^CL-'+year+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1])||0)}return `CL-${year}-${String(max+1).padStart(3,'0')}`}
function checklistProgress(c){const items=c.items||[],done=items.filter(x=>x.done).length;return {done,total:items.length,pct:items.length?Math.round(done/items.length*100):0}}
function checklistPerm(key){return isAdmin1()||hasPermission(key)}
async function renderChecklists(){if(!checklistPerm('checklists.view')){document.getElementById('checklists').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="risk">Нет права просмотра чек-листов.</div>`;return}if(currentChecklistId){const c=await getChecklist(currentChecklistId);if(c){renderChecklistDetail(c);return}currentChecklistId=''}const rows=(await allChecklists()).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));window.__checklistRows=rows;document.getElementById('checklists').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="checklists-head"><div><h2>Чек-листы</h2><p>Рабочие списки по заказам и задачам. Найдите по ID или названию и отмечайте пункты прямо по ходу работы.</p></div>${checklistPerm('checklists.create')?`<button class="checklist-create" onclick="createChecklistModal()">+ Создать</button>`:''}</div><div class="checklist-search"><input id="checklistSearch" placeholder="Найти по CL-2026-001 или названию" oninput="filterChecklists()"></div><div class="checklist-hint"><b>ID чек-листа постоянный.</b> Позже этот ID можно будет отправлять пользователю через Google Chat; межпользовательскую выдачу подключим на backend-этапе.</div><div id="checklistList">${rows.length?rows.map(checklistListCard).join(''):`<div class="empty">Чек-листов пока нет. Создайте первый.</div>`}</div>`}
function checklistListCard(c){const p=checklistProgress(c);return `<button class="checklist-card" data-checklist-search="${esc((c.id+' '+c.title+' '+(c.orderId||'')+' '+(c.assignee||'')).toLowerCase())}" onclick="openChecklist('${esc(c.id)}')"><div class="checklist-card-top"><span class="checklist-id">${esc(c.id)}</span><span class="checklist-progress">${p.done}/${p.total}</span></div><b>${esc(c.title||'Без названия')}</b><small>${c.orderId?`Заказ ${esc(c.orderId)}`:'Без заказа'}${c.assignee?` · ${esc(c.assignee)}`:''}</small><div class="checklist-bar"><i style="width:${p.pct}%"></i></div></button>`}
function filterChecklists(){const q=String(document.getElementById('checklistSearch')?.value||'').trim().toLowerCase();document.querySelectorAll('#checklistList .checklist-card').forEach(el=>el.classList.toggle('hidden',q&&!String(el.dataset.checklistSearch||'').includes(q)))}
async function openChecklist(id){currentChecklistId=String(id||'');await renderChecklists();window.scrollTo({top:0,behavior:'smooth'})}
async function backToChecklistList(){currentChecklistId='';await renderChecklists();window.scrollTo({top:0,behavior:'smooth'})}
function renderChecklistDetail(c){const p=checklistProgress(c),pending=(c.items||[]).filter(x=>!x.done),done=(c.items||[]).filter(x=>x.done),canEdit=checklistPerm('checklists.edit');document.getElementById('checklists').innerHTML=`<div class="back-row"><button class="back checklist-back" onclick="backToChecklistList()">← Чек-листы</button><button class="back back-home-secondary" onclick="go('home')">⌂ Главная</button></div><div class="checklist-detail-head"><span class="checklist-id">${esc(c.id)}</span><h2>${esc(c.title||'Без названия')}</h2><p>${c.orderId?`Заказ ${esc(c.orderId)}`:'Без заказа'}${c.assignee?` · Исполнитель: ${esc(c.assignee)}`:''}</p><div class="checklist-total">Выполнено ${p.done} из ${p.total}</div></div><div class="checklist-items">${pending.length?pending.map(x=>checklistItemRow(c,x,false,canEdit)).join(''):`<div class="empty compact">Нет открытых пунктов.</div>`}</div>${canEdit?`<div class="checklist-add"><input id="newChecklistItem" placeholder="Новый пункт"><button onclick="addChecklistItem('${esc(c.id)}')">+</button></div>`:''}<button class="checked-toggle" onclick="toggleCheckedBlock()"><span>⌄</span> Отмечено: ${done.length}</button><div id="checkedChecklistItems" class="checklist-items checked-items">${done.map(x=>checklistItemRow(c,x,true,canEdit)).join('')}</div>`}
function checklistItemRow(c,x,done,canEdit){return `<div class="checklist-item ${done?'done':''}"><span class="checklist-grip">⋮⋮</span><button class="check-box ${done?'checked':''}" onclick="toggleChecklistItem('${esc(c.id)}','${esc(x.id)}')" ${canEdit?'':'disabled'}>${done?'✓':''}</button><span class="checklist-item-text">${esc(x.text)}</span>${canEdit?`<button class="checklist-remove" onclick="removeChecklistItem('${esc(c.id)}','${esc(x.id)}')">×</button>`:''}</div>`}
function toggleCheckedBlock(){document.getElementById('checkedChecklistItems')?.classList.toggle('collapsed')}
function createChecklistModal(){if(!checklistPerm('checklists.create'))return;const users=assignableUsers();modal('Создать чек-лист',`<div class="field"><label>Название</label><input id="clTitle" placeholder="Например: Сборка ТВ-тумбы"></div><div class="field"><label>Заказ</label><select id="clOrder"><option value="">Без заказа</option>${(S.orders||[]).map(o=>`<option value="${esc(o.id)}">${esc(o.id)} · ${esc(o.name)}</option>`).join('')}</select></div><div class="field"><label>Исполнитель</label><select id="clAssignee"><option value="">Не назначен</option>${users.map(u=>`<option value="${esc(u.name||u.user_id)}">${esc(u.name||u.user_id)}</option>`).join('')}</select></div><div class="field"><label>Первые пункты — по одному в строке</label><textarea id="clItems" placeholder="Собрать каркас\nКупить дерево\nПроверить размеры"></textarea></div><button class="primary" onclick="saveNewChecklist()">Создать чек-лист</button>`)}
async function saveNewChecklist(){const title=String(document.getElementById('clTitle')?.value||'').trim();if(!title){alert('Укажите название чек-листа.');return}const id=await nextChecklistId(),now=new Date().toISOString(),lines=String(document.getElementById('clItems')?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);const rec={id,title,orderId:String(document.getElementById('clOrder')?.value||''),assignee:String(document.getElementById('clAssignee')?.value||''),createdAt:now,updatedAt:now,items:lines.map(t=>({id:crypto.randomUUID(),text:t,done:false,doneAt:''}))};await saveChecklistRecord(rec);await logActivity('checklist_created',{id,kind:'checklist',objectId:id,context:'checklists'},title);closeModal();currentChecklistId=id;await renderChecklists()}
async function addChecklistItem(cid){if(!checklistPerm('checklists.edit'))return;const input=document.getElementById('newChecklistItem'),text=String(input?.value||'').trim();if(!text)return;const c=await getChecklist(cid);if(!c)return;c.items=[...(c.items||[]),{id:crypto.randomUUID(),text,done:false,doneAt:''}];c.updatedAt=new Date().toISOString();await saveChecklistRecord(c);await logActivity('checklist_item_added',{id:cid,kind:'checklist',objectId:cid,context:'checklists'},text);await renderChecklists()}
async function toggleChecklistItem(cid,itemId){if(!checklistPerm('checklists.edit'))return;const c=await getChecklist(cid);if(!c)return;const x=(c.items||[]).find(i=>i.id===itemId);if(!x)return;x.done=!x.done;x.doneAt=x.done?new Date().toISOString():'';c.updatedAt=new Date().toISOString();await saveChecklistRecord(c);await logActivity(x.done?'checklist_item_done':'checklist_item_reopened',{id:cid,kind:'checklist',objectId:cid,context:'checklists'},x.text);await renderChecklists()}
async function removeChecklistItem(cid,itemId){if(!checklistPerm('checklists.edit'))return;const c=await getChecklist(cid);if(!c)return;const x=(c.items||[]).find(i=>i.id===itemId);c.items=(c.items||[]).filter(i=>i.id!==itemId);c.updatedAt=new Date().toISOString();await saveChecklistRecord(c);await logActivity('checklist_item_deleted',{id:cid,kind:'checklist',objectId:cid,context:'checklists'},x?.text||'');await renderChecklists()}
































































































































































































































































function dataFreshnessHtml(){const has=(S.orders||[]).length||(S.nomenclature||[]).length;if(!has)return '<div class="sync-note"><b>Рабочих данных на устройстве пока нет.</b> Откройте «Загрузки» и выполните первое подключение.</div>';const src=DATA_STATE.source==='server'?'сервер':DATA_STATE.source==='cache'?'локальная копия':'локальные данные';const stamp=DATA_STATE.lastPullAt||DATA_STATE.lastCacheAt||'';const when=stamp?new Date(stamp).toLocaleString('ru-RU'):'';return `<div class="sync-note"><b>Данные доступны офлайн.</b> Источник: ${src}${when?' · '+esc(when):''}. Заказы: ${(S.orders||[]).length} · Номенклатура: ${(S.nomenclature||[]).length}.</div>`}
async function renderHome(){const local=await drafts();document.getElementById('home').innerHTML=`${dataFreshnessHtml()}
<div class="home-tiles"><button class="home-tile orders-card" onclick="go('orders')"><b>Заказы</b></button><button class="home-tile wallet-card" onclick="go('wallet')"><b>Кошелёк</b></button><button class="home-tile gallery-card" onclick="go('gallery')"><b>Галерея</b></button></div>
<button class="wide-action buy-action" onclick="go('buy')"><b>Закупки по заказам</b></button>
<button class="wide-action analytics-action" onclick="go('analytics')"><b>Общая информация</b></button>
<button class="wide-action calculator-action" onclick="go('calculator')"><b>Калькулятор заказов</b></button>
<button class="wide-action sales-analytics-action" onclick="go('salesAnalytics')"><b>Аналитика продаж</b></button>
<button class="wide-action uploads-action" onclick="go('sync')"><b>Загрузки</b></button>
<div class="section-title"><h2>Быстро добавить информацию</h2><span class="badge">офлайн</span></div>${homeActionGrid()}
${isAdmin1()?`<button class="settings-button" onclick="go('admin')"><b>Настройки</b><span>пользователи · права · восстановление ADMIN1</span></button>`:''}`;}
function uploadAttention(local){const errors=local.filter(x=>x.meta?.syncState==='error').length,ready=local.filter(x=>draftState(x)==='ready'&&x.meta?.syncState!=='error').length;return {errors,ready,total:errors+ready}}
function homeAttentionCard(local){const up=uploadAttention(local);const noDeadline=(S.orders||[]).filter(o=>!o.deadline).length;const unknown=Object.values(S.calculations||{}).flatMap(c=>c.lines||[]).filter(l=>l.amount==null||(l.comment||'').toUpperCase().includes('ПРЕДПОЛОЖЕНИЕ')).length;const gallery=local.filter(x=>x.context==='portfolio-candidate').length;const items=[];let target='orders';if(up.errors){items.push(`${up.errors} загрузок с ошибкой / без подтверждения`);target='sync'}else if(up.ready){items.push(`${up.ready} загрузок готовы к отправке`);target='sync'}if(noDeadline)items.push(`${noDeadline} заказов без назначенного срока`);if(unknown)items.push(`${unknown} позиций расчёта требуют уточнения`);if(gallery)items.push(`${gallery} кандидатов ждут отбора в Галерею`);if(!items.length)return '';return `<button class="attention-card" onclick="go('${target}')"><span><b>Требует внимания</b><small>${items.slice(0,3).map(esc).join(' · ')}</small></span><strong>${items.length}</strong></button>`}
const ORDER_MEDIA_CACHE='production-order-media-v1';
const ORDER_OFFLINE_PACK_KEY='prodOfflineOrderPacksV1';
const ORDER_MEDIA_AUTO_PACK_MAX_BYTES=15*1024*1024;
const ORDER_MEDIA_AUTO_PACK_MAX_FILES=25;
function domSafe(v){return String(v||'').replace(/[^A-Za-z0-9_-]/g,'_')}
function orderMediaItems(o){return Array.isArray(o?.images)?o.images.filter(x=>x&&typeof x==='object'&&x.mediaId):[]}
function orderMediaKey(m){const id=encodeURIComponent(String(m?.mediaId||'')),v=encodeURIComponent(String(m?.modifiedAt||''));return new Request(location.origin+'/__order_media_cache__/'+id+'?v='+v,{method:'GET'})}
function offlinePackIds(){try{const a=JSON.parse(lsGet(ORDER_OFFLINE_PACK_KEY)||'[]');return Array.isArray(a)?a.map(String):[]}catch(_){return []}}
function orderOfflinePinned(orderId){return offlinePackIds().includes(String(orderId))}
function setOrderOfflinePinned(orderId,on){const s=new Set(offlinePackIds());if(on)s.add(String(orderId));else s.delete(String(orderId));lsSet(ORDER_OFFLINE_PACK_KEY,JSON.stringify([...s]));return on}
function mediaAutoAllowed(){const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;return navigator.onLine!==false&&!c?.saveData}
function mediaPackSmallEnough(items){const total=(items||[]).reduce((sum,m)=>sum+Math.max(0,Number(m?.size||0)),0);return items.length<=ORDER_MEDIA_AUTO_PACK_MAX_FILES&&total<=ORDER_MEDIA_AUTO_PACK_MAX_BYTES}
async function getCachedOrderMedia(m){if(!m?.mediaId||!('caches' in window))return null;try{const c=await caches.open(ORDER_MEDIA_CACHE),r=await c.match(orderMediaKey(m));return r?await r.blob():null}catch(_){return null}}
async function putCachedOrderMedia(m,b){if(!m?.mediaId||!(b instanceof Blob)||!('caches' in window))return false;try{const c=await caches.open(ORDER_MEDIA_CACHE);await c.put(orderMediaKey(m),new Response(b,{headers:{'Content-Type':b.type||m.mimeType||'application/octet-stream','X-Order-Media-Cached-At':new Date().toISOString()}}));const keys=await c.keys();if(keys.length>220){for(const k of keys.slice(0,keys.length-200))await c.delete(k)}return true}catch(_){return false}}
function base64Blob(b64,mime){const raw=atob(String(b64||'')),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return new Blob([a],{type:mime||'application/octet-stream'})}
async function downloadOrderMedia(orderId,m,mode='auto'){if(!m?.mediaId)return null;const cached=await getCachedOrderMedia(m);if(cached)return cached;if(!backendSession())return null;if(mode==='auto'&&!mediaAutoAllowed())return null;if(navigator.onLine===false)return null;try{const d=await backendPost({action:'order.media.get',session_token:backendSession(),device_id:backendDeviceId(),order_id:orderId,media_id:m.mediaId,app_version:APP_RELEASE.version},{timeoutMs:30000});if(!d?.ok||!d?.media?.base64)return null;const b=base64Blob(d.media.base64,d.media.mimeType||m.mimeType);await putCachedOrderMedia({...m,modifiedAt:d.media.modifiedAt||m.modifiedAt},b);return b}catch(_){return null}}
async function paintOrderMediaNode(orderId,m,node,mode='auto'){if(!node)return false;let b=await getCachedOrderMedia(m);let source='cache';if(!b){b=await downloadOrderMedia(orderId,m,mode);source='server'}if(!b)return false;const u=blobUrl(b);node.innerHTML=`<img class="photo-large" src="${u}" alt="Фото ${esc(orderId)}" loading="lazy"><span class="order-media-source">${source==='cache'?'офлайн':'загружено'}</span>`;node.classList.add('loaded');return true}
async function cacheOrderMediaPack(orderId,opts={}){const o=S.orders.find(x=>x.id===orderId);if(!o)return {ok:false,count:0};const items=orderMediaItems(o);if(!items.length)return {ok:true,count:0};const all=opts.all===true,limit=all?items.length:Math.min(3,items.length);let count=0;for(let i=0;i<limit;i++){const m=items[i],node=document.getElementById('order-media-'+domSafe(m.mediaId));const b=node?await paintOrderMediaNode(orderId,m,node,all?'manual':'auto'):await downloadOrderMedia(orderId,m,all?'manual':'auto');if(b)count++}return {ok:count===limit,count,total:limit}}
async function hydrateOrderMedia(orderId){const o=S.orders.find(x=>x.id===orderId);if(!o)return;const items=orderMediaItems(o);if(!items.length)return;for(const m of items){const node=document.getElementById('order-media-'+domSafe(m.mediaId));if(!node)continue;const cached=await getCachedOrderMedia(m);if(cached){const u=blobUrl(cached);node.innerHTML=`<img class="photo-large" src="${u}" alt="Фото ${esc(orderId)}" loading="lazy"><span class="order-media-source">офлайн</span>`;node.classList.add('loaded')}}if(navigator.onLine!==false&&mediaAutoAllowed()){const shouldPackAll=orderOfflinePinned(orderId)||mediaPackSmallEnough(items);await cacheOrderMediaPack(orderId,{all:shouldPackAll})}}
window.loadOrderMediaItem=async function(orderId,mediaId){const o=S.orders.find(x=>x.id===orderId),m=orderMediaItems(o).find(x=>x.mediaId===mediaId),node=document.getElementById('order-media-'+domSafe(mediaId));if(!m||!node)return;node.classList.add('loading');const ok=await paintOrderMediaNode(orderId,m,node,'manual');node.classList.remove('loading');if(!ok)alert(navigator.onLine===false?'Сети нет, а это фото ещё не сохранено на телефоне.':'Фото не загрузилось с сервера. Повторите ещё раз; локальные данные заказа не пострадают.')};
window.loadAllOrderMedia=async function(orderId){if(navigator.onLine===false){alert('Для первой загрузки всех фото нужна сеть. Уже сохранённые фото доступны офлайн.');return}const r=await cacheOrderMediaPack(orderId,{all:true});if(!r.ok)alert('Часть фото не загрузилась. Можно повторить — уже сохранённые файлы повторно не скачиваются.')};
window.toggleOrderOfflinePack=async function(orderId){const was=orderOfflinePinned(orderId);setOrderOfflinePinned(orderId,!was);const btn=document.getElementById('offline-pack-'+domSafe(orderId));if(btn)btn.textContent=!was?'Офлайн включён':'Хранить офлайн';if(!was&&navigator.onLine!==false){const r=await cacheOrderMediaPack(orderId,{all:true});if(!r.ok)alert('Офлайн-режим включён. Часть фото догрузится при следующей связи.')}};
async function refreshPinnedOfflinePacks(){if(navigator.onLine===false||!backendSession())return;for(const id of offlinePackIds()){const o=S.orders.find(x=>x.id===id);if(o)await cacheOrderMediaPack(id,{all:true})}}
async function hydrateOrderCardMedia(){for(const o of S.orders||[]){const m=orderMediaItems(o)[0];if(!m)continue;const node=document.getElementById('order-card-media-'+domSafe(o.id));if(!node)continue;const b=await getCachedOrderMedia(m);if(b){node.innerHTML=`<img class="order-img" src="${blobUrl(b)}" alt="${esc(o.name)}" loading="lazy">`;node.classList.add('loaded')}}}
function orderMediaStrip(o){const items=orderMediaItems(o);if(!items.length){if(typeof o.image==='string'&&o.image)return `<div class="photo-strip"><img class="photo-large" src="${o.image}" alt="референс" loading="lazy"></div>`;return '<div class="order-media-empty">Фото на устройстве пока не загружены.</div>'}const pinned=orderOfflinePinned(o.id);return `<div class="order-media-head"><b>Фото заказа · ${items.length}</b><div><button class="secondary" id="offline-pack-${domSafe(o.id)}" onclick="toggleOrderOfflinePack('${esc(o.id)}')">${pinned?'Офлайн включён':'Хранить офлайн'}</button><button class="secondary" onclick="loadAllOrderMedia('${esc(o.id)}')">Загрузить все</button></div></div><div class="photo-strip order-media-strip">${items.map((m,i)=>`<button class="order-media-slot" id="order-media-${domSafe(m.mediaId)}" onclick="loadOrderMediaItem('${esc(o.id)}','${esc(m.mediaId)}')"><span>📷</span><small>${i<3?'загрузится автоматически':'нажмите для загрузки'}</small></button>`).join('')}</div>`}
































































































































function orderCard(o){const c=calcFor(o.id),known=c?rub(c.knownTotal):'расчёта нет',author=o.createdByName||o.createdByUserId||'',canEdit=canMutateRecord('orders','update',o.createdByUserId),canDelete=canMutateRecord('orders','delete',o.createdByUserId);return `<article class="order-card" onclick="openOrder('${o.id}')">${orderImage(o)}<div class="grow"><div class="title order-title-one-line">${esc(o.id)} · ${esc(o.name)}</div><div class="order-card-meta"><div class="stage">${esc(o.stage||o.status)}</div>${o.deadline?badge(o.deadline):badge('без срока','warn')}</div><div class="sub"><span>${c?'Расчёт '+esc(c.version)+' · '+known:'Сбор исходных данных'}</span><span>${o.clientPrice?rub(o.clientPrice):''}</span></div>${author?`<div class="record-author">создал: ${esc(author)}</div>`:''}${canEdit||canDelete?`<div class="record-actions" onclick="event.stopPropagation()">${canEdit?`<button onclick="editOrderRecord('${esc(o.id)}')">Изменить</button>`:''}${canDelete?`<button class="danger" onclick="deleteOrderRecord('${esc(o.id)}')">Удалить</button>`:''}</div>`:''}</div></article>`}
let step2MediaFiles=[];let step2MediaMode='';
function resetStep2Media(mode=''){step2MediaFiles=[];step2MediaMode=mode;updateStep2MediaLabel()}
function chooseStep2Media(mode){step2MediaMode=mode;document.getElementById('step2MediaInput')?.click()}
function updateStep2MediaLabel(){const el=document.getElementById('step2MediaLabel');if(el)el.textContent=step2MediaFiles.length?`Выбрано фото: ${step2MediaFiles.length}`:'Фото не выбраны'}
const step2MediaInput=document.getElementById('step2MediaInput');if(step2MediaInput)step2MediaInput.addEventListener('change',e=>{const files=[...(e.target.files||[])].slice(0,8);if(step2MediaMode==='appdev-admin'){APPDEV_ADMIN_NEW_MEDIA=files;const lab=document.getElementById('appDevAdminMediaLabel');if(lab)lab.textContent=files.length?`Новых изображений: ${files.length}`:'Новых изображений нет'}else{step2MediaFiles=files;updateStep2MediaLabel()}e.target.value=''});
function attachmentRecords(files){return (files||[]).slice(0,8).map(f=>({name:f.name||('photo-'+Date.now()+'.jpg'),mime:f.type||'image/jpeg',size:f.size||0,blob:f}))}
function newOrderModal(){if(!hasPermission('orders.create')){showAppToast('Нет права создавать заказы.','bad',3600);return}resetStep2Media('order');modal('Новый заказ',`<div class="field"><label>Название заказа</label><input id="newOrderTitle" placeholder="Например: Стеллаж"></div><div class="field"><label>Описание</label><textarea id="newOrderDescription" placeholder="Что нужно изготовить"></textarea></div><div class="field"><label>Сумма заказа, ₽</label><input id="newOrderPrice" inputmode="decimal" placeholder="0"></div><div class="field"><label>Предоплата, ₽</label><input id="newOrderPrepay" inputmode="decimal" placeholder="0"></div><div class="field"><label>Срок сдачи</label><input id="newOrderDeadline" type="date"></div><div class="field"><label>Комментарий</label><textarea id="newOrderComment" placeholder="Дополнительная информация"></textarea></div><button class="secondary" onclick="chooseStep2Media('order')">Добавить фото</button><div class="hint" id="step2MediaLabel">Фото не выбраны</div><button class="primary" style="margin-top:10px" onclick="saveNewOrderDraft()">Создать заказ</button><div class="hint">Сначала запись сохраняется на телефоне. Через 5 минут приложение отправит её автоматически. Номер заказа присвоит сервер без риска дублей.</div>`)}
async function saveNewOrderDraft(){const title=(document.getElementById('newOrderTitle')?.value||'').trim(),description=(document.getElementById('newOrderDescription')?.value||'').trim(),price=Number(String(document.getElementById('newOrderPrice')?.value||'').replace(',','.'))||0,prepay=Number(String(document.getElementById('newOrderPrepay')?.value||'').replace(',','.'))||0,deadline=document.getElementById('newOrderDeadline')?.value||'',comment=(document.getElementById('newOrderComment')?.value||'').trim();if(!title){showAppToast('Укажите название заказа.','bad');return}if(prepay>price&&price>0){showAppToast('Предоплата не должна быть больше суммы заказа.','bad',4200);return}await putDraft({kind:'order-create',context:'order-create',objectId:'',text:title,attachments:attachmentRecords(step2MediaFiles),meta:{title,description,clientPrice:price||'',prepayment:prepay||0,deadline,comment}});resetStep2Media();closeModal();await refreshPending();showAppToast('Новый заказ сохранён. После подтверждения сервера ему будет присвоен номер.','ok',4600)}
function editOrderRecord(id){const o=(S.orders||[]).find(x=>String(x.id)===String(id));if(!o)return;modal('Изменить заказ '+esc(id),`<div class="field"><label>Название</label><input id="ordEditTitle" value="${esc(o.name||'')}"></div><div class="field"><label>Описание</label><textarea id="ordEditDescription">${esc(o.description||'')}</textarea></div><div class="field"><label>Сумма заказа</label><input id="ordEditPrice" inputmode="decimal" value="${esc(o.clientPrice??'')}"></div><div class="field"><label>Получено / предоплата</label><input id="ordEditReceived" inputmode="decimal" value="${esc(o.received??0)}"></div><div class="field"><label>Срок</label><input id="ordEditDeadline" placeholder="дд.мм.гггг" value="${esc(o.deadline||'')}"></div><div class="field"><label>Комментарий</label><textarea id="ordEditComment">${esc(o.comment||'')}</textarea></div><button class="primary" onclick="saveOrderRecord('${esc(id)}')">Сохранить</button>`)}
async function saveOrderRecord(id){const patch={title:(document.getElementById('ordEditTitle')?.value||'').trim(),description:(document.getElementById('ordEditDescription')?.value||'').trim(),client_price:(document.getElementById('ordEditPrice')?.value||'').trim(),received:(document.getElementById('ordEditReceived')?.value||'').trim(),deadline:(document.getElementById('ordEditDeadline')?.value||'').trim(),comment:(document.getElementById('ordEditComment')?.value||'').trim()};closeModal();await mutateRecord('order',id,'update',patch)}
async function deleteOrderRecord(id){if(!confirm('Удалить заказ из активных? Запись останется в master и аудите как архивная.'))return;await mutateRecord('order',id,'delete',{},'Архивировано из приложения')}

/* restored unchanged v0.3.8 modules after APP-Q014 staging read-back */
function sleep(ms){return new Promise(res=>setTimeout(res,ms))}
async function renderAnalytics(){const w=S.wallet;const orders=S.orders||[];const active=orders.length;const nod=orders.filter(o=>!o.deadline).length;const calcs=Object.values(S.calculations||{});const knownMaterials=calcs.reduce((a,c)=>a+(Number(c.knownTotal)||0),0);const q=await drafts();window.__draftCache=q;const hist=(await sentHistory()).sort((a,b)=>String(b.sentAt||'').localeCompare(String(a.sentAt||'')));const activity=(await activityHistory()).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));const nowMs=Date.now();const sent24=hist.filter(x=>{const ms=Date.parse(x.sentAt||'');return Number.isFinite(ms)&&(nowMs-ms)<=86400000}).length;const activity24=activity.filter(x=>{const ms=Date.parse(x.at||'');return Number.isFinite(ms)&&(nowMs-ms)<=86400000}).length;const photos=q.filter(x=>x.kind==='photo').length;const docs=q.filter(x=>x.kind==='document').length;const audios=q.filter(x=>x.kind==='audio').length;const notes=q.filter(x=>['note','order-note','calc-note','avito-note'].includes(x.kind)).length;const galleryCand=q.filter(x=>x.context==='portfolio-candidate').length;const avito=q.filter(x=>String(x.context||'').startsWith('avito')||x.kind==='avito-note');const quoteDrafts=q.filter(x=>x.kind==='quote-draft').length;const pubs=q.filter(x=>x.kind==='publish-draft');const publishDrafts=pubs.length;const approved=(S.gallery||[]).length;const obligations=w.futureExpenses||[];const countChannel=ch=>pubs.filter(x=>(x.meta?.channels||[]).includes(ch)).length;document.getElementById('analytics').innerHTML=`<button class="back" onclick="go('home')">← Главная</button>
<div class="analytics-kpis"><div class="kpi money"><span>Денег сейчас</span><b>${rub(w.balance)}</b><small>после обязательств ${rub(w.afterObligations)}</small></div><div class="kpi orders"><span>Активные заказы</span><b>${active}</b><small>${nod} без срока</small></div><div class="kpi costs"><span>Обязательства</span><b>${rub(w.futureTotal)}</b><small>${obligations.length} записей</small></div><div class="kpi media"><span>Загрузки</span><b>${q.length}</b><small>${photos} фото · ${audios} голос</small></div></div>
${homeAttentionCard(q)}
<div class="analytics-section money-section"><h3>Деньги</h3><div class="analytics-lines"><div><span>Остаток</span><b>${rub(w.balance)}</b></div><div><span>Доходы периода</span><b>${rub(w.income)}</b></div><div><span>Расходы периода</span><b>${rub(w.expense)}</b></div><div><span>Предстоящие доходы</span><b>${rub(w.futureIncome)}</b></div><div><span>Предстоящие расходы</span><b>${rub(w.futureTotal)}</b></div><div class="strong"><span>После обязательств</span><b>${rub(w.afterObligations)}</b></div></div>${obligations.length?`<div class="analytics-sublist">${obligations.map(x=>`<div><b>${esc(x.date)} · ${esc(x.category)}</b><span>${rub(x.amount)}</span><small>${esc(x.to||'')} · ${esc(x.status||'')}</small></div>`).join('')}</div>`:''}</div>
<div class="analytics-section orders-section"><h3>Заказы и сроки</h3><div class="analytics-lines"><div><span>Активных</span><b>${active}</b></div><div><span>Без срока</span><b>${nod}</b></div><div><span>Известные материалы по расчётам</span><b>${rub(knownMaterials)}</b></div></div><div class="analytics-sublist">${orders.map(o=>{const c=calcFor(o.id);return `<div><b>${esc(o.id)} · ${esc(o.name)}</b><span>${esc(o.deadline||'без срока')}</span><small>${esc(o.stage||o.status)}${c?' · расчёт '+esc(c.version)+' · '+rub(c.knownTotal):' · расчёта нет'}</small></div>`}).join('')}</div></div>
<div class="analytics-section media-section"><h3>Фото, голос, файлы, галерея</h3><div class="analytics-lines"><div><span>Фото / скриншоты ждут отправки</span><b>${photos}</b></div><div><span>Документы</span><b>${docs}</b></div><div><span>Голосовые записи</span><b>${audios}</b></div><div><span>Заметки / дополнения</span><b>${notes}</b></div><div><span>Кандидаты в Галерею</span><b>${galleryCand}</b></div><div><span>Одобрено в Галерее</span><b>${approved}</b></div><div><span>Предварительные расчёты</span><b>${quoteDrafts}</b></div><div><span>Черновики публикаций</span><b>${publishDrafts}</b></div></div></div>
<div class="analytics-section sales-inline"><h3>Продажи</h3><p class="muted">Полная текущая информация из раздела «Аналитика продаж».</p><button class="sales-channel avito-channel" onclick="go('avito')"><span><b>Avito</b><small>скриншоты · фото · заметки · голос · будущие карточки объявлений</small></span><strong>${avito.length}</strong></button><div class="sales-channel passive"><span><b>VK</b><small>материалы из Галереи приложения и будущая статистика публикаций</small></span><strong>${countChannel('VK')}</strong></div><div class="sales-channel passive"><span><b>Сайт</b><small>после запуска сайта — публикации и обращения</small></span><strong>${countChannel('SITE')}</strong></div><div class="sales-channel passive"><span><b>Telegram / MAX / Instagram</b><small>черновики публикаций и будущая статистика</small></span><strong>${countChannel('TELEGRAM')+countChannel('MAX')+countChannel('INSTAGRAM')}</strong></div><div class="hint"><b>Сейчас:</b> собираем исходные данные и черновики. Реальные просмотры, обращения, лиды и продажи появятся после интеграций.</div></div>
${(isAdmin1()||hasPermission('activity.view'))?`<div class="analytics-section admin-audit-section"><h3>Администратор</h3><button class="feature-card" onclick="go('activityLog')"><span><b>Журнал действий</b><small>действия пользователя · устройство · время · статус</small></span><span class="arr">›</span></button></div>`:''}
<div class="analytics-section system-section"><h3>Система</h3><div class="analytics-lines"><div><span>Версия приложения</span><b>${esc(APP_RELEASE.version)} · ${esc(APP_RELEASE.buildId)}</b></div><div><span>Снимок данных</span><b>${esc(S.meta.snapshotDate)}</b></div><div><span>Связь</span><b>${navigator.onLine?'Онлайн':'Офлайн'}</b></div><div><span>Backend</span><b>${S.meta.backendConnected?'включён':'пока выключен'}</b></div><div><span>Локальная очередь</span><b>${q.length}</b></div><div><span>Обновления</span><b>ADMIN1-first · manifest + service worker</b></div></div><div class="hint"><b>После публикации HTTPS-PWA:</b> новая версия будет устанавливаться централизованно без ручной пересылки HTML. Локальные рабочие данные IndexedDB обновлением не удаляются.</div></div>`
;}
function activityTone(action){if(action==='sync_error')return 'error';if(['delivered','gallery_approved'].includes(action))return 'success';if(['created','edited','send_now','sync_started','ack_recheck','correction_created'].includes(action))return 'warning';return 'local'}
function activityToneText(action){const t=activityTone(action);return t==='error'?'ошибка':t==='success'?'успешно':t==='warning'?'в работе':'локально'}
function activityRowHtml(x){const tone=activityTone(x.action);return `<div class="activity-log-row ${tone}"><div class="activity-log-head"><b>${esc(x.userName||x.userId||SESSION.name)} · ${esc(activityActionText(x.action))}</b><span class="activity-status ${tone}">${activityToneText(x.action)}</span></div><div class="activity-log-meta">${esc(x.at?new Date(x.at).toLocaleString('ru-RU'):'')} · ${esc(x.deviceId||'устройство')}</div><div class="activity-log-body">${esc(activityObjectLabel(x))}${x.detail?' · '+esc(x.detail):''}</div></div>`}
function openActivityLogForOrder(id){activityPresetOrder=String(id||'');go('activityLog')}
async function renderActivityLog(){if(!(isAdmin1()||hasPermission('activity.view'))){document.getElementById('activityLog').innerHTML='<div class="risk">Нет права просмотра журнала действий.</div>';return}const rows=(await activityHistory()).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));window.__activityRows=rows;const users=[...new Set(rows.map(x=>x.userName||x.userId).filter(Boolean))].sort();const orders=[...new Set(rows.map(x=>x.objectId).filter(x=>/^20\d\d-/.test(String(x||''))))].sort();const actions=[...new Set(rows.map(x=>x.action).filter(Boolean))].sort();document.getElementById('activityLog').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="analytics-head"><h2>Журнал действий</h2><p>Неизменяемая локальная история действий этого устройства. Серверная история всех пользователей будет объединена с этим экраном позже.</p></div><div class="activity-filters"><select id="afUser" onchange="applyActivityFilters()"><option value="">Все пользователи</option>${users.map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="afOrder" onchange="applyActivityFilters()"><option value="">Все заказы</option>${orders.map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="afAction" onchange="applyActivityFilters()"><option value="">Все действия</option>${actions.map(x=>`<option value="${esc(x)}">${esc(activityActionText(x))}</option>`).join('')}</select><select id="afStatus" onchange="applyActivityFilters()"><option value="">Все статусы</option><option value="error">Только ошибки</option><option value="success">Успешные</option><option value="warning">В работе</option><option value="local">Локальные</option></select><select id="afPeriod" onchange="applyActivityFilters()"><option value="all">Всё время</option><option value="1">24 часа</option><option value="7">7 дней</option><option value="30">30 дней</option></select></div><div class="section-title"><h2>События</h2><span id="activityFilteredCount" class="badge">${rows.length}</span></div><div id="activityLogRows"></div>`;if(activityPresetOrder){const el=document.getElementById('afOrder');if(el&&[...el.options].some(o=>o.value===activityPresetOrder))el.value=activityPresetOrder;activityPresetOrder=''}applyActivityFilters()}
function applyActivityFilters(){let rows=[...(window.__activityRows||[])];const user=document.getElementById('afUser')?.value||'',order=document.getElementById('afOrder')?.value||'',action=document.getElementById('afAction')?.value||'',status=document.getElementById('afStatus')?.value||'',period=document.getElementById('afPeriod')?.value||'all';if(user)rows=rows.filter(x=>(x.userName||x.userId)===user);if(order)rows=rows.filter(x=>String(x.objectId||'')===order);if(action)rows=rows.filter(x=>x.action===action);if(status)rows=rows.filter(x=>activityTone(x.action)===status);if(period!=='all'){const since=Date.now()-Number(period)*86400000;rows=rows.filter(x=>Date.parse(x.at||'')>=since)}const count=document.getElementById('activityFilteredCount');if(count)count.textContent=rows.length;const box=document.getElementById('activityLogRows');if(box)box.innerHTML=rows.length?rows.slice(0,300).map(activityRowHtml).join(''):'<div class="muted">По выбранным фильтрам событий нет.</div>'}
function orderActivityBlock(id,activity){const rows=activity.filter(x=>String(x.objectId||'')===String(id)).slice(0,6);return `<div class="order-activity"><div class="section-title"><h2>Последние события</h2><button class="text-link" onclick="openActivityLogForOrder('${String(id).replace(/'/g,"\\'")}')">Весь журнал</button></div>${rows.length?rows.map(x=>`<div class="order-event ${activityTone(x.action)}"><span class="activity-status ${activityTone(x.action)}">${activityToneText(x.action)}</span><div><b>${esc(activityActionText(x.action))}</b><small>${esc(x.at?new Date(x.at).toLocaleString('ru-RU'):'')}${x.detail?' · '+esc(x.detail):''}</small></div></div>`).join(''):'<div class="muted">По этому заказу локальных действий пока нет.</div>'}</div>`}
async function renderSalesAnalytics(){const all=await drafts();const avito=all.filter(x=>String(x.context||'').startsWith('avito')||x.kind==='avito-note');const pubs=all.filter(x=>x.kind==='publish-draft');const countChannel=ch=>pubs.filter(x=>(x.meta?.channels||[]).includes(ch)).length;document.getElementById('salesAnalytics').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><button class="sales-channel avito-channel" onclick="go('avito')"><span><b>Avito</b><small>скриншоты · фото · заметки · голос · будущие карточки объявлений</small></span><strong>${avito.length}</strong></button><div class="sales-channel passive"><span><b>VK</b><small>материалы из Галереи приложения и будущая статистика публикаций</small></span><strong>${countChannel('VK')}</strong></div><div class="sales-channel passive"><span><b>Сайт</b><small>после запуска сайта — публикации и обращения</small></span><strong>${countChannel('SITE')}</strong></div><div class="sales-channel passive"><span><b>Telegram</b><small>черновики публикаций</small></span><strong>${countChannel('TELEGRAM')}</strong></div><div class="sales-channel passive"><span><b>MAX</b><small>черновики публикаций</small></span><strong>${countChannel('MAX')}</strong></div><div class="sales-channel passive"><span><b>Instagram</b><small>черновики публикаций</small></span><strong>${countChannel('INSTAGRAM')}</strong></div>`}
function nextQuoteId(){let n=Number(localStorage.getItem('quoteCounter')||0)+1;localStorage.setItem('quoteCounter',String(n));return `Q-${String(S.meta.snapshotDate||'2026').slice(-4)}-${String(n).padStart(3,'0')}`}
function quoteStatusLabel(q){return q.meta?.resultTotal!=null?'Предварительно рассчитан':'Ждёт расчёта'}
async function renderCalculator(){const all=await drafts();const quotes=all.filter(x=>x.kind==='quote-draft').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));document.getElementById('calculator').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="calc-quick-head"><h2>Калькулятор заказов</h2><p>Для запросов клиентов, которые ещё не стали заказами. Быстро фиксируем исходные данные → получаем предварительную себестоимость → добавляем резерв 30% → при согласовании переводим в активный заказ.</p></div><button class="primary" onclick="newQuoteModal()">+ Новый предварительный расчёт</button><div class="rule-card"><b>Правила быстрого расчёта</b><span>Металл: порошковая окраска «Стандарт» по умолчанию, если явно не указано иное.</span><span>Дерево: если покрытие не указано — расчёт помечается «уточнить покрытие».</span><span>К предварительной оценке добавляется резерв 30% на неопределённость/форс-мажор. В активном заказе затем делается точный расчёт без подмены факта.</span></div><div class="section-title"><h2>Черновики</h2><span class="badge">${quotes.length}</span></div>${quotes.length?quotes.map(quoteCard).join(''):`<div class="empty">Черновиков пока нет. Создайте предварительный запрос — он не попадёт в активные заказы.</div>`}`}
function newQuoteModal(){modal('Новый предварительный расчёт',`<div class="field"><label>Что нужно изготовить</label><textarea id="quoteText" placeholder="Например: табуретка, каркас из профильной трубы 20×20×1,5, сиденье сосна, размер 400×400×450, 4 шт"></textarea></div><div class="field"><label>Количество</label><input id="quoteQty" inputmode="numeric" value="1"></div><div class="field"><label>Покрытие / отделка</label><select id="quoteCoating"><option value="AUTO">Авто: металл — порошок Стандарт; дерево — уточнить</option><option value="NONE">Без покрытия</option><option value="CUSTOM">Указано в описании / своё</option></select></div><div class="field"><label>Резерв быстрого расчёта</label><input value="30%" disabled></div><button class="primary" onclick="saveQuoteDraft()">Создать черновик</button>`)}
async function saveQuoteDraft(){const text=document.getElementById('quoteText')?.value.trim()||'';if(!text){alert('Опишите изделие.');return}const qty=Math.max(1,Number(document.getElementById('quoteQty')?.value||1));const coating=document.getElementById('quoteCoating')?.value||'AUTO';const qid=nextQuoteId();await putDraft({kind:'quote-draft',objectId:qid,text,context:'calculator',meta:{quoteId:qid,qty,coating,reservePct:30,status:'awaiting-ai'}});closeModal();await refreshPending();await renderCalculator()}
function quoteCard(q){const m=q.meta||{};const result=m.resultTotal!=null?`<div class="quote-result"><span>База ${rub(m.baseCost||0)}</span><span>Резерв ${m.reservePct||30}%</span><b>${rub(m.resultTotal)}</b></div>`:`<div class="quote-wait">После синхронизации ИИ рассчитает материалы и базовую оценку; сюда вернётся результат + 30%.</div>`;return `<article class="quote-card"><div class="between"><div><b>${esc(m.quoteId||q.objectId)}</b><small>${new Date(q.createdAt).toLocaleString('ru-RU')} · ${esc(quoteStatusLabel(q))}</small></div><span class="badge ${m.resultTotal!=null?'ok':'warn'}">${m.resultTotal!=null?'готов':'черновик'}</span></div><div class="quote-text">${esc(q.text)}</div><div class="quote-meta">Количество: ${fmt(m.qty||1)} · Резерв: ${m.reservePct||30}% · Покрытие: ${esc(m.coating==='AUTO'?'металл порошок / дерево уточнить':m.coating==='NONE'?'без покрытия':'по описанию')}</div>${result}${standardActions('quote',q.objectId,'Заметка к расчёту')}<div class="quote-actions">${m.resultTotal!=null?`<button class="primary" onclick="promoteQuote('${esc(q.id)}')">В активный заказ</button>`:`<button class="secondary" onclick="alert('После подключения backend этот черновик уйдёт на расчёт ИИ при синхронизации. Сейчас он уже сохранён локально.')">На расчёт</button>`}<button class="danger" onclick="deleteQuote('${esc(q.id)}')">Удалить</button></div></article>`}
async function deleteQuote(id){if(!confirm('Удалить предварительный расчёт?'))return;const rec=await getDraft(id);await deleteDraftDirect(id);if(rec)await logActivity('quote_deleted',rec);await refreshPending();await renderCalculator()}
async function promoteQuote(id){const a=await drafts();const q=a.find(x=>x.id===id);if(!q||q.meta?.resultTotal==null)return;await putDraft({kind:'quote-promote',objectId:q.objectId,text:`Перевести ${q.objectId} в активный заказ`,context:'calculator',meta:{sourceQuoteId:q.objectId}});alert('Запрос на перевод в активный заказ сохранён. В рабочей версии сервер создаст номер заказа и сохранит исходный предварительный расчёт в истории.');await refreshPending()}
let activityPresetOrder='';
function renderOrders(){document.getElementById('orders').innerHTML=`<button class="back" onclick="go('home')">← Главная</button>${hasPermission('orders.create')?'<button class="primary new-order-button" onclick="newOrderModal()">+ Новый заказ</button>':''}<div class="filters"><button class="chip active">Активные · ${S.orders.length}</button><button class="chip">По статусу</button><button class="chip">Без срока · ${S.orders.filter(o=>!o.deadline).length}</button></div>${S.orders.map(orderCard).join('')}`;setTimeout(()=>hydrateOrderCardMedia(),0)}
async function openOrder(id){resetTempUrls();const o=S.orders.find(x=>x.id===id); if(!o)return; const c=calcFor(id); let calc=''; if(c){calc=`<div class="calc-head"><h3>Замороженный расчёт ${esc(c.version)}</h3><b>${rub(c.knownTotal)}</b></div><div class="hint">Цены показаны именно на дату расчёта. Текущая Номенклатура может уже отличаться — это не переписывает историю расчёта.</div><div class="calc-table">${c.lines.map(calcLine).join('')}</div>`}else calc=`<div class="risk"><b>Расчёт ещё не начат</b>${esc(o.stage||'Сначала собрать исходные данные.')}</div>`; document.getElementById('orderDetail').innerHTML=`<div class="back-row"><button class="back" onclick="go('orders')">← Заказы</button><button class="back back-home-secondary" onclick="go('home')">⌂ Главная</button></div><div class="detail-head"><div class="muted">${esc(o.id)} · ${esc(o.status)}</div><h2>${esc(o.name)}</h2><div class="detail-grid"><div><small>Срок</small><b>${esc(o.deadline||'не назначен')}</b></div><div><small>Цена клиенту</small><b>${o.clientPrice?rub(o.clientPrice):'не задана'}</b></div><div><small>Этап</small><b>${esc(o.stage||'—')}</b></div></div></div>${orderMediaStrip(o)}<div class="desc">${esc(o.description)}</div>${calc}<div class="section-title"><h2>Добавить к заказу</h2><span class="badge">${esc(id)}</span></div>${orderActionGrid(id)}`;go('orderDetail');setTimeout(()=>hydrateOrderMedia(id),0)}
function calcLine(l){let change=''; if(l.price!=null&&l.currentPrice!=null&&Math.abs(l.price-l.currentPrice)>.001){change=`<div class="price-change">Сейчас в Номенклатуре: ${fmt(l.currentPrice)} ${esc(l.currentPriceBasis)} от ${esc(l.currentPriceDate)}. В этой версии расчёта сохранено: ${fmt(l.price)} ${esc(l.priceBasis)}.</div>`} let assum=''; if((l.comment||'').toUpperCase().includes('ПРЕДПОЛОЖЕНИЕ')) assum=`<div class="assumption">⚠ ${esc(l.comment)}</div>`; else if(l.amount==null) assum=`<div class="assumption unknown">⚠ Цена/позиция не определена: ${esc(l.comment||'требуется уточнение')}</div>`; return `<div class="calc-line"><div class="between"><div><div class="calc-name">${esc(l.name)}</div><div class="calc-meta">${esc(l.params)}<br>Нужно: ${fmt(l.qtyTech)} ${esc(l.unit)} · Купить: ${fmt(l.qtyBuy)} ${esc(l.buyUnit||l.unit)}${l.price!=null?` · Цена ${fmt(l.price)} ${esc(l.priceBasis||'')}`:''}${l.priceDate?` от ${esc(l.priceDate)}`:''}</div></div><div class="calc-money">${rub(l.amount)}</div></div>${change}${assum}</div>`}
































































































































































































































































async function renderGallery(){resetTempUrls();const all=await drafts(),serverApproved=S.gallery||[],localApproved=all.filter(x=>x.context==='gallery-approved-local'&&x.kind==='photo'),cand=all.filter(x=>x.context==='portfolio-candidate'),photos=cand.filter(x=>x.kind==='photo').length,pub=all.filter(x=>x.kind==='publish-draft');window.__galleryPubDrafts=pub;const approvedCount=serverApproved.length+localApproved.length;document.getElementById('gallery').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="mini-stats"><div><b>${approvedCount}</b><small>в Галерее</small></div><div><b>${cand.length}</b><small>кандидатов</small></div><div><b>${photos}</b><small>фото ждут отбора</small></div></div><div class="gallery-actions"><button class="primary attention-green" onclick="galleryCandidateModal()">+ Добавить в Галерею</button><button class="secondary attention-green" onclick="galleryShareModal()">Поделиться</button><button class="secondary attention-green" onclick="go('sync')">Загрузки</button></div><div class="hint"><b>Порядок:</b> Кандидат → Одобрено → черновик публикации → Опубликовано VK / Опубликовано сайт. Статус каждого канала хранится отдельно.</div><div class="section-title"><h2>Галерея приложения</h2><span class="badge">${approvedCount}</span></div>${approvedCount?`<div class="gallery-grid">${serverApproved.map((g,i)=>galleryServerTile(g,i)).join('')}${localApproved.map(g=>galleryLocalTile(g)).join('')}</div>`:`<div class="empty">Пока нет одобренных фото. Добавьте готовые изделия и подтвердите лучшие.</div>`}<div class="section-title"><h2>Кандидаты</h2><span class="badge">${cand.length}</span></div>${cand.length?`<div class="gallery-candidate-grid">${cand.sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt))).map(galleryCandidateItem).join('')}</div>`:`<div class="muted">Кандидатов пока нет.</div>`}<div class="section-title"><h2>Черновики публикаций</h2><span class="badge">${pub.length}</span></div>${pub.length?pub.sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt))).map(queueItem).join(''):`<div class="muted">Черновиков публикаций пока нет.</div>`}`;updateHoldCountdowns()}
function galleryChannelState(key,ch){const pubs=window.__galleryPubDrafts||[];const p=pubs.find(x=>(x.meta?.appGalleryItems||[]).includes(key)&&(x.meta?.channels||[]).includes(ch));if(p?.meta?.publishedChannels?.includes(ch))return 'published';if(p)return 'draft';return 'none'}
function galleryPubChips(key){const label=(ch,title)=>{const s=galleryChannelState(key,ch),txt=s==='published'?'опубликовано':s==='draft'?'черновик':'не опубликовано';return `<span class="pub-chip ${s}">${title}: ${txt}</span>`};return `<div class="gallery-pub-status">${label('VK','VK')}${label('SITE','Сайт')}${label('WHATSAPP','WhatsApp')}</div>`}
const GALLERY_FAV_KEY='prodGalleryFavoritesV1';
function galleryFavoriteKeys(){try{const a=JSON.parse(lsGet(GALLERY_FAV_KEY)||'[]');return new Set(Array.isArray(a)?a.map(String):[])}catch(_){return new Set()}}
function galleryIsFavorite(key){return galleryFavoriteKeys().has(String(key||''))}
function setGalleryFavorite(key,on){const set=galleryFavoriteKeys(),k=String(key||'');if(on)set.add(k);else set.delete(k);lsSet(GALLERY_FAV_KEY,JSON.stringify([...set]));return on}
let galleryLightboxKey='';
function openGalleryLightbox(src,key){galleryLightboxKey=String(key||'');const box=document.getElementById('galleryLightbox'),img=document.getElementById('galleryLightboxImg'),star=document.getElementById('galleryLightboxStar');if(img)img.src=String(src||'');if(star)star.textContent=galleryIsFavorite(galleryLightboxKey)?'★':'☆';if(box)box.classList.remove('hidden')}
function closeGalleryLightbox(){const box=document.getElementById('galleryLightbox'),img=document.getElementById('galleryLightboxImg');if(box)box.classList.add('hidden');if(img)img.removeAttribute('src');galleryLightboxKey=''}
function toggleGalleryLightboxFavorite(){if(!galleryLightboxKey)return;const on=!galleryIsFavorite(galleryLightboxKey);setGalleryFavorite(galleryLightboxKey,on);const star=document.getElementById('galleryLightboxStar');if(star)star.textContent=on?'★':'☆';showAppToast(on?'Добавлено в избранное':'Убрано из избранного','ok',1800)}
function galleryServerTile(g,i){const key=`server:${i}`,src=String(g.image||''),note=String(g.note||g.comment||'');return `<div class="gallery-tile"><button class="gallery-thumb-button" onclick="openGalleryLightbox('${src.replace(/'/g,"%27")}','${key}')"><img class="gallery-thumb" src="${src}" alt="${esc(g.title||'готовое изделие')}"></button><div class="gallery-tile-text"><b>${esc(g.title||'Готовое изделие')}</b><br><span class="muted">${esc(g.orderId||'')}</span>${note?`<div class="gallery-internal-note"><b>Комментарий:</b> ${esc(note)}</div>`:''}${galleryPubChips(key)}</div><div class="gallery-tile-actions">${hasPermission('gallery.delete')?`<button class="mini-danger" onclick="showAppToast('Серверное удаление пока не включено: фото сохранено.','info',3200)">Удалить</button>`:''}</div></div>`}
function galleryLocalTile(g){const key=`local:${g.id}`,src=blobUrl(g.blob),note=String(g.meta?.note||'');return `<div class="gallery-tile"><button class="gallery-thumb-button" onclick="openGalleryLightbox('${src}','${key}')"><img class="gallery-thumb" src="${src}" alt="готовое изделие"></button><div class="gallery-tile-text"><b>${esc(g.objectId||'Готовое изделие')}</b><br><span class="muted">локально одобрено</span>${note?`<div class="gallery-internal-note"><b>Комментарий:</b> ${esc(note)}</div>`:''}${galleryPubChips(key)}</div><div class="gallery-tile-actions">${hasPermission('gallery.delete')?`<button class="mini-danger" onclick="deleteGalleryItem('${esc(g.id)}')">Удалить</button>`:''}</div></div>`}
function galleryCandidateItem(x){const src=x.blob instanceof Blob?blobUrl(x.blob):'',note=String(x.meta?.note||'');return `<div class="gallery-candidate-tile"><div class="gallery-candidate-head"><span class="badge warn">кандидат</span><small>${esc(x.objectId||'без заказа')}</small></div>${src?`<button class="gallery-thumb-button" onclick="openGalleryLightbox('${src}','candidate:${esc(x.id)}')"><img class="gallery-thumb" src="${src}" alt="кандидат"></button>`:''}<div class="gallery-candidate-meta">${new Date(x.createdAt).toLocaleString('ru-RU')}${note?`<div class="gallery-internal-note"><b>Комментарий:</b> ${esc(note)}</div>`:''}</div><div class="queue-actions">${hasPermission('gallery.approve')?`<button class="approve-btn" onclick="approveGalleryDraft('${esc(x.id)}')">Одобрить</button>`:''}<button class="danger" onclick="deleteDraft('${esc(x.id)}')">Удалить</button></div></div>`}
async function approveGalleryDraft(id){if(!hasPermission('gallery.approve')){showAppToast('Нет права «Галерея: одобрять».','bad',3600);return}const db=await openDB();const tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts');const req=store.get(id);const rec=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});if(!rec)return;rec.context='gallery-approved-local';rec.meta={...(rec.meta||{}),approvedLocally:true,approvedAt:new Date().toISOString()};store.put(rec);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});await logActivity('gallery_approved',rec);await refreshPending();await renderGallery()}
async function deleteGalleryItem(id){if(!hasPermission('gallery.delete')){showAppToast('Нет права «Галерея: удалять».','bad',3600);return}if(!confirm('Удалить это фото из Галереи приложения?'))return;const rec=await getDraft(id);await deleteDraftDirect(id);if(rec)await logActivity('gallery_deleted',rec);await refreshPending();await renderGallery()}
let shareFiles=[];
async function galleryShareModal(){if(!hasPermission('gallery.share')){showAppToast('Нет права «Галерея: поделиться».','bad',3600);return}shareFiles=[];const all=await drafts();const serverApproved=S.gallery||[],localApproved=all.filter(x=>x.context==='gallery-approved-local'&&x.kind==='photo');const has=(serverApproved.length+localApproved.length)>0;modal('Поделиться из Галереи',`<div class="hint"><b>Черновик публикации.</b> Фото выбираются только из Галереи приложения. После сохранения у выбранных фото появится статус «черновик» для выбранного канала. После реальной публикации backend сменит его на «опубликовано».</div><div class="field"><label>Фото / скриншоты из Галереи приложения</label><button class="secondary attention-green" style="width:100%" onclick="toggleAppGalleryPicker()">Выбрать фото и скриншоты</button><div id="appGalleryPicker" class="share-approved hidden" style="margin-top:8px">${serverApproved.map((g,i)=>`<label class="share-photo"><input type="checkbox" class="shareApproved" value="server:${i}"><img src="${g.image}" alt="${esc(g.title||'работа')}"><span>${esc(g.title||g.orderId||'Работа')}</span></label>`).join('')}${localApproved.map(g=>`<label class="share-photo"><input type="checkbox" class="shareApproved" value="local:${esc(g.id)}"><img src="${blobUrl(g.blob)}" alt="работа"><span>${esc(g.objectId||g.appName||'Работа')}</span></label>`).join('')}${has?'':'<div class="muted">В Галерее приложения пока нет одобренных фото.</div>'}</div></div><div class="field"><label>Текст публикации</label><textarea id="shareText" placeholder="Текст, который пойдёт вместе с фото в выбранный канал"></textarea><div class="hint">Внутренние комментарии к фото сюда не подставляются и не публикуются.</div></div><div class="field"><label>Куда подготовить</label><div class="channel-grid"><label><input type="checkbox" class="shareChannel" value="VK"> VK</label><label><input type="checkbox" class="shareChannel" value="SITE"> Сайт</label><label><input type="checkbox" class="shareChannel" value="MAX"> MAX</label><label><input type="checkbox" class="shareChannel" value="INSTAGRAM"> Instagram</label><label><input type="checkbox" class="shareChannel" value="TELEGRAM"> Telegram</label><label><input type="checkbox" class="shareChannel" value="WHATSAPP"> WhatsApp</label></div></div><button class="primary" onclick="saveGalleryShare()">Сохранить черновик публикации</button>`)}
function toggleAppGalleryPicker(){document.getElementById('appGalleryPicker')?.classList.toggle('hidden')}
async function saveGalleryShare(){const channels=[...document.querySelectorAll('.shareChannel:checked')].map(x=>x.value);const selected=[...document.querySelectorAll('.shareApproved:checked')].map(x=>x.value);const txt=document.getElementById('shareText')?.value.trim()||'';if(!channels.length){alert('Отметьте хотя бы один канал.');return}if(!selected.length){alert('Выберите хотя бы одно фото из Галереи приложения.');return}const batch='PUB-'+Date.now();await putDraft({kind:'publish-draft',objectId:batch,text:txt||'Публикация из Галереи',context:'gallery-share',meta:{batchId:batch,channels,appGalleryItems:selected}});closeModal();await refreshPending();await renderGallery();alert('Черновик публикации сохранён офлайн. 5 минут на проверку; используются только фото из Галереи приложения.');}
async function galleryCandidateModal(){if(!hasPermission('gallery.add')&&backendSession()&&navigator.onLine!==false){try{await checkBackendAuth()}catch(_){}}if(!hasPermission('gallery.add')){showAppToast('Нет права «Галерея: добавлять». Обновите доступ в «Загрузки».','bad',4800);return}modal('Фото готового изделия / Галерея',`<div class="field"><label>К какому заказу относится</label><select id="galleryOrder"><option value="">Старая работа / без заказа</option>${S.orders.map(o=>`<option value="${esc(o.id)}">${esc(o.id)} · ${esc(o.name)}</option>`).join('')}</select></div><div class="field"><label>Внутренний комментарий</label><textarea id="galleryInternalNote" placeholder="Что на фото, куда относится, что важно запомнить"></textarea><div class="hint">Комментарий хранится отдельно от изображения и <b>не уходит</b> в VK/сайт. Текст публикации задаётся отдельно.</div></div><div class="hint">Фото сначала попадёт в кандидаты. В публичную Галерею автоматически не публикуется.</div><br><div class="photo-option"><button class="primary" onclick="pickGalleryCameraFromModal()">Камера</button><button class="secondary" onclick="pickGalleryFilesFromModal()">Из галереи телефона</button></div>`)}
async function galleryCandidateForOrder(id){if(!hasPermission('gallery.add')&&backendSession()&&navigator.onLine!==false){try{await checkBackendAuth()}catch(_){}}if(!hasPermission('gallery.add')){showAppToast('Нет права «Галерея: добавлять».','bad',4200);return}const o=S.orders.find(x=>x.id===id);modal('Фото готового изделия',`<div class="hint"><b>${esc(id)}${o?' · '+esc(o.name):''}</b><br>Заказ уже привязан автоматически.</div><div class="field"><label>Внутренний комментарий</label><textarea id="galleryInternalNote" placeholder="Что на фото / примечание для производства"></textarea><div class="hint">Не публикуется вместе с фото.</div></div><br><div class="photo-option"><button class="primary" onclick="pickGalleryCameraForOrder('${id}')">Камера</button><button class="secondary" onclick="pickGalleryFilesForOrder('${id}')">Из галереи телефона</button></div>`)}
function gallerySelectedOrder(){return document.getElementById('galleryOrder')?.value||'GALLERY'}
function galleryInternalNote(){return document.getElementById('galleryInternalNote')?.value.trim()||''}
function pickGalleryCameraFromModal(){const id=gallerySelectedOrder(),note=galleryInternalNote();closeModal();pickPhoto('portfolio-candidate',id,{note})}
function pickGalleryFilesFromModal(){const id=gallerySelectedOrder(),note=galleryInternalNote();closeModal();pickGalleryFiles('portfolio-candidate',id,{note})}
function pickGalleryCameraForOrder(id){const note=galleryInternalNote();closeModal();pickPhoto('portfolio-candidate',id,{note})}
function pickGalleryFilesForOrder(id){const note=galleryInternalNote();closeModal();pickGalleryFiles('portfolio-candidate',id,{note})}

function appDevStatusClass(v){const s=String(v||'');return /ТРЕБУЕТ/.test(s)?'warn':/ОТКЛОН/.test(s)?'bad':/ВЫПУЩ/.test(s)?'ok':''}
function appDevIssueCard(x){const key=x.issue_id||x.local_id||'',media=Array.isArray(x.media_urls)?x.media_urls:[],admin=hasPermission('appdev.admin');return `<article class="appdev-card"><div class="between"><div><b>${esc(x.issue_id||x.local_id||'замечание')}</b><small>${esc(x.created_by_name||x.created_by_user_id||'')} · ${x.created_at?new Date(x.created_at).toLocaleString('ru-RU'):''}</small></div><span class="badge ${appDevStatusClass(x.status)}">${esc(x.status||'')}</span></div><h3>${esc(x.title||'Замечание')}</h3><div class="appdev-text">${esc(x.working_text||x.original_text||'')}</div>${media.length?`<div class="appdev-media">${media.map((u,i)=>`<button onclick="window.open('${esc(u)}','_blank')">Скриншот ${i+1}</button>`).join('')}</div>`:''}${x.admin_note?`<div class="hint"><b>ADMIN1:</b> ${esc(x.admin_note)}</div>`:''}${admin?`<div class="record-actions"><button onclick="appDevAdminModal('${esc(key)}')">Редактировать</button>${!x.issue_id&&x.status!=='ОТКЛОНЕНО'?`<button class="approve-btn" onclick="appDevAction('${esc(key)}','approve')">Утвердить</button><button class="danger" onclick="appDevAction('${esc(key)}','reject')">Отклонить</button>`:''}</div>`:''}</article>`}
async function renderAppDev(){const el=document.getElementById('appdev');if(!el)return;if(!hasPermission('appdev.view')){el.innerHTML='<button class="back" onclick="go(\'home\')">← Главная</button><div class="empty">Нет права видеть замечания приложения.</div>';return}const local=(await drafts()).filter(x=>x.kind==='appdev-issue'),server=Array.isArray(S.appIssues)?S.appIssues:[];el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button>${hasPermission('appdev.submit')?'<button class="primary" onclick="newAppDevIssueModal()">+ Новое замечание</button>':''}<div class="section-title"><h2>Замечания</h2><span class="badge">${server.length+local.length}</span></div>${local.map(x=>`<article class="appdev-card local"><div class="between"><b>Ждёт отправки</b><span class="badge warn">локально</span></div><h3>${esc(x.meta?.title||'Замечание')}</h3><div class="appdev-text">${esc(x.text||'')}</div><div class="hint">Вложений: ${x.attachments?.length||0} · event_id ${esc(x.id)}</div></article>`).join('')}${server.length?server.map(appDevIssueCard).join(''):'<div class="muted">Серверных замечаний пока нет.</div>'}`}
function newAppDevIssueModal(){if(!hasPermission('appdev.submit')){showAppToast('Нет права отправлять замечания.','bad');return}resetStep2Media('appdev');modal('Новое замечание',`<div class="field"><label>Краткое название</label><input id="appDevTitle" placeholder="Что нужно исправить"></div><div class="field"><label>Описание</label><textarea id="appDevText" placeholder="Что происходит и как должно быть"></textarea></div><button class="secondary" onclick="chooseStep2Media('appdev')">Добавить скриншоты / фото</button><div class="hint" id="step2MediaLabel">Фото не выбраны</div><button class="primary" style="margin-top:10px" onclick="saveAppDevIssueDraft()">Отправить замечание</button><div class="hint">Текст и все изображения сохраняются одним пакетом. После ADMIN1-проверки замечанию присваивается официальный ID.</div>`)}
async function saveAppDevIssueDraft(){const title=(document.getElementById('appDevTitle')?.value||'').trim(),txt=(document.getElementById('appDevText')?.value||'').trim();if(!title&&!txt&&!step2MediaFiles.length){showAppToast('Добавьте текст или скриншот.','bad');return}const screen=document.querySelector('.screen.active')?.id||'';await putDraft({kind:'appdev-issue',context:'appdev',objectId:'LOCAL-'+crypto.randomUUID(),text:txt,attachments:attachmentRecords(step2MediaFiles),meta:{title:title||'Замечание к приложению',screen,app_version:APP_RELEASE.version,local_id:'LOCAL-'+Date.now()}});resetStep2Media();closeModal();await refreshPending();await renderAppDev();showAppToast('Замечание сохранено одним пакетом и будет отправлено автоматически.','ok',4400)}
let APPDEV_ADMIN_NEW_MEDIA=[];
function appDevAdminModal(key){const x=(S.appIssues||[]).find(i=>String(i.issue_id||i.local_id)===String(key));if(!x)return;APPDEV_ADMIN_NEW_MEDIA=[];const media=Array.isArray(x.media_urls)?x.media_urls:[];modal('Редактировать замечание',`<div class="field"><label>Название</label><input id="appDevEditTitle" value="${esc(x.title||'')}"></div><div class="field"><label>Рабочий текст</label><textarea id="appDevEditText">${esc(x.working_text||x.original_text||'')}</textarea></div><div class="field"><label>Комментарий ADMIN1</label><textarea id="appDevAdminNote">${esc(x.admin_note||'')}</textarea></div>${media.length?`<div class="field"><label>Текущие изображения</label>${media.map((u,i)=>`<label class="media-remove-row"><input type="checkbox" data-appdev-remove="${esc(u)}"> удалить скриншот ${i+1}</label>`).join('')}</div>`:''}<button class="secondary" onclick="chooseAppDevAdminMedia()">Добавить изображения</button><div class="hint" id="appDevAdminMediaLabel">Новых изображений нет</div><button class="primary" style="margin-top:10px" onclick="saveAppDevAdminEdit('${esc(key)}')">Сохранить правки</button>`)}
function chooseAppDevAdminMedia(){step2MediaMode='appdev-admin';document.getElementById('step2MediaInput')?.click()}
async function appDevMediaPayload(files){const out=[];for(const f of (files||[]).slice(0,8)){if(f.size>7*1024*1024){showAppToast('Файл больше 7 МБ: '+f.name,'bad',4600);continue}out.push({base64:await blobToBase64(f),mimeType:f.type||'image/jpeg',fileName:f.name||'screenshot.jpg'})}return out}
async function saveAppDevAdminEdit(key){const remove=[...document.querySelectorAll('[data-appdev-remove]:checked')].map(x=>x.dataset.appdevRemove),newMedia=await appDevMediaPayload(APPDEV_ADMIN_NEW_MEDIA.length?APPDEV_ADMIN_NEW_MEDIA:step2MediaFiles);const body={action:'appdev.update',session_token:backendSession(),device_id:backendDeviceId(),issue_key:key,issue_action:'edit',title:(document.getElementById('appDevEditTitle')?.value||'').trim(),working_text:(document.getElementById('appDevEditText')?.value||'').trim(),admin_note:(document.getElementById('appDevAdminNote')?.value||'').trim(),remove_media_urls:remove,new_media:newMedia,app_version:APP_RELEASE.version};closeModal();await withBusy('Сохраняю замечание…',async()=>{const d=await backendPost(body,{timeoutMs:60000});if(!d?.ok){showAppToast('Не удалось сохранить замечание.','bad');return}await pullLiveSnapshot({silent:true});await renderAppDev();showAppToast('Замечание обновлено.','ok')})}
async function appDevAction(key,action){if(!confirm(action==='approve'?'Утвердить замечание и присвоить официальный ID?':'Отклонить замечание?'))return;await withBusy(action==='approve'?'Утверждаю замечание…':'Отклоняю замечание…',async()=>{const d=await backendPost({action:'appdev.update',session_token:backendSession(),device_id:backendDeviceId(),issue_key:key,issue_action:action,app_version:APP_RELEASE.version},{timeoutMs:30000});if(!d?.ok){showAppToast('Операция не выполнена: '+String(d?.error||''),'bad');return}await pullLiveSnapshot({silent:true});await renderAppDev();showAppToast(action==='approve'?'Замечанию присвоен ID и оно отправлено в «Требует обновления».':'Замечание отклонено.','ok',4400)})}
async function renderAvito(){resetTempUrls();const all=await drafts(),a=all.filter(x=>String(x.context||'').startsWith('avito')||x.kind==='avito-note'),photos=a.filter(x=>x.kind==='photo').length,audios=a.filter(x=>x.kind==='audio').length,notes=a.filter(x=>x.kind==='avito-note').length;document.getElementById('avito').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="avito-hero"><span class="badge">сбор данных</span><h2>Avito</h2><p>Пока ничего не анализируем автоматически. Сначала собираем качественные исходные данные, чтобы позже связать объявления → обращения → заказы → деньги.</p></div>${standardActions('avito','AVITO','Заметка Avito')}<div class="mini-stats" style="margin-top:10px"><div><b>${a.length}</b><small>ждут sync</small></div><div><b>${photos}</b><small>фото</small></div><div><b>${audios}</b><small>голос</small></div></div><div class="hint"><b>Что потом сможем анализировать:</b> просмотры, обращения, цену, продвижение, изменения объявлений и связь с реальными заказами. Сейчас важнее не потерять первичные скриншоты/заметки.</div><div class="section-title"><h2>Офлайн-материалы Avito</h2><span class="badge">${a.length}</span></div>${a.length?a.sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt))).map(queueItem).join(''):`<div class="muted">Пока ничего не добавлено.</div>`}`}
function avitoNote(){modal('Заметка Avito',`<div class="field"><label>Объявление / тема (необязательно)</label><input id="avitoRef" placeholder="Например: стол лофт Томск"></div><div class="field"><label>Заметка</label><textarea id="qText" placeholder="Что изменили, что заметили, что проверить..."></textarea></div><button class="primary" onclick="saveAvitoNote()">Сохранить офлайн</button>`)}
async function saveAvitoNote(){const text=document.getElementById('qText').value.trim(),ref=document.getElementById('avitoRef').value.trim();if(!text&&!ref)return;await putDraft({kind:'avito-note',objectId:'AVITO',text:text||ref,context:'avito',meta:{listingRef:ref}});closeModal();await refreshPending();if(document.getElementById('avito').classList.contains('active'))renderAvito();if(document.getElementById('gallery').classList.contains('active'))renderGallery();if(document.getElementById('calculator').classList.contains('active'))renderCalculator();if(document.getElementById('buy').classList.contains('active'))renderBuy()}
function hasPermission(key){if(isAdmin1())return true;return SESSION.permissions&&SESSION.permissions[key]===true}
function canMutateRecord(domain,action,createdByUserId){
  if(isAdmin1())return true;
  const own=!!createdByUserId&&String(createdByUserId)===String(SESSION.userId||''),p=SESSION.permissions||{};
  const hasNew=[domain+'.edit-own',domain+'.edit-all',domain+'.delete-own',domain+'.delete-all'].some(k=>Object.prototype.hasOwnProperty.call(p,k));
  if(action==='update'){
    if(hasPermission(domain+'.edit-all'))return true;
    if(own&&hasPermission(domain+'.edit-own'))return true;
    if(!hasNew&&domain==='wallet'&&hasPermission('wallet.edit'))return true;
    if(!hasNew&&domain==='orders'&&hasPermission('orders.edit'))return true;
    return false;
  }
  if(action==='delete'){
    if(hasPermission(domain+'.delete-all')||hasPermission('data.delete'))return true;
    return own&&hasPermission(domain+'.delete-own');
  }
  return false;
}
const adminState={users:[],access:[],devices:[],loaded:false,loading:false,error:''};
let adminSelectedUserId='ADMIN1';
function permissionGroups(){return [
 ['Заказы',[['orders.view','Видеть заказы'],['orders.create','Создавать заказ'],['orders.edit','Менять заказ (совместимость)'],['orders.media','Фото / голос / файлы'],['orders.edit-own','Менять свои заказы'],['orders.edit-all','Менять все заказы'],['orders.delete-own','Удалять свои заказы'],['orders.delete-all','Удалять все заказы']]],
 ['Закупка',[['purchase.view','Видеть «Закупки по заказам»']]],
 ['Кошелёк',[['wallet.view','Видеть Кошелёк'],['wallet.add','Добавлять доход/расход'],['wallet.edit','Редактировать операции (совместимость)'],['wallet.edit-own','Менять свои операции'],['wallet.edit-all','Менять все операции'],['wallet.delete-own','Удалять свои операции'],['wallet.delete-all','Удалять все операции']]],
 ['Галерея',[['gallery.view','Смотреть Галерею'],['gallery.add','Добавлять кандидатов'],['gallery.approve','Одобрять в Галерею'],['gallery.share','Поделиться / готовить публикации'],['gallery.delete','Удалять фото из Галереи']]],
 ['Калькулятор заказов',[['calculator.view','Видеть Калькулятор'],['calculator.create','Создавать предварительные расчёты'],['calculator.delete','Удалять черновики'],['calculator.promote','Переводить в активный заказ']]],
 ['VK',[['vk.draft','Готовить публикацию VK'],['vk.publish','Публиковать в VK']]],
 ['Avito',[['avito.view','Открывать Avito'],['avito.draft','Создавать карточку/текст'],['avito.publish','Публиковать Avito']]],
 ['Сайт',[['site.draft','Готовить материал для сайта'],['site.publish','Публиковать на сайте']]],
 ['Другие каналы',[['max.publish','Публиковать в MAX'],['instagram.publish','Публиковать в Instagram'],['telegram.publish','Публиковать в Telegram']]],
 ['Разработка приложения',[['appdev.view','Видеть замечания'],['appdev.submit','Отправлять замечания'],['appdev.admin','Редактировать и утверждать замечания']]],
 ['Чек-листы',[['checklists.view','Смотреть чек-листы'],['checklists.create','Создавать чек-листы'],['checklists.edit','Отмечать и менять пункты чек-листов']]],
 ['Система',[['analytics.view','Смотреть общую информацию / аналитику'],['activity.view','Смотреть журнал действий'],['nomenclature.view','Смотреть Номенклатуру'],['nomenclature.edit','Менять Номенклатуру'],['sync.run','Запускать синхронизацию'],['users.manage','Управлять пользователями'],['data.delete','Удалять данные']]]
]}
function purgeLegacyDemoAdminState(){try{localStorage.removeItem('demoAppUsers');localStorage.removeItem('demoRightsByUser')}catch(_){}}
function assignableUsers(){const a=(adminState.users||[]).filter(u=>u.status==='ACTIVE');if(a.length)return a;return SESSION.userId?[{user_id:SESSION.userId,name:SESSION.name||SESSION.userId,status:'ACTIVE'}]:[]}
async function adminCall(action,payload={}){
 if(!isAdmin1())throw new Error('ADMIN1_REQUIRED');
 const token=backendSession();if(!token)throw new Error('NO_SESSION');
 const d=await backendPost({action,session_token:token,device_id:backendDeviceId(),...payload});
 if(d?.ok)return d;
 const err=backendErrorCode(d,'ADMIN_REQUEST_FAILED');
 if(d?.wipe_on_next_online){await performRemoteWipe();throw new Error('REMOTE_WIPE_COMPLETED')}
 if(/^(SESSION_|USER_|DEVICE_)/.test(err))await handleAuthFailure(err);
 throw new Error(err)
}
async function loadAdminData(force=false){
 if(!isAdmin1())return false;
 if(adminState.loading)return false;
 if(adminState.loaded&&!force)return true;
 adminState.loading=true;adminState.error='';
 try{
  const [u,a,d]=await Promise.all([adminCall('admin.users.list'),adminCall('admin.access.list'),adminCall('admin.devices.list')]);
  adminState.users=Array.isArray(u.users)?u.users:[];
  adminState.access=Array.isArray(a.items)?a.items:[];
  adminState.devices=Array.isArray(d.items)?d.items:[];
  adminState.loaded=true;
  if(!adminState.users.some(x=>x.user_id===adminSelectedUserId))adminSelectedUserId=adminState.users[0]?.user_id||'ADMIN1';
  return true
 }catch(e){adminState.error=String(e?.message||e);adminState.loaded=false;return false}
 finally{adminState.loading=false}
}
function adminDate(v){const t=Date.parse(v||'');return Number.isFinite(t)?new Date(t).toLocaleString('ru-RU'):'—'}
function adminPermissionHtml(u){
 const locked=u?.role==='ADMIN1',perms=u?.permissions||{};
 return permissionGroups().map(g=>`<div class="perm-section">${g[0]}</div><div class="perm-builder">${g[1].map(p=>`<label class="perm-toggle ${locked?'locked':''}"><input type="checkbox" data-perm="${p[0]}" ${(locked||perms[p[0]]===true)?'checked':''} ${locked?'disabled':''}><span>${p[1]}</span></label>`).join('')}</div>`).join('')
}
function normalizeAccessName(v){return String(v||'').trim().toLocaleLowerCase('ru-RU').replace(/\s+/g,' ')}
function adminAccessCard(x,i,users){
 const active=users.filter(u=>u.status==='ACTIVE');
 const entered=normalizeAccessName(x.name_entered);
 const exact=active.filter(u=>normalizeAccessName(u.name)===entered);
 const preselected=exact.length===1?String(exact[0].user_id||''):'';
 const opts=`<option value="" ${preselected?'':'selected'}>— выберите сотрудника —</option>`+active.map(u=>`<option value="${esc(u.user_id)}" ${String(u.user_id)===preselected?'selected':''}>${esc(u.name||u.user_id)} · ${esc(u.role_label||u.role)}</option>`).join('');
 return `<div class="queue-item"><div class="queue-head"><div><div class="queue-type">${esc(x.name_entered||'Без имени')}</div><div class="queue-context">${esc(x.device_id||'')} · ${esc(x.app_version||'')}</div></div><span class="badge warn">PENDING</span></div><div class="file-meta">Заявка: ${esc(x.request_id)} · ${esc(adminDate(x.created_at))}</div><div class="field"><label>Привязать к пользователю</label><select id="accessUser-${i}">${opts}</select></div><div class="queue-actions v023"><button class="send-now-btn" onclick="approveAccessRequest(${i})">Одобрить</button><button class="danger" onclick="denyAccessRequest(${i})">Отклонить</button></div></div>`
}
function adminDeviceCard(x,i){
 const current=x.device_id===backendDeviceId(),active=x.status==='ACTIVE';
 const state=x.wipe_on_next_online?' · wipe ожидает подключения':'';
 const actions=current?`<span class="badge ok">текущее устройство</span>`:active
  ?`<button class="danger" onclick="adminDeviceAction(${i},'revoke')">Отозвать + очистить</button><button class="edit-btn" onclick="adminDeviceAction(${i},'wipe')">Только очистить</button><button class="edit-btn" onclick="revokeDeviceSessions(${i})">Отозвать сессии</button>`
  :`<button class="send-now-btn" onclick="adminDeviceAction(${i},'activate')">Разрешить снова</button>`;
 return `<div class="queue-item"><div class="queue-head"><div><div class="queue-type">${esc(x.device_name||'Устройство')}</div><div class="queue-context">${esc(x.user_id||'')} · ${esc(x.status||'')}</div></div>${current?'<span class="badge ok">это устройство</span>':''}</div><div class="file-meta">${esc(x.device_id||'')}</div><div class="file-meta">Последняя связь: ${esc(adminDate(x.last_seen))}${esc(state)}</div>${x.revocation_reason?`<div class="risk">${esc(x.revocation_reason)}</div>`:''}<div class="queue-actions v023">${actions}</div></div>`
}
async function renderAdmin(){
 const el=document.getElementById('admin');if(!el)return;
 if(!isAdmin1()){el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="empty">Настройки владельца недоступны этому пользователю.</div>`;return}
 if(!adminState.loaded&&!adminState.loading){el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="settings-head"><h2>Настройки владельца</h2><p>Загрузка серверных пользователей, заявок и устройств…</p></div>`;await loadAdminData()}
 if(!isAdmin1())return;
 if(adminState.error){el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="risk"><b>Не удалось загрузить ADMIN1-настройки.</b>${esc(adminState.error)}</div><button class="primary" onclick="refreshAdminData()">Повторить</button>`;return}
 const users=adminState.users||[];if(!users.length){el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="risk">Сервер не вернул пользователей.</div>`;return}
 if(!users.some(u=>u.user_id===adminSelectedUserId))adminSelectedUserId=users[0].user_id;
 const u=users.find(x=>x.user_id===adminSelectedUserId)||users[0],locked=u.role==='ADMIN1';
 const pending=(adminState.access||[]).filter(x=>x.status==='PENDING');
 const devices=(adminState.devices||[]).map((x,i)=>({x,i})).sort((a,b)=>String(b.x.last_seen||'').localeCompare(String(a.x.last_seen||'')));
 const owner=users.find(x=>x.role==='ADMIN1')||u;
 el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="settings-head"><h2>Настройки владельца</h2><p>Реальные данные backend · пользователи, права, заявки, устройства и сессии.</p></div>
 <div class="owner-panel"><div><span>${esc(owner.user_id)}</span><b>${esc(owner.name||owner.user_id)}</b><small>полный доступ · владелец системы</small></div><strong>${esc(owner.status)}</strong></div>
 <div class="settings-block"><h3>Пользователи и права</h3><div class="field"><label>Выберите пользователя</label><select id="adminUserSelect" onchange="selectAdminUser(this.value)">${users.map(x=>`<option value="${esc(x.user_id)}" ${x.user_id===u.user_id?'selected':''}>${esc(x.name||x.user_id)} · ${esc(x.role_label||x.role)} · ${esc(x.status)}</option>`).join('')}</select></div>
 <div class="role-input"><input id="adminUserName" value="${esc(u.name||'')}" placeholder="Имя" ${locked?'disabled':''}><input id="adminRoleName" value="${esc(u.role_label||'Пользователь')}" placeholder="Название роли" ${locked?'disabled':''}></div>
 <div class="role-input"><select id="adminUserStatus" ${locked?'disabled':''}><option value="ACTIVE" ${u.status==='ACTIVE'?'selected':''}>ACTIVE</option><option value="INACTIVE" ${u.status==='INACTIVE'?'selected':''}>INACTIVE</option><option value="BLOCKED" ${u.status==='BLOCKED'?'selected':''}>BLOCKED</option></select><input id="adminOfflineHours" type="number" min="1" max="720" value="${esc(u.offline_hours||24)}" ${locked?'disabled':''} placeholder="Офлайн, часов"></div>
 ${locked?`<div class="hint"><b>ADMIN1 защищён.</b> Его права и статус нельзя изменить из этого экрана.</div>`:''}${adminPermissionHtml(u)}
 <button class="primary" style="margin-top:11px" onclick="saveSelectedUserRights()" ${locked?'disabled':''}>Сохранить на сервере</button>
 ${!locked?`<button class="danger-btn" style="margin-top:7px" onclick="blockSelectedUser()">Заблокировать + отозвать сессии</button><button class="secondary" style="margin-top:7px" onclick="revokeSelectedUserSessions()">Отозвать все сессии пользователя</button>`:''}</div>
 <div class="settings-block"><h3>Заявки на доступ</h3><p>Новый телефон сначала создаёт PENDING-заявку. ADMIN1 привязывает её к существующему активному пользователю.</p>${pending.length?pending.map((x,i)=>adminAccessCard(x,i,users)).join(''):`<div class="muted">Новых заявок нет.</div>`}</div>
 <div class="settings-block"><h3>Устройства и сессии</h3><p>Отзыв устройства блокирует его серверные сессии. «Отозвать + очистить» также прикажет PWA удалить локальные данные при следующем выходе в сеть.</p>${devices.length?devices.map(r=>adminDeviceCard(r.x,r.i)).join(''):`<div class="muted">Устройств пока нет.</div>`}</div>
 <div class="settings-block"><h3>Восстановление ADMIN1</h3><p>Recovery-пароль и почтовый OTP в backend 0.2.1 ещё не подключены. Секреты не вводятся и не хранятся в PWA. До отдельного recovery-этапа используйте существующее авторизованное устройство ADMIN1.</p></div>
 <div class="settings-block"><h3>Журнал действий</h3><button class="secondary" onclick="go('activityLog')">Открыть журнал действий</button><button class="secondary" style="margin-top:7px" onclick="refreshAdminData()">Обновить данные ADMIN1</button></div>`
}
async function refreshAdminData(){adminState.loaded=false;await loadAdminData(true);await renderAdmin()}
function selectAdminUser(id){adminSelectedUserId=String(id||'');renderAdmin()}
async function saveSelectedUserRights(){
 const u=(adminState.users||[]).find(x=>x.user_id===adminSelectedUserId);if(!u||u.role==='ADMIN1')return;
 const permissions={};document.querySelectorAll('#admin [data-perm]').forEach(x=>permissions[x.dataset.perm]=x.checked);
 const offlineHours=Math.max(1,Math.min(720,Number(document.getElementById('adminOfflineHours')?.value||24)));
 try{await adminCall('admin.user.update',{user_id:u.user_id,name:document.getElementById('adminUserName')?.value.trim()||u.name,role_label:document.getElementById('adminRoleName')?.value.trim()||u.role_label,status:document.getElementById('adminUserStatus')?.value||u.status,offline_hours:offlineHours,permissions});await loadAdminData(true);alert('Пользователь и права сохранены на сервере.');await renderAdmin()}catch(e){alert('Не удалось сохранить: '+String(e?.message||e))}
}
async function blockSelectedUser(){
 const u=(adminState.users||[]).find(x=>x.user_id===adminSelectedUserId);if(!u||u.role==='ADMIN1')return;
 if(!confirm(`Заблокировать ${u.name||u.user_id} и отозвать все его серверные сессии?`))return;
 try{await adminCall('admin.user.update',{user_id:u.user_id,status:'BLOCKED'});await adminCall('admin.sessions.revoke',{user_id:u.user_id,reason:'User blocked by ADMIN1'});await loadAdminData(true);alert('Пользователь заблокирован, активные сессии отозваны.');await renderAdmin()}catch(e){alert('Ошибка блокировки: '+String(e?.message||e))}
}
async function revokeSelectedUserSessions(){
 const u=(adminState.users||[]).find(x=>x.user_id===adminSelectedUserId);if(!u||u.role==='ADMIN1')return;
 if(!confirm(`Отозвать все активные сессии пользователя ${u.name||u.user_id}?`))return;
 try{const d=await adminCall('admin.sessions.revoke',{user_id:u.user_id,reason:'Sessions revoked by ADMIN1'});alert(`Отозвано сессий: ${Number(d.revoked||0)}.`);await loadAdminData(true);await renderAdmin()}catch(e){alert('Ошибка: '+String(e?.message||e))}
}
async function approveAccessRequest(i){
 const x=(adminState.access||[]).filter(r=>r.status==='PENDING')[i];if(!x)return;
 const userId=document.getElementById(`accessUser-${i}`)?.value||'';if(!userId){alert('Выберите пользователя.');return}
 const selected=(adminState.users||[]).find(u=>String(u.user_id)===String(userId));
 const entered=normalizeAccessName(x.name_entered),chosen=normalizeAccessName(selected?.name);
 if(entered&&chosen&&entered!==chosen&&!confirm(`В заявке указано «${x.name_entered}», выбран «${selected?.name}». Привязать именно так?`))return;
 try{await withBusy('Одобряю устройство…',()=>adminCall('admin.access.resolve',{access_request_id:x.request_id,status:'APPROVED',user_id:userId}));await loadAdminData(true);alert('Заявка одобрена. Пользователь может нажать «Проверить одобрение» на своём устройстве.');await renderAdmin()}catch(e){alert('Ошибка одобрения: '+String(e?.message||e))}
}
async function denyAccessRequest(i){
 const x=(adminState.access||[]).filter(r=>r.status==='PENDING')[i];if(!x)return;
 if(!confirm(`Отклонить заявку ${x.name_entered||x.request_id}?`))return;
 try{await adminCall('admin.access.resolve',{access_request_id:x.request_id,status:'DENIED',note:'Denied by ADMIN1'});await loadAdminData(true);await renderAdmin()}catch(e){alert('Ошибка: '+String(e?.message||e))}
}
async function adminDeviceAction(i,action){
 const x=(adminState.devices||[])[i];if(!x||x.device_id===backendDeviceId())return;
 const text=action==='revoke'?'Отозвать устройство и очистить его локальные данные при следующем подключении?':action==='wipe'?'Очистить локальные данные этого устройства при следующем подключении?':'Разрешить устройство снова? Для работы потребуется новая активация.';
 if(!confirm(text))return;
 try{await adminCall('admin.device.update',{device_id:x.device_id,device_action:action,reason:action==='revoke'?'Revoked by ADMIN1':'',wipe_on_next_online:true});await loadAdminData(true);await renderAdmin()}catch(e){alert('Ошибка устройства: '+String(e?.message||e))}
}
async function revokeDeviceSessions(i){
 const x=(adminState.devices||[])[i];if(!x||x.device_id===backendDeviceId())return;
 if(!confirm(`Отозвать все сессии устройства ${x.device_name||x.device_id}?`))return;
 try{const d=await adminCall('admin.sessions.revoke',{device_id:x.device_id,reason:'Device sessions revoked by ADMIN1'});alert(`Отозвано сессий: ${Number(d.revoked||0)}.`);await loadAdminData(true);await renderAdmin()}catch(e){alert('Ошибка: '+String(e?.message||e))}
}
function renderBuy(){const lines=S.purchaseAggregated||S.purchaseLines, known=lines.reduce((a,x)=>a+(x.amount||0),0), unknown=lines.filter(x=>x.amount==null||x.hasUnknownAmount).length; const groups=['Металл','Дерево / щиты','ЛКМ','Крепёж / фурнитура','Прочее']; let body=''; groups.forEach(g=>{const a=lines.filter(x=>x.group===g);if(!a.length)return;body+=`<div class="group">${g}</div>`+a.map(buyLine).join('')}); const warnings=(S.purchaseWarnings||[]).map(w=>`<div class="risk"><b>⚠ ${esc(w.orderId)}</b>${esc(w.text)}</div>`).join(''); document.getElementById('buy').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="summary"><div><b>${lines.length}</b><small>сводных позиций</small></div><div><b>${rub(known)}</b><small>известная сумма</small></div><div><b>${unknown}</b><small>требуют уточнения</small></div></div>${warnings}<div class="buy-intake"><div class="section-title"><h2>Добавить к закупке</h2><span class="badge">офлайн</span></div>${standardActions('purchase','PURCHASE','Заметка к закупке')}<button class="doc-action" onclick="pickDocument('purchase','PURCHASE')">Документ</button></div>${body}`}
function buyLine(l){const orders=(l.orders||[l.orderId]).filter(Boolean).join(', '), sizes=(l.stdSizes||[l.stdSize]).filter(Boolean).join(' / ');return `<div class="buy-row"><div><b>${esc(l.name)}</b><small>Заказы: ${esc(orders)} · Купить: ${fmt(l.qtyBuy)} ${esc(l.buyUnit||l.unit)}${sizes?' · '+esc(sizes):''}</small></div><div class="buy-money">${rub(l.amount)}</div></div>`}
function walletObligationRow(x,i){const label=x.category||x.to||x.comment||'Обязательство';return `<div class="obligation compact-obligation"><button class="obligation-summary" onclick="toggleWalletObligation(${i})"><span><b>${esc(x.date||'без даты')} · ${esc(label)}</b>${x.orderId?`<small>заказ ${esc(x.orderId)}</small>`:''}</span><strong>${rub(x.amount||0)}</strong></button><div class="obligation-details hidden" id="wallet-obligation-${i}"><div class="muted">${esc(x.to||'')}${x.status?' · '+esc(x.status):''}</div>${x.comment?`<div>${esc(x.comment)}</div>`:''}</div></div>`}
function toggleWalletObligation(i){document.getElementById('wallet-obligation-'+i)?.classList.toggle('hidden')}
function walletMovementRow(x){const income=String(x.direction||'')==='income',sign=income?'+':'−',order=x.orderId?'Заказ '+esc(x.orderId):'Общие',author=x.createdByName||x.createdByUserId||'';const edit=canMutateRecord('wallet','update',x.createdByUserId),del=canMutateRecord('wallet','delete',x.createdByUserId);return `<div class="wallet-movement"><div class="between"><div><b>${esc(x.date||'—')} · ${esc(x.category||'Без категории')}</b><small>${order}${author?' · '+esc(author):''}</small></div><span class="wallet-movement-amount ${income?'income':'expense'}">${sign} ${rub(x.amount||0)}</span></div><div class="muted">${esc(x.comment||'Без комментария')}</div>${x.operationId&&(edit||del)?`<div class="record-actions">${edit?`<button onclick="editFinanceOperation('${esc(x.operationId)}')">Изменить</button>`:''}${del?`<button class="danger" onclick="deleteFinanceOperation('${esc(x.operationId)}')">Удалить</button>`:''}</div>`:''}</div>`}
async function mutateRecord(entityType,entityId,recordAction,patch={},note=''){if(!backendSession()||navigator.onLine===false){showAppToast('Изменение требует связи с сервером.','bad',3600);return null}return withBusy(recordAction==='delete'?'Удаляю запись…':'Сохраняю изменение…',async()=>{const d=await backendPost({action:'record.mutate',session_token:backendSession(),device_id:backendDeviceId(),entity_type:entityType,entity_id:entityId,record_action:recordAction,patch,note,app_version:APP_RELEASE.version},{timeoutMs:25000});if(!d?.ok){showAppToast('Не удалось сохранить: '+String(d?.error||d?.detail||'ошибка'),'bad',5200);return d}await pullLiveSnapshot({silent:true,timeoutMs:20000});showAppToast(recordAction==='delete'?'Удалено с сохранением аудита.':'Изменение сохранено.','ok',2800);return d})}
function editFinanceOperation(id){const x=(S.wallet.transactions||[]).find(t=>String(t.operationId)===String(id));if(!x)return;modal('Изменить операцию',`<div class="field"><label>Тип</label><select id="finEditType"><option value="Расход" ${x.direction==='expense'?'selected':''}>Расход</option><option value="Приход" ${x.direction==='income'?'selected':''}>Доход</option></select></div><div class="field"><label>Сумма</label><input id="finEditAmount" inputmode="decimal" value="${esc(x.amount||'')}"></div><div class="field"><label>№ заказа</label><input id="finEditOrder" value="${esc(x.orderId||'')}"></div><div class="field"><label>Комментарий</label><textarea id="finEditComment">${esc(x.comment||'')}</textarea></div><button class="primary" onclick="saveFinanceOperation('${esc(id)}')">Сохранить</button>`)}
async function saveFinanceOperation(id){const amount=Number(String(document.getElementById('finEditAmount')?.value||'').replace(',','.'));if(!(amount>0)){showAppToast('Укажите сумму больше 0.','bad');return}const patch={type:document.getElementById('finEditType')?.value||'Расход',amount,order_id:(document.getElementById('finEditOrder')?.value||'').trim(),comment:(document.getElementById('finEditComment')?.value||'').trim()};closeModal();await mutateRecord('finance',id,'update',patch)}
async function deleteFinanceOperation(id){if(!confirm('Удалить финансовую операцию? Строка останется в аудите и перестанет входить в Кошелёк.'))return;await mutateRecord('finance',id,'delete',{},'Удалено из приложения')}
function renderWallet(){const w=S.wallet,tx=Array.isArray(w.transactions)?w.transactions:[];document.getElementById('wallet').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="grid2"><article class="metric"><div class="label">Остаток</div><div class="value">${rub(w.balance)}</div><div class="note">Текущий период после обнуления</div></article><article class="metric"><div class="label">Предстоящие расходы</div><div class="value">${rub(w.futureTotal)}</div><div class="note bad">После обязательств ${rub(w.afterObligations)}</div></article></div><div class="wallet-list"><div><span>Доходы периода</span><b>${rub(w.income)}</b></div><div><span>Расходы периода</span><b>${rub(w.expense)}</b></div><div><span>Предстоящие доходы</span><b>${rub(w.futureIncome)}</b></div></div><button class="doc-action wallet-add-structured quick-action-wide" onclick="walletModal()"><span class="action-label">Доход / расход</span>${actionIcon('money')}</button><div class="section-title"><h2>Быстро добавить информацию</h2><span class="badge">офлайн</span></div>${standardActions('wallet','WALLET','Заметка к Кошельку')}<div class="section-title obligations-title"><h2>Ближайшие обязательства</h2><span class="badge bad">${rub(w.futureTotal)}</span></div>${w.futureExpenses.map(walletObligationRow).join('')}<div class="section-title"><h2>Движение денег</h2><span class="badge">${tx.length}</span></div>${tx.length?tx.map(walletMovementRow).join(''):'<div class="muted">Движений за текущий период пока нет.</div>'}<div class="section-title"><h2>Черновики с телефона</h2><span id="walletDraftBadge" class="badge">0</span></div><div id="walletDrafts" class="drafts"></div>`;renderWalletDrafts()}
let nomLimit=70;
function normSearch(s){return String(s??'').toLowerCase().replace(/ё/g,'е').replace(/[×хx*]/g,'x').replace(/,/g,'.').replace(/[-–—_\/]+/g,' ').replace(/[()№:;]+/g,' ').replace(/\s+/g,' ').trim()}
function profilePrices(n){if(n.subcategory!=='Профильная труба'||n.price==null||n.massPerM==null)return null;const perM=n.pricePerM??Math.round((Number(n.price)*Number(n.massPerM)+Number.EPSILON)*100)/100;const per6=n.price6m??Math.round((Number(n.price)*Number(n.massPerM)*6+Number.EPSILON)*100)/100;return {perM,per6}}
function numPrice(v){if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const n=Number(String(v).replace(/\s|\u00a0|₽/g,'').replace(',','.'));return Number.isFinite(n)?n:null}
function woodPrices(n){const p=numPrice(n.price);if(n.category!=='Дерево'||p==null||!String(n.priceBasis||'').includes('пог.м'))return null;return {p1:p,p2:p*2,p4:p*4,p6:p*6}}
function areaFromNom(n){const s=`${n.spec||''} ${n.name||''}`;const re=/(\d+(?:[.,]\d+)?)\s*[×xх]\s*(\d+(?:[.,]\d+)?)(?:\s*[×xх]\s*(\d+(?:[.,]\d+)?))?\s*мм/gi;let matches=[...s.matchAll(re)];if(!matches.length)return null;let m=matches[matches.length-1],a=Number(m[1].replace(',','.')),b=Number(m[2].replace(',','.')),c=m[3]?Number(m[3].replace(',','.')):null;if(c!=null){return (b/1000)*(c/1000)}return (a/1000)*(b/1000)}
function sheetPrices(n){const p=numPrice(n.price),area=areaFromNom(n);if(n.category!=='Листовые материалы'||p==null||!area||area<=0)return null;return {unit:p,perM2:p/area,area}}
































































































































































































































































function renderNom(){const el=document.getElementById('nom');if(!el.querySelector('#nomSearch'))el.innerHTML=`<button class="back" onclick="go('home')">← Главная</button><input id="nomSearch" class="search" placeholder="Например: профильная труба-30, 25×25×1,5, щит 18×400" oninput="nomLimit=70;renderNomList()"><div id="nomMeta" class="search-meta"></div><div id="nomList"></div>`;renderNomList()}
function renderNomList(){const q=normSearch(document.getElementById('nomSearch')?.value||'');const tokens=q.split(/\s+/).filter(Boolean);let arr=S.nomenclature.filter(n=>{const hay=normSearch(`${n.id} ${n.category} ${n.subcategory} ${n.name} ${n.spec} ${n.supplier}`);return !tokens.length||tokens.every(tok=>hay.includes(tok))});document.getElementById('nomMeta').textContent=`Найдено: ${arr.length} из ${S.nomenclature.length} активных позиций · локально · rev ${localNomRevision()||'—'}`;const shown=arr.slice(0,nomLimit);document.getElementById('nomList').innerHTML=shown.map(nomCard).join('')+(arr.length>shown.length?`<button class="show-more" onclick="nomLimit+=100;renderNomList()">Показать ещё (${arr.length-shown.length})</button>`:'')}
function nomListInfo(n){const pm=numPrice(n.pricePerM),mass=numPrice(n.massPerM);if(pm!=null||mass!=null)return [pm!=null?'1 м — '+rub(pm):'',mass!=null?'масса '+fmt(mass)+' кг/м':''].filter(Boolean).join(' · ');const wp=woodPrices(n);if(wp)return '1 м — '+rub(wp.p1);const sp=sheetPrices(n);if(sp)return (n.buyUnit==='щит'||n.calcUnit==='щит'?'щит':'лист')+' — '+rub(sp.unit)+' · 1 м² — '+rub(sp.perM2);return n.price==null?'':fmt(n.price)+' '+esc(n.priceBasis||'')}
function nomCard(n){const info=nomListInfo(n);return `<article class="nom-card nom-card-compact" onclick="nomDetail('${esc(n.id)}')"><div class="nom-card-row"><b>${esc(n.name)}</b>${info?`<span class="nom-card-info">${info}</span>`:''}</div></article>`}
function nomDetail(id){const n=S.nomenclature.find(x=>x.id===id);if(!n)return;const pp=profilePrices(n),wp=woodPrices(n),sp=sheetPrices(n);let priceBlock;if(pp)priceBlock=`<div class="field"><label>Цена трубы при базе ${fmt(n.price)} ₽/кг</label><b>1 м — ${rub(pp.perM)} · 6 м — ${rub(pp.per6)}</b><div class="muted">Масса: ${fmt(n.massPerM)} кг/м · база цены: ${esc(n.priceDate)}</div></div>`;else if(wp)priceBlock=`<div class="field"><label>Цена погонного материала</label><b>1 м — ${rub(wp.p1)}</b><div>2 м — ${rub(wp.p2)} · 4 м — ${rub(wp.p4)} · 6 м — ${rub(wp.p6)}</div><div class="hint">Это стоимость указанной длины по цене за метр. Наличие именно 2/4/6 м зависит от позиции и поставщика: ${esc(n.comment||'проверить у поставщика')}.</div></div>`;else if(sp)priceBlock=`<div class="field"><label>Цена листового материала</label><b>${esc(n.buyUnit==='щит'||n.calcUnit==='щит'?'Щит':'Лист')} — ${rub(sp.unit)} · 1 м² — ${rub(sp.perM2)}</b><div class="muted">Расчётная площадь позиции: ${fmt(sp.area)} м² · цена от ${esc(n.priceDate||'—')}</div></div>`;else priceBlock=`<div class="field"><label>Текущая цена</label><b>${n.price==null?'—':fmt(n.price)+' '+esc(n.priceBasis)}</b> <span class="muted">${esc(n.priceDate)}</span></div>`;modal('Номенклатура',`<div class="field"><label>ID</label><b>${esc(n.id)}</b></div><div class="field"><label>Наименование</label><b>${esc(n.name)}</b></div><div class="field"><label>Характеристика</label><div>${esc(n.spec||'—')}</div></div>${priceBlock}<div class="field"><label>Единица</label><div>Расчёт: ${esc(n.calcUnit||'—')} · закупка: ${esc(n.buyUnit||'—')}</div></div>${n.massPerM&&!pp?`<div class="field"><label>Масса 1 м</label><div>${fmt(n.massPerM)} кг/м</div></div>`:''}<div class="field"><label>Поставщик / источник</label><div>${esc(n.supplier||n.source||'—')}</div></div><button class="quick-action-wide nom-edit-btn" onclick="nomCorrection('${esc(n.id)}')"><span class="action-label">Исправить / уточнить</span><span class="action-icon" aria-hidden="true">✎</span></button>`,'nom-detail-sheet')}
function nomCorrection(id){const n=S.nomenclature.find(x=>x.id===id);if(!n)return;modal('Исправление Номенклатуры',`<div class="hint">Текущую карточку мы не переписываем на телефоне. Ваше уточнение сохраняется как отдельная заметка, привязанная к позиции <b>${esc(n.name)}</b>, и проходит обычную безопасную синхронизацию.</div><div class="field"><label>Что изменить / что стало известно</label><textarea id="nomCorrectionText" placeholder="Например: цена теперь 95 ₽/кг; другой поставщик; характеристика указана неверно..."></textarea></div><button class="primary" onclick="saveNomCorrection('${esc(n.id)}')">Сохранить исправление</button>`,'nom-correction-sheet')}
async function saveNomCorrection(id){const n=S.nomenclature.find(x=>x.id===id);const text=(document.getElementById('nomCorrectionText')?.value||'').trim();if(!n||!text)return;await putDraft({kind:'note',objectId:id,text:`Номенклатура: ${n.name}. ${text}`,context:'nomenclature',meta:{nomenclatureId:id,nomenclatureName:n.name,correction:true}});closeModal();await refreshPending();alert('Исправление сохранено как заметка по Номенклатуре. Оно появилось в «Загрузках» и не изменит исходную карточку до обработки.')}
function modal(title,body,mode=''){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;const sh=document.querySelector('#modal .sheet');if(sh)sh.className='sheet'+(mode?' '+mode:'');document.getElementById('modal').classList.remove('hidden')}function closeModal(){document.getElementById('modal').classList.add('hidden');const sh=document.querySelector('#modal .sheet');if(sh)sh.className='sheet'}
function quickNote(){modal('Быстрая заметка',`<div class="field"><label>Текст</label><textarea id="qText" placeholder="Что нужно запомнить / передать в систему"></textarea></div><button class="primary" onclick="saveTextDraft('note','')">Сохранить офлайн</button>`)}
function orderNote(id){modal(`Дополнение к ${id}`,`<div class="field"><label>Комментарий</label><textarea id="qText"></textarea></div><button class="primary" onclick="saveTextDraft('order-note','${id}')">Сохранить офлайн</button>`)}
function calcNote(id){modal(`Дополнить расчёт ${id}`,`<div class="field"><label>Изменение / уточнение</label><textarea id="qText" placeholder="Размер, материал, количество, покрытие, что пересчитать..."></textarea></div><button class="primary" onclick="saveTextDraft('calc-note','${id}')">Сохранить задание</button>`)}
async function walletModal(orderId=''){
  if(!hasPermission('wallet.add')&&backendSession()&&navigator.onLine!==false){try{await checkBackendAuth()}catch(_){}}
  if(!hasPermission('wallet.add')){showAppToast('Для этого пользователя не разрешено добавление в Кошелёк. Обновите доступ или проверьте право «Кошелёк: добавлять».','bad',5200);return}
  const oid=String(orderId||''),order=S.orders.find(o=>o.id===oid);
  const opts=(S.orders||[]).map(o=>`<option value="${esc(o.id)}">${esc(o.name||'')}</option>`).join('');
  modal(order?`Доход / расход · ${esc(order.id)}`:'Доход / расход',`<div class="field"><label>Тип</label><select id="wType"><option>Расход</option><option>Доход</option></select></div><div class="field"><label>Сумма, ₽</label><input id="wAmount" inputmode="decimal" placeholder="0"></div><div class="field"><label>Заказ</label><input id="wOrder" list="walletOrderList" placeholder="003 или 2026-003" value="${esc(oid)}" ${order?'readonly':''}><datalist id="walletOrderList">${opts}</datalist></div>${order?`<div class="hint">Операция автоматически привязана к заказу <b>${esc(order.id)} · ${esc(order.name)}</b>.</div>`:'<div class="hint">Можно ввести коротко: <b>002</b>, <b>003</b>. Если такой номер заказа один, приложение само подставит полный ID вида <b>2026-003</b>.</div>'}<div class="field"><label>Комментарий</label><textarea id="wText" placeholder="Что куплено / от кого поступили деньги"></textarea></div><button class="primary" onclick="saveWallet()">Сохранить офлайн</button>`)
}
const DB_NAME='production-v011';
const DB_SCHEMA=APP_RELEASE.dbSchema;
const DB_MIGRATIONS={
  1:db=>{if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts',{keyPath:'id'})},
  2:db=>{if(!db.objectStoreNames.contains('history'))db.createObjectStore('history',{keyPath:'id'})},
  3:db=>{if(!db.objectStoreNames.contains('activity'))db.createObjectStore('activity',{keyPath:'id'})},
  4:db=>{if(!db.objectStoreNames.contains('checklists'))db.createObjectStore('checklists',{keyPath:'id'})},
  5:db=>{if(!db.objectStoreNames.contains('snapshotCache'))db.createObjectStore('snapshotCache',{keyPath:'id'})}
};
function runDbMigrations(db,oldVersion,newVersion){for(let v=Math.max(1,oldVersion+1);v<=newVersion;v++){const migrate=DB_MIGRATIONS[v];if(migrate)migrate(db)}}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_SCHEMA);r.onupgradeneeded=e=>runDbMigrations(r.result,e.oldVersion,e.newVersion||DB_SCHEMA);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>console.warn('IndexedDB upgrade blocked by another open app window')})}
function offlineAccessValid(){const until=lsGet(BACKEND_KEYS.offlineUntil);const t=Date.parse(until||'');return Number.isFinite(t)&&t>Date.now()}
async function purgeExpiredSnapshotCache(){return false}
async function putSnapshotCache(snapshot){const db=await openDB();const tx=db.transaction('snapshotCache','readwrite');const rec={id:'current',savedAt:new Date().toISOString(),offlineAccessUntil:lsGet(BACKEND_KEYS.offlineUntil),user:backendUserPublic(),snapshot:normalizeSnapshot(snapshot)};tx.objectStore('snapshotCache').put(rec);return new Promise((res,rej)=>{tx.oncomplete=()=>{DATA_STATE.lastCacheAt=rec.savedAt;res(rec)};tx.onerror=()=>rej(tx.error)})}
async function getSnapshotCache(){const db=await openDB();const tx=db.transaction('snapshotCache','readonly');const r=tx.objectStore('snapshotCache').get('current');return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function clearStore(name){const db=await openDB();if(!db.objectStoreNames.contains(name))return;const tx=db.transaction(name,'readwrite');tx.objectStore(name).clear();return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function clearServerAccess(clearDevice=false,preserveSnapshot=true){lsDel(BACKEND_KEYS.session);lsDel(BACKEND_KEYS.sessionId);if(!preserveSnapshot){lsDel(BACKEND_KEYS.offlineUntil);lsDel(BACKEND_KEYS.user);await clearStore('snapshotCache');S=emptySnapshot();window.SNAPSHOT=S;applyBackendUser({});renderCoreScreens()}if(clearDevice){lsDel(BACKEND_KEYS.device);lsDel(BACKEND_KEYS.request);lsDel(BACKEND_KEYS.secret)}}
async function handleAuthFailure(err){const code=String(err||'');if(/^(USER_DISABLED|DEVICE_REVOKED)$/.test(code)){await clearServerAccess(false,false);return 'cleared'}if(/^SESSION_/.test(code)){await clearServerAccess(false,true);return 'preserved'}return 'ignored'}
async function performRemoteWipe(){const db=await openDB();const names=['drafts','history','activity','checklists','snapshotCache'].filter(n=>db.objectStoreNames.contains(n));if(names.length){const tx=db.transaction(names,'readwrite');names.forEach(n=>tx.objectStore(n).clear());await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}await clearServerAccess(false,false);alert('Администратор отозвал локальные данные этого устройства. Для продолжения нужен новый доступ.')}
function applySnapshot(snapshot){S=normalizeSnapshot(snapshot);window.SNAPSHOT=S;renderCoreScreens()}
function syncPermissionNav(){const b=document.querySelector('.nav-appdev');if(b)b.classList.toggle('hidden',!hasPermission('appdev.view'))}function renderCoreScreens(){syncPermissionNav();renderHome();renderOrders();renderBuy();if(document.getElementById('wallet')?.classList.contains('active'))renderWallet();if(document.getElementById('nom')?.classList.contains('active'))renderNom();if(document.getElementById('gallery')?.classList.contains('active'))renderGallery();if(document.getElementById('analytics')?.classList.contains('active'))renderAnalytics();if(document.getElementById('appdev')?.classList.contains('active'))renderAppDev();}
async function loadCachedSnapshot(){const rec=await getSnapshotCache();if(!rec?.snapshot)return false;const cachedNomRev=Math.floor(Number(rec.snapshot?.meta?.nomenclatureRevision||0));if(cachedNomRev>localNomRevision())setLocalNomRevision(cachedNomRev);const cachedRole=String(rec.user?.role||SESSION.role||'');const recUntil=Date.parse(rec.offlineAccessUntil||'');const leaseValid=Number.isFinite(recUntil)&&recUntil>Date.now();if(cachedRole!=='ADMIN1'&&!leaseValid)return false;if(rec.user){lsSet(BACKEND_KEYS.user,JSON.stringify(rec.user));applyBackendUser(rec.user)}applySnapshot(rec.snapshot);DATA_STATE.source='cache';DATA_STATE.lastCacheAt=rec.savedAt||'';DATA_STATE.lastError='';return true}
async function pullLiveSnapshot(opts={}){
  const token=backendSession();if(!token){DATA_STATE.lastError='NO_SESSION';return {ok:false,error:'NO_SESSION'}}
  DATA_STATE.lastAttemptAt=new Date().toISOString();
  const localRev=localNomRevision()||Math.floor(Number(S.meta?.nomenclatureRevision||0));
  const canOmit=opts.forceFullNomenclature!==true&&localRev>0&&Array.isArray(S.nomenclature)&&S.nomenclature.length>0;
  try{
    const body={action:'snapshot.pull',session_token:token,device_id:backendDeviceId(),app_version:APP_RELEASE.version};
    if(canOmit)body.omit_nomenclature=true;
    const d=await backendPost(body,{timeoutMs:Number(opts.timeoutMs||15000)});
    if(d?.ok&&d.snapshot){
      lsSet(BACKEND_KEYS.offlineUntil,d.offline_access_until||lsGet(BACKEND_KEYS.offlineUntil));lsSet(BACKEND_KEYS.user,JSON.stringify(d.user||{}));applyBackendUser(d.user||{});
      const raw={...d.snapshot,meta:{...(d.snapshot.meta||{})}};const omitted=raw.meta?.nomenclatureOmitted===true;
      if(omitted){raw.nomenclature=Array.isArray(S.nomenclature)?S.nomenclature:[];raw.meta.serverNomenclatureRevision=Math.floor(Number(raw.meta.nomenclatureRevision||0));raw.meta.nomenclatureRevision=localRev}
      const next=normalizeSnapshot(raw);
      if(isAdmin1()&&next.orders.length===0&&next.nomenclature.length===0){DATA_STATE.lastError='EMPTY_SERVER_SNAPSHOT';return {...d,ok:false,error:'EMPTY_SERVER_SNAPSHOT'}}
      if(!omitted){const rev=Math.floor(Number(next.meta?.nomenclatureRevision||0));if(rev>0)setLocalNomRevision(rev)}
      await putSnapshotCache(next);applySnapshot(next);DATA_STATE.source=omitted?'server+nom-delta':'server';DATA_STATE.lastPullAt=new Date().toISOString();DATA_STATE.lastError='';
      if(omitted&&!opts.skipNomDelta){const delta=await pullNomenclatureDelta({silent:true,allowFullFallback:true,timeoutMs:15000});return {...d,snapshot:window.SNAPSHOT,nomDelta:delta}}
      return {...d,snapshot:next};
    }
    const err=backendErrorCode(d,'SNAPSHOT_PULL_FAILED');DATA_STATE.lastError=err;
    if(d?.wipe_on_next_online){await performRemoteWipe();return {ok:false,error:'REMOTE_WIPE_COMPLETED'}}
    if(/^(SESSION_|USER_|DEVICE_)/.test(err))await handleAuthFailure(err);if(!opts.silent)alert('Не удалось получить данные: '+err);return {...d,error:err};
  }catch(e){
    DATA_STATE.lastError=String(e?.name==='AbortError'?'SNAPSHOT_TIMEOUT':(e?.message||e));const cached=await loadCachedSnapshot();if(!cached&&!opts.silent)alert('Сервер недоступен. Локального снимка пока нет.');return {ok:false,error:DATA_STATE.lastError,cached};
  }
}
async function refreshBackendData(){if(!backendSession())return {ok:false,error:'NO_SESSION'};const auth=await checkBackendAuth();if(!auth?.ok){await loadCachedSnapshot();return auth}return pullLiveSnapshot({silent:true,timeoutMs:20000})}
async function maybeBackgroundRefresh(reason='auto'){if(DATA_STATE.refreshing||!backendSession())return {ok:false,error:'NO_SESSION_OR_BUSY'};DATA_STATE.refreshing=true;try{const probe=await probeStableNetwork();if(!probe?.ok)return probe;const auth=await checkBackendAuth();if(!auth?.ok){await loadCachedSnapshot();return auth}const d=await pullLiveSnapshot({silent:true,timeoutMs:12000});if(d?.ok)syncReadyDrafts().catch(()=>{});return d}finally{DATA_STATE.refreshing=false}}
const HOLD_MS=5*60*1000;
function draftState(x){if(x.status==='ready'||x.status==='send-now')return 'ready';if(!x.holdUntil)return 'ready';return Date.now()<new Date(x.holdUntil).getTime()?'hold':'ready'}
function holdText(x){if(draftState(x)==='ready')return 'Готово к отправке';const ms=Math.max(0,new Date(x.holdUntil).getTime()-Date.now()),s=Math.ceil(ms/1000),m=Math.floor(s/60),ss=String(s%60).padStart(2,'0');return `До отправки ${m}:${ss}`}
async function putDraft(d){const db=await openDB();const tx=db.transaction('drafts','readwrite');const now=new Date();const rec={id:crypto.randomUUID(),createdAt:now.toISOString(),holdUntil:new Date(now.getTime()+HOLD_MS).toISOString(),status:'hold',...d};tx.objectStore('drafts').put(rec);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});await logActivity('created',rec);return rec}
async function getDraft(id){const db=await openDB();const tx=db.transaction('drafts','readonly');const r=tx.objectStore('drafts').get(id);return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function updateDraft(rec){const db=await openDB();const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(rec);return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function drafts(){const db=await openDB();const tx=db.transaction('drafts','readonly');const r=tx.objectStore('drafts').getAll();return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
































































































































































































































































async function sentHistory(){const db=await openDB();const tx=db.transaction('history','readonly');const r=tx.objectStore('history').getAll();return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function putHistory(rec){const db=await openDB();const tx=db.transaction('history','readwrite');tx.objectStore('history').put(rec);return new Promise((res,rej)=>{tx.oncomplete=()=>res(rec);tx.onerror=()=>rej(tx.error)})}
function backendUserPublic(){try{return JSON.parse(lsGet(BACKEND_KEYS.user)||'{}')}catch(_){return {}}}
async function activityHistory(){const db=await openDB();const tx=db.transaction('activity','readonly');const r=tx.objectStore('activity').getAll();return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function activityActionText(a){return a==='created'?'Добавлено':a==='edited'?'Изменено':a==='deleted'?'Удалено до отправки':a==='send_now'?'Отправлено вручную':a==='sync_started'?'Начата отправка':a==='ack_recheck'?'Повторная проверка приёма':a==='sync_error'?'Ошибка синхронизации':a==='delivered'?'Подтверждено сервером':a==='gallery_approved'?'Одобрено в Галерею':a==='gallery_deleted'?'Удалено из Галереи':a==='correction_created'?'Создано исправление':a==='quote_deleted'?'Удалён предварительный расчёт':a==='checklist_created'?'Создан чек-лист':a==='checklist_item_added'?'Добавлен пункт чек-листа':a==='checklist_item_done'?'Пункт чек-листа выполнен':a==='checklist_item_reopened'?'Пункт чек-листа возвращён':a==='checklist_item_deleted'?'Удалён пункт чек-листа':a||'Действие'}
function activityObjectLabel(x){const type=draftType(x);const ctx=x?.objectId?` · ${x.objectId}`:(x?.context?` · ${x.context}`:'');return `${type}${ctx}`}
async function logActivity(action,x={},detail=''){try{const db=await openDB();const u=backendUserPublic();const rec={id:crypto.randomUUID(),at:new Date().toISOString(),action:String(action||'action'),userId:u.user_id||SESSION.userId||'',userName:u.name||SESSION.name||'',deviceId:backendDeviceId(),kind:x?.kind||'',context:x?.context||'',objectId:x?.objectId||'',eventId:x?.id||'',detail:String(detail||'')};const tx=db.transaction('activity','readwrite');tx.objectStore('activity').put(rec);return new Promise((res,rej)=>{tx.oncomplete=()=>res(rec);tx.onerror=()=>rej(tx.error)})}catch(_){return null}}
































































































































































































































































async function rememberDelivered(x,r){const u=backendUserPublic();const rec={id:x.id,eventId:x.id,createdAt:x.createdAt||'',sentAt:new Date().toISOString(),kind:x.kind||'unknown',context:x.context||'',objectId:x.objectId||'',text:['photo','audio','document'].includes(x.kind)?'':(x.text||''),appName:x.appName||x.text||'',originalName:x.originalName||'',note:x.meta?.note||'',userId:u.user_id||SESSION.userId,userName:u.name||SESSION.name,status:'delivered',reviewStatus:'delivered',correctionMessage:'',duplicate:!!r?.duplicate,mediaUrl:r?.media_url||'',mediaUrls:Array.isArray(r?.media_urls)?r.media_urls:[],serverRef:r?.operation_id||r?.order_id||''};await putHistory(rec);await logActivity('delivered',x,r?.duplicate?'Повторный ACK, дубль не создан':'Сервер подтвердил приём');return rec}
function historyStatusText(h){if(h.reviewStatus==='needs_correction')return 'требует исправления';if(h.reviewStatus==='corrected')return 'исправлено';return 'доставлено'}
function historyStatusClass(h){return h.reviewStatus==='needs_correction'?'correction':'delivered'}
function historyItem(h){const body=h.text||h.note||h.appName||h.originalName||'Запись';const where=h.objectId?`Заказ ${h.objectId}`:(h.context==='wallet'?'Кошелёк':h.context==='purchase'?'Закупки по заказам':h.context==='portfolio-candidate'?'Галерея':String(h.context||'')==='general'?'Общее':h.context||'Общее');const link=h.mediaUrl?`<button onclick="window.open('${esc(h.mediaUrl)}','_blank')">Открыть на сервере</button>`:'';return `<div class="history-item"><div class="history-head"><div><div class="history-title">${esc(draftType(h))}</div><div class="history-meta">${esc(where)} · отправлено ${new Date(h.sentAt).toLocaleString('ru-RU')}<br>${esc(h.userName||h.userId||'')}</div></div><span class="history-status ${historyStatusClass(h)}">${esc(historyStatusText(h))}</span></div><div class="history-body">${esc(body)}</div>${h.correctionMessage?`<div class="risk"><b>Замечание:</b>${esc(h.correctionMessage)}</div>`:''}<div class="history-actions">${link}<button onclick="openCorrection('${esc(h.id)}')">Уточнить / исправить</button></div></div>`}
async function openCorrection(id){const all=await sentHistory();const h=all.find(x=>x.id===id);if(!h)return;modal('Уточнение к отправленной записи',`<div class="hint">Исходная запись останется в истории. Исправление будет новой записью, связанной с событием ${esc(h.eventId||h.id)}.</div><div class="field"><label>Что исправить / уточнить</label><textarea id="correctionText"></textarea></div><button class="primary" onclick="saveCorrection('${esc(id)}')">Сохранить как новую запись</button>`)}
async function saveCorrection(id){const all=await sentHistory();const h=all.find(x=>x.id===id);const text=(document.getElementById('correctionText')?.value||'').trim();if(!h||!text)return;const correction=await putDraft({kind:'note',objectId:h.objectId||'',text,context:h.context||'general',meta:{correctionOf:h.eventId||h.id,correction:true}});await logActivity('correction_created',correction,`Исправление к ${h.eventId||h.id}`);closeModal();await refreshPending();if(document.getElementById('sync').classList.contains('active'))await renderSync();alert('Исправление сохранено как новая запись. Исходная отправка остаётся в истории.')}
































































































































































































































































async function clearDrafts(){const db=await openDB();const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').clear();return new Promise(res=>tx.oncomplete=res)}
async function deleteDraftDirect(id){const db=await openDB();const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').delete(id);return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function rerenderAfterDraftChange(){await refreshPending();if(document.getElementById('sync').classList.contains('active'))await renderSync();if(document.getElementById('wallet').classList.contains('active'))renderWalletDrafts();if(document.getElementById('avito').classList.contains('active'))renderAvito();if(document.getElementById('gallery').classList.contains('active'))renderGallery();if(document.getElementById('calculator').classList.contains('active'))renderCalculator();if(document.getElementById('buy').classList.contains('active'))renderBuy()}
async function deleteDraft(id){if(!confirm('Удалить эту локальную запись? Если она ещё не отправлена, в рабочую систему она не попадёт.'))return;const rec=await getDraft(id);await deleteDraftDirect(id);if(rec)await logActivity('deleted',rec);await rerenderAfterDraftChange()}
const SEND_NOW_LOCKS=new Set();
async function sendNowDraft(id){if(SEND_NOW_LOCKS.has(id))return;SEND_NOW_LOCKS.add(id);try{const rec=await getDraft(id);if(!rec)return;if(rec.meta?.syncState==='sending'||rec.meta?.syncState==='confirming')return;rec.status='ready';rec.holdUntil=new Date().toISOString();rec.meta={...(rec.meta||{}),sendNowRequested:true,sendNowAt:new Date().toISOString(),syncState:'sending',lastSyncError:''};await updateDraft(rec);await logActivity('send_now',rec);await rerenderAfterDraftChange();if(navigator.onLine&&backendSession()){const r=await syncDraftById(id);if(r?.ok&&r?.server_received){alert(r?.duplicate?'Приём подтверждён сервером. Повторная копия не создана. Запись перенесена в историю.':'Сервер подтвердил приём. Запись перенесена в историю.')}else{alert('Подтверждение пока не получено. Запись сохранена локально. Кнопка станет «Проверить приём» — повторная проверка использует тот же event_id и не создаёт дубль.')}}else{const still=await getDraft(id);if(still){still.meta={...(still.meta||{}),syncState:'error',lastSyncError:navigator.onLine?'Нет активной серверной сессии':'Нет сети'};await updateDraft(still)}alert(navigator.onLine?'Запись готова. Для отправки сначала активируйте устройство в разделе «Загрузки».':'Сети нет. Запись готова и останется локально до появления связи.');await rerenderAfterDraftChange()}}finally{SEND_NOW_LOCKS.delete(id)}}
async function editDraft(id){const rec=await getDraft(id);if(!rec)return;const isFile=['photo','audio','document'].includes(rec.kind);const currentText=isFile?(rec.meta?.note||''):(rec.text||'');modal('Изменить перед отправкой',`<div class="hint">После изменения защитный таймер снова начнётся с 5 минут. При необходимости можно нажать «Отправить сейчас».</div><div class="field"><label>Привязка / заказ</label><input id="editObjectId" value="${esc(rec.objectId||'')}" placeholder="Например: 2026-003 или ОБЩЕЕ"></div><div class="field"><label>${isFile?'Комментарий к файлу':'Текст / дополнение'}</label><textarea id="editDraftText">${esc(currentText)}</textarea></div><button class="primary" onclick="saveDraftEdit('${esc(id)}')">Сохранить изменения</button>`)}
async function saveDraftEdit(id){const rec=await getDraft(id);if(!rec)return;const objectId=document.getElementById('editObjectId').value.trim(),t=document.getElementById('editDraftText').value.trim();rec.objectId=objectId;rec.updatedAt=new Date().toISOString();rec.holdUntil=new Date(Date.now()+HOLD_MS).toISOString();rec.status='hold';if(['photo','audio','document'].includes(rec.kind))rec.meta={...(rec.meta||{}),note:t};else rec.text=t;await updateDraft(rec);await logActivity('edited',rec);closeModal();await rerenderAfterDraftChange()}
async function saveTextDraft(kind,id){const text=document.getElementById('qText').value.trim();if(!text)return;await putDraft({kind,objectId:id,text});closeModal();await refreshPending()}
async function saveWallet(){
  const type=document.getElementById('wType').value,amountRaw=document.getElementById('wAmount').value.trim().replace(',','.'),rawOrder=document.getElementById('wOrder').value.trim(),comment=document.getElementById('wText').value.trim(),amount=Number(amountRaw);
  if(!Number.isFinite(amount)||amount<=0){showAppToast('Укажите сумму больше 0.','bad',3200);return}
  const ref=orderRefResolve(rawOrder);if(ref.error){showAppToast(ref.error,'bad',5200);return}
  const objectId=ref.id,raw=`${type}: ${amountRaw} ₽${comment?' · '+comment:''}`;
  await putDraft({kind:'finance-entry',context:'wallet',objectId,text:raw,meta:{type,financeType:type,amount:amount,currency:'RUB',rawText:raw,orderRefInput:rawOrder}});
  closeModal();await refreshPending();renderWallet();
  showAppToast(objectId?`Сохранено в Загрузки · заказ ${objectId}`:'Сохранено в Загрузки · без заказа','ok',3600)
}
function fileExt(f,fallback){const n=(f?.name||'').split('.');if(n.length>1&&n.at(-1).length<=8)return n.at(-1).toLowerCase();const t=f?.type||'';return (t.split('/')[1]||fallback||'bin').replace(/[^a-z0-9]+/gi,'')||fallback||'bin'}
function appFileName(kind,id,f){const stamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,17);const scope=(id||'GENERAL').replace(/[^0-9A-Za-z_-]/g,'_');const tag=kind==='photo'?'PHOTO':kind==='audio'?'AUDIO':'DOC';return `PROD_${scope}_${tag}_${stamp}.${fileExt(f,kind==='photo'?'jpg':kind==='audio'?'m4a':'bin')}`}
const photoInput=document.getElementById('photoInput');const galleryFileInput=document.getElementById('galleryFileInput');const documentInput=document.getElementById('documentInput');let photoCtx={kind:'general',id:''};let galleryFileCtx={kind:'portfolio-candidate',id:'GALLERY',sourceType:'gallery'};let documentCtx={kind:'purchase',id:'PURCHASE'};function pickPhoto(kind,id,extra={}){photoCtx={kind,id,...extra};photoInput.click()}function pickGalleryFiles(kind,id,extra={}){galleryFileCtx={kind,id:id||'GALLERY',sourceType:'gallery',...extra};galleryFileInput.click()}function pickScreenshot(kind,id,extra={}){galleryFileCtx={kind,id:id||'',sourceType:'screenshot',...extra};galleryFileInput.click()}function pickDocument(kind,id){documentCtx={kind,id:id||''};documentInput.click()}function linkedOrderMeta(kind,id){if(kind!=='portfolio-candidate'||!id||id==='GALLERY')return {};const o=S.orders.find(x=>x.id===id);return {orderId:id,orderName:o?.name||'',finishedProduct:true}}
photoInput.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const appName=appFileName('photo',photoCtx.id,f),note=String(photoCtx.note||'').trim();await putDraft({kind:'photo',objectId:photoCtx.id,text:appName,appName,originalName:f.name||'',mime:f.type||'image/*',size:f.size||0,blob:f,context:photoCtx.kind,meta:{...linkedOrderMeta(photoCtx.kind,photoCtx.id),...(note?{note}: {})}});e.target.value='';closeModal();await refreshPending();if(photoCtx.kind==='portfolio-candidate')await renderGallery();showAppToast(photoCtx.kind==='portfolio-candidate'?'Фото сохранено кандидатом. Внутренний комментарий не публикуется.':'Фото сохранено локально в «Загрузки».','ok',4200)})
galleryFileInput.addEventListener('change',async e=>{const files=[...(e.target.files||[])];if(!files.length)return;const note=String(galleryFileCtx.note||'').trim();for(const f of files){const appName=appFileName('photo',galleryFileCtx.id,f);await putDraft({kind:'photo',objectId:galleryFileCtx.id,text:appName,appName,originalName:f.name||'',mime:f.type||'image/*',size:f.size||0,blob:f,context:galleryFileCtx.kind,meta:{source:'phone-gallery',captureKind:galleryFileCtx.sourceType||'gallery',...linkedOrderMeta(galleryFileCtx.kind,galleryFileCtx.id),...(note?{note}: {})}})}e.target.value='';closeModal();await refreshPending();if(galleryFileCtx.kind==='portfolio-candidate'){await renderGallery();showAppToast(`Добавлено в кандидаты: ${files.length}. Комментарий хранится отдельно от фото.`,'ok',4200)}else if(galleryFileCtx.kind==='avito'){await renderAvito();showAppToast(`Добавлено материалов Avito: ${files.length}.`,'ok',3200)}else{showAppToast(`Добавлено файлов: ${files.length}.`,'ok',3200)}})
documentInput.addEventListener('change',async e=>{const files=[...(e.target.files||[])];if(!files.length)return;for(const f of files){const appName=appFileName('document',documentCtx.id,f);await putDraft({kind:'document',objectId:documentCtx.id,text:appName,appName,originalName:f.name||'',mime:f.type||'application/octet-stream',size:f.size||0,blob:f,context:documentCtx.kind,meta:{source:'phone-file'}})}e.target.value='';await refreshPending();alert(`Добавлено документов: ${files.length}. Они сохранены офлайн и ждут синхронизации.`)})
const audioInput=document.getElementById('audioInput');let recorder=null,chunks=[],recording=false,voiceCtx={kind:'general',id:''},recordingStartedAt=0,recordingTicker=null;
function pickAudio(kind,id){voiceCtx={kind,id};audioInput.click()}
function updateRecordingClock(){const el=document.getElementById('recordingTime');if(!el||!recordingStartedAt)return;const sec=Math.max(0,Math.floor((Date.now()-recordingStartedAt)/1000)),m=Math.floor(sec/60),ss=String(sec%60).padStart(2,'0');el.textContent=`${String(m).padStart(2,'0')}:${ss}`}
function setRecordingIndicator(on){const bar=document.getElementById('recordingBar');if(!bar)return;bar.classList.toggle('hidden',!on);if(on){updateRecordingClock();if(recordingTicker)clearInterval(recordingTicker);recordingTicker=setInterval(updateRecordingClock,500)}else{if(recordingTicker)clearInterval(recordingTicker);recordingTicker=null;recordingStartedAt=0}}
function stopVoiceRecording(){if(recording&&recorder&&recorder.state!=='inactive')recorder.stop()}
audioInput.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const appName=appFileName('audio',voiceCtx.id,f);await putDraft({kind:'audio',objectId:voiceCtx.id,text:appName,appName,originalName:f.name||'',mime:f.type||'audio/*',size:f.size||0,blob:f,context:voiceCtx.kind});e.target.value='';await refreshPending();showAppToast('Аудио сохранено в «Загрузки». Там его можно прослушать, удалить или отправить.','ok',4800)})
async function toggleVoice(kind,id){if(recording){stopVoiceRecording();return}voiceCtx={kind,id};const direct=window.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder;if(!direct){pickAudio(kind,id);return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};recorder.onstop=async()=>{recording=false;setRecordingIndicator(false);stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});const fake={name:'recording.webm',type:blob.type,size:blob.size};const appName=appFileName('audio',voiceCtx.id,fake);await putDraft({kind:'audio',objectId:voiceCtx.id,text:appName,appName,originalName:'',mime:blob.type,size:blob.size,blob,context:voiceCtx.kind});await refreshPending();if(document.getElementById('sync')?.classList.contains('active'))await renderSync();showAppToast('Запись остановлена и сохранена в «Загрузки».','ok',4600)};recorder.start(250);recording=true;recordingStartedAt=Date.now();setRecordingIndicator(true);showAppToast('Запись началась. Нажмите «Стоп» на панели записи или «Диктофон» ещё раз.','recording',2400)}catch(e){setRecordingIndicator(false);streamSafeStop();showAppToast('Не удалось запустить встроенный диктофон. Открою выбор аудиофайла.','info',3200);pickAudio(kind,id)}}
function streamSafeStop(){try{if(recorder?.stream)recorder.stream.getTracks().forEach(t=>t.stop())}catch(_){}}
async function refreshPending(){const a=await drafts();window.__draftCache=a;document.getElementById('netText').textContent=(navigator.onLine?'Онлайн':'Офлайн');const up=uploadAttention(a),top=document.getElementById('topLoadsCount'),topBtn=top?.closest('.top-loads');if(top)top.textContent=up.total;if(topBtn){topBtn.classList.toggle('loads-error',up.errors>0);topBtn.title=`Требуют внимания: ${up.total}; ошибок: ${up.errors}; готовы: ${up.ready}; всего локально: ${a.length}`}const b=document.getElementById('walletDraftBadge');if(b)b.textContent=a.filter(x=>x.kind==='wallet'||x.kind==='finance-entry'||x.context==='wallet').length;const h=document.getElementById('homePendingSummary');if(h)h.textContent=a.length}
async function renderWalletDrafts(){const el=document.getElementById('walletDrafts');if(!el)return;const a=(await drafts()).filter(x=>x.kind==='wallet'||x.context==='wallet');el.innerHTML=a.length?a.map(x=>`<div class="draft"><b>${esc(draftType(x))}</b> · ${esc(x.text||'вложение')}<small>${new Date(x.createdAt).toLocaleString('ru-RU')}</small></div>`).join(''):`<div class="muted">Нет локальных черновиков.</div>`}
let tempUrls=[];function resetTempUrls(){tempUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(_){}});tempUrls=[]}function blobUrl(b){const u=URL.createObjectURL(b);tempUrls.push(u);return u}
function draftType(x){return ({photo:'Фото',audio:'Голос',wallet:'Доход / расход','finance-entry':'Доход / расход','order-note':'Заметка к заказу','calc-note':'Дополнение к расчёту','avito-note':'Заметка Avito','portfolio-candidate':'Фото готового изделия / Галерея','quote-draft':'Предварительный расчёт','quote-promote':'Перевод в заказ','publish-draft':'Черновик публикации',document:'Документ',note:'Заметка'}[x.kind]||x.kind||'Запись')}
function draftWhere(x){if(String(x.context||'').startsWith('avito')||x.kind==='avito-note')return 'Аналитика Avito';if(x.context==='calculator')return `Калькулятор · ${x.objectId||'черновик'}`;if(x.context==='gallery-share'||x.context==='gallery-share-media')return 'Галерея · публикация';if(x.context==='portfolio-candidate')return x.objectId&&x.objectId!=='GALLERY'?`Галерея · заказ ${x.objectId}`:'Галерея · кандидат';if(x.context==='wallet'||x.kind==='wallet'||x.kind==='finance-entry')return x.objectId?`Кошелёк · заказ ${x.objectId}`:'Кошелёк';if(x.context==='purchase')return 'Закупки по заказам';if(x.objectId&&/^20\d\d-/.test(String(x.objectId)))return `Заказ ${x.objectId}`;return 'Общее'}
function queueItem(x){let media='';if(x.kind==='photo'&&x.blob instanceof Blob)media=`<div class="queue-media"><img class="queue-img" src="${blobUrl(x.blob)}" alt="локальное фото"></div>`;if(x.kind==='audio'&&x.blob instanceof Blob)media=`<div class="queue-media"><audio class="queue-audio" controls preload="metadata" src="${blobUrl(x.blob)}"></audio></div>`;if(Array.isArray(x.attachments)&&x.attachments.length){const thumbs=x.attachments.filter(a=>a?.blob instanceof Blob&&String(a.mime||a.blob.type||'').startsWith('image/')).slice(0,4).map(a=>`<img class="queue-attachment-thumb" src="${blobUrl(a.blob)}" alt="вложение">`).join('');media+=`<div class="queue-attachments"><b>Вложений: ${x.attachments.length}</b>${thumbs?`<div class="queue-attachment-grid">${thumbs}</div>`:''}</div>`}const name=x.appName||x.text||'вложение';const orig=x.originalName&&x.originalName!==name?`<div class="file-meta">Исходный файл телефона: ${esc(x.originalName)}</div>`:'';const note=x.meta?.note?`<div style="margin-top:6px"><b>Комментарий:</b> ${esc(x.meta.note)}</div>`:'';const st=draftState(x),syncState=x.meta?.syncState||'',isBusy=syncState==='sending'||syncState==='confirming',isErr=syncState==='error';const badgeText=isBusy?'проверяю приём':isErr?'нужно проверить':st==='hold'?'проверка 5 мин':'готово';const badgeKind=isErr?'bad':isBusy?'':st==='hold'?'warn':'ok';const actionText=isBusy?'Проверяю…':isErr?'Проверить приём':'Отправить сейчас';const statusText=isBusy?(syncState==='sending'?'Отправляется на сервер…':'Проверяется подтверждение сервера…'):isErr?`Сохранено локально · ${esc(friendlySyncError(x.meta?.lastSyncError))}`:holdText(x);return `<div class="queue-item ${isBusy?'sending':''} ${isErr?'error':''}" data-draft-id="${esc(x.id)}"><div class="queue-head"><div><div class="queue-type">${esc(draftType(x))}</div><div class="queue-context">${esc(draftWhere(x))} · ${new Date(x.createdAt).toLocaleString('ru-RU')}</div></div><span class="badge ${badgeKind}" data-status-badge="${esc(x.id)}">${badgeText}</span></div>${!['photo','audio','document'].includes(x.kind)?`<div style="margin-top:6px">${esc(x.text||'')}</div>`:`<div class="file-meta">Файл приложения: ${esc(name)}</div>${orig}`}${note}${media}<div class="queue-status-line ${st}" data-status-line="${esc(x.id)}"><span class="sync-state-text" ${isBusy||isErr?'':'data-hold-until="'+esc(x.holdUntil||'')+'"'}>${statusText}</span><b>${navigator.onLine?'сеть есть':'офлайн'}</b></div><div class="queue-actions v023"><button class="edit-btn" onclick="editDraft('${esc(x.id)}')" ${isBusy?'disabled':''}>Изменить</button><button class="danger" onclick="deleteDraft('${esc(x.id)}')" ${isBusy?'disabled':''}>Удалить</button><button class="send-now-btn" onclick="sendNowDraft('${esc(x.id)}')" ${isBusy?'disabled':''}>${actionText}</button></div></div>`}
let holdTicker=null;let syncView='ready';
function updateHoldCountdowns(){document.querySelectorAll('[data-hold-until]').forEach(el=>{const until=el.getAttribute('data-hold-until'),id=el.closest('[data-draft-id]')?.getAttribute('data-draft-id');if(!until){el.textContent='Готово к отправке';return}const ms=new Date(until).getTime()-Date.now();if(ms<=0){el.textContent='Готово к отправке';const badge=id?document.querySelector(`[data-status-badge="${CSS.escape(id)}"]`):null,line=id?document.querySelector(`[data-status-line="${CSS.escape(id)}"]`):null;if(badge){badge.textContent='готово';badge.classList.remove('warn');badge.classList.add('ok')}if(line){line.classList.remove('hold');line.classList.add('ready')}}else{const sec=Math.ceil(ms/1000),m=Math.floor(sec/60),ss=String(sec%60).padStart(2,'0');el.textContent=`До автоотправки ${m}:${ss}`}})}
function setSyncView(v){syncView=v;renderSync()}
async function renderSync(){resetTempUrls();const a=await drafts(),hist=(await sentHistory()).sort((x,y)=>String(y.sentAt||'').localeCompare(String(x.sentAt||''))),holdItems=a.filter(x=>draftState(x)==='hold'),errorItems=a.filter(x=>x.meta?.syncState==='error'),readyItems=a.filter(x=>draftState(x)==='ready'&&x.meta?.syncState!=='error'),req=lsGet(BACKEND_KEYS.request),session=backendSession();let body='';if(syncView==='history')body=hist.length?hist.slice(0,100).map(historyItem).join(''):'<div class="muted">История пока пуста.</div>';else{const items=syncView==='errors'?errorItems:syncView==='hold'?holdItems:readyItems;body=items.length?items.sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt))).map(queueItem).join(''):'<div class="muted">Здесь сейчас пусто.</div>'}document.getElementById('sync').innerHTML=`<button class="back" onclick="go('home')">← Главная</button><div class="sync-tabs"><button class="${syncView==='ready'?'active':''}" onclick="setSyncView('ready')"><b>${readyItems.length}</b><span>готовы</span></button><button class="${syncView==='errors'?'active error':''}" onclick="setSyncView('errors')"><b>${errorItems.length}</b><span>ошибки</span></button><button class="${syncView==='hold'?'active':''}" onclick="setSyncView('hold')"><b>${holdItems.length}</b><span>5 минут</span></button><button class="${syncView==='history'?'active':''}" onclick="setSyncView('history')"><b>${hist.length}</b><span>история</span></button></div><div class="section-title"><h2>${syncView==='history'?'История':syncView==='errors'?'Требуют проверки':syncView==='hold'?'Ожидают автоотправки':'Готовы к отправке'}</h2><span class="badge">${navigator.onLine?'онлайн':'офлайн'}</span></div>${body}<div class="settings-block sync-connection"><h3>Подключение устройства</h3><div class="sync-list"><div><span>Доступ</span><b>${esc(backendAccessLabel())}</b></div><div><span>Устройство</span><b>${esc(backendDeviceId().slice(0,18))}…</b></div></div><div class="queue-actions v023">${session?'<button class="edit-btn" onclick="manualRefreshData()">Обновить</button>':`<button class="edit-btn" onclick="requestDeviceAccess()">Отправить заявку</button><button class="send-now-btn" onclick="activateApprovedDevice()">Проверить одобрение</button>`}</div>${req?`<div class="muted">Заявка: ${esc(req.slice(0,18))}…</div>`:''}</div>`;updateHoldCountdowns();if(holdTicker)clearInterval(holdTicker);holdTicker=setInterval(()=>{if(document.getElementById('sync').classList.contains('active'))updateHoldCountdowns()},1000)}
async function simulateSync(){const a=await drafts();if(!a.length){alert('Очередь пуста.');return}if(!backendSession()){alert('Сначала подключите и активируйте это устройство.');return}await withBusy('Синхронизирую записи…',()=>syncReadyDrafts({notify:true,manual:true}))}
function network(){const online=navigator.onLine!==false;document.getElementById('netStatus').classList.toggle('online',online);document.getElementById('netStatus').classList.toggle('offline',!online);document.getElementById('offlineBanner').classList.toggle('hidden',online);const netText=document.getElementById('netText');if(netText)netText.textContent=online?'Онлайн':'Офлайн';refreshPending();if(online&&backendSession()){setTimeout(()=>autoRefreshData('online'),250);setTimeout(()=>syncReadyDrafts(),700);setTimeout(()=>ensureNomenclatureDeltaSetup(),1200);setTimeout(()=>recoverPendingAcks(),1700);setTimeout(()=>refreshPinnedOfflinePacks(),2400)}}window.addEventListener('online',network);window.addEventListener('offline',network);
let LAST_VISIBLE_REFRESH=0;document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'||!backendSession())return;const now=Date.now();if(now-LAST_VISIBLE_REFRESH>30000){LAST_VISIBLE_REFRESH=now;autoRefreshData('resume').catch(()=>{});syncReadyDrafts().catch(()=>{});recoverPendingAcks().catch(()=>{})}});
setInterval(()=>{if(backendSession()&&navigator.onLine!==false){syncReadyDrafts().catch(()=>{})}},15000);
































































































































































































































































const updateState={manifest:null};
function updateEligible(v={}){const stage=String(v.rolloutStage||v.releaseStage||'stable').toLowerCase();if(stage==='paused')return false;if(stage==='admin1')return isAdmin1();return true}
function showUpdateBanner(v={}){if(!updateEligible(v))return;updateState.manifest=v||{};window.__PROD_UPDATE_READY=true;const box=document.getElementById('updateBanner');const text=document.getElementById('updateText');if(text)text.textContent=`Доступно обновление${v?.buildId?' · '+v.buildId:''}`;if(box)box.classList.remove('hidden')}
document.addEventListener('production:update-ready',e=>showUpdateBanner(e.detail||{}));
































































































































































































































































async function initPwaUpdateLayer(){
  if(!('serviceWorker' in navigator) || location.protocol==='file:') return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    window.__PROD_SW_REG=reg;
    reg.addEventListener('updatefound',()=>{
      const w=reg.installing;
      if(!w)return;
      w.addEventListener('statechange',()=>{
        if(w.state==='installed' && navigator.serviceWorker.controller){
          window.__PROD_UPDATE_READY=true;
          document.dispatchEvent(new CustomEvent('production:update-ready',{detail:updateState.manifest||{rolloutStage:'admin1'}}));
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
    try{await reg.update()}catch(_){}
    fetch('./version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{
      if(v&&v.buildId){updateState.manifest=v;if(v.buildId!==APP_RELEASE.buildId&&updateEligible(v)){window.__PROD_UPDATE_READY=true;document.dispatchEvent(new CustomEvent('production:update-ready',{detail:v}))}}
    }).catch(()=>{});
  }catch(err){ console.warn('PWA init failed',err); }
}
window.applyAvailableUpdate=async function(){
  setBusy('Устанавливаю обновление…');
  const manifest=updateState.manifest||{};
  if(!updateEligible(manifest)){clearBusy();alert('Это обновление пока доступно только ADMIN1.');return}
  const reg=window.__PROD_SW_REG;
  if(!reg){location.reload();return}
  const activateWaiting=()=>{if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'});return true}return false};
  if(activateWaiting()) return;
  try{await reg.update()}catch(_){}
  if(activateWaiting()) return;
  const w=reg.installing;
  if(w){
    const deadline=setTimeout(()=>{if(!activateWaiting())location.reload()},6000);
    w.addEventListener('statechange',()=>{
      if(w.state==='installed'){
        clearTimeout(deadline);
        if(!activateWaiting())location.reload();
      }
    },{once:false});
    return;
  }
  location.reload();
};
































































































































































































































































async function startApplication(){initTheme();purgeLegacyDemoAdminState();hydrateBackendUser();await openDB();let loaded=await loadCachedSnapshot();if(!loaded){S=emptySnapshot();window.SNAPSHOT=S;DATA_STATE.source='empty';renderCoreScreens()}network();initPwaUpdateLayer();if(backendSession()){setTimeout(()=>autoRefreshData('startup').catch(()=>{}),120);setTimeout(()=>syncReadyDrafts().catch(()=>{}),650);setTimeout(()=>ensureNomenclatureDeltaSetup(),1100);setTimeout(()=>recoverPendingAcks(),1600);setTimeout(()=>refreshPinnedOfflinePacks(),2400)}else backendPing({timeoutMs:2500})}
startApplication();