# S0 Protocol Harvest: Tutor Advantage (2026-08-04)

## How this was obtained

`s0-audit-20260804.md` recorded the Tutor Advantage protocol as not obtainable,
having searched only this repository. It is a **sibling checkout**, not a
dependency: `/home/daniel-bo/Desktop/tutor-advantage`, pointed out by the product
owner. That correction is the reason this receipt exists; the audit's claim was
true of the search performed and false of the world.

Read-only. Nothing in the sibling checkout was modified.

## The headline finding, which inverts spec decision 3

Spec decision 3 says Tutor Advantage wins ties on race semantics **because it is
the production system**. Two things are now established:

1. **The race protocol is not in production there either.** It is the same
   orphan. `apps/student-liff/src/types/multiplayer.ts` is consumed by exactly
   one file — `useMultiplayerGameState.ts` — and that hook is consumed by
   nothing. `useMultiplayerSocket.ts` never references `MessageType` at all: it
   is a generic WebSocket wrapper that takes a URL from its caller, and it has no
   caller. No service in `services/` implements a single message kind from that
   file. Grep across the whole checkout for `MessageType`, `SCORE_SUBMIT`,
   `score_submit`, or `roomCode` returns two files, both of them the orphan
   itself. `docs/` and `conductor/` do not mention multiplayer.

2. **A real, deployed realtime system does exist there — a different one.**
   `services/learning-service/src/websockets/lessonHandler.ts`, 974 lines over
   socket.io 4.8, is the classroom lesson session service. It is authenticated,
   authorized per role, persisted through Prisma, and **games already run inside
   it**.

So there is no production race protocol to defer to. The tie-break in decision 3
resolves to nothing, and S1 must not treat the sibling's `types/multiplayer.ts`
as authoritative — it carries no more production weight than our own copy of it.

## Our copy is a fork of theirs

`diff` between the two `types/multiplayer.ts` files is **one hunk**: our
`StateUpdateMessage.payload` adds an optional `roomCode`, commented "Present on
the `create_room` acknowledgement so the host can share it." Everything else is
byte-identical, down to the error strings in `deserializeMessage`.

The mtimes invert the expected direction — ours 2026-07-07, theirs 2026-07-29 —
so ours is not a stale copy of a since-advanced original. Both are drifting
copies of a common ancestor, and neither has a server. This closes M-2's open
question about where the third trust model came from: it was never designed, it
was duplicated.

## The system that is actually in production

`lessonHandler.ts` is worth more to this track than the protocol we went looking
for, because it is the surface a classroom game must plug into.

| Concern | Implementation | Line |
| --- | --- | --- |
| Transport | socket.io 4.8, server and both clients | `lessonHandler.ts:2` |
| Auth | `io.use` middleware, JWT verified before connection is accepted | `:49-61` |
| Identity | `socket.data.actor = { userId, role }` from verified claims | `:56` |
| Authorization | `isTutorSessionOwner` / `isStudentSessionParticipant` per handler | `lessonAuthorization.ts:30,43` |
| Room | the lesson session; socket.io rooms keyed by `sessionId` | `:454` |
| Join gate | `prisma.enrollment` ACTIVE check, then package/cycle access check | `:230-273` |
| Determinism | `seededShuffle(array, seedInput)`, `Math.sin`-based | `:29-45` |
| Game lifecycle | vote → lock → countdown → playing → results | `:443-548` |
| Result intake | `submit_game_result`, persisted via `dbWriter.persistAnswer` | `:508-532` |
| Kick | `kick_student` | `:915` |
| Disconnect | student: state preserved for auto-recovery; tutor: 15 s grace, then session deleted | `:950-971` |
| Session state | `private sessions: Map<string, LessonSession>` in one process | `LessonSessionService.ts:137` |

It also already reads Reading Advantage's database (`getArticleDetails` from
`services/ReadingAdvantageDB`), so the two systems are coupled today.

## Semantic diff

| Semantic | Orphaned race protocol (both copies) | Lesson session service (production) | Verdict |
| --- | --- | --- | --- |
| Message kinds | 7 flat kinds, custom JSON envelope over raw `WebSocket` | socket.io named events, ~17 of them | **Neither wins.** S1 defines its own envelope. Production's transport choice is real; its event vocabulary is lesson-shaped, not game-shaped. |
| Round lifecycle | `ROUND_START` / `ROUND_END` / `GAME_OVER`, rounds owned by the game | vote → lock → countdown → playing → results, owned by the tutor | **Production wins.** A classroom round starts when the teacher starts it. S1 must express a round the session can drive, not one the game self-starts. |
| Scoring trust | client sends `score`; server stores it | client sends `score`; server does `Math.max(0, Math.round(Number(result.score \|\| 0)))`, persists it, and feeds badges from it | **Neither wins — see below.** |
| Reconnect | `LeaveMessage` with optional reason; our `room-manager` rejects rejoin while `active` (M-3) | participants keyed by `userId`, not socket id; disconnect explicitly preserves state for auto-recovery | **Production wins decisively.** Identity-keyed participants are exactly the fix M-3 needs. |
| Identity | `playerId` and `playerName` supplied by the client in `JoinMessage` | `userId` and `role` from a verified JWT; client cannot assert either | **Production wins.** Adopt wholesale; this also answers S4's identity binding. |
| Room membership | room code, no entitlement check | ACTIVE enrollment plus package/cycle access, checked against Prisma on join | **Production wins.** Room codes are not an access model. |
| Room state | process-global `getGlobalRoomManager()` (M-1, M-4) | process-local `Map` in `LessonSessionService` | **Neither wins.** See the multi-instance note below. |
| Determinism | none | `seededShuffle` with a string seed | **Directionally right, mechanically not adoptable.** See below. |

