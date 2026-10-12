# Plan review — primary_parity_acceptance_20261011

## Phase 1 (review of e92f32b88)

No Critical or High finding. Findings that stay:

- Low: the exported types (`PairListInput`, `PairListData`, `PairData`, `AccountsFileData`, `Placeholder`) have no JSDoc except `Placeholder`. Phase 4 JSDoc check must cover them.
- Low: the schema uses zod 3.25 (root version). `z.record` with an enum key gives a partial record, so a missing role is allowed. Phase 3 `accounts.ts` must check the roles that a pair list needs.
- Low: the `legacyPath` and `newPath` check needs a two-letter locale. A locale such as `zh-CN` is not used in the app routes (`en`, `th`, `cn`, `tw`, `vi`), so this is correct.
- Low: the `Check` field is `behavior` (spec FR-7 says "the observable behavior"). Phase 2 tests must use this name.
- Low: two small placeholder PNG files are in `scripts/primary-parity/fixtures/`. They are fixtures, not captures.
- Decision: `waitFor` is `{legacy?, new?}` (one selector for each app).
