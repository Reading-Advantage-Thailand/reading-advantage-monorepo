# A-29: Sales training readiness audit
Date: 2026-10-29. PM assignment due: 2026-11-01. Target: three trainees complete training before the first school visit.
## Summary

**Not ready.** The newest repository promotion record names `sales-advantage-00016-dij`, built from `3fdb1fd0b`, not `00005-yas` or `00011-vis`.
That source lacks S1. The 2027 drafts reached master, but approval, role paths, bindings, and release gates remain open.
The drafts do not teach the January K–6 demo. They need Storytime, Primary P3–P6, Science, Math, and Zhongwen content.
Live revision, trainee accounts, and completion remain **unverified**. This audit used repository reads only.
## Sources

- Monorepo snapshot: master `5b45c2355a9fb5e8c8c10ad4605475aaa0058c3d`; origin/master `14947f7ab356089e8777aa73a5233807fe44f215`.
- `T` means `measure/tracks/sales_training_2027_20261015`; `T/spec.md`, `T/plan.md`, and `T/review/` define the training work.
- `P` means `measure/tracks/sales_marketing_sso_parity_20260829`; its plan and acceptance records define the newest recorded Sales release.
- `S` means `apps/sales-advantage/scripts/static-seed.ts`; line references without a revision use the snapshot above.
- Short app paths resolve under `apps/sales-advantage`; `sales/` paths resolve under `packages/domain/src`; `schema/` paths resolve under `packages/db/src`.
- Other track names resolve under `measure/tracks/`; review paths resolve under `T/`.
- `PR` means the read-only repository `/home/daniebo/Desktop/advantage-pr`.
- `PR strategy` means `08-strategy/product-strategy-2026-2027.md`: v1.8 at `e6f7cc2:1–6`; v1.15 at `57b9ecd:1–6`. PR HEAD was `70bff15`.
- Other sources: `measure/tracks/sales_advantage_golive_20260701/`, Sales routes, domain functions, auth roles, schemas, and the migration journal.
- Restrictions: no build, installation, test run, sign-in, HTTP mutation, database connection, cloud command, staging, or commit occurred.
- Cross-project access used only `git -C ... show`, `git log`, and the read-only Git tree list. No cross-project session exchange occurred.
- Other worktrees remain untouched: `rama-worktrees/security-upgrade` and `rama-worktrees/www-real-logos`. Their owners retain cleanup responsibility after acceptance.
- Other branches remain untouched: `chore/security-upgrade-2026-10`, `www/real-logos`, `codex/reading-advantage-refactor`, `storytime/own-app`, `storytime/primary-cleanup`, and `origin/codex/typescript7-native-migration`. Owners must choose merge or deprecation.
## (a) Recorded serving state and unreleased source
| Item | Finding | Evidence |
|---|---|---|
| Old status record | `00005-yas` at 100%; the record is stale against later promotion records. | `measure/deployment-status.md:40` |
| Intermediate promotion | `00011-vis` replaced `00005-yas`. | `P/plan.md:261–262` |
| Newest recorded promotion | `sales-advantage-00016-dij` received 100% on 2026-08-31. | `P/plan.md:346–355`; record commit `fa3f11edb` |
| Built source | `3fdb1fd0be9d4363af5693b5bc116f077c380064`; build `66e43022-7321-4024-ac85-d0600c80c5c2`. | `P/acceptance/sales-remediation-candidate-acceptance-20260831.md:5–11` |
| Recorded rollback | `legacy-rollback` points to `sales-advantage-00013-jiy`. | `P/plan.md:356` |
| Live state | **Unverified**; repository evidence is not a live check. The deploy operator must inspect traffic before release. | No cloud access in this audit |
| Local-only history | 92 commits occur in `origin/master..master`; all are local relative to the saved remote ref. | `git rev-list --count origin/master..master` at the snapshot |
| Sales-specific local change | `7387c4876` is the only local-only commit in the Sales scope below. It changes dependencies. | Same scoped log with `origin/master..master` |
| Shared local changes | `3a10dd68c` changes the lockfile; `c2690a4f8`, `5dbcd4c33`, and `0754683c5` also change it. | Local-only log for `pnpm-lock.yaml` and shared packages |
| Training branch | No Sales branch or worktree remains. Master contains merge `b4c01b18c` and video commit `4394c28c0`. | `git branch -a`; `git worktree list`; Git history |
The local range includes Storytime and subject handovers, not 92 Sales commits. Remote state is **unverified**; an authorized fetch would verify it.
“Unreleased” below means source after the recorded deployed commit. A built image for each later commit is **unverified**.
The deploy operator can confirm the live revision with this single read-only command; this audit did not execute it:

