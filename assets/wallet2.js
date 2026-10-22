/* Q079 Wallet2: replacement for #wallet ONLY, existing Production PWA, STAGING SOURCE.
   No older Finance/Orders/SNAPSHOT/IndexedDB wallet fallback. Server is authoritative.
   This module does not start or deploy itself, and contains no user data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ProductionWallet2 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const CONTRACT='Q079-WALLET2-API-v1';
  const CATEGORIES=[
    ['Деньги','CASH_RECEIPT','Поступление'], ['Деньги','CUSTODY_TRANSFER','Перевод между кошельками'],
    ['Участники','PARTNER_CONTRIBUTION','Вклад участника'],['Участники','PARTNER_RETURN','Возврат вложения'],
    ['Материалы','MATERIAL_PURCHASE','Покупка материала'],['Материалы','MATERIAL_ALLOCATE','Материал в заказ'],
    ['Зарплата','WAGE_ACCRUE','Начисление зарплаты'],['Зарплата','WAGE_PAY','Выплата зарплаты'],
    ['Обязательства','SUPPLIER_PAY','Оплата поставщику'],['Обязательства','LOAN_RECEIVE','Получен заём'],
    ['Обязательства','LOAN_REPAY','Возврат займа'],['Расходы','OPERATING_EXPENSE','Операционный расход'],
    ['Планы','PLAN_CREATE','План'],['Планы','PLAN_SPEND','Оплата по плану'],
    ['Резервы','RESERVE_CREATE','Резерв денег'],['Резервы','RESERVE_RELEASE','Освободить резерв'],
    ['Заказы','REVENUE_RECOGNIZE','Признать выручку'],['Заказы','ORDER_COSTS_CONFIRM','Подтвердить себестоимость'],
    ['Прибыль','PROFIT_VERIFY','Проверить прибыль'],['Прибыль','PROFIT_ASSIGN','Распределить прибыль'],
    ['Прибыль','PROFIT_PAY','Выплата прибыли'],['Участники','PARTNER_WITHDRAWAL','Вывод участником'],
    ['Прибыль','PROFIT_OFFSET','Зачесть ранее выведенное'],
    ['Начало','OPENING_CONFIRM','Подтвердить начальные сведения']
  ];
  const FIELDS={
    CASH_RECEIPT:[['amountKop','amount','Сумма, ₽'],['custodyLocation','id','Где находятся деньги'],['purpose','choice','Назначение', 'UNCLASSIFIED_RECEIPT|CUSTOMER_ADVANCE'],['orderId','id?','ID заказа (для аванса)']],
    CUSTODY_TRANSFER:[['amountKop','amount','Сумма, ₽'],['fromLocation','id','Откуда'],['toLocation','id','Куда']],
    PARTNER_CONTRIBUTION:[['amountKop','amount','Сумма, ₽'],['partyId','id','ID участника'],['kind','choice','Тип вклада','RETURNABLE|SUPPORT'],['custodyLocation','id','Где деньги']],
    PARTNER_RETURN:[['amountKop','amount','Сумма, ₽'],['partyId','id','ID участника'],['custodyLocation','id','Откуда платим']],
    MATERIAL_PURCHASE:[['lotId','id','ID партии'],['nomenclatureId','id','ID материала'],['quantityMilli','quantity','Количество'],['totalCostKop','amount','Общая стоимость, ₽']],
    MATERIAL_ALLOCATE:[['lotId','id','ID партии'],['orderId','id','ID заказа'],['quantityMilli','quantity','Списано, ед.']],
    WAGE_ACCRUE:[['accrualId','id','ID начисления'],['amountKop','amount','Начислено, ₽'],['orderId','id?','ID заказа (необязательно)']],
    WAGE_PAY:[['accrualId','id','ID начисления'],['amountKop','amount','Выплата, ₽'],['custodyLocation','id','Откуда платим']],
    SUPPLIER_PAY:[['obligationId','id','ID долга'],['amountKop','amount','Сумма, ₽'],['custodyLocation','id','Откуда платим']],
    LOAN_RECEIVE:[['loanId','id','ID займа'],['amountKop','amount','Основная сумма, ₽'],['custodyLocation','id','Где деньги']],
    LOAN_REPAY:[['loanId','id','ID займа'],['principalKop','amountZero','Основной долг, ₽'],['interestKop','amountZero','Проценты, ₽'],['custodyLocation','id','Откуда платим']],
    OPERATING_EXPENSE:[['amountKop','amount','Сумма, ₽'],['custodyLocation','id','Откуда платим'],['orderId','id?','ID заказа (необязательно)'],['planId','id?','ID плана (необязательно)']],
    PLAN_CREATE:[['planId','id','ID плана'],['amountKop','amount','План, ₽'],['dueDate','date','Срок']],
    PLAN_SPEND:[['planId','id','ID плана'],['amountKop','amount','Фактическая оплата, ₽'],['custodyLocation','id','Откуда платим'],['orderId','id?','ID заказа (необязательно)']],
    RESERVE_CREATE:[['reserveId','id','ID резерва'],['planId','id','ID плана'],['amountKop','amount','Резерв, ₽']],
    RESERVE_RELEASE:[['reserveId','id','ID резерва'],['amountKop','amount','Освободить, ₽']],
    REVENUE_RECOGNIZE:[['orderId','id','ID заказа'],['amountKop','amount','Подтверждённая выручка, ₽'],['priceState','choice','Статус цены','KNOWN|UNKNOWN']],
    ORDER_COSTS_CONFIRM:[['orderId','id','ID заказа']],
    PROFIT_VERIFY:[['evidenceId','id','ID документа проверки']],
    PROFIT_ASSIGN:[['amountKop','amount','Распределяемая прибыль, ₽'],['policyId','id','ID решения о долях']],
    PROFIT_PAY:[['partyId','id','ID участника'],['amountKop','amount','Выплата, ₽'],['custodyLocation','id','Откуда платим']],
    PARTNER_WITHDRAWAL:[['partyId','id','ID участника'],['amountKop','amount','Вывод, ₽'],['custodyLocation','id','Откуда платим']],
    PROFIT_OFFSET:[['partyId','id','ID участника'],['amountKop','amount','Сумма зачёта, ₽']],
    OPENING_CONFIRM:[['evidenceId','id','ID подтверждения владельца']]
  };
  const VIEWS=[['summary','Обзор'],['operations','Операции'],['stock','Материалы'],['debts','Долги'],['plans','Планы'],['partners','Участники'],['profit','Прибыль']];
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function decimal(v,scale,label,allowZero=false){
    const s=String(v??'').trim().replace(',','.');
    if(!/^\d+(?:\.\d+)?$/.test(s))throw Error(label+': укажите корректное число');
    const parts=s.split('.');if((parts[1]||'').length>scale)throw Error(label+': слишком много знаков после запятой');
    const n=BigInt(parts[0])*(10n**BigInt(scale))+BigInt((parts[1]||'').padEnd(scale,'0')||0);
    if((!allowZero&&n===0n)||n>BigInt(Number.MAX_SAFE_INTEGER))throw Error(label+': значение вне диапазона');
    return Number(n);
  }
  function id(v,label,optional=false){const s=String(v??'').trim();if(optional&&!s)return undefined;
    if(!/^[-_A-Za-z0-9.:]{3,110}$/.test(s)||['constructor','prototype','__proto__'].includes(s))throw Error(label+': неверный ID');return s;}
  function amount(v,label='Сумма',allowZero=false){return decimal(v,2,label,allowZero);}
  function qty(v,label='Количество'){return decimal(v,3,label);}
  function money(k){if(k===undefined||k===null)return 'неизвестно';if(!Number.isSafeInteger(k))return 'нет данных';return (k/100).toLocaleString('ru-RU',{style:'currency',currency:'RUB',minimumFractionDigits:2,maximumFractionDigits:2});}
  function ensureResponse(d,expectedGeneration){
    if(!d||d.ok!==true||d.contract!==CONTRACT||typeof d.generation!=='string'||!/^Q079[.:-]/.test(d.generation)||d.generation!==expectedGeneration)throw Error('Поколение или формат ответа сервера не подтверждены. Данные старого Кошелька не используются.');
    if(!Number.isSafeInteger(d.revision)||d.revision<0)throw Error('Неверная версия журнала');
    if(!d.summary||typeof d.summary!=='object'||d.summary.generation!==expectedGeneration)throw Error('Нет нового финансового журнала');
    return d;
  }
  // Mirror the conservative server grant without changing existing USER rights.
  function needsPermission(type){return ['CASH_RECEIPT','OPERATING_EXPENSE'].includes(type)?'wallet.add':'admin';}
  function fieldsFor(type){return FIELDS[type]||[];}
  function buildEvent(type,values,config){
    if(!FIELDS[type])throw Error('Тип операции не поддерживается');
    const o={type,generation:id(config.generation,'Поколение'),eventId:id(config.eventId,'ID события'),requestId:id(config.requestId,'ID запроса'),expectedRevision:config.revision,effectiveDate:String(config.effectiveDate||'')};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(o.effectiveDate)||o.effectiveDate<'2026-10-21')throw Error('Дата до начала учёта запрещена');
    for(const [key,kind,label,options] of FIELDS[type]){
      const raw=values[key];
      if(kind==='id?' && !String(raw??'').trim())continue;
      if(kind==='id'||kind==='id?')o[key]=id(raw,label);
      else if(kind==='amount'||kind==='amountZero')o[key]=amount(raw,label,kind==='amountZero');
      else if(kind==='quantity')o[key]=qty(raw,label);
      else if(kind==='date'){const s=String(raw||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error(label+': неверная дата');o[key]=s;}
      else if(kind==='choice'){const choices=options.split('|');if(!choices.includes(raw))throw Error(label+': выберите вариант');o[key]=raw;}
    }
    if(type==='CASH_RECEIPT'&&o.purpose==='CUSTOMER_ADVANCE'&&!o.orderId)throw Error('Для аванса нужен ID заказа');
    if(type==='MATERIAL_PURCHASE'){
      const legs=values.legs||[];if(!Array.isArray(legs)||!legs.length)throw Error('Нужны источники оплаты');
      o.legs=legs.map((x,i)=>{
        const y={kind:x.kind,amountKop:amount(x.amount,'Часть оплаты '+(i+1))};
        if(x.kind==='BUSINESS')y.custodyLocation=id(x.location,'Кошелёк');
        else if(x.kind==='PERSONAL_RETURNABLE'||x.kind==='PERSONAL_SUPPORT')y.partyId=id(x.party,'Участник');
        else if(x.kind==='SUPPLIER_DEBT')y.obligationId=id(x.obligation,'Долг поставщику');
        else throw Error('Неизвестный способ оплаты');return y;
      });
      if(o.legs.reduce((t,x)=>BigInt(t)+BigInt(x.amountKop),0n)!==BigInt(o.totalCostKop))throw Error('Сумма частей оплаты не равна стоимости покупки');
    }
    if(type==='PROFIT_ASSIGN'){
      const shares=values.shares||[];if(!Array.isArray(shares)||!shares.length)throw Error('Укажите доли участников');
      o.shares=shares.map(x=>({partyId:id(x.party,'Участник'),basisPoints:decimal(x.percent,2,'Доля, %')}));
      if(o.shares.reduce((s,x)=>s+x.basisPoints,0)!==10000||new Set(o.shares.map(x=>x.partyId)).size!==o.shares.length)throw Error('Уникальные доли должны составлять 100%');
    }
    return o;
  }
  function sections(data,view){
    const s=data?.summary||{};const led=data?.ledgers||{};
    const cards={
      summary:[['Деньги производства',s.cashKop],['Зарезервировано',s.reservedKop],['Свободно',s.freeKop],['Себестоимость материалов на складе',s.stockCostKop]],
      operations:[['Приход периода',led.periodIncomeKop],['Расход периода',led.periodExpenseKop]],
      stock:[['Остаток материалов по себестоимости',s.stockCostKop]],
      debts:[['Поставщики',led.supplierDebtKop],['Займы',led.loanDebtKop],['Зарплата к выплате',led.wageDebtKop]],
      plans:[['Запланировано',led.plannedKop],['Резервы',s.reservedKop]],
      partners:[['Возвратные вложения',led.partnerReturnableKop],['Прибыль к выплате',led.partnerProfitDueKop]],
      profit:[['Расчётная прибыль',s.recognizedProfitKop],['Не распределено',s.unassignedProfitKop]]
    };
    const list=(cards[view]||cards.summary).map(([l,k])=>`<div class="w2-tile"><span>${esc(l)}</span><strong>${money(k)}</strong></div>`).join('');
    let note='';if(view==='profit')note='<p class="w2-muted">Распределение возможно только после проверки фактов и подтверждения владельцем.</p>';
    if(view==='stock')note='<p class="w2-muted">Стоимость покупки не списывается в прибыль до расходования материала на заказ.</p>';
    if(view==='operations')note='<p class="w2-muted">Перемещение денег между местами хранения не является доходом или расходом.</p>';
    const rows=(data?.recentEvents||[]).slice(0,30).map(x=>`<li><b>${esc(x.type||'Операция')}</b><span>${esc(x.effectiveDate||'')} · ${esc(x.eventId||'')}</span></li>`).join('');
    return `<div class="w2-metrics">${list}</div>${note}${view==='operations'?`<h3>Журнал операций</h3><ul class="w2-ledger">${rows||'<li>Операций нового периода пока нет</li>'}</ul>`:''}`;
  }
  function options(type){return (FIELDS[type]||[]).map(([key,kind,label,choices])=>{
    const input=kind==='choice'?`<select name="${key}">${choices.split('|').map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select>`:`<input name="${key}" type="${kind==='date'?'date':'text'}" inputmode="${kind==='amount'||kind==='amountZero'||kind==='quantity'?'decimal':'text'}" autocomplete="off" placeholder="${esc(label)}" ${kind==='id?'?'':'required'}>`;
    return `<label class="w2-field"><span>${esc(label)}</span>${input}</label>`;
  }).join('');}
  function legForm(i){return `<div class="w2-leg"><span>Часть оплаты ${i+1}</span><select name="leg${i}kind"><option value="BUSINESS">Деньги производства</option><option value="PERSONAL_RETURNABLE">Личные, вернуть участнику</option><option value="PERSONAL_SUPPORT">Безвозвратная помощь</option><option value="SUPPLIER_DEBT">Долг поставщику</option></select><input name="leg${i}amount" inputmode="decimal" placeholder="Сумма, ₽" required><input name="leg${i}ref" placeholder="ID кошелька / участника / долга" required></div>`;}
  function shareForm(i){return `<div class="w2-share"><label>Участник <input name="share${i}party" placeholder="ID участника" required></label><label>Доля, % <input name="share${i}percent" inputmode="decimal" placeholder="50,00" required></label></div>`;}
  function create({rootElement,api,session,deviceId,allow,clock,requestIds}={}){
    if(!rootElement||typeof api!=='function'||typeof session!=='function'||typeof deviceId!=='function')throw Error('Wallet2 needs existing PWA container and authenticated API');
    const date=clock||(()=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tomsk',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;});
    const newId=requestIds||(()=>{if(typeof crypto==='undefined'||typeof crypto.randomUUID!=='function')throw Error('Secure request IDs unavailable');return crypto.randomUUID();});
    let generation=null,data=null,serverWriteEnabled=false,view='summary',loading=false,error='',sending=false,type=null,legCount=1,shareCount=2, lastUser=null,lastToken=null,lastDevice=null,pending=null;
    const allowed=typeof allow==='function'?allow:()=>false;
    function safeUser(){return String(session()?.userId||'');}
    // Per-tab pending event, user+generation pinned; NO token. A deliberate retry reuses the exact ID.
    // No old-generation replay and no automatic dispatch after browser restart.
    function pendingKey(user,gen){return 'q079-w2-unacknowledged:'+user+':'+gen;}
    function pendingStore(){try{return typeof sessionStorage!=='undefined'?sessionStorage:null;}catch(_){return null;}}
    function savePending(value){pending=value;const storage=pendingStore();if(!storage)return;
      try{storage.setItem(pendingKey(value.userId,value.generation),JSON.stringify(value));}catch(_){}
    }
    function loadPending(user,gen){const storage=pendingStore();if(!storage)return null;
      let raw;try{raw=storage.getItem(pendingKey(user,gen));}catch(_){return null;}
      if(!raw)return null;
      try{const p=JSON.parse(raw);
        if(p&&p.userId===user&&p.generation===gen&&p.event?.generation===gen&&p.event?.eventId&&p.event?.requestId&&!p.event.actor&&!p.event.permissions&&!p.event.role)return p;
      }catch(_){}
      throw Error('Незавершённая операция повреждена. Нужна ручная сверка перед новым вводом.');
    }
    function clearPending(){const p=pending;pending=null;if(!p)return;try{pendingStore()?.removeItem(pendingKey(p.userId,p.generation));}catch(_){}}

    function render(){
      const active=safeUser(),token=String(session()?.token||''),device=String(deviceId()||''),has=allowed('wallet.view');
      if(active!==lastUser||token!==lastToken||device!==lastDevice){data=null;generation=null;serverWriteEnabled=false;type=null;pending=null;lastUser=active;lastToken=token;lastDevice=device;error='';}
      if(!has||!active){rootElement.innerHTML='<div class="w2-root"><h2>Кошелёк</h2><p role="alert">Нет активной сессии или права просмотра.</p></div>';return;}
      const header=`<div class="w2-head"><button data-w2="back" class="w2-back" type="button">← Главная</button><h2>Кошелёк</h2><span class="w2-chip">Новый учёт</span></div>`;
      const status=error?`<p role="alert" class="w2-error">${esc(error)}</p>`:'';
      const pre=!data?`<div class="w2-block"><p>${loading?'Подключение к новому журналу…':'Новый финансовый журнал ещё не подтверждён сервером.'}</p><p class="w2-muted">Старые финансы и сохранённые на телефоне суммы сюда не подставляются.</p></div>`:'';
      const info=data?`<div class="w2-bar"><span>Поколение: ${esc(data.generation)}</span><span>Версия: ${data.revision}</span></div><p class="w2-opening">${data.openingStatus==='CONFIRMED'?'Начальные сведения подтверждены':'Начальные сведения ещё не подтверждены. Пустой журнал не означает нулевую кассу.'}</p>`:'';
      const warn=data?.summary?.issues?.length?`<div class="w2-notices" role="status">${data.summary.issues.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'';
      const tabs=data?`<nav class="w2-tabs" aria-label="Разделы Кошелька">${VIEWS.map(([k,l])=>`<button type="button" data-view="${k}" class="${k===view?'selected':''}" aria-current="${k===view?'page':'false'}">${l}</button>`).join('')}</nav>`:'';
      const doBtn=data?`<div class="w2-actions"><button type="button" class="w2-primary" data-w2="choose" ${sending||!serverWriteEnabled||pending?'disabled':''}>+ Операция</button><button type="button" data-w2="refresh">Обновить</button></div>`:`<button type="button" data-w2="refresh">Проверить сервер</button>`;
      const pendingBanner=pending?`<div class="w2-block w2-pending" role="alert"><b>Операция без подтверждённого ответа</b><p>Новая операция заблокирована до сверки. Повтор использует тот же ID запроса, без второго списания.</p><button type="button" data-w2="retry" ${sending||!serverWriteEnabled?'disabled':''}>Повторить тот же запрос</button></div>`:'';
      const pick=type===null?'':`<form id="w2-form"><div class="w2-form-title"><h3>${esc(CATEGORIES.find(x=>x[1]===type)?.[2]||type)}</h3><button type="button" data-w2="close">×</button></div><p class="w2-muted">Суммы в рублях, сохраняются в целых копейках. Запись требует ответа сервера.</p>${options(type)}${type==='MATERIAL_PURCHASE'?Array.from({length:legCount},(_,i)=>legForm(i)).join('')+'<button type="button" data-w2="addLeg">+ Источник оплаты</button>':''}${type==='PROFIT_ASSIGN'?Array.from({length:shareCount},(_,i)=>shareForm(i)).join('')+'<button type="button" data-w2="addShare">+ Участник</button>':''}<button type="submit" class="w2-primary" ${sending?'disabled':''}>${sending?'Отправка…':'Проверить и сохранить'}</button></form>`;
      const menu=type===null&&data?`<div class="w2-type-picker" hidden>${CATEGORIES.map(([group,k,title])=>`<button type="button" data-type="${k}" ${needsPermission(k)==='admin'&&!allowed('wallet.sensitive')?'disabled':''}>${esc(title)}<small>${esc(group)}</small></button>`).join('')}</div>`:'';
      rootElement.innerHTML=`<div class="w2-root">${header}${status}${info}${warn}${pre}${tabs}${data?sections(data,view):''}${doBtn}${pendingBanner}${menu}${pick}</div>`;
      attach();
    }
    function attach(){rootElement.querySelectorAll?.('[data-w2]').forEach(el=>el.addEventListener('click',()=>{
      const k=el.dataset.w2;if(k==='refresh')void refresh();else if(k==='retry')void retryPending();else if(k==='choose'){const m=rootElement.querySelector('.w2-type-picker');if(m)m.hidden=!m.hidden;}
      else if(k==='close'){type=null;render();}else if(k==='back'){if(typeof window!=='undefined'&&typeof window.go==='function')window.go('home');}
      else if(k==='addLeg'){if(legCount<6){const form=rootElement.querySelector('#w2-form');form?.querySelector('button[data-w2="addLeg"]')?.insertAdjacentHTML('beforebegin',legForm(legCount++));}}else if(k==='addShare'){if(shareCount<10){const form=rootElement.querySelector('#w2-form');form?.querySelector('button[data-w2="addShare"]')?.insertAdjacentHTML('beforebegin',shareForm(shareCount++));}}
    }));
    rootElement.querySelectorAll?.('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;render();}));
    rootElement.querySelectorAll?.('[data-type]').forEach(el=>el.addEventListener('click',()=>{if(el.disabled)return;type=el.dataset.type;legCount=1;shareCount=2;render();}));
    rootElement.querySelector?.('#w2-form')?.addEventListener('submit',evt=>{evt.preventDefault();void submit(evt.currentTarget);});}
    async function refresh(){if(loading||sending)return;loading=true;error='';render();
      try{const token=session()?.token,dev=deviceId();if(!token||!dev)throw Error('Нет активной сессии или устройства');
        const hello=await api({action:'wallet2.bootstrap',session_token:token,device_id:dev},{timeoutMs:15000});
        if(hello?.ok!==true||hello.contract!==CONTRACT||!/^Q079[.:-]/.test(String(hello.generation||'')))throw Error('Сервер ещё не разрешил новое поколение Кошелька');
        const r=await api({action:'wallet2.read',session_token:token,device_id:dev,business_generation:hello.generation},{timeoutMs:30000});
        ensureResponse(r,hello.generation);
        if(session()?.token!==token||deviceId()!==dev)throw Error('Сессия изменилась');
        data=r;generation=r.generation;serverWriteEnabled=hello.writeEnabled===true;
        if(!pending)pending=loadPending(safeUser(),generation);
      }catch(e){data=null;generation=null;serverWriteEnabled=false;error=String(e?.message||e);}
      finally{loading=false;render();}}
    function collect(form){const fd=new FormData(form),v=Object.fromEntries(fd.entries());
      if(type==='MATERIAL_PURCHASE')v.legs=Array.from({length:legCount},(_,i)=>({kind:v['leg'+i+'kind'],amount:v['leg'+i+'amount'],location:v['leg'+i+'ref'],party:v['leg'+i+'ref'],obligation:v['leg'+i+'ref']}));
      if(type==='PROFIT_ASSIGN')v.shares=Array.from({length:shareCount},(_,i)=>({party:v['share'+i+'party'],percent:v['share'+i+'percent']}));
      return v;}
    async function submit(form){if(pending){error='Сначала повторите или сверьте незавершённую операцию';render();return;}if(sending||!data||!generation||!serverWriteEnabled||!allowed('wallet.add')){error='Нет подтверждённых прав или данных сервера';render();return;}
      if(needsPermission(type)==='admin'&&!allowed('wallet.sensitive')){error='Эта операция требует разрешения ADMIN1';render();return;}
      let event;const token=session()?.token,dev=deviceId();
      try{if(!token||!dev)throw Error('Нет сессии');event=buildEvent(type,collect(form),{generation,revision:data.revision,effectiveDate:date(),eventId:'EVT-'+newId(),requestId:'REQ-'+newId()});}
      catch(e){error=String(e?.message||e);render();return;}
      savePending({userId:safeUser(),generation,event});type=null;sending=true;error='';render();
      await dispatchPending(token,dev);
    }
    async function dispatchPending(token,dev){
      const p=pending;if(!p||!data||p.generation!==generation||p.userId!==safeUser()){error='Операция не соответствует пользователю или поколению';render();return;}
      sending=true;error='';render();
      try{
        if(session()?.token!==token||deviceId()!==dev)throw Error('Сессия изменилась до отправки');
        const r=await api({action:'wallet2.commit',session_token:token,device_id:dev,business_generation:p.generation,event:p.event},{timeoutMs:60000});
        ensureResponse(r,p.generation);
        if(r.acceptedEventId!==p.event.eventId||r.acceptedRequestId!==p.event.requestId)throw Error('Ответ сервера не подтверждает конкретную операцию');
        if(session()?.token!==token||deviceId()!==dev||safeUser()!==p.userId)throw Error('Сессия изменилась до подтверждения');
        clearPending();sending=false;type=null;await refresh();
      }catch(e){sending=false;error=String(e?.message||e)+' · Запрос сохранён. При необходимости повторите ТОТ ЖЕ запрос.';render();}
    }
    async function retryPending(){if(!pending||sending||!serverWriteEnabled||!allowed('wallet.add'))return;
      const token=session()?.token,dev=deviceId();if(!token||!dev)return;
      await dispatchPending(token,dev);
    }
    return Object.freeze({render,refresh,buildEvent,ensureResponse,get state(){return {generation,revision:data?.revision||null,hasData:!!data,error,view,loading,sending};}});
  }
  return Object.freeze({create,buildEvent,ensureResponse,amount,qty,money,CATEGORIES,FIELDS,CONTRACT});
});
