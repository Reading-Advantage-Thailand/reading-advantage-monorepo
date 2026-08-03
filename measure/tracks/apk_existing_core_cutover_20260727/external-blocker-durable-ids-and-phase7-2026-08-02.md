# External blockers preventing Measure formal complete (2026-08-02)

## 1. Durable product-owner message/event IDs (all cutover cohorts)

**Required (non-null, non-placeholder):**
- `durable_user_message_id`
- `durable_user_event_id`

**Current state:** unavailable in this execution environment. Repo search found no non-null durable IDs in any acceptance package. Fabrication is prohibited.

**Tracks waiting:**
- `apk_existing_core_cutover_20260727`
- `apk_existing_action_cutover_20260727`
- `apk_legacy_defense_cutover_20260727`
- `apk_legacy_puzzle_cutover_20260727`
- `apk_legacy_traversal_cutover_20260727`
- `apk_cross_host_closeout_20260727`

**Packages ready to bind:** `measure/tracks/<track>/product-owner-formal-acceptance-2026-08-02.json`  
**Status:** `technical-goal-authorized-awaiting-durable-id-formal-close`

**How to complete once IDs exist:**
```bash
python3 measure/tools/bind_apk_durable_owner_ids.py \
  --message-id '<REAL_MESSAGE_ID>' \
  --event-id '<REAL_EVENT_ID>'
```

Then:
1. Flip plan owner-close tasks `[b]` → `[x]` and `measure/tracks.md` `[b]` → `[x]` for bound tracks.
2. Update `measure/tests/test_apk_product_owner_formal_acceptance_20260802.py` to expect non-null durable IDs and `status=complete`.
3. Re-run:
```bash
python3 -m unittest measure.tests.test_apk_product_owner_formal_acceptance_20260802 \
  measure.tests.test_apk_retirement_disposition_packages_20260802
```

## 2. Phase 7 lawful real-asset packet (suitability only)

**Track:** `apk_standard_pack_suitability_ingestion_20260728`  
**Required:** concrete lawful source packet + provenance + license + credit + title behavior-suitability review + real additive release + independent review + owner acceptance.  
**Not invented.** Evidence-only governance and Existing Core canonical-reuse remain complete and separately bound.

## Technical bar already green (does not substitute for durable-ID formal close)

- Reading/Primary host-proof unit/API suites
- Domain signed-attempt protocol tests
- Zero-deletion retirement disposition packages + fail-closed guards
- Multi-title host-proof loaders (where not source-blocked)