```bash
gcloud run services describe sales-advantage --project=reading-advantage --region=asia-southeast1 --format='yaml(status.traffic,status.latestReadyRevisionName)'
```
The project id is inferred, not recorded: the build backs up instance `cloud-sql` in `$PROJECT_ID` (`apps/sales-advantage/cloudbuild.yaml:14`), and the cutover records place `cloud-sql` in project `reading-advantage` (`measure/tracks/primary_legacy_data_migration_20261004/cutover-commands-20261011.md:27`).
### Complete Sales-specific commit list
This command returns 61 commits. The output preserves commit subjects, including unrelated subjects that touched the selected paths.
```bash
git log --oneline 3fdb1fd0b..master -- apps/sales-advantage packages/sales-knowledge packages/domain/src/sales packages/domain/src/sales-mastery.ts packages/db/src/schema/sales.ts packages/db/src/schema/sales-mastery.ts packages/api/src/routers/sales.ts
```
```text
7387c4876 fix(deps): apply guarded security dependency upgrades (track_id: security_upgrade_20261026)
2c69dc328 feat(storytime): scaffold the storytime app shell (track_id: storytime_app_rebuild_20261025)
4394c28c0 feat(sales): add the thai video links to the lessons (track_id: sales_training_2027_20261015)
e2f2aa36b fix(sales): class hours, start book rule, pilot terms (track_id: sales_training_2027_20261015)
e5392efba fix(sales): r4 uses reading advantage origins 3.1 (track_id: sales_training_2027_20261015)
6de086a2d feat(sales): link the three training videos in lessons (track_id: sales_training_2027_20261015)
724061afe fix(sales): name a small class with a local teacher (track_id: sales_training_2027_20261015)
f572515cc fix(sales): teach the strong answer, keep claims as a gate (track_id: sales_training_2027_20261015)
e40a7376a fix(sales): score on gemini-3.8-flash first, qwen as backup (track_id: sales_training_2027_20261015)
033ce6e3a fix(sales): score on gemini-3.8-flash when qwen fails (track_id: sales_training_2027_20261015)
481b3b25d fix(sales): ground the roleplay score in the recording (track_id: sales_training_2027_20261015)
c3d48dd17 feat(sales): pin the release candidate to pr c211d1c (track_id: sales_training_2027_20261015)
048090037 fix(sales): apply the pr claims review of group 3 (track_id: sales_training_2027_20261015)
19ea64ba1 fix(sales): apply the pr claims review of groups 1 and 2 (track_id: sales_training_2027_20261015)
1ec13d473 feat(sales): rebuild the release candidate at pr e6f7cc22e (track_id: sales_training_2027_20261015)
84b151b7f feat(sales): draft the 2027 curriculum for s3 to s7 (track_id: sales_training_2027_20261015)
f8e2723ea fix(sales): label safari recordings and harden scoring (track_id: sales_training_2027_20261015)
57c500efe fix(sales): send roleplay audio as input_audio (track_id: sales_training_2027_20261015)
dbe5efecc fix(sales): one backup audio model setting (track_id: sales_training_2027_20261015)
84ecd8336 fix(sales): compute roleplay score from rubric (track_id: sales_training_2027_20261015)
57e2c7bb0 fix(sales): dev-safe oidc cookie names (track_id: sso_dev_cookie_prefix_hotfix_20260922)
07f00acf2 fix(sales): type clean locked card tests (track_id: sales_structural_alignment_20260919)
c76a96340 chore(measure): close out accounting structural track
2d8b55310 fix(sales): unlock locked cards for keyboard users (track_id: sales_structural_alignment_20260919)
d24a63bb4 fix(sales): answer chat in the active locale (track_id: sales_structural_alignment_20260919)
2f2330086 test(sales): compare all i18n keys in parity test (track_id: sales_structural_alignment_20260919)
c0db2b07d refactor(sales): resolve unused i18n message keys (track_id: sales_duplication_removal_20260919)
8d2e8cbb1 chore(sales): adopt light-only theme policy (track_id: sales_duplication_removal_20260919)
032c3e7b5 chore(sales): prune unused deps, add drizzle-orm (track_id: sales_duplication_removal_20260919)
a42ab1626 test(sales): merge duplicate proxy and session tests (track_id: sales_duplication_removal_20260919)
5ed1e9c62 refactor(sales): use structured error logging (track_id: sales_duplication_removal_20260919)
f41d909b6 refactor(sales): call checkChatRateLimit helper (track_id: sales_duplication_removal_20260919)
8634b6677 test(sales): fix boundary test types (track_id: sales_recording_loading_correctness_20260919)
eb8105c36 fix(sales): add error boundaries (track_id: sales_recording_loading_correctness_20260919)
12c6f685b fix(sales): abort chat request on unmount (track_id: sales_recording_loading_correctness_20260919)
da248745d fix(sales): surface mutation failures (track_id: sales_recording_loading_correctness_20260919)
dce524539 fix(sales): handle curriculum load states (track_id: sales_recording_loading_correctness_20260919)
4418adb6b fix(sales): report failed audio uploads (track_id: sales_recording_loading_correctness_20260919)
7e5a0a449 fix(sales): move retention to the server (track_id: sales_recording_loading_correctness_20260919)
442c16778 test(sales-auth): split session cases (track_id: sales_session_contract_correctness_20260919)
4680ab3af fix(sales-auth): report logout failures (track_id: sales_session_contract_correctness_20260919)
933ab8b14 fix(sales-auth): render forbidden state (track_id: sales_session_contract_correctness_20260919)
421ce7835 fix(sales-auth): split session outcomes (track_id: sales_session_contract_correctness_20260919)
916b60623 fix(sales): stop recorder on unmount (track_id: sales_recording_loading_correctness_20260919)
2019e81cb fix(sales): revoke recording blob URLs (track_id: sales_recording_loading_correctness_20260919)
9297803ed fix(sales): distinguish microphone failures (track_id: sales_recording_loading_correctness_20260919)
86d2583a8 fix(sales): select supported recording type (track_id: sales_recording_loading_correctness_20260919)
aceab68ae fix(sales-advantage): drop raw body from upload error (track_id: sales_broken_ux_fixes_20260919)
96b16283e fix(sales-advantage): drop lesson-complete route (track_id: sales_broken_ux_fixes_20260919)
6210c60c8 fix(sales-advantage): remove external link icon (track_id: sales_broken_ux_fixes_20260919)
b641fddda fix(sales-advantage): use uploading label during upload (track_id: sales_broken_ux_fixes_20260919)
aeeac2f44 fix(sales-advantage): show header nav at all widths (track_id: sales_broken_ux_fixes_20260919)
2ac0f78e1 fix(sales-advantage): add role alert to roleplay errors (track_id: sales_broken_ux_fixes_20260919)
e7d1f5dc9 fix(sales-advantage): add aria-label to logout button (track_id: sales_broken_ux_fixes_20260919)
60d1e273f fix(sales-advantage): remove redundant lesson refetch (track_id: sales_broken_ux_fixes_20260919)
c2a50b982 fix(sales-advantage): anonymous session returns 200 (track_id: sales_broken_ux_fixes_20260919)
6e890c307 chore(measure): add phase review findings for the five reading ux tracks
f59c60b9a refactor(auth): share cookie reader (track_id: architecture_priorities_20260908)
54cec86c6 fix(sales): resolve review findings (track_id: monorepo_package_review_20260907)
19cdddb39 fix(domain): resolve review findings (track_id: monorepo_package_review_20260907)
291daf2f1 fix(monorepo): repair defects (track_id: monorepo_package_review_20260907)
```
Shared AI paths add `4d92349a7` (audio timeout) and `bc72f5749` (Vertex adapter changes), besides listed S1 commits and merge `b4c01b18c`.
Evidence: scoped Git log for `packages/ai/src/providers/openrouter.ts`, `packages/ai/src/client.ts`, and `packages/ai/src/types.ts`.
| Migration or draft | Finding after `3fdb1fd0b` | Evidence |
|---|---|---|
| Sales schema and DDL | No later change to either Sales schema file; no added SQL line names a `sales_` table. | Git diff of `packages/db/src/schema/sales*` and `packages/db/drizzle/*.sql` |
| Existing Sales migrations | `0021`, `0023`, `0037`, `0039`, `0042`, and `0053` already exist at the release source. | Git tree at `3fdb1fd0b`; `0053_sales_mastery_tenant_mapping.sql:1–22` |
| Shared migration additions | Journal adds 18 entries, `0057` through `0074`, after the release source. | `packages/db/drizzle/meta/_journal.json:397–529`; Git diff |
| Added SQL names | `0057_complex_sleeper`, `0058_acoustic_lady_deathstrike`, `0059_game_challenges`, `0060_primary_legacy_id_map`, `0061_tutor_compat_views`. | Same journal, lines 404–438 |
| Remaining SQL names | `0062_primary_student_login`, `0063_primary_student_login_settings`, `0064_primary_student_session_policy`, `0065_primary_class_books`, `0066_primary_avatar_profile`. | Same journal, lines 439–473 |
| Remaining SQL names | `0067_primary_voice`, `0068_primary_avatar_shop`, `0069_primary_class_quest`, `0070_primary_objective_tags`. | Same journal, lines 474–501 |
| Remaining SQL names | `0071_primary_temporary_password`, `0072_primary_stories`, `0073_primary_lesson_attempts`, `0074_primary_help_events`. | Same journal, lines 502–529 |
| Actual database application | **Unverified**; the release operator must compare the Sales database journal with the source journal before migration. | `apps/sales-advantage/cloudbuild.yaml:32–48` runs the shared migrator |
| S2 | Candidate regeneration exists, but approval remains open. | `1ec13d473`; `T/plan.md:59–79` |
| S3–S4 | General selling and product drafts exist. | `84b151b7f`, `19ea64ba1`, `f572515cc`; `T/plan.md:81–110` |
| S5–S6 | Family sale and recruitment drafts exist. | `84b151b7f`, `724061afe`, `e5392efba`, `e2f2aa36b`; `T/plan.md:112–142` |
| S7 | School-sale draft exists; school acceptance remains open. | `048090037`, `c3d48dd17`; `T/plan.md:144–155` |
The S1 note about 30 migrations compares July source, not the newest recorded August release (`T/plan.md:47`).
The deploy pipeline also seeds curriculum before candidate acceptance. Zero traffic does not prevent database changes (`cloudbuild.yaml:57–74,123–141`).

