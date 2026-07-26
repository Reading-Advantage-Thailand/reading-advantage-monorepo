"""Builds the explicitly curated Phase 2 v12 mapper candidate.

This temporary authoring utility contains the mapper's per-record decisions.
It must be removed after publishing the six governed outputs and receipt.
"""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any
import phase2_v9_truth_verifier as v9


TRACK_ROOT = Path(__file__).resolve().parent

PHASE1 = "phase1-mechanic-blueprints-v1.json"
CURATED = "phase2-curated-capability-evidence-v1.json"
COMPARISONS = "phase2-capability-comparisons-v5.json"
CLASSIFICATION = "phase2-capability-classification-v5.json"
BOUNDARIES = "phase2-extension-boundaries-v5.json"
DEPENDENCIES = "phase2-claim-dependency-edges-v5.json"
TAXONOMY = "phase2-capability-taxonomy-inventory-v1.json"
RECEIPT = "role-receipts/phase2/capability-mapper-v5.json"

DISPATCH_SHA256 = "5e482c2803762ccffeb36ca8ca463f221752f46c15a27ad9ad61872209711af4"
ROOT_SEAL_SHA256 = "100df74cd9fb6782b38688b7cfb6f0749a70c05356fb0356cbbc6e95df4a8859"
ROOT_RELEASE_SHA256 = "50464bf42dfc89a4a79a44b8ec3ce66a4ca03b10725267158f557f34042aa35b"


def load(path: str) -> dict[str, Any]:
    """Loads one track-local JSON object.

    Args:
        path: Track-relative JSON path.

    Returns:
        Parsed JSON object.
    """
    return json.loads((TRACK_ROOT / path).read_text())


