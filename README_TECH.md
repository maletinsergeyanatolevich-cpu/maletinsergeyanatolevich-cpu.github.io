# Производство — TECH-PWA v0.3.1 LIVE-PULL

Модульная PWA поверх утверждённого UX v0.2.13. Визуальная схема не переделывалась; изменения технические.

## Что изменено
- приватный `snapshot.private.js` полностью удалён из deployable app-shell;
- бизнес-данные загружаются только после серверной авторизации через backend action `snapshot.pull`;
- live snapshot сохраняется в IndexedDB как разрешённый офлайн-кэш;
- офлайн-кэш открывается только пока действует `offline_access_until`;
- при server-side revoke/invalid session кэш бизнес-данных очищается;
- `wipe_on_next_online` очищает локальные drafts/history/activity/checklists/snapshot cache и серверную сессию;
- server permissions используются в клиентском UI, но безопасность всё равно обеспечивается backend-фильтрацией и permission enforcement;
- service worker больше не кэширует приватный бизнес-снимок.

## Требование перед live-тестом
На Apps Script должен быть развёрнут backend **v0.2.0** с `snapshot.pull`, admin/audit endpoints и новыми permissions `activity.view`, `checklists.view`, `checklists.create`, `checklists.edit`. Текущий публичный backend v0.1 не поддерживает `snapshot.pull`.

## Безопасность
Эту сборку уже можно размещать как app-shell: внутри файлов нет встроенного снимка заказов/кошелька/номенклатуры. Однако публиковать постоянный production URL следует только после обновления backend до v0.2 и сквозной проверки ADMIN1.