## (b) Course content against strategy v1.8 and v1.15
The course lives in `S`; reviewed seeding writes modules, lessons, rubrics, scenarios, and quizzes (`packages/db/src/schema/sales.ts:37–100`).
The release source has six modules and 27 lessons: 14 theory, seven roleplay, and six quiz entries (`3fdb1fd0b:S`).
Master has seven modules and 44 lessons: 22 theory, 15 roleplay, and seven quiz entries (`S:281–2680`).
These are source counts. Live database contents remain **unverified**; the authorized curriculum verification must confirm them.
| Module in master | Lessons held by the app | Strategy finding |
|---|---|---|
| M1 Discovery | Why Discovery Beats Pitching; Active Listening; Open/Closed Questions; Discovery Roleplay; Universal Discovery Quiz. | No identified K–6 strategy defect; retain the general method. `S:281–543` |
| M2 Value | Features → Benefits → Outcomes; Anchoring; Challenger Sale; Value-Framing Roleplay; Reflection Quiz. | No identified price change; school examples remain English-only. `S:545–756` |
| M3 Objections | Stated Objection; Negotiating Without Discounting; Objection Roleplay; Universal Objection Quiz. | Retain the method; add new-subject objections where the revised school source requires them. `S:758–946` |
| M4 Product | One Catalogue, Two Channels; The Words We Use; What Exactly Do You Sell? roleplay; Product Knowledge Quiz. | Missing K–6 coverage, Storytime detail, and subject demo knowledge. `S:948–1192` |
| M5 Family | What the Parent Buys; Placement; Parent Conversation; Next Book; R1–R5; Family Sale Quiz. | Keep secondary Reading books in this channel; correct delivery and edition facts. `S:1194–1772` |
| M6 Recruitment | What a Tutor Does; Commission Scale; Future Tutor Questions; RR1–RR3; Recruitment Quiz. | Correct delivery facts; no evidence that strategy v1.15 changed the commission or package price. `S:1774–2197` |
| M7 School | School Sale Rules; 15/45/90-Minute Demos; Eight Objections; Total Cost; Semester Review; three roleplays; School Sale Quiz. | Replace the English-only demo scope with the January K–6 scope. `S:2199–2680` |
| Wrong or missing item | Exact app evidence | Required correction or verification |
|---|---|---|
| Recorded-release M4 states | `3fdb1fd0b:S:745–755`: Reading live; Tutor beta; CodeCamp coming; Math/Zhongwen late 2026. | Replace with current states. PR strategy `e6f7cc2:28–42` already superseded these states. |
| Recorded-release M4–M6 school path | `3fdb1fd0b:S:730–732,867–869,1081–1083` positions Reading Advantage for schools. | Replace with the January scope. Master S7 removes this Reading sales path but still lacks the new demo. |
| Master M4.1 Storytime | `S:979–980` says only “Planned, no date”; no Storytime lesson exists. | Teach Anuban 2–P2 and the demonstration. PR strategy `57b9ecd:125–131`. |
| Master M4.1, M4.3, M7.1–M7.2 subjects | `S:979,1085,2222,2306` gives “coming programs” only. | Add Science, Math, and Zhongwen demo content, questions, and scenarios. Keep public dates unapproved. PR strategy `57b9ecd:113–133`. |
| Primary P3–P6 | `S:1004–1011,2265–2293` gives children, primary grades, and a level-1–4 placement map. | Add the school P3–P6, levels-1–9 demo path. Keep the Tutor placement map separate. PR strategy `57b9ecd:127–131`. |
| Unprinted sample pages | M7.2 shows printed Origins 2/3.1 and live production screens only (`S:2289–2293`). | Add iPad sample pages for unprinted Primary books, without presenting them as stock. PR strategy `57b9ecd:131`. |
| M7 objections, roleplays, quiz | `S:2320–2368,2450–2680` checks the old Primary-only school offer. | Add K–6 discovery, subject selection, demo navigation, and a correct next step. Missing answers also need scored practice. |
| Rubric scope | Shared claims text rejects levels above book level 4 (`S:115`). | Separate the Tutor sale limit from the school levels-1–9 demonstration. Do not treat sample pages as an available book sale. |
| Stale delivery date | M4.1, M5.1–M5.4, and M6.1 still say about 2026-11-22 (`S:1010–1017,1218,1270–1271,1397–1398,1819`). | Recheck against delivery about 2026-11-23–30. PR strategy `57b9ecd:76`. Actual delivery remains **unverified**. |
| Stale cutover conditions | `S:79–85,2223–2225` still presents Oct 17/18 and Oct 20 as future gates. | Teach the completed cutover and verify current features. PR strategy `57b9ecd:171,182`. |
| Editions | M4 map and M5 next-book advice name titles without legacy/new-edition handling (`S:1006–1011,1395–1406`). | Receive A-30 rules before teaching an edition switch. Legacy Primary stock remains on sale. PR strategy `57b9ecd:68,97`. |
| Prices and product names | `S:996–998,1052,1218`; PR strategy `57b9ecd:209–210`. | No identified change to ~1,000/~1,500 or from 3,000 baht. No approved new bundle price exists (`57b9ecd:135`). |
| Candidate source pin | JSON still names `a3c4df0`, despite plan/spec updates naming `ec63bc4`. | Reconcile and regenerate before approval. `curriculum/release-candidate.json:5–7`; `T/plan.md:62–64`. Neither pin includes v1.15. |
Reading Advantage books in M5 R3/R4 remain correct for secondary families. Their presence does not violate the January school-demo exclusion.
Evidence: `S:1523–1610`; PR strategy `57b9ecd:175`. Do not remove the family content solely because the school demo excludes Reading.
The owner requires positive lesson answers; claims rules belong in rubrics, M4.2, and trainer material (`T/spec.md:135`; `T/plan.md:74–77`).
Missing claims rules alone are not a finding. This report approves no price, public date, or architecture.
Master holds 21 YouTube link placements and 18 distinct URLs in lesson text (`S`, literal URL count).
Links include M4.1/M4.2, M5.1–M5.4, M6.1–M6.3, M7.1/M7.3/M7.4, and M3.1 (`S:772–2378`).
Playback and visibility remain **unverified**; the assigned browser reviewer must open each retained link after release.
The Markdown renderer lacks the planned signed-media resolver and explicit new-tab behavior (`components/lesson-content.tsx:15–20`; `T/plan.md:194–201`).
Existing video approval covers the October content, not new January content (`T/review/video-checks.md:17–19`). Changed material needs review.