def sha256(path: Path) -> str:
    """Calculates the raw-byte SHA-256 digest for one path.

    Args:
        path: File whose bytes should be hashed.

    Returns:
        Lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


PHASE1_DOCUMENT = load(PHASE1)
PHASE1_RECORDS = {
    row["record_id"]: row for row in PHASE1_DOCUMENT["records"]
}
BASE_CURATED = load(CURATED)
PHASE1_BINDINGS = BASE_CURATED["phase1_bindings"]


# Each selected entry is an independently reviewed atomic capability. The
# candidate lists intentionally contain at most one primary evidence record
# per game for that dimension. A record may support multiple dimensions.
SELECTED: dict[str, dict[str, Any]] = {
    "t01": {
        "capability_id": "capability:bounded-frame-delta",
        "dimension": "active frame delta clamp",
        "records": [
            "babel-architect:BA-HIST-011",
            "rune-forge-chamber:RFC-CUR-015",
            "spellweavers-run:SW-TRANS-004",
            "village-guardian:VG3-COMP-004",
            "wizard-vs-zombie:WVZ-MECH-011",
        ],
    },
    "t02": {
        "capability_id": "capability:single-completion-emission",
        "dimension": "terminal completion fire-once guard",
        "records": [
            "abyssal-well:AW-HIST-023",
            "babel-architect:BA-HIST-012",
            "enchanted-library:EL-UI-002",
            "rune-forge-chamber:RFC-CUR-016",
            "shadow-gate-dungeon:SGD-RESULT-001",
            "sorcerer-ziggurat:SZ-HIST-009",
            "storm-castle-tower:SCT-TRANS-H002",
            "village-guardian:VG3-COMP-006",
        ],
    },
    "t03": {
        "capability_id": "capability:nonempty-content-precondition",
        "dimension": "empty playable content rejection",
        "records": [
            "abyssal-well:AW-HIST-011",
            "archers-revenge:AR-B2-V8-012",
            "astral-mage:AM-HIST-004",
            "enchanted-library:EL-INIT-001",
            "griffin-riders-escape:GRF-START-001",
            "labyrinth-goblin-king:LGK-INIT-001",
            "rune-forge-chamber:RFC-CUR-007",
            "rune-match:RM-MECH-005",
            "sorcerer-ziggurat:SZ-HIST-004",
            "village-guardian:VG3-MODEL-001",
            "wizard-vs-zombie:WVZ-MECH-003",
        ],
    },
    "t04": {
        "capability_id": "capability:input-action-normalization",
        "dimension": "physical input to semantic action mapping",
        "records": [
            "abyssal-well:AW-HIST-040",
            "astral-mage:AM-HIST-011",
            "astral-mage:AM-HIST-012",
            "babel-architect:BA-HIST-013",
            "dragon-rider:DR-CONTROL-001",
            "dragon-flight:DF-CTRL-001",
            "enchanted-library:EL-CONTROL-001",
            "griffin-riders-escape:GRF-CART-002",
            "magic-defense:MD-MECH-011",
            "potion-rush:PR-CUR-017",
            "rpg-battle:RPG-CTL-001",
            "rune-forge-chamber:RFC-CUR-019",
            "shadow-gate-dungeon:SGD-INPUT-001",
            "sorcerer-ziggurat:SZ-HIST-014",
            "spellweavers-run:SW-INPUT-002",
            "storm-castle-tower:SCT-MECH-H008",
        ],
    },
    "t05": {
        "capability_id": "capability:time-and-frame-loop",
        "dimension": "active time threshold transition",
        "records": [
            "alchemists-synthesis:AS-TRANS-001",
            "babel-architect:BA-HIST-005",
            "dragon-flight:DF-TRANS-001",
            "dragon-rider:DR-TRANS-002",
            "enchanted-library:EL-LOOP-001",
            "magic-defense:MD-MECH-012",
            "rune-forge-chamber:RFC-CUR-010",
            "village-guardian:VG3-MODEL-006",
        ],
    },
    "t06": {
        "capability_id": "capability:language-target-progression",
        "dimension": "correct target advances ordered progress",
        "records": [
            "astral-mage:AM-HIST-005",
            "babel-architect:BA-HIST-004",
            "dungeon-liberator:DL-COLL-001",
            "enchanted-library:EL-COLL-001",
            "griffin-riders-escape:GRF-TRANS-001",
            "labyrinth-goblin-king:LGK-ORB-001",
            "potion-rush:PR-CUR-011",
            "rune-forge-chamber:RFC-CUR-011",
            "shadow-gate-dungeon:SGD-PROG-001",
            "sorcerer-ziggurat:SZ-HIST-006",
            "spellweavers-run:SW-TRANS-002",
            "spellweavers-run:SW-CART-016",
            "storm-castle-tower:SCT-TRANS-H003",
            "the-haunted-library:HL-CUR-010",
            "village-guardian:VG3-MODEL-010",
        ],
    },
    "t07": {
        "capability_id": "capability:result-accounting",
        "dimension": "performance counters to XP",
        "records": [
            "abyssal-well:AW-HIST-032",
            "dragon-flight:DF-MECH-014",
            "alchemists-synthesis:AS-RESULT-001",
            "enchanted-library:EL-XP-001",
            "magic-defense:MD-MECH-001",
            "potion-rush:PR-CUR-014",
            "rpg-battle:RPG-MECH-009",
            "rune-forge-chamber:RFC-CUR-013",
            "village-guardian:VG3-MODEL-017",
        ],
    },
    "t08": {
        "capability_id": "capability:inactive-state-noop-guard",
        "dimension": "inactive state mutation no-op",
        "records": [
            "alchemists-synthesis:AS-TRANS-001",
            "archers-revenge:AR-B2-V8-014",
            "dragon-flight:DF-TRANS-002",
            "dragon-rider:DR-TRANS-002",
            "enchanted-library:EL-LOOP-001",
            "rpg-battle:RPG-TR-004",
        ],
    },
    "t09": {
        "capability_id": "capability:content-unit-completion-transition",
        "dimension": "completed content unit continuation or terminalization",
        "records": [
            "abyssal-well:AW-HIST-022",
            "alchemists-synthesis:AS-TRANS-002",
            "astral-mage:AM-HIST-006",
            "babel-architect:BA-HIST-007",
            "griffin-riders-escape:GRF-TRANS-001",
            "sorcerer-ziggurat:SZ-HIST-007",
            "spellweavers-run:SW-CART-016",
            "storm-castle-tower:SCT-TRANS-H003",
            "the-haunted-library:HL-CUR-011",
        ],
    },
    "t10": {
        "capability_id": "capability:direction-vector-normalization",
        "dimension": "diagonal direction vector normalization",
        "records": [
            "astral-mage:AM-HIST-012",
            "dungeon-liberator:DL-MOVE-002",
            "enchanted-library:EL-LOOP-002",
            "wizard-vs-zombie:WVZ-MECH-004",
        ],
    },
    "t11": {
        "capability_id": "capability:offscreen-target-indicator",
        "dimension": "off-screen world target edge projection",
        "records": [
            "devourer-slime:DS-CL-C-008",
            "dungeon-liberator:DL-IND-001",
            "wizard-vs-zombie:WVZ-MECH-018",
        ],
    },
    "t12": {
        "capability_id": "capability:resource-threshold-terminal",
        "dimension": "depleted gameplay resource terminal transition",
        "records": [
            "abyssal-well:AW-HIST-021",
            "babel-architect:BA-HIST-005",
            "dungeon-liberator:DL-COLL-002",
            "enchanted-library:EL-LOOP-001",
            "magic-defense:MD-TRANS-002",
            "rpg-battle:RPG-TR-002",
            "rune-forge-chamber:RFC-CUR-010",
            "shadow-gate-dungeon:SGD-TRANS-002",
            "spellweavers-run:SW-TRANS-003",
            "storm-castle-tower:SCT-MECH-H005",
            "the-haunted-library:HL-CUR-011",
            "village-guardian:VG3-MODEL-008",
        ],
    },
    "t13": {
        "capability_id": "capability:incorrect-target-penalty",
        "dimension": "incorrect target triggers a gameplay penalty",
        "records": [
            "enchanted-library:EL-COLL-002",
            "dragon-flight:DF-MECH-009",
            "labyrinth-goblin-king:LGK-TRANS-002",
            "magic-defense:MD-MECH-018",
            "rune-forge-chamber:RFC-CUR-011",
            "rpg-battle:RPG-TR-006",
            "shadow-gate-dungeon:SGD-PROG-001",
            "spellweavers-run:SW-TRANS-003",
            "storm-castle-tower:SCT-MECH-H005",
            "the-haunted-library:HL-CUR-010",
            "village-guardian:VG3-MODEL-011",
            "wizard-vs-zombie:WVZ-MECH-005",
        ],
    },
    "t14": {
        "capability_id": "capability:reset-before-active-play",
        "dimension": "reset model before active play",
        "records": [
            "abyssal-well:AW-HIST-020",
            "dragon-flight:DF-TRANS-008",
            "dungeon-liberator:DL-START-001",
            "magic-defense:MD-TRANS-001",
            "potion-rush:PR-CUR-007",
            "rpg-battle:RPG-TR-001",
            "storm-castle-tower:SCT-TRANS-H001",
            "village-guardian:VG3-COMP-008",
        ],
    },
    "t15": {
        "capability_id": "capability:distractor-exclusion",
        "dimension": "expected item exclusion from distractors",
        "records": [
            "alchemists-synthesis:AS-MECH-001",
            "dragon-flight:DF-MECH-004",
            "enchanted-library:EL-BOOK-001",
            "sorcerer-ziggurat:SZ-HIST-016",
            "wizard-vs-zombie:WVZ-MECH-007",
        ],
    },
}


def role_anchors(precondition: str, action: str, outcome: str) -> dict[str, str]:
    """Returns one manually authored, role-specific complete anchor map."""
    if len({precondition, action, outcome}) != 3:
        raise AssertionError("complete anchors must be three distinct excerpts")
    return {
        "precondition": precondition,
        "action_or_transition": action,
        "observable_outcome": outcome,
    }


EXPLICIT_USE_ANCHORS: dict[tuple[str, str], dict[str, str]] = {}
SELECTED["t16"] = {
    "capability_id": "capability:minimum-vocabulary-admission-threshold",
    "dimension": "minimum vocabulary count admission gate",
    "records": [
        "dragon-flight:DF-MECH-054",
        "rpg-battle:RPG-MECH-026",
    ],
}


def selected_anchor(taxonomy_id: str, record_id: str, precondition: str, action: str, outcome: str) -> None:
    """Registers one manually authored anchor map for a new selected use."""
    key = (taxonomy_id, record_id)
    if key in EXPLICIT_USE_ANCHORS:
        raise AssertionError(f"duplicate selected anchors: {key}")
    EXPLICIT_USE_ANCHORS[key] = role_anchors(precondition, action, outcome)


SPECIAL_CONTEXT_ANCHORS: dict[str, dict[str, str]] = {}


def special_anchor(record_id: str, precondition: str, action: str, outcome: str) -> None:
    """Registers one manually authored complete anchor map for special context."""
    if record_id in SPECIAL_CONTEXT_ANCHORS:
        raise AssertionError(f"duplicate special anchors: {record_id}")
    SPECIAL_CONTEXT_ANCHORS[record_id] = role_anchors(precondition, action, outcome)


# New selected-use anchors, first reviewed capability group.
selected_anchor("t02", "shadow-gate-dungeon:SGD-RESULT-001", "When gameState status is victory or defeat", "the component computes accuracy and XP", "calls onComplete once through hasReportedRef")
selected_anchor("t03", "labyrinth-goblin-king:LGK-INIT-001", "an empty sentence list", "State creation rejects", "rejects an empty sentence list")
selected_anchor("t03", "wizard-vs-zombie:WVZ-MECH-003", "if vocabulary.length===0", "createWizardZombieState (wizardZombie.ts lines 75-115) throws 'Vocabulary cannot be empty'", "throws 'Vocabulary cannot be empty'")
selected_anchor("t04", "abyssal-well:AW-HIST-040", "during play", "ArrowLeft/A rotate counter-clockwise", "Space/Enter fire")
selected_anchor("t04", "astral-mage:AM-HIST-012", "keyboard or touch direction", "normalized keyboard or touch direction", "set player velocity using edition speed tuning")
selected_anchor("t04", "babel-architect:BA-HIST-013", "while playing", "Historical keyboard keys 1 through 9 select", "the corresponding active sentence block")
selected_anchor("t04", "magic-defense:MD-MECH-011", "The Spacebar keyboard event", "triggers activateSpecialAbility", "activateSpecialAbility via a window keydown listener")
selected_anchor("t04", "potion-rush:PR-CUR-017", "the final pointer position", "convert the final pointer position through the stage scale", "dispatching a drop")
selected_anchor("t04", "rpg-battle:RPG-CTL-001", "Enter key or Cast button", "submitting the form (Enter key or Cast button) calls onSubmit", "onSubmit with the trimmed value")
selected_anchor("t04", "shadow-gate-dungeon:SGD-INPUT-001", "recognized keydown inputs", "updates pressed keys", "computes a velocity")
selected_anchor("t05", "alchemists-synthesis:AS-TRANS-001", "when accumulated time reaches 60000 milliseconds", "changes a playing state to gameover", "gameover when accumulated time reaches 60000 milliseconds")
selected_anchor("t06", "labyrinth-goblin-king:LGK-ORB-001", "when its orderIndex equals targetIndex", "correct collection increments correctAnswers", "increments targetIndex")
selected_anchor("t06", "shadow-gate-dungeon:SGD-PROG-001", "On player overlap with an uncollected crystal", "a correct word is marked collected, appended", "advances targetIndex")
selected_anchor("t06", "spellweavers-run:SW-CART-016", "A correct lane", "advances the word", "advances sentences in order")
selected_anchor("t06", "the-haunted-library:HL-CUR-010", "the expected word", "the expected word advances progress", "advances progress and score")

# New selected-use anchors, inactive guard and content completion.
selected_anchor("t08", "alchemists-synthesis:AS-TRANS-001", "when not playing", "Time advancement returns unchanged state", "unchanged state when not playing")
selected_anchor("t08", "archers-revenge:AR-B2-V8-014", "when its status is not playing", "fireArrow returns the input state", "the input state when its status is not playing")
selected_anchor("t08", "dragon-flight:DF-TRANS-002", "when status is not 'running'", "advanceDragonFlightTime is a no-op", "a no-op when status is not 'running'")
selected_anchor("t08", "dragon-rider:DR-TRANS-002", "non-running states", "it ignores non-running states", "ignores non-running states")
selected_anchor("t08", "enchanted-library:EL-LOOP-001", "terminal states", "The main step returns terminal states unchanged", "terminal states unchanged")
selected_anchor("t08", "rpg-battle:RPG-TR-004", "unless status === 'playing' and turn === 'enemy'", "enemyAttack is a no-op", "a no-op unless status === 'playing' and turn === 'enemy'")
selected_anchor("t09", "abyssal-well:AW-HIST-022", "when targetIndex >= words.length", "checkVictoryCondition transitions phase 'playing'->'victory'", "all words collected in order")
selected_anchor("t09", "alchemists-synthesis:AS-TRANS-002", "after maxRounds", "advances the round", "ends after maxRounds with victory at least half correct or gameover otherwise")
selected_anchor("t09", "astral-mage:AM-HIST-006", "After the final token", "either created the next sentence's seeded targets or marked complete", "created results after the final sentence")
selected_anchor("t09", "babel-architect:BA-HIST-007", "Completing a historical sentence", "either transitions to victory or creates the next sentence's blocks", "records sentence-complete feedback")
selected_anchor("t09", "griffin-riders-escape:GRF-TRANS-001", "the last word", "the last word sets victory", "sets victory")
selected_anchor("t09", "sorcerer-ziggurat:SZ-HIST-007", "after the final sentence", "The historical transition either froze results", "created a seeded graph at origin for the next sentence")
selected_anchor("t09", "spellweavers-run:SW-CART-016", "after all sentences", "advances sentences in order", "finishes victory after all sentences")
selected_anchor("t09", "storm-castle-tower:SCT-TRANS-H003", "exhausting the final sentence", "calls finish with victory true", "loads the next sentence and resets player and target index")
selected_anchor("t09", "the-haunted-library:HL-CUR-011", "Collecting all words", "Collecting all words transitions to victory", "transitions to victory")

# New selected-use anchors, movement, indicators, and resource thresholds.
selected_anchor("t10", "astral-mage:AM-HIST-012", "keyboard or touch direction", "normalized keyboard or touch direction", "set player velocity using edition speed tuning")
selected_anchor("t10", "dungeon-liberator:DL-MOVE-002", "when both are nonzero", "Player input dx and dy are diagonal-normalized", "clamped to PLAYER_RADIUS through GAME_WIDTH/HEIGHT minus PLAYER_RADIUS")
selected_anchor("t10", "enchanted-library:EL-LOOP-002", "diagonal movement", "normalizes diagonal movement", "clamps player coordinates to arena bounds")
selected_anchor("t10", "wizard-vs-zombie:WVZ-MECH-004", "integrates one frame", "normalizes diagonal input", "clamps to world bounds")
selected_anchor("t11", "devourer-slime:DS-CL-C-008", "when it lies outside viewport bounds", "locates the uneaten target orb", "adds an indicator when it lies outside viewport bounds")
selected_anchor("t11", "dungeon-liberator:DL-IND-001", "for each position outside the viewport", "converts remaining world positions with camera scale and offset", "creates an edge-positioned indicator for each position outside the viewport")
selected_anchor("t11", "wizard-vs-zombie:WVZ-MECH-018", "for each orb outside the viewport AABB", "computes off-screen orb indicators", "place a marker at the viewport edge intersected by the orb direction")
selected_anchor("t12", "abyssal-well:AW-HIST-021", "when lives reach 0", "resolveHits transitions phase", "phase to 'defeat'")
selected_anchor("t12", "babel-architect:BA-HIST-005", "zero stability", "Historical ticks add elapsed time, decay stability with a 250 ms clamp", "defeat on timeout or zero stability")
selected_anchor("t12", "dungeon-liberator:DL-COLL-002", "player-monster contact", "otherwise decrements lives", "sets defeat at zero lives")
selected_anchor("t12", "enchanted-library:EL-LOOP-001", "when mana or time reaches zero", "enters gameover", "gameover when mana or time reaches zero")
selected_anchor("t12", "magic-defense:MD-TRANS-002", "when all three castles have HP=0", "Status transition playing -> game-over via damageCastle occurs", "game-over via damageCastle")
selected_anchor("t12", "rpg-battle:RPG-TR-002", "only when status is 'playing' and resulting health is <= 0", "damagePlayer clamps playerHealth at 0 and, only when status is 'playing'", "transitions status to 'defeat' and playerPose to 'defeat'")
selected_anchor("t12", "rune-forge-chamber:RFC-CUR-010", "expired time or non-positive health", "Ticking decrements time", "defeats on expired time or non-positive health")
selected_anchor("t12", "shadow-gate-dungeon:SGD-TRANS-002", "when collision damage reduces player health to zero or below", "The state update returns", "status defeat")
selected_anchor("t12", "spellweavers-run:SW-TRANS-003", "at zero mana", "subtracts 20 configured mana without going below zero", "defeats at zero mana")
selected_anchor("t12", "storm-castle-tower:SCT-MECH-H005", "when lives are at most zero", "an incorrect selection closes that window, decrements lives", "finishes in defeat only when lives are at most zero")
selected_anchor("t12", "the-haunted-library:HL-CUR-011", "lives at or below zero", "lives at or below zero transition", "transition to defeat")
selected_anchor("t12", "village-guardian:VG3-MODEL-008", "After updates, lives at most zero", "lives at most zero sets status", "status to defeat")

# New selected-use anchors, incorrect penalties, reset, and distractor filtering.
selected_anchor("t13", "enchanted-library:EL-COLL-002", "Collecting an incorrect book", "subtracts five mana subject to a zero floor", "leaves the target word unchanged")
selected_anchor("t13", "labyrinth-goblin-king:LGK-TRANS-002", "A wrong orb", "increments wrongAnswers, removes one life", "attempts to reposition the orb at an available floor position")
selected_anchor("t13", "magic-defense:MD-MECH-018", "On wrong answer", "resets combo", "increments totalAttempts")
selected_anchor("t13", "rune-forge-chamber:RFC-CUR-011", "while a mismatch", "a mismatch subtracts health", "may defeat")
selected_anchor("t13", "shadow-gate-dungeon:SGD-PROG-001", "while a wrong word", "a wrong word damages health", "without advancing targetIndex")
selected_anchor("t13", "spellweavers-run:SW-TRANS-003", "An incorrect legacy collection", "subtracts 20 configured mana without going below zero", "resets combo")
selected_anchor("t13", "storm-castle-tower:SCT-MECH-H005", "an incorrect selection", "closes that window, decrements lives", "subtracts 20 score")
selected_anchor("t13", "the-haunted-library:HL-CUR-010", "while a wrong/trap door", "removes a life", "spawns a bat")
selected_anchor("t13", "village-guardian:VG3-MODEL-011", "The wrong-order branch", "increments wrongAnswers", "adds wrongWordTimePenalty to timer")
selected_anchor("t13", "wizard-vs-zombie:WVZ-MECH-005", "incorrect orb", "incorrect orb reshuffles orbs", "incorrect orb reshuffles orbs and subtracts 5 score")
selected_anchor("t14", "abyssal-well:AW-HIST-020", "phase 'start'", "resets the clock", "transitions phase 'start'->'playing'")
selected_anchor("t14", "dungeon-liberator:DL-START-001", "its onStart callback", "resets the game", "sets the component phase to playing")
selected_anchor("t14", "magic-defense:MD-TRANS-001", "Status transition idle -> playing", "StartScreen handleStart() -> resetGame()", "idle -> playing is triggered by StartScreen handleStart() -> resetGame()")
selected_anchor("t14", "potion-rush:PR-CUR-007", "Starting", "selects one of four belt-speed and spawn-rate presets", "enters PLAYING, clears counters and entities, and creates three idle cauldrons")
selected_anchor("t14", "storm-castle-tower:SCT-TRANS-H001", "The historical start handler", "resets state", "sets gamePhase to playing")
selected_anchor("t14", "village-guardian:VG3-COMP-008", "The start callback", "calls resetGame", "sets gamePhase to playing")
selected_anchor("t15", "alchemists-synthesis:AS-MECH-001", "current word", "filters differing terms", "those wrong options")
selected_anchor("t15", "dragon-flight:DF-MECH-004", "when vocabulary has more than one entry", "createGateRound picks a correct item", "a distinct decoy item")
selected_anchor("t15", "enchanted-library:EL-BOOK-001", "the target term and translation", "filters out the target term", "takes up to three decoys")
selected_anchor("t15", "sorcerer-ziggurat:SZ-HIST-016", "expected text", "excluded NFKC/case-equivalent expected text", "used glyph decoys when no alternate token existed")
selected_anchor("t15", "wizard-vs-zombie:WVZ-MECH-007", "the target", "sampled from vocabulary entries whose term differs from the target", "three decoy orbs")

# Special context anchors for redundant and incompatible records.
special_anchor("rpg-battle:RPG-TR-013", "unless status === 'playing', inputLocked is false, and turn === 'player'", "handleSubmit early-returns", "early-returns unless status === 'playing', inputLocked is false, and turn === 'player'")
special_anchor("rpg-battle:RPG-TR-015", "On an unmatched answer", "plays 'error', records a miss in performance", "triggers the enemy turn")
special_anchor("rpg-battle:RPG-MECH-010", "baseXp, enemyMultiplier", "scaleBattleXp(baseXp, enemyMultiplier)", "Final XP = scaleBattleXp(baseXp, enemyMultiplier)")
special_anchor("rpg-battle:RPG-MECH-016", "maximum streak seen", "longestStreak tracks the maximum streak seen", "feeds the XP streakBoost")
special_anchor("rpg-battle:RPG-CTL-004", "for each hero, location, and enemy option", "SelectionOptionButton renders a Button with onClick={onSelect}", "pointer/click buttons")
selected_anchor("t13", "rpg-battle:RPG-TR-006", "submitAnswer on an incorrect match", "submitAnswer on an incorrect match: inputLocked=true, revealedTranslation=expected, streak reset to 0, playerPose 'miss'", "a 2000ms timeout then clears inputLocked and revealedTranslation")
selected_anchor("t14", "rpg-battle:RPG-TR-001", "initializeBattle", "transitions status to 'playing', turn to 'player'", "resets both health pools")
selected_anchor("t16", "dragon-flight:DF-MECH-054", "at least 10 vocabulary items", "The page requires at least 10 vocabulary items", "before rendering the game")
selected_anchor("t16", "rpg-battle:RPG-MECH-026", "data.vocabulary.length >= 5", "The page requires data.vocabulary.length >= 5", "before accepting the fetched vocabulary")
special_anchor("dragon-flight:DF-CTRL-014", "on click", "calls resetGame()+setHasStarted(true)", "setHasStarted(true) on click")
special_anchor("dragon-flight:DF-CTRL-002", "ArrowRight or 'd'", "selects the right gate", "ArrowRight or 'd' selects the right gate")
special_anchor("dragon-flight:DF-CTRL-005", "on pointerdown", "A left arrow button with aria-label 'Choose left gate' triggers handleGateSelection('left')", "handleGateSelection('left') on pointerdown")
special_anchor("dragon-flight:DF-CTRL-006", "on pointerdown", "A right arrow button with aria-label 'Choose right gate' triggers handleGateSelection('right')", "handleGateSelection('right') on pointerdown")
special_anchor("dragon-flight:DF-CTRL-008", "only when the pair is active", "The left canvas gate Group calls onSelectGate('left')", "calls onSelectGate('left') on pointerdown only when the pair is active")
special_anchor("dragon-flight:DF-CTRL-009", "only when the pair is active", "The right canvas gate Group calls onSelectGate('right')", "calls onSelectGate('right') on pointerdown only when the pair is active")
special_anchor("dragon-flight:DF-MECH-010", "status is not 'running'", "selectGate is a no-op", "a no-op when status is not 'running'")
special_anchor("dragon-flight:DF-CTRL-004", "unless hasStarted and status is 'running'", "Keyboard input is ignored", "ignored unless hasStarted and status is 'running'")
special_anchor("dragon-flight:DF-CTRL-010", "when not started, not running, a selection is pending, or a pair is locked", "handleGateSelection returns early", "returns early when not started, not running, a selection is pending, or a pair is locked")
special_anchor("dragon-flight:DF-TRANS-003", "On extreme difficulty (gameOverOnMiss)", "an incorrect gate selection forces status 'boss'", "dragonCount 0")
special_anchor("dragon-flight:DF-MECH-023", "an incorrect selection", "subtracts the difficulty penalty", "with a floor of 1 dragon")
selected_anchor("t04", "dragon-flight:DF-CTRL-001", "ArrowLeft or 'a' selects", "selects the left gate", "ArrowLeft or 'a' selects the left gate")
selected_anchor("t07", "dragon-flight:DF-MECH-014", "correctAnswers, totalAttempts", "calculateXP(0, correctAnswers, totalAttempts)", "XP is calculated via calculateXP(0, correctAnswers, totalAttempts)")
selected_anchor("t13", "dragon-flight:DF-MECH-009", "an incorrect one", "an incorrect one decrements it", "decrements it with a floor of 1 (lib lines 110-112)")
selected_anchor("t14", "dragon-flight:DF-TRANS-008", "The start button", "calls resetGame() and setHasStarted(true)", "moving from the briefing surface to the running game")
special_anchor("abyssal-well:AW-HIST-041", "tap left of center-50px", "rotates counter-clockwise", "center band (±50px) fires")
special_anchor("griffin-riders-escape:GRF-INPUT-001", "while the phase is playing", "maps nonzero directional input changes", "switchLane left or right")
special_anchor("dragon-rider:DR-TRANS-001", "non-running state", "selectGate ignores", "ignores non-running state")
special_anchor("dungeon-liberator:DL-INPUT-002", "starting", "calls resetGame", "sets gamePhase to playing")
special_anchor("enchanted-library:EL-SHIELD-001", "when already active or when charges are zero", "Shield activation is a no-op", "a no-op when already active or when charges are zero")
special_anchor("enchanted-library:EL-SPIRIT-001", "when the spawn timer is positive or the spirit count has reached maxSpirits", "Spirit spawning returns the input state", "returns the input state when the spawn timer is positive or the spirit count has reached maxSpirits")
special_anchor("magic-defense:MD-MECH-002", "correctAnswers * accuracy", "MagicDefenseController.completeGame computes xpEarned", "xpEarned as Math.floor(correctAnswers * accuracy)")
special_anchor("magic-defense:MD-MECH-006", "when all castles reach 0", "damageCastle reduces the targeted castle HP by 1 (clamped to 0) and sets status='game-over'", "sets status='game-over'")
special_anchor("magic-defense:MD-TRANS-003", "when timeRemaining reaches 0", "Status transition playing -> game-over via timer occurs", "game-over via timer")
special_anchor("rpg-battle:RPG-TR-003", "only when status is 'playing' and resulting health is <= 0", "damageEnemy clamps enemyHealth at 0 and, only when status is 'playing'", "transitions status to 'victory'")
special_anchor("rpg-battle:RPG-TR-007", "unless the current step is 'hero'", "it is a no-op", "a no-op unless the current step is 'hero'")
special_anchor("rpg-battle:RPG-TR-008", "unless current step is 'location'", "no-op", "no-op unless current step is 'location'")
special_anchor("rpg-battle:RPG-TR-009", "unless current step is 'enemy'", "no-op", "no-op unless current step is 'enemy'")
special_anchor("shadow-gate-dungeon:SGD-INPUT-002", "when the game is playing", "applies a supplied dx/dy velocity", "setPlayerVelocity")
special_anchor("spellweavers-run:SW-INPUT-001", "Legacy pointer or touch input", "converts clientX to logical gameX", "invokes that lane")
special_anchor("spellweavers-run:SW-CART-003", "lower 75 percent of normalized pointer space", "maps the lower 75 percent of normalized pointer space", "three equal horizontal input regions")
special_anchor("storm-castle-tower:SCT-MECH-H001", "only while gamePhase is playing", "maps Arrow/WASD keys to four movement directions", "Space/Enter to collection")
special_anchor("storm-castle-tower:SCT-TRANS-H004", "lives at most zero", "calls finish", "victory false")
special_anchor("dragon-flight:DF-MECH-005", "when vocabulary is empty", "createGateRound returns an empty round", "correctSide 'left'")
special_anchor("dragon-rider:DR-MECH-002", "an empty vocabulary", "produces empty strings", "correctSide 'left'")

def validate_anchor_map(label: Any, record_id: str, anchors: dict[str, str]) -> None:
    """Asserts exact, complete, distinct role evidence for one record."""
    record = PHASE1_RECORDS[record_id]
    fact = record["derived_fields"][0]["value"]
    if set(anchors) != {"precondition", "action_or_transition", "observable_outcome"}:
        raise AssertionError(f"invalid anchor roles: {label}")
    if len(set(anchors.values())) != 3:
        raise AssertionError(f"identical role placeholders: {label}")
    for role, excerpt in anchors.items():
        if excerpt not in fact or not v9._complete_excerpt(excerpt):
            raise AssertionError(f"invalid exact {role} anchor: {label}: {excerpt}")


def assert_manual_anchor_coverage() -> None:
    """Asserts exhaustive manual anchors before any candidate write."""
    old_uses: dict[tuple[str, str], dict[str, Any]] = {}
    for row in BASE_CURATED["records"]:
        for use in row["capability_uses"]:
            old_uses[(use["capability_id"], row["record_id"])] = use
    required_new = {
        (taxonomy_id, record_id)
        for taxonomy_id, definition in SELECTED.items()
        for record_id in definition["records"]
        if (definition["capability_id"], record_id) not in old_uses
    }
    if set(EXPLICIT_USE_ANCHORS) != required_new:
        raise AssertionError("new selected anchor coverage differs")
    required_special = set(REDUNDANT) | set(BESPOKE_EMPTY_SENTINEL)
    if set(SPECIAL_CONTEXT_ANCHORS) != required_special:
        raise AssertionError("special context anchor coverage differs")
    for key, anchors in EXPLICIT_USE_ANCHORS.items():
        validate_anchor_map(key, key[1], anchors)
    for record_id, anchors in SPECIAL_CONTEXT_ANCHORS.items():
        validate_anchor_map(record_id, record_id, anchors)
    for taxonomy_id, definition in SELECTED.items():
        for record_id in definition["records"]:
            key = (definition["capability_id"], record_id)
            if key not in old_uses:
                continue
            anchors = {role: old_uses[key]["anchors"][role]["exact_excerpt"] for role in ("precondition", "action_or_transition", "observable_outcome")}
            validate_anchor_map((taxonomy_id, record_id), record_id, anchors)
# Context records with complete evidence that repeats a selected atomic
# dimension in the same game. Each tuple is (taxonomy_id, selected use record).
REDUNDANT: dict[str, tuple[str, str]] = {
    "abyssal-well:AW-HIST-041": ("t04", "abyssal-well:AW-HIST-040"),
    "dragon-flight:DF-CTRL-002": ("t04", "dragon-flight:DF-CTRL-001"),
    "dragon-flight:DF-CTRL-005": ("t04", "dragon-flight:DF-CTRL-001"),
    "dragon-flight:DF-CTRL-006": ("t04", "dragon-flight:DF-CTRL-001"),
    "dragon-flight:DF-CTRL-008": ("t04", "dragon-flight:DF-CTRL-001"),
    "dragon-flight:DF-CTRL-009": ("t04", "dragon-flight:DF-CTRL-001"),
    "dragon-flight:DF-MECH-010": ("t08", "dragon-flight:DF-TRANS-002"),
    "dragon-flight:DF-CTRL-004": ("t08", "dragon-flight:DF-TRANS-002"),
    "dragon-flight:DF-CTRL-010": ("t08", "dragon-flight:DF-TRANS-002"),
    "dragon-flight:DF-CTRL-014": ("t14", "dragon-flight:DF-TRANS-008"),
    "dragon-flight:DF-TRANS-003": ("t13", "dragon-flight:DF-MECH-009"),
    "dragon-flight:DF-MECH-023": ("t13", "dragon-flight:DF-MECH-009"),
    "dragon-rider:DR-TRANS-001": ("t08", "dragon-rider:DR-TRANS-002"),
    "dungeon-liberator:DL-INPUT-002": ("t14", "dungeon-liberator:DL-START-001"),
    "enchanted-library:EL-SHIELD-001": ("t08", "enchanted-library:EL-LOOP-001"),
    "enchanted-library:EL-SPIRIT-001": ("t08", "enchanted-library:EL-LOOP-001"),
    "griffin-riders-escape:GRF-INPUT-001": (
        "t04",
        "griffin-riders-escape:GRF-CART-002",
    ),
    "magic-defense:MD-MECH-002": ("t07", "magic-defense:MD-MECH-001"),
    "magic-defense:MD-MECH-006": ("t12", "magic-defense:MD-TRANS-002"),
    "magic-defense:MD-TRANS-003": ("t05", "magic-defense:MD-MECH-012"),
    "rpg-battle:RPG-TR-003": ("t12", "rpg-battle:RPG-TR-002"),
    "rpg-battle:RPG-TR-013": ("t08", "rpg-battle:RPG-TR-004"),
    "rpg-battle:RPG-TR-015": ("t13", "rpg-battle:RPG-TR-006"),
    "rpg-battle:RPG-MECH-010": ("t07", "rpg-battle:RPG-MECH-009"),
    "rpg-battle:RPG-MECH-016": ("t07", "rpg-battle:RPG-MECH-009"),
    "rpg-battle:RPG-CTL-004": ("t04", "rpg-battle:RPG-CTL-001"),
    "rpg-battle:RPG-TR-007": ("t08", "rpg-battle:RPG-TR-004"),
    "rpg-battle:RPG-TR-008": ("t08", "rpg-battle:RPG-TR-004"),
    "rpg-battle:RPG-TR-009": ("t08", "rpg-battle:RPG-TR-004"),
    "shadow-gate-dungeon:SGD-INPUT-002": (
        "t04",
        "shadow-gate-dungeon:SGD-INPUT-001",
    ),
    "spellweavers-run:SW-INPUT-001": ("t04", "spellweavers-run:SW-INPUT-002"),
    "spellweavers-run:SW-CART-003": ("t04", "spellweavers-run:SW-INPUT-002"),
    "storm-castle-tower:SCT-MECH-H001": (
        "t04",
        "storm-castle-tower:SCT-MECH-H008",
    ),
    "storm-castle-tower:SCT-TRANS-H004": (
        "t12",
        "storm-castle-tower:SCT-MECH-H005",
    ),
}


# Candidate records deliberately preserve an empty-content sentinel contract,
# which is incompatible with the cross-game reject-empty precondition.
BESPOKE_EMPTY_SENTINEL = [
    "dragon-flight:DF-MECH-005",
    "dragon-rider:DR-MECH-002",
]
BESPOKE_EMPTY_COUNTERPARTS = [
    "abyssal-well:AW-HIST-011",
    "wizard-vs-zombie:WVZ-MECH-003",
]


# The remaining explicit context decisions are added below. Each value is:
# (fact_category, basis, evidence, full rationale, rejected dimension).
# rejected dimension is only populated for complete no-counterpart decisions.
CONTEXT: dict[str, tuple[str, str, Any, str, str | None]] = {}


def context(
    record_id: str,
    fact_category: str,
    basis: str,
    evidence: str | dict[str, str],
    rationale: str,
    rejected_dimension: str | None = None,
) -> None:
    """Registers one individually authored context decision.

    Args:
        record_id: Canonical Phase 1 mechanic record identifier.
        fact_category: Accepted v11 fact category.
        basis: Accepted v11 context disposition basis.
        evidence: Exact fact excerpt or manually role-mapped complete anchors.
        rationale: Individually authored evidence-specific rationale.
        rejected_dimension: Atomic candidate dimension when evidence is complete.

    Returns:
        None.
    """
    if record_id in CONTEXT:
        raise AssertionError(f"duplicate context decision: {record_id}")
    CONTEXT[record_id] = (
        fact_category,
        basis,
        evidence,
        rationale,
        rejected_dimension,
    )


def provenance(
    record_id: str,
    fact_category: str,
    exact_excerpt: str,
    rationale: str,
) -> None:
    """Registers an explicitly authored non-behavior decision."""
    context(
        record_id,
        fact_category,
        "context-or-provenance-not-behavior",
        exact_excerpt,
        rationale,
    )


def fragment(record_id: str, exact_excerpt: str, rationale: str) -> None:
    """Registers an explicitly authored behavioral-fragment decision."""
    context(
        record_id,
        "behavioral-fragment",
        "incomplete-behavioral-anchors",
        exact_excerpt,
        rationale,
    )


def insufficient(
    record_id: str,
    precondition: str,
    action_or_transition: str,
    observable_outcome: str,
    rationale: str,
    dimension: str,
) -> None:
    """Registers an explicitly authored insufficient-candidate decision."""
    context(
        record_id,
        "complete-behavior",
        "complete-behavior-no-cross-game-counterpart",
        {
            "precondition": precondition,
            "action_or_transition": action_or_transition,
            "observable_outcome": observable_outcome,
        },
        rationale,
        dimension,
    )


# Abyssal Well: eleven individually reviewed context records.
provenance("abyssal-well:AW-HIST-010", "type-vocabulary", "GamePhase", "AW-HIST-010 uses context-or-provenance-not-behavior: GamePhase is a declared state vocabulary, not an operation with a witnessed transition.")
provenance("abyssal-well:AW-HIST-012", "ui-render-scaffolding", "pure R3F render layer", "AW-HIST-012 uses context-or-provenance-not-behavior: pure R3F render layer identifies presentation ownership while deliberately excluding game rules.")
insufficient("abyssal-well:AW-HIST-013", "lane, depth", "wellProjection.ts maps (lane, depth) onto the tube wall", "lane angles wrap modulo lane count", "AW-HIST-013 uses complete-behavior-no-cross-game-counterpart: wellProjection.ts maps (lane, depth) onto the tube wall, an isolated cylindrical coordinate contract with no equivalent candidate.", "cylindrical lane-depth world projection")
insufficient("abyssal-well:AW-HIST-030", "The implemented ruleset was 'cycling-words'", "wrong hits cost lives", "rim breaches wrap harmlessly and speed up each lap", "AW-HIST-030 uses complete-behavior-no-cross-game-counterpart: wrong hits cost lives under a cycling rule whose harmless breaches and lap acceleration remain game-specific.", "cycling word-orb well ruleset")
insufficient("abyssal-well:AW-HIST-031", "on reaching depth>=1", "the enemy wraps to the deep end and laps increments", "each lap is 15% faster", "AW-HIST-031 uses complete-behavior-no-cross-game-counterpart: the enemy wraps to the deep end and laps increments on the rim threshold, producing the game-specific each lap is 15% faster outcome.", "depth wrap with per-lap acceleration")
provenance("abyssal-well:AW-HIST-033", "type-vocabulary", "ABYSSAL_WELL_CONFIG", "AW-HIST-033 uses context-or-provenance-not-behavior: ABYSSAL_WELL_CONFIG inventories tuning constants without establishing one transportable behavior.")
provenance("abyssal-well:AW-HIST-034", "type-vocabulary", "Three difficulties", "AW-HIST-034 uses context-or-provenance-not-behavior: Three difficulties enumerate content and speed presets rather than an atomic runtime transition.")
provenance("abyssal-well:AW-HIST-035", "transport-or-api-wiring", "/api/v1/games/abyssal-well/complete", "AW-HIST-035 uses context-or-provenance-not-behavior: /api/v1/games/abyssal-well/complete names host payload wiring, not portable domain behavior.")
insufficient("abyssal-well:AW-HIST-042", "while held", "continuous rotation at 2.4 rad/s while held", "firing rate-limited to one projectile per 300ms", "AW-HIST-042 uses complete-behavior-no-cross-game-counterpart: while held, continuous rotation at 2.4 rad/s while held accompanies firing rate-limited to one projectile per 300ms, a bespoke cadence policy.", "held rotation with projectile fire-rate limit")
provenance("abyssal-well:AW-HIST-060", "negative-search", "returns zero commits", "AW-HIST-060 uses context-or-provenance-not-behavior: returns zero commits records a bounded historical absence search and supplies no executable mechanic.")
provenance("abyssal-well:AW-HIST-061", "test-fixture-or-test-id", "E2E helper module", "AW-HIST-061 uses context-or-provenance-not-behavior: E2E helper module describes deleted test support rather than player-visible state behavior.")

# Alchemists Synthesis: three individually reviewed context records.
insufficient("alchemists-synthesis:AS-STATE-001", "the selected difficulty", "State creation selects maxRounds as 5 for easy, 7 for normal, and 10 for hard", "initializes idle status, zero score and answer counters, round 1, and the selected difficulty", "AS-STATE-001 uses complete-behavior-no-cross-game-counterpart: State creation selects maxRounds as 5 for easy, 7 for normal, and 10 for hard, coupling the selected difficulty to a bespoke round initialization.", "difficulty-dependent round-count initialization")
provenance("alchemists-synthesis:AS-UI-001", "ui-render-scaffolding", "initializes game state", "AS-UI-001 uses context-or-provenance-not-behavior: initializes game state only identifies a component call site and its default selection.")
insufficient("alchemists-synthesis:AS-UI-002", "when the new status is victory or gameover", "Selecting an option calls handleAnswer", "calls onComplete with calculated results", "AS-UI-002 uses complete-behavior-no-cross-game-counterpart: when the new status is victory or gameover, Selecting an option calls handleAnswer and calls onComplete with calculated results without fire-once evidence.", "unguarded terminal result callback")

# Archers Revenge: twenty-nine individually reviewed context records.
fragment("archers-revenge:AR-B2-V8-008", "totalEnemies", "AR-B2-V8-008 uses incomplete-behavioral-anchors: totalEnemies is one arithmetic assignment without a formation precondition or observable lifecycle result.")
fragment("archers-revenge:AR-B2-V8-009", "repeats its loop", "AR-B2-V8-009 uses incomplete-behavioral-anchors: repeats its loop exposes a fill-loop condition but not the completed enemy-placement behavior.")
fragment("archers-revenge:AR-B2-V8-010", "targetIndex", "AR-B2-V8-010 uses incomplete-behavioral-anchors: targetIndex is a single derived index with neither selection trigger nor downstream shield outcome.")
fragment("archers-revenge:AR-B2-V8-011", "shieldUp", "AR-B2-V8-011 uses incomplete-behavioral-anchors: shieldUp records one per-enemy field assignment, not a full collision or target transition.")
provenance("archers-revenge:AR-B2-V8-013", "type-vocabulary", "status literal playing", "AR-B2-V8-013 uses context-or-provenance-not-behavior: status literal playing identifies an initializer value without a state-change contract.")
fragment("archers-revenge:AR-B2-V8-015", "negative configured arrow speed", "AR-B2-V8-015 uses incomplete-behavioral-anchors: negative configured arrow speed is a projectile-field fragment without firing eligibility or impact outcome.")
fragment("archers-revenge:AR-B2-V8-016", "subtracts dt", "AR-B2-V8-016 uses incomplete-behavioral-anchors: subtracts dt only reveals timer arithmetic and omits the expiry transition it may eventually enable.")
fragment("archers-revenge:AR-B2-V8-017", "newTargetIndex", "AR-B2-V8-017 uses incomplete-behavioral-anchors: newTargetIndex is an isolated historical calculation without the full retargeting effect.")
fragment("archers-revenge:AR-B2-V8-018", "selects newTarget", "AR-B2-V8-018 uses incomplete-behavioral-anchors: selects newTarget names one lookup step while leaving its trigger and player-visible result unstated.")
fragment("archers-revenge:AR-B2-V8-019", "targetWord.term", "AR-B2-V8-019 uses incomplete-behavioral-anchors: targetWord.term is one field copy in a larger target update, not an independent behavior.")
fragment("archers-revenge:AR-B2-V8-020", "targetWord.translation", "AR-B2-V8-020 uses incomplete-behavioral-anchors: targetWord.translation supplies the companion field assignment but no complete transition boundary.")
fragment("archers-revenge:AR-B2-V8-021", "prior y plus moveY", "AR-B2-V8-021 uses incomplete-behavioral-anchors: prior y plus moveY is a movement integration fragment without bounds, phase gate, or collision outcome.")
insufficient("archers-revenge:AR-B2-V8-022", "when its formation-bottom guard is true", "The historical tick returns status defeat", "status defeat", "AR-B2-V8-022 uses complete-behavior-no-cross-game-counterpart: when its formation-bottom guard is true, The historical tick returns status defeat under an isolated invader-depth rule.", "formation-bottom breach defeat")
fragment("archers-revenge:AR-B2-V8-023", "retains arrows whose y is greater than zero", "AR-B2-V8-023 uses incomplete-behavioral-anchors: retains arrows whose y is greater than zero is an off-screen filter fragment without the projectile lifecycle around it.")
fragment("archers-revenge:AR-B2-V8-024", "dx and dy half-size comparisons", "AR-B2-V8-024 uses incomplete-behavioral-anchors: dx and dy half-size comparisons disclose a predicate shape but not the complete collision consequence.")
fragment("archers-revenge:AR-B2-V8-025", "increments correctAnswers by one", "AR-B2-V8-025 uses incomplete-behavioral-anchors: increments correctAnswers by one is only one shield-down collision effect, lacking its trigger and remaining state changes.")
fragment("archers-revenge:AR-B2-V8-026", "newProjectiles push operation", "AR-B2-V8-026 uses incomplete-behavioral-anchors: newProjectiles push operation proves retaliation construction began but not the projectile behavior produced.")
fragment("archers-revenge:AR-B2-V8-027", "enemy.projectileSpeed", "AR-B2-V8-027 uses incomplete-behavioral-anchors: enemy.projectileSpeed is a velocity source assignment rather than a complete retaliation transition.")
fragment("archers-revenge:AR-B2-V8-028", "decrements hp by one", "AR-B2-V8-028 uses incomplete-behavioral-anchors: decrements hp by one captures damage arithmetic but no eligibility guard or terminal result.")
fragment("archers-revenge:AR-B2-V8-029", "wave equal to nextWaveNum", "AR-B2-V8-029 uses incomplete-behavioral-anchors: wave equal to nextWaveNum is a return-field fragment with no wave-advance precondition.")
fragment("archers-revenge:AR-B2-V8-030", "literal 1", "AR-B2-V8-030 uses incomplete-behavioral-anchors: literal 1 documents an XP clamp argument without enough formula context to establish result accounting.")
fragment("archers-revenge:AR-B2-V8-031", "literal 10", "AR-B2-V8-031 uses incomplete-behavioral-anchors: literal 10 records the opposite XP bound but still lacks inputs, calculation, and returned outcome.")
fragment("archers-revenge:AR-B2-V8-033", "pointerPosition.x divided by scale", "AR-B2-V8-033 uses incomplete-behavioral-anchors: pointerPosition.x divided by scale is coordinate conversion alone, not a resolved semantic action.")
provenance("archers-revenge:AR-B2-V8-035", "transport-or-api-wiring", "correctAnswers", "AR-B2-V8-035 uses context-or-provenance-not-behavior: correctAnswers names one completion-request field and contains no domain calculation.")
provenance("archers-revenge:AR-B2-V8-036", "transport-or-api-wiring", "totalAttempts", "AR-B2-V8-036 uses context-or-provenance-not-behavior: totalAttempts is another serialized request property rather than a mechanic transition.")
provenance("archers-revenge:AR-B2-V8-037", "transport-or-api-wiring", "accuracy", "AR-B2-V8-037 uses context-or-provenance-not-behavior: accuracy only confirms payload plumbing and does not define how the measure is derived.")
provenance("archers-revenge:AR-B2-V8-038", "transport-or-api-wiring", "score", "AR-B2-V8-038 uses context-or-provenance-not-behavior: score appears as a completion body field with no reusable scoring rule attached.")
provenance("archers-revenge:AR-B2-V8-039", "transport-or-api-wiring", "timeTaken", "AR-B2-V8-039 uses context-or-provenance-not-behavior: timeTaken establishes transport shape only, not timing accumulation behavior.")
provenance("archers-revenge:AR-B2-V8-040", "transport-or-api-wiring", "difficulty", "AR-B2-V8-040 uses context-or-provenance-not-behavior: difficulty closes the request-field inventory without exposing difficulty policy.")

# Astral Mage: four individually reviewed context records.
fragment("astral-mage:AM-HIST-003", "stable sentence-index/token-index target ID", "AM-HIST-003 uses incomplete-behavioral-anchors: stable sentence-index/token-index target ID describes seeded identity construction without a triggering transition or gameplay outcome.")
provenance("astral-mage:AM-HIST-007", "ui-render-scaffolding", "960 by 540 zero-gravity Arcade Physics scene", "AM-HIST-007 uses context-or-provenance-not-behavior: 960 by 540 zero-gravity Arcade Physics scene records deleted renderer configuration rather than backend-neutral behavior.")
provenance("astral-mage:AM-HIST-009", "ui-render-scaffolding", "one interactive body and label per target", "AM-HIST-009 uses context-or-provenance-not-behavior: one interactive body and label per target is scene presentation and pointer hookup, not the target-resolution rule.")
insufficient("astral-mage:AM-HIST-010", "on overlap", "checked swept-path distance", "resolved only the intended target on overlap", "AM-HIST-010 uses complete-behavior-no-cross-game-counterpart: on overlap, the scene checked swept-path distance and resolved only the intended target on overlap, a game-specific combat contract.", "intended-target swept projectile resolution")

# Babel Architect: seven individually reviewed context records.
provenance("babel-architect:BA-HIST-001", "type-vocabulary", "playing/victory/defeat phases", "BA-HIST-001 uses context-or-provenance-not-behavior: playing/victory/defeat phases belong to a historical type inventory, not one executable state change.")
provenance("babel-architect:BA-HIST-002", "type-vocabulary", "Historical presets", "BA-HIST-002 uses context-or-provenance-not-behavior: Historical presets enumerate tuning knobs while leaving their runtime transition sites unstated.")
insufficient("babel-architect:BA-HIST-003", "for the first sentence", "Historical state creation filters empty terms", "starts playing at stability 100", "BA-HIST-003 uses complete-behavior-no-cross-game-counterpart: for the first sentence, Historical state creation filters empty terms and starts playing at stability 100 rather than enforcing reject-empty behavior.", "filter-empty state initialization with stability")
provenance("babel-architect:BA-HIST-006", "transport-or-api-wiring", "emits accuracy, counts, duration, victory", "BA-HIST-006 uses context-or-provenance-not-behavior: canonical completion shape describes emitted result fields without proving an atomic XP computation or guard.")
provenance("babel-architect:BA-HIST-008", "provenance-location", "dumb renderer", "BA-HIST-008 uses context-or-provenance-not-behavior: dumb renderer is an architecture-ownership statement separating the deleted scene from rules.")
provenance("babel-architect:BA-HIST-009", "ui-render-scaffolding", "vertical tower", "BA-HIST-009 uses context-or-provenance-not-behavior: vertical tower records how blocks were reconciled visually, not how learning state changed.")
provenance("babel-architect:BA-HIST-010", "ui-render-scaffolding", "start, playing, and ended UI phases", "BA-HIST-010 uses context-or-provenance-not-behavior: start, playing, and ended UI phases describe shell state and defaults rather than a reusable reset operation.")

# Devourer Slime: nine individually reviewed context records.
provenance("devourer-slime:DS-CL-C-002", "transport-or-api-wiring", "/api/v1/games/devourer-slime/sentences", "DS-CL-C-002 uses context-or-provenance-not-behavior: /api/v1/games/devourer-slime/sentences is a host fetch location, not a domain transition.")
provenance("devourer-slime:DS-CL-C-003", "transport-or-api-wiring", "completion endpoint", "DS-CL-C-003 uses context-or-provenance-not-behavior: completion endpoint records serialized result fields without their calculation contract.")
insufficient("devourer-slime:DS-CL-C-007", "While phase is playing", "the current component uses useInterval, moves on nonzero input", "ends when the ticked phase is not playing", "DS-CL-C-007 uses complete-behavior-no-cross-game-counterpart: While phase is playing, the interval ticks by 16.6 and ends when the ticked phase is not playing, a fixed-step component scheduler not shared by the threshold atom.", "fixed-step component interval scheduler")
provenance("devourer-slime:DS-CL-C-009", "ui-render-scaffolding", "fixed viewport dimensions", "DS-CL-C-009 uses context-or-provenance-not-behavior: fixed viewport dimensions and layer offsets describe camera rendering rather than target-indicator behavior.")
provenance("devourer-slime:DS-CL-C-010", "ui-render-scaffolding", "four pointer-down handlers", "DS-CL-C-010 uses context-or-provenance-not-behavior: four pointer-down handlers identifies virtual-control rendering without a complete normalization result.")
provenance("devourer-slime:DS-CL-H-002", "transport-or-api-wiring", "NO_SENTENCES and INSUFFICIENT_SENTENCES warnings", "DS-CL-H-002 uses context-or-provenance-not-behavior: NO_SENTENCES and INSUFFICIENT_SENTENCES warnings belong to historical fetch handling, not game rules.")
fragment("devourer-slime:DS-CL-H-003", "computed XP and accuracy", "DS-CL-H-003 uses incomplete-behavioral-anchors: computed XP and accuracy names historical result work but omits the inputs and exact formula.")
fragment("devourer-slime:DS-CL-H-004", "called movement and tick functions from a 16.6 ms interval while playing", "DS-CL-H-004 uses incomplete-behavioral-anchors: called movement and tick functions from a 16.6 ms interval while playing does not state the terminal outcome of that schedule.")
provenance("devourer-slime:DS-CL-H-005", "ui-render-scaffolding", "start, ended, and playing branches", "DS-CL-H-005 uses context-or-provenance-not-behavior: start, ended, and playing branches inventory deleted surfaces and viewport controls.")

# PER_GAME_CONTEXT_DECISIONS

# RPG Battle remaining controls and dependency provenance: twelve individually reviewed records.
provenance("rpg-battle:RPG-CTL-002", "ui-render-scaffolding", "disabled = inputLocked || turn !== 'player' || status !== 'playing'", "RPG-CTL-002 uses context-or-provenance-not-behavior: disabled = inputLocked || turn !== 'player' || status !== 'playing' governs form availability around the selected submit action.")
provenance("rpg-battle:RPG-CTL-003", "ui-render-scaffolding", "input auto-focuses whenever the menu becomes enabled", "RPG-CTL-003 uses context-or-provenance-not-behavior: input auto-focuses whenever the menu becomes enabled is browser focus management.")
provenance("rpg-battle:RPG-CTL-005", "ui-render-scaffolding", "StartScreen tab switching is click-driven", "RPG-CTL-005 uses context-or-provenance-not-behavior: StartScreen tab switching is click-driven alongside ranking choice and start-button UI wiring.")
provenance("rpg-battle:RPG-CTL-006", "negative-search", "No keyboard event handlers", "RPG-CTL-006 uses context-or-provenance-not-behavior: No keyboard event handlers is a bounded baseline search result rather than a key behavior.")
provenance("rpg-battle:RPG-CTL-007", "ui-render-scaffolding", "backToGames", "RPG-CTL-007 uses context-or-provenance-not-behavior: backToGames is a sealed registry navigation Link rendered above every page state.")
provenance("rpg-battle:RPG-CTL-008", "ui-render-scaffolding", "onRestart callback wired to handleRestart", "RPG-CTL-008 uses context-or-provenance-not-behavior: onRestart callback wired to handleRestart records end-screen button wiring; the restart bundle is separately incomplete registry evidence.")
provenance("rpg-battle:RPG-CTL-009", "transport-or-api-wiring", "/api/v1/games/rpg-battle/ranking", "RPG-CTL-009 uses context-or-provenance-not-behavior: /api/v1/games/rpg-battle/ranking is a sealed registry fetch activated by the rankings tab.")
provenance("rpg-battle:RPG-GRAPH-001", "provenance-location", "imports useRPGBattleStore", "RPG-GRAPH-001 uses context-or-provenance-not-behavior: imports useRPGBattleStore heads a complete page dependency inventory across rules, components, hooks, and UI.")
provenance("rpg-battle:RPG-GRAPH-002", "provenance-location", "imports BattleEnemyId/BattleHeroId/BattleLocationId types", "RPG-GRAPH-002 uses context-or-provenance-not-behavior: imports BattleEnemyId/BattleHeroId/BattleLocationId types and base-path helpers record library graph edges.")
provenance("rpg-battle:RPG-GRAPH-003", "provenance-location", "imports the BattleLogEntry type", "RPG-GRAPH-003 uses context-or-provenance-not-behavior: imports the BattleLogEntry type and selection/scaling types records component-to-store and component-to-lib edges.")
provenance("rpg-battle:RPG-GRAPH-004", "negative-search", "NOT among the 60 rpg-battle-path denominator files", "RPG-GRAPH-004 uses context-or-provenance-not-behavior: NOT among the 60 rpg-battle-path denominator files records a path-token denominator limitation and graph reachability.")
provenance("rpg-battle:RPG-GRAPH-005", "provenance-location", "negative/failure evidence only", "RPG-GRAPH-005 uses context-or-provenance-not-behavior: negative/failure evidence only preserves quarantine truth and confirms the failed artifact was not a ledger input.")

# RPG Battle non-selected mechanic evidence: twenty-three individually reviewed records.
provenance("rpg-battle:RPG-MECH-001", "type-vocabulary", "ACTION_COUNT = 3", "RPG-MECH-001 uses context-or-provenance-not-behavior: ACTION_COUNT = 3 heads a page constants inventory for damage and maximum-turn inputs.")
provenance("rpg-battle:RPG-MECH-002", "negative-search", "No code enforces a turn limit", "RPG-MECH-002 uses context-or-provenance-not-behavior: No code enforces a turn limit records that MAX_TURNS only feeds XP and does not end battle.")
insufficient("rpg-battle:RPG-MECH-003", "power === 'power'", "Correct-answer damage = (power === 'power' ? POWER_DAMAGE : BASIC_DAMAGE) + Math.floor(streak / 2)", "Math.floor(streak / 2)", "RPG-MECH-003 uses complete-behavior-no-cross-game-counterpart: attack power selects base damage and every two streak points add a floored bonus.", "power-tier and streak correct-answer damage")
insufficient("rpg-battle:RPG-MECH-004", "when that value is > 0", "Post-damage enemy health is computed as Math.max(0, enemyHealth - damage)", "the enemy counterattack fires only when that value is > 0", "RPG-MECH-004 uses complete-behavior-no-cross-game-counterpart: post-damage health is floored at zero and only a surviving enemy counterattacks.", "survival-gated enemy counterattack")
insufficient("rpg-battle:RPG-MECH-005", "baseHealth = BASE_ENEMY_HEALTH = 100", "scaleEnemyHealth(multiplier, baseHealth = BASE_ENEMY_HEALTH = 100) returns Math.round(baseHealth * multiplier)", "Math.round(baseHealth * multiplier)", "RPG-MECH-005 uses complete-behavior-no-cross-game-counterpart: base enemy health is multiplied by the selected enemy factor and rounded to an integer.", "multiplier-scaled enemy health")
insufficient("rpg-battle:RPG-MECH-006", "BASE_ENEMY_DAMAGE_MIN = 6 and BASE_ENEMY_DAMAGE_MAX = 10", "getEnemyDamageRange returns { min: 6, max: max(6, round(10 * multiplier)) }", "rollEnemyDamage returns a uniform integer in that inclusive range", "RPG-MECH-006 uses complete-behavior-no-cross-game-counterpart: fixed base bounds and enemy multiplier produce an inclusive integer damage range and uniform roll.", "multiplier-scaled uniform enemy damage")
provenance("rpg-battle:RPG-MECH-007", "type-vocabulary", "four enemies with multipliers", "RPG-MECH-007 uses context-or-provenance-not-behavior: four enemies with multipliers enumerate content and scaling presets rather than selecting an enemy.")
provenance("rpg-battle:RPG-MECH-008", "type-vocabulary", "two cosmetic heroes", "RPG-MECH-008 uses context-or-provenance-not-behavior: two cosmetic heroes and four background locations define selection content and assets.")
insufficient("rpg-battle:RPG-MECH-011", "each vocabulary word", "selectBattleActions weights each vocabulary word by MIN_WEIGHT (0.25) + difficulty", "selection is weighted-random without replacement up to count", "RPG-MECH-011 uses complete-behavior-no-cross-game-counterpart: word accuracy derives difficulty and action power before weighted, non-repeating action selection.", "performance-weighted battle-action sampling")
insufficient("rpg-battle:RPG-MECH-012", "for an unmatched typed answer", "the action with power 'power'", "the miss is recorded against that fallback term", "RPG-MECH-012 uses complete-behavior-no-cross-game-counterpart: an unmatched typed answer is attributed to the power action or first action and records the miss against that fallback.", "unmatched-answer fallback attribution")
insufficient("rpg-battle:RPG-MECH-013", "after trim + lowercase normalization", "Answer matching is exact", "exact after trim + lowercase normalization of both the input and the expected translation", "RPG-MECH-013 uses complete-behavior-no-cross-game-counterpart: answer matching normalizes whitespace and case on typed input and expected translation before exact equality.", "trimmed case-folded translation matching")
insufficient("rpg-battle:RPG-MECH-014", "when there were no attempts", "Accuracy at battle end = totalCorrect / totalAttempts", "0 when there were no attempts", "RPG-MECH-014 uses complete-behavior-no-cross-game-counterpart: battle accuracy aggregates the performance map and explicitly returns zero for no attempts.", "zero-safe battle accuracy aggregation")
insufficient("rpg-battle:RPG-MECH-015", "when sent to the completion API", "turnsTaken is clamped to a minimum of 1 when sent to the completion API", "to the XP formula", "RPG-MECH-015 uses complete-behavior-no-cross-game-counterpart: turnsTaken is clamped to at least one for both completion transport and XP formula input.", "minimum-one turn count for results")
provenance("rpg-battle:RPG-MECH-017", "ui-render-scaffolding", "COMBO x{streak}", "RPG-MECH-017 uses context-or-provenance-not-behavior: COMBO x{streak} is a conditional badge rendered only for streaks of two or more.")
provenance("rpg-battle:RPG-MECH-018", "ui-render-scaffolding", "does not alter damage", "RPG-MECH-018 uses context-or-provenance-not-behavior: does not alter damage confirms the randomized CRITICAL text is cosmetic feedback only.")
provenance("rpg-battle:RPG-MECH-019", "ui-render-scaffolding", "spoken via window.speechSynthesis", "RPG-MECH-019 uses context-or-provenance-not-behavior: spoken via window.speechSynthesis with fixed language and rate is guarded audio feedback after a correct answer.")
provenance("rpg-battle:RPG-MECH-020", "negative-search", "There is no mana/MP system", "RPG-MECH-020 uses context-or-provenance-not-behavior: There is no mana/MP system is a bounded baseline grep result and the exact conflict ref for pending RPG-NEG-001.")
provenance("rpg-battle:RPG-MECH-021", "negative-search", "There is no defend/guard action available to the player", "RPG-MECH-021 uses context-or-provenance-not-behavior: There is no defend/guard action available to the player is a producer search despite a declared pose.")
provenance("rpg-battle:RPG-MECH-022", "transport-or-api-wiring", "completion POST body contains xp, accuracy, totalAttempts", "RPG-MECH-022 uses context-or-provenance-not-behavior: completion POST body contains xp, accuracy, totalAttempts and selection/outcome fields as serialized transport.")
provenance("rpg-battle:RPG-MECH-023", "transport-or-api-wiring", "deliberately does not persist", "RPG-MECH-023 uses context-or-provenance-not-behavior: deliberately does not persist distinguishes the mock completion route's validation and calculated response from production storage.")
provenance("rpg-battle:RPG-MECH-024", "transport-or-api-wiring", "'INSUFFICIENT_VOCABULARY' with requiredCount 5", "RPG-MECH-024 uses context-or-provenance-not-behavior: 'INSUFFICIENT_VOCABULARY' with requiredCount 5 is vocabulary-route warning transport, not page admission.")
provenance("rpg-battle:RPG-MECH-025", "test-fixture-or-test-id", "25 Thai->English term/translation pairs", "RPG-MECH-025 uses context-or-provenance-not-behavior: 25 Thai->English term/translation pairs are static sample route content.")
provenance("rpg-battle:RPG-MECH-027", "ui-render-scaffolding", "menuActions maps the 3 selected BattleActions", "RPG-MECH-027 uses context-or-provenance-not-behavior: menuActions maps the 3 selected BattleActions into display IDs, labels, and power fields.")

# RPG Battle non-selected transition evidence: twelve individually reviewed records.
insufficient("rpg-battle:RPG-TR-005", "on a correct (case-insensitive, trimmed) match", "inputLocked=false, revealedTranslation=null, streak+1", "returns true", "RPG-TR-005 uses complete-behavior-no-cross-game-counterpart: a normalized correct answer unlocks input, clears revealed translation, increments streak, selects an attack pose, and returns true.", "correct-answer streak and attack-pose transition")
insufficient("rpg-battle:RPG-TR-010", "resetSelection", "returns selectionStep to 'hero'", "clears all three selected ids", "RPG-TR-010 uses complete-behavior-no-cross-game-counterpart: resetSelection returns the wizard to hero choice and clears hero, location, and enemy IDs.", "battle-selection wizard reset")
insufficient("rpg-battle:RPG-TR-011", "when selectionStep === 'ready' with hero and enemy chosen", "resolves sprites and calls initializeBattle", "enemyMaxHealth: scaleEnemyHealth(enemy.multiplier)", "RPG-TR-011 uses complete-behavior-no-cross-game-counterpart: a ready, complete selection resolves sprites and dispatches initializeBattle with scaled enemy health, but its reset effects live in another fact.", "selection-ready battle initialization dispatch")
insufficient("rpg-battle:RPG-TR-012", "triggerEnemyTurn", "rolls enemy damage via rollEnemyDamage(enemyMultiplier), sets turn to 'enemy'", "logs 'Enemy strikes back!'", "RPG-TR-012 uses complete-behavior-no-cross-game-counterpart: triggerEnemyTurn rolls and delays enemy damage, updates combat effects and counters, logs the strike, and plays its sound.", "delayed enemy counterattack orchestration")
insufficient("rpg-battle:RPG-TR-014", "On a matched answer", "handleSubmit computes damage, calls submitAnswer", "triggers the enemy turn only if the enemy survives", "RPG-TR-014 uses complete-behavior-no-cross-game-counterpart: On a matched answer, handleSubmit orchestrates speech, performance, damage, effects, and a survival-gated enemy turn.", "matched-spell player attack orchestration")
insufficient("rpg-battle:RPG-TR-016", "when status becomes 'victory' or 'defeat'", "computes accuracy, computes base XP via calculateRpgBattleXp", "reveals the results screen after a 1200ms timeout", "RPG-TR-016 uses complete-behavior-no-cross-game-counterpart: terminal status computes, scales, and persists results before a delayed reveal, but the fact provides no fire-once guard for t02.", "unguarded delayed terminal result persistence")
fragment("rpg-battle:RPG-TR-017", "resets all page-local states", "RPG-TR-017 uses incomplete-behavioral-anchors: resets all page-local states is sealed registry evidence for a broad restart bundle but does not prove reset-before-active-play.")
provenance("rpg-battle:RPG-TR-018", "ui-render-scaffolding", "sets showStartScreen false and enters fullscreen", "RPG-TR-018 uses context-or-provenance-not-behavior: sets showStartScreen false and enters fullscreen changes host surfaces without initializing battle state.")
insufficient("rpg-battle:RPG-TR-019", "whenever vocabulary is loaded and the start screen is not showing", "calls resetSelection() and setStatus('idle')", "setStatus('idle')", "RPG-TR-019 uses complete-behavior-no-cross-game-counterpart: loaded vocabulary while the start screen is hidden resets selection and forces idle, rather than entering active play.", "loaded-vocabulary hidden-screen idle reset")
provenance("rpg-battle:RPG-TR-020", "negative-search", "three unresolved transition write candidates", "RPG-TR-020 uses context-or-provenance-not-behavior: three unresolved transition write candidates record denominator uncertainty for advantage-host flashTone writes.")
provenance("rpg-battle:RPG-TR-021", "negative-search", "same three flashTone write candidates", "RPG-TR-021 uses context-or-provenance-not-behavior: same three flashTone write candidates reconcile reading-host offsets while remaining unproven transitions.")
provenance("rpg-battle:RPG-TR-022", "negative-search", "zero proven transitions for RPG Battle", "RPG-TR-022 uses context-or-provenance-not-behavior: zero proven transitions for RPG Battle is a T2 denominator result with six unresolved writes, not runtime behavior.")

# RPG Battle scene and state-vocabulary evidence: fifty-seven individually reviewed records.
provenance("rpg-battle:RPG-SC-001", "provenance-location", "BattleScene is declared as a React component", "RPG-SC-001 uses context-or-provenance-not-behavior: BattleScene is declared as a React component and records the denominator scene occurrence and source location.")
provenance("rpg-battle:RPG-SC-002", "provenance-location", "StartScreen is declared as a React component", "RPG-SC-002 uses context-or-provenance-not-behavior: StartScreen is declared as a React component and establishes a second scene location.")
provenance("rpg-battle:RPG-SC-003", "provenance-location", "identical cited-range hash", "RPG-SC-003 uses context-or-provenance-not-behavior: identical cited-range hash reconciles the reading-host BattleScene declaration with the advantage host.")
provenance("rpg-battle:RPG-SC-004", "provenance-location", "declaration shifts by two lines", "RPG-SC-004 uses context-or-provenance-not-behavior: declaration shifts by two lines because of host-specific imports and records copy provenance.")
provenance("rpg-battle:RPG-SC-005", "ui-render-scaffolding", "role='dialog', aria-modal='true'", "RPG-SC-005 uses context-or-provenance-not-behavior: role='dialog', aria-modal='true' and the step-driven null branch describe selection-modal rendering.")
provenance("rpg-battle:RPG-SC-006", "ui-render-scaffolding", "renders GameEndScreen", "RPG-SC-006 uses context-or-provenance-not-behavior: renders GameEndScreen when results and terminal status agree, mapping existing result state to a surface.")
provenance("rpg-battle:RPG-SC-007", "ui-render-scaffolding", "Loader2 spinner", "RPG-SC-007 uses context-or-provenance-not-behavior: Loader2 spinner and loading copy form the isLoading presentation branch.")
provenance("rpg-battle:RPG-SC-008", "ui-render-scaffolding", "destructive Alert", "RPG-SC-008 uses context-or-provenance-not-behavior: destructive Alert and save-tip copy form the error presentation branch.")
provenance("rpg-battle:RPG-SC-009", "ui-render-scaffolding", "showStartScreen && vocabulary.length > 0 && status === 'idle'", "RPG-SC-009 uses context-or-provenance-not-behavior: showStartScreen && vocabulary.length > 0 && status === 'idle' is a render gate, not a vocabulary admission operation.")
provenance("rpg-battle:RPG-SC-010", "ui-render-scaffolding", "BattleEffects > BattleScene", "RPG-SC-010 uses context-or-provenance-not-behavior: BattleEffects > BattleScene renders only in the nonterminal, non-start UI branch.")
provenance("rpg-battle:RPG-ST-001", "type-vocabulary", "SpritePose literal 'idle'", "RPG-ST-001 uses context-or-provenance-not-behavior: SpritePose literal 'idle' is a denominator-recorded member of a presentation-state union.")
provenance("rpg-battle:RPG-ST-002", "type-vocabulary", "SpritePose literal 'casting'", "RPG-ST-002 uses context-or-provenance-not-behavior: SpritePose literal 'casting' declares one visual pose without a producer transition.")
provenance("rpg-battle:RPG-ST-003", "type-vocabulary", "SpritePose literal 'basic-attack'", "RPG-ST-003 uses context-or-provenance-not-behavior: SpritePose literal 'basic-attack' is one member of the sprite pose vocabulary.")
provenance("rpg-battle:RPG-ST-004", "type-vocabulary", "SpritePose literal 'power-attack'", "RPG-ST-004 uses context-or-provenance-not-behavior: SpritePose literal 'power-attack' declares a visual state without its answer trigger.")
provenance("rpg-battle:RPG-ST-005", "type-vocabulary", "SpritePose literal 'hurt'", "RPG-ST-005 uses context-or-provenance-not-behavior: SpritePose literal 'hurt' is a denominator state occurrence, not the damage transition.")
provenance("rpg-battle:RPG-ST-006", "type-vocabulary", "SpritePose literal 'miss'", "RPG-ST-006 uses context-or-provenance-not-behavior: SpritePose literal 'miss' names a presentation state without incorrect-answer behavior.")
provenance("rpg-battle:RPG-ST-007", "type-vocabulary", "SpritePose literal 'defend'", "RPG-ST-007 uses context-or-provenance-not-behavior: SpritePose literal 'defend' belongs to the renderer union despite the separately recorded lack of a producer.")
provenance("rpg-battle:RPG-ST-008", "type-vocabulary", "SpritePose literal 'victory'", "RPG-ST-008 uses context-or-provenance-not-behavior: SpritePose literal 'victory' declares an end pose without the victory predicate.")
provenance("rpg-battle:RPG-ST-009", "type-vocabulary", "SpritePose literal 'defeat'", "RPG-ST-009 uses context-or-provenance-not-behavior: SpritePose literal 'defeat' is the final member of the sprite pose union.")
provenance("rpg-battle:RPG-ST-010", "type-vocabulary", "BattlePose literal 'idle'", "RPG-ST-010 uses context-or-provenance-not-behavior: BattlePose literal 'idle' is a sealed registry member of the store-side pose union.")
provenance("rpg-battle:RPG-ST-011", "type-vocabulary", "BattlePose literal 'casting'", "RPG-ST-011 uses context-or-provenance-not-behavior: BattlePose literal 'casting' is registry-recorded type vocabulary only.")
provenance("rpg-battle:RPG-ST-012", "type-vocabulary", "BattlePose literal 'basic-attack'", "RPG-ST-012 uses context-or-provenance-not-behavior: BattlePose literal 'basic-attack' records a store-side pose member without an action.")
provenance("rpg-battle:RPG-ST-013", "type-vocabulary", "BattlePose literal 'power-attack'", "RPG-ST-013 uses context-or-provenance-not-behavior: BattlePose literal 'power-attack' is a sealed registry type declaration.")
provenance("rpg-battle:RPG-ST-014", "type-vocabulary", "BattlePose literal 'hurt'", "RPG-ST-014 uses context-or-provenance-not-behavior: BattlePose literal 'hurt' names a store pose but supplies no damage rule.")
provenance("rpg-battle:RPG-ST-015", "type-vocabulary", "BattlePose literal 'miss'", "RPG-ST-015 uses context-or-provenance-not-behavior: BattlePose literal 'miss' is registry vocabulary and not the mismatch branch itself.")
provenance("rpg-battle:RPG-ST-016", "type-vocabulary", "BattlePose literal 'defend'", "RPG-ST-016 uses context-or-provenance-not-behavior: BattlePose literal 'defend' remains a declared but unproduced pose value.")
provenance("rpg-battle:RPG-ST-017", "type-vocabulary", "BattlePose literal 'victory'", "RPG-ST-017 uses context-or-provenance-not-behavior: BattlePose literal 'victory' is a store-side end-pose member.")
provenance("rpg-battle:RPG-ST-018", "type-vocabulary", "BattlePose literal 'defeat'", "RPG-ST-018 uses context-or-provenance-not-behavior: BattlePose literal 'defeat' closes the store pose vocabulary.")
provenance("rpg-battle:RPG-ST-019", "type-vocabulary", "'idle' | 'playing' | 'victory' | 'defeat'", "RPG-ST-019 uses context-or-provenance-not-behavior: 'idle' | 'playing' | 'victory' | 'defeat' is the sealed BattleStatus union.")
provenance("rpg-battle:RPG-ST-020", "type-vocabulary", "BattleStatus literal 'idle'", "RPG-ST-020 uses context-or-provenance-not-behavior: BattleStatus literal 'idle' is a registry-recorded union member.")
provenance("rpg-battle:RPG-ST-021", "type-vocabulary", "BattleStatus literal 'playing'", "RPG-ST-021 uses context-or-provenance-not-behavior: BattleStatus literal 'playing' names one state without its initialization transition.")
provenance("rpg-battle:RPG-ST-022", "type-vocabulary", "BattleStatus literal 'victory'", "RPG-ST-022 uses context-or-provenance-not-behavior: BattleStatus literal 'victory' is type vocabulary rather than a health threshold.")
provenance("rpg-battle:RPG-ST-023", "type-vocabulary", "BattleStatus literal 'defeat'", "RPG-ST-023 uses context-or-provenance-not-behavior: BattleStatus literal 'defeat' is registry vocabulary without a producer fact.")
provenance("rpg-battle:RPG-ST-024", "type-vocabulary", "'player' | 'enemy'", "RPG-ST-024 uses context-or-provenance-not-behavior: 'player' | 'enemy' declares the BattleTurn union and its initializer.")
provenance("rpg-battle:RPG-ST-025", "type-vocabulary", "BattleTurn literal 'player'", "RPG-ST-025 uses context-or-provenance-not-behavior: BattleTurn literal 'player' is the registry-recorded initial and post-initialize turn value.")
provenance("rpg-battle:RPG-ST-026", "type-vocabulary", "BattleTurn literal 'enemy'", "RPG-ST-026 uses context-or-provenance-not-behavior: BattleTurn literal 'enemy' records a registry assignment site without the counterattack sequence.")
provenance("rpg-battle:RPG-ST-027", "type-vocabulary", "'basic' | 'power'", "RPG-ST-027 uses context-or-provenance-not-behavior: 'basic' | 'power' declares attack power and its basic default.")
provenance("rpg-battle:RPG-ST-028", "type-vocabulary", "ActionPower is independently defined", "RPG-ST-028 uses context-or-provenance-not-behavior: ActionPower is independently defined as the same two-value union in two files.")
provenance("rpg-battle:RPG-ST-029", "type-vocabulary", "'hero' | 'location' | 'enemy' | 'ready'", "RPG-ST-029 uses context-or-provenance-not-behavior: 'hero' | 'location' | 'enemy' | 'ready' declares wizard steps and their initial value.")
provenance("rpg-battle:RPG-ST-030", "type-vocabulary", "BattleSelectionStep literal 'hero'", "RPG-ST-030 uses context-or-provenance-not-behavior: BattleSelectionStep literal 'hero' is sealed registry vocabulary.")
provenance("rpg-battle:RPG-ST-031", "type-vocabulary", "BattleSelectionStep literal 'location'", "RPG-ST-031 uses context-or-provenance-not-behavior: BattleSelectionStep literal 'location' records one selection phase without its transition.")
provenance("rpg-battle:RPG-ST-032", "type-vocabulary", "BattleSelectionStep literal 'enemy'", "RPG-ST-032 uses context-or-provenance-not-behavior: BattleSelectionStep literal 'enemy' is a registry-recorded union member.")
provenance("rpg-battle:RPG-ST-033", "type-vocabulary", "BattleSelectionStep literal 'ready'", "RPG-ST-033 uses context-or-provenance-not-behavior: BattleSelectionStep literal 'ready' names the final selection phase without its battle effect.")
provenance("rpg-battle:RPG-ST-034", "type-vocabulary", "'player' | 'enemy' | 'system'", "RPG-ST-034 uses context-or-provenance-not-behavior: 'player' | 'enemy' | 'system' declares battle-log entry types.")
provenance("rpg-battle:RPG-ST-035", "type-vocabulary", "FlashTone is the union 'player' | 'enemy'", "RPG-ST-035 uses context-or-provenance-not-behavior: FlashTone is the union 'player' | 'enemy' mirrored by page-local state.")
provenance("rpg-battle:RPG-ST-036", "type-vocabulary", "initializes flashTone to 'enemy'", "RPG-ST-036 uses context-or-provenance-not-behavior: initializes flashTone to 'enemy' and its restart reset are sealed UI-state registry facts.")
provenance("rpg-battle:RPG-ST-037", "type-vocabulary", "'damage-player' | 'damage-enemy' | 'heal' | 'crit'", "RPG-ST-037 uses context-or-provenance-not-behavior: 'damage-player' | 'damage-enemy' | 'heal' | 'crit' declares floating-text presentation types.")
provenance("rpg-battle:RPG-ST-038", "type-vocabulary", "'briefing' | 'rankings' | 'vocabulary'", "RPG-ST-038 uses context-or-provenance-not-behavior: 'briefing' | 'rankings' | 'vocabulary' declares the sealed StartScreen tab union.")
provenance("rpg-battle:RPG-ST-039", "type-vocabulary", "TabType literal 'briefing'", "RPG-ST-039 uses context-or-provenance-not-behavior: TabType literal 'briefing' is a registry-recorded tab member and button.")
provenance("rpg-battle:RPG-ST-040", "type-vocabulary", "TabType literal 'rankings'", "RPG-ST-040 uses context-or-provenance-not-behavior: TabType literal 'rankings' is registry UI vocabulary rather than ranking transport.")
provenance("rpg-battle:RPG-ST-041", "type-vocabulary", "TabType literal 'vocabulary'", "RPG-ST-041 uses context-or-provenance-not-behavior: TabType literal 'vocabulary' declares the third rendered tab.")
provenance("rpg-battle:RPG-ST-042", "ui-render-scaffolding", "showStartScreen initializes to true", "RPG-ST-042 uses context-or-provenance-not-behavior: showStartScreen initializes to true and gates a sealed registry render branch.")
provenance("rpg-battle:RPG-ST-043", "ui-render-scaffolding", "showResults initializes to false", "RPG-ST-043 uses context-or-provenance-not-behavior: showResults initializes to false and gates the sealed result surface.")
provenance("rpg-battle:RPG-ST-044", "ui-render-scaffolding", "isLoading", "RPG-ST-044 uses context-or-provenance-not-behavior: isLoading and error page-local states select loading and error scenes.")
provenance("rpg-battle:RPG-ST-045", "type-vocabulary", "inputLocked initializes false", "RPG-ST-045 uses context-or-provenance-not-behavior: inputLocked initializes false and revealedTranslation null are store default fields.")
provenance("rpg-battle:RPG-ST-046", "type-vocabulary", "playerHealth=100", "RPG-ST-046 uses context-or-provenance-not-behavior: playerHealth=100 heads an initializer inventory for health, streak, and earned XP.")
provenance("rpg-battle:RPG-ST-047", "type-vocabulary", "selection fields initialize to null", "RPG-ST-047 uses context-or-provenance-not-behavior: selection fields initialize to null records three default IDs without a selection transition.")

# Dragon Flight non-selected controls and host-copy evidence: twenty-seven records.
provenance("dragon-flight:DF-CTRL-003", "ui-render-scaffolding", "window keydown", "DF-CTRL-003 uses context-or-provenance-not-behavior: window keydown attachment and cleanup describe browser event wiring around separately mapped key actions.")
provenance("dragon-flight:DF-CTRL-007", "ui-render-scaffolding", "onPointerDown rather than onClick", "DF-CTRL-007 uses context-or-provenance-not-behavior: onPointerDown rather than onClick records the DOM event choice shared by two rendered buttons.")
insufficient("dragon-flight:DF-CTRL-011", "On selection", "the pair is locked via setLockedPairId(pair.id)", "prior feedback is cleared", "DF-CTRL-011 uses complete-behavior-no-cross-game-counterpart: On selection, the active gate pair locks and prior feedback clears before deferred gate resolution.", "selection-time gate lock and feedback clear")
provenance("dragon-flight:DF-CTRL-012", "ui-render-scaffolding", "touch-none select-none", "DF-CTRL-012 uses context-or-provenance-not-behavior: touch-none select-none is a container CSS policy applied after start, not an input action.")
provenance("dragon-flight:DF-CTRL-013", "test-fixture-or-test-id", "difficulty selector buttons", "DF-CTRL-013 uses context-or-provenance-not-behavior: difficulty selector buttons and their asset-loading disabled state are sealed registry UI controls.")
provenance("dragon-flight:DF-CTRL-015", "test-fixture-or-test-id", "Trophy button", "DF-CTRL-015 uses context-or-provenance-not-behavior: Trophy button is a sealed registry control that opens a ranking dialog without changing game rules.")
provenance("dragon-flight:DF-CTRL-016", "negative-search", "selection is exclusively left/right gate choice", "DF-CTRL-016 uses context-or-provenance-not-behavior: selection is exclusively left/right gate choice records a registry-bounded absence of typing, drag, and text input.")
provenance("dragon-flight:DF-COPY-001", "provenance-location", "imports DragonFlightGame", "DF-COPY-001 uses context-or-provenance-not-behavior: imports DragonFlightGame records the advantage-games page-to-component dependency.")
provenance("dragon-flight:DF-COPY-002", "provenance-location", "imports the DragonFlightResults type", "DF-COPY-002 uses context-or-provenance-not-behavior: imports the DragonFlightResults type establishes a compile-time page dependency.")
provenance("dragon-flight:DF-COPY-003", "provenance-location", "imports advanceDragonFlightTime, calculateBossPower, createDragonFlightState, getDragonFlightResults", "DF-COPY-003 uses context-or-provenance-not-behavior: imports advanceDragonFlightTime, calculateBossPower, createDragonFlightState, getDragonFlightResults inventories component dependencies.")
provenance("dragon-flight:DF-COPY-004", "provenance-location", "imports RankingDialog", "DF-COPY-004 uses context-or-provenance-not-behavior: imports RankingDialog identifies a local UI dependency without ranking behavior.")
provenance("dragon-flight:DF-COPY-005", "transport-or-api-wiring", "createVocabularyRoute(SAMPLE_VOCABULARY)", "DF-COPY-005 uses context-or-provenance-not-behavior: createVocabularyRoute(SAMPLE_VOCABULARY) is sealed registry evidence for vocabulary-route construction.")
provenance("dragon-flight:DF-COPY-006", "provenance-location", "byte-identical to the advantage-games file", "DF-COPY-006 uses context-or-provenance-not-behavior: byte-identical to the advantage-games file records reconciled source-copy provenance.")
provenance("dragon-flight:DF-COPY-007", "test-fixture-or-test-id", "byte-identical to the advantage-games test file", "DF-COPY-007 uses context-or-provenance-not-behavior: byte-identical to the advantage-games test file records test-copy provenance, not executed behavior.")
provenance("dragon-flight:DF-COPY-008", "provenance-location", "drops the useCallback import/wrapping", "DF-COPY-008 uses context-or-provenance-not-behavior: drops the useCallback import/wrapping and adds translation casts records a host-copy diff.")
provenance("dragon-flight:DF-COPY-009", "provenance-location", "imports Timer from lucide-react", "DF-COPY-009 uses context-or-provenance-not-behavior: imports Timer from lucide-react is a reading-host dependency difference.")
provenance("dragon-flight:DF-COPY-010", "negative-search", "has no adaptive-difficulty imports or hooks", "DF-COPY-010 uses context-or-provenance-not-behavior: has no adaptive-difficulty imports or hooks records a bounded host-copy absence.")
provenance("dragon-flight:DF-COPY-011", "provenance-location", "computes DIFFICULTY_SETTINGS via useMemo", "DF-COPY-011 uses context-or-provenance-not-behavior: computes DIFFICULTY_SETTINGS via useMemo rather than useState records implementation-copy divergence without a rule outcome.")
insufficient("dragon-flight:DF-COPY-012", "on mount", "resets the game on mount via useEffect(resetGame)", "setHasStarted(false)", "DF-COPY-012 uses complete-behavior-no-cross-game-counterpart: on mount, the reading-host copy resets model state and explicitly returns to the briefing surface rather than entering active play for t14.", "reading-host mount reset to briefing")
provenance("dragon-flight:DF-COPY-013", "provenance-location", "do not auto-reset to avoid loops", "DF-COPY-013 uses context-or-provenance-not-behavior: do not auto-reset to avoid loops documents the advantage-host implementation decision but no executed transition.")
provenance("dragon-flight:DF-COPY-014", "transport-or-api-wiring", "imports DragonFlightController", "DF-COPY-014 uses context-or-provenance-not-behavior: imports DragonFlightController records complete-route controller wiring.")
provenance("dragon-flight:DF-COPY-015", "transport-or-api-wiring", "imports ActivityType", "DF-COPY-015 uses context-or-provenance-not-behavior: imports ActivityType in the ranking route is API dependency wiring.")
provenance("dragon-flight:DF-COPY-016", "transport-or-api-wiring", "apply logRequest and protect middleware", "DF-COPY-016 uses context-or-provenance-not-behavior: apply logRequest and protect middleware records route composition before the controller.")
provenance("dragon-flight:DF-COPY-017", "ui-render-scaffolding", "default difficulties are easy/normal/hard/extreme", "DF-COPY-017 uses context-or-provenance-not-behavior: default difficulties are easy/normal/hard/extreme and the ranking endpoint configure a dialog.")
provenance("dragon-flight:DF-COPY-018", "provenance-location", "CastleDefenseGame.tsx imports RankingDialog", "DF-COPY-018 uses context-or-provenance-not-behavior: CastleDefenseGame.tsx imports RankingDialog from this component directory and records cross-game package reuse.")
provenance("dragon-flight:DF-COPY-019", "provenance-location", "complete route is byte-identical to the alchemists-synthesis complete route", "DF-COPY-019 uses context-or-provenance-not-behavior: complete route is byte-identical to the alchemists-synthesis complete route records copy reconciliation.")
provenance("dragon-flight:DF-COPY-020", "ui-render-scaffolding", "renders with Konva and react-konva", "DF-COPY-020 uses context-or-provenance-not-behavior: renders with Konva and react-konva inventories presentation libraries and primitives.")

# Dragon Flight non-selected mechanic evidence: fifty individually reviewed records.
provenance("dragon-flight:DF-MECH-001", "type-vocabulary", "DEFAULT_DURATION_MS is 30000", "DF-MECH-001 uses context-or-provenance-not-behavior: DEFAULT_DURATION_MS is 30000 declares the core default duration without applying a threshold.")
provenance("dragon-flight:DF-MECH-002", "type-vocabulary", "term, correctTranslation, decoyTranslation, and correctSide", "DF-MECH-002 uses context-or-provenance-not-behavior: term, correctTranslation, decoyTranslation, and correctSide define the round data contract.")
insufficient("dragon-flight:DF-MECH-003", "createDragonFlightState", "initializes attempts 0, correctAnswers 0", "dragonCount 1, elapsedMs 0", "DF-MECH-003 uses complete-behavior-no-cross-game-counterpart: createDragonFlightState establishes zeroed counters, one dragon, and zero elapsed time without proving a start-to-active transition.", "dragon-flight core counter initialization")
insufficient("dragon-flight:DF-MECH-006", "rng() < 0.5", "getGateSide assigns the correct gate randomly", "to the left", "DF-MECH-006 uses complete-behavior-no-cross-game-counterpart: rng() < 0.5 assigns the correct gate to the left and the complementary outcome to the right.", "random correct-gate side assignment")
insufficient("dragon-flight:DF-MECH-007", "on every selection", "selectGate increments attempts by 1 on every selection", "increments attempts by 1 on every selection", "DF-MECH-007 uses complete-behavior-no-cross-game-counterpart: on every eligible selection, selectGate increments the attempt counter independently of correctness.", "gate-selection attempt accounting")
insufficient("dragon-flight:DF-MECH-008", "when the chosen side matches round.correctSide", "selectGate increments correctAnswers", "increments correctAnswers only when the chosen side matches round.correctSide", "DF-MECH-008 uses complete-behavior-no-cross-game-counterpart: a side matching round.correctSide increments the answer counter but does not itself advance ordered language content.", "correct-gate answer-counter increment")
insufficient("dragon-flight:DF-MECH-011", "totalAttempts", "calculateBossPower returns Math.max(3, Math.ceil(totalAttempts * 0.6))", "Math.max(3, Math.ceil(totalAttempts * 0.6))", "DF-MECH-011 uses complete-behavior-no-cross-game-counterpart: totalAttempts is scaled and rounded with a minimum of three to produce boss power.", "attempt-scaled minimum boss power")
insufficient("dragon-flight:DF-MECH-012", "when no attempts", "getDragonFlightResults computes accuracy as correctAnswers/totalAttempts", "0 when no attempts", "DF-MECH-012 uses complete-behavior-no-cross-game-counterpart: getDragonFlightResults divides correct answers by attempts and explicitly returns zero for the no-attempt case.", "zero-safe answer accuracy calculation")
insufficient("dragon-flight:DF-MECH-013", "dragonCount >= bossPower", "Victory is decided", "Victory is decided by dragonCount >= bossPower", "DF-MECH-013 uses complete-behavior-no-cross-game-counterpart: dragonCount >= bossPower is the Dragon Flight result predicate for victory.", "dragon-army versus boss-power victory predicate")
insufficient("dragon-flight:DF-MECH-015", "elapsedMs", "timeTaken is Math.floor(elapsedMs / 1000)", "seconds", "DF-MECH-015 uses complete-behavior-no-cross-game-counterpart: elapsedMs is floored after millisecond-to-second conversion to produce timeTaken.", "floored elapsed-seconds result conversion")
provenance("dragon-flight:DF-MECH-016", "type-vocabulary", "'easy' | 'normal' | 'hard' | 'extreme'", "DF-MECH-016 uses context-or-provenance-not-behavior: 'easy' | 'normal' | 'hard' | 'extreme' declares the result difficulty vocabulary.")
provenance("dragon-flight:DF-MECH-017", "type-vocabulary", "Difficulty 'easy' uses durationMs 30000", "DF-MECH-017 uses context-or-provenance-not-behavior: Difficulty 'easy' uses durationMs 30000 with penalty and miss-policy constants as a preset.")
provenance("dragon-flight:DF-MECH-018", "type-vocabulary", "Difficulty 'normal' uses durationMs 60000", "DF-MECH-018 uses context-or-provenance-not-behavior: Difficulty 'normal' uses durationMs 60000 and associated penalty constants as configuration.")
provenance("dragon-flight:DF-MECH-019", "type-vocabulary", "Difficulty 'hard' uses durationMs 90000", "DF-MECH-019 uses context-or-provenance-not-behavior: Difficulty 'hard' uses durationMs 90000 with a two-dragon penalty preset.")
provenance("dragon-flight:DF-MECH-020", "type-vocabulary", "Difficulty 'extreme' uses durationMs 120000", "DF-MECH-020 uses context-or-provenance-not-behavior: Difficulty 'extreme' uses durationMs 120000 and gameOverOnMiss true as a preset.")
provenance("dragon-flight:DF-MECH-021", "type-vocabulary", "default difficulty state is 'normal'", "DF-MECH-021 uses context-or-provenance-not-behavior: default difficulty state is 'normal' records a component default, not difficulty application.")
insufficient("dragon-flight:DF-MECH-022", "a correct pending selection", "adds +1 dragonCount", "+1 correctAnswers", "DF-MECH-022 uses complete-behavior-no-cross-game-counterpart: a correct pending selection adds one dragon and one correct answer in the UI loop as a game-specific reward bundle.", "correct-gate dragon and answer reward")
insufficient("dragon-flight:DF-MECH-024", "per interval tick", "The game loop advances core time by TICK_MS", "TICK_MS (60 ms)", "DF-MECH-024 uses complete-behavior-no-cross-game-counterpart: per interval tick, the UI loop advances core time by the fixed 60 ms step without a threshold outcome.", "fixed-step core-time advancement")
insufficient("dragon-flight:DF-MECH-025", "over GATE_TRAVEL_MS (7200 ms)", "Gates travel from -gateHeight", "stageHeight+gateHeight", "DF-MECH-025 uses complete-behavior-no-cross-game-counterpart: over the fixed travel duration, gates move from above the stage to one gate height below it.", "full-stage timed gate traversal")
insufficient("dragon-flight:DF-MECH-026", "on screen", "At most one gate pair is kept", "slice(0, 1)", "DF-MECH-026 uses complete-behavior-no-cross-game-counterpart: the UI retains at most one gate pair on screen through a one-element slice.", "single visible gate-pair cap")
insufficient("dragon-flight:DF-MECH-027", "per tick", "Player movement lerps toward the target gate", "with PLAYER_LERP 0.22 per tick", "DF-MECH-027 uses complete-behavior-no-cross-game-counterpart: per tick, player position lerps toward the selected gate center at the fixed 0.22 factor.", "fixed-factor player gate lerp")
insufficient("dragon-flight:DF-MECH-028", "when the player is within 1.5 px of the target", "Gate feedback resolves", "resolves only when the player is within 1.5 px of the target", "DF-MECH-028 uses complete-behavior-no-cross-game-counterpart: Gate feedback waits until the player's lerp is within 1.5 pixels of its target.", "near-target gate feedback resolution")
provenance("dragon-flight:DF-MECH-029", "ui-render-scaffolding", "playSound('success'|'error')", "DF-MECH-029 uses context-or-provenance-not-behavior: playSound('success'|'error') records audio feedback invocation after separately mapped gate resolution.")
insufficient("dragon-flight:DF-MECH-030", "After resolution", "the player returns to center", "following a 1500 ms delay", "DF-MECH-030 uses complete-behavior-no-cross-game-counterpart: After resolution, player position returns to center only after a fixed 1500 ms delay.", "delayed post-gate recentering")
insufficient("dragon-flight:DF-MECH-031", "after 450 ms", "Gate feedback clears", "unlocks the pair", "DF-MECH-031 uses complete-behavior-no-cross-game-counterpart: after 450 ms, gate feedback clears and the current pair unlocks for subsequent selection.", "timed gate-feedback clear and unlock")
insufficient("dragon-flight:DF-MECH-032", "During 'boss'", "bossHealth and displayDragonCount drain by 1 every BOSS_HEALTH_TICK_MS (450 ms)", "while both are above 0", "DF-MECH-032 uses complete-behavior-no-cross-game-counterpart: During 'boss', health and displayed dragons drain together every 450 ms while both remain positive.", "paired boss-health and dragon-count drain")
insufficient("dragon-flight:DF-MECH-033", "when status is 'boss'", "Results are computed with getDragonFlightResults", "using state counters and difficulty", "DF-MECH-033 uses complete-behavior-no-cross-game-counterpart: when status is 'boss', the component stages the aggregate result from counters and difficulty without exposing a distinct reusable calculation.", "boss-entry aggregate result staging")
insufficient("dragon-flight:DF-MECH-034", "when results are computed", "onComplete(nextResults) is invoked", "if the prop is present", "DF-MECH-034 uses complete-behavior-no-cross-game-counterpart: when results are computed and the callback prop exists, onComplete is invoked without a fire-once guard for t02.", "unguarded computed-result callback")
provenance("dragon-flight:DF-MECH-035", "ui-render-scaffolding", "progressbar with aria-valuenow of remaining seconds", "DF-MECH-035 uses context-or-provenance-not-behavior: progressbar with aria-valuenow of remaining seconds describes accessible HUD rendering.")
provenance("dragon-flight:DF-MECH-036", "ui-render-scaffolding", "shows remaining seconds as Math.max(0, Math.ceil((durationMs - elapsedMs)/1000))", "DF-MECH-036 uses context-or-provenance-not-behavior: shows remaining seconds as Math.max(0, Math.ceil((durationMs - elapsedMs)/1000)) is HUD formatting, not the timer transition.")
provenance("dragon-flight:DF-MECH-037", "test-fixture-or-test-id", "data-testid 'dragon-flight-dragon-count'", "DF-MECH-037 uses context-or-provenance-not-behavior: data-testid 'dragon-flight-dragon-count' and its rendered value are DOM observability metadata.")
provenance("dragon-flight:DF-MECH-038", "ui-render-scaffolding", "Gate feedback text", "DF-MECH-038 uses context-or-provenance-not-behavior: Gate feedback text maps success and penalty state to localized visual copy.")
provenance("dragon-flight:DF-MECH-039", "test-fixture-or-test-id", "data-testid 'dragon-flight-boss'", "DF-MECH-039 uses context-or-provenance-not-behavior: data-testid 'dragon-flight-boss' is a sealed registry UI locator for the boss banner.")
provenance("dragon-flight:DF-MECH-040", "ui-render-scaffolding", "⚔️ emoji on victory and 💀 on defeat", "DF-MECH-040 uses context-or-provenance-not-behavior: ⚔️ emoji on victory and 💀 on defeat are results-overlay presentation choices.")
provenance("dragon-flight:DF-MECH-041", "ui-render-scaffolding", "renders XP as '+{results.xp}'", "DF-MECH-041 uses context-or-provenance-not-behavior: renders XP as '+{results.xp}' displays an already-computed result without its formula.")
provenance("dragon-flight:DF-MECH-042", "ui-render-scaffolding", "shows accuracy as Math.round(accuracy*100)%", "DF-MECH-042 uses context-or-provenance-not-behavior: shows accuracy as Math.round(accuracy*100)% formats an existing ratio for display.")
provenance("dragon-flight:DF-MECH-043", "ui-render-scaffolding", "shows correct answers as correctAnswers/totalAttempts", "DF-MECH-043 uses context-or-provenance-not-behavior: shows correct answers as correctAnswers/totalAttempts is results-grid rendering, not arithmetic mutation.")
provenance("dragon-flight:DF-MECH-044", "ui-render-scaffolding", "shows the surviving dragon count", "DF-MECH-044 uses context-or-provenance-not-behavior: shows the surviving dragon count maps existing state into a results statistic.")
provenance("dragon-flight:DF-MECH-045", "ui-render-scaffolding", "shows time taken in seconds", "DF-MECH-045 uses context-or-provenance-not-behavior: shows time taken in seconds with an s suffix is results display formatting.")
provenance("dragon-flight:DF-MECH-046", "ui-render-scaffolding", "renders at most 12 sprites", "DF-MECH-046 uses context-or-provenance-not-behavior: renders at most 12 sprites caps visual army representation without capping the model count.")
insufficient("dragon-flight:DF-MECH-047", "During the boss phase", "player projectiles spawn", "every 400-600 ms", "DF-MECH-047 uses complete-behavior-no-cross-game-counterpart: During the boss phase, player projectiles spawn on a randomized 400-to-600 ms cadence.", "random-cadence player projectile spawning")
insufficient("dragon-flight:DF-MECH-048", "once bossY > 50", "Boss projectiles spawn every 1200-1700 ms", "random horizontal velocity", "DF-MECH-048 uses complete-behavior-no-cross-game-counterpart: once bossY > 50, boss projectiles spawn on a slower randomized cadence with scaled vertical and random horizontal velocity.", "position-gated boss projectile spawning")
insufficient("dragon-flight:DF-MECH-049", "when within 60 px vertically of bossY and 80 px horizontally of bossX", "A player projectile registers a hit", "registers a hit when within 60 px vertically of bossY", "DF-MECH-049 uses complete-behavior-no-cross-game-counterpart: a player projectile registers a boss hit only inside the fixed rectangular distance thresholds.", "boss projectile rectangular hit test")
insufficient("dragon-flight:DF-MECH-050", "when they leave the stage by 100 px or register a hit", "Projectiles are removed", "removed when they leave the stage by 100 px", "DF-MECH-050 uses complete-behavior-no-cross-game-counterpart: projectiles are removed after a hit or once they travel one hundred pixels beyond the stage.", "hit-or-offstage projectile removal")
provenance("dragon-flight:DF-MECH-051", "type-vocabulary", "durationMs min 15000, max 120000, step 5000", "DF-MECH-051 uses context-or-provenance-not-behavior: durationMs min 15000, max 120000, step 5000 declares adaptive parameter bounds.")
provenance("dragon-flight:DF-MECH-052", "transport-or-api-wiring", "records adaptive responses", "DF-MECH-052 uses context-or-provenance-not-behavior: records adaptive responses with approximate response time is telemetry wiring after gate resolution.")
provenance("dragon-flight:DF-MECH-053", "transport-or-api-wiring", "/api/v1/games/dragon-flight/complete", "DF-MECH-053 uses context-or-provenance-not-behavior: /api/v1/games/dragon-flight/complete receives serialized result fields and no calculation behavior.")
provenance("dragon-flight:DF-MECH-055", "ui-render-scaffolding", "boss sprite row switches to row 2", "DF-MECH-055 uses context-or-provenance-not-behavior: boss sprite row switches to row 2, 1, or 0 according to health and descent for visual pose selection.")
provenance("dragon-flight:DF-MECH-056", "type-vocabulary", "PROJECTILE_SPEED is a constant 600", "DF-MECH-056 uses context-or-provenance-not-behavior: PROJECTILE_SPEED is a constant 600 and does not itself move a projectile.")

# Dragon Flight scene, state, and non-selected transition evidence: twenty records.
provenance("dragon-flight:DF-SCENE-001", "provenance-location", "scene_id 'DragonFlightGame'", "DF-SCENE-001 uses context-or-provenance-not-behavior: scene_id 'DragonFlightGame' records the T2 scene denominator and source occurrence, not an operation.")
provenance("dragon-flight:DF-SCENE-002", "provenance-location", "same component at DragonFlightGame.tsx line 432", "DF-SCENE-002 uses context-or-provenance-not-behavior: same component at DragonFlightGame.tsx line 432 establishes the reading-host copy location.")
provenance("dragon-flight:DF-SCENE-003", "ui-render-scaffolding", "inner presentational component DragonFlightCanvas", "DF-SCENE-003 uses context-or-provenance-not-behavior: inner presentational component DragonFlightCanvas identifies rendering ownership without a game-state rule.")
provenance("dragon-flight:DF-SCENE-004", "provenance-location", "client component", "DF-SCENE-004 uses context-or-provenance-not-behavior: client component records the file execution boundary through its directive, not player behavior.")
provenance("dragon-flight:DF-STATE-001", "type-vocabulary", "'running' | 'boss'", "DF-STATE-001 uses context-or-provenance-not-behavior: 'running' | 'boss' is the DragonFlightState status union without a transition.")
provenance("dragon-flight:DF-STATE-002", "type-vocabulary", "'running' is a named status value", "DF-STATE-002 uses context-or-provenance-not-behavior: 'running' is a named status value and duplicates one member of the declared state vocabulary.")
provenance("dragon-flight:DF-STATE-003", "type-vocabulary", "'boss' is a named status value", "DF-STATE-003 uses context-or-provenance-not-behavior: 'boss' is a named status value and supplies no entry or exit condition.")
provenance("dragon-flight:DF-STATE-004", "type-vocabulary", "initializes status to 'running'", "DF-STATE-004 uses context-or-provenance-not-behavior: initializes status to 'running' records one initializer field without a complete reset-to-play operation.")
provenance("dragon-flight:DF-STATE-005", "ui-render-scaffolding", "display statusLabel of 'results' | state.status | 'ready'", "DF-STATE-005 uses context-or-provenance-not-behavior: display statusLabel of 'results' | state.status | 'ready' derives a DOM label from existing UI state.")
provenance("dragon-flight:DF-STATE-006", "ui-render-scaffolding", "hasStarted boolean state initialized false", "DF-STATE-006 uses context-or-provenance-not-behavior: hasStarted boolean state initialized false controls the briefing surface but does not prove the start action.")
provenance("dragon-flight:DF-STATE-007", "type-vocabulary", "boss-sequence state", "DF-STATE-007 uses context-or-provenance-not-behavior: boss-sequence state inventories display count, health, position, and a completion flag without their transitions.")
provenance("dragon-flight:DF-STATE-008", "test-fixture-or-test-id", "data-testid 'dragon-flight'", "DF-STATE-008 uses context-or-provenance-not-behavior: data-testid 'dragon-flight' and data-status are registry-recorded DOM observability hooks, not mechanics.")
provenance("dragon-flight:DF-STATE-009", "type-vocabulary", "state occurrences 'boss' and 'running'", "DF-STATE-009 uses context-or-provenance-not-behavior: state occurrences 'boss' and 'running' reconcile the T2 denominator across hosts without behavior.")
provenance("dragon-flight:DF-STATE-010", "ui-render-scaffolding", "showResults is a boolean state initialized false", "DF-STATE-010 uses context-or-provenance-not-behavior: showResults is a boolean state initialized false and controls overlay visibility.")
insufficient("dragon-flight:DF-TRANS-004", "When status becomes 'boss'", "positions the boss off-screen", "initializes bossHealth to calculateBossPower(state.attempts)", "DF-TRANS-004 uses complete-behavior-no-cross-game-counterpart: When status becomes 'boss', the component positions the encounter off-screen and derives boss health from attempts.", "attempt-scaled boss encounter initialization")
insufficient("dragon-flight:DF-TRANS-005", "During 'boss'", "bossY descends each TICK_MS", "clamps at the target", "DF-TRANS-005 uses complete-behavior-no-cross-game-counterpart: During 'boss', bossY descends each fixed tick toward playerY and clamps at that target line.", "clamped boss descent to player line")
insufficient("dragon-flight:DF-TRANS-006", "when the boss has reached the player line and bossHealth or displayDragonCount has drained to 0 (lines 857-860)", "bossSequenceDone is set true", "bossSequenceDone is set true when the boss has reached the player line", "DF-TRANS-006 uses complete-behavior-no-cross-game-counterpart: reaching the player line plus either exhausted boss health or dragon count completes the boss sequence.", "boss-line and resource-drain sequence completion")
insufficient("dragon-flight:DF-TRANS-007", "After bossSequenceDone", "showResults is set true", "following a RESULTS_REVEAL_MS (900 ms) timeout", "DF-TRANS-007 uses complete-behavior-no-cross-game-counterpart: After bossSequenceDone, the results overlay is revealed only after the fixed 900 ms delay.", "delayed boss-results reveal")
provenance("dragon-flight:DF-TRANS-009", "ui-render-scaffolding", "Play Again button calls onRestart()", "DF-TRANS-009 uses context-or-provenance-not-behavior: Play Again button calls onRestart() or reloads the page, which is host navigation wiring without a model reset contract.")
insufficient("dragon-flight:DF-TRANS-010", "When status is not 'boss'", "the results effect clears results, showResults", "clears results, showResults, and bossSequenceDone", "DF-TRANS-010 uses complete-behavior-no-cross-game-counterpart: When status is not 'boss', the effect clears staged results, overlay visibility, and the prior boss completion flag.", "non-boss result-state cleanup")

# Spellweavers Run: twenty context records; two additional input facts are redundant t04 evidence.
provenance("spellweavers-run:SW-STATE-001", "type-vocabulary", "statuses start, playing, victory, and defeat", "SW-STATE-001 uses context-or-provenance-not-behavior: statuses start, playing, victory, and defeat declare the legacy phase vocabulary without an observed transition.")
provenance("spellweavers-run:SW-STATE-002", "type-vocabulary", "difficulty, mana, score, combo", "SW-STATE-002 uses context-or-provenance-not-behavior: difficulty, mana, score, combo head a legacy state-field inventory rather than one rule.")
insufficient("spellweavers-run:SW-MOVE-001", "RNG below 0.33", "Legacy lane selection maps RNG below 0.33 to left", "all remaining values to right", "SW-MOVE-001 uses complete-behavior-no-cross-game-counterpart: fixed RNG thresholds map a sampled value into left, center, or right lane for legacy spawning.", "threshold-based random lane selection")
insufficient("spellweavers-run:SW-MOVE-002", "a sentence word", "A legacy orb is created for a sentence word in one lane", "y equal to half the configured scrollHeight", "SW-MOVE-002 uses complete-behavior-no-cross-game-counterpart: a sentence word becomes one lane orb initialized halfway down the configured scroll height.", "sentence-word lane-orb creation")
insufficient("spellweavers-run:SW-MOVE-003", "Each legacy tick", "increases every orb y", "scrollSpeed/1000 multiplied by deltaMs", "SW-MOVE-003 uses complete-behavior-no-cross-game-counterpart: Each legacy tick advances every orb vertically by configured scroll speed scaled to delta time.", "delta-scaled vertical orb scrolling")
insufficient("spellweavers-run:SW-MOVE-004", "whose y exceeds GAME_HEIGHT plus collectionZoneHeight", "Legacy ticks remove orbs", "orbs whose y exceeds GAME_HEIGHT plus collectionZoneHeight", "SW-MOVE-004 uses complete-behavior-no-cross-game-counterpart: Legacy ticks remove orbs after they pass the logical game height plus the collection-zone allowance.", "post-collection-zone orb removal")
insufficient("spellweavers-run:SW-STATE-005", "When the legacy spawn timer reaches the difficulty interval", "the first word index not represented by an orb is spawned", "the timer resets to zero", "SW-STATE-005 uses complete-behavior-no-cross-game-counterpart: the difficulty interval spawns the first currently unrepresented word and resets the spawn timer.", "unrepresented-word timed spawning")
insufficient("spellweavers-run:SW-COLL-001", "the selected lane", "Legacy collection searches the selected lane", "the first uncollected orb whose y lies from GAME_HEIGHT minus collectionZoneHeight through GAME_HEIGHT", "SW-COLL-001 uses complete-behavior-no-cross-game-counterpart: Legacy collection searches one selected lane for the first uncollected orb inside the bottom collection band.", "lane-local collection-zone search")
provenance("spellweavers-run:SW-WORLD-001", "type-vocabulary", "390 by 600 with three lanes", "SW-WORLD-001 uses context-or-provenance-not-behavior: 390 by 600 with three lanes belongs to a logical-surface and zone constant inventory.")
provenance("spellweavers-run:SW-STATE-007", "type-vocabulary", "scroll speeds to 60, 90, 120, and 150 pixels per second", "SW-STATE-007 uses context-or-provenance-not-behavior: scroll speeds to 60, 90, 120, and 150 pixels per second enumerate difficulty presets without an invoked transition.")
insufficient("spellweavers-run:SW-TRANS-005", "Legacy victory or defeat", "computes accuracy and XP, stores results", "changes the component phase to ended", "SW-TRANS-005 uses complete-behavior-no-cross-game-counterpart: Legacy victory or defeat computes and stores results before ending the component, but the fact supplies no fire-once report guard for t02.", "unguarded legacy terminal result staging")
provenance("spellweavers-run:SW-WORLD-002", "ui-render-scaffolding", "uniform logical scale", "SW-WORLD-002 uses context-or-provenance-not-behavior: uniform logical scale maps a 390-by-600 background into measured container dimensions for rendering.")
provenance("spellweavers-run:SW-WORLD-003", "ui-render-scaffolding", "three equal lane rectangles", "SW-WORLD-003 uses context-or-provenance-not-behavior: three equal lane rectangles describe legacy lane presentation between fixed scroll and collection regions.")
provenance("spellweavers-run:SW-WORLD-004", "ui-render-scaffolding", "collection zone from y 520 through y 600", "SW-WORLD-004 uses context-or-provenance-not-behavior: collection zone from y 520 through y 600 is a rendered logical-surface region, not the collection predicate itself.")
provenance("spellweavers-run:SW-UI-001", "ui-render-scaffolding", "mana bar, Mana text, Score text, and Combo text", "SW-UI-001 uses context-or-provenance-not-behavior: mana bar, Mana text, Score text, and Combo text are a HUD inventory with no state mutation.")
provenance("spellweavers-run:SW-TRANS-007", "ui-render-scaffolding", "selects victory or defeat text", "SW-TRANS-007 uses context-or-provenance-not-behavior: selects victory or defeat text and renders result/restart/exit controls on the legacy end screen.")
provenance("spellweavers-run:SW-CART-008", "ui-render-scaffolding", "positions the one active orb at x 160 plus lane times 320", "SW-CART-008 uses context-or-provenance-not-behavior: positions the one active orb at x 160 plus lane times 320 is withdrawn-cartridge rendering geometry.")
insufficient("spellweavers-run:SW-CART-009", "after confirming a nonzero canvas surface", "resolves input actions", "advances movement by delta multiplied by edition speed tuning", "SW-CART-009 uses complete-behavior-no-cross-game-counterpart: after confirming a nonzero canvas surface, the cartridge resolves actions and applies edition-tuned delta movement as an orchestration step.", "surface-ready tuned cartridge update")
insufficient("spellweavers-run:SW-CART-013", "A missed crossing", "subtracts 10 mana, resets combo, subtracts 10 score", "respawns the same target", "SW-CART-013 uses complete-behavior-no-cross-game-counterpart: A missed crossing applies mana, combo, score, and attempt consequences, respawns the target, and may defeat, but it is not an incorrect-target selection for t13.", "missed-target crossing penalty and respawn")
insufficient("spellweavers-run:SW-CART-014", "lane selections outside integer lanes zero through two", "The withdrawn cartridge ignores", "ignores selections before position 380 or after position 450", "SW-CART-014 uses complete-behavior-no-cross-game-counterpart: the cartridge ignores out-of-range lanes and selections outside its fixed vertical collection window.", "lane-and-position selection guard")

# Storm Castle Tower: ten individually reviewed context records.
provenance("storm-castle-tower:SCT-ABS-001", "negative-search", "returned exactly one slug-bearing path", "SCT-ABS-001 uses context-or-provenance-not-behavior: returned exactly one slug-bearing path records a bounded absence search and no executable mechanic.")
provenance("storm-castle-tower:SCT-SCENE-H003", "type-vocabulary", "gamePhase as start, playing, or ended", "SCT-SCENE-H003 uses context-or-provenance-not-behavior: gamePhase as start, playing, or ended is a historical state declaration initialized to start.")
provenance("storm-castle-tower:SCT-SCENE-H004", "ui-render-scaffolding", "restart handler that sets phase to start", "SCT-SCENE-H004 uses context-or-provenance-not-behavior: restart handler that sets phase to start occurs in end-screen wiring and does not reset the model into active play.")
provenance("storm-castle-tower:SCT-MECH-H002", "ui-render-scaffolding", "touch-start buttons for left, up, down, right, and collect", "SCT-MECH-H002 uses context-or-provenance-not-behavior: touch-start buttons for left, up, down, right, and collect describe rendered controls without their semantic state effect.")
insufficient("storm-castle-tower:SCT-SCENE-H006", "Historical cartridge initialization", "sets sentence index and target index to zero", "complete false", "SCT-SCENE-H006 uses complete-behavior-no-cross-game-counterpart: Historical cartridge initialization establishes tower position, hazards, lives, counters, and an incomplete flag without a start-to-play transition.", "storm-castle cartridge state initialization")
insufficient("storm-castle-tower:SCT-MECH-H006", "when an advanced hazard crosses the player line in the same column", "decrements one life", "removes crossed hazards", "SCT-MECH-H006 uses complete-behavior-no-cross-game-counterpart: a same-column hazard crossing the player line costs one life and removes all crossed hazards.", "same-column hazard-line damage")
insufficient("storm-castle-tower:SCT-MECH-H007", "At the historical hazard interval", "seeded random selection appends one oil-or-rock hazard", "increments hazardCount", "SCT-MECH-H007 uses complete-behavior-no-cross-game-counterpart: At the historical hazard interval, seeded selection appends one capped-ahead oil or rock hazard and increments the counter.", "seeded interval hazard spawning")
provenance("storm-castle-tower:SCT-IMPL-H002", "ui-render-scaffolding", "960-by-540 Phaser config", "SCT-IMPL-H002 uses context-or-provenance-not-behavior: 960-by-540 Phaser config and semantic asset preload are withdrawn renderer setup.")
insufficient("storm-castle-tower:SCT-IMPL-H003", "on complete or unready surface", "advances the model with tuned delta, resolves normalized actions", "delivers results when complete", "SCT-IMPL-H003 uses complete-behavior-no-cross-game-counterpart: the historical update guards complete/unready states, then advances and renders before terminal result delivery without a fire-once guard.", "unguarded storm-cartridge terminal delivery")
provenance("storm-castle-tower:SCT-IMPL-H004", "provenance-location", "barrel exports the definition and systems modules", "SCT-IMPL-H004 uses context-or-provenance-not-behavior: barrel exports the definition and systems modules records withdrawn package topology, not behavior.")

# The Haunted Library: thirteen individually reviewed context records.
provenance("the-haunted-library:HL-CUR-002", "transport-or-api-wiring", "locale-specific haunted-library sentences endpoint", "HL-CUR-002 uses context-or-provenance-not-behavior: locale-specific haunted-library sentences endpoint and warning handling belong to content transport.")
provenance("the-haunted-library:HL-CUR-003", "transport-or-api-wiring", "POSTs score, accuracy, attempts, duration, victory, idempotency key, and client timestamp", "HL-CUR-003 uses context-or-provenance-not-behavior: POSTs score, accuracy, attempts, duration, victory, idempotency key, and client timestamp records completion transport, not calculations.")
provenance("the-haunted-library:HL-CUR-004", "ui-render-scaffolding", "start, playing, and ended UI phases", "HL-CUR-004 uses context-or-provenance-not-behavior: start, playing, and ended UI phases plus a non-empty start condition describe component wiring without a complete reset transition.")
insufficient("the-haunted-library:HL-CUR-005", "easy, medium, or hard", "State creation uses 3, 4, or 5 floors", "spaces them by FLOOR_HEIGHT", "HL-CUR-005 uses complete-behavior-no-cross-game-counterpart: easy, medium, or hard selects a fixed floor count and state creation spaces those floors uniformly.", "difficulty-scaled library floor creation")
insufficient("the-haunted-library:HL-CUR-006", "Each sentence word", "becomes a closed door on a selected floor", "difficulty adds 1, 3, or 5 trap doors with null word indexes", "HL-CUR-006 uses complete-behavior-no-cross-game-counterpart: Each sentence word becomes a closed floor door and difficulty adds a fixed count of wordless trap doors.", "word-door and trap-door generation")
insufficient("the-haunted-library:HL-CUR-007", "Difficulty", "creates 2, 3, or 5 moving ghosts", "initializes playing state, lives, score, attempts, and progress", "HL-CUR-007 uses complete-behavior-no-cross-game-counterpart: Difficulty creates a fixed ghost count while state creation initializes library actors and progress directly in playing status.", "difficulty-scaled haunted-library initialization")
insufficient("the-haunted-library:HL-CUR-008", "Each playing tick", "applies horizontal input, gravity, world bounds", "selecting idle, walking, or jumping player state", "HL-CUR-008 uses complete-behavior-no-cross-game-counterpart: Each playing tick applies library movement physics, floor and trampoline forces, and selects an animation state.", "floor-and-trampoline library movement")
insufficient("the-haunted-library:HL-CUR-009", "Unstunned ghosts", "patrol and damage nearby players", "bats home toward the player, damage on proximity, and are removed after a hit", "HL-CUR-009 uses complete-behavior-no-cross-game-counterpart: Unstunned ghosts patrol and damage nearby players while homing bats damage once and disappear.", "ghost patrol and single-hit bat hazards")
provenance("the-haunted-library:HL-CUR-012", "ui-render-scaffolding", "edge trampoline use", "HL-CUR-012 uses context-or-provenance-not-behavior: edge trampoline use appears in start-screen instructions alongside controls and goals rather than executable evidence.")
provenance("the-haunted-library:HL-CUR-013", "ui-render-scaffolding", "locally calculated XP", "HL-CUR-013 uses context-or-provenance-not-behavior: locally calculated XP is displayed with result tiles and restart/exit controls but no formula is supplied.")
provenance("the-haunted-library:HL-CUR-014", "ui-render-scaffolding", "fixed 390 by 844 Stage", "HL-CUR-014 uses context-or-provenance-not-behavior: fixed 390 by 844 Stage contains a comprehensive playing-surface inventory without adding rule behavior.")
provenance("the-haunted-library:HL-HIST-001", "provenance-location", "same bounded floor, door, ghost, player, and initial-state rules", "HL-HIST-001 uses context-or-provenance-not-behavior: same bounded floor, door, ghost, player, and initial-state rules identifies a scaffold range without atomic evidence beyond current facts.")
provenance("the-haunted-library:HL-HIST-002", "provenance-location", "same movement, hazards, door-learning, victory, and defeat rules", "HL-HIST-002 uses context-or-provenance-not-behavior: same movement, hazards, door-learning, victory, and defeat rules points to a scaffold range and duplicates no complete excerpt.")

# Village Guardian: fourteen individually reviewed context records.
insufficient("village-guardian:VG3-MODEL-002", "a vocabulary entry", "splits its term, bounds wordCount by words.length", "slices activeWords", "VG3-MODEL-002 uses complete-behavior-no-cross-game-counterpart: initialization selects one vocabulary entry, splits its term, bounds the active count, and slices the level words.", "bounded active-word initialization")
insufficient("village-guardian:VG3-MODEL-003", "Initialization", "calls spawnVillagers once", "creates a one-element monsters array from spawnMonster", "VG3-MODEL-003 uses complete-behavior-no-cross-game-counterpart: Initialization spawns the villager formation once and begins with exactly one monster.", "initial villager and monster spawning")
fragment("village-guardian:VG3-MODEL-004", "status playing and level 1", "VG3-MODEL-004 uses incomplete-behavioral-anchors: status playing and level 1 are two returned initializer fields with no reset trigger or other outcome.")
fragment("village-guardian:VG3-MODEL-005", "adds deltaMs to gameTime and subtracts deltaMs from timer", "VG3-MODEL-005 uses incomplete-behavioral-anchors: adds deltaMs to gameTime and subtracts deltaMs from timer proves arithmetic but no threshold transition for t05.")
fragment("village-guardian:VG3-MODEL-007", "calls updateKnight, updateVillagers, updateTrail, updateMonsters, checkCollisions, and advanceLevelIfComplete in that order", "VG3-MODEL-007 uses incomplete-behavioral-anchors: the ordered call list is orchestration without each operation's precondition and result.")
insufficient("village-guardian:VG3-MODEL-009", "when magnitude is positive", "velocity is blended toward the knight", "then normalized when magnitude is positive", "VG3-MODEL-009 uses complete-behavior-no-cross-game-counterpart: goblin and dragon chase velocity is blended at type-specific strength and normalized, which is steering rather than t10 diagonal input normalization.", "type-strength normalized monster pursuit")
insufficient("village-guardian:VG3-MODEL-012", "When a monster overlaps a trail segment", "repositions villagers for that suffix, truncates the trail before the hit index", "gives the knight configured invulnerability", "VG3-MODEL-012 uses complete-behavior-no-cross-game-counterpart: a trail-segment hit rolls back the affected suffix, recomputes retained progress, and grants invulnerability.", "trail-suffix rollback on monster contact")
insufficient("village-guardian:VG3-MODEL-013", "With zero invulnerability", "a monster overlap clears and re-scatters a nonempty trail", "Both branches set configured invulnerability", "VG3-MODEL-013 uses complete-behavior-no-cross-game-counterpart: vulnerable monster contact either re-scatters a nonempty trail or costs a life when the trail is empty, then starts invulnerability.", "trail-dependent monster collision consequence")
fragment("village-guardian:VG3-MODEL-014", "playing status, sanctuary overlap, and trail.length equal to words.length", "VG3-MODEL-014 uses incomplete-behavioral-anchors: playing status, sanctuary overlap, and trail.length equal to words.length define eligibility but not the level transition outcome.")
insufficient("village-guardian:VG3-MODEL-015", "The entered transition", "increments nextLevel, selects and slices a next sentence", "spawns that many scaled monsters", "VG3-MODEL-015 uses complete-behavior-no-cross-game-counterpart: The entered transition creates a level-scaled next sentence, villagers, speed, and capped monster population without the completion precondition in this fact.", "scaled village level population rollover")
fragment("village-guardian:VG3-MODEL-016", "empties trail and collectedWords", "VG3-MODEL-016 uses incomplete-behavioral-anchors: empties trail and collectedWords is one return-field subset tied to a transition whose trigger is in another accepted fact.")
insufficient("village-guardian:VG3-COMP-005", "When model status is defeat and phase is not ended", "the effect derives accuracy and XP, stores results", "sets phase to ended", "VG3-COMP-005 uses complete-behavior-no-cross-game-counterpart: a defeat effect stages results and ends the component but does not prove a fire-once report guard for t02.", "unguarded defeat result staging effect")
provenance("village-guardian:VG3-COMP-010", "ui-render-scaffolding", "VirtualDPad with handleDPadInput", "VG3-COMP-010 uses context-or-provenance-not-behavior: VirtualDPad with handleDPadInput is a playing-surface control binding without normalized action evidence.")
provenance("village-guardian:VG3-COMP-011", "ui-render-scaffolding", "Village Overrun!", "VG3-COMP-011 uses context-or-provenance-not-behavior: Village Overrun! appears in a defeat end-screen inventory with existing score, XP, accuracy, and stats.")

# Wizard vs Zombie: twenty-three context records; WVZ-MECH-005 is selected t13 evidence.
provenance("wizard-vs-zombie:WVZ-STT-001", "type-vocabulary", "'start' | 'playing' | 'ended'", "WVZ-STT-001 uses context-or-provenance-not-behavior: 'start' | 'playing' | 'ended' declares component phase state initialized to start.")
provenance("wizard-vs-zombie:WVZ-STT-002", "type-vocabulary", "selectedDifficulty useState", "WVZ-STT-002 uses context-or-provenance-not-behavior: selectedDifficulty useState with initial medium records component state shape, not difficulty behavior.")
provenance("wizard-vs-zombie:WVZ-STT-003", "type-vocabulary", "'playing' | 'gameover'", "WVZ-STT-003 uses context-or-provenance-not-behavior: 'playing' | 'gameover' is the core status union without a witnessed transition.")
provenance("wizard-vs-zombie:WVZ-STT-004", "type-vocabulary", "'easy' | 'medium' | 'hard'", "WVZ-STT-004 uses context-or-provenance-not-behavior: 'easy' | 'medium' | 'hard' is the advantage-games Difficulty type vocabulary.")
provenance("wizard-vs-zombie:WVZ-STT-005", "type-vocabulary", "'easy' | 'normal' | 'hard' | 'extreme'", "WVZ-STT-005 uses context-or-provenance-not-behavior: 'easy' | 'normal' | 'hard' | 'extreme' records a distinct reading-app type vocabulary, not a runtime conversion.")
provenance("wizard-vs-zombie:WVZ-MECH-001", "type-vocabulary", "GAME_WIDTH=800, GAME_HEIGHT=600", "WVZ-MECH-001 uses context-or-provenance-not-behavior: GAME_WIDTH=800, GAME_HEIGHT=600 head a geometry, HP, charge, and invulnerability constant inventory.")
provenance("wizard-vs-zombie:WVZ-MECH-002", "type-vocabulary", "speed and spawnRate coefficients per tier", "WVZ-MECH-002 uses context-or-provenance-not-behavior: speed and spawnRate coefficients per tier are difficulty configuration without a triggering state change.")
insufficient("wizard-vs-zombie:WVZ-MECH-006", "per BASE_SPAWN_RATE_MS*modifiers.spawnRate tick", "updateZombies (wizardZombie.ts lines 284-356) spawns one zombie", "capped at 50 total", "WVZ-MECH-006 uses complete-behavior-no-cross-game-counterpart: each modified spawn tick creates one capped zombie at a cardinal off-screen gate with configured damage and speed.", "difficulty-scaled cardinal zombie spawning")
provenance("wizard-vs-zombie:WVZ-MECH-008", "ui-render-scaffolding", "loads player, zombie, orb, and floor images", "WVZ-MECH-008 uses context-or-provenance-not-behavior: loads player, zombie, orb, and floor images from public paths is runtime asset wiring.")
provenance("wizard-vs-zombie:WVZ-MECH-009", "type-vocabulary", "zombieSpeed (min 0.5, max 2.0, default 1.0, step 0.1)", "WVZ-MECH-009 uses context-or-provenance-not-behavior: zombieSpeed (min 0.5, max 2.0, default 1.0, step 0.1) is one registered tuning parameter.")
provenance("wizard-vs-zombie:WVZ-MECH-010", "ui-render-scaffolding", "playerFrame/zombieFrame/orbFrame 0->1->2 every 150ms", "WVZ-MECH-010 uses context-or-provenance-not-behavior: playerFrame/zombieFrame/orbFrame 0->1->2 every 150ms is sprite animation presentation.")
provenance("wizard-vs-zombie:WVZ-MECH-012", "ui-render-scaffolding", "Find: <targetWord>", "WVZ-MECH-012 uses context-or-provenance-not-behavior: Find: <targetWord> appears in a HUD inventory displaying existing HP, charges, score, and target state.")
provenance("wizard-vs-zombie:WVZ-MECH-013", "ui-render-scaffolding", "circular CAST button", "WVZ-MECH-013 uses context-or-provenance-not-behavior: circular CAST button and scaled VirtualDPad describe rendered touch controls without semantic action mapping.")
provenance("wizard-vs-zombie:WVZ-MECH-014", "ui-render-scaffolding", "floor via Rect fillPatternRepeat='repeat'", "WVZ-MECH-014 uses context-or-provenance-not-behavior: floor via Rect fillPatternRepeat='repeat' heads a detailed Konva scene-render inventory.")
provenance("wizard-vs-zombie:WVZ-MECH-015", "ui-render-scaffolding", "red damage-flash overlay", "WVZ-MECH-015 uses context-or-provenance-not-behavior: red damage-flash overlay is a visual response whose triggering damage rule is not in this fact.")
provenance("wizard-vs-zombie:WVZ-MECH-016", "ui-render-scaffolding", "projects floatingTexts into screen space", "WVZ-MECH-016 uses context-or-provenance-not-behavior: projects floatingTexts into screen space and fades them by life is camera-aware effect rendering.")
provenance("wizard-vs-zombie:WVZ-MECH-017", "transport-or-api-wiring", "sends score=results.xp, correctAnswers, totalAttempts, accuracy*100, difficulty", "WVZ-MECH-017 uses context-or-provenance-not-behavior: sends score=results.xp, correctAnswers, totalAttempts, accuracy*100, difficulty records completion payload wiring.")
provenance("wizard-vs-zombie:WVZ-MECH-019", "transport-or-api-wiring", "/api/v1/games/wizard-vs-zombie/vocabulary", "WVZ-MECH-019 uses context-or-provenance-not-behavior: /api/v1/games/wizard-vs-zombie/vocabulary and fallback installation are content transport behavior, not gameplay rules.")
provenance("wizard-vs-zombie:WVZ-MECH-020", "ui-render-scaffolding", "passes it to WizardZombieGame as a prop", "WVZ-MECH-020 uses context-or-provenance-not-behavior: passes it to WizardZombieGame as a prop records difficulty component plumbing without its rule effect.")
provenance("wizard-vs-zombie:WVZ-MECH-021", "transport-or-api-wiring", "/api/v1/games/wizard-vs-zombie/ranking?difficulty=<tier>", "WVZ-MECH-021 uses context-or-provenance-not-behavior: /api/v1/games/wizard-vs-zombie/ranking?difficulty=<tier> is ranking-tab fetch wiring.")
provenance("wizard-vs-zombie:WVZ-MECH-022", "ui-render-scaffolding", "CSS-frame sprite animation", "WVZ-MECH-022 uses context-or-provenance-not-behavior: CSS-frame sprite animation describes briefing-tab presentation of a pose sheet.")
provenance("wizard-vs-zombie:WVZ-MECH-023", "ui-render-scaffolding", "inline briefing overlay", "WVZ-MECH-023 uses context-or-provenance-not-behavior: inline briefing overlay contains rules copy and a Grimoire preview before play, not executable rule evidence.")
provenance("wizard-vs-zombie:WVZ-MECH-024", "ui-render-scaffolding", "PlayAgain + Exit-to-Menu buttons", "WVZ-MECH-024 uses context-or-provenance-not-behavior: PlayAgain + Exit-to-Menu buttons and result tiles are gameover surface presentation without restart semantics.")

# Enchanted Library predicate-only evidence removed from t09 after atom review.
insufficient("enchanted-library:EL-VICTORY-001", "after all entries meet or exceed two", "The victory predicate returns false if any vocabulary progress count is below two", "true after all entries meet or exceed two", "EL-VICTORY-001 uses complete-behavior-no-cross-game-counterpart: the accepted fact proves a two-collection boolean mastery predicate but no state transition, so it cannot support t09 terminalization.", "two-collection vocabulary mastery predicate")

# Rune Forge Chamber: seven individually reviewed context records.
provenance("rune-forge-chamber:RFC-CUR-006", "type-vocabulary", "start, playing, and defeat status values", "RFC-CUR-006 uses context-or-provenance-not-behavior: start, playing, and defeat status values occur in a broad state-field declaration, not an atomic transition.")
insufficient("rune-forge-chamber:RFC-CUR-008", "the supplied RNG", "shuffles circle angles with the supplied RNG", "returns playing level one with zeroed progress counters", "RFC-CUR-008 uses complete-behavior-no-cross-game-counterpart: the supplied RNG shuffles circle angles while initial creation doubles the timer and returns a zero-progress playing level.", "seeded rune-circle level initialization")
insufficient("rune-forge-chamber:RFC-CUR-009", "Level advancement", "increments the level, reduces the timer to eighty percent", "resets collected words and target index", "RFC-CUR-009 uses complete-behavior-no-cross-game-counterpart: Level advancement shortens the timer, randomly replaces the sentence and circles, and resets collection state without an explicit completion trigger.", "random rune-forge level rollover")
provenance("rune-forge-chamber:RFC-CUR-014", "ui-render-scaffolding", "start, playing, and ended UI phases", "RFC-CUR-014 uses context-or-provenance-not-behavior: start, playing, and ended UI phases plus default selections describe component state and reset wiring without a complete start transition.")
provenance("rune-forge-chamber:RFC-CUR-017", "ui-render-scaffolding", "labels selection as Tap / Click", "RFC-CUR-017 uses context-or-provenance-not-behavior: labels selection as Tap / Click and the adjacent instructions are start-screen copy, not input normalization evidence.")
provenance("rune-forge-chamber:RFC-CUR-020", "ui-render-scaffolding", "renders the current translation and the collected-word sequence", "RFC-CUR-020 uses context-or-provenance-not-behavior: renders the current translation and the collected-word sequence only maps existing rule state to fixed-width text.")
provenance("rune-forge-chamber:RFC-CUR-021", "ui-render-scaffolding", "forge timer, rune health, collected-word count, and level HUD elements", "RFC-CUR-021 uses context-or-provenance-not-behavior: forge timer, rune health, collected-word count, and level HUD elements are presentation of mapped state.")

# Rune Match: six individually reviewed context records.
provenance("rune-match:RM-CONFIG-001", "type-vocabulary", "6-column by 8-row grid", "RM-CONFIG-001 uses context-or-provenance-not-behavior: 6-column by 8-row grid appears in a constants inventory with HP, monster, damage, power-up, and spawn tuning.")
provenance("rune-match:RM-MECH-001", "type-vocabulary", "selection, playing, victory, and defeat statuses", "RM-MECH-001 uses context-or-provenance-not-behavior: selection, playing, victory, and defeat statuses head a state-shape inventory rather than a transition.")
insufficient("rune-match:RM-MECH-002", "without initial horizontal or vertical adjacent matches", "initializeGrid repeatedly creates a grid", "returns when findPossibleMoves reports at least one move", "RM-MECH-002 uses complete-behavior-no-cross-game-counterpart: initializeGrid retries match-free layouts until at least one possible move exists, with a bounded 50-attempt fallback.", "match-free solvable grid generation")
insufficient("rune-match:RM-MECH-003", "segments of length at least two", "findMatches scans horizontal and vertical segments", "marks an intersecting group of at least five coordinates as special", "RM-MECH-003 uses complete-behavior-no-cross-game-counterpart: findMatches retains, joins, and marks qualifying horizontal and vertical coordinate groups under Rune Match thresholds.", "overlap-aware rune match grouping")
insufficient("rune-match:RM-MECH-004", "matched-coordinate gravity", "processMatches repeatedly applies matched-coordinate gravity", "stops after no groups or more than 100 cascades", "RM-MECH-004 uses complete-behavior-no-cross-game-counterpart: processMatches repeatedly applies gravity and records cascade indexes until no groups remain or the safety bound is exceeded.", "bounded cascading rune resolution")
provenance("rune-match:RM-CONTENT-001", "test-fixture-or-test-id", "25 Thai/English term pairs", "RM-CONTENT-001 uses context-or-provenance-not-behavior: 25 Thai/English term pairs describe sample vocabulary content, not a mechanic applied to that content.")

# Shadow Gate Dungeon: nine individually reviewed context records.
provenance("shadow-gate-dungeon:SGD-STATE-001", "type-vocabulary", "gamePhase as start", "SGD-STATE-001 uses context-or-provenance-not-behavior: gamePhase as start, null state/results, and a report ref inventory component state but do not execute a transition.")
insufficient("shadow-gate-dungeon:SGD-STATE-002", "resetGame", "creates a Shadow Gate Dungeon state from vocabulary and selected difficulty and creature", "clears results, and clears the reported ref", "SGD-STATE-002 uses complete-behavior-no-cross-game-counterpart: resetGame recreates dungeon rule state and clears results plus the completion guard, but the fact does not prove entry into active play for t14.", "dungeon session and report-guard reset")
provenance("shadow-gate-dungeon:SGD-WORLD-001", "type-vocabulary", "configured game dimensions are 390 by 700", "SGD-WORLD-001 uses context-or-provenance-not-behavior: configured game dimensions are 390 by 700 within a world-size, gate, speed, radius, and health constant inventory.")
provenance("shadow-gate-dungeon:SGD-STEALTH-001", "type-vocabulary", "chase duration 1500 ms", "SGD-STEALTH-001 uses context-or-provenance-not-behavior: chase duration 1500 ms is one member of a patrol, collision, damage, and XP configuration inventory.")
insufficient("shadow-gate-dungeon:SGD-MOVE-001", "tickShadowGateDungeon", "advances gameTime", "clamps player x and y between the player radius and the configured game bounds", "SGD-MOVE-001 uses complete-behavior-no-cross-game-counterpart: tickShadowGateDungeon advances time, integrates supplied velocity inside radial bounds, and decays invincibility as one dungeon movement step.", "bounded dungeon movement and invincibility decay")
insufficient("shadow-gate-dungeon:SGD-STEALTH-002", "when player distance is below sightRadius", "enters chase mode and resets chaseTimer", "decrements the timer while chasing otherwise", "SGD-STEALTH-002 uses complete-behavior-no-cross-game-counterpart: when player distance is below sightRadius, the creature enters or refreshes chase, otherwise an existing chase timer counts down.", "sight-radius timed chase mode")
insufficient("shadow-gate-dungeon:SGD-STEALTH-003", "When not chasing", "creature position is calculated on a circular path", "with tangential velocity", "SGD-STEALTH-003 uses complete-behavior-no-cross-game-counterpart: When not chasing, the creature follows a configured circular patrol path with tangential velocity.", "circular creature patrol motion")
insufficient("shadow-gate-dungeon:SGD-COLL-001", "If the player is not invincible and the player-creature distance is below the sum of their radii", "the update subtracts creature collision damage", "sets invincibility", "SGD-COLL-001 uses complete-behavior-no-cross-game-counterpart: eligible player-creature contact subtracts configured collision damage and starts invincibility, a dungeon contact rule.", "invincibility-gated creature contact damage")
insufficient("shadow-gate-dungeon:SGD-TRANS-001", "After targetIndex reaches the word count", "the gate is unlocked", "if the player is close enough to the gate center, status becomes victory", "SGD-TRANS-001 uses complete-behavior-no-cross-game-counterpart: full word progress first unlocks the gate, while a separate proximity condition later causes victory, so it is not immediate t09 continuation or terminalization.", "full-progress gate unlock then proximity victory")

# Sorcerer Ziggurat: twelve individually reviewed context records.
provenance("sorcerer-ziggurat:SZ-HIST-003", "type-vocabulary", "sentence/token position", "SZ-HIST-003 uses context-or-provenance-not-behavior: sentence/token position is one field in a historical state-model inventory without an executable rule.")
fragment("sorcerer-ziggurat:SZ-HIST-005", "penalized a legal wrong target while incrementing attempts", "SZ-HIST-005 uses incomplete-behavioral-anchors: penalized a legal wrong target while incrementing attempts does not identify the penalty state change, so it cannot prove the revised t13 gameplay-penalty atom.")
provenance("sorcerer-ziggurat:SZ-HIST-010", "ui-render-scaffolding", "960x540 viewport", "SZ-HIST-010 uses context-or-provenance-not-behavior: 960x540 viewport and isometric projection values are scene and camera configuration rather than a rule transition.")
provenance("sorcerer-ziggurat:SZ-HIST-011", "ui-render-scaffolding", "configured camera follow with lerp 0.1/0.1 and vertical offset 72", "SZ-HIST-011 uses context-or-provenance-not-behavior: configured camera follow with lerp 0.1/0.1 and vertical offset 72 is historical scene presentation.")
provenance("sorcerer-ziggurat:SZ-HIST-012", "ui-render-scaffolding", "created depth-sorted cube and label targets", "SZ-HIST-012 uses context-or-provenance-not-behavior: created depth-sorted cube and label targets plus pointer handlers describes rendering and event wiring, not selection resolution.")
fragment("sorcerer-ziggurat:SZ-HIST-013", "queued input while moving", "SZ-HIST-013 uses incomplete-behavioral-anchors: queued input while moving is one clause in a composite selector/FX/rerender orchestration fact and lacks its own resolved outcome.")
provenance("sorcerer-ziggurat:SZ-HIST-015", "type-vocabulary", "reachableFrom adjacency", "SZ-HIST-015 uses context-or-provenance-not-behavior: reachableFrom adjacency appears in the historical graph data contract and does not itself apply traversal behavior.")
insufficient("sorcerer-ziggurat:SZ-HIST-017", "per token level", "created three directional nodes", "assigned lane-derived grid/elevation coordinates", "SZ-HIST-017 uses complete-behavior-no-cross-game-counterpart: per token level, the generator creates three directions, seeds one correct path, links from the prior correct node, and assigns lane-derived coordinates.", "seeded three-branch ziggurat graph generation")
insufficient("sorcerer-ziggurat:SZ-HIST-018", "the current node", "selected nodes whose reachableFrom included the current node", "tested target legality with the same relation", "SZ-HIST-018 uses complete-behavior-no-cross-game-counterpart: the current node's reachableFrom relation drives both adjacency enumeration and target-legality testing in the historical graph.", "reachableFrom traversal legality")
insufficient("sorcerer-ziggurat:SZ-HIST-019", "supplied origin and tile/elevation dimensions", "converted integer grid/elevation coordinates to screen x/y", "deterministic display depth", "SZ-HIST-019 uses complete-behavior-no-cross-game-counterpart: supplied projection parameters convert grid and elevation coordinates into screen position plus deterministic depth.", "isometric grid-elevation projection")
provenance("sorcerer-ziggurat:SZ-HIST-020", "ui-render-scaffolding", "procedural particle texture/emitter", "SZ-HIST-020 uses context-or-provenance-not-behavior: procedural particle texture/emitter and conditional background/panel assets are renderer construction.")
provenance("sorcerer-ziggurat:SZ-HIST-021", "ui-render-scaffolding", "faded, scaled, and destroyed it with a tween", "SZ-HIST-021 uses context-or-provenance-not-behavior: faded, scaled, and destroyed it with a tween describes a semantic visual effect lifecycle without domain-state mutation.")

# Labyrinth Goblin King: six individually reviewed context records.
provenance("labyrinth-goblin-king:LGK-STATE-001", "type-vocabulary", "four-value union start, playing, victory, defeat", "LGK-STATE-001 uses context-or-provenance-not-behavior: four-value union start, playing, victory, defeat is a status declaration without an observed state transition.")
insufficient("labyrinth-goblin-king:LGK-MAZE-001", "11-column by 15-row configuration", "walls on the outer boundary and even/even interior coordinates", "opens the left entrance at row 1 and right exit at row rows-2", "LGK-MAZE-001 uses complete-behavior-no-cross-game-counterpart: the 11-column by 15-row configuration builds a patterned maze and opens two fixed edge passages.", "patterned goblin-maze generation")
insufficient("labyrinth-goblin-king:LGK-MOVE-001", "desired direction from dx/dy", "attempts a snapped turn when within 0.45 tileSize", "continues the prior direction when movement remains possible", "LGK-MOVE-001 uses complete-behavior-no-cross-game-counterpart: desired direction from dx/dy receives a near-grid snapped turn or continues the prior legal direction, a maze-specific steering rule.", "near-grid snapped maze turning")
insufficient("labyrinth-goblin-king:LGK-COLL-001", "size-adjusted player or goblin rectangle", "canMove tests all four corners", "out-of-maze coordinates are walls", "LGK-COLL-001 uses complete-behavior-no-cross-game-counterpart: canMove tests every corner of a size-adjusted actor rectangle and treats out-of-maze coordinates as walls.", "four-corner maze occupancy test")
insufficient("labyrinth-goblin-king:LGK-TRANS-001", "When the final word orb in a sentence is collected in order", "enables heroic aura, marks goblins fleeing", "advances to the next sentence modulo allSentences", "LGK-TRANS-001 uses complete-behavior-no-cross-game-counterpart: final ordered collection advances modulo all sentences while enabling heroic aura, fleeing goblins, and a full orb reset rather than terminalizing content.", "modulo sentence rollover with heroic aura")
insufficient("labyrinth-goblin-king:LGK-GOBLIN-001", "unless heroic aura marks the goblin eaten", "Goblin movement selects fleeing directions away from the player", "collision costs a life", "LGK-GOBLIN-001 uses complete-behavior-no-cross-game-counterpart: Goblin movement switches among flee, chase, and patrol policies, while contact costs life unless heroic aura makes the goblin edible.", "aura-dependent goblin movement and contact")

# Magic Defense: thirty-two individually reviewed context records.
provenance("magic-defense:MD-MECH-003", "type-vocabulary", "MAX_CASTLE_HP is exported as the constant 3", "MD-MECH-003 uses context-or-provenance-not-behavior: MAX_CASTLE_HP is exported as the constant 3 and therefore supplies configuration, not a transition.")
provenance("magic-defense:MD-MECH-004", "type-vocabulary", "CastleId type union 'left' | 'center' | 'right'", "MD-MECH-004 uses context-or-provenance-not-behavior: CastleId type union 'left' | 'center' | 'right' is a vocabulary declaration without behavior.")
provenance("magic-defense:MD-MECH-005", "type-vocabulary", "DEFAULT_CASTLES initializes left/center/right", "MD-MECH-005 uses context-or-provenance-not-behavior: DEFAULT_CASTLES initializes left/center/right to a constant HP and documents default data shape rather than an operation.")
insufficient("magic-defense:MD-MECH-007", "spawnMissile", "picks a random vocabulary item", "assigns targetCastleId via getNearestAliveCastleId", "MD-MECH-007 uses complete-behavior-no-cross-game-counterpart: spawnMissile picks a random vocabulary item and assigns its target to the nearest surviving castle, a defense-specific targeting policy.", "nearest-alive-castle missile targeting")
fragment("magic-defense:MD-MECH-008", "matches the input by lowercased translation equality", "MD-MECH-008 uses incomplete-behavioral-anchors: matches the input by lowercased translation equality states a lookup predicate but not the missile transition caused by a match or mismatch.")
insufficient("magic-defense:MD-MECH-009", "handleReachBottom", "increases spawn rate by 200ms (cap 3000ms) and duration by 0.5s (cap 15s)", "damages the nearest alive castle", "MD-MECH-009 uses complete-behavior-no-cross-game-counterpart: handleReachBottom applies capped missile scaling, resets combo, records a miss, and damages the nearest alive castle.", "missile-bottom adaptive castle damage")
insufficient("magic-defense:MD-MECH-010", "when mana >= 100", "activateSpecialAbility (Thunder Storm) destroys all falling missiles", "creates one explosion per falling missile", "MD-MECH-010 uses complete-behavior-no-cross-game-counterpart: when mana >= 100, Thunder Storm destroys every falling missile and creates one explosion for each, a game-specific charged ability.", "full-board thunder-storm ability")
provenance("magic-defense:MD-MECH-013", "type-vocabulary", "SCALING_CONFIG caps the dynamic difficulty", "MD-MECH-013 uses context-or-provenance-not-behavior: SCALING_CONFIG caps the dynamic difficulty and inventories adjustment constants without a triggering milestone.")
provenance("magic-defense:MD-MECH-014", "type-vocabulary", "easy/normal/hard/extreme spawnRate and duration pairs", "MD-MECH-014 uses context-or-provenance-not-behavior: easy/normal/hard/extreme spawnRate and duration pairs are tuning presets, not a runtime transition.")
provenance("magic-defense:MD-MECH-015", "type-vocabulary", "DIFFICULTY_SETTINGS['normal'] for unknown diff values", "MD-MECH-015 uses context-or-provenance-not-behavior: DIFFICULTY_SETTINGS['normal'] for unknown diff values documents a configuration fallback without a gameplay outcome.")
provenance("magic-defense:MD-MECH-016", "type-vocabulary", "manaCostSpecial=100", "MD-MECH-016 uses context-or-provenance-not-behavior: manaCostSpecial=100 is one constant in a timer and spawn-coordinate inventory rather than an invoked ability rule.")
insufficient("magic-defense:MD-MECH-017", "Correct answer", "increments combo, adds 10 mana", "spawns a MagicBolt from a random alive castle", "MD-MECH-017 uses complete-behavior-no-cross-game-counterpart: Correct answer increments combo, mana, and score while spawning a bolt from a random live castle, a defense-specific reward bundle.", "correct-answer bolt and resource reward")
insufficient("magic-defense:MD-MECH-019", "Each combo milestone of 3 (combo+1) % 3 === 0", "reduces spawnRate by 200 (cap minSpawnRate)", "duration by 0.5s (cap minDuration)", "MD-MECH-019 uses complete-behavior-no-cross-game-counterpart: Each combo milestone of 3 reduces both spawn interval and duration under independent lower caps, a combo-driven difficulty rule.", "combo-milestone missile acceleration")
insufficient("magic-defense:MD-MECH-020", "hp>=MAX_CASTLE_HP=3", "getCastleRowForHp(hp) returns row 0", "otherwise row 2", "MD-MECH-020 uses complete-behavior-no-cross-game-counterpart: hp>=MAX_CASTLE_HP=3 maps to row 0, HP two maps to row 1, and all lower values map to row 2 for castle damage rendering.", "castle-HP sprite-row selection")
insufficient("magic-defense:MD-MECH-021", "when no castle is alive", "getNearestAliveCastleId returns the closest alive castle by x position", "falls back to 'center' when no castle is alive", "MD-MECH-021 uses complete-behavior-no-cross-game-counterpart: getNearestAliveCastleId chooses the closest surviving castle by x and falls back to center when none survives.", "nearest surviving castle selection")
fragment("magic-defense:MD-MECH-022", "simply sets status='game-over'", "MD-MECH-022 uses incomplete-behavioral-anchors: simply sets status='game-over' identifies a reducer assignment but provides no eligibility precondition for invoking endGame.")
provenance("magic-defense:MD-ST-001", "type-vocabulary", "'idle' | 'playing' | 'game-over'", "MD-ST-001 uses context-or-provenance-not-behavior: 'idle' | 'playing' | 'game-over' is the declared status vocabulary, not a witnessed transition.")
provenance("magic-defense:MD-ST-002", "type-vocabulary", "'falling' | 'targeted' | 'dying'", "MD-ST-002 uses context-or-provenance-not-behavior: 'falling' | 'targeted' | 'dying' declares missile states without the events that move between them.")
provenance("magic-defense:MD-ST-003", "ui-render-scaffolding", "rendered by the Explosion component until onComplete fires", "MD-ST-003 uses context-or-provenance-not-behavior: rendered by the Explosion component until onComplete fires describes a visual effect lifecycle without a domain-state result.")
provenance("magic-defense:MD-ST-004", "ui-render-scaffolding", "renders as a MagicBolt", "MD-ST-004 uses context-or-provenance-not-behavior: renders as a MagicBolt maps display fields to a component and does not establish collision behavior.")
provenance("magic-defense:MD-ST-005", "ui-render-scaffolding", "HUD renders score / accuracy / combo / mana / timeRemaining", "MD-ST-005 uses context-or-provenance-not-behavior: HUD renders score / accuracy / combo / mana / timeRemaining as presentation of existing state.")
provenance("magic-defense:MD-ST-006", "ui-render-scaffolding", "only when mana >= 100 and on sm+ viewports", "MD-ST-006 uses context-or-provenance-not-behavior: only when mana >= 100 and on sm+ viewports governs visibility of a Ready label, not activation behavior.")
provenance("magic-defense:MD-ST-007", "ui-render-scaffolding", "text-destructive animate-pulse when timeRemaining <= 10", "MD-ST-007 uses context-or-provenance-not-behavior: text-destructive animate-pulse when timeRemaining <= 10 is a warning style switch without timer-state mutation.")
provenance("magic-defense:MD-ST-008", "ui-render-scaffolding", "select CSS animations per missile state", "MD-ST-008 uses context-or-provenance-not-behavior: select CSS animations per missile state records class-name presentation mapping.")
provenance("magic-defense:MD-ST-009", "ui-render-scaffolding", "animates top: 30% -> 100%", "MD-ST-009 uses context-or-provenance-not-behavior: animates top: 30% -> 100% and rotation callbacks describe rendered motion plumbing around separately mapped transitions.")
provenance("magic-defense:MD-ST-010", "ui-render-scaffolding", "Try Again + Leaderboard buttons", "MD-ST-010 uses context-or-provenance-not-behavior: Try Again + Leaderboard buttons occur in a results-surface inventory without restart semantics.")
provenance("magic-defense:MD-ST-011", "ui-render-scaffolding", "vocabulary preview of up to 50 items", "MD-ST-011 uses context-or-provenance-not-behavior: vocabulary preview of up to 50 items and difficulty icons are start-screen presentation.")
provenance("magic-defense:MD-ST-012", "ui-render-scaffolding", "caps at 50 items via .slice(0, 50)", "MD-ST-012 uses context-or-provenance-not-behavior: caps at 50 items via .slice(0, 50) is a preview display limit, not content selection for play.")
provenance("magic-defense:MD-ST-013", "type-vocabulary", "difficulty tabs 'easy' | 'medium' | 'hard' | 'extreme'", "MD-ST-013 uses context-or-provenance-not-behavior: difficulty tabs 'easy' | 'medium' | 'hard' | 'extreme' record a UI vocabulary mismatch rather than a mechanic.")
provenance("magic-defense:MD-ST-014", "ui-render-scaffolding", "status-driven screen switching idle->StartScreen, playing->GameEngine, game-over->ResultsScreen", "MD-ST-014 uses context-or-provenance-not-behavior: status-driven screen switching maps existing state to surfaces and adds no state transition.")
insufficient("magic-defense:MD-TRANS-004", "on correct match", "ActiveMissile state transition falling -> targeted", "triggered by checkAnswer()", "MD-TRANS-004 uses complete-behavior-no-cross-game-counterpart: on correct match, checkAnswer changes a falling missile to targeted as the first half of a defense-specific projectile lifecycle.", "correct-match missile targeting transition")
insufficient("magic-defense:MD-TRANS-005", "when the bolt reaches the enemy", "ActiveMissile state transition targeted -> dying", "occurs in handleBoltComplete", "MD-TRANS-005 uses complete-behavior-no-cross-game-counterpart: when the bolt reaches the enemy, handleBoltComplete changes the missile from targeted to dying, a defense-specific effect handoff.", "bolt-arrival missile dying transition")
# MD-TRANS-006 is quarantined below under the v13 contradiction contract.

# Paladins Twin Soul: ten individually reviewed context records.
fragment("paladins-twin-soul:PTS-C-STATE-001", "initializes an enemy formation", "PTS-C-STATE-001 uses incomplete-behavioral-anchors: initializes an enemy formation gives no vocabulary input, placement rule, or observable initialized state.")
fragment("paladins-twin-soul:PTS-C-COMBAT-001", "updates player, enemy, and bullet movement", "PTS-C-COMBAT-001 uses incomplete-behavioral-anchors: updates player, enemy, and bullet movement names three tick responsibilities without their guards or results.")
fragment("paladins-twin-soul:PTS-C-COMBAT-002", "can remove an enemy and rescue a captured player", "PTS-C-COMBAT-002 uses incomplete-behavioral-anchors: can remove an enemy and rescue a captured player does not state the exact hit eligibility or deterministic branch.")
fragment("paladins-twin-soul:PTS-C-HEALTH-TERMINAL-001", "decrements player HP and can set defeat", "PTS-C-HEALTH-TERMINAL-001 uses incomplete-behavioral-anchors: decrements player HP and can set defeat omits the resource threshold that makes defeat occur.")
fragment("paladins-twin-soul:PTS-C-CAPTURE-001", "marks a player and enemy and assigns vocabulary labels", "PTS-C-CAPTURE-001 uses incomplete-behavioral-anchors: marks a player and enemy and assigns vocabulary labels lacks the capture trigger and resulting playable state.")
fragment("paladins-twin-soul:PTS-C-TRANSITION-001", "advances the wave when enemies are absent and can assign victory", "PTS-C-TRANSITION-001 uses incomplete-behavioral-anchors: advances the wave when enemies are absent and can assign victory leaves the final-wave predicate and exact outcome ambiguous.")
fragment("paladins-twin-soul:PTS-C-RESULT-001", "historical attempt and bonus branches", "PTS-C-RESULT-001 uses incomplete-behavioral-anchors: historical attempt and bonus branches do not expose inputs, formula, or returned XP.")
provenance("paladins-twin-soul:PTS-C-SCENE-COPY-001", "ui-render-scaffolding", "start and ended scene copy", "PTS-C-SCENE-COPY-001 uses context-or-provenance-not-behavior: start and ended scene copy is presentation inventory without phase transition evidence.")
fragment("paladins-twin-soul:PTS-C-SCENE-TRANSITION-001", "calls onComplete for terminal state", "PTS-C-SCENE-TRANSITION-001 uses incomplete-behavioral-anchors: calls onComplete for terminal state is bundled with an animation loop and supplies no fire-once guard or exact result contract.")
provenance("paladins-twin-soul:PTS-C-RENDER-001", "ui-render-scaffolding", "Konva stage and VirtualDPad input handler", "PTS-C-RENDER-001 uses context-or-provenance-not-behavior: Konva stage and VirtualDPad input handler establish rendering and control surfaces, not normalized actions.")

# Potion Rush: ten individually reviewed context records.
provenance("potion-rush:PR-CUR-005", "type-vocabulary", "MENU, PLAYING, PAUSED, and GAME_OVER", "PR-CUR-005 uses context-or-provenance-not-behavior: MENU, PLAYING, PAUSED, and GAME_OVER plus cauldron states are declared vocabularies without a transition.")
provenance("potion-rush:PR-CUR-006", "type-vocabulary", "three entity collections", "PR-CUR-006 uses context-or-provenance-not-behavior: three entity collections occurs in a store-field inventory and defines data shape rather than behavior.")
insufficient("potion-rush:PR-CUR-008", "first empty slot", "Customer spawning fills", "appends every request word to the active pool", "PR-CUR-008 uses complete-behavior-no-cross-game-counterpart: Customer spawning fills the first empty slot, samples vocabulary and type, scales patience, and appends the request words to the active pool.", "slotted customer request spawning")
insufficient("potion-rush:PR-CUR-009", "Each tick", "scales belt speed by completed sentences", "recycles words whose ingredients leave the belt", "PR-CUR-009 uses complete-behavior-no-cross-game-counterpart: Each tick scales and moves the conveyor, then recycles words for non-dragged ingredients that leave the belt.", "progress-scaled ingredient conveyor recycling")
insufficient("potion-rush:PR-CUR-010", "Waiting-customer patience", "decreases", "expiration removes 25 reputation", "PR-CUR-010 uses complete-behavior-no-cross-game-counterpart: Waiting-customer patience decreases until expiration applies reputation loss, records anger, and resets the customer's cauldron.", "customer-patience expiration penalty")
insufficient("potion-rush:PR-CUR-012", "Dumping a cauldron", "recycles its current words", "resets it to IDLE with no target sentence", "PR-CUR-012 uses complete-behavior-no-cross-game-counterpart: Dumping a cauldron recycles its current words and resets that station to IDLE with no target sentence.", "cauldron dump and word recycling")
insufficient("potion-rush:PR-CUR-013", "Serving requires a completed cauldron", "marks the customer happy, resets the cauldron", "recalculates local XP", "PR-CUR-013 uses complete-behavior-no-cross-game-counterpart: Serving requires matched customer and completed cauldron state, then resolves happiness, score, sentence count, and local XP as one service transaction.", "matched completed-cauldron serving transaction")
provenance("potion-rush:PR-CUR-016", "ui-render-scaffolding", "renders wall, floor, customer queue, counter, cauldron station, trash portal, conveyor belt, and effects", "PR-CUR-016 uses context-or-provenance-not-behavior: renders wall, floor, customer queue, counter, cauldron station, trash portal, conveyor belt, and effects inventories scene layers.")
provenance("potion-rush:PR-CUR-018", "ui-render-scaffolding", "divides the width into three slots", "PR-CUR-018 uses context-or-provenance-not-behavior: divides the width into three slots maps cauldron state to display centers without a gameplay transition.")
provenance("potion-rush:PR-CUR-024", "ui-render-scaffolding", "four difficulty buttons", "PR-CUR-024 uses context-or-provenance-not-behavior: four difficulty buttons and an absolute game container describe page composition rather than difficulty policy.")

# Realm Carver: two individually reviewed context records.
insufficient("realm-carver:RC-HIST-006", "after completion", "reported XP and accuracy", "once after completion", "RC-HIST-006 uses complete-behavior-no-cross-game-counterpart: after completion, the historical component reported XP and accuracy once, but the accepted fact supplies no fire-once guard or guard state for t02.", "unguarded historical terminal reporting")
provenance("realm-carver:RC-HIST-007", "ui-render-scaffolding", "rendered HUD, target-word, grid-cell, word, monster, player, victory, and defeat surfaces", "RC-HIST-007 uses context-or-provenance-not-behavior: rendered HUD, target-word, grid-cell, word, monster, player, victory, and defeat surfaces inventories UI and copy without the enclosure rule itself.")

# Dragon Rider: eight individually reviewed context records.
provenance("dragon-rider:DR-SCENE-001", "provenance-location", "exported from the vocabulary/dragon-rider component module", "DR-SCENE-001 uses context-or-provenance-not-behavior: exported from the vocabulary/dragon-rider component module establishes the current component location but supplies no state transition.")
insufficient("dragon-rider:DR-MECH-001", "The core default duration is 150000 ms", "state creation starts running", "elapsedMs 0, attempts 0, correctAnswers 0, and dragonCount 1", "DR-MECH-001 uses complete-behavior-no-cross-game-counterpart: The core default duration is 150000 ms and state creation starts running with a dragon-specific counter bundle, not a shared reset contract.", "dragon-rider timed-state initialization")
insufficient("dragon-rider:DR-TRANS-003", "while playing/running", "advances core time every 60 ms", "moves one gate pair from above the stage toward the bottom", "DR-TRANS-003 uses complete-behavior-no-cross-game-counterpart: while playing/running, the component advances core time every 60 ms and moves one gate pair toward the bottom under edition-specific travel timing.", "fixed-step descending gate scheduler")
insufficient("dragon-rider:DR-TRANS-004", "A gate selection", "records a pending correct/incorrect outcome", "resolves only when the player lerps near that target", "DR-TRANS-004 uses complete-behavior-no-cross-game-counterpart: A gate selection records a pending correct/incorrect outcome and resolves only when the player lerps near that target, a deferred gate-resolution rule.", "deferred gate selection resolution")
provenance("dragon-rider:DR-STATE-001A", "type-vocabulary", "running | boss", "DR-STATE-001A uses context-or-provenance-not-behavior: running | boss is a state-union declaration without an observed transition between those values.")
provenance("dragon-rider:DR-STATE-001B", "type-vocabulary", "start | playing | ended", "DR-STATE-001B uses context-or-provenance-not-behavior: start | playing | ended inventories component phases and an initializer but does not establish an atomic transition.")
provenance("dragon-rider:DR-SCENE-002A", "ui-render-scaffolding", "default logical stage is 960x540", "DR-SCENE-002A uses context-or-provenance-not-behavior: default logical stage is 960x540 and the adjacent scale declarations are presentation configuration.")
insufficient("dragon-rider:DR-SCENE-002B", "stage width", "buildLayout computes gate centers from 0.28 and 0.72 of stage width", "playerY at 0.78 height", "DR-SCENE-002B uses complete-behavior-no-cross-game-counterpart: buildLayout computes fractional gate and actor positions from stage width and height, a cartridge-specific responsive layout contract.", "fractional dragon-rider stage layout")

# Dungeon Liberator: nine individually reviewed context records.
provenance("dungeon-liberator:DL-TOPO-001", "type-vocabulary", "GAME_WIDTH is 800 and GAME_HEIGHT is 600", "DL-TOPO-001 uses context-or-provenance-not-behavior: GAME_WIDTH is 800 and GAME_HEIGHT is 600 declares arena constants without an operation.")
insufficient("dungeon-liberator:DL-TOPO-002", "A new state", "places the player at (100, GAME_HEIGHT / 2)", "initializes prisoners from the sentence words", "DL-TOPO-002 uses complete-behavior-no-cross-game-counterpart: A new state places the player and portal at dungeon coordinates and initializes prisoners from the sentence words, an arena-specific topology setup.", "dungeon topology initialization")
fragment("dungeon-liberator:DL-MOVE-001", "updates the player, prisoners, trail, monsters, collisions, and victory condition in that order", "DL-MOVE-001 uses incomplete-behavioral-anchors: updates the player, prisoners, trail, monsters, collisions, and victory condition in that order records orchestration order but omits each operation's precondition and result.")
insufficient("dungeon-liberator:DL-TRANS-001", "when player-portal distance is less than the sum of their radii and trail.length equals words.length", "checkVictoryCondition sets phase", "phase to victory", "DL-TRANS-001 uses complete-behavior-no-cross-game-counterpart: the portal-distance and full-trail conjunction makes checkVictoryCondition set phase to victory, a dungeon-specific escape predicate.", "full-trail portal victory predicate")
insufficient("dungeon-liberator:DL-TRANS-002", "advanceToNextLevel", "increments level", "resets trail and targetIndex", "DL-TRANS-002 uses complete-behavior-no-cross-game-counterpart: advanceToNextLevel increments level, replaces sentence prisoners, adds a monster, and resets trail and targetIndex as one dungeon-level rollover.", "dungeon level rollover")
provenance("dungeon-liberator:DL-INPUT-001", "ui-render-scaffolding", "obtains input and setVirtualInput from useDirectionalInput", "DL-INPUT-001 uses context-or-provenance-not-behavior: obtains input and setVirtualInput from useDirectionalInput identifies hook and camera wiring without the resulting movement rule.")
insufficient("dungeon-liberator:DL-CAMERA-001", "When dimensions are positive", "computes scale as max(dimensions.height / GAME_HEIGHT, 0.8)", "clamps camera x and y to world bounds", "DL-CAMERA-001 uses complete-behavior-no-cross-game-counterpart: When dimensions are positive, the component scales and centers the camera on the player and clamps camera x and y to dungeon bounds.", "player-centered clamped dungeon camera")
provenance("dungeon-liberator:DL-INPUT-003", "ui-render-scaffolding", "VirtualDPad with onInput={setVirtualInput}", "DL-INPUT-003 uses context-or-provenance-not-behavior: VirtualDPad with onInput={setVirtualInput} is a rendered control binding without an independently witnessed semantic action.")
insufficient("dungeon-liberator:DL-TRANS-003", "a next state with phase victory", "is awarded XP and correct-word totals", "passed to advanceToNextLevel", "DL-TRANS-003 uses complete-behavior-no-cross-game-counterpart: a next state with phase victory is awarded totals and immediately passed to advanceToNextLevel, a component-level automatic rollover rather than the shared content-unit atom.", "automatic victory-to-next-level rollover")

# Enchanted Library: eleven individually reviewed context records.
provenance("enchanted-library:EL-CONT-001", "test-fixture-or-test-id", "vocabulary fixture contains eleven term/translation objects", "EL-CONT-001 uses context-or-provenance-not-behavior: vocabulary fixture contains eleven term/translation objects and documents test content rather than a runtime behavior.")
provenance("enchanted-library:EL-STATE-001", "type-vocabulary", "playing, gameover, and victory statuses", "EL-STATE-001 uses context-or-provenance-not-behavior: playing, gameover, and victory statuses occur in a state-shape inventory without one executable transition.")
provenance("enchanted-library:EL-DIFF-001", "type-vocabulary", "easy, normal, hard, or extreme", "EL-DIFF-001 uses context-or-provenance-not-behavior: easy, normal, hard, or extreme and their tuning values define configuration vocabulary, not an atomic mechanic.")
provenance("enchanted-library:EL-CONFIG-001", "type-vocabulary", "initial mana 50", "EL-CONFIG-001 uses context-or-provenance-not-behavior: initial mana 50 is one member of an arena and timing constant inventory rather than a transition.")
insufficient("enchanted-library:EL-INIT-002", "Initial state", "places the player at the arena center", "starts with no spirits", "EL-INIT-002 uses complete-behavior-no-cross-game-counterpart: Initial state places the player at the arena center and establishes library-specific mana, shield, timing, and spirit settings.", "enchanted-library state initialization")
insufficient("enchanted-library:EL-BOOK-002", "inside 50-pixel edge padding", "Book placement samples positions", "uses a corner fallback after 20 attempts", "EL-BOOK-002 uses complete-behavior-no-cross-game-counterpart: Book placement samples padded, separated positions and uses a corner fallback after 20 attempts, a library-specific spatial policy.", "spaced book placement with fallback")
insufficient("enchanted-library:EL-SPIRIT-002", "A spirit chooses one of four walls", "computes a normalized velocity toward the predicted point", "sets the spawn timer to 3000 ms, and increases next spirit speed", "EL-SPIRIT-002 uses complete-behavior-no-cross-game-counterpart: A spirit chooses one of four walls, aims toward a predicted point, and increases next spirit speed under a capped spawn rule.", "predictive escalating spirit spawn")
insufficient("enchanted-library:EL-TARGET-001", "words with progress below two", "Next-target selection filters vocabulary", "chooses randomly from the full vocabulary", "EL-TARGET-001 uses complete-behavior-no-cross-game-counterpart: Next-target selection filters words below mastery and falls back to the full vocabulary only when none remain, a game-specific review policy.", "below-mastery target selection")
insufficient("enchanted-library:EL-SPIRIT-COLL-001", "while the shield is active", "reflects the spirit velocity", "marks the spirit bounced", "EL-SPIRIT-COLL-001 uses complete-behavior-no-cross-game-counterpart: while the shield is active, a spirit collision reflects velocity and marks the spirit bounced; the unshielded branch applies one-time mana damage.", "shield-dependent spirit collision")
insufficient("enchanted-library:EL-LOOP-003", "Each playing step", "checks book collisions", "sets victory when the victory predicate is true", "EL-LOOP-003 uses complete-behavior-no-cross-game-counterpart: Each playing step orders collision, spirit, spawn, and victory operations, a library-specific orchestration contract rather than one reusable atom.", "enchanted-library playing-step orchestration")
provenance("enchanted-library:EL-UI-001", "ui-render-scaffolding", "start screen supplies four instruction entries", "EL-UI-001 uses context-or-provenance-not-behavior: start screen supplies four instruction entries and control/difficulty wiring, while the reset effect lacks a complete start transition.")

# Griffin Riders Escape: seven individually reviewed context records.
provenance("griffin-riders-escape:GRF-WORLD-001", "type-vocabulary", "legacy configuration defines a 390 by 844 surface", "GRF-WORLD-001 uses context-or-provenance-not-behavior: legacy configuration defines a 390 by 844 surface and tuning constants without an invoked transition.")
provenance("griffin-riders-escape:GRF-STATE-001", "type-vocabulary", "playing, victory, and defeat status", "GRF-STATE-001 uses context-or-provenance-not-behavior: playing, victory, and defeat status appear in a legacy state-field inventory rather than one behavior.")
insufficient("griffin-riders-escape:GRF-MOVE-001", "while the status is playing", "Legacy switchLane moves the player", "one bounded step among left, center, and right", "GRF-MOVE-001 uses complete-behavior-no-cross-game-counterpart: while the status is playing, Legacy switchLane moves the player one bounded lane step, which is a discrete lane-navigation rule.", "bounded lane-step movement")
insufficient("griffin-riders-escape:GRF-WAVE-001", "Legacy spawnWave", "creates either one or two obstacles in unique lanes", "one correct gate plus decoy gates in the other lanes", "GRF-WAVE-001 uses complete-behavior-no-cross-game-counterpart: Legacy spawnWave chooses between unique-lane obstacles and a correct-gate-plus-decoys formation, a game-specific wave policy.", "lane obstacle or gate wave generation")
insufficient("griffin-riders-escape:GRF-COLL-001", "the -5 through 5 collision band", "checks", "resolves an object only when its lane matches the player lane", "GRF-COLL-001 uses complete-behavior-no-cross-game-counterpart: the legacy tick checks the -5 through 5 collision band and resolves an object only when its lane matches the player lane.", "depth-band same-lane collision")
provenance("griffin-riders-escape:GRF-CART-003", "ui-render-scaffolding", "Phaser configuration with width 960 and height 540", "GRF-CART-003 uses context-or-provenance-not-behavior: Phaser configuration with width 960 and height 540 plus asset preloads is renderer setup.")
insufficient("griffin-riders-escape:GRF-CART-004", "after surface readiness", "resolves normalized traversal actions", "delivers completion once the model is complete", "GRF-CART-004 uses complete-behavior-no-cross-game-counterpart: after surface readiness, the withdrawn cartridge combines model stepping, normalized traversal actions, rendering, and a terminal delivery without evidence of a fire-once guard.", "unguarded cartridge completion delivery")

# Griffin Sky Joust: one individually reviewed context record.
fragment("griffin-sky-joust:GSJ-HIST-006", "advanced state with requestAnimationFrame", "GSJ-HIST-006 uses incomplete-behavioral-anchors: advanced state with requestAnimationFrame is one clause inside a composite historical component inventory and does not bind a single precondition, transition, and outcome.")

# Gryphon Patrol: four individually reviewed context records.
provenance("gryphon-patrol:C03-implementation-and-scenes", "ui-render-scaffolding", "React-Konva stage for playing/won/lost", "C03-implementation-and-scenes uses context-or-provenance-not-behavior: React-Konva stage for playing/won/lost describes conditional scene rendering, not the state transitions that select those screens.")
insufficient("gryphon-patrol:C06-state-and-transitions", "when HP is nonpositive", "tick sets lost", "won when collected word count equals sentence length", "C06-state-and-transitions uses complete-behavior-no-cross-game-counterpart: when HP is nonpositive, tick sets lost, while full collection sets won; the dual terminal predicate is not isolated to one shared atomic candidate.", "gryphon-patrol dual terminal predicate")
insufficient("gryphon-patrol:C07-patrol-escort-aerial-movement", "Input changes player velocity", "tick wraps x by mapWidth", "clamps y by gameHeight", "C07-patrol-escort-aerial-movement uses complete-behavior-no-cross-game-counterpart: Input changes player velocity, then tick wraps horizontal position, clamps vertical position, applies friction, and bounces enemies at bounds.", "wrapped aerial patrol movement")
insufficient("gryphon-patrol:C08-targets-projectiles-and-health", "correct target hits", "create active word orbs", "player-enemy collisions decrement HP with one-second invulnerability", "C08-targets-projectiles-and-health uses complete-behavior-no-cross-game-counterpart: correct target hits create active word orbs while player-enemy collisions decrement HP under one-second invulnerability, a compound combat loop.", "projectile-to-orb combat and invulnerable contact")



# V13 keeps contradictory accepted facts outside the capability taxonomy. The
# exact audit fields are assembled after the sealed v13 verifier is available.
CONTRADICTIONS: dict[str, dict[str, Any]] = {
    "rpg-battle:RPG-NEG-001": {
        "fact_category": "accepted-negative-control",
        "conflict_kind": "accepted-negative-control",
        "resolution": "exclude-negative-control",
        "basis_excerpt": "RPG Battle has a mana system: each power attack consumes 5 MP from a 20 MP pool that regenerates 2 MP per turn.",
        "conflict_record_ids": ["rpg-battle:RPG-MECH-020"],
        "conflict_excerpts": ["There is no mana/MP system"],
        "source_resolution_pointer": "/negative_evidence_fixtures/0",
        "rationale": "RPG-NEG-001 uses contradictory-accepted-evidence: RPG Battle has a mana system: each power attack consumes 5 MP from a 20 MP pool that regenerates 2 MP per turn. is an accepted unsupported-claim injection, while RPG-MECH-020 reports There is no mana/MP system at the same baseline; exclude the negative-control fixture from capability synthesis.",
    },
    "magic-defense:MD-TRANS-006": {
        "fact_category": "complete-behavior",
        "conflict_kind": "internal-mutually-exclusive-claims",
        "resolution": "quarantine-pending-phase1-repair",
        "basis_excerpt": "Status reset (game-over -> idle)",
        "conflict_record_ids": ["magic-defense:MD-TRANS-001"],
        "conflict_excerpts": [
            "happens via resetGame which clears score/castles/status=playing",
            "Status transition idle -> playing",
        ],
        "rationale": "MD-TRANS-006 uses contradictory-accepted-evidence: Status reset (game-over -> idle) conflicts internally with happens via resetGame which clears score/castles/status=playing and conflicts with MD-TRANS-001's Status transition idle -> playing; quarantine this transition pending Phase 1 repair.",
    },
}


# Special complete-context rationales are individually authored because the
# verifier rejects substitution-generated rationale templates.
SPECIAL_RATIONALES: dict[str, str] = {
    "abyssal-well:AW-HIST-041": "AW-HIST-041 uses redundant-to-selected-atomic-evidence: tap left of center-50px repeats Abyssal Well's selected pointer-to-action mapping at a second control boundary.",
    "dragon-flight:DF-CTRL-002": "DF-CTRL-002 uses redundant-to-selected-atomic-evidence: ArrowRight or 'd' supplies the sibling key binding beside the selected left-gate normalization witness.",
    "dragon-flight:DF-CTRL-005": "DF-CTRL-005 uses redundant-to-selected-atomic-evidence: on pointerdown routes the left button to the same selected Dragon Flight gate action.",
    "dragon-flight:DF-CTRL-006": "DF-CTRL-006 uses redundant-to-selected-atomic-evidence: A right arrow button with aria-label 'Choose right gate' triggers handleGateSelection('right') as another same-game input adapter witness.",
    "dragon-flight:DF-CTRL-008": "DF-CTRL-008 uses redundant-to-selected-atomic-evidence: only when the pair is active, the canvas left gate emits the already selected semantic gate action.",
    "dragon-flight:DF-CTRL-009": "DF-CTRL-009 uses redundant-to-selected-atomic-evidence: The right canvas gate Group calls onSelectGate('right') through another presentation-specific binding.",
    "dragon-flight:DF-MECH-010": "DF-MECH-010 uses redundant-to-selected-atomic-evidence: status is not 'running' guards the same inactive-state no-op already selected from DF-TRANS-002.",
    "dragon-flight:DF-CTRL-004": "DF-CTRL-004 uses redundant-to-selected-atomic-evidence: unless hasStarted and status is 'running', keyboard input preserves the same inactive guard at the controller layer.",
    "dragon-flight:DF-CTRL-010": "DF-CTRL-010 uses redundant-to-selected-atomic-evidence: when not started, not running, a selection is pending, or a pair is locked, the handler returns without mutation like the selected inactive guard.",
    "dragon-flight:DF-CTRL-014": "DF-CTRL-014 uses redundant-to-selected-atomic-evidence: on click it invokes the same reset-and-start boundary already selected from DF-TRANS-008.",
    "dragon-flight:DF-TRANS-003": "DF-TRANS-003 uses redundant-to-selected-atomic-evidence: On extreme difficulty (gameOverOnMiss), the incorrect-gate branch is a stricter same-game instance of the selected wrong-target penalty.",
    "dragon-flight:DF-MECH-023": "DF-MECH-023 uses redundant-to-selected-atomic-evidence: an incorrect selection applies the same dragon-count penalty captured by selected DF-MECH-009.",
    "dragon-rider:DR-TRANS-001": "DR-TRANS-001 uses redundant-to-selected-atomic-evidence: non-running state protects gate selection with the same no-op atom selected from DR-TRANS-002.",
    "dungeon-liberator:DL-INPUT-002": "DL-INPUT-002 uses redundant-to-selected-atomic-evidence: starting resets the game and enters play through the same start boundary selected from DL-START-001.",
    "enchanted-library:EL-SHIELD-001": "EL-SHIELD-001 uses redundant-to-selected-atomic-evidence: when already active or when charges are zero, shield activation returns unchanged under the selected inactive no-op dimension.",
    "enchanted-library:EL-SPIRIT-001": "EL-SPIRIT-001 uses redundant-to-selected-atomic-evidence: when the spawn timer is positive or the spirit count has reached maxSpirits, spawning returns the input state as another selected no-op guard.",
    "griffin-riders-escape:GRF-INPUT-001": "GRF-INPUT-001 uses redundant-to-selected-atomic-evidence: while the phase is playing, directional changes map to the same selected lane-switch action exposed by the cartridge controls.",
    "magic-defense:MD-MECH-002": "MD-MECH-002 uses redundant-to-selected-atomic-evidence: correctAnswers * accuracy feeds the same Magic Defense performance-to-XP atom selected from MD-MECH-001.",
    "magic-defense:MD-MECH-006": "MD-MECH-006 uses redundant-to-selected-atomic-evidence: when all castles reach 0, damageCastle reaches the same resource-depletion terminal outcome selected from MD-TRANS-002.",
    "magic-defense:MD-TRANS-003": "MD-TRANS-003 uses redundant-to-selected-atomic-evidence: when timeRemaining reaches 0, the timer supplies a second Magic Defense witness for the selected active-time threshold transition.",
    "rpg-battle:RPG-TR-003": "RPG-TR-003 uses redundant-to-selected-atomic-evidence: only when status is 'playing' and resulting health is <= 0, enemy health depletion mirrors the selected player-health terminal threshold.",
    "rpg-battle:RPG-TR-013": "RPG-TR-013 uses redundant-to-selected-atomic-evidence: unless status === 'playing', inputLocked is false, and turn === 'player', submission preserves state under the selected inactive guard.",
    "rpg-battle:RPG-TR-015": "RPG-TR-015 uses redundant-to-selected-atomic-evidence: On an unmatched answer, RPG Battle records the same wrong-target penalty selected from RPG-TR-006.",
    "rpg-battle:RPG-MECH-010": "RPG-MECH-010 uses redundant-to-selected-atomic-evidence: baseXp, enemyMultiplier enters the same result-accounting path selected from RPG-MECH-009.",
    "rpg-battle:RPG-MECH-016": "RPG-MECH-016 uses redundant-to-selected-atomic-evidence: maximum streak seen contributes another same-game counter to the selected XP accounting formula.",
    "rpg-battle:RPG-CTL-004": "RPG-CTL-004 uses redundant-to-selected-atomic-evidence: for each hero, location, and enemy option, a click button emits the same selected semantic action boundary.",
    "rpg-battle:RPG-TR-007": "RPG-TR-007 uses redundant-to-selected-atomic-evidence: unless the current step is 'hero', selection is a no-op under the RPG Battle guard already selected from RPG-TR-004.",
    "rpg-battle:RPG-TR-008": "RPG-TR-008 uses redundant-to-selected-atomic-evidence: unless current step is 'location', the reducer preserves state through the same selected inactive guard.",
    "rpg-battle:RPG-TR-009": "RPG-TR-009 uses redundant-to-selected-atomic-evidence: unless current step is 'enemy', the final setup selection remains a no-op under the selected guard.",
    "shadow-gate-dungeon:SGD-INPUT-002": "SGD-INPUT-002 uses redundant-to-selected-atomic-evidence: when the game is playing, supplied direction is translated to the velocity action already selected from SGD-INPUT-001.",
    "spellweavers-run:SW-INPUT-001": "SW-INPUT-001 uses redundant-to-selected-atomic-evidence: Legacy pointer or touch input converts a coordinate into the same selected semantic lane action.",
    "spellweavers-run:SW-CART-003": "SW-CART-003 uses redundant-to-selected-atomic-evidence: lower 75 percent of normalized pointer space partitions another physical surface into the selected lane actions.",
    "storm-castle-tower:SCT-MECH-H001": "SCT-MECH-H001 uses redundant-to-selected-atomic-evidence: only while gamePhase is playing, Arrow and WASD keys produce the same semantic movement actions selected from SCT-MECH-H008.",
    "storm-castle-tower:SCT-TRANS-H004": "SCT-TRANS-H004 uses redundant-to-selected-atomic-evidence: lives at most zero repeats the selected depleted-resource defeat terminal in an adjacent transition fact.",
    "dragon-flight:DF-MECH-005": "DF-MECH-005 uses incompatible-bespoke-behavior: when vocabulary is empty, Dragon Flight returns a playable sentinel round instead of rejecting empty content like the cross-game counterparts.",
    "dragon-rider:DR-MECH-002": "DR-MECH-002 uses incompatible-bespoke-behavior: an empty vocabulary produces blank sentinel gates, which conflicts with the selected cross-game reject-empty constructor contract.",
}


BASE_BOUNDARIES = {
    row["capability_id"]: row["effects"]
    for row in load(BOUNDARIES)["boundaries"]
}
CAPABILITY_EFFECTS: dict[str, dict[str, str]] = {
    **BASE_BOUNDARIES,
    "capability:inactive-state-noop-guard": {
        "shared_core": "A shared operation guard returns the input state when its active-play predicate is false.",
        "game_extensions": "Games own their phase names, turn locks, selection locks, and the mutations permitted after admission.",
        "interface_consequence": "Pure backend operations receive explicit state and expose unchanged-state behavior without UI or transport dependencies.",
    },
    "capability:content-unit-completion-transition": {
        "shared_core": "Shared progression logic detects completion of the current ordered content unit and selects continuation or terminalization.",
        "game_extensions": "Games own next-unit construction, reset payloads, victory thresholds, feedback, and terminal presentation.",
        "interface_consequence": "A transport-independent transition consumes progress plus content bounds and returns either next-unit state or a terminal result.",
    },
    "capability:direction-vector-normalization": {
        "shared_core": "Shared movement math normalizes a nonzero diagonal vector before applying speed and bounds.",
        "game_extensions": "Games own speed, arena bounds, camera behavior, collisions, and post-movement effects.",
        "interface_consequence": "Movement rules consume a normalized direction vector without depending on keyboard, touch, or renderer event objects.",
    },
    "capability:offscreen-target-indicator": {
        "shared_core": "Shared projection logic intersects an off-screen target direction with the visible viewport edge.",
        "game_extensions": "Games own target selection, camera transforms, marker styling, padding, and whether eaten or collected targets are omitted.",
        "interface_consequence": "A pure projection interface accepts world target and viewport geometry and returns an edge marker position.",
    },
    "capability:resource-threshold-terminal": {
        "shared_core": "Shared terminal evaluation clamps a gameplay resource and emits a terminal transition when its threshold is exhausted.",
        "game_extensions": "Games own resource types, depletion causes, defeat or victory labels, audiovisual effects, and result payloads.",
        "interface_consequence": "Backend rules expose explicit resource updates and terminal outcomes independently of components or route handlers.",
    },
    "capability:incorrect-target-penalty": {
        "shared_core": "Shared answer evaluation distinguishes an incorrect target and returns an explicit penalty result without advancing success progress.",
        "game_extensions": "Games own health, mana, score, time, combo, reveal, enemy-turn, reshuffle, and spawned-hazard penalties.",
        "interface_consequence": "A typed evaluation contract returns correctness, progress disposition, and game-owned penalty instructions.",
    },
    "capability:reset-before-active-play": {
        "shared_core": "A shared start boundary initializes or resets mutable game state before admitting active play.",
        "game_extensions": "Games own initial entities, counters, difficulty presets, timers, health pools, and presentation phase names.",
        "interface_consequence": "Start adapters invoke one transport-independent reset command and receive a fully initialized active state.",
    },
    "capability:distractor-exclusion": {
        "shared_core": "Shared option construction excludes the expected item before sampling distractors.",
        "game_extensions": "Games own normalization rules, option counts, spatial placement, fallback glyphs, and randomization policy.",
        "interface_consequence": "A pure distractor builder consumes a target and candidate collection and returns target-distinct alternatives.",
    },
    "capability:minimum-vocabulary-admission-threshold": {
        "shared_core": "Shared admission validation blocks gameplay until a configured minimum vocabulary count is available.",
        "game_extensions": "Games own their minimum count, loading and error presentation, fetch policy, and post-admission state construction.",
        "interface_consequence": "A typed preflight interface accepts content count plus a game-owned threshold and returns an admission result.",
    },
}

CAPABILITY_DISPOSITIONS = {
    "capability:bounded-frame-delta": "standardize",
    "capability:single-completion-emission": "standardize",
    "capability:nonempty-content-precondition": "standardize",
    "capability:input-action-normalization": "standardize",
    "capability:time-and-frame-loop": "extend",
    "capability:language-target-progression": "extend",
    "capability:result-accounting": "extend",
    "capability:inactive-state-noop-guard": "standardize",
    "capability:content-unit-completion-transition": "extend",
    "capability:direction-vector-normalization": "standardize",
    "capability:offscreen-target-indicator": "standardize",
    "capability:resource-threshold-terminal": "extend",
    "capability:incorrect-target-penalty": "extend",
    "capability:reset-before-active-play": "standardize",
    "capability:distractor-exclusion": "standardize",
    "capability:minimum-vocabulary-admission-threshold": "extend",
}


def base36(value: int) -> str:
    """Encodes a nonnegative integer as compact lowercase base-36 text."""
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if value == 0:
        return "0"
    encoded = ""
    while value:
        value, remainder = divmod(value, 36)
        encoded = digits[remainder] + encoded
    return encoded


def compact_taxonomy_id(index: int) -> str:
    """Returns a shortest printable identifier for one taxonomy entry."""
    alphabet = "".join(
        chr(code)
        for code in range(33, 127)
        if chr(code) not in {"\"", "\\"}
    )
    if index < len(alphabet):
        return alphabet[index]
    offset = index - len(alphabet)
    return alphabet[offset // len(alphabet)] + alphabet[offset % len(alphabet)]

def field_id_for_excerpt(record_id: str, excerpt: str) -> str:
    """Returns the unique derived field containing an exact evidence excerpt."""
    matches = [
        field["field_id"]
        for field in PHASE1_RECORDS[record_id]["derived_fields"]
        if isinstance(field.get("value"), str) and excerpt in field["value"]
    ]
    if len(matches) != 1:
        raise AssertionError(
            f"expected one field for {record_id} excerpt {excerpt!r}, got {matches}"
        )
    return matches[0]


def basis_refs(record_id: str, evidence: str | dict[str, str]) -> list[dict[str, str]]:
    """Builds typed same-record basis references from manually authored evidence."""
    if isinstance(evidence, str):
        evidence = {"fact": evidence}
    return [
        {
            "role": role,
            "field_id": field_id_for_excerpt(record_id, excerpt),
            "exact_excerpt": excerpt,
        }
        for role, excerpt in evidence.items()
    ]


def taxonomy_ref(record_id: str, excerpt: str) -> dict[str, str]:
    """Builds one exact Phase 1 taxonomy evidence reference."""
    return {
        "record_id": record_id,
        "field_id": field_id_for_excerpt(record_id, excerpt),
        "exact_excerpt": excerpt,
    }


def old_use_index() -> dict[tuple[str, str], dict[str, Any]]:
    """Indexes pre-v13 selected uses solely to preserve already reviewed anchors."""
    return {
        (use["capability_id"], row["record_id"]): use
        for row in BASE_CURATED["records"]
        for use in row["capability_uses"]
    }


def selected_anchor_texts(
    taxonomy_key: str,
    record_id: str,
) -> dict[str, str]:
    """Returns the reviewed complete anchors for one selected membership."""
    definition = SELECTED[taxonomy_key]
    prior = old_use_index().get((definition["capability_id"], record_id))
    if prior is not None:
        return {
            role: prior["anchors"][role]["exact_excerpt"]
            for role in ("precondition", "action_or_transition", "observable_outcome")
        }
    return EXPLICIT_USE_ANCHORS[(taxonomy_key, record_id)]


def selected_memberships() -> dict[str, list[str]]:
    """Maps each selected record to its selected taxonomy keys."""
    result: dict[str, list[str]] = {}
    for taxonomy_key, definition in SELECTED.items():
        for record_id in definition["records"]:
            result.setdefault(record_id, []).append(taxonomy_key)
    return result


def make_use(taxonomy_key: str, record_id: str) -> dict[str, Any]:
    """Builds one selected capability use from manually reviewed anchors."""
    definition = SELECTED[taxonomy_key]
    record = PHASE1_RECORDS[record_id]
    anchors = selected_anchor_texts(taxonomy_key, record_id)
    slug = definition["capability_id"].removeprefix("capability:")
    return {
        "use_id": f"use:{slug}:{record_id}",
        "capability_id": definition["capability_id"],
        "scene_id": record["scene_id"],
        "state_id": record["state_id"],
        "atomic_dimension": definition["dimension"],
        "counterfactual_pertinence": True,
        "anchors": {
            role: {
                "field_id": field_id_for_excerpt(record_id, excerpt),
                "exact_excerpt": excerpt,
            }
            for role, excerpt in anchors.items()
        },
    }


def build_taxonomy() -> tuple[
    dict[str, Any],
    dict[str, list[str]],
    dict[str, str],
    list[dict[str, str]],
]:
    """Builds the exhaustive selected and rejected capability inventory."""
    assert_manual_anchor_coverage()
    entries: list[dict[str, Any]] = []
    evaluated_by_record: dict[str, list[str]] = {
        record_id: [] for record_id in PHASE1_RECORDS
    }
    selected_ids: dict[str, str] = {}
    for index, (taxonomy_key, definition) in enumerate(SELECTED.items()):
        taxonomy_id = compact_taxonomy_id(index)
        selected_ids[taxonomy_key] = taxonomy_id
        evidence_refs: list[dict[str, str]] = []
        for record_id in definition["records"]:
            evaluated_by_record[record_id].append(taxonomy_id)
            for excerpt in selected_anchor_texts(taxonomy_key, record_id).values():
                evidence_refs.append(taxonomy_ref(record_id, excerpt))
        entries.append({
            "taxonomy_id": taxonomy_id,
            "atomic_dimension": definition["dimension"],
            "status": "selected-capability",
            "capability_id": definition["capability_id"],
            "candidate_record_ids": definition["records"],
            "evidence_refs": evidence_refs,
            "cross_game_counterpart_record_ids": [],
            "incompatibility_evidence_refs": [],
        })
    insufficient_rows = sorted(
        (
            record_id,
            decision,
        )
        for record_id, decision in CONTEXT.items()
        if decision[1] == "complete-behavior-no-cross-game-counterpart"
    )
    for index, (record_id, decision) in enumerate(insufficient_rows):
        taxonomy_id = compact_taxonomy_id(len(SELECTED) + index)
        evidence = decision[2]
        dimension = decision[4]
        if not isinstance(evidence, dict) or not isinstance(dimension, str):
            raise AssertionError(f"incomplete insufficient taxonomy decision: {record_id}")
        evaluated_by_record[record_id].append(taxonomy_id)
        entries.append({
            "taxonomy_id": taxonomy_id,
            "atomic_dimension": dimension,
            "status": "rejected-insufficient-cross-game-evidence",
            "capability_id": None,
            "candidate_record_ids": [record_id],
            "evidence_refs": [
                taxonomy_ref(record_id, excerpt) for excerpt in evidence.values()
            ],
            "cross_game_counterpart_record_ids": [],
            "incompatibility_evidence_refs": [],
        })
    bespoke_id = compact_taxonomy_id(len(SELECTED) + len(insufficient_rows))
    for record_id in BESPOKE_EMPTY_SENTINEL:
        evaluated_by_record[record_id].append(bespoke_id)
    bespoke_evidence: list[dict[str, str]] = []
    bespoke_incompatibility: list[dict[str, str]] = []
    for record_id in BESPOKE_EMPTY_SENTINEL:
        anchors = SPECIAL_CONTEXT_ANCHORS[record_id]
        bespoke_evidence.extend(
            taxonomy_ref(record_id, excerpt) for excerpt in anchors.values()
        )
        bespoke_incompatibility.append(
            taxonomy_ref(record_id, anchors["observable_outcome"])
        )
    for record_id in BESPOKE_EMPTY_COUNTERPARTS:
        taxonomy_key = next(
            key
            for key, definition in SELECTED.items()
            if record_id in definition["records"]
            and definition["capability_id"] == "capability:nonempty-content-precondition"
        )
        anchors = selected_anchor_texts(taxonomy_key, record_id)
        bespoke_evidence.extend(
            taxonomy_ref(record_id, excerpt) for excerpt in anchors.values()
        )
        bespoke_incompatibility.append(
            taxonomy_ref(record_id, anchors["observable_outcome"])
        )
    entries.append({
        "taxonomy_id": bespoke_id,
        "atomic_dimension": "empty playable content sentinel versus rejection",
        "status": "rejected-incompatible-bespoke",
        "capability_id": None,
        "candidate_record_ids": BESPOKE_EMPTY_SENTINEL,
        "evidence_refs": bespoke_evidence,
        "cross_game_counterpart_record_ids": BESPOKE_EMPTY_COUNTERPARTS,
        "incompatibility_evidence_refs": bespoke_incompatibility,
    })
    taxonomy = {
        "schema_version": "apk-t9-phase2-capability-taxonomy-inventory.v1",
        "source_phase1_root_acceptance_sha256": PHASE1_BINDINGS[
            "phase1-root-acceptance.json"
        ],
        "source_phase1_mechanic_blueprints_sha256": PHASE1_BINDINGS[
            "phase1-mechanic-blueprints-v1.json"
        ],
        "source_phase1_developer_effort_baseline_sha256": PHASE1_BINDINGS[
            "phase1-developer-effort-baseline-v1.json"
        ],
        "record_count": 633,
        "taxonomy_entries": entries,
    }
    return taxonomy, evaluated_by_record, selected_ids, bespoke_incompatibility


def contradiction_audit(
    record_id: str,
    all_taxonomy_ids: list[str],
) -> dict[str, Any]:
    """Builds a provisional v13 contradiction audit pending sealed verifier bytes."""
    decision = CONTRADICTIONS[record_id]
    record = PHASE1_RECORDS[record_id]
    return {
        "review_method": "field-by-field-counterfactual",
        "reviewed_field_ids": [field["field_id"] for field in record["derived_fields"]],
        "fact_category": decision["fact_category"],
        "disposition_basis": "contradictory-accepted-evidence",
        "basis_evidence_refs": basis_refs(record_id, decision["basis_excerpt"]),
        "evaluated_taxonomy_ids": [],
        "not_applicable_taxonomy_ids": all_taxonomy_ids,
        "redundant_to_use_ids": [],
        "incompatibility_evidence_refs": [],
        "conflict_kind": decision["conflict_kind"],
        "resolution": decision["resolution"],
        "same_game_conflict_refs": [
            taxonomy_ref(conflict_id, excerpt)
            for conflict_id, excerpt in zip(
                decision["conflict_record_ids"],
                decision["conflict_excerpts"][-len(decision["conflict_record_ids"]):],
                strict=True,
            )
        ],
    }


def build_curated(
    taxonomy: dict[str, Any],
    evaluated_by_record: dict[str, list[str]],
    selected_ids: dict[str, str],
    bespoke_incompatibility: list[dict[str, str]],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    """Builds all 633 curated dispositions and indexes their selected uses."""
    all_taxonomy_ids = [
        row["taxonomy_id"] for row in taxonomy["taxonomy_entries"]
    ]
    selected = selected_memberships()
    use_index: dict[str, dict[str, Any]] = {}
    records: list[dict[str, Any]] = []
    for record_id, record in PHASE1_RECORDS.items():
        evaluated = evaluated_by_record[record_id]
        not_applicable = [
            taxonomy_id
            for taxonomy_id in all_taxonomy_ids
            if taxonomy_id not in set(evaluated)
        ]
        if record_id in selected:
            uses = [make_use(key, record_id) for key in selected[record_id]]
            first_anchors = selected_anchor_texts(selected[record_id][0], record_id)
            audit = {
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": [
                    field["field_id"] for field in record["derived_fields"]
                ],
                "fact_category": "complete-behavior",
                "disposition_basis": "selected-complete-behavioral-anchors",
                "basis_evidence_refs": basis_refs(record_id, first_anchors),
                "evaluated_taxonomy_ids": evaluated,
                "not_applicable_taxonomy_ids": not_applicable,
                "redundant_to_use_ids": [],
                "incompatibility_evidence_refs": [],
            }
            row = {
                "record_id": record_id,
                "game_id": record["game_id"],
                "claim_id": record["source_claim_id"],
                "primary_disposition": "curated-capability-evidence",
                "capability_uses": uses,
                "context_rationale": None,
                "audit": audit,
            }
            for use in uses:
                if use["use_id"] in use_index:
                    raise AssertionError(f"duplicate use id: {use['use_id']}")
                use_index[use["use_id"]] = {
                    **use,
                    "record_id": record_id,
                    "game_id": record["game_id"],
                    "claim_id": record["source_claim_id"],
                }
        elif record_id in CONTRADICTIONS:
            audit = contradiction_audit(record_id, all_taxonomy_ids)
            row = {
                "record_id": record_id,
                "game_id": record["game_id"],
                "claim_id": record["source_claim_id"],
                "primary_disposition": "non-capability-context",
                "capability_uses": [],
                "context_rationale": CONTRADICTIONS[record_id]["rationale"],
                "audit": audit,
            }
        elif record_id in REDUNDANT:
            taxonomy_key, selected_record_id = REDUNDANT[record_id]
            audit = {
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": [
                    field["field_id"] for field in record["derived_fields"]
                ],
                "fact_category": "complete-behavior",
                "disposition_basis": "redundant-to-selected-atomic-evidence",
                "basis_evidence_refs": basis_refs(
                    record_id, SPECIAL_CONTEXT_ANCHORS[record_id]
                ),
                "evaluated_taxonomy_ids": [selected_ids[taxonomy_key]],
                "not_applicable_taxonomy_ids": [
                    taxonomy_id
                    for taxonomy_id in all_taxonomy_ids
                    if taxonomy_id != selected_ids[taxonomy_key]
                ],
                "redundant_to_use_ids": [
                    make_use(taxonomy_key, selected_record_id)["use_id"]
                ],
                "incompatibility_evidence_refs": [],
            }
            row = {
                "record_id": record_id,
                "game_id": record["game_id"],
                "claim_id": record["source_claim_id"],
                "primary_disposition": "non-capability-context",
                "capability_uses": [],
                "context_rationale": SPECIAL_RATIONALES[record_id],
                "audit": audit,
            }
        elif record_id in BESPOKE_EMPTY_SENTINEL:
            audit = {
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": [
                    field["field_id"] for field in record["derived_fields"]
                ],
                "fact_category": "complete-behavior",
                "disposition_basis": "incompatible-bespoke-behavior",
                "basis_evidence_refs": basis_refs(
                    record_id, SPECIAL_CONTEXT_ANCHORS[record_id]
                ),
                "evaluated_taxonomy_ids": evaluated,
                "not_applicable_taxonomy_ids": not_applicable,
                "redundant_to_use_ids": [],
                "incompatibility_evidence_refs": bespoke_incompatibility,
            }
            row = {
                "record_id": record_id,
                "game_id": record["game_id"],
                "claim_id": record["source_claim_id"],
                "primary_disposition": "non-capability-context",
                "capability_uses": [],
                "context_rationale": SPECIAL_RATIONALES[record_id],
                "audit": audit,
            }
        else:
            category, basis, evidence, rationale, _dimension = CONTEXT[record_id]
            audit = {
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": [
                    field["field_id"] for field in record["derived_fields"]
                ],
                "fact_category": category,
                "disposition_basis": basis,
                "basis_evidence_refs": basis_refs(record_id, evidence),
                "evaluated_taxonomy_ids": evaluated,
                "not_applicable_taxonomy_ids": not_applicable,
                "redundant_to_use_ids": [],
                "incompatibility_evidence_refs": [],
            }
            row = {
                "record_id": record_id,
                "game_id": record["game_id"],
                "claim_id": record["source_claim_id"],
                "primary_disposition": "non-capability-context",
                "capability_uses": [],
                "context_rationale": rationale,
                "audit": audit,
            }
        records.append(row)
    games = sorted({record["game_id"] for record in PHASE1_RECORDS.values()})
    game_dispositions: list[dict[str, Any]] = []
    for game_id in games:
        capabilities = sorted({
            use["capability_id"]
            for use in use_index.values()
            if use["game_id"] == game_id
        })
        display = display_game(game_id)
        if capabilities:
            disposition = "supported-capability"
            rationale = (
                f"{display} supplies exact selected evidence for {len(capabilities)} reusable capabilities; "
                "its other accepted facts remain contextual."
            )
        else:
            disposition = "no-supported-reusable-capability"
            rationale = (
                f"{display} has no selected reusable capability after field-level review; "
                "its accepted facts remain game-owned context."
            )
        game_dispositions.append({
            "game_id": game_id,
            "disposition": disposition,
            "capability_ids": capabilities,
            "rationale": rationale,
        })
    curated = {
        "schema_version": "apk-t9-phase2-curated-capability-evidence.v4",
        "phase1_bindings": PHASE1_BINDINGS,
        "audit_method": "per-record-field-by-field-counterfactual",
        "records": records,
        "game_dispositions": game_dispositions,
    }
    return curated, use_index


def display_game(game_id: str) -> str:
    """Returns a reader-facing game label for generated comparison prose."""
    overrides = {
        "rpg-battle": "RPG Battle",
        "wizard-vs-zombie": "Wizard vs Zombie",
    }
    return overrides.get(
        game_id,
        " ".join(part.capitalize() for part in game_id.split("-")),
    )


def sentence_fragment(value: str) -> str:
    """Normalizes accepted excerpt punctuation for one-sentence summaries."""
    normalized = " ".join(value.split())
    normalized = normalized.replace(". ", "; ").replace("? ", "; ").replace("! ", "; ")
    return normalized.rstrip(".!?; ")


def joined_names(names: list[str]) -> str:
    """Joins two or three names for one bounded finding statement."""
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return f"{names[0]}, {names[1]}, and {names[2]}"


def group_game_units(
    units: list[tuple[str, list[dict[str, Any]]]],
) -> list[list[tuple[str, list[dict[str, Any]]]]]:
    """Partitions game evidence into two- or three-game finding groups."""
    groups = [units[index:index + 3] for index in range(0, len(units), 3)]
    if len(groups) > 1 and len(groups[-1]) == 1:
        groups[-1].insert(0, groups[-2].pop())
    if any(not 2 <= len(group) <= 3 for group in groups):
        raise AssertionError("finding groups must cover two or three games")
    return groups


def build_downstream(
    use_index: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Builds comparisons, classifications, boundaries, and dependency joins."""
    comparisons: list[dict[str, Any]] = []
    classifications: list[dict[str, Any]] = []
    boundaries: list[dict[str, Any]] = []
    dependencies: list[dict[str, Any]] = []
    for definition in SELECTED.values():
        capability_id = definition["capability_id"]
        dimension = definition["dimension"]
        capability_uses = sorted(
            (
                use for use in use_index.values()
                if use["capability_id"] == capability_id
            ),
            key=lambda use: (use["game_id"], use["use_id"]),
        )
        by_game: dict[str, list[dict[str, Any]]] = {}
        for use in capability_uses:
            by_game.setdefault(use["game_id"], []).append(use)
        if any(len(rows) > 2 for rows in by_game.values()):
            raise AssertionError(f"too many same-game uses for {capability_id}")
        groups = group_game_units(sorted(by_game.items()))
        batches = {"similarities": [], "differences": []}
        finding_ids: list[str] = []
        for index, group in enumerate(groups, start=1):
            kind = (
                "differences"
                if any(len(rows) == 2 for _game_id, rows in group)
                else "similarities"
            )
            kind_slug = "difference" if kind == "differences" else "similarity"
            slug = capability_id.removeprefix("capability:")
            finding_id = f"{kind_slug}:{slug}:{index:02d}"
            finding_ids.append(finding_id)
            consumer_use_ids = [
                use["use_id"]
                for _game_id, rows in group
                for use in rows
            ]
            names = [display_game(game_id) for game_id, _rows in group]
            summaries: list[dict[str, str]] = []
            for game_id, rows in group:
                outcomes = [
                    sentence_fragment(min(
                        (anchor["exact_excerpt"] for anchor in use["anchors"].values()),
                        key=len,
                    ))
                    for use in rows
                ]
                joined_outcomes = (
                    outcomes[0]
                    if len(outcomes) == 1
                    else f"{outcomes[0]} and {outcomes[1]}"
                )
                summary = (
                    f"{display_game(game_id)} demonstrates {dimension}: "
                    f"{joined_outcomes}."
                )
                if not v9._one_sentence(summary):
                    raise AssertionError(
                        f"invalid generated summary for {capability_id}/{game_id}: {summary}"
                    )
                summaries.append({"game_id": game_id, "summary": summary})
            statement = (
                f"{joined_names(names)} share the {dimension} contract across "
                "their game-owned implementations."
            )
            if not v9._one_sentence(statement):
                raise AssertionError(f"invalid finding statement: {statement}")
            finding = {
                "finding_id": finding_id,
                "statement": statement,
                "dimension": dimension,
                "consumer_use_ids": consumer_use_ids,
                "per_game_summaries": summaries,
                "boundary_effect": copy.deepcopy(CAPABILITY_EFFECTS[capability_id]),
            }
            batches[kind].append(finding)
            dependencies.append({
                "finding_id": finding_id,
                "use_ids": consumer_use_ids,
                "record_ids": [
                    use_index[use_id]["record_id"] for use_id in consumer_use_ids
                ],
                "claim_ids": [
                    use_index[use_id]["claim_id"] for use_id in consumer_use_ids
                ],
            })
        comparisons.append({
            "capability_id": capability_id,
            "similarities": batches["similarities"],
            "differences": batches["differences"],
        })
        use_ids = sorted(use["use_id"] for use in capability_uses)
        classifications.append({
            "capability_id": capability_id,
            "disposition": CAPABILITY_DISPOSITIONS[capability_id],
            "consumer_use_ids": use_ids,
            "finding_ids": finding_ids,
        })
        boundaries.append({
            "capability_id": capability_id,
            "finding_ids": finding_ids,
            "effects": copy.deepcopy(CAPABILITY_EFFECTS[capability_id]),
        })
    top = {
        "schema_version": None,
        "phase1_bindings": PHASE1_BINDINGS,
    }
    return {
        COMPARISONS: {
            **top,
            "schema_version": "apk-t9-phase2-capability-comparisons.v5",
            "evidence_batches": comparisons,
        },
        CLASSIFICATION: {
            **top,
            "schema_version": "apk-t9-phase2-capability-classification.v5",
            "capabilities": classifications,
        },
        BOUNDARIES: {
            **top,
            "schema_version": "apk-t9-phase2-extension-boundaries.v5",
            "boundaries": boundaries,
        },
        DEPENDENCIES: {
            **top,
            "schema_version": "apk-t9-phase2-claim-dependency-edges.v5",
            "dependencies": dependencies,
        },
    }


