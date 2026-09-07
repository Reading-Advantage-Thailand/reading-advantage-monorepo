# Reading final review

## Result

The review found one Medium calendar issue and verified its correction.
No unresolved issue remains in the reviewed Reading scope.

## Resolved Medium: Calendar range selection loses focus

File: `apps/reading-advantage/components/ui/calendar.tsx`, lines 124–128.

The calendar changes component types when a controlled selection changes from undefined to a range.
React removes the previous DayPicker instance and its focused day button.
Keyboard users lose their position after the first selection.

`DatePickerWithRange` supplies the controlled selection through `date` and `onDateChange`.
The activity chart also supplies a controlled selection through `date` and `setDate`.

A focused jsdom check confirmed the regression.
The check rendered a controlled empty range and focused June 15, 2026.
After selection, the original button disconnected and focus moved to BODY.
The check substituted only the class-name utility to avoid unrelated workspace export resolution.

The correction keeps CalendarContent mounted and detects controlled selection through property presence.
The added regression test checks focus after selection and clearing.
An independent jsdom check confirmed that the original day button remains connected and focused through both changes.
The implementation agent reported ten passing calendar tests.

## Reviewed scope

- Reading student pages, license form mapping, chart callback, translations, flashcard keys, and calendar components.
- Reading game input, sound fallback, enchanted library timing, and changed game assertions.
- Reading Jest module mappings, translation mocks, and archived migration evidence paths.
- CI history, published Git notes, Node version, standalone pnpm setup, and added test gates.

The comparison used HEAD and `/tmp/monorepo-resume-baseline.diff`.
The baseline contains no Reading UI, game, or CI changes.
The review preserved preexisting work.

The chart callback uses the installed Recharts point payload contract.
The game time correction removes the second increment in one frame.
The input changes add accessible names and standard button activation.
The sound changes preserve file playback and use the existing fallback after failures.
The rune assertions follow the current countdown and board configuration.
The archive path changes preserve existing evidence assertions.

## Verification limits

The focused calendar reproduction ran successfully.
The scoped whitespace check passed.
This review ran no full suites, type checks, browser sessions, or graph scans.
The parent coordinates full verification while Science owns the heavy test window.

Graph queries returned ambiguous Calendar, InputController, useSound, and advanceEnchantedLibraryTime symbols.
The package filter did not resolve Calendar ambiguity.
The review inspected the relevant source callers directly.
The reviewed game exports retain their signatures.

## Resolved Medium: Dragon Flight changes production behavior for an unstable mock

The later Dragon Flight change freezes difficulty translations with a state initializer.
It also removes the effect that resets the game when vocabulary changes.
Neither change is necessary to repair the reported test loop.

Reading's `useScopedI18n` directly returns the next-intl translator.
The installed translator uses memoization and changes when its locale, messages, or related translation inputs change.
The global Jest mock instead creates a fresh translator during every render.
That mock invalidates the difficulty settings and reset callback repeatedly.

Advantage Games uses a different translation hook that returns a fresh callback.
Its existing workaround does not establish the Reading runtime contract.
Reading's lesson component supplies `lessonVocabulary` to Dragon Flight.
Removing the reset effect means an active game retains old state when that input changes.
Freezing difficulty settings also prevents their labels from updating with the translator.

Restore the memoized Reading settings and reset effect.
Stabilize the Jest translation callback.
Retain the duration dependency correction and accessible progress semantics.

The other five component fixture changes retain their gameplay assertions.
They correct translation keys, missing rendered mock primitives, and timer cleanup.
No additional concrete fixture defect appeared in this review.

The corrected diff restores the memoized settings and reset effect.
The global Jest mock now returns one stable translation callback.
A new regression test verifies that changed vocabulary returns the game to its start screen.
The correction retains the duration dependency and accessible progress semantics.
The implementation agent reported 35 passing tests across six focused suites.
The source review accepts this correction and closes the finding.


## Final four game fixture checks

The Potion Rush ResizeObserver mock now supplies dimensions through the component's actual initialization callback.
Its introduction and start-button assertions remain intact.

The Castle Defense translation mock retains the wave, killed-enemy, and total-enemy values.
The assertions still verify sentence progress, completion, and game controls.
The old fixed wave denominator belonged to translation text, not a component argument.

Results Screen still verifies score, accuracy, XP, and restart activation.
Game Container still verifies idle, playing, and game-over views.
Its store mock now supports the existing `getState().missedWords` access.

No runtime source changed in these four repairs.
No new finding appeared.
The scoped whitespace check passed.
The implementation agent reported 15 passing focused tests.
The parent owns full test verification.

## Haunted Library fixture follow-up

The Advantage Games fixture correction is accepted.
The stun test now isolates the ghost whose behavior it measures.
It still checks the stunned state, positive timer, unchanged position, and unchanged player lives.
Removing unrelated random ghosts prevents their collisions from invalidating the target ghost's damage assertion.
The earlier door fixtures similarly isolate their selected target doors.
Production code remains unchanged.
The implementation agent reported 20 passing focused tests.
No new finding appeared in this source review.
