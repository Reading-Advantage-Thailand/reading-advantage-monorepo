# Specification: APK Legacy Catalog Manual Browser Evidence

## Objective

Manually inspect every cartridge from the completed 20-title legacy catalog track and publish screenshot evidence.

## Scope

The exact titles are Castle Defense, Magic Defense, RPG Battle, Wizard vs Zombie,
Enchanted Library, Rune Match, Alchemist's Synthesis, Potion Rush, Dungeon Liberator,
Rune Forge Chamber, Village Guardian, The Abyssal Well, Archer's Revenge,
Storm the Castle Tower, Griffin Sky-Joust, Realm Carver, Paladin's Twin-Soul,
Devourer Slime, The Haunted Library, and Gryphon Patrol.

## Requirements

- Use each public arcade cartridge route with deterministic sample content.
- Inspect gameplay at 390 by 844 and 1440 by 900 viewports.
- Enter scored play and apply at least one real keyboard or pointer action.
- Capture one gameplay screenshot at each viewport for every title.
- Check visible clipping, text readability, canvas count, controls, and error states.
- Check browser console errors after each title.
- Record one verdict and evidence paths for every title.
- Do not use automated assertions as a substitute for visual review.
- Reconcile the 20 titles with the relevant UX wiring audit findings.
- Distinguish public preview evidence from the authenticated catalog path.

## Acceptance Criteria

- The evidence directory contains 40 screenshots, with two screenshots per title.
- Every screenshot shows the named title and an active gameplay canvas.
- The QA report records compact and wide verdicts for all 20 titles.
- Every failure has severity, reproduction steps, and an evidence path.
- An independent reviewer confirms that the report matches the screenshots.
- The report identifies source-confirmed defects that screenshots cannot prove.

## Out Of Scope

- Authenticated persistence, which the completed implementation track already proves.
- New art, mechanic changes, or legacy route deletion.
- Automated lifecycle testing, which remains separate supporting evidence.