def build_candidate() -> dict[str, dict[str, Any]]:
    """Builds all six mapper outputs in memory without publishing files."""
    taxonomy, evaluated, selected_ids, bespoke_refs = build_taxonomy()
    curated, uses = build_curated(
        taxonomy, evaluated, selected_ids, bespoke_refs
    )
    downstream = build_downstream(uses)
    return {
        TAXONOMY: taxonomy,
        CURATED: curated,
        **downstream,
    }


# Repeated same-game records that jointly evidence one rejected atomic
# candidate share one inventory entry; this preserves the no-counterpart
# decision while keeping the mandatory all-taxonomy partition within 1 MiB.
INSUFFICIENT_GROUPS: list[dict[str, Any]] = [
    {
        "dimension": "correct-gate answer reward increment",
        "records": ["dragon-flight:DF-MECH-008", "dragon-flight:DF-MECH-022"],
    },
    {
        "dimension": "attempt-scaled boss encounter power initialization",
        "records": ["dragon-flight:DF-MECH-011", "dragon-flight:DF-TRANS-004"],
    },
    {
        "dimension": "boss resource drain and completion transition",
        "records": ["dragon-flight:DF-MECH-013", "dragon-flight:DF-MECH-032", "dragon-flight:DF-TRANS-006"],
    },
    {
        "dimension": "fixed-step gate-pair traversal timing",
        "records": ["dragon-flight:DF-MECH-024", "dragon-flight:DF-MECH-025"],
    },
    {
        "dimension": "near-target gate feedback resolution",
        "records": ["dragon-flight:DF-MECH-027", "dragon-flight:DF-MECH-028"],
    },
    {
        "dimension": "timed post-selection feedback unlock and recenter",
        "records": ["dragon-flight:DF-CTRL-011", "dragon-flight:DF-MECH-030", "dragon-flight:DF-MECH-031"],
    },
    {
        "dimension": "delayed boss terminal result staging and delivery",
        "records": ["dragon-flight:DF-MECH-033", "dragon-flight:DF-MECH-034", "dragon-flight:DF-TRANS-007"],
    },
    {
        "dimension": "actor-position-gated projectile spawning",
        "records": ["dragon-flight:DF-MECH-047", "dragon-flight:DF-MECH-048"],
    },
    {
        "dimension": "boss-projectile hit and removal transition",
        "records": ["dragon-flight:DF-MECH-049", "dragon-flight:DF-MECH-050"],
    },
    {
        "dimension": "correct-spell player attack transition",
        "records": ["rpg-battle:RPG-MECH-003", "rpg-battle:RPG-TR-005", "rpg-battle:RPG-TR-014"],
    },
    {
        "dimension": "survival-gated enemy counterattack transition",
        "records": ["rpg-battle:RPG-MECH-004", "rpg-battle:RPG-TR-012"],
    },
    {
        "dimension": "multiplier-scaled enemy combat statistics",
        "records": ["rpg-battle:RPG-MECH-005", "rpg-battle:RPG-MECH-006"],
    },
    {
        "dimension": "trimmed translation match with unmatched fallback",
        "records": ["rpg-battle:RPG-MECH-012", "rpg-battle:RPG-MECH-013"],
    },
    {
        "dimension": "zero-safe battle-result counter normalization",
        "records": ["rpg-battle:RPG-MECH-014", "rpg-battle:RPG-MECH-015"],
    },
    {
        "dimension": "battle-selection reset and ready-state initialization",
        "records": ["rpg-battle:RPG-TR-010", "rpg-battle:RPG-TR-011", "rpg-battle:RPG-TR-019"],
    },
    {
        "dimension": "unrepresented-word lane-orb spawning",
        "records": ["spellweavers-run:SW-MOVE-002", "spellweavers-run:SW-STATE-005"],
    },
    {
        "dimension": "surface-ready orb scrolling and culling update",
        "records": ["spellweavers-run:SW-MOVE-003", "spellweavers-run:SW-MOVE-004", "spellweavers-run:SW-CART-009"],
    },
    {
        "dimension": "lane-local collection selection guard",
        "records": ["spellweavers-run:SW-COLL-001", "spellweavers-run:SW-CART-014"],
    },
    {
        "dimension": "nearest-alive-castle missile targeting",
        "records": ["magic-defense:MD-MECH-007", "magic-defense:MD-MECH-021"],
    },
    {
        "dimension": "correct-match missile targeting and bolt dispatch",
        "records": ["magic-defense:MD-MECH-017", "magic-defense:MD-TRANS-004"],
    },
    {
        "dimension": "answer-outcome adaptive missile timing",
        "records": ["magic-defense:MD-MECH-009", "magic-defense:MD-MECH-019"],
    },
    {
        "dimension": "initial active-word and actor population",
        "records": ["village-guardian:VG3-MODEL-002", "village-guardian:VG3-MODEL-003"],
    },
    {
        "dimension": "monster-contact trail rollback consequence",
        "records": ["village-guardian:VG3-MODEL-012", "village-guardian:VG3-MODEL-013"],
    },
    {
        "dimension": "automatic victory-to-next-level rollover",
        "records": ["dungeon-liberator:DL-TRANS-002", "dungeon-liberator:DL-TRANS-003"],
    },
    {
        "dimension": "difficulty-scaled haunted-library floor initialization",
        "records": ["the-haunted-library:HL-CUR-005", "the-haunted-library:HL-CUR-006", "the-haunted-library:HL-CUR-007"],
    },
    {
        "dimension": "sight-triggered creature chase and patrol motion",
        "records": ["shadow-gate-dungeon:SGD-STEALTH-002", "shadow-gate-dungeon:SGD-STEALTH-003"],
    },
    {
        "dimension": "ingredient-word recycling into active play",
        "records": ["potion-rush:PR-CUR-009", "potion-rush:PR-CUR-012"],
    },
    {
        "dimension": "overlap-aware cascading rune resolution",
        "records": ["rune-match:RM-MECH-003", "rune-match:RM-MECH-004"],
    },
    {
        "dimension": "seeded ziggurat graph generation and traversal legality",
        "records": ["sorcerer-ziggurat:SZ-HIST-017", "sorcerer-ziggurat:SZ-HIST-018"],
    },
]