## (c) S1 roleplay scoring
**The recorded serving source lacks the repair.** Live operation remains **unverified**, but that source contains the known broken path.
At `3fdb1fd0b`, the evaluator uses Nemotron, then Parakeet transcription and text evaluation (`packages/domain/src/sales/roleplay-evaluator.ts:36–42,150–173`).
Its OpenRouter media method uses the AI SDK path (`3fdb1fd0b:packages/ai/src/providers/openrouter.ts:151–180`).
The diagnosis records unsupported WebM in Responses, unavailable model capacity, and incorrect Thai transcription (`T/spec.md:18–34`).
Changing a model secret alone does not add the missing media adapter or deterministic scoring.
Master uses Gemini first, Qwen second, and low reasoning on both calls (`e40a7376a`; `packages/domain/src/sales/roleplay-evaluator.ts:193–237`).
The route calls `getAIClient()` → `aiClientToEvaluateRoleplay()` → `generateObjectFromMedia()` (`app/api/roleplay-attempts/route.ts:206–208`).
`OpenRouterProvider` sends `input_audio` to `/chat/completions`, then validates JSON with Zod (`packages/ai/src/providers/openrouter.ts:190–220,254–278`).
Weighted scoring and every-criterion pass checks run in code (`packages/domain/src/sales/roleplay-evaluator.ts:51–108`).
Required names: `AI_PROVIDER`, `OPENROUTER_API_KEY`, `SALES_AUDIO_EVAL_MODEL`, and `SALES_AUDIO_EVAL_FALLBACK_MODEL` (`cloudbuild.yaml:139`).
Cloud Run maps the first two from `SALES_AI_PROVIDER` and `SALES_OPENROUTER_API_KEY`.
Storage uses `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_PUBLIC_BASE_URL`.
Their secret names add the `SALES_` prefix (`cloudbuild.yaml:139`). The route also needs company authentication and the runtime database mapping.

