# Advantage Play Kit Responsive Game Composition Specification

## Status and authority

This document defines the required responsive layout, camera, HUD, control, and
text behavior for Advantage Play Kit (APK) cartridges. It is a normative input
to APK capability work, semantic asset production, cartridge rewrite cohorts,
the Advantage Games QC host, and Reading/Primary production-host integration.

The educational input and output contracts remain unchanged. A cartridge still
accepts the established vocabulary or sentence array and emits the established
`GameResults`. This specification governs how the black-box game experience is
composed between those boundaries.

### Superseded guidance and conflict resolution

This specification supersedes earlier APK or legacy-game guidance that treats
any of the following as sufficient responsive acceptance:

- Portrait orientation as the single primary production layout.
- A `390x844` or `390x700` logical canvas as the required layout at every size.
- `ResizeObserver`, CSS breakpoint changes, Phaser `FIT`, or uniform canvas
  scaling without scene recomposition.
- A declaration that no desktop camera/composition is required because the
  portrait world already fits inside a desktop container.
- Legibility at one phone viewport as complete text-layout proof.

In particular, the historical compliance specs, plans, and reports under
`apps/advantage-games/measure/tracks/*-compliance-audit_*` remain valid evidence
of what was previously inspected. Their portrait/scaling acceptance rules are
not requirements for new or rebuilt APK cartridges.

The cancelled Babel Architect Phaser/R3F tracks remain mechanic and failure
evidence only. Their `390x844` fit decisions and responsive-shell repairs are not
an APK responsive contract.

The following existing requirements remain compatible and continue to apply:

- `390x844` remains a required compact reference viewport, not the universal
  layout model.
- Mobile-first means compact interaction is designed deliberately and tested
  early; it does not mean desktop receives an enlarged mobile composition.
- APK retains mobile performance budgets, one-canvas lifecycle, keyboard/touch
  support, and both-theme verification.
- Reading and Primary continue to own their application shells while APK owns
  cartridge composition inside the supplied game container.

## Problem statement

APK must support phones, tablets, laptops, and desktop displays without treating
responsive game design as uniform canvas scaling.

The following are not acceptable responsive strategies:

- Build a desktop scene and shrink the entire scene until it fits a phone.
- Build a portrait phone scene and center or enlarge it unchanged on desktop.
- Scale text below a readable minimum to preserve a fixed layout.
- Place HUD, prompts, or controls over active gameplay merely because the
  viewport is smaller.
- Stretch the world or its assets to fill a different aspect ratio.
- Change educational rules or result semantics because the viewport changes.

The same game may use different spatial compositions on compact and wide
surfaces. Gameplay identity, educational behavior, scoring rules, content order,
and completion results remain equivalent.

## Repository evidence

`apps/advantage-games` is the primary requirements corpus for this specification.
It contains raw game implementations that currently solve responsive behavior in
inconsistent ways:

- Some games use fixed virtual worlds and uniformly scale them.
- Some switch from tall viewport-height containers to `aspect-video` at a CSS
  breakpoint.
- Some use a `390x844` portrait virtual canvas at every display size.
- Some calculate camera scale only from container height.
- Many render HUDs, prompts, feedback, and controls as absolute overlays on the
  gameplay region.
- Text sizes are frequently hard-coded inside Konva or DOM overlays.
- Shared accessibility settings adjust text or touch sizes without guaranteeing
  that the enlarged elements still fit or avoid gameplay.

The current APK runtime observes its container and asks the Phaser instance to
refresh its scale. Phaser `FIT` keeps a canvas visible, but it does not recompose
the world, camera, HUD, text, or controls. Passing at desktop and `390x844` alone
therefore does not prove responsive fitness.

## Goals

1. Make compact portrait and wide landscape experiences intentional versions of
   one cartridge rather than scaled copies.
2. Keep gameplay-critical text readable in Thai and English.
3. Prevent HUD, prompts, feedback, and controls from obscuring active gameplay.
4. Give cartridge authors shared layout primitives instead of per-game viewport
   calculations and absolute-positioning conventions.
5. Preserve one gameplay implementation and one educational/result contract
   across layout profiles.
