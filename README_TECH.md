# Производство — PWA v0.3.5 UX+DELTA








Build: **2026-09-19.2**  
Rollout: **ADMIN1 only**  
Required backend: **backend-0.2.6 WALLET-HISTORY**  
DB schema: **5**  
Rollback: **2026-09-18.7** without IndexedDB reset.








## What stays from v0.3.2
- cache-first app shell;
- lastGoodSnapshot before network;
- ADMIN1 business snapshot survives network/session-expiry failures;
- USER_DISABLED / DEVICE_REVOKED / remote wipe keep the R2 security rules;
- background refresh is network-quality gated.








## Order media
- snapshot contains only order photo metadata for v0.3.3+ clients;
- image bytes are requested through authenticated `order.media.get`;
- Drive files are not made public;
- first three order images may prefetch only on a good connection;
- viewed/downloaded images are cached in `production-order-media-v1`;
- cache is bounded and keyed by mediaId + modifiedAt;
- cached photos can be shown offline;
- the Orders list uses only an already-cached first image and does not mass-download photos.








## Compatibility
backend-0.2.3 returns media manifests only to v0.3.3+ clients. Older v0.3.2 clients continue receiving the old order shape with an empty images array.








## Acceptance
1. Update ADMIN1 PWA to build 2026-09-18.6.
2. Refresh business data once.
3. Orders should show photo counters: 2026-002 = 1, 2026-003 = 2, 2026-004 = 11.
4. Open an order on a good network: first three photos may load automatically.
5. Open additional photos manually or use “Загрузить все при связи”.
6. Close the PWA, disable network, reopen: lastGoodSnapshot and cached photos must remain.
7. Pull-to-refresh offline must not blank business data.
















## Updater hotfix 2026-09-18.6
Previous v0.3.2/v0.3.3 updater could detect a newer version.json but, when no waiting worker already existed, merely reload the cache-first shell. This could leave an installed PWA on the old build. Build .6 explicitly calls ServiceWorkerRegistration.update(), registers with updateViaCache='none', then activates a waiting/installing worker before reload. No IndexedDB or business-cache reset is performed.
















## Reliability update 2026-09-18.7
- manual photo opening does not depend on browser network-quality estimates;
- small active-order media sets (<=15 MB, <=25 files) may cache fully when the order is opened online;
- “Хранить офлайн” pins an order for future media refresh; unpinning is non-destructive;
- sync.push uses event.status after a lost ACK;
- stuck sending/confirming/error drafts are checked by event_id and moved to history if the server already has them;
- Drive/Sheets remain source of truth; no IndexedDB schema reset.




## Nomenclature delta-sync 2026-09-19.1
- Google Sheets remains the source of truth.
- Full active nomenclature remains in the local snapshot for offline search.
- Normal snapshot.pull requests omit the nomenclature array once a local revision exists.
- nomenclature.delta returns only rows with _SYNC_REV newer than the device revision.
- Merge key is stable ID позиции, never sheet row number.
- Активна=Нет removes the item from the local active catalogue.
- Structural row/column changes require a safe full catalogue refresh.
- Backend installs onEdit/onChange plus a periodic integrity hash sweep.
- _NOM_SEARCH remains a separate search index and is not changed.
- DB schema stays at 5; rollback to build 2026-09-18.7 is safe without clearing local data.


## Audio 38 UX package — build 2026-09-19.2
- visible progress overlay for manual data refresh, manual sync and app update;
- green bottom “Обновить” button after “Загрузки”, using the same access/data refresh action;
- bottom navigation approximately 1.5× larger;
- automatic heavy-media sync only when the browser confirms Wi-Fi/ethernet; text remains eligible on stable network; manual heavy send can explicitly override;
- Wallet shows existing transaction history from Google Sheets: date, +/- amount, category, order and comment;
- Purchases explanatory “Сводно по всем активным заказам” block removed;
- Nomenclature list shows per-meter price and mass when available;
- Gallery purple introductory hero removed; WhatsApp added as publication channel/status;
- Sales Analytics introductory copy removed, leaving channel rows;
- Orders, Home, General Information, Calculator and Checklists business behavior otherwise unchanged;
- nomenclature delta-sync and service-worker update hotfix preserved;
- DB schema remains 5; rollback to build 2026-09-19.1 is safe without clearing local data.