Auth names include `COMPANY_AUTH_ISSUER_URL`, `COMPANY_AUTH_OIDC_CLIENT_ID`, `COMPANY_AUTH_OIDC_CLIENT_SECRET`, and `COMPANY_AUTH_OIDC_REDIRECT_URI`.
Also required: `COMPANY_AUTH_EXPECTED_AUDIENCE`, `SALES_AUTH_MODE`, and `DATABASE_URL` (`cloudbuild.yaml:135–139`). Secret mappings use `SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET` and `SALES_DATABASE_URL`.
The AI factory validates provider configuration but reads model overrides directly (`packages/ai/src/client.ts:10–19,82–90`; evaluator lines 193–196).
Secret versions, runtime access, provider credit, model availability, storage access, and runtime timeout remain **unverified**.
The deploy operator must inspect secret metadata and runtime configuration without disclosing values. Candidate recordings must verify actual scoring.

S1 waits for the candidate deploy, model secret versions, and browser acceptance (`T/plan.md:47–57`).
The Primary cutover completed according to PR strategy `57b9ecd:182`; permission to resume this Sales release remains **unverified**.
Synthetic video checks are not browser acceptance (`T/review/video-checks.md:7–9`). Thai/English recordings must show scores, feedback, and transcript excerpts.

## (d) Accounts, role paths, and individual completion
The three trainees are Daniel, Phikul (พิกุล ภูกะฐิน), and one unnamed staff member, per the PM assignment.
Their existing accounts, assigned roles, and progress remain **unverified**. No sign-in or account lookup occurred.
Sales `/[locale]/admin/create-rep` hands account creation to Accounts with `application=sales&role=SALES_REP` (`app/[locale]/admin/create-rep/page.tsx:14–19,50–53`).
A company administrator creates the identity and assigns company/application roles (`apps/accounts/app/api/admin/employees/route.ts:20–49`).
Company roles currently allow `EMPLOYEE` and `COMPANY_ADMIN`, not `CONTRACTOR` (`packages/db/src/company-identity/contracts/index.ts:205–206`).

