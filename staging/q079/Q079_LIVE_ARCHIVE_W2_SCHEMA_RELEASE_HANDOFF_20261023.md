# Q079 Wallet2 — existing PWA release handoff — 2026-10-23

Owner explicitly demanded an end to repetitive testing and wants only new Wallet2 inside existing "Производство"; archive/remove historical finance and orders.

**Completed in this turn:** Private *native Google Sheets* full backup of original 30-tab master, before any data removal: https://docs.google.com/spreadsheets/d/1xdhHJD_PJlI0m2FpBC01tdqJ-AO24eYM4kA66h71EBU/edit . Matched all 30 original sheet structures and full selected archive source ranges: old Finance=106 rows, Orders=9, partner settlements=2, Obligations=1, financial reconciliations=1; other tabs retained. Original master stays at 177IVzLUaNrzKScoRo0CjT5Zo7tJm5Bo0am2z9whAWdg. Two new additive Wallet2 tabs **now installed in live master**, no historical data: _W2_CONTROL A1:G2 generation Q079.ACTIVE.20261023.001, status STAGING_ONLY, writeEnabled false, ownerApproval NOT_GRANTED, Asia/Tomsk RUB; _W2_EVENTS single event_json header and no rows. Total master now 32 tabs, old 30 untouched.

**Release candidate staged only:** bootstrap.js enables new Wallet2 #wallet; assets/app.js carries Wallet2 protection/quarantine and updated build; sw.js shell includes wallet2.js/wallet2-bridge.js/wallet2.css and new BUILD; version.json staged with HOLD (no rollout), index.html title updated. Do not publish to main until existing GAS backend can handle wallet2.* using CURRENT production master _W2 tables. Some version strings need final alignment before atomic main publication; the staged branch is not yet live.

**Owner action required now (cannot perform via connected Apps Script APIs):** in EXISTING "Производство — Backend" Code.gs, inside doPost after const q046Action=String(body.action||''); add:
```js
if (q046Action === 'wallet2.bootstrap') return json_(handleWallet2BootstrapQ079_(body, requestId));
if (q046Action === 'wallet2.read') return json_(handleWallet2ReadQ079_(body, requestId));
if (q046Action === 'wallet2.commit') return json_(handleWallet2CommitQ079_(body, requestId));
```
Existing Q079_Wallet2.gs in same Apps Script contains the corrected B4D module. Do not change CFG.SPREADSHEET_ID, existing user rights/NOM/other tabs, do not replace Code.gs. Then edit **currently active original v29 deployment** -> New Version -> Deploy to retain installed PWA original backend URL. Separate canary deployment is no longer needed. No further diagnostics; owner says only "Сервер обновлён".

**Then immediately on subsequent turn:** finalize consistent PWA release metadata and atomic main, set live _W2_CONTROL ACTIVE_V2/TRUE/GRANTED (owner requested release). New Ledger remains empty/UNCONFIRMED until owner supplies real opening. Archive+delete legacy Finance/Orders/partner settlements/Obligations/Financial reconciliations business rows after live no-longer-accepts old financial writes, retaining headers/formulas on other tabs and private archive; first real wallet read/write on same installed PWA. Critical dependency: old sync.push and record.mutate finance payloads from stale phones can resurrect legacy rows unless server blocks them; this is a functional release gate, not optional testing.

No production main or deployed GAS updated by us in current turn; two new Wallet2 sheets in master are locked and archive completed. User's direction to delete historical data is recorded; **NOT physically cleared yet** to avoid old PWA replay before migration. This is a truthful description, not final GO.
