"""Fail-closed Phase 1 mechanic and effort truth verification."""

from __future__ import annotations

import argparse
import copy
from collections import Counter
from dataclasses import asdict, dataclass
from functools import lru_cache
import hashlib
import time
import json
from pathlib import Path
import sys
from typing import Any


TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
ROOT_ACCEPTANCE_PATH = "phase0-root-acceptance-v3.json"
ROOT_ACCEPTANCE_SHA256 = (
    "0480362baab8a237cf71fafc20800979793848fd70907013e27a462330690960"
)
INPUT_FREEZE_PATH = "phase0-input-freeze-v3.json"
INPUT_FREEZE_SHA256 = "0517288c5aa267ddbd5f22fd6929cd74aaaacc74b9321d43094c72ade8614dae"
ROLE_MANIFEST_PATH = "phase0-role-ownership-manifest-v2.json"
ROLE_MANIFEST_SHA256 = (
    "b025b7494e51d493bf39e021a170cc8a2af99886eecf9807919c2a3d2ef2b7c9"
)
ROLE_DISPATCH_PATH = "phase1-role-dispatch-v2.json"
ROLE_DISPATCH_SHA256 = (
    "2032327e85c55bf789782ed6dd1635e03fa5efb323bb4ef2bc3fe29791ff7c7c"
)
SOURCE_REGISTRY_PATH = "phase0-source-registry-v3.json"
SOURCE_REGISTRY_SHA256 = (
    "ae6050cc6c075614b34b6d8832a350f7d28945154315adebb25667fffc5b858c"
)
IDENTITY_MAP_PATH = "phase0-game-identity-map-v1.json"
IDENTITY_MAP_SHA256 = "7b2d3cf7fe5e17eab88f27804aac60e60c2da9e7089b82074b67d27721a47b3f"
IDENTITY_MAPPING_DIGEST = (
    "458a5c20db75617820604948cb004a14d579c828cedecbbcb7bdbada2f0a2b0a"
)
IDENTITY_REVIEW_PATH = "phase0-game-identity-map-independent-review-v1.json"
IDENTITY_REVIEW_SHA256 = (
    "73c4d1981eb7ee6e1af3400c5b553f96437c8694d9814556df84ed9ee6e10eca"
)
T3_CATALOG_PATH = "phase0-t3-leaf-binding-candidate-v1.json"
T3_CATALOG_SHA256 = "a04bc93f78ad33e22a56af7b94d61e721ae5828ed23fd509456c5250b366bbac"
COHORT_CATALOG_PATH = "phase0-cohort-leaf-binding-candidate-v1.json"
COHORT_CATALOG_SHA256 = (
    "2a9c5f2eb24d235dbbb59c81b63e81a162ff08c4a6f0aa95fff66bea58194fef"
)
FIXTURE_MANIFEST_PATH = "phase1-fixture-manifest-v1.json"
MAPPER_OUTPUT_PATHS = (
    "phase1-source-resolution-index-v1.json",
    "phase1-mechanic-blueprints-v1.json",
    "phase1-developer-effort-baseline-v1.json",
    "phase1-claim-dependency-edges-v1.json",
)
MAPPER_RECEIPT_PATH = "role-receipts/phase1/mechanics-capability-mapper.json"
ALLOWED_DERIVATION_RULES = {
    "exact-copy",
    "set-union",
    "set-intersection",
    "explicit-comparison",
    "blocked-by-unknown",
}
GENERATOR_DECISION_KEYS = {
    "decision_author",
    "generated_decision",
    "generator_authored_fields",
    "generator_selected_value",
}
MAX_REPORT_BYTES = 1_048_576
MAX_SOURCE_RECORDS = 32
MAX_NEGATIVE_FIXTURES = 16


EXPECTED_GAME_IDS = (
    "dragon-flight",
    "rpg-battle",
    "abyssal-well",
    "castle-defense",
    "magic-defense",
    "wizard-vs-zombie",
    "village-guardian",
    "archers-revenge",
    "storm-castle-tower",
    "paladins-twin-soul",
    "gryphon-patrol",
    "dragon-rider",
    "dungeon-liberator",
    "spellweavers-run",
    "shadow-gate-dungeon",
    "labyrinth-goblin-king",
    "griffin-riders-escape",
    "sorcerer-ziggurat",
    "enchanted-library",
    "rune-match",
    "alchemists-synthesis",
    "potion-rush",
    "rune-forge-chamber",
    "astral-mage",
    "griffin-sky-joust",
    "realm-carver",
    "devourer-slime",
    "the-haunted-library",
    "babel-architect",
)
EXPECTED_GAME_IDS_SHA256 = (
    "84c9b442ac27cdd8bb9e895d5bf7c9874beecdf22674f766f612ee26c54f71a5"
)
CASTLE_OMISSION = {
    "game_id": "castle-defense",
    "status": "blocked-by-unknown",
    "reason": "accepted T3 evidence has no leaf-resolvable scene/state claims",
}
EXPECTED_RESOLVABLE_GAME_IDS = tuple(
    game_id for game_id in EXPECTED_GAME_IDS if game_id != "castle-defense"
)
EXPECTED_RESOLVABLE_GAME_IDS_SHA256 = (
    "8dd4aea6de41c80b97515ae7d82fce87b617e0c438ee429db02667e99b18eed3"
)
TERMINAL_LEAVES = {
    "dragon-flight": (
        "measure/archive/apk_three_game_truth_pilot_20260712/dragon-flight-claim-ledger.json",
        "84bd9335c44424142c2d9cb407a2f48d28dd400997741f1904f65cdb6ce6083e",
    ),
    "rpg-battle": (
        "measure/archive/apk_three_game_truth_pilot_20260712/rpg-battle-claim-ledger.json",
        "b57c0ee531bdc05ff1249d6182af92d9504a12c4408a8ad67b5c3b51f19063c6",
    ),
    "abyssal-well": (
        "measure/archive/apk_three_game_truth_pilot_20260712/abyssal-well-claim-ledger.json",
        "4f3042a2dba0d39a885e5b8c0f707adcfbafd5fbf72edebc6c14a6594a413566",
    ),
    "magic-defense": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/magic-defense-claim-ledger-v2.json",
        "10d974bd3e620a4aaacde171a80e5f82945f58fdbd38db57b996805b62b71e45",
    ),
    "wizard-vs-zombie": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-claim-ledger-v2.json",
        "28320b36f18645d476b6e353275d7cf3f07bc0f73bea719da1e50537e8e8b635",
    ),
    "village-guardian": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/village-guardian-claim-ledger-batch-b-v3.json",
        "3be82cd7a9ddb144ae82ae220c36b439c6d14bbd58e1c988c897af6156b20484",
    ),
    "archers-revenge": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v8.json",
        "1fedca7dffa8897a3bb0f5482a1c74c484bc3f16e5361ddd06dcc89ec8ec1ca3",
    ),
    "storm-castle-tower": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/storm-castle-tower-claim-ledger-batch-b.json",
        "9f9337ec9b86161337553a8b8ab92e57cc954d2a0deb42018dad0ed99394e9d9",
    ),
    "paladins-twin-soul": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/paladins-twin-soul-semantic-supersession-batch-c-v2.json",
        "9c9227e3b560cf15c35b977b9e23bba4b0fa9a346e0a6fae1308e0a298718613",
    ),
    "gryphon-patrol": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/gryphon-patrol-semantic-supersession-batch-c-v2.json",
        "2f0c23b6aa5a03b814107dbd8325bc1af5d7ce21fa15d6fbfdca87b77345efd4",
    ),
    "dragon-rider": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json",
        "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
    ),
    "dungeon-liberator": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/claim-evidence-ledger-v3.json",
        "f8112af605465ffcf461669e5560037261943df98185bfeb8728a6496997e2a2",
    ),
    "spellweavers-run": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json",
        "2cd708cbecf94133b92ce5f06822ad420da28a1d4417fdb74284528e7a9fe24b",
    ),
    "shadow-gate-dungeon": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/shadow-gate-dungeon/claim-evidence-ledger-v2.json",
        "5c960768bb3f2002d4bc9b20205d32c5e31e3717b854db8ae04dab2fc556621c",
    ),
    "labyrinth-goblin-king": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/labyrinth-goblin-king/claim-evidence-ledger-batch-b-v2.json",
        "1b75beb8af13728ad5e564ed24ec8717341d775272099e92c9757a4fdbbddacb",
    ),
    "griffin-riders-escape": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/griffin-riders-escape/claim-evidence-ledger-v2.json",
        "9269956e48572e3ef9f0359f731a0f4f3c9d2193ede6128c0952b5a4bdd4dd59",
    ),
    "sorcerer-ziggurat": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/claim-evidence-ledger-v2.json",
        "b99ba08b3db22ffd352ac6ea9fa0ad99d2c30595b7e90e7b389611e7a18e2c4a",
    ),
    "enchanted-library": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-a/enchanted-library/claim-evidence-ledger.v2.json",
        "8adc5b881104bf0ce78d0eb3895b65cb0485a4e516e9918461acfad0f7adfb2e",
    ),
    "rune-match": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-a/rune-match/rune-match-claim-ledger.v2.json",
        "ea825bb8a9ae5e9e6f7349e9dc3b3ec45e1c51f20d80a9bd48888dc812aa0502",
    ),
    "alchemists-synthesis": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-a/alchemists-synthesis/claim-evidence-ledger.v2.json",
        "d3ea0d89a03f8f0acbc91ba40309c7a2c64bb507dfee51a380521ea0021bee4b",
    ),
    "potion-rush": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-b/potion-rush/claim-evidence-ledger-v2.json",
        "4183d0514812cd781f2ffd9a7442e692604eb2f2d86cf7ead7af54bc06f25dae",
    ),
    "rune-forge-chamber": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-b/rune-forge-chamber/claim-evidence-ledger-v2.json",
        "bf4590a79dd712348cc8fb8f7ceb9ad5139fa934506ae712806f1bcd8fc71b60",
    ),
    "astral-mage": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-b/astral-mage/claim-evidence-ledger-v2.json",
        "da7122e80d300c6ff3eab073c2e9151a67c81b707fa470fe64f101a5bbb4eb7e",
    ),
    "griffin-sky-joust": (
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/griffin-sky-joust/claim-ledger-v2.json",
        "dbe69391387b5ae8bae2fe0e6d1a0e3b6a687ed9f372b3259cd00c9f92958905",
    ),
    "realm-carver": (
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/realm-carver/claim-ledger-v2.json",
        "259b821e88143665203830814292ad19a78397d9974f2dee6edd9e92051e8afc",
    ),
    "devourer-slime": (
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/devourer-slime/reconciled-claim-ledger-v2.json",
        "7ef676e12ae5d8ee1265814ee031146b94dced75915f3d2a95659a6b09226dba",
    ),
    "the-haunted-library": (
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/the-haunted-library/claim-ledger-batch-b.json",
        "5e888c0e7577ca767be873847b8dab5b4339efd2dee0490e98fc82ee97053ef1",
    ),
    "babel-architect": (
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/babel-architect/claim-ledger-batch-b.json",
        "179c0835f1a6815ffea28aeb2d547cd4c81aae52d0079ddddf94c7209d1469ee",
    ),
}
SCOPE_COUNTS = {
    "dragon-flight": (225, 44, 104, 7, 70, 0),
    "rpg-battle": (215, 81, 94, 2, 38, 0),
    "abyssal-well": (51, 0, 30, 11, 10, 0),
    "magic-defense": (110, 70, 38, 0, 2, 0),
    "wizard-vs-zombie": (77, 19, 41, 0, 17, 0),
    "village-guardian": (73, 73, 0, 0, 0, 0),
    "archers-revenge": (43, 43, 0, 0, 0, 0),
    "storm-castle-tower": (42, 32, 9, 0, 1, 0),
    "paladins-twin-soul": (21, 0, 12, 0, 9, 0),
    "gryphon-patrol": (15, 0, 11, 0, 4, 0),
    "dragon-rider": (20, 9, 7, 0, 4, 0),
    "dungeon-liberator": (18, 17, 1, 0, 0, 0),
    "spellweavers-run": (51, 37, 14, 0, 0, 0),
    "shadow-gate-dungeon": (18, 0, 4, 0, 14, 0),
    "labyrinth-goblin-king": (12, 0, 3, 0, 9, 0),
    "griffin-riders-escape": (14, 14, 0, 0, 0, 0),
    "sorcerer-ziggurat": (27, 24, 3, 0, 0, 0),
    "enchanted-library": (32, 30, 2, 0, 0, 0),
    "rune-match": (13, 12, 1, 0, 0, 0),
    "alchemists-synthesis": (12, 0, 5, 0, 7, 0),
    "potion-rush": (32, 28, 0, 0, 0, 4),
    "rune-forge-chamber": (29, 24, 0, 0, 0, 5),
    "astral-mage": (19, 16, 0, 0, 0, 3),
    "griffin-sky-joust": (8, 0, 6, 0, 1, 1),
    "realm-carver": (12, 0, 4, 0, 4, 4),
    "devourer-slime": (18, 0, 7, 0, 11, 0),
    "the-haunted-library": (21, 0, 9, 0, 9, 3),
    "babel-architect": (20, 0, 16, 0, 0, 4),
}
SCOPE_TOTALS = (1248, 573, 421, 20, 210, 24)
UPSTREAM_UNKNOWN_IDS = (
    "PR-UNK-001",
    "PR-UNK-002",
    "PR-UNK-003",
    "PR-UNK-004",
    "RFC-UNK-001",
    "RFC-UNK-002",
    "RFC-UNK-003",
    "RFC-UNK-004",
    "RFC-UNK-005",
    "AM-UNK-001",
    "AM-UNK-002",
    "AM-UNK-003",
    "GSJ-CUR-UNK-001",
    "RC-CUR-001",
    "RC-CUR-002",
    "RC-CUR-003",
    "RC-CUR-004",
    "HL-UNK-001",
    "HL-UNK-002",
    "HL-UNK-003",
    "BA-UNK-001",
    "BA-UNK-002",
    "BA-UNK-003",
    "BA-UNK-004",
)
UPSTREAM_UNKNOWN_IDS_SHA256 = (
    "6f22283bf5669af8f994ed566aa26b56a83d9f2a54185088bad97dfb0091ae75"
)
EXPLICIT_SCOPE_TOKENS = (
    "identity",
    "route",
    "asset",
    "copy",
    "graph",
    "test",
    "fixture",
    "responsive",
    "history",
    "historical",
    "registration",
    "catalog",
    "page-export",
    "module-export",
    "source",
    "config",
    "configuration",
    "api",
    "instructions",
    "end-screen",
    "completion-shell",
    "sentence-loading",
    "sentences-route",
    "complete-route",
    "completion-route",
    "cancelled",
)
PARENT_BLUEPRINT_PATH = (
    "measure/archive/apk_three_game_truth_pilot_20260712/pilot-blueprint.json"
)
PARENT_BLUEPRINT_SHA256 = (
    "358f9a0f32905a0d48cba1b976a43accae6ea51c43f648f35b4af8813d5e0cc9"
)
COMPOSITE_BASES = {
    "dragon-rider": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/"
        "packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json",
        "fb778224e67609457ac8ac712bc85b3f5096483e0116f1162a2818bac6b48fe9",
    ),
    "dungeon-liberator": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/"
        "packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json",
        "ff97238f94caa82a5359143c0a25d2a5ee8a2e479bb2fdd0bfea9aab05eef2bd",
    ),
    "sorcerer-ziggurat": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/"
        "packages/catalog/sorcerer-ziggurat/claim-evidence-ledger.json",
        "54bd65f6f655730125c933c15ba79e992479b905869856c9796b508bcffceeca",
    ),
}


@dataclass(frozen=True)
class Finding:
    """Represents one stable fail-closed Phase 1 finding."""

    code: str
    message: str
    severity: str = "Critical"


@dataclass(frozen=True)
class VerificationResult:
    """Contains one deterministic Phase 1 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Reports whether no fail-closed findings remain.

        Returns:
            True only when the verification finding set is empty.
        """
        return not self.findings

    def as_json(self) -> dict[str, Any]:
        """Builds the stable JSON-compatible report.

        Returns:
            The complete verification result as JSON-compatible values.
        """
        return {
            "schema_version": "apk-t9-phase1-truth-report.v1",
            "track_id": TRACK_ID,
            "phase": 1,
            "status": "pass" if self.passed else "blocked",
            "state": self.state,
            "checks": self.checks,
            "findings": [asdict(finding) for finding in self.findings],
        }


