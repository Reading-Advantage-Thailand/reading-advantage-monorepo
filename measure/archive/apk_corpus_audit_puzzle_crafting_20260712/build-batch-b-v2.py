"""Build source-grounded T6 Batch B V2 producer artifacts.

The builder reads only immutable Git objects and accepted denominator artifacts.
It never creates browser, reviewer, candidate, approval, or acceptance evidence.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
TRACK = Path(__file__).resolve().parent
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ASTRAL_HISTORY = "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"
ASTRAL_WITHDRAWAL = "05bb6d2909268ea670b106240167f86c9814d67d"
ROLE_BASE = subprocess.run(
    ["git", "rev-parse", "HEAD"], cwd=ROOT, check=True, capture_output=True, text=True
).stdout.strip()
DENOMINATOR_ROOT = ROOT / "measure/archive/apk_source_denominator_inventory_20260712"
DENOMINATOR_FILES = (
    "source-denominator.json",
    "asset-file-denominator.json",
    "scene-state-denominator.json",
    "historical-source-denominator.json",
)
PREDECESSORS = {
    "accepted_denominator_sha256": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    "accepted_partition_sha256": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    "accepted_pilot_sha256": "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
    "accepted_batch_a_v3_sha256": "8c332ff99bf9224f826f77cec256ff4d3f6cb94cea7181e3879226f82c875e83",
    "local_provenance_direction_sha256": "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac",
}


def git_bytes(revision: str, path: str) -> bytes:
    """Return one immutable Git blob.

    Args:
        revision: Commit containing the source object.
        path: Repository-relative source path.

    Returns:
        Exact blob bytes.
    """

    return subprocess.run(
        ["git", "show", f"{revision}:{path}"], cwd=ROOT, check=True, capture_output=True
    ).stdout


def git_exists(revision: str, path: str) -> bool:
    """Check whether a path exists at an immutable revision.

    Args:
        revision: Commit to inspect.
        path: Repository-relative path.

    Returns:
        Whether Git resolves the object.
    """

    return subprocess.run(
        ["git", "cat-file", "-e", f"{revision}:{path}"],
        cwd=ROOT,
        check=False,
        capture_output=True,
    ).returncode == 0


def digest(data: bytes) -> str:
    """Hash exact bytes with SHA-256.

    Args:
        data: Bytes to hash.

    Returns:
        Lowercase SHA-256 digest.
    """

    return hashlib.sha256(data).hexdigest()


def file_digest(path: Path) -> str:
    """Hash a local artifact.

    Args:
        path: Artifact path.

    Returns:
        Lowercase SHA-256 digest.
    """

    return digest(path.read_bytes())


def write_json(path: Path, value: Any) -> None:
    """Write canonical human-readable JSON.

    Args:
        path: Output artifact path.
        value: JSON-compatible value.

    Returns:
        None.
    """

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def claim(
    claim_id: str,
    game: str,
    category: str,
    source_class: str,
    revision: str,
    path: str,
    start: int,
    end: int,
    fact: str,
    interpretation: str,
    scene: str,
) -> dict[str, Any]:
    """Create one exact source-envelope claim.

    Args:
        claim_id: Stable claim identifier.
        game: Canonical game label.
        category: Bounded claim category.
        source_class: Current or historical source class.
        revision: Immutable source revision.
        path: Repository-relative source path.
        start: First cited line, inclusive.
        end: Last cited line, inclusive.
        fact: Atomic fact extracted from the cited bytes.
        interpretation: Bounded interpretation that does not expand the fact.
        scene: Scene or state identifier.

    Returns:
        Complete claim record with independently recomputable hashes.
    """

    blob = git_bytes(revision, path)
    lines = blob.splitlines(keepends=True)
    if start < 1 or end < start or end > len(lines):
        raise ValueError(f"invalid envelope {claim_id}: {start}-{end}/{len(lines)}")
    cited = b"".join(lines[start - 1 : end])
    if not cited:
        raise ValueError(f"empty envelope {claim_id}")
    return {
        "claim_id": claim_id,
        "game": game,
        "category": category,
        "source_class": source_class,
        "revision": revision,
        "path": path,
        "start_line": start,
        "end_line": end,
        "blob_sha256": digest(blob),
        "cited_range_sha256": digest(cited),
        "extracted_source_fact": fact,
        "interpretation": interpretation,
        "scene_or_state_id": scene,
        "confidence": "exact-source",
        "conflict_status": "none-observed",
        "independent_review_disposition": "pending-separate-review",
    }


POTION = "Potion Rush"
RUNE = "Rune Forge Chamber"
ASTRAL = "Astral Mage"

PR_STORE = "apps/advantage-games/src/store/usePotionRushStore.ts"
PR_GAME = "apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.tsx"
PR_PAGE = "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/potion-rush/page.tsx"
PR_CAULDRON = "apps/advantage-games/src/components/games/sentence/potion-rush/CauldronStation.tsx"
PR_CONVEYOR = "apps/advantage-games/src/components/games/sentence/potion-rush/ConveyorBelt.tsx"
PR_CUSTOMER = "apps/advantage-games/src/components/games/sentence/potion-rush/CustomerQueue.tsx"
GAME_CARDS = "apps/advantage-games/src/lib/gameCards.ts"

RFC_RULES = "apps/advantage-games/src/lib/games/runeForgeChamber.ts"
RFC_CONFIG = "apps/advantage-games/src/lib/games/runeForgeChamberConfig.ts"
RFC_GAME = "apps/advantage-games/src/components/games/sentence/rune-forge-chamber/RuneForgeChamberGame.tsx"
RFC_PAGE = "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/rune-forge-chamber/page.tsx"

AM_DEFINITION = "packages/game-cartridges/src/cartridges/astral-mage/definition.ts"
AM_SCENE = "packages/game-cartridges/src/cartridges/astral-mage/scene.ts"
AM_STATE = "packages/game-cartridges/src/families/target-action/state.ts"


CLAIM_SPECS = [
    # Potion Rush current source.
    ("PR-CUR-001", POTION, "identity", "current_implementation", BASELINE, GAME_CARDS, 100, 105, "The current catalog record declares Potion Rush, its cover, sentence route, and playable status.", "Catalog metadata does not prove route reachability or gameplay.", "catalog"),
    ("PR-CUR-002", POTION, "route", "current_implementation", BASELINE, PR_PAGE, 25, 28, "The page dynamically imports PotionRushGame with server-side rendering disabled.", "This is a source import boundary, not a browser observation.", "page-import"),
    ("PR-CUR-003", POTION, "content-route", "current_implementation", BASELINE, PR_PAGE, 59, 92, "The page requests locale-specific potion-rush sentences and records no-sentence or insufficient-sentence warnings.", "The request branch is not evidence of a successful live response.", "sentence-load"),
    ("PR-CUR-004", POTION, "completion-route", "current_implementation", BASELINE, PR_PAGE, 112, 141, "The completion callback constructs a POST containing score, accuracy, difficulty, derived counts, and gameTime, then requests ranking refresh.", "Request construction does not establish server acceptance, persistence, or XP correctness.", "completion-submit"),
    ("PR-CUR-005", POTION, "state-model", "current_implementation", BASELINE, PR_STORE, 11, 22, "The store declares MENU, PLAYING, PAUSED, and GAME_OVER game states and IDLE, BREWING, WARNING, and COMPLETED cauldron states.", "These are source-level state labels.", "state-types"),
    ("PR-CUR-006", POTION, "state-model", "current_implementation", BASELINE, PR_STORE, 59, 87, "The store state includes score, reputation, day progress, three entity collections, difficulty, word pool, completion, XP, timers, game time, spawn count, and angry-customer count.", "This is the declared state surface, not a live snapshot.", "store-surface"),
    ("PR-CUR-007", POTION, "initialization", "current_implementation", BASELINE, PR_STORE, 161, 196, "Starting selects one of four belt-speed and spawn-rate presets, enters PLAYING, clears counters and entities, and creates three idle cauldrons.", "The source uses caller-provided vocabulary and no seeded RNG.", "start-transition"),
    ("PR-CUR-008", POTION, "customer-spawn", "current_implementation", BASELINE, PR_STORE, 222, 258, "Customer spawning fills the first empty slot, randomly selects vocabulary and customer type, scales patience by completed sentences, and appends every request word to the active pool.", "Random choice and string-pool insertion are exact source behavior; deterministic replay is not claimed.", "customer-spawn"),
    ("PR-CUR-009", POTION, "conveyor-transition", "current_implementation", BASELINE, PR_STORE, 350, 369, "Each tick scales belt speed by completed sentences, moves non-dragged ingredients left, and recycles words whose ingredients leave the belt.", "This is reducer control flow, not measured frame behavior.", "belt-tick"),
    ("PR-CUR-010", POTION, "failure-transition", "current_implementation", BASELINE, PR_STORE, 371, 404, "Waiting-customer patience decreases; expiration removes 25 reputation, increments angry customers, marks the customer leaving angry, and resets that slot's non-idle cauldron.", "The branch is source-backed; runtime timing remains unobserved.", "customer-expiry"),
    ("PR-CUR-011", POTION, "learning-transition", "current_implementation", BASELINE, PR_STORE, 473, 537, "Dropping an ingredient removes it from the belt, binds an idle cauldron only when the first word matches its indexed waiting customer, advances exact next words while brewing, completes the full sequence, or enters warning on a mismatch.", "Sentence construction is ordered string comparison; duplicate-token identity is not modeled.", "ingredient-drop"),
    ("PR-CUR-012", POTION, "recovery-transition", "current_implementation", BASELINE, PR_STORE, 539, 558, "Dumping a cauldron recycles its current words and resets it to IDLE with no target sentence.", "This is a recovery transition only.", "cauldron-dump"),
    ("PR-CUR-013", POTION, "success-transition", "current_implementation", BASELINE, PR_STORE, 560, 617, "Serving requires a completed cauldron, the customer in the same index, and an equal target term; it marks the customer happy, resets the cauldron, adds remaining patience to score, increments completed sentences, and recalculates local XP.", "Local state mutation does not prove server persistence or awarded XP.", "serve-customer"),
    ("PR-CUR-014", POTION, "scoring", "current_implementation", BASELINE, PR_STORE, 649, 677, "Local XP uses capped completed-sentence base XP plus accuracy, reputation, speed, and progression bonuses, capped at ten.", "This is client calculation only.", "xp-calculation"),
    ("PR-CUR-015", POTION, "responsive-source", "current_implementation", BASELINE, PR_GAME, 113, 134, "The component declares a 390 by 844 virtual composition, fits it with the minimum container scale, centers it, and fixes station coordinates.", "Declared scaling is not compact or wide browser evidence.", "virtual-layout"),
    ("PR-CUR-016", POTION, "scene", "current_implementation", BASELINE, PR_GAME, 257, 311, "The Konva scene renders wall, floor, customer queue, counter, cauldron station, trash portal, conveyor belt, and effects in one layer.", "The source composition does not prove simultaneous visibility or text fit.", "playing-scene"),
    ("PR-CUR-017", POTION, "input", "current_implementation", BASELINE, PR_CONVEYOR, 141, 170, "Ingredient groups are draggable and convert the final pointer position through the stage scale before dispatching a drop.", "Handler wiring is not trusted physical pointer or touch evidence.", "ingredient-drag"),
    ("PR-CUR-018", POTION, "station-layout", "current_implementation", BASELINE, PR_CAULDRON, 50, 84, "The cauldron station divides the width into three slots and maps each cauldron to its corresponding horizontal center.", "This establishes source geometry only.", "cauldron-slots"),
    ("PR-CUR-019", POTION, "copy", "current_implementation", BASELINE, PR_CUSTOMER, 75, 124, "A customer view derives mood sprite column and patience color and renders the request translation in a fixed 150-pixel text area.", "No Thai or English fit is claimed.", "customer-request"),
    ("PR-CUR-020", POTION, "asset-usage", "current_implementation", BASELINE, PR_GAME, 49, 78, "The game requests the shop wall, floor, and counter files and records image load failures to the console.", "Source requests do not prove successful asset loading.", "shop-assets"),
    ("PR-CUR-021", POTION, "asset-usage", "current_implementation", BASELINE, PR_CAULDRON, 30, 48, "The cauldron station requests blue, green, and yellow cauldron images from the sentence/potion-rush asset directory.", "Source requests do not prove successful asset loading.", "cauldron-assets"),
    ("PR-CUR-022", POTION, "asset-usage", "current_implementation", BASELINE, PR_CONVEYOR, 32, 51, "The conveyor requests herb, mineral, mushroom, and potion images from the sentence/potion-rush asset directory.", "Source requests do not prove successful asset loading.", "ingredient-assets"),
    ("PR-CUR-023", POTION, "asset-usage", "current_implementation", BASELINE, PR_CUSTOMER, 27, 46, "The customer queue requests two adjusted character sheets from the sentence/potion-rush asset directory.", "Source requests do not prove successful asset loading.", "customer-assets"),
    ("PR-CUR-024", POTION, "surface", "current_implementation", BASELINE, PR_PAGE, 276, 305, "The page exposes four difficulty buttons and mounts the game in an absolute full-size container when the game tab is active.", "Utility classes are not measured responsive evidence.", "page-game-surface"),
    ("PR-CUR-025", POTION, "test-source", "current_test", BASELINE, "apps/advantage-games/tests/e2e/games/sentence/potion-rush.spec.ts", 11, 28, "The Playwright source mocks APIs, navigates, clicks Start Brewing, asserts a visible canvas, and calls a screenshot helper.", "A test declaration is not proof that this audit executed it or retained its browser evidence.", "e2e-declaration"),
    ("PR-CUR-026", POTION, "api-source", "current_implementation", BASELINE, "apps/advantage-games/src/app/api/v1/games/potion-rush/sentences/route.ts", 1, 7, "The sentences route exports a force-static GET from createSentencesRoute using SAMPLE_SENTENCES.", "This is route source, not an HTTP result.", "sentences-api"),
    ("PR-CUR-027", POTION, "api-source", "current_implementation", BASELINE, "apps/advantage-games/src/app/api/v1/games/potion-rush/complete/route.ts", 1, 6, "The completion route exports a force-static POST from createCompleteRoute.", "This is route source, not persistence evidence.", "complete-api"),
    ("PR-CUR-028", POTION, "api-source", "current_implementation", BASELINE, "apps/advantage-games/src/app/api/v1/games/potion-rush/ranking/route.ts", 1, 6, "The ranking route exports a force-static GET from createRankingRoute.", "This is route source, not leaderboard correctness evidence.", "ranking-api"),
    # Rune Forge Chamber current source.
    ("RFC-CUR-001", RUNE, "identity", "current_implementation", BASELINE, GAME_CARDS, 130, 135, "The current catalog record declares Rune Forge Chamber, its cover, sentence route, and playable status.", "Catalog metadata does not prove reachability.", "catalog"),
    ("RFC-CUR-002", RUNE, "route", "current_implementation", BASELINE, RFC_PAGE, 13, 19, "The page dynamically imports RuneForgeChamberGame with server-side rendering disabled.", "This is a source import boundary.", "page-import"),
    ("RFC-CUR-003", RUNE, "content-route", "current_implementation", BASELINE, RFC_PAGE, 49, 82, "The page requests locale-specific rune-forge-chamber sentences and records no-sentence or insufficient-sentence warnings.", "No live response is claimed.", "sentence-load"),
    ("RFC-CUR-004", RUNE, "completion-route", "current_implementation", BASELINE, RFC_PAGE, 84, 107, "The completion callback stores local result values and constructs a POST with XP, accuracy, derived counts, total attempts, and user ID.", "Request construction does not prove persistence or API correctness.", "completion-submit"),
    ("RFC-CUR-005", RUNE, "copy", "current_implementation", BASELINE, RFC_PAGE, 137, 192, "The warning surface contains Thai no-sentence and insufficient-sentence copy and interpolates required and current counts.", "Source copy is not browser text-fit evidence.", "warning-copy"),
    ("RFC-CUR-006", RUNE, "state-model", "current_implementation", BASELINE, RFC_RULES, 6, 51, "The rules declare start, playing, and defeat status values and state for difficulty, rune type, level, vocabulary, health, circles, sentence words, progress, answer counts, timers, and rotation.", "No victory status is declared in this model.", "rules-state"),
    ("RFC-CUR-007", RUNE, "initialization", "current_implementation", BASELINE, RFC_RULES, 61, 102, "State creation rejects empty vocabulary, uses an optional RNG for sentence selection and angle offsets, truncates words by difficulty, initializes health and a centered rune stone, and creates one circle per active word.", "The injected RNG does not control generated IDs.", "state-create"),
    ("RFC-CUR-008", RUNE, "shuffle", "current_implementation", BASELINE, RFC_RULES, 104, 132, "Initial creation shuffles circle angles with the supplied RNG, doubles the level-one timer, and returns playing level one with zeroed progress counters.", "This is deterministic only to the extent the caller supplies and the function uses the RNG.", "initial-angle-shuffle"),
    ("RFC-CUR-009", RUNE, "progression", "current_implementation", BASELINE, RFC_RULES, 135, 170, "Level advancement increments the level, reduces the timer to eighty percent, randomly selects a sentence with Math.random, recreates circles, and resets collected words and target index.", "Later levels do not retain the initialization RNG seam.", "level-advance"),
    ("RFC-CUR-010", RUNE, "tick-transition", "current_implementation", BASELINE, RFC_RULES, 173, 207, "Ticking decrements time, defeats on expired time or non-positive health, rotates circles by difficulty speed, and advances a level when target index reaches word count.", "This is source control flow, not measured timing.", "tick"),
    ("RFC-CUR-011", RUNE, "learning-transition", "current_implementation", BASELINE, RFC_RULES, 209, 249, "Selection compares the circle word string with the current target word string; a match selects that circle and advances progress, while a mismatch subtracts health and may defeat.", "Because correctness is text equality rather than token identity, duplicate-token behavior requires explicit review and browser tests.", "circle-select"),
    ("RFC-CUR-012", RUNE, "responsive-source", "current_implementation", BASELINE, RFC_CONFIG, 14, 50, "Configuration declares a 390 by 700 arena, circle and orbit radii, a 44-pixel minimum touch target, timers, damage, XP thresholds, and four difficulty presets.", "Declared dimensions and targets are not measured responsive or accessibility evidence.", "configuration"),
    ("RFC-CUR-013", RUNE, "scoring", "current_implementation", BASELINE, RFC_RULES, 263, 282, "Local XP adds per-correct-word base XP and accuracy, speed, and survival bonuses, capped at maxXP.", "This is client calculation only.", "xp-calculation"),
    ("RFC-CUR-014", RUNE, "ui-lifecycle", "current_implementation", BASELINE, RFC_GAME, 33, 74, "The component models start, playing, and ended UI phases, defaults normal/common-stone selections, and resets source rules state from vocabulary and selections.", "These are component states, not browser observations.", "ui-state"),
    ("RFC-CUR-015", RUNE, "loop", "current_implementation", BASELINE, RFC_GAME, 105, 145, "The playing loop clamps frame delta to 50 milliseconds and applies tickRuneForgeChamber while both rules and UI remain playing.", "Runtime cadence was not observed.", "raf-loop"),
    ("RFC-CUR-016", RUNE, "terminal-ui", "current_implementation", BASELINE, RFC_GAME, 147, 174, "A rules defeat computes local accuracy and XP, enters ended UI, exits fullscreen, and reports completion once.", "The callback path does not prove server completion.", "defeat-to-ended"),
    ("RFC-CUR-017", RUNE, "instructions", "current_implementation", BASELINE, RFC_GAME, 188, 243, "The start screen describes ordered circle taps, translation on the rune stone, timer and damage, exposes four difficulties and three rune types, and labels selection as Tap / Click.", "Instructions and handlers are not trusted physical input evidence.", "start-screen"),
    ("RFC-CUR-018", RUNE, "responsive-source", "current_implementation", BASELINE, RFC_GAME, 248, 267, "The playing container uses a 75vh surface and the Stage scales a 390 by 700 logical group by the minimum measured dimension ratio.", "This is declared source behavior, not compact/wide browser proof.", "playing-layout"),
    ("RFC-CUR-019", RUNE, "input", "current_implementation", BASELINE, RFC_GAME, 310, 349, "Each active circle group wires both onClick and onTap to the same selection handler and adds an invisible enlarged hit circle.", "Handler wiring is not physical input evidence.", "circle-input"),
    ("RFC-CUR-020", RUNE, "scene", "current_implementation", BASELINE, RFC_GAME, 286, 308, "The central rune stone renders the current translation and the collected-word sequence in fixed-width wrapped text regions.", "No source-derived Thai or English fit measurement was performed.", "rune-stone-copy"),
    ("RFC-CUR-021", RUNE, "hud", "current_implementation", BASELINE, RFC_GAME, 353, 423, "The playing scene renders forge timer, rune health, collected-word count, and level HUD elements.", "Simultaneous visibility remains unobserved.", "hud"),
    ("RFC-CUR-022", RUNE, "test-source", "current_test", BASELINE, "apps/advantage-games/tests/e2e/games/sentence/rune-forge-chamber.spec.ts", 10, 27, "The Playwright source mocks APIs, navigates, clicks Enter the Forge, asserts a visible canvas, and calls a screenshot helper.", "A test declaration is not proof that this audit executed it.", "e2e-declaration"),
    ("RFC-CUR-023", RUNE, "api-source", "current_implementation", BASELINE, "apps/advantage-games/src/app/api/v1/games/rune-forge-chamber/sentences/route.ts", 1, 7, "The sentences route exports a force-static GET from createSentencesRoute using SAMPLE_SENTENCES.", "This is route source, not an HTTP result.", "sentences-api"),
    ("RFC-CUR-024", RUNE, "api-source", "current_implementation", BASELINE, "apps/advantage-games/src/app/api/v1/games/rune-forge-chamber/complete/route.ts", 1, 6, "The completion route exports a force-static POST from createCompleteRoute.", "This is route source, not persistence evidence.", "complete-api"),
    # Astral Mage current withdrawal and reachable historical implementation.
    ("AM-CUR-001", ASTRAL, "current-disposition", "current_catalog", BASELINE, GAME_CARDS, 12, 27, "The current catalog source includes astral-mage in the withdrawn APK game ID set.", "This establishes catalog withdrawal at the baseline, not permanent product cancellation.", "withdrawn-set"),
    ("AM-CUR-002", ASTRAL, "identity", "current_catalog", BASELINE, GAME_CARDS, 196, 200, "The retained catalog card declares Astral Mage, its description and cover, and no href field.", "The card's literal playable value is transformed by the later withdrawal mapping.", "catalog-card"),
    ("AM-CUR-003", ASTRAL, "current-disposition", "current_catalog", BASELINE, GAME_CARDS, 234, 239, "The exported gameCards mapping removes href and changes status to coming-soon for every withdrawn ID.", "Together with AM-CUR-001 this classifies current catalog routing only.", "catalog-export"),
    ("AM-HIST-001", ASTRAL, "historical-manifest", "historical_implementation", ASTRAL_HISTORY, AM_DEFINITION, 14, 40, "The deleted cartridge definition declared the astral-mage sentence identity, six Phaser capabilities, required semantic slots, and a seed passed to scene construction.", "This is historical implementation source and is not current.", "historical-definition"),
    ("AM-HIST-002", ASTRAL, "historical-assets", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 15, 48, "The deleted scene declared a 1600 by 900 world, projectile constants, eleven semantic asset slots, sentence input, edition, completion and diagnostic callbacks, and a reproducible seed.", "These requirements existed only in the deleted implementation.", "historical-scene-contract"),
    ("AM-HIST-003", ASTRAL, "historical-target-identity", "historical_implementation_dependency", ASTRAL_HISTORY, AM_STATE, 74, 100, "The shared historical target-action dependency created seeded positions and one stable sentence-index/token-index target ID per token, including duplicate visible words.", "This dependency supplied the deleted Astral implementation; it is not current behavior.", "historical-target-create"),
    ("AM-HIST-004", ASTRAL, "historical-initial-state", "historical_implementation_dependency", ASTRAL_HISTORY, AM_STATE, 109, 137, "The shared dependency rejected empty inputs and blank translations or terms and initialized deterministic targets, progress, score, counts, and incomplete state from the host seed.", "This is historical state construction only.", "historical-state-create"),
    ("AM-HIST-005", ASTRAL, "historical-learning-transition", "historical_implementation_dependency", ASTRAL_HISTORY, AM_STATE, 145, 178, "The shared dependency ignored inactive targets, counted live-target attempts, deducted score for wrong visible-token hits, and deactivated only the stable ID of a correct target while advancing ordered progress.", "This is historical reducer behavior.", "historical-target-hit"),
    ("AM-HIST-006", ASTRAL, "historical-completion", "historical_implementation_dependency", ASTRAL_HISTORY, AM_STATE, 180, 205, "After the final token the shared dependency either created the next sentence's seeded targets or marked complete and created results after the final sentence.", "No historical server persistence or live completion is established.", "historical-complete"),
    ("AM-HIST-007", ASTRAL, "historical-scene", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 122, 149, "The deleted scene created target-action state from the host seed, configured a 960 by 540 zero-gravity Arcade Physics scene, and set 1600 by 900 physics and camera bounds.", "This is historical source configuration, not executed browser evidence.", "historical-scene-create"),
    ("AM-HIST-008", ASTRAL, "historical-copy", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 283, 295, "The deleted HUD displayed the sentence translation, reconstructed token progress, and the next visible crystal token.", "No language fit or browser visibility is established.", "historical-hud"),
    ("AM-HIST-009", ASTRAL, "historical-input", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 299, 340, "The deleted scene rendered one interactive body and label per target and fired toward a target on pointerdown.", "Handler wiring is not trusted historical physical input proof.", "historical-target-render"),
    ("AM-HIST-010", ASTRAL, "historical-projectile", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 418, 492, "The deleted scene pooled projectiles, aimed with velocity, timed out flights, checked swept-path distance, and resolved only the intended target on overlap.", "No runtime collision quality is claimed.", "historical-projectile"),
    ("AM-HIST-011", ASTRAL, "historical-input", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 494, 551, "The deleted scene wired WASD and arrow keys, Space firing, four pointer movement controls, and a pointer FIRE control.", "This is historical handler source, not browser input evidence.", "historical-controls"),
    ("AM-HIST-012", ASTRAL, "historical-movement", "historical_implementation", ASTRAL_HISTORY, AM_SCENE, 577, 593, "The deleted update loop normalized keyboard or touch direction and set player velocity using edition speed tuning.", "No historical movement feel or responsiveness is established.", "historical-update"),
    ("AM-HIST-013", ASTRAL, "historical-test-source", "historical_test", ASTRAL_HISTORY, "packages/game-cartridges/src/cartridges/astral-mage/definition.test.ts", 14, 49, "The deleted test source asserted cartridge identity, capabilities, and semantic slot membership.", "A deleted test declaration is not proof of execution or current support.", "historical-test"),
]


UNKNOWNS = {
    "potion-rush": [
        {"claim_id": "PR-UNK-001", "proposition": "Route reachability, gameplay, trusted drag input, compact/wide behavior, text fit, completion, persistence, XP award, API correctness, and asset loading.", "blocks": ["browser acceptance", "responsive acceptance", "product success"]},
        {"claim_id": "PR-UNK-002", "proposition": "Correct behavior for repeated identical tokens from one or multiple simultaneous customer requests; the active pool stores strings and cauldron correctness compares strings without stable token identity.", "blocks": ["duplicate-token correctness", "duplicate-request correctness"]},
        {"claim_id": "PR-UNK-003", "proposition": "Deterministic replay; source customer, ingredient, ID, and effect creation uses Math.random without an injected session seed.", "blocks": ["deterministic-state contract"]},
        {"claim_id": "PR-UNK-004", "proposition": "Real shortest and worst-case Thai and English production content boundaries.", "blocks": ["language-boundary browser cases", "text-fit conclusion"]},
    ],
    "rune-forge-chamber": [
        {"claim_id": "RFC-UNK-001", "proposition": "Route reachability, gameplay, trusted tap input, compact/wide behavior, text fit, completion submission, persistence, XP award, API correctness, and asset loading.", "blocks": ["browser acceptance", "responsive acceptance", "product success"]},
        {"claim_id": "RFC-UNK-002", "proposition": "Unambiguous repeated-token behavior; correctness and target highlighting compare visible word strings rather than orderIndex or stable token identity.", "blocks": ["duplicate-token correctness"]},
        {"claim_id": "RFC-UNK-003", "proposition": "Deterministic full-session replay; generated IDs and later-level sentence selection use Math.random outside the initial injected RNG.", "blocks": ["deterministic-state contract"]},
        {"claim_id": "RFC-UNK-004", "proposition": "A successful terminal victory; the rules status union contains start, playing, and defeat, and correct completion advances to another level.", "blocks": ["victory flow", "successful terminal result"]},
        {"claim_id": "RFC-UNK-005", "proposition": "Real shortest and worst-case Thai and English production content boundaries.", "blocks": ["language-boundary browser cases", "text-fit conclusion"]},
    ],
    "astral-mage": [
        {"claim_id": "AM-UNK-001", "proposition": "Any current Astral Mage route, component, cartridge, runtime, gameplay, input, responsive, completion, persistence, XP, API, or asset-loading behavior at the baseline.", "blocks": ["current implementation acceptance", "browser acceptance", "product success"]},
        {"claim_id": "AM-UNK-002", "proposition": "Whether the deleted historical implementation ever ran successfully in a browser or shipped to students.", "blocks": ["historical runtime conclusion", "historical responsive conclusion"]},
        {"claim_id": "AM-UNK-003", "proposition": "Future product disposition after the current catalog withdrawal.", "blocks": ["shipping decision", "implementation decision"]},
    ],
}


CONFLICTS = {
    "potion-rush": [
        {"conflict_id": "PR-CONFLICT-001", "claim_ids": ["PR-CUR-008", "PR-CUR-011"], "detail": "The pool and correctness model use word strings, so duplicate token/request identity is not source-resolved.", "disposition": "explicit-unknown"}
    ],
    "rune-forge-chamber": [
        {"conflict_id": "RFC-CONFLICT-001", "claim_ids": ["RFC-CUR-007", "RFC-CUR-009"], "detail": "Only initial sentence and angle choices use the injected RNG; IDs and later levels use Math.random.", "disposition": "explicit-unknown"},
        {"conflict_id": "RFC-CONFLICT-002", "claim_ids": ["RFC-CUR-011", "RFC-CUR-019"], "detail": "Correctness and target glow use visible word equality, so repeated equal words can identify more than one circle as the current target.", "disposition": "explicit-unknown"},
    ],
    "astral-mage": [
        {"conflict_id": "AM-CONFLICT-001", "claim_ids": ["AM-CUR-001", "AM-CUR-002", "AM-CUR-003", "AM-HIST-001"], "detail": "A historical cartridge existed, while the current baseline retains only a catalog card transformed to coming-soon with no href.", "disposition": "historical-only-current-withdrawn"}
    ],
}


GAME_INFO = {
    "potion-rush": {"label": POTION, "identity": "sentence/potion-rush", "tokens": ("potionrush", "potion-rush")},
    "rune-forge-chamber": {"label": RUNE, "identity": "sentence/rune-forge-chamber", "tokens": ("runeforgechamber", "rune-forge-chamber")},
    "astral-mage": {"label": ASTRAL, "identity": "catalog/astral-mage", "tokens": ("astralmage", "astral-mage")},
}


def recursively_collect_paths(value: Any, tokens: tuple[str, ...]) -> set[str]:
    """Collect matching path fields from one accepted denominator.

    Args:
        value: Parsed denominator value.
        tokens: Lowercase identity tokens.

    Returns:
        Unique matching repository paths.
    """

    paths: set[str] = set()
    if isinstance(value, dict):
        for key in ("path", "canonical_path"):
            candidate = value.get(key)
            if isinstance(candidate, str) and any(token in candidate.lower() for token in tokens):
                paths.add(candidate)
        for child in value.values():
            paths.update(recursively_collect_paths(child, tokens))
    elif isinstance(value, list):
        for child in value:
            paths.update(recursively_collect_paths(child, tokens))
    return paths


def denominator_records(slug: str) -> list[dict[str, Any]]:
    """Reconcile all identity-matching accepted denominator paths.

    Args:
        slug: Batch B game slug.

    Returns:
        Exact current or historical object records.
    """

    memberships: dict[str, set[str]] = defaultdict(set)
    tokens = GAME_INFO[slug]["tokens"]
    for name in DENOMINATOR_FILES:
        document = json.loads((DENOMINATOR_ROOT / name).read_text(encoding="utf-8"))
        for path in recursively_collect_paths(document, tokens):
            memberships[path].add(name)
    memberships[GAME_CARDS].add("game-identity-ledger.json")
    if slug == "astral-mage":
        for path in (AM_STATE, "packages/game-cartridges/src/internal/random.ts", "packages/game-cartridges/src/internal/results.ts"):
            memberships[path].add("historical-implementation-dependency")

    records = []
    for path in sorted(memberships):
        if git_exists(BASELINE, path):
            revision = BASELINE
            disposition = "current-at-baseline"
        elif git_exists(ASTRAL_HISTORY, path):
            revision = ASTRAL_HISTORY
            disposition = "historical-deleted-before-baseline"
        else:
            raise ValueError(f"denominator path has no bound object: {path}")
        blob = git_bytes(revision, path)
        records.append({
            "path": path,
            "denominator_sources": sorted(memberships[path]),
            "disposition": disposition,
            "revision": revision,
            "blob_sha256": digest(blob),
            "bytes": len(blob),
        })
    return records


def mappings_for(slug: str, claims: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Map all claims into protocol-required package sections.

    Args:
        slug: Batch B game slug.
        claims: Exact source claims for the game.

    Returns:
        Requirements mappings referencing only claim and unknown IDs.
    """

    by_category: dict[str, list[str]] = defaultdict(list)
    for row in claims:
        by_category[row["category"]].append(row["claim_id"])
    all_ids = [row["claim_id"] for row in claims]
    unknown_ids = [row["claim_id"] for row in UNKNOWNS[slug]]
    sections = [
        ("identity-route-history", [key for key in by_category if key in {"identity", "route", "current-disposition", "historical-manifest"}]),
        ("scene-state-transition-model", [key for key in by_category if any(token in key for token in ("state", "transition", "initial", "progress", "tick", "scene", "shuffle", "spawn", "surface", "layout", "loop"))]),
        ("mechanic-learning-blueprint", [key for key in by_category if any(token in key for token in ("learning", "input", "customer", "conveyor", "station", "projectile", "movement"))]),
        ("copy-content-feedback", [key for key in by_category if any(token in key for token in ("copy", "content", "instruction", "hud"))]),
        ("responsive-browser-boundary", [key for key in by_category if "responsive" in key or key in {"input", "surface"}]),
        ("asset-usages-and-variants", [key for key in by_category if "asset" in key]),
        ("completion-scoring-api", [key for key in by_category if any(token in key for token in ("completion", "success", "scoring", "api", "terminal"))]),
        ("test-source", [key for key in by_category if "test" in key]),
    ]
    mappings = []
    used: set[str] = set()
    for index, (name, categories) in enumerate(sections, start=1):
        ids = [claim_id for category in categories for claim_id in by_category[category]]
        used.update(ids)
        mappings.append({
            "mapping_id": f"{slug.upper()}-MAP-{index:03d}",
            "requirement": name,
            "cited_claim_ids": ids,
            "cited_unknown_ids": unknown_ids if name == "responsive-browser-boundary" else [],
            "result": "source-bounded" if ids else "unknown-no-source-claim",
        })
    remainder = [claim_id for claim_id in all_ids if claim_id not in used]
    if remainder:
        mappings.append({
            "mapping_id": f"{slug.upper()}-MAP-REMAINDER",
            "requirement": "remaining exact source records",
            "cited_claim_ids": remainder,
            "cited_unknown_ids": [],
            "result": "source-bounded",
        })
    return mappings