def build_taxonomy() -> tuple[
    dict[str, Any],
    dict[str, list[str]],
    dict[str, str],
    list[dict[str, str]],
]:
    """Builds the compact exhaustive selected and rejected v13 inventory."""
    assert_manual_anchor_coverage()
    entries: list[dict[str, Any]] = []
    evaluated_by_record = {record_id: [] for record_id in PHASE1_RECORDS}
    selected_ids: dict[str, str] = {}
    next_index = 0
    for taxonomy_key, definition in SELECTED.items():
        taxonomy_id = compact_taxonomy_id(next_index)
        next_index += 1
        selected_ids[taxonomy_key] = taxonomy_id
        evidence_refs: list[dict[str, str]] = []
        for record_id in definition["records"]:
            evaluated_by_record[record_id].append(taxonomy_id)
            evidence_refs.extend(
                taxonomy_ref(record_id, excerpt)
                for excerpt in selected_anchor_texts(taxonomy_key, record_id).values()
            )
        entries.append({
            "taxonomy_id": taxonomy_id,
            "atomic_dimension": definition["dimension"],
            "status": "selected-capability",
            "capability_id": definition["capability_id"],
            "candidate_record_ids": definition["records"],
            "evidence_refs": evidence_refs,
            "cross_game_counterpart_record_ids": [],
            "incompatibility_evidence_refs": [],
        })
    insufficient = {
        record_id: decision
        for record_id, decision in CONTEXT.items()
        if decision[1] == "complete-behavior-no-cross-game-counterpart"
    }
    grouped: set[str] = set()
    candidates: list[tuple[str, list[str]]] = []
    for group in INSUFFICIENT_GROUPS:
        record_ids = group["records"]
        if len(record_ids) != len(set(record_ids)) or grouped.intersection(record_ids):
            raise AssertionError(f"duplicate insufficient group membership: {record_ids}")
        if any(record_id not in insufficient for record_id in record_ids):
            raise AssertionError(f"unknown insufficient group record: {record_ids}")
        grouped.update(record_ids)
        candidates.append((group["dimension"], record_ids))
    candidates.extend(
        (decision[4], [record_id])
        for record_id, decision in sorted(insufficient.items())
        if record_id not in grouped
    )
    for dimension, record_ids in candidates:
        if not isinstance(dimension, str):
            raise AssertionError(f"missing rejected dimension: {record_ids}")
        taxonomy_id = compact_taxonomy_id(next_index)
        next_index += 1
        evidence_refs: list[dict[str, str]] = []
        for record_id in record_ids:
            evaluated_by_record[record_id].append(taxonomy_id)
            evidence = insufficient[record_id][2]
            if not isinstance(evidence, dict):
                raise AssertionError(f"incomplete rejected anchors: {record_id}")
            evidence_refs.extend(
                taxonomy_ref(record_id, excerpt) for excerpt in evidence.values()
            )
        entries.append({
            "taxonomy_id": taxonomy_id,
            "atomic_dimension": dimension,
            "status": "rejected-insufficient-cross-game-evidence",
            "capability_id": None,
            "candidate_record_ids": record_ids,
            "evidence_refs": evidence_refs,
            "cross_game_counterpart_record_ids": [],
            "incompatibility_evidence_refs": [],
        })
    bespoke_id = compact_taxonomy_id(next_index)
    for record_id in BESPOKE_EMPTY_SENTINEL:
        evaluated_by_record[record_id].append(bespoke_id)
    bespoke_evidence: list[dict[str, str]] = []
    bespoke_incompatibility: list[dict[str, str]] = []
    for record_id in BESPOKE_EMPTY_SENTINEL:
        anchors = SPECIAL_CONTEXT_ANCHORS[record_id]
        bespoke_evidence.extend(
            taxonomy_ref(record_id, excerpt) for excerpt in anchors.values()
        )
        bespoke_incompatibility.append(
            taxonomy_ref(record_id, anchors["observable_outcome"])
        )
    for record_id in BESPOKE_EMPTY_COUNTERPARTS:
        anchors = selected_anchor_texts("t03", record_id)
        bespoke_evidence.extend(
            taxonomy_ref(record_id, excerpt) for excerpt in anchors.values()
        )
        bespoke_incompatibility.append(
            taxonomy_ref(record_id, anchors["observable_outcome"])
        )
    entries.append({
        "taxonomy_id": bespoke_id,
        "atomic_dimension": "empty playable content sentinel versus rejection",
        "status": "rejected-incompatible-bespoke",
        "capability_id": None,
        "candidate_record_ids": BESPOKE_EMPTY_SENTINEL,
        "evidence_refs": bespoke_evidence,
        "cross_game_counterpart_record_ids": BESPOKE_EMPTY_COUNTERPARTS,
        "incompatibility_evidence_refs": bespoke_incompatibility,
    })
    taxonomy = {
        "schema_version": "apk-t9-phase2-capability-taxonomy-inventory.v1",
        "source_phase1_root_acceptance_sha256": PHASE1_BINDINGS["phase1-root-acceptance.json"],
        "source_phase1_mechanic_blueprints_sha256": PHASE1_BINDINGS["phase1-mechanic-blueprints-v1.json"],
        "source_phase1_developer_effort_baseline_sha256": PHASE1_BINDINGS["phase1-developer-effort-baseline-v1.json"],
        "record_count": 633,
        "taxonomy_entries": entries,
    }
    return taxonomy, evaluated_by_record, selected_ids, bespoke_incompatibility


