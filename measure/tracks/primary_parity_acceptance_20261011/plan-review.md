# Plan review — primary_parity_acceptance_20261011

## Phase 1 (review of e92f32b88)

No Critical or High finding. Findings that stay:

- Low: the exported types (`PairListInput`, `PairListData`, `PairData`, `AccountsFileData`, `Placeholder`) have no JSDoc except `Placeholder`. Phase 4 JSDoc check must cover them.
- Low: the schema uses zod 3.25 (root version). `z.record` with an enum key gives a partial record, so a missing role is allowed. Phase 3 `accounts.ts` must check the roles that a pair list needs.
- Low: the `legacyPath` and `newPath` check needs a two-letter locale. A locale such as `zh-CN` is not used in the app routes (`en`, `th`, `cn`, `tw`, `vi`), so this is correct.
- Low: the `Check` field is `behavior` (spec FR-7 says "the observable behavior"). Phase 2 tests must use this name.
- Low: two small placeholder PNG files are in `scripts/primary-parity/fixtures/`. They are fixtures, not captures.
- Decision: `waitFor` is `{legacy?, new?}` (one selector for each app).

## Phase 2 (tests, red)

API that the tests fix for Phase 3 (names and shapes):

- `pairs.ts`: `resolvePlaceholders(path, {map(table, legacyId) => string|undefined, users: Partial<Record<role,string>>})`. It throws on an unknown kind, a missing map row, a missing user, or an unknown role. It must also make `PairList` refuse a `password=` query value in a path.
- `guards.ts`: `assertGuards({legacyUrl, newUrl, legacyQuery, newQuery, baseUrls, outputFiles})` (async). It throws an error with `code`: `remote-host`, `shared-database`, `legacy-marker-missing`, `legacy-marker-present`, `remote-base-url` (also https or no port), `output-in-repository` (a `.git` folder in a parent). The message holds no database password.
- `legacy-credential.ts`: `hashLegacyPassword(password)` and `verifyLegacyPassword({hash, password})`. The salt text is the hex string used as the scrypt salt string.
- `report.ts`: `diffLines(legacy, new)` returns `{onlyLegacy, onlyNew}`. `renderReport({list, captures})` returns `{markdown, html}`. Shot keys are `<width>-<scheme>`; `png` is relative.
- Low: the "no accounts field in output" test passes an extra `accounts` input and checks that its values are absent. It proves that the renderer ignores that input, not more.