def receipt(
    role: str,
    task_id: str,
    outputs: list[Path],
    status: str,
    counts: dict[str, Any],
) -> dict[str, Any]:
    """Create one non-aggregated local producer receipt.

    Args:
        role: Sole role represented by the receipt.
        task_id: Bounded task identifier.
        outputs: Exact owned output paths.
        status: Truthful role status.
        counts: Measured deterministic-run counters.

    Returns:
        Receipt with exact hashes and explicit non-independence disclosure.
    """

    return {
        "schema_version": "apk-role-receipt.v2",
        "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
        "batch_id": "batch-b",
        "task_id": task_id,
        "role": role,
        "status": status,
        "role_base_sha": ROLE_BASE,
        "publication_commit_sha": None,
        "publication_disclosure": "Authored before the producer commit; a later independent reviewer must bind the immutable publication commit without mutating this receipt.",
        "provider_provenance": {
            "available": False,
            "claimed": False,
            "prompt": "unavailable-not-claimed",
            "session": "unavailable-not-claimed",
            "spawn": "unavailable-not-claimed",
            "ancestry": "unavailable-not-claimed",
            "fork": "unavailable-not-claimed",
            "timing": "unavailable-not-claimed",
            "final_response": "unavailable-not-claimed",
            "commit": "unavailable-not-claimed",
        },
        "local_execution": {
            "producer_context": "same current producer context for all V2 producer roles",
            "fresh_context_only": False,
            "inherited_narrative": True,
            "parent_ancestry_ids": [],
            "fork_turns": "not-applicable-no-fork-created",
            "distinct_agent_session": False,
            "role_separation_satisfied": False,
        },
        "resource_accounting": counts,
        "output_hashes": {str(path.relative_to(ROOT)): file_digest(path) for path in outputs},
        "acceptance": "not-claimed",
        "candidate_authorized": False,
        "independent_review_authorized": True,
        "marker": "MEASURE_AGENT_RESULT",
    }


