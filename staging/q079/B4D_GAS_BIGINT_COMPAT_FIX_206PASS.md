# Q079 B4D — Apps Script BigInt syntax compatibility hotfix / 2026-10-23

**Detected by owner upon saving `Q079_Wallet2.gs`:** `ParseError: Unexpected token ILLEGAL`, old file line 301 at `base/10000n`.

**Fix:** replace all three BigInt-dependent arithmetic sites in Wallet2 engine:
- old `sum(a,b)` → Number.isSafeInteger-checked integer sum with AMOUNT_OVERFLOW rejection;
- old `BigInt(cost)*BigInt(qty)/BigInt(totalQty)` → exact integer long-division `ratioWithRemainder_(cost,qty,totalQty).amount`;
- old `BigInt(amount)*BigInt(basisPoints)` and `10000n` → exact `ratioWithRemainder_`, preserving largest-remainder partner profit distribution and sorting.

**Safety:** No legacy Finance/Orders reads or imports, no new master, no active server / PWA deployment, no app rights changes or financial business writes. Source-only staging branch. Existing source-based cache and 16 screens unaffected.

**QA actually rerun:** Node.js syntax check of entire 533-line corrected GS script; source unit test suite with 36 stage-read-only cases restored + 6 new BigInt-free checks, **206/206 PASS**. The new numeric checks validate 2,216 reference divisions against Node BigInt math including `Number.MAX_SAFE_INTEGER`; the delivered Apps Script itself uses no BigInt identifiers or `n` numeric literal. VM mock verifies BigInt is unavailable in GAS code, signed overflow denial and normal material purchase/allocation event parity with original engine. No real Google Apps Script save / server deployment has been run here; owner must replace content of `Q079_Wallet2.gs` and save to confirm.

**Confirmed Drive destination:**
`ПРОИЗВОДСТВО / 05_PWA — ПРИЛОЖЕНИЕ / 07_Backend sync`, folder ID `1L0Bx46Zo9UWPtu5CkAJtPUnG29pGF7oY`.
Corrected `.gs` Google Drive ID `1V2bwED-2tM_bBlkDrQzN4El_srU9hq5S`, original incorrect file `15ppxYAVXRnzg4YGR4zkj2X4429MB95LZ` retained but renamed `УСТАРЕЛО_ОШИБКА_BIGINT_НЕ_КОПИРОВАТЬ__...`.
Corrected local SHA-256 `3f5dc1ee5b33d81d2f3036ffe432802070e6db3088d06e815f08fbec6ca043ad`, confirmed Drive size `34360` bytes.

**Action for owner:** Replace *only* `Q079_Wallet2.gs` content in test copy of existing GAS project; never overwrite `Code.gs`; save. Do not deploy or run mutation functions before approved safe integration and verified archive/cutover.
