# Reading game repair report

## Result

The assigned Reading game failures are fixed.

The enchanted library loop now advances game time once per frame.
The previous loop advanced the value twice.

The spell input now exposes an accessible name on desktop and mobile.
The mobile submit button also has an accessible name.
Standard click activation now supports pointer and keyboard input.
The pointer-down handler still preserves input focus.

Sound playback now accepts older successful `play()` calls that return no promise.
A synchronous error or rejected promise starts the existing synthesized fallback.
Successful file playback does not start a second tone.

The battle test retains the readability gradient and verifies the supplied image.
The rune tests now follow the current countdown, board, and damage contracts.
They no longer use an invalid sixth row in the 5 by 5 grid.
The start screen test now uses the current translation key and delayed callback.

The wizard game did not contain an infinite effect in the focused reproduction.
Its test waited for text that the stable translation mock cannot render.
The test now uses the current translation key and briefing heading.
The complete wizard test finishes in less than two seconds.

The diagnostic run later identified Dragon Flight as the stall point.
The Jest translation mock returned a new function during each render.
That function changed the memoized difficulty table and `resetGame`.
The reset effect then started another render.
The installed translation function is stable during normal rendering.
The Jest mock now matches that behavior.
Dragon Flight retains its memoized settings and vocabulary reset effect.
The reset callback now also tracks the optional duration.

The Dragon Flight timer now exposes progress semantics.
Its dragon count now uses the existing Dragon Rider test contract.
The remaining component tests use the stable translation mock output.
The Rune Match Konva mock now includes every rendered primitive.

The final four failures were stale fixtures.
Potion Rush now supplies the browser resize fixture used by its canvas layout.
Castle Defense now selects the current translated controls by role and name.
Its translation fixture preserves the wave values for the HUD assertion.
The result tests now follow the stable translation output.
The container test now supplies the store snapshot method used at game completion.
It also checks the current title and accessible spell input.

## Files

- `apps/reading-advantage/components/games/game/InputController.tsx`
- `apps/reading-advantage/components/games/game/InputController.test.tsx`
- `apps/reading-advantage/components/games/game/StartScreen.test.tsx`
- `apps/reading-advantage/components/games/game/GameContainer.test.tsx`
- `apps/reading-advantage/components/games/game/ResultsScreen.test.tsx`
- `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.test.tsx`
- `apps/reading-advantage/components/games/sentence/potion-rush/PotionRushGame.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleScene.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleResults.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/rune-match/RuneMatchGame.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.test.tsx`
- `apps/reading-advantage/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx`
- `apps/reading-advantage/components/games/vocabulary/dragon-flight/DragonFlightGame.test.tsx`
- `apps/reading-advantage/jest.setup.ts`
- `apps/reading-advantage/hooks/useSound.ts`
- `apps/reading-advantage/hooks/useSound.test.tsx`
- `apps/reading-advantage/lib/games/enchantedLibrary.ts`
- `apps/reading-advantage/lib/games/runeMatch.test.ts`
- `apps/reading-advantage/lib/games/runeMatchConfig.test.ts`
- `graph.db`

## Verification

- Seven focused Jest suites: 111 passed.
- Wizard game Jest suite: 5 passed.
- Six diagnostic game suites: 35 passed in one final run.
- Four final focused game suites: 15 passed in one final run.
- Focused ESLint checks: passed.
- Dragon Flight retained eight existing ESLint warnings.
- The Jest setup retained four existing explicit-any warnings.
- Reading type check: passed in the Primary task after the stable Jest mapping changes.
- Code graph update: completed for the three changed production modules.

The focused Jest command used `--runInBand`.
This kept the validation to one test worker.

## Remaining work

No source or test failure remains in the assigned game files.
The root task owns the final Reading suite run.
