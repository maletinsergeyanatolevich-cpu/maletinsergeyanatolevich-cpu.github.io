# Производство — TECH-PWA v0.3.1 LIVE-PULL

Модульная PWA поверх утверждённого UX v0.2.13. Текущий build: **2026-09-17.5**. Backend: **backend-0.2.1**.

## Безопасность данных
- deployable app-shell не содержит PRIVATE business snapshot;
- бизнес-данные приходят только после server-side auth через `snapshot.pull`;
- разрешённый offline snapshot хранится в IndexedDB только до `offline_access_until`;
- revoke/invalid session очищает server access и business cache;
- обычное истечение TTL не удаляет drafts/history/activity/checklists;
- explicit remote wipe удаляет локальные рабочие stores;
- ACK-before-delete и повтор с тем же `event_id` сохранены.

## Обновления
- `version.json` — release manifest;
- service worker устанавливает новый app-shell без очистки IndexedDB;
- обновление build 2026-09-17.5 помечено `rolloutStage=admin1`; UI предлагает его только ADMIN1;
- IndexedDB использует явный реестр миграций 1→5; текущий build не меняет schema 5 и не выполняет destructive migration;
- service worker сохраняет один предыдущий app-shell cache как rollback reserve.

### Rollback
Если новый shell окажется проблемным, вернуть файлы предыдущего build **2026-09-17.4** и опубликовать его повторно. Поскольку оба build используют dbSchema 5, локальную IndexedDB очищать нельзя и не требуется. Один предыдущий cache сохраняется как дополнительный резерв, но источником rollback остаётся сохранённая предыдущая сборка.

## Дневная / ночная тема
В верхней панели между названием экрана и состоянием сети добавлен переключатель: **☀️** в дневной теме, **🌙** в ночной. Выбор хранится локально на конкретном устройстве и переживает перезапуск приложения; бизнес-данные и права тема не затрагивает.

## Staged rollout
Текущий active-device contour состоит только из ADMIN1-устройств, поэтому build 2026-09-17.5 можно проверять как ADMIN1-first. После проверки manifest можно перевести в stable для подключения остальных пользователей.
