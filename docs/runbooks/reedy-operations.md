# Reedy voice operations (Primary Advantage)

Ported from the Tutor runbook `docs/runbooks/reedy-operations.md` (track
`primary_reedy_preview_20261003`, FR-16). The Tutor text is quoted as is; the
Primary section at the end records what differs.

## Tutor runbook (source text, 2026-09-30)

Admin Console → การฝึกเสียงกับรีดี้ shows a 7, 30, or 90 day view. The API is
`GET /v1/admin/voice-operations?days=30` and requires an active `ADMIN` user.
It returns aggregate counts and recent session identifiers, without student
names, audio, or transcripts.

- **Start failure**: a reserved session where the provider call failed or the
  connection lease/timeout expired before WebRTC was acknowledged. Microphone permission
  errors before a reservation are not in this denominator.
- **Disconnect**: a connected, ended session marked `CONNECTION_LOST` by the
  student client. Page closure and user end are separate reasons.
- **Summary failure**: a connected, ended session without persisted feedback.
- **Measured Realtime cost**: sum of all provider `response.done` token usage
  observed by the server sideband, priced in USD using the model rate card in
  `voiceUsage.ts` (reviewed 2026-09-30). Cached text/audio/image input is priced
  separately. Usage is snapshotted before the provider call is hung up, so the
  sideband closing afterwards does not discard it. A session counts as missing
  only when a response was still running when the call ended, or when the
  sideband was re-attached after a service restart. The dashboard reports that
  missing count explicitly.
- **Measured transcription cost**: learner speech transcribed by
  `gpt-transcribe` at USD 0.0045 per minute. Each
  `conversation.item.input_audio_transcription.completed` event reports
  `usage.type = "duration"` with billed seconds; if a provider only reports
  tokens, the VAD speech boundaries are used instead. Sessions recorded before
  2026-09-30 have no transcription amount and are counted separately.
  Rate card: https://developers.openai.com/api/docs/pricing . Usage event shape:
  https://developers.openai.com/api/docs/guides/voice-latency-cost .

The dashboard total is Realtime plus transcription. It is **not the final
provider bill**: moderation (`omni-moderation-latest`, currently free), the
fallback Gemini evaluator, and later price changes are not included. Compare the
dashboard trend with the provider's project billing totals after rollout.
Update both rate cards whenever the configured models or published pricing
change. A local simulation on 2026-09-30 measured about USD 0.028 per practice
minute on `gpt-realtime-2.1-mini`, higher than the
`AI_VOICE_ESTIMATED_COST_THB_PER_MINUTE=0.5` estimate used for the package
cost warning.

Per-turn guidance is sent as a `system` conversation item, never as
`response.create` `instructions`: those replace the session prompt (lesson
context, persona, safety rules) for that response.

If start failures rise, check provider call creation errors and WebRTC setup.
If disconnects rise, compare affected clients and networks. If summaries fail,
check sideband availability and the fallback evaluator logs. Do not log raw
learner transcripts while investigating.

## Primary Advantage section

### Where the numbers are

- Admin and SYSTEM: `/admin/reedy` (quick action "Reedy costs" on the admin
  dashboard). It shows the last 3 months by school: minutes, sessions, cost in
  THB, failed starts, disconnects, summary failures, and safety event counts.
  SYSTEM sees every school; ADMIN sees the own school.
- Teacher: `/teacher/class-roster/<classId>/reedy` ("Reedy" in the class
  header). It shows this month per student: minutes, sessions, last talk,
  average scores, and the safety event count. Students with no use are listed.
- Domain: `getSchoolVoiceCosts` and `getClassVoiceUsage` in
  `packages/domain/src/primary-voice/views.ts`. `summarizeVoiceOperations` is
  the Tutor function, ported as is.

### What differs from Tutor

- Budget: a monthly budget per student, not a class package.
  `AI_VOICE_MONTH_BUDGET_SECONDS` (default 480) and
  `AI_VOICE_SESSION_CAP_SECONDS` (default 180). The month is the calendar month
  in Asia/Bangkok. Usage lives in `primary_voice_monthly_usage`.
- Kill switch: `AI_VOICE_ENABLED` is read on every request; set it to `false`
  to stop new sessions. A school is switched off with a row in
  `primary_voice_school_settings` (`enabled = false`).
- Gates: a student needs a password sign-in (`authStrength = full`; a class
  code or picture sign-in is refused) and a saved avatar.
- Tables: `primary_voice_sessions`, `primary_active_voice_sessions`,
  `primary_voice_monthly_usage`, `primary_voice_school_settings` (migration
  `0067_primary_voice`). No audio or transcript is stored.
- Cost in THB: `AI_VOICE_THB_PER_USD` (default 36) converts the measured USD.
  When a session has no measured usage, the stored cost is the estimate
  `AI_VOICE_ESTIMATED_COST_THB_PER_MINUTE` (default 0.5) times the minutes.
- Provider adapter: `packages/ai/src/voice/openai.ts` posts to
  `POST /v1/realtime/calls` and opens the sideband with the `ws` client and an
  `Authorization: Bearer` header, because the pinned `openai` 6.44.0 has no
  `realtime.calls.create` and a `?call_id=` sideband rejects the browser
  subprotocol key with 401. Tutor uses the SDK 7.x calls. See
  `measure/tech-debt.md` (2026-10-05). The server log shows `[voice] sideband
  <call> open|closed <code>`, every provider `error` event, and the cause of a
  failed `createCall`; a `closed 1006` after `response.done` is the normal end
  (the hangup drops the call).

### Before the first live session

1. Set `OPENAI_API_KEY` and `AI_VOICE_ENABLED=true` in the rehearsal
   environment.
2. Sign in as a QA student with a password, save an avatar, open
   `/student/reedy`, and complete one session.
3. Check `/admin/reedy`: one attempt, no failed start, a measured cost, and a
   summary.
4. Only then run the 20-session calibration (Phase 5 of the track).

### If something rises

- Failed starts: check the `POST /v1/realtime/calls` response in the server log
  (`[voice]` lines) and the WebRTC answer handling in
  `components/reedy/reedy-session.tsx`.
- Disconnects: compare clients and networks; the client reports
  `CONNECTION_LOST` on a dropped peer connection.
- Summary failures: check the sideband and the `generateObject` fallback
  evaluator in `server/controllers/voiceController.ts`.
- Never log transcripts.