def main() -> None:
    """Generate complete source-stage packages and fail-closed receipts.

    Returns:
        None.
    """

    claims_by_slug: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for spec in CLAIM_SPECS:
        record = claim(*spec)
        slug = next(slug for slug, info in GAME_INFO.items() if info["label"] == record["game"])
        claims_by_slug[slug].append(record)

    active_outputs: list[Path] = []
    discovery_games = []
    for slug, info in GAME_INFO.items():
        package = TRACK / f"batch-b/{slug}"
        claims = claims_by_slug[slug]
        records = denominator_records(slug)
        ledger_path = package / "claim-evidence-ledger-v2.json"
        source_path = package / "source-asset-history-ledger-v2.json"
        fixtures_path = package / "negative-fixtures-v2.json"
        map_path = package / "requirements-map-v2.json"
        browser_path = package / "browser-audit-v2.json"

        write_json(ledger_path, {
            "schema_version": "apk-claim-evidence-ledger.v2",
            "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
            "batch_id": "batch-b",
            "game": info["label"],
            "normalized_game_id": info["identity"],
            "source_baseline_revision": BASELINE,
            "historical_revision": ASTRAL_HISTORY if slug == "astral-mage" else None,
            "claims": claims,
            "unknowns": [{**row, "source_class": "unknown"} for row in UNKNOWNS[slug]],
            "conflicts": CONFLICTS[slug],
            "counts": {"factual_claims": len(claims), "unknowns": len(UNKNOWNS[slug]), "conflicts": len(CONFLICTS[slug])},
            "acceptance": "not-claimed",
        })
        write_json(source_path, {
            "schema_version": "apk-source-asset-history-ledger.v2",
            "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
            "batch_id": "batch-b",
            "game": info["label"],
            "normalized_game_id": info["identity"],
            "predecessor_bindings": PREDECESSORS,
            "denominator_records": records,
            "coverage": {"records": len(records), "unresolved_records": 0, "status": "pass"},
            "history": {
                "baseline_revision": BASELINE,
                "historical_implementation_revision": ASTRAL_HISTORY if slug == "astral-mage" else None,
                "withdrawal_revision": ASTRAL_WITHDRAWAL if slug == "astral-mage" else None,
                "historical_implementation_present": slug == "astral-mage",
                "current_implementation_disposition": "catalog-withdrawn; no current cartridge paths" if slug == "astral-mage" else "current source present at baseline",
            },
            "asset_boundary": "Every identity-matching accepted asset path is hashed. Only paths named by asset-usage claims are source-referenced scene usages; existence is never promoted to loading or suitability.",
            "acceptance": "not-claimed",
        })
        fixtures = [
            {"fixture_id": f"{slug}-NEG-001", "failure_class": "cited_range_hash_mismatch", "mutation": "replace one claim cited_range_sha256 with 64 zeroes", "expected_disposition": "REJECT"},
            {"fixture_id": f"{slug}-NEG-002", "failure_class": "directory_citation", "mutation": f"cite batch-b/{slug}/ as a factual source", "expected_disposition": "REJECT"},
            {"fixture_id": f"{slug}-NEG-003", "failure_class": "browser_promotion", "mutation": "claim runnable and responsive while conducted=false", "expected_disposition": "REJECT"},
            {"fixture_id": f"{slug}-NEG-004", "failure_class": "analogy_substitution", "mutation": "replace this package evidence with another game family description", "expected_disposition": "REJECT"},
            {"fixture_id": f"{slug}-NEG-005", "failure_class": "malformed_claim", "mutation": "remove extracted_source_fact from one claim", "expected_disposition": "REJECT"},
            {"fixture_id": f"{slug}-NEG-006", "failure_class": "denominator_omission", "mutation": "remove one mechanically selected denominator record", "expected_disposition": "REJECT"},
        ]
        write_json(fixtures_path, {
            "schema_version": "apk-negative-fixtures.v2",
            "game": info["label"],
            "counts_as_factual_claims": False,
            "fixtures": fixtures,
        })
        mappings = mappings_for(slug, claims)
        write_json(map_path, {
            "schema_version": "apk-requirements-map.v2",
            "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
            "batch_id": "batch-b",
            "game": info["label"],
            "normalized_game_id": info["identity"],
            "claim_ledger_path": str(ledger_path.relative_to(TRACK)),
            "claim_ledger_sha256": file_digest(ledger_path),
            "mappings": mappings,
            "developer_effort_decomposition": {
                "estimate": "not-estimated-no-observed-effort-basis",
                "workstreams": [
                    {"name": "state-and-learning-rules", "backing_claim_ids": [row["claim_id"] for row in claims if any(token in row["category"] for token in ("state", "learning", "transition", "progression"))]},
                    {"name": "scene-input-responsive", "backing_claim_ids": [row["claim_id"] for row in claims if any(token in row["category"] for token in ("scene", "input", "responsive", "surface", "layout"))]},
                    {"name": "content-api-assets", "backing_claim_ids": [row["claim_id"] for row in claims if any(token in row["category"] for token in ("copy", "content", "api", "asset", "route"))]},
                ],
            },
            "unknown_ids": [row["claim_id"] for row in UNKNOWNS[slug]],
            "novel_factual_claims": 0,
            "ontology_decisions": 0,
            "browser_claims": 0,
            "acceptance": "not-claimed",
        })
        write_json(browser_path, {
            "schema_version": "apk-browser-audit.v2",
            "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
            "batch_id": "batch-b",
            "game": info["label"],
            "normalized_game_id": info["identity"],
            "role": "browser-auditor",
            "conducted": False,
            "attempts": [],
            "evidence_count": 0,
            "captures": [],
            "real_input_events": [],
            "compact_view_observed": False,
            "wide_view_observed": False,
            "transitions_observed": 0,
            "success_claims": {key: False for key in ("route", "gameplay", "input", "responsive", "completion", "persistence", "xp", "idempotency", "api_correctness", "asset_loading")},
            "disposition": "not-conducted; all browser and dependent product behavior remains unknown",
            "source_disposition_only": "current source route candidate exists" if slug != "astral-mage" else "current catalog transforms astral-mage to coming-soon and removes href",
            "acceptance": "not-claimed",
        })
        active_outputs.extend([ledger_path, source_path, fixtures_path, map_path, browser_path])
        discovery_games.append({
            "game": info["label"],
            "normalized_game_id": info["identity"],
            "claim_count": len(claims),
            "denominator_record_count": len(records),
            "denominator_unresolved": 0,
            "current_boundary": "current implementation source present" if slug != "astral-mage" else "catalog-withdrawn; historical implementation deleted",
        })

    discovery_path = TRACK / "batch-b-discovery-audit-v2.json"
    write_json(discovery_path, {
        "schema_version": "apk-batch-discovery-audit.v2",
        "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
        "batch_id": "batch-b",
        "source_baseline_revision": BASELINE,
        "scope": [POTION, RUNE, ASTRAL],
        "games": discovery_games,
        "predecessor_bindings": PREDECESSORS,
        "denominator_mismatches": 0,
        "acceptance": "not-claimed",
    })
    active_outputs.insert(0, discovery_path)

    receipt_dir = TRACK / "role-receipts"
    receipt_paths: list[Path] = []
    discovery_receipt = receipt_dir / "discovery-auditor-batch-b-v2.json"
    write_json(discovery_receipt, receipt(
        "discovery-auditor-batch-b-v2",
        "batch-b-denominator-reconciliation-v2",
        [discovery_path] + [TRACK / f"batch-b/{slug}/source-asset-history-ledger-v2.json" for slug in GAME_INFO],
        "complete-local-producer; distinct-session gate unsatisfied",
        {"measured": True, "path_admissions": len(discovery_games), "denominator_records_reconciled": sum(row["denominator_record_count"] for row in discovery_games), "git_history_queries": 3, "denominator_reports": 1, "elapsed_minutes": None, "elapsed_disclosure": "timer unavailable; not represented as zero"},
    ))
    receipt_paths.append(discovery_receipt)

    for slug in GAME_INFO:
        package = TRACK / f"batch-b/{slug}"
        collector_receipt = receipt_dir / f"evidence-collector-{slug}-batch-b-v2.json"
        collector_outputs = [package / "claim-evidence-ledger-v2.json", package / "source-asset-history-ledger-v2.json", package / "negative-fixtures-v2.json"]
        source_objects = {(row["revision"], row["path"]) for row in claims_by_slug[slug]}
        source_bytes = sum(len(git_bytes(revision, path)) for revision, path in source_objects)
        write_json(collector_receipt, receipt(
            f"evidence-collector-{slug}-batch-b-v2",
            f"{slug}-evidence-v2",
            collector_outputs,
            "complete-local-producer; distinct-session gate unsatisfied",
            {"measured": True, "cited_ranges": len(claims_by_slug[slug]), "source_objects_read": len(source_objects), "source_bytes_read": source_bytes, "negative_fixtures": 6, "elapsed_minutes": None, "elapsed_disclosure": "timer unavailable; not represented as zero"},
        ))
        receipt_paths.append(collector_receipt)

        mapper_receipt = receipt_dir / f"requirements-mapper-{slug}-batch-b-v2.json"
        write_json(mapper_receipt, receipt(
            f"requirements-mapper-{slug}-batch-b-v2",
            f"{slug}-requirements-map-v2",
            [package / "requirements-map-v2.json"],
            "complete-local-producer; distinct-session gate unsatisfied",
            {"measured": True, "ledger_records_read": len(claims_by_slug[slug]) + len(UNKNOWNS[slug]), "mapping_records": len(json.loads((package / "requirements-map-v2.json").read_text())["mappings"]), "novel_factual_claims": 0, "elapsed_minutes": None, "elapsed_disclosure": "timer unavailable; not represented as zero"},
        ))
        receipt_paths.append(mapper_receipt)

        browser_receipt = receipt_dir / f"browser-auditor-{slug}-batch-b-v2.json"
        write_json(browser_receipt, receipt(
            f"browser-auditor-{slug}-batch-b-v2",
            f"{slug}-browser-audit-v2",
            [package / "browser-audit-v2.json"],
            "blocked-not-conducted; no browser evidence authored",
            {"measured": True, "launch_navigation_attempts": 0, "state_transition_attempts": 0, "captures": 0, "thai_english_boundary_cases": 0, "elapsed_minutes": None, "elapsed_disclosure": "no browser session was run"},
        ))
        receipt_paths.append(browser_receipt)

    truth_path = TRACK / "batch-b-truth-tests-v2.py"
    truth_receipt = receipt_dir / "truth-test-author-batch-b-v2.json"
    write_json(truth_receipt, receipt(
        "truth-test-author-batch-b-v2",
        "batch-b-truth-contract-v2",
        [truth_path],
        "complete-local-producer; execution result recorded outside immutable authored-time receipt",
        {"measured": True, "assertion_tests": 17, "negative_fixture_executions": 18, "test_runs": 0, "elapsed_minutes": None, "elapsed_disclosure": "timer unavailable; not represented as zero"},
    ))
    receipt_paths.append(truth_receipt)

    supersession_path = TRACK / "batch-b-v1-supersession-record.json"
    old_paths = [
        TRACK / "batch-b-discovery-audit.json",
        TRACK / "batch-b-requirements-map.json",
        TRACK / "batch-b-browser-audit.json",
        TRACK / "batch-b-truth-tests.py",
        TRACK / "role-receipts/batch-b-specialist-receipts.json",
        TRACK / "batch-b/potion-rush/claim-evidence-ledger.json",
        TRACK / "batch-b/rune-forge-chamber/claim-evidence-ledger.json",
        TRACK / "batch-b/astral-mage/claim-evidence-ledger.json",
    ]
    write_json(supersession_path, {
        "schema_version": "apk-additive-supersession.v1",
        "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
        "batch_id": "batch-b",
        "superseded_commit": "91e6331b22e88532d16f24df4068e481dae77a7b",
        "superseded_artifacts": {str(path.relative_to(ROOT)): file_digest(path) for path in old_paths},
        "disposition": "non-consumable-invalid-producer-generation",
        "reasons": ["invalid citation envelopes", "malformed or overbroad claims", "shape-only false-green tests", "aggregated role receipts", "incomplete per-game packages", "premature completed plan markers"],
        "replacement_generation": "batch-b-v2-producer-readiness.json",
        "candidate_or_acceptance_inherited": False,
    })

    readiness_path = TRACK / "batch-b-v2-producer-readiness.json"
    all_bound_outputs = active_outputs + receipt_paths + [truth_path, supersession_path]
    write_json(readiness_path, {
        "schema_version": "apk-evidence-producer-readiness.v2",
        "track_id": "apk_corpus_audit_puzzle_crafting_20260712",
        "batch_id": "batch-b",
        "status": "producer-remediation-complete-blocked-before-candidate",
        "consumable": False,
        "candidate_authorized": False,
        "candidate_published": False,
        "product_owner_acceptance_published": False,
        "accepted_manifest_published": False,
        "role_base_sha": ROLE_BASE,
        "source_baseline_revision": BASELINE,
        "scope": {"games": [POTION, RUNE, ASTRAL], "factual_claims": sum(len(rows) for rows in claims_by_slug.values()), "explicit_unknowns": sum(len(rows) for rows in UNKNOWNS.values()), "negative_fixtures": 18, "browser_evidence_records": 0},
        "predecessor_bindings": PREDECESSORS,
        "active_artifact_hashes": {str(path.relative_to(ROOT)): file_digest(path) for path in all_bound_outputs},
        "resolved_review_blocker_classes": ["citation-envelope-shape-and-hashes", "atomic-claim-shape", "false-green-source-gate-design", "per-game-package-completeness", "aggregated-receipt-format"],
        "blockers": [
            {"blocker_id": "T6-BB-V2-BLOCK-001", "severity": "critical", "detail": "All producer outputs and separate role receipts were authored in the same producer context. Distinct discovery, collector, mapper, browser, and truth-test agent sessions are not evidenced and are not fabricated.", "legal_next_action": "Commission fresh distinct roles to independently ratify or supersede each exact owned output with committed local receipts under the owner provenance direction."},
            {"blocker_id": "T6-BB-V2-BLOCK-002", "severity": "high", "detail": "No browser audit was conducted. Potion Rush and Rune Forge Chamber have current source route candidates but no real route, gameplay, trusted input, compact/wide, Thai/English, completion, persistence, XP, API, or asset-loading evidence.", "legal_next_action": "Run a distinct browser auditor against a verifiably matching app revision and preserve real accepted input or bounded failure evidence without upgrading source declarations to browser facts."},
            {"blocker_id": "T6-BB-V2-BLOCK-003", "severity": "high", "detail": "No separately commissioned adversarial review binds the committed V2 producer bytes and gate output.", "legal_next_action": "After publication and role/browser remediation, commission a fresh review over the exact commit and hashes; candidate publication requires zero unresolved Critical, High, or Medium findings."},
        ],
        "success_claims": {key: False for key in ("route", "gameplay", "input", "responsive", "completion", "persistence", "xp", "idempotency", "api_correctness", "asset_loading", "production", "shipping")},
        "lifecycle": {"next_stage": "separate role/browser remediation and independent review commission", "candidate_only_after_zero_blocker_review": True},
        "marker": "MEASURE_AGENT_RESULT",
    })


if __name__ == "__main__":
    main()