6. Make responsive correctness mechanically testable and visually inspectable.
7. Allow bespoke scene composition where a game's mechanic requires it without
   allowing every cartridge to invent unrelated responsive infrastructure.

## Non-goals

- Requiring identical world visibility or object coordinates across profiles.
- Requiring every game to use the same camera or HUD arrangement.
- Replacing Phaser scene layout with CSS layout.
- Supporting arbitrary unusably small containers.
- Introducing different learning rules, scoring, or completion contracts by
  device class.
- Adding a tablet-specific profile unless corpus evidence proves that compact and
  wide compositions cannot serve an identified game family.

## Terminology

### Container

The host-owned rectangle available to the cartridge after application chrome,
safe-area insets, and any host-reserved controls are applied.

### Layout profile

A named spatial composition selected from usable container geometry. APK starts
with two required profiles:

- `compact`: normally portrait or otherwise constrained surfaces.
- `wide`: normally landscape surfaces with sufficient horizontal room.

Profile selection is not synonymous with device type or input type.

### Input mode

The active interaction capabilities, independently resolved from layout:

- `touch`
- `pointer-keyboard`
- `hybrid`

A landscape tablet may use the `wide` profile with `touch` input. A narrow
desktop panel may use `compact` with `pointer-keyboard` input.

### Gameplay viewport

The rectangle reserved for the active game world. Persistent UI must not occupy
this rectangle unless the cartridge explicitly declares a non-interactive world
region as an overlay-safe zone.

### Reserved region

A rectangle allocated to persistent HUD, educational prompts, touch controls,
navigation, or another non-world surface.

### Transient region

A bounded area where temporary feedback may appear for a declared duration
without hiding a current target, player, answer choice, or hazard.

### Safe area

The usable region after browser/device insets and required host padding are
removed.

## Layout-profile resolution

### Required inputs

APK must resolve composition from:

- Usable container width and height.
- Container aspect ratio.
- Safe-area insets.
- Fullscreen state.
- Available input capabilities.
- Cartridge-declared minimum gameplay and reserved-region requirements.
- Accessibility text and touch-target scale.

Browser user-agent strings and CSS framework breakpoints must not be the source
of truth.

### Resolution rules

1. The resolver evaluates whether the required gameplay viewport and reserved
   regions fit at their minimum usable sizes.
2. `wide` is selected only when the wide composition can satisfy all minimums.
3. Otherwise, `compact` is selected if its minimums can be satisfied.
4. If neither profile fits, the runtime must show an accessible unsupported-size
   state with actionable guidance; it must not keep shrinking.
5. Layout profile and input mode are resolved independently.
6. Thresholds are shared APK policy values or cartridge-declared minimums, not
   scattered pixel checks inside scenes.
7. Profile changes use hysteresis or an equivalent stability rule so minor
   resizes do not cause repeated profile oscillation.

### Profile transitions

Resize, fullscreen, browser chrome changes, and device orientation may change the
profile during play. A transition must:

- Preserve educational progress, score, attempts, health, timers, and deterministic
  simulation state.
- Preserve the current target and answer state.
- Recalculate camera, world presentation, HUD, text, and controls atomically.
- Avoid creating another canvas, scene, listener set, or completion callback.
- Avoid moving an active pointer target underneath an in-progress gesture; the
  transition may safely cancel the gesture and require a fresh input.
- Pause simulation during a non-trivial reflow when necessary, then resume once.
- Emit a structured diagnostic containing old/new geometry and profile.

## Composition requirements

### Compact profile

The compact composition must:

- Prioritize the educational prompt, active target, player, hazards, and immediate
  feedback over secondary decoration and statistics.
- Reserve touch-control space when the input mode includes touch.
- Use portrait-appropriate camera framing, camera follow, or spatial reflow.
- Reduce or collapse nonessential HUD information rather than shrinking it.
- Keep persistent prompts outside the primary action corridor.
- Provide touch targets at or above the accepted accessible minimum.
- Allow content or instruction panels outside active play to scroll when necessary.
- Use camera movement, staged spaces, or reflowed stations when the entire wide
  world cannot remain simultaneously visible.

### Wide profile

The wide composition must:

