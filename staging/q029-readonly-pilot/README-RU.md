# Q029 RH9 — отдельный read-only Apps Script

Задача: создать только НОВЫЙ проект GAS для пробного Wallet. Не обновлять старый production Apps Script проект и его deployment IDs.
Код: staging/q029-readonly-pilot/Code.gs в ветке q029-rh9-readonly-isolated-pilot.
Источник: PR26 exact SHA 5f569d4a1f56acf9cea3daee3dd8bcfcc7b94269.
Этот скрипт вырезает только read-only функцию Wallet и обработчики с проверкой wallet.view; нет изменений финансовых строк, HEAD, технических сессий или устройств.

1. Создать НОВЫЙ проект: https://script.google.com/home/projects/create; название Q029-Wallet-RH9-READONLY-PILOT.
2. Открыть Code.gs, удалить начальную myFunction и вставить ВЕСЬ исходник Code.gs из GitHub.
3. Сохранить. Не вставлять в существующий production-проект. Не присылать в чат session tokens, пароли, API-ключи.
4. Развернуть > Новое развертывание > тип Веб-приложение. Описание: Q029 rh9 isolated read only.
5. Выполнять от имени: меня (аккаунт с доступом к исходной таблице). Доступ для первого открытия: только я. Предоставить обычные Google разрешения на чтение.
6. Скопировать НОВУЮ ссылку /exec, открыть под тем же Google аккаунтом. На странице должен быть JSON: ok=true, service=q029-isolated-readonly-pilot, mode=READ_ONLY, version=backend-0.2.34-staging-q029, source_sha=5f569d4a1f56acf9cea3daee3dd8bcfcc7b94269.
7. Прислать скриншот JSON-ответа или нового развертывания. Не показывать коды, личные сессии и секреты. URL /exec можно скрыть.

Важные ограничения:
- HTTP разрешён: GET ping; POST ping; POST wallet.canonical.get при действующем session token и wallet.view. Все остальные POST команды получают READ_ONLY_PILOT_ACTION_DENIED.
- Код не содержит обработчиков записи, auth touch не вызывается.
- Это первый этап backend. Полный реальный Wallet в браузере ещё не проверен.
- Staging app.js сейчас жёстко содержит production Apps Script URL, поэтому его нельзя просто открывать с новым backend. Для второго шага нужна отдельная изолированная копия клиента и контроль обычной авторизации.
- Текущие production PWA, Finance106/HEAD116, Q044 opening и PR26 не трогать. Q029 IN_PROGRESS / NO-GO.