Sales application roles are `SALES_REP` and `SALES_ADMIN` (`packages/auth/src/roles.ts:7–8`). A company role alone does not grant Sales access.
Verified Sales audience claims select the application role; `SALES_ADMIN` wins when both exist (`lib/company-oidc.ts:68–86`).
The identity resolver checks the organization and creates the mapped local principal (`packages/domain/src/company-identity-principal.ts:198–207,316–343`).

Both Sales roles can learn, submit quizzes, record roleplays, and read their progress. Only `SALES_ADMIN` gets cohort reporting (`sales/permissions.ts:11–19`).
Current progression does not select a course by role. It unlocks each module after the previous module (`sales/progression.ts:38–89`).

Intended paths: all trainees take M1–M4; tutors take M5–M6; founders, reps, and staff take M7 (`T/spec.md:221–230,247–257`).
Daniel and Phikul also test the Family branch with their own accounts (`T/plan.md:166`). S8 has not implemented these branches.
The missing CONTRACTOR role blocks tutor admission, not the three named employee/founder trainees (`T/spec.md:81,257`).
Progress uses `user_id`, `lesson_id`, `status`, `completed_at`, `score`, and `updated_at`, with a unique user/lesson pair (`schema/sales.ts:135–156`).
Attempts hold `user_id`, `scenario_id`, `attempt_number`, `overall_score`, `passed`, feedback, and transcript (`schema/sales.ts:104–130`).

Theory completion is explicit; quizzes pass at 70%; a passed roleplay marks its lesson complete (`sales/mutations.ts:368–373,473–507`).
The roleplay update marks the lesson complete after a scenario passes. Completion alone does not prove that every scenario in that lesson passed.
PM acceptance must check scenario coverage where required (`sales/mutations.ts:348–373`; `T/spec.md:255`).
Sales Mastery defines tenant mappings, learner-linked projection intents, and receipts; these do not replace lesson completion (`schema/sales-mastery.ts:17–29,77–99,177–189`).

The PM can use `/th/admin` or `/en/admin` with `SALES_ADMIN`; it shows module completion, scores, attempts, and last activity.
`admin/[repId]` gives detail; queries are `sales.admin.cohortOverview` and `sales.admin.repDetail` (`app/[locale]/admin/page.tsx:18,63–98`; `packages/api/src/routers/sales.ts:374–405`).
**Reporting gap:** both queries select only `SALES_REP` mappings (`sales/queries.ts:511–512,640–642`). Admin trainees can disappear from these reports.
Giving a founder both roles does not solve that gap because role selection prefers `SALES_ADMIN`.

Monorepo must resolve reporting coverage before PM certifies all three. Do not change founder roles merely to make the table display them.
The authorized account administrator must verify all three identities and Sales assignments. An authorized reviewer must verify each trainee's completion after release.

## (e) Blockers and owner gates
Owners below are proposed delivery owners unless a source explicitly names them. Daniel keeps deploy, merge, rollback, and content-choice gates.