CONTRADICTIONS["rpg-battle:RPG-NEG-001"]["rationale"] = (
    "RPG-NEG-001 uses contradictory-accepted-evidence with conflict kind accepted-negative-control and resolution exclude-negative-control: "
    "RPG Battle has a mana system: each power attack consumes 5 MP from a 20 MP pool that regenerates 2 MP per turn. conflicts with "
    "There is no mana/MP system: grep -rni 'mana' over the rpg-battle components, page, store, and rpgBattle libs returns no non-test match at the baseline."
)
CONTRADICTIONS["magic-defense:MD-TRANS-006"]["rationale"] = (
    "MD-TRANS-006 uses contradictory-accepted-evidence with conflict kind internal-mutually-exclusive-claims and resolution quarantine-pending-phase1-repair: "
    "game-over -> idle conflicts internally with status=playing and with Status transition idle -> playing is triggered by StartScreen handleStart() -> resetGame()."
)

_ORIGINAL_BUILD_CURATED = build_curated


def build_curated(
    taxonomy: dict[str, Any],
    evaluated_by_record: dict[str, list[str]],
    selected_ids: dict[str, str],
    bespoke_incompatibility: list[dict[str, str]],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    """Adds exact v13 contradiction fields to every curated audit."""
    curated, uses = _ORIGINAL_BUILD_CURATED(
        taxonomy, evaluated_by_record, selected_ids, bespoke_incompatibility
    )
    rules = {
        row["record_id"]: row
        for row in load("phase2-role-dispatch-v13.json")["known_contradiction_registry"]
    }
    for row in curated["records"]:
        audit = row["audit"]
        rule = rules.get(row["record_id"])
        if rule is None:
            audit.update({
                "contradiction_kind": None,
                "contradiction_resolution": None,
                "conflict_evidence_refs": [],
                "conflict_provenance_refs": [],
            })
            continue
        audit.clear()
        audit.update({
            "review_method": "field-by-field-counterfactual",
            "reviewed_field_ids": [
                field["field_id"]
                for field in PHASE1_RECORDS[row["record_id"]]["derived_fields"]
            ],
            "fact_category": rule["required_fact_category"],
            "disposition_basis": "contradictory-accepted-evidence",
            "basis_evidence_refs": rule["required_basis_evidence_refs_exact"],
            "evaluated_taxonomy_ids": [],
            "not_applicable_taxonomy_ids": [
                entry["taxonomy_id"] for entry in taxonomy["taxonomy_entries"]
            ],
            "redundant_to_use_ids": [],
            "incompatibility_evidence_refs": [],
            "contradiction_kind": rule["conflict_kind"],
            "contradiction_resolution": rule["resolution"],
            "conflict_evidence_refs": rule["required_conflict_evidence_refs_exact"],
            "conflict_provenance_refs": rule["required_conflict_provenance_refs_exact"],
        })
        row["context_rationale"] = CONTRADICTIONS[row["record_id"]]["rationale"]
    return curated, uses