- Use materially available horizontal space for gameplay, world visibility, or
  intentionally placed side regions.
- Avoid presenting a permanently centered portrait phone viewport unless the
  mechanic has an accepted, documented reason.
- Remove permanent touch controls when they are not needed.
- Support keyboard/pointer control hints without covering the playfield.
- Permit richer secondary HUD information only after gameplay and prompt regions
  satisfy their minimums.
- Use appropriate camera bounds and dead zones rather than merely enlarging the
  compact camera.

### World adaptation strategies

Each cartridge must declare at least one accepted strategy per profile:

- `reveal`: show more or less of a continuous world through camera framing.
- `follow`: retain world scale while changing camera follow/dead zones.
- `reflow`: reposition stations, lanes, puzzle nodes, or static interactive areas.
- `stage`: present a large world as navigable or sequential subregions.
- `panel`: move non-world information into dedicated side/top/bottom panels.
- `fixed-mechanic`: retain a fixed logical arena only when documented evidence
  shows changing it would alter the mechanic; unused space must still be composed
  intentionally.

Uniform non-proportional stretching is prohibited. Uniform scaling may be one
bounded operation inside a composition, but it cannot be the complete responsive
strategy and cannot violate text, target, or gameplay minimums.

## Standard APK regions and anchors

APK must define layout primitives for:

- `gameplay`: active world viewport.
- `primary-prompt`: current term, translation, sentence, or required action.
- `primary-status`: essential score/progress/health/timer information.
- `secondary-status`: optional combo, inventory, wave, or detailed statistics.
- `controls`: virtual movement/action controls.
- `feedback`: short correct/incorrect or event feedback.
- `navigation`: pause, mute, exit, and other host-safe controls.
- `modal`: instructions, pause, confirmation, and result surfaces outside live
  interaction.

Regions must expose rectangles, anchors, padding, z-order, and overlap policy.
Cartridges may subdivide them, but must not replace them with unrelated viewport
math when the shared primitive is sufficient.

The QC debug view must render every region and identify collisions, undersized
regions, clipped content, and undeclared overlays.

## HUD policy

1. Persistent HUD elements occupy reserved regions or declared overlay-safe world
   regions.
2. The active player, current target, answer choices, projectiles, hazards, and
   required navigation path must not pass behind opaque persistent HUD.
3. When space is constrained, secondary information collapses before primary
   information shrinks.
4. Icon-only compact HUD states require accessible names and unambiguous imagery.
5. HUD elements use semantic slots and theme-provided assets; layout geometry is
   theme-independent.
6. Health, timer, and progress displays must remain distinguishable without color
   alone.
7. HUD updates must not cause the gameplay viewport to jump or resize on every
   value change.

## Educational text and readability

### Text classes

APK must distinguish:

- `primary-prompt`: the current learning content or question.
- `answer-choice`: selectable vocabulary, sentence fragment, or translation.
- `feedback`: correctness or gameplay-event response.
- `hud-label`: short persistent status text.
- `instruction`: pre-game, pause, or contextual guidance.
- `result`: completion statistics and next actions.
- `world-label`: text spatially attached to an object.

Each class must have declared minimum font size, line-height, contrast, maximum
lines, wrapping policy, truncation policy, and placement priority.

### Required behavior

- Text must be measured using the actual production font and locale before final
  placement.
- Thai grapheme shaping, combining marks, line breaking, and vertical metrics
  must be tested; Latin-only approximations are insufficient.
- Primary prompts and answer choices must never use ellipsis or silent truncation.
- If content cannot fit, the composition must reflow, expand its reserved region,
  scroll outside live gameplay, paginate where educationally valid, or use an
  accepted alternate presentation.
- Font size must never fall below the class minimum to force content into a box.
- Gameplay-critical text must have sufficient contrast against every underlying
  theme state, normally through an opaque or controlled-transparency backing
  surface.
- Text must not be baked into theme images except for non-linguistic decorative
  marks explicitly accepted by the asset ontology.
- Enlarged accessibility text must trigger remeasurement and recomposition rather
  than overlap or clipping.
- Temporary feedback must use a transient region and may not conceal the next
  required action.
