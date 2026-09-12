# S2 Determinism Inventory: Wizard vs Zombie (2026-08-04)

## Purpose

Read-only inventory of every nondeterminism source in
`apps/advantage-games/src/lib/games/wizardZombie.ts`, so the S2 refactor is
written against a complete list rather than discovered incrementally. No code
was changed.

## The shape is already right

`advanceWizardZombieTime(state, dt, input, vocabulary)` (line 123) is a reducer
returning a new state, and `createWizardZombieState` already accepts an
injectable `rng` (line 77). The problem is confined to the tick path, which
reaches past its parameters to the global.

## Call sites

| Line | Site | Governs | Notes |
| --- | --- | --- | --- |
| 77 | `rng = Math.random` default | Initial target choice, initial orb layout | Already injectable; only the default is global |
| 237 | `vocabulary[Math.floor(Math.random() * vocabulary.length)]` | Next target word after a correct answer | Drives the whole learning sequence |
| 239 | `spawnOrbs(nextTarget, vocabulary, Math.random)` | Orb placement after a correct answer | `spawnOrbs` **already takes an rng parameter** — the caller passes the global |
| 247 | `spawnOrbs(currentTarget, vocabulary, Math.random)` | Orb reshuffle after a wrong answer | Same; trivially fixable |
| 300 | `Math.floor(Math.random() * 4)` | Zombie spawn gate (N/S/W/E) | One call per spawn |
| 316 | `` `zombie-${Date.now()}-${Math.random()}` `` | Zombie entity id | **Two** nondeterminism sources in one template |
| 333 | `dx += (Math.random() - 0.5) * 200` | Zombie wander, x | **Inside `zombies.map`** |
| 334 | `dy += (Math.random() - 0.5) * 200` | Zombie wander, y | **Inside `zombies.map`** |
| 403 | `` `orb-correct-${Math.random()}` `` | Correct-orb entity id | Inside `spawnOrbs`, which has an `rng` param it does not use here |
| 426 | `` `orb-decoy-${i}-${Math.random()}` `` | Decoy-orb entity ids | Same |

Ten sites, plus `Date.now()` at 316.

## Three properties the refactor must hold, not just "pass a seed"

**1. The generator must live on the state, not in module scope.** Lines 333-334
run inside `zombies.map(...)`, so the number of generator calls per tick is
`2 × zombies.length`, capped at 50 zombies — up to **100 calls per tick**, 2,000
per second at the 20 Hz session tick rate. Draw count is a function of state, so
a state-carried generator replays exactly; a module-level one does not survive
two concurrent sessions in one process, which is precisely what the server will
run.

**2. Entity ids must be derived, not sampled.** Lines 316, 403, and 426 put
random values and a wall clock into ids that then live in state and are compared
and rendered. Two clients running an identical simulation would still disagree on
every id. A monotonic per-state counter (`zombie-${state.nextEntityId++}`)
removes both the sample and the clock.

**3. Draw order must be pinned, because it is load-bearing.** Within one tick the
sequence is: target selection (237) → orb layout (239/247) → spawn gate (300) →
wander for each zombie in array order (333/334). Array iteration order makes this
stable today. Any future change to zombie storage — a Map, a filter that
reorders, a parallel update — silently breaks replay without breaking any
existing test. The property test must be sensitive enough to catch that, which
means running long enough for spawn *and* wander to interleave, not a handful of
ticks.

## Consequence for the property test

A test that runs a few ticks with no zombies alive proves nothing: sites 300,
316, 333, and 334 never fire. The S2 test must run past the first spawn
(`BASE_SPAWN_RATE_MS` 1000 ms divided by the difficulty modifier) and far enough
for several zombies to coexist, so that per-entity draws are exercised and their
ordering is pinned. Asserting byte-identical state at the end is necessary but
weak; asserting it at every tick localizes a divergence to the tick that caused
it.

## Free win

Once the reducer is deterministic, a `{seed, inputSequence}` pair fully
reproduces any session. That is replay, reproducible bug reports, and
deterministic host-proof evidence for a game that currently has none — worth
banking independently of whether the shared-world tier ships.

## Scope

Inventory only. No code changed, no marker changed, S2 remains unstarted.