| Blocker or gate | Owner | Waits on / evidence |
|---|---|---|
| Live baseline | Deploy operator under Daniel's deploy gate | Read-only traffic check; reconcile old status record. `P/plan.md:355`; section (a). |
| A-21 master push | Daniel | Local merge exists; push starts www deployment immediately. `security_upgrade_20261026/plan.md:232–239`; `docs/deployment/security-upgrade-2026-10.md:3–5`. |
| Sales release order | Deploy operator; Daniel approves | Sales is order 5, after www, accounting, Accounts, Workbooks. Same deployment document, lines 9–13. |
| Sales freeze release | Daniel; Monorepo records the choice | S2–S10 still defer to freeze end; cutover completion alone is not an explicit Sales resume decision. `T/plan.md:61,161–186`. |
| Updated content choice | Daniel; PR supplies sources; Monorepo edits app | K–6 additions, product states, dates, editions, and price boundaries. PR strategy `57b9ecd:68–76,125–135`. |
| S1 candidate and model secrets | Deploy operator under Daniel's gate | Backup, migration review, runtime access, model versions, full release pipeline. `T/plan.md:47–50`; `cloudbuild.yaml:9–74`. |
| S1 browser recording | Daniel's recorded owner acceptance; reviewer prepares | One Thai and one English recording on the candidate; score, feedback, transcript. `T/plan.md:55–57`. |
| S2 source approval | Daniel's content choice; reviewer prepares | Correct source commit and 20 documents, with current January facts. `T/plan.md:78–79`; candidate pin conflict in section (b). |
| S3–S6 Thai approval | Daniel's content choice; reviewer prepares | Formal curriculum sign-off remains open. `T/plan.md:93–110,125–142`; `review/thai-lines-for-daniel.md:3–5`. |
| Thai packet accuracy | Monorepo; PR checks sources | Packet still says 25 hours, 120 baht/hour, and the old R4 case. Refresh against the seed before sign-off. Same packet, lines 27,33,37–39. |
| S7 school acceptance | Daniel's content choice | January lessons and demo path; the current S7 contains no Thai text. `T/plan.md:153–155`. |
| PR claims review | PR through PM; Monorepo fixes | October groups passed after fixes; changed January content needs a new review. `T/plan.md:94,126,154,180`. |
| S8 start and branch acceptance | Monorepo; Daniel approves content/merge | Source set plus freeze end; explicit core prerequisites, labels, tests, and founder Family checks. `T/plan.md:157–166`. |
| S9 start and bindings | Monorepo with Sales Mastery owner | Same start gate; confirm fields and regenerate required bindings only. `T/plan.md:168–175`. |
| Release approval tests | Monorepo; Daniel approves the exact curriculum | Known red cardinality, digest, candidate, and eight knowledge tests await S9/S10. Do not bypass them. `T/plan.md:64`. |
| S10 signed approval and seed | Daniel chooses content; deploy operator executes | Approval file, existing approval secret, seed-day fact check, seed and verification. `T/plan.md:180–186`; candidate approval remains pending, JSON lines 123–134. |
| Promotion and rollback | Daniel; deploy operator executes | Acceptance note must say `status: pass`; promote only with the release script. Verify the rollback before promotion. `T/plan.md:49,57`; `P/plan.md:356`. |
| Tutor admission | Company Identity owner through PM; Daniel's release gate | CONTRACTOR implementation and one tutor sign-in before announcement. It does not block the three-person internal cohort. `T/plan.md:187`. |
| S11 application work | Monorepo | Freeze end; signed URLs, object checks, PNG/PDF behavior, new-tab links, and phone/desktop checks. `T/plan.md:191–201,219–221`. |
| S11 media | PR through PM; Daniel chooses changed content | Infographics/decks, checked crops, upload approval, remaining English links, and post-S1 recorder tour N1. `T/plan.md:202–218`; `review/video-list-for-pr.md:42`. |
| Existing video approval | Reviewer verifies links; Daniel chooses changed content | October videos already passed owner review. Retain that approval for unchanged files. `review/video-checks.md:17–19`. |
| Screenshot list discrepancy | Monorepo and PR through PM | A checked version 2 exists, but the plan still lists drafting. Reconcile before upload. `review/screenshot-lesson-list.md:3–11`; `T/plan.md:217–218`. |
| Pilot terms and school reference | Daniel chooses terms; reviewer verifies consent | Q-SV-05 remains open; teach no free period or discount. Use Boonyathat only with consent. `T/spec.md:70–71,216`. |
| Placement and app screenshots | PR/Monorepo; Daniel chooses content | Recheck Q-SE-12 tool status and Q-SE-13 crop rules; do not show stale prices or statistics. `T/spec.md:334–341`. |
| Three-person completion | Trainees; PM verifies; Monorepo fixes reporting | Confirm identities, branch access, scenario coverage, quiz passes, and founder reporting. Section (d). |
| Documentation closeout | Monorepo | Update deployment status and predecessor tracks after release. Lessons entry waits for the existing 50-line cap issue. `T/plan.md:50,54,185`. |

