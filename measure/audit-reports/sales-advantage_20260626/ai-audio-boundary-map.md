# Sales Advantage — AI / Audio / Storage Boundary Map

> Track: `sales_advantage_review_20260626`
> Synthesized from batch reports B00–B05. No source code edited. No acceptance/closeout claim.

This maps the browser audio recording flow through storage and the AI
evaluation/fallback/privacy boundary, with the source batch finding IDs at each
hop. It satisfies the spec acceptance item: *"Audio roleplay flow is mapped from
browser recording through storage and AI evaluation."*

---

## End-to-end boundary diagram

```
[ Browser device ]
  roleplay-recorder.tsx
   getUserMedia → MediaRecorder({mimeType:"audio/webm"})  ── hardcoded codec
   stop → Blob → URL.createObjectURL (preview)
        │
        │ multipart/form-data POST (audioFile, scenarioId, durationMs, mimeType)
        ▼
[ Route boundary: app/api/roleplay-attempts/route.ts ]   maxDuration=60
   validateSession (authn)
   checkRoleplayRateLimit (10/hr, in-memory)             ── NO role gate
   arrayBuffer() → Node Buffer                            ── NO size/mime/duration check
   getRoleplayEvaluationContext(scenarioId) → {scenario, rubric, canonicalSourceExcerpts}  [FR-4]
        │
        ▼
[ Storage boundary: getStorageClient().put ]
   put(buffer, { public:false }, key = userId-scoped)
   audioStorageKey persisted ONLY if upload succeeded     ── no-orphan invariant
        │
        ▼
[ AI evaluation boundary: domain roleplay-evaluator.ts via injected AIClientLike ]
   PRIMARY:  AIClient.generateObjectFromMedia(media=base64(audio), schema, prompt)
        │  (provider: google.ts | openrouter.ts; openai → UnsupportedError)
        │  on error ▼
   FALLBACK: AIClient.transcribeAudio(audio) → transcript text
             → AIClient.generateObject(transcript, schema)
        │  both fail ▼  SalesError(EVALUATION_FAILED) with cause
        ▼
   evaluation { overallScore, passed, criteria, feedback, transcriptExcerpt(≤600c) }
   saveAttemptEvaluation(attemptId, ...) → if passed: markTheoryLessonComplete
        │
        ▼
[ Back to browser ] res.json().evaluation → roleplay-result.tsx (no client validation)
```

---

## Browser recording hop

| Concern | Status | Finding |
|---------|--------|---------|
| Codec hardcoded `audio/webm`, no `isTypeSupported` guard (Safari/iOS fail) | defect | `F-SALES-B01-014` |
| No max duration / size auto-stop before upload | defect | `F-SALES-B01-015` |
| Object URL never revoked (per-cycle leak) | defect | `F-SALES-B01-016` |
| No consent/notice that audio leaves device + is AI-processed | privacy gap | `F-SALES-B01-018` |
| Test setup mocks none of `getUserMedia`/`MediaRecorder`/`createObjectURL` | test gap | `F-SALES-B01-022` |

## Route / upload hop

| Concern | Status | Finding |
|---------|--------|---------|
| No role authorization before paid AI spend | high | `F-SALES-B00-027` |
| No size/MIME/duration validation before buffering full file | defect | `F-SALES-B00-028`, `F-SALES-B04-007` |
| `serverActions.bodySizeLimit: "20mb"` widens upload surface | info | `F-SALES-B02-015` |
| Rate limiter in-memory, non-durable across instances | medium | `F-SALES-B01-025`, `-026` |
| FR-4 remediation: excerpts fetched before upload, forwarded to evaluator | positive | `F-SALES-B00-026` |
| Route-handler test covers no-orphan + excerpt-forwarding; gaps on 401/403/400/429 | test gap | `F-SALES-B00-025` |

## Storage hop

| Concern | Status | Finding |
|---------|--------|---------|
| `getStorageClient().put(..., public:false)`, user-id keyed (private) | positive | `F-SALES-B00-026` |
| `audioStorageKey` persisted only on upload success (no orphan ref) | positive | `F-SALES-B00-026` |
| Storage adapter call sites not present in batches 03–05 (cannot verify there) | limitation | B04 Limitations, `F-SALES-B05-021` |
| `audioStorageKey` schema/migration nullability drift (0021 NOT NULL vs schema nullable; fixed in 0023) | high | `F-SALES-B04-001` |
| Domain output schema `audioStorageKey: z.string()` non-nullable vs nullable column/write | medium | `F-SALES-B05-006` |
| Domain keeps storage SDK out of domain layer (opaque key) | positive | `F-SALES-B05-021` |

## AI evaluation / fallback / privacy hop

| Concern | Status | Finding |
|---------|--------|---------|
| Adapter base64-encodes **entire raw audio** + prompt to Google/OpenRouter; no redaction/retention/consent gating at adapter | privacy gap | `F-SALES-B03-014`, `F-SALES-B04-003` |
| Transcript fed verbatim into 2nd prompt + persisted as `transcriptExcerpt`; no redaction; 600-char cap only test-enforced (column unbounded `text`) | privacy gap | `F-SALES-B04-006`, `F-SALES-B05-011`(logging) |
| OpenAI rejects audio multimodal (`UnsupportedError`) — eval requires google/openrouter | design | `F-SALES-B03-017` |
| Default multimodal/ASR/text models are `:free`/preview tiers (durability/quality risk) | medium/low | `F-SALES-B03-016`, `F-SALES-B04-011` |
| `maxRetries:1`, single model; resilience is the STT fallback, not adapter retry | low | `F-SALES-B04-008` |
| `MediaInput` accepts any Buffer+mime, no Zod validation before provider call | low | `F-SALES-B04-007` |
| Mock `transcribeAudio` returns silent fixture default while others throw | info | `F-SALES-B04-013` |
| Error taxonomy: real providers collapse schema failures to `PROVIDER_ERROR`; only Mock emits `SchemaValidationError` (affects fallback branching) | low | `F-SALES-B03-024` |
| FR-5 fallback ladder + error-cause propagation well implemented | positive | `F-SALES-B05-020`, `F-SALES-B04` positives |
| `submitRoleplayAttempt` callback bypasses FR-4 canonical-excerpt sourcing | medium | `F-SALES-B05-004` |

## AI adapter architecture boundary (relevant to AI path integrity)

| Concern | Status | Finding |
|---------|--------|---------|
| Barrel `index.ts` re-exports raw SDK (`generateObject`,`streamText`,`createOpenAI`,…) — adapter becomes pass-through | high | `F-SALES-B03-010` (root cause `index.ts`) |
| Arch-guard regex catches only direct `from "ai"`/`@ai-sdk/`, not raw-SDK named imports via barrel | high | `F-SALES-B03-010`, `-005` |
| Sales app declares `@ai-sdk/google` / `@ai-sdk/openai` directly | medium | `F-SALES-B02-001` |
| Providers honor "no `process.env` reads in adapter" (constructor-injected keys) | positive | `F-SALES-B04` positives, `F-SALES-B03-007` |

## Privacy posture summary

- Learner/prospect voice audio is uploaded (private storage, good) but forwarded
  **raw, un-redacted** to third-party AI providers (Google/OpenRouter) with no
  consent UI, no retention annotation, and no provider zero-retention routing.
  Roleplay prompts may include improvised real prospect names (PII).
  Sources: `F-SALES-B01-018`, `F-SALES-B03-014`, `F-SALES-B04-003`, `F-SALES-B04-006`.
- These were **not** runtime-verified (no audio submitted to providers per the
  spec non-goal); they are inferred from adapter/test/contract reading.