- World labels must avoid overlaps or reposition when the camera, object, or
  profile changes.

### Content fixtures

Every cartridge must define representative fixtures for:

- Short English vocabulary.
- Long English vocabulary and translations.
- Short Thai vocabulary or sentence content.
- Worst-case accepted Thai content.
- Repeated/duplicate terms where keys and labels could collide.
- Enlarged text settings.

Fixtures must come from or be bounded by real Reading/Primary content rules.

## Input and control composition

- Touch controls occupy reserved regions and must not cover prompts, targets, or
  status information.
- Pointer and keyboard modes must not retain unnecessary mobile controls.
- Hybrid mode may display touch controls while retaining keyboard/pointer input.
- Control placement must accommodate handedness where a game family requires it.
- Action controls must remain reachable without covering the active target under
  the user's hand.
- Pointer coordinates must be converted through the current gameplay viewport and
  camera, not the raw container alone.
- Profile transitions must update input mapping at the same boundary as visual
  reflow.
- Control hints must describe the active input mode, not a presumed device type.

## Camera and gameplay visibility

Each cartridge profile must declare:

- Logical world dimensions or world-generation policy.
- Gameplay viewport rectangle.
- Camera bounds.
- Follow target and dead zone when applicable.
- Minimum visible action radius around the player or current target.
- Required simultaneously visible objects or stations.
- Overlay-safe world regions, if any.
- Off-screen indicator policy.
- Object scale and collision policy.

The camera must not reveal invalid world space, hide a required answer or hazard,
or make interaction-dependent objects too small to identify. Off-screen indicators
must resolve against the gameplay viewport, not the full container including HUD
and controls.

## Theme and asset requirements

Chibi Quest and Riven Lands must implement equivalent responsive capabilities.
The asset ontology and physical contracts must record whether an asset is:

- World-scaled.
- Screen-space UI.
- Nine-slice or otherwise stretch-safe.
- Tileable.
- Croppable within declared focal bounds.
- Profile-specific only when the semantic capability genuinely differs.

Theme swaps must not change region geometry, text capacity, interaction bounds,
or gameplay visibility. Theme-specific decorative framing may consume only the
padding allocated by the shared contract.

Production validation must reject UI panels that cannot satisfy both profile
contracts, text-bearing images, unsafe focal crops, and decorative frames whose
fixed borders consume required text or gameplay space.

## Cartridge authoring contract

Every cartridge must declare:

1. Supported profiles and minimum usable geometry.
2. Composition strategy for each profile.
3. Required standard regions and any justified custom regions.
4. Input modes and touch-control reservation.
5. Camera/world policy for each profile.
6. Required simultaneous gameplay visibility.
7. Text classes and worst-case content fixtures.
8. Semantic UI and world asset bindings.
9. Accessibility scaling behavior.
10. Resize/orientation state-preservation behavior.

Cartridge-specific composition code belongs beside the cartridge. Reusable
layout, camera, HUD, prompt, control, measurement, and diagnostic behavior belongs
in APK shared packages once reuse is demonstrated by the corpus.

## Required shared APK implementation

The developer-platform work must provide typed, tested equivalents of:

- Layout input and layout-profile schemas.
- Geometry/profile resolver.
- Safe-area and reserved-region planner.
- Standard region and anchor definitions.
- Gameplay viewport and coordinate transforms.
- Camera composition helpers.
- Touch-control reservation and active-input-mode state.
- Locale-aware text measurement and fit diagnostics.
- HUD/prompt/feedback layout primitives.
- Profile-transition orchestration.
- Structured responsive diagnostics.
- QC safe-region/overlap debug overlays.
- Deterministic compact/wide test fixtures.

Exact public APIs are selected during the APK capability-contract track. They
must remain Phaser-compatible and must not couple cartridges to Reading or
Primary application internals.

## Verification matrix

Every cartridge must be verified in both themes with real input at:

| Class | Reference viewport | Required composition/input |
|---|---:|---|
| Narrow phone | `360x800` | compact + touch |
| Reference phone | `390x844` | compact + touch |
| Tablet portrait | `768x1024` | resolved profile + touch |
| Tablet landscape | `1024x768` | wide + touch or hybrid |
| Desktop | `1440x900` | wide + pointer-keyboard |
| Wide desktop | `1920x1080` | wide + pointer-keyboard |