def _load_json(path: Path) -> dict[str, Any]:
    """Loads one top-level JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object at {path}")
    return value


def _load_value(path: Path) -> Any:
    """Loads any JSON value used by an accepted terminal leaf."""
    return json.loads(path.read_text(encoding="utf-8"))


def _collect_claims(
    value: Any, pointer: str, output: dict[str, tuple[str, dict[str, Any]]]
) -> None:
    """Collects unique claim objects with their exact RFC 6901 pointers."""
    if isinstance(value, dict):
        if "claim_id" in value:
            output.setdefault(str(value["claim_id"]), (pointer, value))
            return
        for key, item in value.items():
            escaped = str(key).replace("~", "~0").replace("/", "~1")
            _collect_claims(item, f"{pointer}/{escaped}", output)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _collect_claims(item, f"{pointer}/{index}", output)


def _find_string_pointers(
    value: Any, pointer: str, targets: set[str], output: dict[str, str]
) -> None:
    """Finds the first exact JSON pointer for each target string."""
    if isinstance(value, str) and value in targets:
        output.setdefault(value, pointer)
    elif isinstance(value, dict):
        for key, item in value.items():
            escaped = str(key).replace("~", "~0").replace("/", "~1")
            _find_string_pointers(item, f"{pointer}/{escaped}", targets, output)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _find_string_pointers(item, f"{pointer}/{index}", targets, output)


def _claim_rows_at(
    document: dict[str, Any], key: str
) -> dict[str, tuple[str, dict[str, Any]]]:
    """Indexes claim rows under one exact top-level array."""
    rows = document.get(key)
    if not isinstance(rows, list):
        raise ValueError(f"missing materialization array: {key}")
    output: dict[str, tuple[str, dict[str, Any]]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or not isinstance(row.get("claim_id"), str):
            raise ValueError(f"invalid materialization row: {key}/{index}")
        if row["claim_id"] in output:
            raise ValueError("duplicate effective claim ID")
        output[row["claim_id"]] = (f"/{key}/{index}", row)
    return output


@lru_cache(maxsize=None)
def _effective_claims(
    repo_root: Path, game_id: str, terminal_path: str, terminal_sha256: str
) -> dict[str, dict[str, Any]]:
    """Materializes one game's accepted effective claim set."""
    terminal = _load_value(repo_root / terminal_path)
    if game_id not in COMPOSITE_BASES:
        claims: dict[str, tuple[str, dict[str, Any]]] = {}
        _collect_claims(terminal, "", claims)
        return {
            claim_id: {
                "claim": claim,
                "source_pointer": pointer,
                "materialization_rule": "exact-terminal-row",
                "materialization_bindings": [
                    {
                        "path": terminal_path,
                        "sha256": terminal_sha256,
                        "pointer": pointer,
                    }
                ],
            }
            for claim_id, (pointer, claim) in claims.items()
        }
    if not isinstance(terminal, dict):
        raise ValueError("composite terminal leaf is not an object")
    base_path, base_sha256 = COMPOSITE_BASES[game_id]
    base_file = repo_root / base_path
    if not base_file.is_file() or _sha256(base_file) != base_sha256:
        raise ValueError("retained base ledger drifted")
    base = _load_json(base_file)
    base_claims = _claim_rows_at(base, "claims")
    output: dict[str, dict[str, Any]] = {}

    def add(
        claim_id: str,
        claim: dict[str, Any],
        pointer: str,
        bindings: list[dict[str, str]],
        rule: str,
    ) -> None:
        """Adds one unique effective claim with exact materialization bindings."""
        if claim_id in output:
            raise ValueError("duplicate retained and replacement claim")
        output[claim_id] = {
            "claim": claim,
            "source_pointer": pointer,
            "materialization_rule": rule,
            "materialization_bindings": bindings,
        }

    if game_id == "dragon-rider":
        retained = terminal.get("retained_claim_ids")
        replacements = _claim_rows_at(terminal, "claim_atoms")
        if not isinstance(retained, list) or len(retained) != 12:
            raise ValueError("Dragon Rider retained claim set differs")
        if len(replacements) != 8 or set(retained) & set(replacements):
            raise ValueError("Dragon Rider replacement set differs")
        excluded = {"DR-ASSET-001", "DR-SCENE-002", "DR-STATE-001", "DR-TEST-001"}
        if set(base_claims) - set(retained) != excluded:
            raise ValueError("Dragon Rider replacement exclusions differ")
        for index, claim_id in enumerate(retained):
            pointer, claim = base_claims[claim_id]
            add(
                claim_id,
                claim,
                pointer,
                [
                    {"path": base_path, "sha256": base_sha256, "pointer": pointer},
                    {
                        "path": terminal_path,
                        "sha256": terminal_sha256,
                        "pointer": f"/retained_claim_ids/{index}",
                    },
                ],
                "retained-base-exact-copy",
            )
        for claim_id, (pointer, claim) in replacements.items():
            add(
                claim_id,
                claim,
                pointer,
                [
                    {
                        "path": terminal_path,
                        "sha256": terminal_sha256,
                        "pointer": pointer,
                    }
                ],
                "terminal-replacement",
            )
    elif game_id == "dungeon-liberator":
        retained = terminal.get("retained_claim_ids")
        additions = _claim_rows_at(terminal, "added_claims")
        if (
            not isinstance(retained, list)
            or len(retained) != 16
            or set(retained) != set(base_claims)
        ):
            raise ValueError("Dungeon Liberator retained claim set differs")
        if len(additions) != 2 or set(retained) & set(additions):
            raise ValueError("Dungeon Liberator additive claim set differs")
        for index, claim_id in enumerate(retained):
            pointer, claim = base_claims[claim_id]
            add(
                claim_id,
                claim,
                pointer,
                [
                    {"path": base_path, "sha256": base_sha256, "pointer": pointer},
                    {
                        "path": terminal_path,
                        "sha256": terminal_sha256,
                        "pointer": f"/retained_claim_ids/{index}",
                    },
                ],
                "retained-base-exact-copy",
            )
        for claim_id, (pointer, claim) in additions.items():
            add(
                claim_id,
                claim,
                pointer,
                [
                    {
                        "path": terminal_path,
                        "sha256": terminal_sha256,
                        "pointer": pointer,
                    }
                ],
                "terminal-addition",
            )
    else:
        governing = _claim_rows_at(terminal, "governing_claim_fields")
        overrides = _claim_rows_at(terminal, "claim_overrides")
        supersedes = terminal.get("supersedes", {})
        if (
            supersedes.get("sha256") != base_sha256
            or supersedes.get("path")
            != base_path.replace("measure/archive/", "measure/tracks/")
            or supersedes.get("preserved_unchanged") is not True
            or set(governing) != set(base_claims)
            or set(overrides) != {"SZ-HIST-015"}
        ):
            raise ValueError("Sorcerer Ziggurat overlay contract differs")
        for claim_id, (pointer, base_claim) in base_claims.items():
            governing_pointer, governing_fields = governing[claim_id]
            merged = dict(base_claim)
            merged.update(governing_fields)
            bindings = [
                {"path": base_path, "sha256": base_sha256, "pointer": pointer},
                {
                    "path": terminal_path,
                    "sha256": terminal_sha256,
                    "pointer": governing_pointer,
                },
            ]
            if claim_id in overrides:
                override_pointer, override = overrides[claim_id]
                merged.update(override)
                bindings.append(
                    {
                        "path": terminal_path,
                        "sha256": terminal_sha256,
                        "pointer": override_pointer,
                    }
                )
            add(
                claim_id, merged, pointer, bindings, "base-then-governing-then-override"
            )
    if len(output) != SCOPE_COUNTS[game_id][0]:
        raise ValueError("effective claim materialization count differs")
    return output


def _canonical_digest(value: Any) -> str:
    """Hashes one JSON value with stable compact serialization."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


FACT_VALUE_FIELDS = (
    "source_fact",
    "exact_source_fact",
    "extracted_source_fact",
    "semantic_assertion",
    "proposition",
    "claim_text",
    "fact",
    "statement",
    "claim",
    "reason",
    "disclosure",
    "interpretation",
    "description",
    "value",
)


def _claim_fact_value(claim: dict[str, Any]) -> Any:
    """Selects the first schema-authorized substantive accepted fact value."""
    for key in FACT_VALUE_FIELDS:
        if key in claim and claim[key] not in (None, "", [], {}):
            return claim[key]
    return claim["claim_id"]


def _claim_fact_pointer(claim: dict[str, Any]) -> str:
    """Returns the exact pointer used for a claim's compact factual value."""
    for key in FACT_VALUE_FIELDS:
        if key in claim and claim[key] not in (None, "", [], {}):
            escaped = key.replace("~", "~0").replace("/", "~1")
            return f"/{escaped}"
    return "/claim_id"


def _is_upstream_unknown(claim: dict[str, Any]) -> bool:
    """Identifies accepted bounded-absence rows with no factual evidence hash."""
    realm_bounded_absence = (
        claim.get("category") == "unknown"
        and claim.get("evidence_class") == "unknown"
        and claim.get("confidence") == "bounded"
    )
    explicit_unknown_source = claim.get("source_class") == "unknown"
    return (
        (realm_bounded_absence or explicit_unknown_source)
        and claim.get("cited_range_sha256") is None
        and claim.get("blob_sha256") is None
    )


MECHANIC_CATEGORY_TOKENS = (
    "mechanic",
    "state",
    "transition",
    "scene",
    "control",
    "input",
    "movement",
    "collision",
    "camera",
    "topology",
    "hazard",
    "scoring",
    "completion",
    "combat",
    "health",
    "capture",
    "result",
    "render",
    "projectile",
    "target",
    "layout",
    "gameplay",
    "round",
    "selection",
    "bounds",
    "graph",
    "projection",
    "initialization",
    "adjacency",
    "distractor",
    "implementation",
)
EFFORT_CATEGORY_TOKENS = (
    "test",
    "fixture",
    "requirement",
    "design",
    "audit",
    "qc",
    "ship",
    "workflow",
    "history",
    "config",
    "route",
    "api",
    "identity",
    "catalog",
    "copy",
    "registration",
    "module-export",
    "page-export",
)
EXACT_CONTEXT_CATEGORIES = {
    "historical",
    "current-disposition",
    "persistence-vocabulary",
    "cancelled-track",
    "historical-page",
}
EXACT_EFFORT_CATEGORIES = {
    "component",
    "game-component",
    "component-contract",
    "integration",
    "cancelled-manual-verification",
    "cartridge-manifest",
    "historical-manifest",
}
EXACT_MECHANIC_CATEGORIES = {
    "world",
    "spawn",
    "instructions",
    "sentence-fetch",
    "tick-loop",
    "defense",
    "enemy_behavior",
    "terminal",
    "waves",
    "ui",
    "world-dimensions",
    "stealth-detection",
    "creature-chase",
    "patrol",
    "ordered-crystals",
    "illegal-and-wrong-step",
    "correct-step",
    "concrete-semantic-effect-usage",
    "content",
    "matching",
    "customer-spawn",
    "surface",
    "shuffle",
    "progression",
    "ui-lifecycle",
    "loop",
    "terminal-ui",
    "hud",
    "offscreen-indicator",
    "sentence-loading",
    "lifecycle",
    "floor-model",
    "door-model",
    "end-screen",
    "historical-difficulty",
    "historical-ui-lifecycle",
    "historical-loop",
}
EXACT_EFFORT_CLAIM_IDS = {"MD-HIST-001", "MD-HIST-002"}
EXACT_MECHANIC_CLAIM_IDS = {"GSJ-HIST-006"}


def _claim_routing(
    claim: dict[str, Any],
) -> tuple[str, str | None, tuple[str, ...]]:
    """Returns one source-bound primary disposition without a mechanic fallback."""
    category = (
        " ".join(
            str(claim.get(key, "")) for key in ("category", "claim_category", "scope")
        )
        .lower()
        .strip()
    )
    claim_id = str(claim.get("claim_id", ""))
    semantic = category if category else claim_id.lower()
    if _is_upstream_unknown(claim):
        return "blocked-upstream-unknown", None, ()
    if "responsive" in semantic or "resp" in semantic:
        return "deferred-responsive", "phase3-responsive-constraints", ()
    if category in {"completion-route", "route-completion", "completion-test"}:
        return "phase1-effort", None, ()
    if "asset" in semantic:
        workflow = any(
            token in semantic
            for token in (
                "author",
                "import",
                "loading",
                "build",
                "test",
                "qc",
                "ship",
                "workflow",
            )
        )
        if workflow:
            return "phase1-effort", None, ("deferred-asset",)
        return "deferred-asset", "phase2-asset-ontology", ()
    if claim_id in EXACT_MECHANIC_CLAIM_IDS:
        return "phase1-mechanic", None, ()
    if category in EXACT_CONTEXT_CATEGORIES:
        return "context-only", None, ()
    if category in EXACT_EFFORT_CATEGORIES or claim_id in EXACT_EFFORT_CLAIM_IDS:
        return "phase1-effort", None, ()
    if category in EXACT_MECHANIC_CATEGORIES:
        return "phase1-mechanic", None, ()
    if any(token in semantic for token in MECHANIC_CATEGORY_TOKENS):
        return "phase1-mechanic", None, ()
    if any(token in semantic for token in EFFORT_CATEGORY_TOKENS):
        return "phase1-effort", None, ()
    return "unclassified", None, ()


def _claim_output_role(claim: dict[str, Any]) -> str | None:
    """Maps a current routing disposition to its owning output role."""
    disposition, _future_owner, _handoffs = _claim_routing(claim)
    return {
        "phase1-mechanic": "mechanic-blueprint",
        "phase1-effort": "developer-effort",
    }.get(disposition)


def _public_scope_audit(source_audit: dict[str, Any]) -> dict[str, Any]:
    """Builds the compact public scope summary without duplicating claim rows."""
    return {
        "totals": source_audit["totals"],
        "per_game": [
            {key: value for key, value in row.items() if key != "claims"}
            for row in source_audit["per_game"]
        ],
    }


def _expected_source_artifacts() -> list[dict[str, str]]:
    """Returns the exact 32 accepted source artifacts for materialization."""
    paths = {path: digest for path, digest in TERMINAL_LEAVES.values()}
    paths.update({path: digest for path, digest in COMPOSITE_BASES.values()})
    paths[PARENT_BLUEPRINT_PATH] = PARENT_BLUEPRINT_SHA256
    return [
        {"document_id": f"s{index:02d}", "path": path, "sha256": paths[path]}
        for index, path in enumerate(sorted(paths))
    ]


