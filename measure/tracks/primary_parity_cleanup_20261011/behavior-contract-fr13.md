# Behavior contract — primary_parity_cleanup_20261011, FR-13 (CNT-02, AI callers on the adapter)

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| CNT-02 | AI models | Use the legacy models for the two AI features that stay: SAQ/LAQ feedback and the lesson chatbot. | 2026-10-11 |
| ADM-11, SYS-04 | Content generation removal | The generators go (FR-3, FR-4). Only the feedback and the chatbot use AI after that. | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| SAQ feedback | STUDENT | Sends a short answer in a lesson | Feedback and a score from the model of task `qa.feedback` (Vertex `gemini-3-flash-preview`) | `server/utils/assistant.ts:17-95` (`getSaqFeedback`; `formatTaskLog` at `:75`; `system` at `:86`) |
| LAQ feedback | STUDENT | Sends a long answer in a lesson | Feedback and a score from the same task | `server/utils/assistant.ts:97-170` (`getLaqFeedback`; `formatTaskLog` at `:152`; `system` at `:163`) |
| Lesson chatbot | STUDENT | Sends a chat message | A JSON reply built from the stream of task `chatbot.stream` (OpenAI `gpt-4o-mini`) | `app/api/assistant/lesson-chatbot/route.ts:25-140` (`resolveTaskModel` at `:113`, `streamText` at `:124`) |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Article | table | Read by id for the feedback prompt (global content, no `schoolId`) | read | The signed-in user | `server/utils/assistant.ts` |
| `ai_task_configs`, `ai_providers` | tables (legacy) | Model, provider, temperature of the two tasks | read at run time in legacy | none | `server/ai/modelResolver.ts:127-159` |
| AI call | side effect | One model call for each request | external | none | as above |
| Log line | side effect | Legacy: task and model. New: `ai_call` with task, provider, model, `durationMs` | write | none | `formatTaskLog` |

The new app reads no AI table. The values come from `lib/ai/models.ts` (live rows of the C4 backup of 2026-10-11).

## 4. New target

- Drizzle tables (and the migration, when the schema changes): none, no migration.
- Domain functions (Zod input and output): `getSaqFeedback` and `getLaqFeedback` in `server/utils/assistant.ts` keep their contract; the chatbot route keeps its Zod body schema and its JSON response.
- Permission action for `assertCan`: unchanged (the chatbot route keeps the `currentUser` check).
- TenantDB class for each table (FLAT, EXEMPT, or REFERENTIAL): unchanged (articles are global content).
- AI adapter use: `feedbackClient().generateObject` (provider `vertex`, location `global`, model `gemini-3-flash-preview`) and `chatbotClient().streamText` (provider `openai`, model `gpt-4o-mini`). Overrides: `PRIMARY_AI_FEEDBACK_MODEL`, `PRIMARY_AI_CHATBOT_MODEL`.
- RPG skin components: none.
- Routes (with the locale): `/api/assistant/lesson-chatbot` (unchanged path). No new route.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Models are code constants with an environment override, not database rows | No AI registry page in Primary (SYS-06 is out of scope) | 2026-10-11 |
| The chatbot logs errors with `logger.error` | Primary logger rule | Spec R-5 |
| The Vertex location is `global` (the old Primary code used `us-central1`) | Same as legacy `utils/google.ts:6` | Spec FR-11 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-9 | `/en/student/lesson/<id>` | same | STUDENT | Feedback and score show; the `ai_call` log names `vertex` and `gemini-3-flash-preview` | The values of `lib/ai/models.ts` equal the live rows of the C4 dump (done in Phase 8) | batch capture (orchestrator); the kit has no AI key, so the owner checks the live call after deploy |
| AC-10 | the lesson chatbot | same | STUDENT | The chatbot answers; the `ai_call` log names `openai` and `gpt-4o-mini` | same | same |

## 7. ETL and runbook changes

none. For `primary_parity_rehearsal3_20261011`: production already sets `OPENAI_API_KEY`, `VERTEX_CLIENT_EMAIL`, `VERTEX_PRIVATE_KEY`, and `PROJECT_ID` (`cloudbuild.yaml:74-77`, `:83`). After the deploy, check one `ai_call` line for each feature in the Cloud Run log. If Vertex `global` does not serve the model for this project, set `PRIMARY_AI_FEEDBACK_MODEL`.