The matrix must additionally cover:

- Browser resize from wide to compact and back during active play.
- Portrait/landscape orientation change during active play.
- Fullscreen entry and exit.
- Default and enlarged accessibility text/touch settings.
- Short and worst-case English and Thai fixtures.
- Touch, keyboard, and pointer paths declared by the cartridge.

Reference viewports are minimum common gates, not permission to special-case
only those dimensions. Automated fuzz/property tests must sample widths, heights,
and aspect ratios between supported minimum and maximum bounds.

## Automated acceptance gates

Tests must fail when:

- Neither supported profile fits but the runtime continues by shrinking.
- A primary prompt or answer choice clips, truncates, or falls below minimum size.
- Persistent UI intersects a protected gameplay region.
- Touch controls intersect prompts, HUD, or required targets.
- A wide viewport retains an unjustified phone-sized gameplay rectangle.
- A compact viewport uses a uniformly shrunken wide composition.
- A theme changes layout geometry or text capacity outside tolerance.
- Resize/profile change resets gameplay or emits duplicate completion.
- Pointer/world coordinate transforms use the wrong viewport after reflow.
- Safe-area insets place controls or text beneath device/browser obstruction.
- Thai glyphs clip or line-break outside the accepted text region.
- A cartridge bypasses shared layout policy with undeclared absolute overlays.

Automated visual geometry checks complement but do not replace real-browser
verification.

## Manual and browser acceptance

For every cartridge/profile/theme combination, verification must confirm:

- The display uses the available surface intentionally.
- The active mechanic is immediately understandable.
- Primary learning text is readable without zooming.
- HUD and controls do not hide gameplay.
- Long Thai and English content remains complete and legible.
- Touch controls are reachable and do not obscure the user's target.
- Desktop keyboard/pointer play does not look or behave like a centered phone app.
- Compact play does not look or behave like a miniature desktop canvas.
- World visibility and camera behavior support the mechanic.
- Resize, rotation, fullscreen, pause, restart, and theme swap preserve correct
  state and one-canvas lifecycle.

Screenshots alone are insufficient. Review must use real movement, selection,
feedback, completion, restart, and profile transitions.

## Integration with APK Measure work

### Corpus and developer-capability audit

The audit must record, for every game and scene:

- Current desktop and mobile composition.
- Fixed world and container assumptions.
- Camera behavior.
- HUD, prompt, feedback, and control placement.
- Text classes and content-length risks.
- Required simultaneously visible gameplay objects.
- Existing responsive failures and accepted mechanic intent.
- Candidate shared APK responsive capabilities.

### Cross-game asset ontology

The ontology must include compact/wide usage for UI, HUD, controls, indicators,
panels, portraits, backgrounds, and environment framing. Physical formats cannot
be accepted until both composition profiles are accounted for.

### Dual-theme asset production

Production batches must validate UI and presentation assets in both profiles with
real text fixtures and safe-region overlays. A visually attractive asset that
cannot support required text or geometry is not production-ready.

### Cartridge rewrite cohorts

Each child track must include profile declarations, responsive Red tests, text
fixtures, geometry gates, and the complete browser matrix. Desktop/mobile proof
must evaluate composition, not only canvas visibility.

### Reading and Primary hosts

Hosts provide a correctly sized container and host controls, but must not impose
a phone-shaped game surface on desktop or independently reimplement cartridge
layout. Host integration must forward container and safe-area changes to APK.

## Track-level definition of done

This specification is satisfied only when:

- APK exposes the shared responsive capabilities required above.
- Every restored cartridge declares and implements compact and wide compositions.
- Every restored cartridge passes geometry, text, state-preservation, input, and
  real-browser verification in both themes.
- Reading and Primary hosts allow APK to use appropriate mobile and desktop
  surfaces without copied layout logic.
- Worst-case accepted Thai and English content is readable and unobstructed.
- No production cartridge relies solely on Phaser `FIT`, uniform scaling, or CSS
  breakpoint container changes as its responsive strategy.