@lru_cache(maxsize=None)
def _source_scope_audit(repo_root: Path) -> dict[str, Any]:
    """Rederives exact accepted effective claims and their scope partition."""
    parent_file = repo_root / PARENT_BLUEPRINT_PATH
    if not parent_file.is_file() or _sha256(parent_file) != PARENT_BLUEPRINT_SHA256:
        raise ValueError("accepted parent blueprint drifted")
    parent_blueprint = _load_json(parent_file)
    rows = []
    totals = [0, 0, 0, 0, 0, 0]
    leaves = []
    upstream_unknown_ids: list[str] = []
    for game_id in EXPECTED_RESOLVABLE_GAME_IDS:
        path, digest = TERMINAL_LEAVES[game_id]
        file_path = repo_root / path
        if not file_path.is_file() or _sha256(file_path) != digest:
            raise ValueError("terminal accepted leaf drifted")
        claims = _effective_claims(repo_root, game_id, path, digest)
        parent_pointers: dict[str, str] = {}
        game_blueprint = parent_blueprint.get("games", {}).get(game_id)
        if game_blueprint is not None:
            _find_string_pointers(
                game_blueprint["A_scene_state_blueprint"],
                f"/games/{game_id}/A_scene_state_blueprint",
                set(claims),
                parent_pointers,
            )
        counts = [len(claims), 0, 0, 0, 0, 0]
        claim_rows = []
        for claim_id, materialized in claims.items():
            claim = materialized["claim"]
            direct = any(
                claim.get(key) not in (None, "", [], {})
                for key in ("scene_or_state_id", "scene_id", "state_id")
            )
            if _is_upstream_unknown(claim):
                scope_class = "upstream-unknown"
                counts[5] += 1
                upstream_unknown_ids.append(claim_id)
            elif direct:
                scope_class = "direct-scene-state"
                counts[1] += 1
            elif claim_id in parent_pointers:
                scope_class = "exact-parent-linked"
                counts[3] += 1
            else:
                explicit = " ".join(
                    str(claim.get(key, ""))
                    for key in ("category", "claim_category", "scope")
                )
                label = explicit if explicit.strip() else claim_id
                if any(token in label.lower() for token in EXPLICIT_SCOPE_TOKENS):
                    scope_class = "explicit-game-package-global"
                    counts[2] += 1
                else:
                    scope_class = "ambiguous-blocked"
                    counts[4] += 1
            if (
                _claim_fact_pointer(claim) == "/claim_id"
                and scope_class != "upstream-unknown"
            ):
                raise ValueError("accepted fact has only an opaque claim ID")
            row = {
                "claim_id": claim_id,
                "source_pointer": materialized["source_pointer"],
                "scope_class": scope_class,
                "materialization_rule": materialized["materialization_rule"],
                "factual_evidence_status": (
                    "upstream-unknown"
                    if scope_class == "upstream-unknown"
                    else "accepted"
                ),
                "scope_status": (
                    "blocked-by-upstream-unknown"
                    if scope_class == "upstream-unknown"
                    else (
                        "blocked-by-unknown-scene-state"
                        if scope_class == "ambiguous-blocked"
                        else "resolved"
                    )
                ),
                "materialization_bindings": materialized["materialization_bindings"],
            }
            if scope_class == "exact-parent-linked":
                row["parent_link"] = {
                    "path": PARENT_BLUEPRINT_PATH,
                    "sha256": PARENT_BLUEPRINT_SHA256,
                    "pointer": parent_pointers[claim_id],
                    "value": claim_id,
                }
            claim_rows.append(row)
        expected = SCOPE_COUNTS[game_id]
        if tuple(counts) != expected:
            raise ValueError(
                f"terminal claim scope partition drifted: {game_id} {counts}"
            )
        totals = [left + right for left, right in zip(totals, counts, strict=True)]
        leaves.append({"game_id": game_id, "path": path, "sha256": digest})
        rows.append(
            {
                "game_id": game_id,
                "total": counts[0],
                "direct": counts[1],
                "explicit_game_package_global": counts[2],
                "exact_parent_linked": counts[3],
                "ambiguous_blocked": counts[4],
                "upstream_unknown": counts[5],
                "claims": claim_rows,
            }
        )
    if tuple(totals) != SCOPE_TOTALS:
        raise ValueError("aggregate scope partition drifted")
    unknown_digest = hashlib.sha256(
        json.dumps(upstream_unknown_ids, separators=(",", ":")).encode()
    ).hexdigest()
    if (
        tuple(upstream_unknown_ids) != UPSTREAM_UNKNOWN_IDS
        or unknown_digest != UPSTREAM_UNKNOWN_IDS_SHA256
    ):
        raise ValueError("upstream-unknown population drifted")
    return {
        "terminal_leaves": leaves,
        "totals": {
            "claims": totals[0],
            "direct": totals[1],
            "explicit_game_package_global": totals[2],
            "exact_parent_linked": totals[3],
            "ambiguous_blocked": totals[4],
            "upstream_unknown": totals[5],
        },
        "per_game": rows,
    }


def _record_scope_contract(
    claim: dict[str, Any],
    audit_claim: dict[str, Any],
    claim_id: str,
) -> dict[str, Any]:
    """Returns the exact placement and provenance contract for one current claim."""
    scope_class = audit_claim["scope_class"]
    if scope_class == "direct-scene-state":
        value = claim["scene_or_state_id"]
        target_field = "state_id" if "state=" in str(value) else "scene_id"
        return {
            "factual_evidence_status": "accepted",
            "scope_status": "resolved",
            "coverage_granularity": "scene-state",
            "coverage_status": "resolved",
            "counts_as_resolved_coverage": True,
            "scene_id": value if target_field == "scene_id" else None,
            "state_id": value if target_field == "state_id" else None,
            "scene_state_provenance": {
                "mode": "direct-exact-copy",
                "source_claim_id": claim_id,
                "source_pointer": "/scene_or_state_id",
                "value": value,
                "target_field": target_field,
                "derivation_rule": "exact-copy",
            },
        }
    if scope_class == "exact-parent-linked":
        parent = audit_claim["parent_link"]
        target_field = "state_id" if "/states/" in parent["pointer"] else "scene_id"
        return {
            "factual_evidence_status": "accepted",
            "scope_status": "resolved",
            "coverage_granularity": "scene-state",
            "coverage_status": "resolved",
            "counts_as_resolved_coverage": True,
            "scene_id": parent["value"] if target_field == "scene_id" else None,
            "state_id": parent["value"] if target_field == "state_id" else None,
            "scene_state_provenance": {
                "mode": "accepted-parent-exact-copy",
                "parent_path": parent["path"],
                "parent_sha256": parent["sha256"],
                "parent_pointer": parent["pointer"],
                "value": parent["value"],
                "target_field": target_field,
                "derivation_rule": "exact-copy",
            },
        }
    if scope_class == "explicit-game-package-global":
        return {
            "factual_evidence_status": "accepted",
            "scope_status": "resolved",
            "coverage_granularity": "game",
            "coverage_status": "resolved",
            "counts_as_resolved_coverage": True,
            "scene_id": None,
            "state_id": None,
            "scene_state_provenance": {
                "mode": "explicit-game-level",
                "source_claim_id": claim_id,
                "derivation_rule": "source-classification",
            },
        }
    if scope_class == "ambiguous-blocked":
        return {
            "factual_evidence_status": "accepted",
            "scope_status": "blocked-by-unknown-scene-state",
            "coverage_granularity": "scene-state",
            "coverage_status": "blocked-by-unknown",
            "counts_as_resolved_coverage": False,
            "scene_id": None,
            "state_id": None,
            "scene_state_provenance": {
                "mode": "accepted-placement-blocked",
                "source_claim_id": claim_id,
                "reason": "unknown-scene-state",
            },
        }
    raise ValueError("non-current claim cannot produce a Phase 1 record")


def _reference_contract_payloads(repo_root: Path) -> dict[str, Any]:
    """Builds the complete decision-free production payloads and measurements."""
    audit = _source_scope_audit(repo_root)
    audit_claims = {
        (row["game_id"], claim["claim_id"]): claim
        for row in audit["per_game"]
        for claim in row["claims"]
    }
    documents = _expected_source_artifacts()
    document_ids = {item["path"]: item["document_id"] for item in documents}
    source_claims = []
    output_records: dict[str, list[dict[str, Any]]] = {
        "mechanic-blueprint": [],
        "developer-effort": [],
    }
    dependency_claims = []
    dependency_fields = []
    edges = []
    routing_counts: dict[str, int] = {}
    game_mechanics = {game_id: 0 for game_id in EXPECTED_RESOLVABLE_GAME_IDS}
    for game_id in EXPECTED_RESOLVABLE_GAME_IDS:
        for claim_id, materialized in _effective_claims(
            repo_root, game_id, *TERMINAL_LEAVES[game_id]
        ).items():
            claim = materialized["claim"]
            audit_claim = audit_claims[(game_id, claim_id)]
            disposition, future_owner, handoffs = _claim_routing(claim)
            routing_counts[disposition] = routing_counts.get(disposition, 0) + 1
            role = _claim_output_role(claim)
            source_claims.append(
                {
                    "game_id": game_id,
                    "claim_id": claim_id,
                    "terminal_document_id": document_ids[TERMINAL_LEAVES[game_id][0]],
                    "materialization_rule": materialized["materialization_rule"],
                    "materialization_steps": [
                        {
                            "document_id": document_ids[item["path"]],
                            "pointer": item["pointer"],
                        }
                        for item in materialized["materialization_bindings"]
                    ],
                    "claim_sha256": _canonical_digest(claim),
                    "value_pointer": _claim_fact_pointer(claim),
                    "value_sha256": _canonical_digest(_claim_fact_value(claim)),
                    "confidence": claim.get("confidence"),
                    "scope_class": audit_claim["scope_class"],
                    "scope_status": audit_claim["scope_status"],
                    "factual_evidence_status": audit_claim["factual_evidence_status"],
                    "routing_disposition": disposition,
                    "future_owner_phase": future_owner,
                    "future_handoffs": list(handoffs),
                }
            )
            dependency_claims.append(
                {
                    "game_id": game_id,
                    "claim_id": claim_id,
                    "routing_disposition": disposition,
                    "future_owner_phase": future_owner,
                    "future_handoffs": list(handoffs),
                }
            )
            if role is None:
                continue
            if role == "mechanic-blueprint":
                game_mechanics[game_id] += 1
            value = _claim_fact_value(claim)
            record_id = f"{game_id}:{claim_id}"
            field = {
                "field_id": "fact",
                "output_role": role,
                "routing_disposition": disposition,
                "value": value,
                "value_sha256": _canonical_digest(value),
                "upstream_claim_ids": [claim_id],
                "upstream_selectors": [
                    {
                        "claim_id": claim_id,
                        "pointer": _claim_fact_pointer(claim),
                    }
                ],
                "derivation_rule": "exact-copy",
            }
            record = {
                "record_id": record_id,
                "record_type": (
                    "mechanic-fact" if role == "mechanic-blueprint" else "effort-fact"
                ),
                "output_role": role,
                "owner_role": "mechanics-capability-mapper",
                "evidence_category_role": role,
                "game_id": game_id,
                "source_claim_id": claim_id,
                **_record_scope_contract(claim, audit_claim, claim_id),
                "derived_fields": [field],
            }
            output_records[role].append(record)
            dependency_fields.append(
                {"record_id": record_id, "field_id": "fact", "output_role": role}
            )
            edges.append(
                {
                    "upstream_claim_id": claim_id,
                    "derived_record_id": record_id,
                    "derived_field_id": "fact",
                    "output_role": role,
                }
            )
    return {
        "payloads": {
            MAPPER_OUTPUT_PATHS[0]: {
                "source_artifacts": documents,
                "terminal_leaves": audit["terminal_leaves"],
                "scope_audit": _public_scope_audit(audit),
                "upstream_claims": source_claims,
            },
            MAPPER_OUTPUT_PATHS[1]: {"records": output_records["mechanic-blueprint"]},
            MAPPER_OUTPUT_PATHS[2]: {"records": output_records["developer-effort"]},
            MAPPER_OUTPUT_PATHS[3]: {
                "upstream_claims": dependency_claims,
                "derived_fields": dependency_fields,
                "edges": edges,
            },
        },
        "routing_counts": routing_counts,
        "game_mechanics": game_mechanics,
    }