### Scoring: production is the weakest of the four, so decision 3 must be overridden

The audit found three disagreeing trust models. The production system is a
fourth, and it is the most permissive: it accepts the client's number, clamps it
non-negative, rounds it, adds it to the participant's running total
(`LessonSessionService.ts:490-493`), and writes it to the database through
`persistAnswer`. There is no derivation from anything the server observed.

That total is not inert. At `FINAL_LEADERBOARD_PHASE` the handler reads
`p.score` for every participant and pushes it to the parent over LINE — "you
scored N points" — as the lesson's closing message (`lessonHandler.ts:408-438`).
A forged client score becomes a number a parent reads.

Deferring to production here would import that path into a new contract. **This
is the one place S1 must contradict production.**

The spec had already decided this, which was not obvious until the harvest.
Decision 5 — "the server does not trust client scores; the session service
recomputes from submissions" — is the specific rule to decision 3's general
tie-break, so it governs. The two clauses only came into visible conflict once
the harvest established what the live service does with a submitted score.
Decision 3 has since been amended to scope itself away from scoring rather than
to overrule decision 5, so this required no new product decision.

### Determinism: right instinct, wrong primitive

`seededShuffle` sums the char codes of its seed string and draws from
`Math.sin(seed + i) * 10000`. Char-code summation collides on any anagram
(`"abc"` and `"cab"` seed identically), and `Math.sin` is not required by ECMA-262
to be correctly rounded, so results are **not guaranteed identical across
JavaScript engines** — a client on JavaScriptCore and a server on V8 may diverge.
For a lesson shuffle that is invisible. For S6's server-authoritative simulation,
where client and server must agree bit for bit, it is a defect waiting to happen.

S2 should carry the intent — seeded, reproducible ordering — and use an integer
PRNG whose output is exact in any engine. Recorded here so S2's choice reads as
deliberate rather than as ignorance of the precedent.

### Multi-instance: there is a precedent, and it is single-instance

`LessonSessionService` holds every session in a process-local `Map`. There is no
socket.io Redis adapter, no sticky-session configuration, and no room-affinity
handling anywhere in the checkout. `learning-service` ships as a container
(`services/learning-service/Dockerfile`).

So S4's spike gets a real deployment precedent — containerized long-lived socket
process — and gets **no** multi-instance precedent. The production system has the
same weakness the audit charged against `getGlobalRoomManager()` in M-1 and M-4;
it survives because it runs one instance. S4 must not cite production as evidence
that process-local room state is acceptable.

## What S1 must carry out of this harvest

Additions to the seven items already listed in `s0-audit-20260804.md`:

8. Identity comes from verified claims, never from a client-asserted `playerId`.
9. Room membership is gated on an entitlement check, not on possession of a code.
10. Round start is drivable by a session owner (the tutor), not only by the game.
11. Participants are keyed by user identity so reconnect is a state, not a rejoin.
12. The envelope must be expressible over socket.io, since that is what the one
    deployed realtime service and both its clients already speak.

## What this changes, for the product owner

- **S1 is no longer blocked.** The task was to obtain the reference protocol and
  diff it. That is done. What the harvest found is that the race protocol has no
  production authority, so S1 can proceed to freeze `multiplayer.v1` on its own
  merits.
- **Decision 3 is amended, and it needed no new ruling.** It now scopes itself to
  session, identity, and lifecycle semantics, where the live service is the
  stronger reference, and defers to decision 5 on scoring. This was first filed
  as an open product decision; that overstated it. Decision 5 already said the
  server does not trust client scores, and a specific rule governs a general one.
  The harvest did not create the question, it made an existing contradiction
  visible.
- **Decision 6 now has a live tension.** It has students join by code; the live
  service gates on ACTIVE enrollment. Left unresolved on purpose and flagged in
  the spec for S4 to decide at the point it binds rooms to identity.
- **A question the track has not asked, and this one is genuinely open.** The
  classroom already has a session service with lobbies, rosters, kick, countdown,
  and result intake. S3 and S5 plan a second one inside the Play Kit. Whether the
  Play Kit capability should *speak to* the lesson session rather than
  reimplement it is unaddressed by any decision in the spec, because the spec was
  written believing Tutor Advantage was a billing counterparty. Worth settling
  before S3. It blocks neither S1 nor S2.

## Scope

Harvest and diff only. No code changed in either repository, no spec amended, no
S1 work started.
