# Производство — PWA v0.3.3 OFFLINE+MEDIA

Build: **2026-09-18.5**  
Rollout: **ADMIN1 only**  
Required backend: **backend-0.2.3 MEDIA-COMPAT**  
DB schema: **5**  
Rollback: **2026-09-18.3** without IndexedDB reset.

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
1. Update ADMIN1 PWA to build 2026-09-18.5.
2. Refresh business data once.
3. Orders should show photo counters: 2026-002 = 1, 2026-003 = 2, 2026-004 = 11.
4. Open an order on a good network: first three photos may load automatically.
5. Open additional photos manually or use “Загрузить все при связи”.
6. Close the PWA, disable network, reopen: lastGoodSnapshot and cached photos must remain.
7. Pull-to-refresh offline must not blank business data.