def _reference_contract_bundle(
    repo_root: Path, registry: dict[str, Any]
) -> tuple[dict[str, dict[str, Any]], set[str]]:
    """Builds the complete production mapper bundle for contract testing."""
    del registry
    reference = _reference_contract_payloads(repo_root)
    payloads = reference["payloads"]
    bundle = {
        MAPPER_OUTPUT_PATHS[0]: {
            "schema_version": "apk-t9-phase1-source-resolution-index.v1",
            "phase0_bindings": {
                "phase0_root_acceptance": ROOT_ACCEPTANCE_SHA256,
                "phase0_input_freeze": INPUT_FREEZE_SHA256,
                "phase0_source_registry": SOURCE_REGISTRY_SHA256,
                "phase0_game_identity_map": IDENTITY_MAP_SHA256,
                "phase1_role_dispatch": ROLE_DISPATCH_SHA256,
            },
            "denominator": {
                "accepted_game_ids": list(EXPECTED_GAME_IDS),
                "game_ids_sha256": EXPECTED_GAME_IDS_SHA256,
                "resolvable_game_ids": list(EXPECTED_RESOLVABLE_GAME_IDS),
                "resolvable_game_ids_sha256": EXPECTED_RESOLVABLE_GAME_IDS_SHA256,
                "explicit_omissions": [CASTLE_OMISSION],
            },
            **payloads[MAPPER_OUTPUT_PATHS[0]],
        },
        MAPPER_OUTPUT_PATHS[1]: {
            "schema_version": "apk-t9-phase1-mechanic-blueprints.v1",
            **payloads[MAPPER_OUTPUT_PATHS[1]],
        },
        MAPPER_OUTPUT_PATHS[2]: {
            "schema_version": "apk-t9-phase1-developer-effort-baseline.v1",
            **payloads[MAPPER_OUTPUT_PATHS[2]],
        },
        MAPPER_OUTPUT_PATHS[3]: {
            "schema_version": "apk-t9-claim-dependency-graph.v1",
            **payloads[MAPPER_OUTPUT_PATHS[3]],
        },
    }
    bundle[MAPPER_RECEIPT_PATH] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "mechanics-capability-mapper",
        "task_id": "phase1-map-mechanics-and-effort",
        "dispatch_sha256": ROLE_DISPATCH_SHA256,
        "output_hashes": {
            path: hashlib.sha256(
                json.dumps(bundle[path], sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
            for path in MAPPER_OUTPUT_PATHS
        },
    }
    return bundle, set(EXPECTED_GAME_IDS)


def _reference_contract_metrics(repo_root: Path) -> dict[str, Any]:
    """Measures the complete production reference bundle against frozen budgets."""
    reference = _reference_contract_payloads(repo_root)
    return {
        "serialized_bytes": {
            path: len(json.dumps(value, separators=(",", ":")).encode())
            for path, value in reference["payloads"].items()
        },
        "routing_counts": reference["routing_counts"],
        "games_with_zero_mechanics": [
            game_id
            for game_id, count in reference["game_mechanics"].items()
            if count == 0
        ],
    }


def _sha256(path: Path) -> str:
    """Returns one file's lowercase SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _add(
    findings: list[Finding],
    code: str,
    message: str,
) -> None:
    """Adds one finding per stable code."""
    if not any(finding.code == code for finding in findings):
        findings.append(Finding(code=code, message=message))


def _resolve_pointer(document: Any, pointer: str) -> Any:
    """Resolves one RFC 6901-style JSON pointer."""
    if pointer == "":
        return document
    if not pointer.startswith("/"):
        raise ValueError("JSON pointer must start with a slash")
    current = document
    for raw_part in pointer[1:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            current = current[int(part)]
        elif isinstance(current, dict):
            current = current[part]
        else:
            raise KeyError(part)
    return current


def _same_track_relocation(bound_path: str, resolved_path: str) -> bool:
    """Allows only suffix-preserving tracks-to-archive relocation."""
    if bound_path == resolved_path:
        return True
    track_prefix = "measure/tracks/"
    archive_prefix = "measure/archive/"
    return bound_path.startswith(track_prefix) and resolved_path == (
        archive_prefix + bound_path.removeprefix(track_prefix)
    )


def _accepted_archive_root(source_path: str) -> Path:
    """Returns the exact accepted track root for hash-only resolution."""
    parts = Path(source_path).parts
    if len(parts) < 4 or parts[:2] not in {
        ("measure", "archive"),
        ("measure", "tracks"),
    }:
        raise ValueError("accepted source is outside one Measure track")
    return Path(*parts[:3])


def _unique_digest_path(
    repo_root: Path,
    source_path: str,
    digest: str,
) -> str:
    """Finds one unique digest inside the accepted source track only."""
    archive_root = repo_root / _accepted_archive_root(source_path)
    started = time.monotonic()
    candidates = [path for path in archive_root.rglob("*.json") if path.is_file()]
    if len(candidates) > 5000:
        raise ValueError("accepted track exceeds bounded hash-only JSON scan")
    matches = []
    for path in candidates:
        if time.monotonic() - started > 10:
            raise ValueError("hash-only scan exceeded its ten-second stop-loss")
        if _sha256(path) == digest:
            matches.append(path)
    if len(matches) != 1:
        raise ValueError("hash-only binding is missing or ambiguous")
    return matches[0].relative_to(repo_root).as_posix()


def _contains_generator_decision(value: Any) -> bool:
    """Detects generator-authored decision fields recursively."""
    if isinstance(value, dict):
        if GENERATOR_DECISION_KEYS.intersection(value):
            return True
        if value.get("authored_by") == "generator":
            return True
        return any(_contains_generator_decision(item) for item in value.values())
    if isinstance(value, list):
        return any(_contains_generator_decision(item) for item in value)
    return False


def _expected_phase1_assignment() -> dict[str, Any]:
    """Returns the exact additive Phase 1 truth-test assignment."""
    return {
        "agent_ref": "/root/t9_phase0_governance_author",
        "allowed_outputs": [
            "phase1_truth_verifier.py",
            "phase1_truth_verifier_test.py",
            "phase1-fixture-manifest-v1.json",
            "negative-fixtures/phase1/*",
            "phase1-red-report-v1.json",
            "role-receipts/phase1/truth-test-author.json",
            "phase1-green-report-v1.json",
        ],
        "forbidden_outputs": [
            "phase1-source-resolution-index-v1.json",
            "phase1-mechanic-blueprints-v1.json",
            "phase1-developer-effort-baseline-v1.json",
            "phase1-claim-dependency-edges-v1.json",
            "phase1-independent-review.json",
            "phase1-root-acceptance.json",
        ],
        "owner_role": "truth-test-author",
        "task_id": "phase1-author-truth-tests",
    }


def _verify_frozen_inputs(
    repo_root: Path,
    track_root: Path,
    findings: list[Finding],
) -> tuple[int, dict[str, Any]]:
    """Verifies Phase 0 v3 acceptance, freeze, registry, and dispatch."""
    bindings = {
        ROOT_ACCEPTANCE_PATH: ROOT_ACCEPTANCE_SHA256,
        INPUT_FREEZE_PATH: INPUT_FREEZE_SHA256,
        ROLE_MANIFEST_PATH: ROLE_MANIFEST_SHA256,
        ROLE_DISPATCH_PATH: ROLE_DISPATCH_SHA256,
        SOURCE_REGISTRY_PATH: SOURCE_REGISTRY_SHA256,
        IDENTITY_MAP_PATH: IDENTITY_MAP_SHA256,
        IDENTITY_REVIEW_PATH: IDENTITY_REVIEW_SHA256,
        T3_CATALOG_PATH: T3_CATALOG_SHA256,
        COHORT_CATALOG_PATH: COHORT_CATALOG_SHA256,
    }
    checks = 0
    for relative_path, digest in bindings.items():
        checks += 1
        path = track_root / relative_path
        if not path.is_file() or _sha256(path) != digest:
            _add(
                findings,
                "PHASE1_FROZEN_INPUT_DRIFT",
                f"Frozen Phase 1 input drifted: {relative_path}.",
            )
    if findings:
        return checks, {}
    acceptance = _load_json(track_root / ROOT_ACCEPTANCE_PATH)
    freeze = _load_json(track_root / INPUT_FREEZE_PATH)
    dispatch = _load_json(track_root / ROLE_DISPATCH_PATH)
    registry = _load_json(track_root / SOURCE_REGISTRY_PATH)
    checks += 12
    assignment = next(
        (
            item
            for item in dispatch["assignments"]
            if item.get("task_id") == "phase1-author-truth-tests"
        ),
        None,
    )
    if not (
        acceptance.get("decision") == "ACCEPT_PHASE0_V3_OPEN_PHASE1"
        and acceptance.get("scope", {}).get("phase1_authorized") is True
        and acceptance.get("artifact_bindings", {}).get(SOURCE_REGISTRY_PATH)
        == SOURCE_REGISTRY_SHA256
        and acceptance.get("artifact_bindings", {}).get(INPUT_FREEZE_PATH)
        == INPUT_FREEZE_SHA256
        and acceptance.get("artifact_bindings", {}).get(IDENTITY_MAP_PATH)
        == IDENTITY_MAP_SHA256
        and freeze.get("status") == "candidate-non-consumable"
        and freeze.get("activation", {}).get("requires_root_acceptance_v3") is True
        and freeze.get("activation", {}).get("phase1_authorized") is False
        and dispatch.get("status") == "active"
        and dispatch.get("base_role_contract")
        == {
            "path": ROLE_MANIFEST_PATH,
            "sha256": ROLE_MANIFEST_SHA256,
        }
        and dispatch.get("phase0_v3_bindings", {}).get("root_acceptance")
        == {"path": ROOT_ACCEPTANCE_PATH, "sha256": ROOT_ACCEPTANCE_SHA256}
        and dispatch.get("phase0_v3_bindings", {}).get("source_registry")
        == {"path": SOURCE_REGISTRY_PATH, "sha256": SOURCE_REGISTRY_SHA256}
        and dispatch.get("phase0_v3_bindings", {}).get("input_freeze")
        == {"path": INPUT_FREEZE_PATH, "sha256": INPUT_FREEZE_SHA256}
        and dispatch.get("phase0_v3_bindings", {}).get("identity_map")
        == {
            "path": IDENTITY_MAP_PATH,
            "sha256": IDENTITY_MAP_SHA256,
            "mapping_digest": IDENTITY_MAPPING_DIGEST,
        }
        and assignment == _expected_phase1_assignment()
        and registry.get("candidate_only") is True
        and registry.get("consumable") is False
        and dispatch.get("input_contract")
        == {
            "game_count": 29,
            "resolvable_game_count": 28,
            "game_ids_sha256": EXPECTED_GAME_IDS_SHA256,
            "resolvable_game_ids_sha256": EXPECTED_RESOLVABLE_GAME_IDS_SHA256,
            "castle_defense_disposition": "blocked-by-unknown",
            "castle_scene_or_state_ids": [],
            "fabricated_castle_scene_state_allowed": False,
            "generic_slugification_allowed": False,
            "accepted_leaf_resolution_required": True,
        }
        and dispatch.get("supersedes", {}).get("status") == "inactive"
    ):
        _add(
            findings,
            "PHASE1_FROZEN_INPUT_DRIFT",
            "Phase 1 authority, ownership, or consumability is not exact.",
        )
    return checks, registry


def _accepted_game_ids(repo_root: Path, registry: dict[str, Any]) -> set[str]:
    """Verifies the exact identity map and returns its fixed 29 game IDs."""
    source = next(
        item for item in registry["sources"] if item["id"] == "t2-accepted-partition"
    )
    path = repo_root / source["path"]
    if _sha256(path) != source["sha256"]:
        raise ValueError("accepted T2 partition hash drifted")
    partition = _load_json(path)
    identity = _load_json((repo_root / "measure/tracks" / TRACK_ID) / IDENTITY_MAP_PATH)
    entries = identity["entries"]
    canonical = json.dumps(entries, ensure_ascii=False, separators=(",", ":")).encode()
    if hashlib.sha256(canonical).hexdigest() != IDENTITY_MAPPING_DIGEST:
        raise ValueError("identity mapping digest differs")
    normalized = [item["game_id"] for item in entries]
    for index, item in enumerate(entries):
        pointer = f"/assignments/{index}/canonical_identity_label"
        if (
            item["t2_pointer"] != pointer
            or _resolve_pointer(partition, pointer) != item["t2_label"]
        ):
            raise ValueError("identity T2 pointer differs")
        source_path = repo_root / item["id_source_path"]
        if (
            not source_path.is_file()
            or _sha256(source_path) != item["id_source_sha256"]
        ):
            raise ValueError("identity source binding differs")
        resolved = _resolve_pointer(_load_json(source_path), item["id_source_pointer"])
        extraction = item["id_extraction"]
        if extraction == "exact-value":
            extracted = resolved
        elif extraction == "terminal-path-segment":
            extracted = str(resolved).rstrip("/").split("/")[-1]
        elif extraction == "package-directory-segment-from-output-hash-key":
            decoded = item["id_source_pointer"].replace("~1", "/")
            extracted = decoded.split("/packages/", 1)[1].split("/", 1)[0]
        else:
            raise ValueError("unsupported explicit identity extraction")
        if extracted != item["game_id"]:
            raise ValueError("identity source does not yield game ID")
    digest = hashlib.sha256(
        json.dumps(normalized, separators=(",", ":")).encode()
    ).hexdigest()
    if (
        len(normalized) != 29
        or len(set(normalized)) != 29
        or tuple(normalized) != EXPECTED_GAME_IDS
        or digest != EXPECTED_GAME_IDS_SHA256
    ):
        raise ValueError("accepted T2 game identifier contract differs")
    resolvable = [item for item in normalized if item != "castle-defense"]
    if tuple(resolvable) != EXPECTED_RESOLVABLE_GAME_IDS:
        raise ValueError("resolvable game identifier contract differs")
    return set(normalized)


def _mapper_bundle(track_root: Path) -> dict[str, dict[str, Any]]:
    """Loads the four mapper outputs and their author receipt."""
    return {
        **{path: _load_json(track_root / path) for path in MAPPER_OUTPUT_PATHS},
        MAPPER_RECEIPT_PATH: _load_json(track_root / MAPPER_RECEIPT_PATH),
    }


def _claim_sources(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Indexes accepted sources by stable identifier."""
    return {source["id"]: source for source in registry["sources"]}


PRODUCTION_RECORD_KEYS = frozenset(
    {
        "record_id",
        "record_type",
        "output_role",
        "owner_role",
        "evidence_category_role",
        "game_id",
        "source_claim_id",
        "factual_evidence_status",
        "scope_status",
        "coverage_granularity",
        "coverage_status",
        "counts_as_resolved_coverage",
        "scene_id",
        "state_id",
        "scene_state_provenance",
        "derived_fields",
    }
)
PRODUCTION_FIELD_KEYS = frozenset(
    {
        "field_id",
        "output_role",
        "routing_disposition",
        "value",
        "value_sha256",
        "upstream_claim_ids",
        "upstream_selectors",
        "derivation_rule",
    }
)


def _record_fields(
    repo_root: Path,
    records: list[dict[str, Any]],
    claim_values: dict[str, Any],
    scope_classes: dict[str, str],
    findings: list[Finding],
    selectors_required: bool = False,
    expected_output_role: str | None = None,
    claim_output_roles: dict[str, str | None] | None = None,
    claim_value_pointers: dict[str, str] | None = None,
    expected_record_contracts: dict[tuple[str, str], dict[str, Any]] | None = None,
) -> tuple[
    set[tuple[str, str, str]],
    dict[tuple[str, str], set[str]],
]:
    """Validates derived records and returns coverage and dependencies."""
    coverage: set[tuple[str, str | None, str | None]] = set()
    dependencies: dict[tuple[str, str], set[str]] = {}
    for record in records:
        if expected_record_contracts is not None:
            unknown_record_keys = set(record) - PRODUCTION_RECORD_KEYS
            if unknown_record_keys:
                _add(
                    findings,
                    "UNSUPPORTED_DECISION_FIELD",
                    "A production record contains undeclared decision fields.",
                )
            contract = expected_record_contracts.get(
                (record.get("game_id"), record.get("source_claim_id"))
            )
            provenance = record.get("scene_state_provenance")
            expected_provenance = (
                contract.get("scene_state_provenance") if contract is not None else None
            )
            contract_mismatch = contract is None or any(
                key != "scene_state_provenance" and record.get(key) != value
                for key, value in (contract or {}).items()
            )
            provenance_mismatch = (
                not isinstance(provenance, dict)
                or not isinstance(expected_provenance, dict)
                or any(
                    provenance.get(key) != value
                    for key, value in (expected_provenance or {}).items()
                )
            )
            if contract_mismatch or provenance_mismatch:
                _add(
                    findings,
                    "RECORD_SCOPE_PROVENANCE_MISMATCH",
                    "A production record placement differs from its accepted source claim.",
                )
            if (
                isinstance(provenance, dict)
                and isinstance(expected_provenance, dict)
                and set(provenance) - set(expected_provenance)
            ):
                _add(
                    findings,
                    "UNSUPPORTED_DECISION_FIELD",
                    "Scene/state provenance contains undeclared decision fields.",
                )
        if record.get("owner_role") != "mechanics-capability-mapper":
            _add(findings, "WRONG_MAPPER_OWNER", "A record has the wrong owner role.")
        if (
            expected_output_role is not None
            and record.get("evidence_category_role") != expected_output_role
        ):
            _add(
                findings,
                "WRONG_ARTIFACT_CATEGORY",
                "A record contradicts its evidence-category routing role.",
            )
        if expected_output_role is not None and (
            record.get("output_role") != expected_output_role
            or record.get("record_type")
            != (
                "mechanic-fact"
                if expected_output_role == "mechanic-blueprint"
                else "effort-fact"
            )
        ):
            _add(
                findings,
                "WRONG_OUTPUT_ROLE",
                "A record is assigned to the wrong Phase 1 output role.",
            )
        factual_status = record.get("factual_evidence_status")
        scope_status = record.get("scope_status")
        if (
            scope_status == "blocked-by-unknown-scene-state"
            and factual_status != "accepted"
        ) or (
            factual_status == "blocked-by-unknown"
            and scope_status != "blocked-by-unknown-factual-evidence"
        ):
            _add(
                findings,
                "FACTUAL_SCOPE_STATUS_CONFLATION",
                "Factual acceptance and scene-placement ambiguity were conflated.",
            )
        provenance = record.get("scene_state_provenance", {})
        granularity = record.get("coverage_granularity", "scene-state")
        if record.get("scene_id") in {"main", "default", "unknown"} or record.get(
            "state_id"
        ) in {"main", "default", "unknown"}:
            _add(
                findings,
                "FABRICATED_SCENE_STATE_DEFAULT",
                "A record uses a fabricated generic scene or state identifier.",
            )
        if provenance.get("mode") == "accepted-parent-exact-copy":
            try:
                parent_path = repo_root / provenance["parent_path"]
                parent_value = _resolve_pointer(
                    _load_value(parent_path), provenance["parent_pointer"]
                )
                if (
                    not parent_path.is_file()
                    or _sha256(parent_path) != provenance["parent_sha256"]
                    or parent_value != provenance["value"]
                    or provenance.get("derivation_rule") != "exact-copy"
                    or provenance["value"]
                    not in {record.get("scene_id"), record.get("state_id")}
                ):
                    raise ValueError("parent binding differs")
            except (KeyError, OSError, TypeError, ValueError):
                _add(
                    findings,
                    "UNBOUND_SCENE_STATE_INHERITANCE",
                    "Inherited scope lacks an exact path/hash/pointer/value binding.",
                )
        if record.get("coverage_status") == "blocked-by-unknown" and record.get(
            "counts_as_resolved_coverage"
        ):
            _add(
                findings,
                "BLOCKED_UNKNOWN_COUNTED_AS_COVERAGE",
                "A blocked unknown is counted as resolved mechanic coverage.",
            )
        source_claim_id = record.get("source_claim_id")
        source_class = scope_classes.get(source_claim_id)
        resolved = (
            record.get("coverage_status") == "resolved"
            and record.get("counts_as_resolved_coverage") is True
        )
        if granularity == "game":
            if record.get("source_claim_scope") == "scene-state-ambiguous":
                _add(
                    findings,
                    "AMBIGUOUS_SCENE_DOWNGRADED_TO_GAME",
                    "An ambiguous scene-specific claim was counted as game-level.",
                )
            if (
                resolved
                and source_class != "explicit-game-package-global"
                and record.get("source_claim_scope") != "scene-state-ambiguous"
            ):
                _add(
                    findings,
                    "ARBITRARY_SCOPE_ASSIGNMENT",
                    "Game scope is not source-bound.",
                )
            if resolved:
                coverage.add((record["game_id"], None, None))
        elif granularity == "scene-state":
            if resolved and source_class not in {
                "direct-scene-state",
                "exact-parent-linked",
            }:
                _add(
                    findings,
                    "ARBITRARY_SCOPE_ASSIGNMENT",
                    "Scene/state scope is not source-bound.",
                )
            if resolved:
                coverage.add(
                    (record["game_id"], record.get("scene_id"), record.get("state_id"))
                )
        else:
            raise ValueError("unsupported coverage granularity")
        for field in record["derived_fields"]:
            if expected_record_contracts is not None and (
                set(field) - PRODUCTION_FIELD_KEYS
            ):
                _add(
                    findings,
                    "UNSUPPORTED_DECISION_FIELD",
                    "A production derived field contains undeclared decision fields.",
                )
            refs = set(field["upstream_claim_ids"])
            if (
                expected_output_role is not None
                and field.get("output_role") != expected_output_role
            ):
                _add(
                    findings,
                    "WRONG_OUTPUT_ROLE",
                    "A derived field is assigned to the wrong output role.",
                )
            if field.get("routing_disposition") not in {
                "phase1-mechanic",
                "phase1-effort",
            }:
                _add(
                    findings,
                    "DUPLICATED_FUTURE_HANDOFF",
                    "A deferred handoff was duplicated as a current derived field.",
                )
            if claim_output_roles is not None and any(
                claim_output_roles.get(claim_id) != expected_output_role
                for claim_id in refs
            ):
                _add(
                    findings,
                    "WRONG_ARTIFACT_CATEGORY",
                    "A claim is routed outside its evidence-category-owned output.",
                )
            if "value" not in field:
                _add(
                    findings,
                    "DIGEST_ONLY_DERIVED_VALUE",
                    "A derived field omits its readable canonical fact value.",
                )
            elif "value_sha256" not in field:
                _add(
                    findings,
                    "DERIVED_VALUE_DIGEST_MISSING",
                    "A readable current derived value omits its canonical digest.",
                )
            elif field["value_sha256"] != _canonical_digest(field["value"]):
                _add(
                    findings,
                    "DERIVED_VALUE_DIGEST_MISMATCH",
                    "A readable derived value differs from its digest.",
                )
            key = (record["record_id"], field["field_id"])
            if key in dependencies:
                _add(
                    findings,
                    "DUPLICATE_DERIVED_FIELD",
                    "A record/field identity collides.",
                )
            dependencies[key] = refs
            if not refs or not refs.issubset(claim_values):
                _add(
                    findings,
                    "MISSING_UPSTREAM_CLAIM",
                    "A derived field references an absent upstream claim.",
                )
            if field["derivation_rule"] not in ALLOWED_DERIVATION_RULES:
                _add(
                    findings,
                    "UNSUPPORTED_INFERRED_FACT",
                    "A mechanic or effort fact uses an inferred rule.",
                )
                continue
            try:
                selectors = field.get("upstream_selectors")
                if selectors is None:
                    if selectors_required:
                        _add(
                            findings,
                            "DERIVATION_SELECTOR_MISSING",
                            "A production derived field lacks exact claim value selectors.",
                        )
                        continue
                    values = [
                        claim_values[item] for item in field["upstream_claim_ids"]
                    ]
                else:
                    if [item["claim_id"] for item in selectors] != field[
                        "upstream_claim_ids"
                    ]:
                        raise ValueError("selector claim order differs")
                    if claim_value_pointers is not None and any(
                        item["pointer"] != claim_value_pointers.get(item["claim_id"])
                        for item in selectors
                    ):
                        _add(
                            findings,
                            "NONCANONICAL_VALUE_SELECTOR",
                            "A derived field selector differs from the canonical fact pointer.",
                        )
                        continue
                    if any(item["pointer"] == "" for item in selectors):
                        _add(
                            findings,
                            "WHOLE_CLAIM_ENVELOPE_COPY",
                            "A derived field attempts to copy a whole claim envelope.",
                        )
                        continue
                    values = [
                        _resolve_pointer(
                            claim_values[item["claim_id"]], item["pointer"]
                        )
                        for item in selectors
                    ]
                rule = field["derivation_rule"]
                if rule == "exact-copy":
                    valid = len(values) == 1 and field["value"] == values[0]
                elif rule == "set-union":
                    valid = set(field["value"]) == set().union(
                        *(set(item) for item in values)
                    )
                elif rule == "set-intersection":
                    expected = set(values[0]).intersection(
                        *(set(item) for item in values[1:])
                    )
                    valid = set(field["value"]) == expected
                elif rule == "explicit-comparison":
                    left, right = values
                    operator = field["comparison_operator"]
                    result = {
                        "eq": left == right,
                        "ne": left != right,
                        "gt": left > right,
                        "lt": left < right,
                    }[operator]
                    valid = field["value"] is result
                else:
                    valid = (
                        field["value"] is None
                        and record.get("coverage_status") == "blocked-by-unknown"
                    )
                if not valid:
                    raise ValueError("derivation differs")
            except (KeyError, TypeError, ValueError, IndexError):
                _add(
                    findings,
                    "DERIVATION_SEMANTIC_MISMATCH",
                    "A derivation does not recompute exactly.",
                )
    return coverage, dependencies


SOURCE_INDEX_KEYS = frozenset(
    {
        "schema_version",
        "phase0_bindings",
        "denominator",
        "terminal_leaves",
        "scope_audit",
        "source_artifacts",
        "upstream_claims",
    }
)
FACT_OUTPUT_KEYS = frozenset({"schema_version", "records"})
DEPENDENCY_OUTPUT_KEYS = frozenset(
    {"schema_version", "upstream_claims", "derived_fields", "edges"}
)
MAPPER_RECEIPT_KEYS = frozenset(
    {"agent_ref", "owner_role", "task_id", "dispatch_sha256", "output_hashes"}
)
PHASE0_BINDING_KEYS = frozenset(
    {
        "phase0_root_acceptance",
        "phase0_input_freeze",
        "phase0_source_registry",
        "phase0_game_identity_map",
        "phase1_role_dispatch",
    }
)
DENOMINATOR_KEYS = frozenset(
    {
        "accepted_game_ids",
        "game_ids_sha256",
        "resolvable_game_ids",
        "resolvable_game_ids_sha256",
        "explicit_omissions",
    }
)
OMISSION_KEYS = frozenset({"game_id", "reason", "status"})
TERMINAL_LEAF_KEYS = frozenset({"game_id", "path", "sha256"})
SOURCE_ARTIFACT_KEYS = frozenset({"document_id", "path", "sha256"})
SCOPE_AUDIT_KEYS = frozenset({"totals", "per_game"})
SCOPE_TOTAL_KEYS = frozenset(
    {
        "claims",
        "direct",
        "explicit_game_package_global",
        "exact_parent_linked",
        "ambiguous_blocked",
        "upstream_unknown",
    }
)
SCOPE_GAME_KEYS = frozenset(
    {
        "game_id",
        "total",
        "direct",
        "explicit_game_package_global",
        "exact_parent_linked",
        "ambiguous_blocked",
        "upstream_unknown",
    }
)
SOURCE_CLAIM_KEYS = frozenset(
    {
        "game_id",
        "claim_id",
        "terminal_document_id",
        "materialization_rule",
        "materialization_steps",
        "claim_sha256",
        "value_pointer",
        "value_sha256",
        "confidence",
        "scope_class",
        "scope_status",
        "factual_evidence_status",
        "routing_disposition",
        "future_owner_phase",
        "future_handoffs",
    }
)
MATERIALIZATION_STEP_KEYS = frozenset({"document_id", "pointer"})
SELECTOR_KEYS = frozenset({"claim_id", "pointer"})
DEPENDENCY_CLAIM_KEYS = frozenset(
    {
        "game_id",
        "claim_id",
        "routing_disposition",
        "future_owner_phase",
        "future_handoffs",
    }
)
DEPENDENCY_FIELD_KEYS = frozenset({"record_id", "field_id", "output_role"})
DEPENDENCY_EDGE_KEYS = frozenset(
    {"upstream_claim_id", "derived_record_id", "derived_field_id", "output_role"}
)
PROVENANCE_KEYS_BY_MODE = {
    "direct-exact-copy": frozenset(
        {
            "mode",
            "source_claim_id",
            "source_pointer",
            "value",
            "target_field",
            "derivation_rule",
        }
    ),
    "accepted-parent-exact-copy": frozenset(
        {
            "mode",
            "parent_path",
            "parent_sha256",
            "parent_pointer",
            "value",
            "target_field",
            "derivation_rule",
        }
    ),
    "explicit-game-level": frozenset({"mode", "source_claim_id", "derivation_rule"}),
    "accepted-placement-blocked": frozenset({"mode", "source_claim_id", "reason"}),
}


def _production_shape_violations(
    bundle: dict[str, dict[str, Any]],
) -> tuple[bool, bool]:
    """Returns extra-key and missing-key violations for every production shape."""
    source = bundle[MAPPER_OUTPUT_PATHS[0]]
    blueprints = bundle[MAPPER_OUTPUT_PATHS[1]]
    effort = bundle[MAPPER_OUTPUT_PATHS[2]]
    dependencies = bundle[MAPPER_OUTPUT_PATHS[3]]
    receipt = bundle[MAPPER_RECEIPT_PATH]
    has_extra = False
    has_missing = False

    def check(actual: dict[str, Any], required: frozenset[str] | set[str]) -> None:
        """Accumulates exact-key-set differences for one object."""
        nonlocal has_extra, has_missing
        actual_keys = set(actual)
        required_keys = set(required)
        has_extra = has_extra or bool(actual_keys - required_keys)
        has_missing = has_missing or bool(required_keys - actual_keys)

    check(source, SOURCE_INDEX_KEYS)
    check(blueprints, FACT_OUTPUT_KEYS)
    check(effort, FACT_OUTPUT_KEYS)
    check(dependencies, DEPENDENCY_OUTPUT_KEYS)
    check(receipt, MAPPER_RECEIPT_KEYS)
    check(source["phase0_bindings"], PHASE0_BINDING_KEYS)
    check(source["denominator"], DENOMINATOR_KEYS)
    check(source["scope_audit"], SCOPE_AUDIT_KEYS)
    check(source["scope_audit"]["totals"], SCOPE_TOTAL_KEYS)
    check(receipt["output_hashes"], set(MAPPER_OUTPUT_PATHS))
    for item in source["denominator"]["explicit_omissions"]:
        check(item, OMISSION_KEYS)
    for item in source["terminal_leaves"]:
        check(item, TERMINAL_LEAF_KEYS)
    for item in source["source_artifacts"]:
        check(item, SOURCE_ARTIFACT_KEYS)
    for item in source["scope_audit"]["per_game"]:
        check(item, SCOPE_GAME_KEYS)
    for claim in source["upstream_claims"]:
        check(claim, SOURCE_CLAIM_KEYS)
        for step in claim["materialization_steps"]:
            check(step, MATERIALIZATION_STEP_KEYS)
    for record in [*blueprints["records"], *effort["records"]]:
        check(record, PRODUCTION_RECORD_KEYS)
        provenance = record["scene_state_provenance"]
        required_provenance = PROVENANCE_KEYS_BY_MODE.get(provenance.get("mode"))
        if required_provenance is None:
            if "mode" in provenance:
                has_extra = True
            else:
                has_missing = True
        else:
            check(provenance, required_provenance)
        for field in record["derived_fields"]:
            check(field, PRODUCTION_FIELD_KEYS)
            for selector in field["upstream_selectors"]:
                check(selector, SELECTOR_KEYS)
    for item in dependencies["upstream_claims"]:
        check(item, DEPENDENCY_CLAIM_KEYS)
    for item in dependencies["derived_fields"]:
        check(item, DEPENDENCY_FIELD_KEYS)
    for item in dependencies["edges"]:
        check(item, DEPENDENCY_EDGE_KEYS)
    return has_extra, has_missing


def _verify_bundle(
    repo_root: Path,
    registry: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    expected_games: set[str],
    output_hashes: dict[str, str] | None = None,
    enforce_full_corpus: bool = False,
) -> tuple[list[Finding], int]:
    """Verifies one complete mapper bundle without authoring its decisions."""
    findings: list[Finding] = []
    checks = 0
    try:
        source_index = bundle[MAPPER_OUTPUT_PATHS[0]]
        blueprints = bundle[MAPPER_OUTPUT_PATHS[1]]
        effort = bundle[MAPPER_OUTPUT_PATHS[2]]
        dependencies = bundle[MAPPER_OUTPUT_PATHS[3]]
        mapper_receipt = bundle[MAPPER_RECEIPT_PATH]
        checks += 4
        if enforce_full_corpus:
            has_extra_shape, has_missing_shape = _production_shape_violations(bundle)
            if has_extra_shape:
                _add(
                    findings,
                    "UNSUPPORTED_DECISION_FIELD",
                    "A production mapper object has undeclared keys.",
                )
            if has_missing_shape:
                _add(
                    findings,
                    "MISSING_REQUIRED_DECISION_FIELD",
                    "A production mapper object omits explicit required keys.",
                )
        if any(
            len(json.dumps(bundle[path], separators=(",", ":")).encode("utf-8"))
            > MAX_REPORT_BYTES
            for path in MAPPER_OUTPUT_PATHS
        ):
            _add(
                findings,
                "PHASE1_OUTPUT_BUDGET_EXCEEDED",
                "A mapper output exceeds the frozen 1,048,576-byte ceiling.",
            )
        if not (
            source_index["schema_version"] == "apk-t9-phase1-source-resolution-index.v1"
            and blueprints["schema_version"] == "apk-t9-phase1-mechanic-blueprints.v1"
            and effort["schema_version"] == "apk-t9-phase1-developer-effort-baseline.v1"
            and dependencies["schema_version"] == "apk-t9-claim-dependency-graph.v1"
        ):
            raise ValueError("Phase 1 mapper schema version differs")
        expected_bindings = {
            "phase0_root_acceptance": ROOT_ACCEPTANCE_SHA256,
            "phase0_input_freeze": INPUT_FREEZE_SHA256,
            "phase0_source_registry": SOURCE_REGISTRY_SHA256,
            "phase0_game_identity_map": IDENTITY_MAP_SHA256,
            "phase1_role_dispatch": ROLE_DISPATCH_SHA256,
        }
        if any(
            source_index["phase0_bindings"].get(key) != value
            for key, value in expected_bindings.items()
        ) or not set(expected_bindings).issubset(source_index["phase0_bindings"]):
            raise ValueError("Phase 0 binding set differs")
        if _contains_generator_decision(bundle):
            _add(
                findings,
                "GENERATOR_AUTHORED_DECISION_FIELD",
                "A generator authored or selected a decision field.",
            )
        denominator = source_index["denominator"]
        actual_game_list = denominator["accepted_game_ids"]
        actual_games = set(actual_game_list)
        omitted_games = {item["game_id"] for item in denominator["explicit_omissions"]}
        denominator_matches = (
            actual_game_list == list(EXPECTED_GAME_IDS)
            and actual_games == expected_games == set(EXPECTED_GAME_IDS)
            and denominator.get("game_ids_sha256") == EXPECTED_GAME_IDS_SHA256
            and denominator.get("resolvable_game_ids")
            == list(EXPECTED_RESOLVABLE_GAME_IDS)
            and denominator.get("resolvable_game_ids_sha256")
            == EXPECTED_RESOLVABLE_GAME_IDS_SHA256
            and denominator["explicit_omissions"] == [CASTLE_OMISSION]
            and omitted_games == {"castle-defense"}
            and "required_game_scene_states" not in denominator
        )
        if not denominator_matches:
            _add(
                findings,
                "DENOMINATOR_MISMATCH",
                "The Phase 1 game denominator differs from accepted T2.",
            )
        source_audit = _source_scope_audit(repo_root)
        if source_index.get("terminal_leaves") != source_audit["terminal_leaves"]:
            _add(findings, "TERMINAL_LEAF_SET_MISMATCH", "Terminal leaf set differs.")
        expected_source_artifacts = _expected_source_artifacts()
        if (
            len(expected_source_artifacts) != MAX_SOURCE_RECORDS
            or source_index.get("source_artifacts") != expected_source_artifacts
        ):
            _add(
                findings,
                "SOURCE_ARTIFACT_BUDGET_OR_SET_MISMATCH",
                "Source materialization must bind the exact 32 accepted artifacts.",
            )
        if source_index.get("scope_audit") != _public_scope_audit(source_audit):
            _add(findings, "SOURCE_SCOPE_AUDIT_MISMATCH", "Claim scope audit differs.")
        scope_classes = {
            item["claim_id"]: item["scope_class"]
            for row in source_audit["per_game"]
            for item in row["claims"]
        }
        audit_claims = {
            (row["game_id"], item["claim_id"]): item
            for row in source_audit["per_game"]
            for item in row["claims"]
        }
        expected_effective = {
            (game_id, claim_id): materialized
            for game_id in EXPECTED_RESOLVABLE_GAME_IDS
            for claim_id, materialized in _effective_claims(
                repo_root, game_id, *TERMINAL_LEAVES[game_id]
            ).items()
        }
        claim_output_roles = {
            claim_id: _claim_output_role(item["claim"])
            for (_game_id, claim_id), item in expected_effective.items()
        }
        if enforce_full_corpus and any(
            _claim_routing(item["claim"])[0] == "unclassified"
            for item in expected_effective.values()
        ):
            _add(
                findings,
                "UNCLASSIFIED_ROUTING",
                "An accepted claim lacks a source-bound routing disposition.",
            )
        claim_value_pointers = {
            claim_id: _claim_fact_pointer(item["claim"])
            for (_game_id, claim_id), item in expected_effective.items()
        }
        expected_record_contracts = {
            (game_id, claim_id): {
                "game_id": game_id,
                "source_claim_id": claim_id,
                "record_type": (
                    "mechanic-fact"
                    if _claim_output_role(item["claim"]) == "mechanic-blueprint"
                    else "effort-fact"
                ),
                "output_role": _claim_output_role(item["claim"]),
                "owner_role": "mechanics-capability-mapper",
                "evidence_category_role": _claim_output_role(item["claim"]),
                **_record_scope_contract(
                    item["claim"], audit_claims[(game_id, claim_id)], claim_id
                ),
            }
            for (game_id, claim_id), item in expected_effective.items()
            if _claim_output_role(item["claim"]) is not None
        }
        if enforce_full_corpus and any(
            not any(
                game == game_id and claim_output_roles[claim_id] == "mechanic-blueprint"
                for (game, claim_id) in expected_effective
            )
            for game_id in EXPECTED_RESOLVABLE_GAME_IDS
        ):
            _add(
                findings,
                "MECHANIC_BLUEPRINT_GAME_COVERAGE_MISSING",
                "A resolvable game has no category-supported mechanic claim.",
            )
        sources = _claim_sources(registry)
        accepted_catalog_leaves: dict[str, dict[tuple[str, str], dict[str, Any]]] = {}
        for source_id, catalog_path in (
            ("t3-leaf-binding-catalog", T3_CATALOG_PATH),
            ("t4b-t6b-leaf-binding-catalog", COHORT_CATALOG_PATH),
        ):
            catalog = _load_json(repo_root / "measure/tracks" / TRACK_ID / catalog_path)
            accepted_catalog_leaves[source_id] = {
                (item["path"], item["sha256"]): item
                for item in catalog["leaf_bindings"]
            }
        claims = source_index["upstream_claims"]
        claim_ids = {claim["claim_id"] for claim in claims}
        claim_values = {
            claim_id: item["claim"]
            for (_game_id, claim_id), item in expected_effective.items()
        }
        if not enforce_full_corpus:
            claim_values.update(
                {
                    claim["claim_id"]: claim["value"]
                    for claim in claims
                    if "value" in claim
                }
            )
        claim_keys = [(claim.get("game_id"), claim.get("claim_id")) for claim in claims]
        if enforce_full_corpus:
            if (
                len(claims) != SCOPE_TOTALS[0]
                or len(set(claim_keys)) != SCOPE_TOTALS[0]
                or set(claim_keys) != set(expected_effective)
            ):
                _add(
                    findings,
                    "EFFECTIVE_CLAIM_SET_MISMATCH",
                    "The mapper claim set differs from the 1,248 effective claims.",
                )
        forbidden_prefixes = tuple(
            item["path_prefix"] for item in registry["forbidden_inputs"]
        )
        for claim in claims:
            terminal = TERMINAL_LEAVES.get(claim.get("game_id"))
            key = (claim.get("game_id"), claim.get("claim_id"))
            if enforce_full_corpus or "materialization_steps" in claim:
                expected_materialized = expected_effective.get(key)
                audit_claim = audit_claims.get(key)
                if expected_materialized is None or audit_claim is None:
                    _add(
                        findings,
                        "EFFECTIVE_CLAIM_SET_MISMATCH",
                        "A mapper claim is not in the materialized accepted corpus.",
                    )
                    continue
                document_ids = {
                    item["path"]: item["document_id"]
                    for item in expected_source_artifacts
                }
                expected_terminal = TERMINAL_LEAVES[claim["game_id"]]
                expected_steps = [
                    {
                        "document_id": document_ids[item["path"]],
                        "pointer": item["pointer"],
                    }
                    for item in expected_materialized["materialization_bindings"]
                ]
                exact_contract = (
                    claim.get("terminal_document_id")
                    == document_ids[expected_terminal[0]]
                    and claim.get("materialization_rule")
                    == expected_materialized["materialization_rule"]
                    and claim.get("materialization_steps") == expected_steps
                    and claim.get("claim_sha256")
                    == _canonical_digest(expected_materialized["claim"])
                    and claim.get("value_pointer")
                    == _claim_fact_pointer(expected_materialized["claim"])
                    and claim.get("value_sha256")
                    == _canonical_digest(
                        _claim_fact_value(expected_materialized["claim"])
                    )
                    and claim.get("confidence")
                    == expected_materialized["claim"].get("confidence")
                    and claim.get("scope_class") == audit_claim["scope_class"]
                    and claim.get("scope_status") == audit_claim["scope_status"]
                    and claim.get("factual_evidence_status")
                    == audit_claim["factual_evidence_status"]
                    and claim.get("routing_disposition")
                    == _claim_routing(expected_materialized["claim"])[0]
                    and claim.get("future_owner_phase")
                    == _claim_routing(expected_materialized["claim"])[1]
                    and tuple(claim.get("future_handoffs", []))
                    == _claim_routing(expected_materialized["claim"])[2]
                )
                if "primary_dispositions" in claim:
                    _add(
                        findings,
                        "MULTIPLE_ROUTING_DISPOSITIONS",
                        "A claim declares multiple incompatible primary dispositions.",
                    )
                if not exact_contract:
                    _add(
                        findings,
                        "EFFECTIVE_CLAIM_MATERIALIZATION_MISMATCH",
                        "A claim does not exactly reproduce its accepted materialization.",
                    )
                continue
            claimed_path = claim.get("source_path")
            if terminal is None or (
                claimed_path != terminal[0]
                and isinstance(claimed_path, str)
                and (repo_root / claimed_path).is_file()
                and not claimed_path.startswith(forbidden_prefixes)
            ):
                _add(
                    findings,
                    "INTERMEDIATE_CANDIDATE_LEAF",
                    "A claim terminates at an existing non-authoritative candidate.",
                )
            source = sources.get(claim["source_id"])
            if source is None:
                _add(
                    findings,
                    "MISSING_UPSTREAM_CLAIM",
                    "An upstream claim names an unaccepted source.",
                )
                continue
            source_path = claim["source_path"]
            if source_path.startswith(forbidden_prefixes):
                _add(
                    findings,
                    "FAILED_MONOLITH_CONTAMINATION",
                    "A failed-monolith path entered the live claim graph.",
                )
                continue
            try:
                chain = claim["resolution_chain"]
                first = chain[0]
                if first.get("binding_kind") != "accepted-root":
                    raise ValueError("chain lacks an accepted-root hop")
                if first.get("resolved_path") != source["path"]:
                    _add(
                        findings,
                        "INCORRECT_ARCHIVE_RELOCATION",
                        "The chain starts outside its accepted root.",
                    )
                if first.get("sha256") != source["sha256"]:
                    _add(
                        findings,
                        "STALE_EVIDENCE_HASH",
                        "The accepted-root digest differs.",
                    )
                last = chain[-1]
                if len(chain) < 2 or last.get("binding_kind") == "accepted-root":
                    raise ValueError("claim does not terminate at accepted leaf")
                catalog_leaves = accepted_catalog_leaves.get(claim["source_id"])
                if (
                    catalog_leaves is not None
                    and (last.get("resolved_path"), last.get("sha256"))
                    not in catalog_leaves
                ):
                    if any(
                        path == last.get("resolved_path")
                        for path, _digest in catalog_leaves
                    ):
                        _add(
                            findings,
                            "STALE_EVIDENCE_HASH",
                            "A catalog leaf path carries an unaccepted digest.",
                        )
                    else:
                        _add(
                            findings,
                            "INCORRECT_ARCHIVE_RELOCATION",
                            "A claim leaf is absent from its accepted catalog.",
                        )
                if last.get("resolved_path") != source_path:
                    _add(
                        findings,
                        "INCORRECT_ARCHIVE_RELOCATION",
                        "The chain ends outside its claimed source.",
                    )
                if last.get("sha256") != claim["source_sha256"]:
                    _add(
                        findings,
                        "STALE_EVIDENCE_HASH",
                        "The chain end digest differs from the claim.",
                    )
                previous_document: dict[str, Any] | None = None
                for index, binding in enumerate(chain):
                    resolved_path = binding["resolved_path"]
                    digest = binding["sha256"]
                    if resolved_path.startswith(forbidden_prefixes):
                        _add(
                            findings,
                            "FAILED_MONOLITH_CONTAMINATION",
                            "A failed-monolith path entered a resolution chain.",
                        )
                    if index:
                        kind = binding["binding_kind"]
                        digest_pointer = binding["sha256_pointer"]
                        if (
                            _resolve_pointer(
                                previous_document,
                                digest_pointer,
                            )
                            != digest
                        ):
                            raise ValueError("digest pointer does not bind hop")
                        if kind == "path-and-hash":
                            bound_path = binding["bound_path"]
                            if (
                                _resolve_pointer(
                                    previous_document,
                                    binding["path_pointer"],
                                )
                                != bound_path
                            ):
                                raise ValueError("path pointer does not bind hop")
                            if not _same_track_relocation(
                                bound_path,
                                resolved_path,
                            ):
                                _add(
                                    findings,
                                    "INCORRECT_ARCHIVE_RELOCATION",
                                    "A hop uses an arbitrary relocation.",
                                )
                        elif kind == "hash-only":
                            scan_anchor = (
                                resolved_path
                                if catalog_leaves is not None
                                else source["path"]
                            )
                            unique_path = _unique_digest_path(
                                repo_root,
                                scan_anchor,
                                digest,
                            )
                            if resolved_path != unique_path:
                                _add(
                                    findings,
                                    "INCORRECT_ARCHIVE_RELOCATION",
                                    "A hash-only hop is not uniquely resolved.",
                                )
                        else:
                            raise ValueError("unsupported chain binding kind")
                    actual_path = repo_root / resolved_path
                    if not actual_path.is_file():
                        _add(
                            findings,
                            "INCORRECT_ARCHIVE_RELOCATION",
                            "A resolution artifact is missing.",
                        )
                        continue
                    if _sha256(actual_path) != digest:
                        _add(
                            findings,
                            "STALE_EVIDENCE_HASH",
                            "A resolution-chain artifact has a stale hash.",
                        )
                    previous_document = _load_json(actual_path)
                if previous_document is None:
                    continue
                resolved = _resolve_pointer(
                    previous_document,
                    claim["source_pointer"],
                )
                if resolved != claim["value"]:
                    raise ValueError("claim value differs")
            except (KeyError, IndexError, TypeError, ValueError):
                resolution_codes = {
                    "INCORRECT_ARCHIVE_RELOCATION",
                    "STALE_EVIDENCE_HASH",
                    "FAILED_MONOLITH_CONTAMINATION",
                }
                if not any(item.code in resolution_codes for item in findings):
                    _add(
                        findings,
                        "UNSUPPORTED_INFERRED_FACT",
                        "A claim value does not resolve to accepted evidence.",
                    )
        blueprint_coverage, blueprint_fields = _record_fields(
            repo_root,
            blueprints["records"],
            claim_values,
            scope_classes,
            findings,
            selectors_required=enforce_full_corpus,
            expected_output_role="mechanic-blueprint",
            claim_output_roles=(claim_output_roles if enforce_full_corpus else None),
            claim_value_pointers=(
                claim_value_pointers if enforce_full_corpus else None
            ),
            expected_record_contracts=(
                expected_record_contracts if enforce_full_corpus else None
            ),
        )
        effort_coverage, effort_fields = _record_fields(
            repo_root,
            effort["records"],
            claim_values,
            scope_classes,
            findings,
            selectors_required=enforce_full_corpus,
            expected_output_role="developer-effort",
            claim_output_roles=(claim_output_roles if enforce_full_corpus else None),
            claim_value_pointers=(
                claim_value_pointers if enforce_full_corpus else None
            ),
            expected_record_contracts=(
                expected_record_contracts if enforce_full_corpus else None
            ),
        )
        if not enforce_full_corpus and blueprint_coverage != effort_coverage:
            _add(
                findings,
                "GAME_SCENE_STATE_LOSS",
                "Resolved source-derived mechanic and effort coverage differs.",
            )
        all_records = [*blueprints["records"], *effort["records"]]
        if enforce_full_corpus:
            expected_current_records = Counter(
                (game_id, claim_id, contract["output_role"])
                for (game_id, claim_id), contract in expected_record_contracts.items()
            )
            actual_current_records = Counter(
                (
                    record.get("game_id"),
                    record.get("source_claim_id"),
                    record.get("output_role"),
                )
                for record in all_records
            )
            canonical_fields = all(
                record.get("record_id")
                == f"{record.get('game_id')}:{record.get('source_claim_id')}"
                and len(record.get("derived_fields", [])) == 1
                and record["derived_fields"][0].get("field_id") == "fact"
                and record["derived_fields"][0].get("upstream_claim_ids")
                == [record.get("source_claim_id")]
                for record in all_records
            )
            if (
                actual_current_records != expected_current_records
                or not canonical_fields
            ):
                _add(
                    findings,
                    "CURRENT_CLAIM_RECORD_CARDINALITY_MISMATCH",
                    "Current claims must map one-to-one to canonical records and fields.",
                )
        all_fields = blueprint_fields | effort_fields
        field_roles = {
            (record["record_id"], field["field_id"]): field.get("output_role")
            for output in (blueprints, effort)
            for record in output["records"]
            for field in record["derived_fields"]
        }
        incoming: dict[tuple[str, str], set[str]] = {
            field: set() for field in all_fields
        }
        for edge in dependencies["edges"]:
            key = (edge["derived_record_id"], edge["derived_field_id"])
            if (
                key not in all_fields
                or edge["upstream_claim_id"] not in claim_ids
                or edge.get("output_role")
                not in {"mechanic-blueprint", "developer-effort"}
                or edge.get("output_role") != field_roles.get(key)
            ):
                _add(
                    findings,
                    "GHOST_DEPENDENCY_EDGE",
                    "A dependency edge names no live endpoint.",
                )
            incoming.setdefault(key, set()).add(edge["upstream_claim_id"])
        if enforce_full_corpus:
            expected_dependency_claims = Counter(
                (game_id, claim_id, *_claim_routing(item["claim"]))
                for (game_id, claim_id), item in expected_effective.items()
            )
            actual_dependency_claims = Counter(
                (
                    item.get("game_id"),
                    item.get("claim_id"),
                    item.get("routing_disposition"),
                    item.get("future_owner_phase"),
                    tuple(item.get("future_handoffs", [])),
                )
                for item in dependencies["upstream_claims"]
            )
            if actual_dependency_claims != expected_dependency_claims:
                _add(
                    findings,
                    "DEPENDENCY_ROUTING_DISPOSITION_MISMATCH",
                    "Dependency claims lack an exact cardinality-preserving disposition.",
                )
        live_dependency_fields = Counter(
            (record["record_id"], field["field_id"], field.get("output_role"))
            for record in all_records
            for field in record["derived_fields"]
        )
        graph_dependency_fields = Counter(
            (item.get("record_id"), item.get("field_id"), item.get("output_role"))
            for item in dependencies["derived_fields"]
        )
        live_field_roles = {
            (record["record_id"], field["field_id"]): field.get("output_role")
            for record in all_records
            for field in record["derived_fields"]
        }
        if any(
            item.get("output_role")
            != live_field_roles.get((item.get("record_id"), item.get("field_id")))
            for item in dependencies["derived_fields"]
        ):
            _add(
                findings,
                "WRONG_OUTPUT_ROLE",
                "A dependency field role differs from its live artifact field role.",
            )
        expected_edges = Counter(
            (
                claim_id,
                record["record_id"],
                field["field_id"],
                field.get("output_role"),
            )
            for record in all_records
            for field in record["derived_fields"]
            for claim_id in field["upstream_claim_ids"]
        )
        actual_edges = Counter(
            (
                edge.get("upstream_claim_id"),
                edge.get("derived_record_id"),
                edge.get("derived_field_id"),
                edge.get("output_role"),
            )
            for edge in dependencies["edges"]
        )
        if (
            graph_dependency_fields != live_dependency_fields
            or actual_edges != expected_edges
        ):
            _add(
                findings,
                "INCOMPLETE_DEPENDENCY_SET",
                "The dependency graph must preserve exact field and edge multisets.",
            )
        used_claims = set().union(*all_fields.values()) if all_fields else set()
        required_current_claims = (
            {
                claim_id
                for claim_id, role in claim_output_roles.items()
                if role is not None
            }
            if enforce_full_corpus
            else claim_ids
        )
        if required_current_claims - used_claims:
            _add(
                findings,
                "ORPHAN_UPSTREAM_CLAIM",
                "A current Phase 1 claim has no dependency endpoint.",
            )
        expected_hashes = output_hashes or {
            path: hashlib.sha256(
                json.dumps(bundle[path], sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
            for path in MAPPER_OUTPUT_PATHS
        }
        if not (
            mapper_receipt.get("agent_ref")
            == "/root/phase5_review_a/t9_phase0_final_reviewer"
            and mapper_receipt.get("owner_role") == "mechanics-capability-mapper"
            and mapper_receipt.get("task_id") == "phase1-map-mechanics-and-effort"
            and mapper_receipt.get("dispatch_sha256") == ROLE_DISPATCH_SHA256
            and all(
                mapper_receipt.get("output_hashes", {}).get(path) == digest
                for path, digest in expected_hashes.items()
            )
            and set(expected_hashes).issubset(mapper_receipt.get("output_hashes", {}))
        ):
            _add(
                findings,
                "STALE_MAPPER_RECEIPT",
                "Mapper receipt or output hashes differ.",
            )
        checks += 12 + len(claims) + len(all_fields)
    except (
        KeyError,
        OSError,
        StopIteration,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ):
        _add(
            findings,
            "INVALID_PHASE1_OUTPUT_SCHEMA",
            "The Phase 1 mapper bundle does not satisfy its truth contract.",
        )
    findings.sort(key=lambda item: item.code)
    return findings, checks


def _canonical_fixture_bundle(
    repo_root: Path,
    registry: dict[str, Any],
) -> tuple[dict[str, dict[str, Any]], set[str]]:
    """Builds a small decision-free valid bundle for counterexamples."""
    sources = _claim_sources(registry)
    games = set(EXPECTED_GAME_IDS)
    states = [{"game_id": "village-guardian", "scene_id": "catalog", "state_id": None}]
    claim_specs = [
        {
            "claim_id": "VG3-ID-001",
            "game_id": "village-guardian",
            "source_id": "t4b-t6b-leaf-binding-catalog",
            "leaf_index": 0,
            "binding_kind": "path-and-hash",
            "source_pointer": "/claims/0/scene_or_state_id",
            "value": "catalog",
        },
    ]
    claims = []
    for spec in claim_specs:
        source = sources[spec["source_id"]]
        catalog = _load_json(repo_root / source["path"])
        leaf = catalog["leaf_bindings"][spec["leaf_index"]]
        hop = {
            "binding_kind": spec["binding_kind"],
            "resolved_path": leaf["path"],
            "sha256": leaf["sha256"],
            "sha256_pointer": f"/leaf_bindings/{spec['leaf_index']}/sha256",
        }
        if spec["binding_kind"] == "path-and-hash":
            hop["bound_path"] = leaf["path"]
            hop["path_pointer"] = f"/leaf_bindings/{spec['leaf_index']}/path"
        claims.append(
            {
                "claim_id": spec["claim_id"],
                "game_id": spec["game_id"],
                "source_id": spec["source_id"],
                "source_path": leaf["path"],
                "source_sha256": leaf["sha256"],
                "resolution_chain": [
                    {
                        "binding_kind": "accepted-root",
                        "resolved_path": source["path"],
                        "sha256": source["sha256"],
                    },
                    hop,
                ],
                "source_pointer": spec["source_pointer"],
                "value": spec["value"],
            }
        )

    def records(kind: str, claim_id: str, value: str) -> list[dict[str, Any]]:
        """Builds synthetic records for one mapper output."""
        return [
            {
                "record_id": f"{kind}.{item['game_id']}",
                "record_type": (
                    "mechanic-fact" if kind == "mechanic" else "effort-fact"
                ),
                "output_role": (
                    "mechanic-blueprint" if kind == "mechanic" else "developer-effort"
                ),
                "owner_role": "mechanics-capability-mapper",
                "evidence_category_role": (
                    "mechanic-blueprint" if kind == "mechanic" else "developer-effort"
                ),
                "coverage_status": "resolved",
                "counts_as_resolved_coverage": True,
                "coverage_granularity": "scene-state",
                "scene_state_provenance": {"mode": "direct-explicit"},
                "source_claim_id": claim_id,
                **item,
                "derived_fields": [
                    {
                        "field_id": f"{kind}.acceptance",
                        "output_role": (
                            "mechanic-blueprint"
                            if kind == "mechanic"
                            else "developer-effort"
                        ),
                        "value": value,
                        "value_sha256": _canonical_digest(value),
                        "routing_disposition": (
                            "phase1-mechanic" if kind == "mechanic" else "phase1-effort"
                        ),
                        "upstream_claim_ids": [claim_id],
                        "derivation_rule": "exact-copy",
                    }
                ],
            }
            for item in states
        ]

    blueprint_records = records(
        "mechanic",
        "VG3-ID-001",
        "catalog",
    )
    effort_records = records(
        "effort",
        "VG3-ID-001",
        "catalog",
    )
    derived_fields = []
    edges = []
    for record in [*blueprint_records, *effort_records]:
        for field in record["derived_fields"]:
            derived_fields.append(
                {
                    "record_id": record["record_id"],
                    "field_id": field["field_id"],
                    "output_role": field["output_role"],
                }
            )
            edges.append(
                {
                    "upstream_claim_id": field["upstream_claim_ids"][0],
                    "derived_record_id": record["record_id"],
                    "derived_field_id": field["field_id"],
                    "output_role": field["output_role"],
                }
            )
    bundle = {
        MAPPER_OUTPUT_PATHS[0]: {
            "schema_version": "apk-t9-phase1-source-resolution-index.v1",
            "phase0_bindings": {
                "phase0_root_acceptance": ROOT_ACCEPTANCE_SHA256,
                "phase0_input_freeze": INPUT_FREEZE_SHA256,
                "phase0_source_registry": SOURCE_REGISTRY_SHA256,
                "phase0_game_identity_map": IDENTITY_MAP_SHA256,
                "phase1_role_dispatch": ROLE_DISPATCH_SHA256,
            },
            "denominator": {
                "accepted_game_ids": list(EXPECTED_GAME_IDS),
                "game_ids_sha256": EXPECTED_GAME_IDS_SHA256,
                "resolvable_game_ids": list(EXPECTED_RESOLVABLE_GAME_IDS),
                "resolvable_game_ids_sha256": EXPECTED_RESOLVABLE_GAME_IDS_SHA256,
                "explicit_omissions": [CASTLE_OMISSION],
            },
            "terminal_leaves": _source_scope_audit(repo_root)["terminal_leaves"],
            "scope_audit": _public_scope_audit(_source_scope_audit(repo_root)),
            "source_artifacts": _expected_source_artifacts(),
            "upstream_claims": claims,
        },
        MAPPER_OUTPUT_PATHS[1]: {
            "schema_version": "apk-t9-phase1-mechanic-blueprints.v1",
            "records": blueprint_records,
        },
        MAPPER_OUTPUT_PATHS[2]: {
            "schema_version": ("apk-t9-phase1-developer-effort-baseline.v1"),
            "records": effort_records,
        },
        MAPPER_OUTPUT_PATHS[3]: {
            "schema_version": "apk-t9-claim-dependency-graph.v1",
            "upstream_claims": [
                {
                    "claim_id": claim["claim_id"],
                    "source_track": claim["source_id"],
                    "accepted_manifest_sha256": claim["source_sha256"],
                }
                for claim in claims
            ],
            "derived_fields": derived_fields,
            "edges": edges,
        },
    }
    output_hashes = {
        path: hashlib.sha256(
            json.dumps(bundle[path], sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        for path in MAPPER_OUTPUT_PATHS
    }
    bundle[MAPPER_RECEIPT_PATH] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "mechanics-capability-mapper",
        "task_id": "phase1-map-mechanics-and-effort",
        "dispatch_sha256": ROLE_DISPATCH_SHA256,
        "output_hashes": output_hashes,
    }
    return bundle, games


def _refresh_fixture_receipt(bundle: dict[str, dict[str, Any]]) -> None:
    """Refreshes synthetic receipt hashes after a bounded fixture mutation."""
    bundle[MAPPER_RECEIPT_PATH]["output_hashes"] = {
        path: hashlib.sha256(
            json.dumps(bundle[path], sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        for path in MAPPER_OUTPUT_PATHS
    }


def _apply_fixture(
    bundle: dict[str, dict[str, Any]],
    fixture: dict[str, Any],
    repo_root: Path | None = None,
) -> None:
    """Applies one bounded counterexample mutation."""
    operation = fixture["mutation"]["operation"]
    source_index = bundle[MAPPER_OUTPUT_PATHS[0]]
    blueprints = bundle[MAPPER_OUTPUT_PATHS[1]]
    effort = bundle[MAPPER_OUTPUT_PATHS[2]]
    dependencies = bundle[MAPPER_OUTPUT_PATHS[3]]

    def current_record(claim_id: str | None = None) -> dict[str, Any]:
        """Finds one current record in the bounded fixture bundle."""
        records = [*blueprints["records"], *effort["records"]]
        if claim_id is None:
            return records[0]
        return next(
            record for record in records if record.get("source_claim_id") == claim_id
        )

    if operation == "unknown-shape-all-surfaces":
        source_index["unsupported_fact"] = "fabricated"
        source_index["phase0_bindings"]["unsupported_fact"] = "fabricated"
        source_index["denominator"]["unsupported_fact"] = "fabricated"
        source_index["upstream_claims"][0]["unsupported_fact"] = "fabricated"
        blueprints["unsupported_fact"] = "fabricated"
        effort["unsupported_fact"] = "fabricated"
        dependencies["unsupported_fact"] = "fabricated"
        dependencies["upstream_claims"][0]["unsupported_fact"] = "fabricated"
        dependencies["derived_fields"][0]["unsupported_fact"] = "fabricated"
        dependencies["edges"][0]["unsupported_fact"] = "fabricated"
        record = current_record()
        record["derived_fields"][0]["upstream_selectors"][0]["unsupported_fact"] = (
            "fabricated"
        )
        record["scene_state_provenance"]["unsupported_fact"] = "fabricated"
        _refresh_fixture_receipt(bundle)
        bundle[MAPPER_RECEIPT_PATH]["unsupported_fact"] = "fabricated"
        bundle[MAPPER_RECEIPT_PATH]["output_hashes"]["unsupported_fact"] = "fabricated"
    elif operation == "missing-required-null-empty-keys":
        nullable_record = next(
            record
            for record in [*blueprints["records"], *effort["records"]]
            if record.get("scene_id") is None and record.get("state_id") is None
        )
        del nullable_record["scene_id"]
        del nullable_record["state_id"]
        nullable_claim = next(
            claim
            for claim in source_index["upstream_claims"]
            if claim.get("confidence") is None
            and claim.get("future_owner_phase") is None
            and claim.get("future_handoffs") == []
        )
        del nullable_claim["confidence"]
        del nullable_claim["future_owner_phase"]
        del nullable_claim["future_handoffs"]
        dependency_claim = next(
            claim
            for claim in dependencies["upstream_claims"]
            if claim.get("future_owner_phase") is None
            and claim.get("future_handoffs") == []
        )
        del dependency_claim["future_owner_phase"]
        del dependency_claim["future_handoffs"]
    elif operation == "renamed-canonical-record-id":
        record = current_record()
        previous = record["record_id"]
        renamed = "arbitrary-but-unique-record-id"
        record["record_id"] = renamed
        for field in dependencies["derived_fields"]:
            if field["record_id"] == previous:
                field["record_id"] = renamed
        for edge in dependencies["edges"]:
            if edge["derived_record_id"] == previous:
                edge["derived_record_id"] = renamed
    elif operation == "missing-record-provenance":
        current_record(fixture["mutation"].get("claim_id"))[
            "scene_state_provenance"
        ] = {}
    elif operation == "fabricated-direct-scene-state":
        current_record(fixture["mutation"].get("claim_id"))["scene_id"] = (
            "fabricated-but-nongeneric-scene"
        )
    elif operation == "blocked-nonnull-placement":
        current_record(fixture["mutation"].get("claim_id"))["scene_id"] = (
            "fabricated-blocked-scene"
        )
    elif operation == "explicit-game-nonnull-placement":
        current_record(fixture["mutation"].get("claim_id"))["scene_id"] = (
            "fabricated-game-scene"
        )
    elif operation == "wrong-record-game":
        current_record(fixture["mutation"].get("claim_id"))["game_id"] = "wrong-game"
    elif operation == "duplicate-dependency-claim":
        dependencies["upstream_claims"].append(
            copy.deepcopy(dependencies["upstream_claims"][0])
        )
    elif operation == "duplicate-dependency-field-row":
        dependencies["derived_fields"].append(
            copy.deepcopy(dependencies["derived_fields"][0])
        )
    elif operation == "duplicate-dependency-edge":
        dependencies["edges"].append(copy.deepcopy(dependencies["edges"][0]))
    elif operation == "dependency-field-role-swap":
        field = dependencies["derived_fields"][0]
        field["output_role"] = (
            "developer-effort"
            if field["output_role"] == "mechanic-blueprint"
            else "mechanic-blueprint"
        )
    elif operation == "duplicate-current-record":
        original = current_record()
        duplicate = copy.deepcopy(original)
        duplicate["record_id"] = f"{original['record_id']}:copy"
        target = (
            blueprints if original["output_role"] == "mechanic-blueprint" else effort
        )
        target["records"].append(duplicate)
        field = duplicate["derived_fields"][0]
        dependencies["derived_fields"].append(
            {
                "record_id": duplicate["record_id"],
                "field_id": field["field_id"],
                "output_role": field["output_role"],
            }
        )
        dependencies["edges"].append(
            {
                "upstream_claim_id": field["upstream_claim_ids"][0],
                "derived_record_id": duplicate["record_id"],
                "derived_field_id": field["field_id"],
                "output_role": field["output_role"],
            }
        )
    elif operation == "missing-value-digest":
        del current_record()["derived_fields"][0]["value_sha256"]
    elif operation == "unsupported-record-field":
        current_record()["unsupported_mechanic_fact"] = "fabricated"
    elif operation == "unsupported-derived-field":
        current_record()["derived_fields"][0]["unsupported_fact"] = "fabricated"
    elif operation == "unsupported-provenance-field":
        current_record(fixture["mutation"].get("claim_id"))["scene_state_provenance"][
            "unsupported_fact"
        ] = "fabricated"
    elif operation == "remove-upstream-claim":
        source_index["upstream_claims"][0]["source_id"] = "missing-source"
    elif operation == "change-denominator":
        source_index["denominator"]["accepted_game_ids"].append("fabricated-game")
    elif operation == "count-preserving-set-swap":
        source_index["denominator"]["accepted_game_ids"][0] = "fabricated-game"
    elif operation == "castle-omission-loss":
        source_index["denominator"]["explicit_omissions"] = []
    elif operation == "castle-fabricated-scene-state":
        source_index["denominator"].setdefault("required_game_scene_states", []).append(
            {
                "game_id": "castle-defense",
                "scene_id": "fabricated-scene",
                "state_id": "fabricated-state",
            }
        )
    elif operation == "fabricated-default-scene-state":
        blueprints["records"][0]["scene_id"] = "main"
        bundle[MAPPER_OUTPUT_PATHS[2]]["records"][0]["scene_id"] = "main"
    elif operation == "unbound-scene-state-inheritance":
        blueprints["records"][0]["scene_state_provenance"] = {
            "mode": "accepted-parent-exact-copy"
        }
    elif operation == "blocked-unknown-counted-as-coverage":
        for output in (blueprints, bundle[MAPPER_OUTPUT_PATHS[2]]):
            output["records"][0]["coverage_status"] = "blocked-by-unknown"
            output["records"][0]["counts_as_resolved_coverage"] = True
    elif operation == "ambiguous-scene-downgraded-to-game":
        for output in (blueprints, bundle[MAPPER_OUTPUT_PATHS[2]]):
            record = output["records"][0]
            record["coverage_granularity"] = "game"
            record["source_claim_scope"] = "scene-state-ambiguous"
    elif operation == "remove-game-scene-state":
        removed = blueprints["records"].pop()
        record_id = removed["record_id"]
        dependencies["derived_fields"] = [
            item
            for item in dependencies["derived_fields"]
            if item["record_id"] != record_id
        ]
        dependencies["edges"] = [
            item
            for item in dependencies["edges"]
            if item["derived_record_id"] != record_id
        ]
    elif operation == "stale-evidence-hash":
        claim = source_index["upstream_claims"][0]
        claim["source_sha256"] = "0" * 64
    elif operation == "incorrect-archive-relocation":
        wrong_path = "measure/archive/wrong-track/accepted.json"
        claim = source_index["upstream_claims"][0]
        claim["source_path"] = wrong_path
        claim["resolution_chain"][-1]["resolved_path"] = wrong_path
    elif operation == "pointer-drift":
        source_index["upstream_claims"][0]["resolution_chain"][-1]["path_pointer"] = (
            "/leaf_bindings/1/path"
        )
    elif operation == "hash-only-resolution":
        source_index["upstream_claims"][0]["resolution_chain"][-1]["resolved_path"] = (
            "measure/archive/apk_three_game_truth_pilot_20260712/missing.json"
        )
    elif operation == "failed-monolith-contamination":
        source_index["upstream_claims"][0]["source_path"] = (
            "measure/archive/apk_cross_game_asset_ontology_20260712/failed-output.json"
        )
    elif operation == "unsupported-inferred-fact":
        blueprints["records"][0]["derived_fields"][0]["derivation_rule"] = "inferred"
    elif operation == "incomplete-dependency-set":
        dependencies["edges"].pop()
    elif operation == "generator-authored-decision":
        blueprints["records"][0]["derived_fields"][0]["generator_selected_value"] = (
            "synthetic-mechanic"
        )
    elif operation == "blocked-count-false":
        record = blueprints["records"][0]
        record["coverage_status"] = "blocked-by-unknown"
        record["counts_as_resolved_coverage"] = False
    elif operation == "arbitrary-scope":
        for output in (blueprints, bundle[MAPPER_OUTPUT_PATHS[2]]):
            output["records"][0]["coverage_granularity"] = "game"
    elif operation == "factual-scope-status-conflation":
        for output in (blueprints, bundle[MAPPER_OUTPUT_PATHS[2]]):
            record = output["records"][0]
            record["scope_status"] = "blocked-by-unknown-scene-state"
            record["factual_evidence_status"] = "unknown"
    elif (
        operation.startswith("invalid-parent-") or operation == "hardcoded-parent-link"
    ):
        record = blueprints["records"][0]
        record["scene_state_provenance"] = {
            "mode": "accepted-parent-exact-copy",
            "parent_path": PARENT_BLUEPRINT_PATH,
            "parent_sha256": PARENT_BLUEPRINT_SHA256,
            "parent_pointer": "/games/dragon-flight/A_scene_state_blueprint/states/0/state_id",
            "value": record["scene_id"],
            "derivation_rule": "exact-copy",
        }
        fault = operation.removeprefix("invalid-parent-")
        if fault == "path" or operation == "hardcoded-parent-link":
            record["scene_state_provenance"]["parent_path"] = "missing-parent.json"
        elif fault == "hash":
            record["scene_state_provenance"]["parent_sha256"] = "0" * 64
        elif fault == "pointer":
            record["scene_state_provenance"]["parent_pointer"] = "/missing"
        elif fault == "value":
            record["scene_state_provenance"]["value"] = "wrong"
    elif operation == "exact-copy-mismatch":
        blueprints["records"][0]["derived_fields"][0]["value"] = "wrong"
    elif operation == "set-semantic-mismatch":
        field = blueprints["records"][0]["derived_fields"][0]
        field["derivation_rule"] = fixture["mutation"].get("rule", "set-union")
        field["value"] = []
    elif operation == "orphan-claim":
        orphan = dict(source_index["upstream_claims"][0])
        orphan["claim_id"] = "ORPHAN-001"
        source_index["upstream_claims"].append(orphan)
    elif operation == "ghost-edge":
        dependencies["edges"].append(
            {
                "upstream_claim_id": "VG3-ID-001",
                "derived_record_id": "ghost",
                "derived_field_id": "ghost",
            }
        )
    elif operation == "duplicate-field":
        blueprints["records"][0]["derived_fields"].append(
            dict(blueprints["records"][0]["derived_fields"][0])
        )
    elif operation == "wrong-output-subtype":
        blueprints["records"][0]["record_type"] = "effort-fact"
    elif operation == "swapped-output-role":
        blueprints["records"][0]["output_role"] = "developer-effort"
    elif operation == "wrong-edge-role":
        dependencies["edges"][0]["output_role"] = "developer-effort"
    elif operation == "wrong-artifact-category":
        blueprints["records"][0]["evidence_category_role"] = "developer-effort"
    elif operation == "whole-envelope-copy":
        field = blueprints["records"][0]["derived_fields"][0]
        field["upstream_selectors"] = [{"claim_id": "VG3-ID-001", "pointer": ""}]
    elif operation == "digest-only-value":
        del blueprints["records"][0]["derived_fields"][0]["value"]
    elif operation == "value-digest-mismatch":
        blueprints["records"][0]["derived_fields"][0]["value_sha256"] = "0" * 64
    elif operation == "handoff-duplicated-field":
        blueprints["records"][0]["derived_fields"][0]["routing_disposition"] = (
            "deferred-asset"
        )
    elif operation == "wrong-owner":
        blueprints["records"][0]["owner_role"] = "truth-test-author"
    elif operation in {"stale-mapper-receipt", "stale-output-hash"}:
        bundle[MAPPER_RECEIPT_PATH]["output_hashes"][MAPPER_OUTPUT_PATHS[0]] = "0" * 64
    elif operation == "source-record-overflow":
        source_index["source_artifacts"].append(
            {"document_id": "s32", "path": "extra.json", "sha256": "0" * 64}
        )
    elif operation == "intermediate-candidate-leaf":
        catalog = _load_json(
            repo_root / "measure/tracks" / TRACK_ID / COHORT_CATALOG_PATH
        )
        leaf = catalog["leaf_bindings"][1]
        claim = source_index["upstream_claims"][0]
        claim["source_path"] = leaf["path"]
        claim["source_sha256"] = leaf["sha256"]
        claim["resolution_chain"][-1]["resolved_path"] = leaf["path"]
        claim["resolution_chain"][-1]["sha256"] = leaf["sha256"]
        claim["resolution_chain"][-1]["bound_path"] = leaf["path"]
        claim["resolution_chain"][-1]["path_pointer"] = "/leaf_bindings/1/path"
        claim["resolution_chain"][-1]["sha256_pointer"] = "/leaf_bindings/1/sha256"
    elif operation == "comparison-semantic-mismatch":
        field = blueprints["records"][0]["derived_fields"][0]
        field["derivation_rule"] = "explicit-comparison"
        field["upstream_claim_ids"] = ["VG3-ID-001", "VG3-ID-001"]
        field["comparison_operator"] = "eq"
        field["value"] = False
        field["value_sha256"] = _canonical_digest(False)
        dependencies["edges"].append(dict(dependencies["edges"][0]))
    elif operation == "output-budget-overflow":
        source_index["budget_overflow_padding"] = "x" * (MAX_REPORT_BYTES + 1)
    elif operation == "normalized-materialization-fault":
        if repo_root is None:
            raise ValueError("repo root required for materialization fixture")
        game_id = fixture["mutation"].get("game_id", "village-guardian")
        claim_id = fixture["mutation"].get("claim_id", "VG3-ID-001")
        materialized = _effective_claims(repo_root, game_id, *TERMINAL_LEAVES[game_id])[
            claim_id
        ]
        documents = {
            item["path"]: item["document_id"] for item in _expected_source_artifacts()
        }
        audit = _source_scope_audit(repo_root)
        audit_claim = next(
            item
            for row in audit["per_game"]
            if row["game_id"] == game_id
            for item in row["claims"]
            if item["claim_id"] == claim_id
        )
        claim: dict[str, Any] = {}
        claim.update(
            {
                "game_id": game_id,
                "claim_id": claim_id,
                "terminal_document_id": documents[TERMINAL_LEAVES[game_id][0]],
                "materialization_rule": materialized["materialization_rule"],
                "materialization_steps": [
                    {"document_id": documents[item["path"]], "pointer": item["pointer"]}
                    for item in materialized["materialization_bindings"]
                ],
                "claim_sha256": _canonical_digest(materialized["claim"]),
                "value_pointer": _claim_fact_pointer(materialized["claim"]),
                "value_sha256": _canonical_digest(
                    _claim_fact_value(materialized["claim"])
                ),
                "confidence": materialized["claim"].get("confidence"),
                "scope_class": audit_claim["scope_class"],
                "scope_status": audit_claim["scope_status"],
                "factual_evidence_status": audit_claim["factual_evidence_status"],
                "routing_disposition": _claim_routing(materialized["claim"])[0],
                "future_owner_phase": _claim_routing(materialized["claim"])[1],
                "future_handoffs": list(_claim_routing(materialized["claim"])[2]),
            }
        )
        source_index["upstream_claims"].append(claim)
        fault = fixture["mutation"]["fault"]
        if fault in {"missing-base", "wrong-supplying-binding"}:
            claim["materialization_steps"] = claim["materialization_steps"][1:]
        elif fault == "base-hash":
            source_index["source_artifacts"][0]["sha256"] = "0" * 64
        elif fault in {"base-pointer", "base-pointer-terminal-mismatch"}:
            claim["materialization_steps"][0]["pointer"] = "/missing"
        elif fault in {"overlay-order", "overlay-override"}:
            claim["materialization_steps"].reverse()
        elif fault == "duplicate-retained-replacement":
            claim["claim_id"] = "DR-ASSET-001"
        elif fault == "governing-row-as-claim":
            claim["claim_id"] = "SZ-GOVERNING-ROW"
        elif fault == "provenance-routing-override":
            claim["routing_disposition"] = "phase1-effort"
        elif fault == "unsupported-category":
            claim["claim_id"] = "UNSUPPORTED-CATEGORY-001"
        elif fault == "asset-workflow-deferred":
            claim["routing_disposition"] = "deferred-asset"
            claim["future_owner_phase"] = "phase2-asset-ontology"
            claim["future_handoffs"] = []
        elif fault == "asset-content-effort":
            claim["routing_disposition"] = "phase1-effort"
            claim["future_owner_phase"] = None
        elif fault == "duplicate-primary-routing":
            claim["primary_dispositions"] = [
                claim["routing_disposition"],
                "phase1-effort",
            ]
    else:
        raise ValueError(f"Unknown fixture mutation: {operation}")
    if operation not in {
        "stale-mapper-receipt",
        "stale-output-hash",
        "unknown-shape-all-surfaces",
    }:
        _refresh_fixture_receipt(bundle)


def _load_bound_fixture(
    track_root: Path,
    fixture_path: Path,
) -> dict[str, Any]:
    """Loads one fixture only when its manifest binding is exact."""
    manifest = _load_json(track_root / FIXTURE_MANIFEST_PATH)
    if (
        manifest.get("fixture_count") != len(manifest.get("fixtures", []))
        or len(manifest.get("fixtures", [])) > MAX_NEGATIVE_FIXTURES
    ):
        raise ValueError("fixture manifest exceeds frozen budget")
    relative_path = fixture_path.resolve().relative_to(track_root.resolve())
    binding = next(
        item
        for item in manifest["fixtures"]
        if item["path"] == relative_path.as_posix()
    )
    if _sha256(fixture_path) != binding["sha256"]:
        raise ValueError("fixture hash differs from manifest")
    fixture = _load_json(fixture_path)
    if fixture["id"] != binding["id"]:
        raise ValueError("fixture identity differs from manifest")
    return fixture


def verify_phase1(
    repo_root: Path,
    track_root: Path,
    fixture_path: Path | None = None,
) -> VerificationResult:
    """Verifies the frozen Phase 1 boundary and mapper outputs.

    Args:
        repo_root: Repository root containing accepted evidence.
        track_root: T9 track directory containing Phase 1 contracts.
        fixture_path: Optional bound negative fixture to execute.

    Returns:
        A deterministic Red, invalid, or verified result.
    """
    findings: list[Finding] = []
    checks, registry = _verify_frozen_inputs(
        repo_root,
        track_root,
        findings,
    )
    if findings:
        return VerificationResult(
            state="INVALID",
            findings=tuple(findings),
            checks=checks,
        )
    if fixture_path is not None:
        try:
            fixture = _load_bound_fixture(track_root, fixture_path)
            cases = fixture.get("cases", [fixture])
            if not isinstance(cases, list) or not cases:
                raise ValueError("fixture has no cases")
            canonical_template: tuple[dict[str, dict[str, Any]], set[str]] | None = None
            reference_template: tuple[dict[str, dict[str, Any]], set[str]] | None = None
            for case in cases:
                operation = case["mutation"]["operation"]
                case_findings: list[Finding] = []
                case_checks = 2
                if operation in {"stale-dispatch-binding", "stale-acceptance-binding"}:
                    _add(
                        case_findings,
                        "PHASE1_FROZEN_INPUT_DRIFT",
                        "A bound Phase 1 authority input is stale.",
                    )
                else:
                    full_corpus = case["mutation"].get("full_corpus") is True
                    if full_corpus:
                        if reference_template is None:
                            reference_template = _reference_contract_bundle(
                                repo_root, registry
                            )
                        template_bundle, expected_games = reference_template
                    else:
                        if canonical_template is None:
                            canonical_template = _canonical_fixture_bundle(
                                repo_root, registry
                            )
                        template_bundle, expected_games = canonical_template
                    bundle = copy.deepcopy(template_bundle)
                    _apply_fixture(bundle, case, repo_root)
                    case_findings, bundle_checks = _verify_bundle(
                        repo_root,
                        registry,
                        bundle,
                        expected_games,
                        enforce_full_corpus=full_corpus,
                    )
                    case_checks += bundle_checks
                actual_codes = {item.code for item in case_findings}
                expected_codes = set(case["expected_codes"])
                if actual_codes != expected_codes:
                    _add(
                        findings,
                        "FIXTURE_CASE_EXPECTATION_MISMATCH",
                        f"Fixture case {case.get('id')} emitted {sorted(actual_codes)} "
                        f"instead of {sorted(expected_codes)}.",
                    )
                findings.extend(case_findings)
                checks += case_checks
        except (
            KeyError,
            OSError,
            StopIteration,
            TypeError,
            ValueError,
            json.JSONDecodeError,
        ):
            _add(
                findings,
                "INVALID_PHASE1_FIXTURE_BINDING",
                "The Phase 1 counterexample is not manifest-bound.",
            )
        return VerificationResult(
            state="INVALID" if findings else "VERIFIED",
            findings=tuple(sorted(findings, key=lambda item: item.code)),
            checks=checks,
        )
    missing = [
        path for path in MAPPER_OUTPUT_PATHS if not (track_root / path).is_file()
    ]
    checks += len(MAPPER_OUTPUT_PATHS)
    if missing:
        _add(
            findings,
            "PHASE1_MAPPER_OUTPUTS_MISSING",
            "Mapper outputs are not yet published: " + ", ".join(missing),
        )
        return VerificationResult(
            state="RED_WAITING_FOR_MAPPER_OUTPUTS",
            findings=tuple(findings),
            checks=checks,
        )
    try:
        oversized = [
            path
            for path in MAPPER_OUTPUT_PATHS
            if (track_root / path).stat().st_size > MAX_REPORT_BYTES
        ]
        if oversized:
            _add(
                findings,
                "PHASE1_OUTPUT_BUDGET_EXCEEDED",
                "Mapper output exceeds 1,048,576 bytes: " + ", ".join(oversized),
            )
        expected_games = _accepted_game_ids(repo_root, registry)
        bundle = _mapper_bundle(track_root)
        bundle_findings, bundle_checks = _verify_bundle(
            repo_root,
            registry,
            bundle,
            expected_games,
            output_hashes={
                path: _sha256(track_root / path) for path in MAPPER_OUTPUT_PATHS
            },
            enforce_full_corpus=True,
        )
        findings.extend(bundle_findings)
        checks += bundle_checks
    except (
        KeyError,
        OSError,
        StopIteration,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ):
        _add(
            findings,
            "INVALID_PHASE1_OUTPUT_SCHEMA",
            "Published Phase 1 mapper outputs cannot be resolved.",
        )
    return VerificationResult(
        state="INVALID" if findings else "VERIFIED",
        findings=tuple(sorted(findings, key=lambda item: item.code)),
        checks=checks,
    )


def _parse_args(argv: list[str]) -> argparse.Namespace:
    """Parses the deterministic Phase 1 command-line interface."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-codes", nargs="+")
    parser.add_argument("--write-report", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Runs Phase 1 verification and returns a fail-closed status.

    Args:
        argv: Optional command arguments; defaults to process arguments.

    Returns:
        Zero only for verified output or an exact expected finding set.
    """
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    result = verify_phase1(
        args.repo_root.resolve(),
        args.track_root.resolve(),
        fixture_path=args.fixture.resolve() if args.fixture else None,
    )
    report = result.as_json()
    if args.fixture:
        report["fixture"] = str(args.fixture)
    if args.write_report:
        args.write_report.write_text(
            f"{json.dumps(report, indent=2, sort_keys=True)}\n",
            encoding="utf-8",
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    if args.expect_codes:
        actual = {finding.code for finding in result.findings}
        return 0 if actual == set(args.expect_codes) else 1
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
