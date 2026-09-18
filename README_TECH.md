# Производство — PWA v0.3.2 OFFLINE-FIRST STAGING R2


Build: **2026-09-18.3**. Backend compatibility: **backend-0.2.1**. Rollout: **ADMIN1 only**.


## Главный принцип
Приложение сначала открывает последний успешно сохранённый business snapshot из IndexedDB и только после этого проверяет сеть. Отсутствие/плохое качество сети не превращает интерфейс в пустой.


## Startup
1. app-shell берётся из Service Worker cache;
2. lastGoodSnapshot читается из IndexedDB;
3. Заказы/Номенклатура отрисовываются сразу;
4. затем выполняется короткий network probe;
5. только при нормальной сети запускаются auth.check + snapshot.pull;
6. новый snapshot сначала успешно сохраняется в IndexedDB, затем применяется в UI;
7. network/auth timeout не очищает lastGoodSnapshot.


## ADMIN1 offline policy
Для доверенного ADMIN1 последний snapshot читается независимо от временного offline lease. Обычный USER после истечения lease не получает штатный рабочий offline snapshot.


## Auth/revoke policy R2
- SESSION_INVALID / SESSION_REVOKED / SESSION_EXPIRED: server session снимается, но lastGoodSnapshot сохраняется для ADMIN1 offline work;
- USER_DISABLED / DEVICE_REVOKED: business snapshot очищается;
- wipe_on_next_online / remote wipe: очищаются назначенные рабочие local stores;
- legacy purgeExpiredSnapshotCache больше не удаляет snapshot по TTL.


## Auto-refresh gate
Автообновление не стартует при browser offline, Save-Data, slow-2g/2g, RTT > 1400 ms, downlink < 0.45 Mbps или backend ping > 2500 ms. Ручное обновление остаётся доступным.


## Code vs data
Service Worker обновляет код отдельным staged-процессом. Business data обновляются через snapshot.pull без reload приложения.


## Автоматический contract test
PASS:
- startup читает cache раньше сети;
- новый server snapshot сохраняется до замены UI;
- expired ADMIN1 snapshot читается;
- expired USER snapshot штатно не открывается;
- SESSION_EXPIRED сохраняет snapshot;
- DEVICE_REVOKED / USER_DISABLED очищают business snapshot;
- Service Worker navigation cache-first.


Полноценный Chromium/PWA e2e в текущей среде не запустился: локальная навигация браузера блокируется администратором среды. Поэтому обязательный финальный e2e остаётся на реальном Android ADMIN1.


## Приёмочный Android-тест
1. Online: один раз «Обновить данные».
2. Убедиться, что видны 3 заказа и актуальная Номенклатура.
3. Полностью закрыть PWA.
4. Отключить Wi‑Fi и мобильные данные.
5. Открыть PWA снова.
6. Заказы и Номенклатура должны появиться без «Обновить данные».
7. Сделать pull-to-refresh без сети — данные должны остаться.
8. Включить нормальную сеть — фоновый refresh не должен очищать UI.


## Rollback
Target: **2026-09-17.5**, dbSchema 5, без очистки IndexedDB.


## Media
Предыдущий PWA v0.3.3 MEDIA build 2026-09-18.2 был собран поверх offline-first build 2026-09-18.1. После R2 он считается STAGING-SUPERSEDED и перед rollout должен быть rebased на 2026-09-18.3. Backend media 0.2.2 остаётся отдельным staging и live не менялся.