## (f) Dated path to three completed trainees
This schedule is a proposal, not an approved delivery promise. All Daniel hours below are **estimates**.
The PM coordinates PR, Workbooks, Tutor, and subject handovers. Monorepo prepares evidence and performs approved technical work.
Do not assign Daniel installs, migrations, source edits, secret administration, account provisioning, or report preparation.
| Proposed date | Work and exit evidence | Daniel hours, estimate |
|---|---|---|
| Oct 29–Nov 1 | PM accepts both A-29 audits; Monorepo reconciles the live baseline and January lesson delta. Daniel chooses the training scope and Sales resume gate. | 0.5–1 content choice |
| Oct 29–Nov 5 | Daniel decides the A-21 master push; team follows redeploy order. Sales candidate waits for curriculum approval, not merely order 5. | 0.5–1 deploy gate |
| Nov 2–5 | Monorepo preserves the Tutor switch target Nov 3 and delivers A-30 design Nov 5. PR supplies current edition and delivery wording. | 0.5–1 content choices; no new technical duty |
| Nov 6–13 | Monorepo revises M4/M7, quizzes, scenarios, Thai packet, and source pin. PR checks sources and changed claims. | 1–2 content choices |
| Nov 16–20 | Monorepo implements S8/S9 and founder reporting coverage. Reviewers verify role access, bindings, and completion meaning. | 0.25–0.5 merge gate |
| Nov 23–27 | Reviewers prepare S10 evidence. Daniel approves Thai/content. Team checks seed-day facts, including actual book delivery and editions. | 1.5–2.5 content approval |
| Nov 30–Dec 4 | Deploy operator runs the approved candidate pipeline. Daniel checks the two owner recordings and approves promotion after acceptance. | 0.5–1 recording acceptance; 0.5–1 deploy gate |
| Dec 7–18 | Each trainee completes the approved core and School path. Founders also check Family access. PM records individual evidence. | 6–10 training hours, separate from gate hours |
| Dec 21–Jan 8 | Trainees retry failed scenarios. PM verifies all three completions; Monorepo fixes defects before any approved redeploy. | 0.25–0.5 per necessary merge/deploy gate |
| Jan 11–15 | Team refreshes demo lessons against the accepted subject and Storytime builds. Trainees complete any changed lesson and scenario. | 0.5–1 content choice; 1–2 refresher hours |
| Jan 18–22 | PM checks three completed records and the demo checklist. Daniel makes any final deploy/rollback choice. Keep the Jan 22 freeze. | 0.5–1 release gate; rollback reserve 0.5–1 |
| Before first visit | PM confirms completion before the actual visit date. Keep Reading Advantage out of the January demo. | No additional gate unless content changes |
The first visit date is **unverified**. Default: finish Dec 18; refresh Jan 21 (proposals based on PR strategy `57b9ecd:125–133`).
Gate estimates total 6.25–12 hours before retries or rollback. Training adds 7–12 hours for Daniel; the PM must confirm everyone's availability.
- A-21 already reached local master; its push remains a deploy gate. The push deploys www immediately (`docs/deployment/security-upgrade-2026-10.md:3–13`).
- A-30 design is due Nov 5. It must not block the Nov 3 Tutor database switch (`docs/primary-book-editions.md:3,158–161`).
- Science, Math, and Zhongwen handovers move demos to Jan 22; each names unresolved date changes (`measure/tracks/{science_advantage_relaunch,math_advantage_program,zhongwen_advantage_program}_20261006/handover-20261028.md`, section 2).
- Subjects remain separate apps by repository authority. PR strategy still describes shared-app placement; PM must reconcile that source conflict before course screenshots teach navigation.
- Evidence: `AGENTS.md`, “One program, one app, one container”; PR strategy `57b9ecd:109,188`; subject handovers, section 5.
- Storytime Phase 2 still waits for Workbooks week files; do not teach an unverified Storytime build as live (`storytime_app_rebuild_20261025/plan.md:150–160`).
- Reserve one heavy job at a time on the approximately 7 GB machine (`science_advantage_relaunch_20261006/handover-20261028.md:96–99`).
- If a subject demo slips, the PM presents a reduced demo choice to Daniel. No agent silently removes a subject or changes the freeze.
- Completion acceptance requires three named identities, the approved curriculum revision, completed required lessons, quiz passes, and the required scenario passes.
- The PM must verify completion after the final content refresh. Earlier completion alone does not establish readiness for changed January lessons.

## Questions for Daniel
1. May Sales resume S8–S11 and prepare the revised January course after A-21 coordination? **Default:** prepare drafts; keep release gates closed.
2. Who is the third trainee, and when is the first school visit? **Default:** leave the name unverified; finish Dec 18, refresh Jan 21.
3. Do the founders complete the Family branch as well as core/School training? **Default:** core plus School for all three; founders test Family access.
4. May the team prepare one combined S1/curriculum candidate after approval? **Default:** no deploy until Daniel approves the exact source and curriculum.

## Facts changed
- The readiness baseline now uses the recorded August 31 promotion, `00016-dij` from `3fdb1fd0b`, rather than the July status record.
- The audit identifies the January course gaps and the founder reporting gap. Live revision, accounts, and completion remain unverified.
- No price, public date, production state, account, course approval, or release permission changed.
