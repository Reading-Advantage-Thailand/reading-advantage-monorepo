"""Quarantines the historical 24-title cross-host cutover candidate.

The record and its reports remain useful historical evidence. They must never
be rebound to live source or used to close a host-proof, retirement, or cohort
acceptance task.
"""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
SHARED_CANDIDATE = REPO_ROOT / "measure/apk-cross-host-cutover-candidate-v1.json"
GAME_CARTRIDGES_ROOT = REPO_ROOT / "packages/game-cartridges"
GAME_CARTRIDGES_INDEX = GAME_CARTRIDGES_ROOT / "src/index.ts"
GAME_CARTRIDGES_PACKAGE = GAME_CARTRIDGES_ROOT / "package.json"
HOST_PROOF_RUNTIME = GAME_CARTRIDGES_ROOT / "src/host-proof.ts"
HOST_LOADERS = (
    REPO_ROOT / "apps/reading-advantage/lib/host-proof-qc-loader.ts",
    REPO_ROOT / "apps/primary-advantage/lib/host-proof-cartridge-loader.ts",
)
HOST_CLIENTS = (
    REPO_ROOT / "apps/reading-advantage/components/host-proof/HostProofGameClient.tsx",
    REPO_ROOT / "apps/primary-advantage/components/host-proof/HostProofGameClient.tsx",
)
HOST_ATTEMPT_ROUTES = (
    REPO_ROOT / "apps/reading-advantage/app/api/host-proof/games/attempts/route.ts",
    REPO_ROOT / "apps/primary-advantage/app/api/host-proof/games/attempts/route.ts",
)
HOST_COMPLETION_ROUTES = (
    REPO_ROOT / "apps/reading-advantage/app/api/host-proof/games/completions/route.ts",
    REPO_ROOT / "apps/primary-advantage/app/api/host-proof/games/completions/route.ts",
)
TRACKS_REGISTRY = REPO_ROOT / "measure/tracks.md"
NEW_GAME_INTAKE_ROOT = REPO_ROOT / "measure/archive/apk_new_game_intake_20260727"

COHORTS = {
    "existing-core": {
        "track_id": "apk_existing_core_cutover_20260727",
        "titles": [
            "dragon-flight",
            "magic-defense",
            "dungeon-liberator",
            "sorcerer-ziggurat",
            "astral-mage",
        ],
        "host_status": "host-proof",
        "retirement_status": "option-1",
    },
    "existing-action": {
        "track_id": "apk_existing_action_cutover_20260727",
        "titles": [
            "archers-revenge",
            "paladins-twin-soul",
            "griffin-sky-joust",
            "gryphon-patrol",
            "realm-carver",
        ],
        "host_status": "host-proof",
        "retirement_status": "option-1",
    },
    "legacy-defense": {
        "track_id": "apk_legacy_defense_cutover_20260727",
        "titles": [
            "castle-defense",
            "wizard-vs-zombie",
            "village-guardian",
            "storm-castle-tower",
        ],
        "host_status": "host-proof",
        "retirement_status": "option-1",
    },
    "legacy-traversal": {
        "track_id": "apk_legacy_traversal_cutover_20260727",
        "titles": [
            "dragon-rider",
            "spellweavers-run",
            "shadow-gate-dungeon",
            "labyrinth-goblin-king",
            "griffin-riders-escape",
        ],
        "host_status": "host-proof",
        "retirement_status": "option-1",
    },
    "legacy-puzzle": {
        "track_id": "apk_legacy_puzzle_cutover_20260727",
        "titles": [
            "enchanted-library",
            "rune-match",
            "alchemists-synthesis",
            "potion-rush",
            "rune-forge-chamber",
        ],
        "host_status": "host-proof",
        "retirement_status": "option-1",
    },
}


def _load(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object.

    Args:
        path: JSON file that must contain an object.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest for one exact file.

    Args:
        path: Existing file to digest.

    Returns:
        Lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _repo_path(relative_path: str) -> Path:
    """Resolves a repository-relative path without permitting path escape.

    Args:
        relative_path: Candidate-controlled repository-relative file path.

    Returns:
        Resolved path within the repository.
    """
    path = (REPO_ROOT / relative_path).resolve()
    path.relative_to(REPO_ROOT.resolve())
    return path


def _source(path: Path) -> str:
    """Reads a required live source file.

    Args:
        path: Required current host or runtime source path.

    Returns:
        UTF-8 source text.
    """
    if not path.is_file():
        raise AssertionError(f"required live source is missing: {path.relative_to(REPO_ROOT)}")
    return path.read_text(encoding="utf-8")


class ApkCrossHostCutoverCandidateTests(unittest.TestCase):
    """Enforces quarantine while the Dragon Flight-only corrective path is active."""

    def test_historical_candidate_has_live_source_drift_and_no_authority(self) -> None:
        """Requires the old candidate to remain stale and explicitly non-consumable."""
        candidate = _load(SHARED_CANDIDATE)
        self.assertEqual(candidate["status"], "acceptance-candidate-non-consumable")
        self.assertEqual(candidate["title_count"], 24)
        self.assertEqual(
            candidate["cohorts"],
            [
                {"cohort": cohort, "title_ids": config["titles"]}
                for cohort, config in COHORTS.items()
            ],
        )
        self.assertTrue(candidate["host_observations"])
        self.assertEqual(set(candidate["authorization"].values()), {False})

        drifted_paths: list[str] = []
        for binding in candidate["bound_current_files"]:
            path = _repo_path(binding["path"])
            expected_sha = binding["sha256"]
            self.assertEqual(len(expected_sha), 64, binding["path"])
            if not path.is_file() or _sha256(path) != expected_sha:
                drifted_paths.append(binding["path"])

        self.assertTrue(
            drifted_paths,
            "the quarantined candidate has been rebound to live source; retain its historical "
            "hashes and keep at least one live-source drift",
        )

    def test_current_dragon_flight_host_uses_signed_attempt_and_explicit_runtime_boundaries(self) -> None:
        """Requires the active proof path to remain Dragon Flight-only and server-bound."""
        package = _load(GAME_CARTRIDGES_PACKAGE)
        self.assertIn("./host-proof", package["exports"])
        self.assertNotIn('export * from "./catalog.js";', _source(GAME_CARTRIDGES_INDEX))

        runtime = _source(HOST_PROOF_RUNTIME)
        for required in (
            "loadDragonFlightHostProofCartridge",
            "RuntimeCartridge",
            "GameResults",
            "gameResultsSchema",
            "DRAGON_FLIGHT_HOST_PROOF_ACTION",
            "context.complete(resultFromState(state))",
        ):
            self.assertIn(required, runtime)

        for loader_path in HOST_LOADERS:
            loader = _source(loader_path)
            self.assertIn("@reading-advantage/game-cartridges/host-proof", loader, loader_path)
            self.assertIn("loadDragonFlightHostProofCartridge", loader, loader_path)
            self.assertNotIn('@reading-advantage/game-cartridges";', loader, loader_path)

        for route_path in HOST_ATTEMPT_ROUTES:
            route = _source(route_path)
            for required in (
                "isHostProofEnabled",
                "getCurrentUser",
                "createTenantDB",
                "issueDragonFlightHostProofAttempt",
            ):
                self.assertIn(required, route, route_path)

        for route_path in HOST_COMPLETION_ROUTES:
            route = _source(route_path)
            for required in (
                "getCurrentUser",
                "createTenantDB",
                "completeDragonFlightHostProofAttempt",
            ):
                self.assertIn(required, route, route_path)
            self.assertNotIn("recordHostProofGameCompletion", route, route_path)
            self.assertNotIn("HostProofCompletionRequest", route, route_path)

    def test_current_clients_do_not_construct_synthetic_completion_metrics(self) -> None:
        """Forbids reviving the generic counter-to-XP transport in either host client."""
        forbidden_fragments = (
            "score: state.correctAnswers * 100",
            "accuracy: state.correctAnswers / state.totalAttempts",
            "correctAnswers: state.correctAnswers",
            "totalAttempts: state.totalAttempts",
            "duration: 1000",
            "victory: true",
        )
        for client_path in HOST_CLIENTS:
            client = _source(client_path)
            for required in (
                "APKGameHost",
                "/api/host-proof/games/attempts",
                'gameType: "dragon-flight"',
                "actions,",
                "onDiagnostic={onDiagnostic}",
                "onComplete={submitCompletion}",
                "showClientResult={false}",
                "showRestartControl={false}",
            ):
                self.assertIn(required, client, client_path)
            for forbidden in forbidden_fragments:
                self.assertNotIn(forbidden, client, client_path)
            self.assertNotIn("createQcSession", client, client_path)
            self.assertNotIn("loadCartridge(", client, client_path)

    def test_plan_blocks_gameplay_provenance_acceptance_until_the_client_transcript_gap_is_closed(self) -> None:
        """Prevents signed credentials from being misrepresented as observed gameplay."""
        plan = _source(REPO_ROOT / "measure/archive/apk_existing_core_cutover_20260727/plan.md")
        for required in (
            "raw browser diagnostic values remain untrusted",
            "client chooses action labels and supplies elapsed diagnostics",
            "Each receipt returns the server-owned minimum next-action dwell",
            "completion revalidates the exact checkpoint chain",
            "Terra phase-acceptance checklist (not an acceptance claim)",
            "current source, historical acceptance records, and the quarantined 24-title candidate",
            "Product-owner authorization, cohort/cutover authority, and Task 6 retirement remain external gates",
            "The server observes only the ordered checkpoint protocol",
            "strictly increasing checkpoint time and bounded gate-to-launch dwell",
            "not physical human play, anti-bot resistance, answer-comprehension validation, or mastery proof",
            "anti-cheat, mastery/learning proof, physical-human play, or broader XP-integrity acceptance",
            "both hosts must use the checkpoint protocol",
            "adversarial direct-JSON/same-frame-bypass tests",
        ):
            self.assertIn(required, plan)

        attempt = _source(REPO_ROOT / "packages/domain/src/games/dragon-flight-host-proof-attempt.ts")
        self.assertIn("elapsedMs: z.number().int().nonnegative()", attempt)
        self.assertIn("attestDragonFlightHostProofAction", attempt)
        self.assertIn("assertActionCheckpointChain", attempt)
        self.assertIn("DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS = 250", attempt)
        self.assertIn("const replayed = replayDragonFlight(parsedInput.actions);", attempt)
        self.assertIn("await dependencies.recordCompletion", attempt)

    def test_historical_reports_and_retirement_records_cannot_close_current_cohort_tasks(self) -> None:
        """Keeps report and zero-deletion records while preventing acceptance by bookkeeping."""
        candidate = _load(SHARED_CANDIDATE)
        self.assertEqual(candidate["status"], "acceptance-candidate-non-consumable")
        self.assertEqual(set(candidate["authorization"].values()), {False})
        self.assertIn("Independent review", candidate["next_required_gate"])

        shared_sha = _sha256(SHARED_CANDIDATE)
        for cohort, config in COHORTS.items():
            track_root = REPO_ROOT / "measure/archive" / config["track_id"]
            handoff = _load(track_root / "cross-host-cutover-handoff-candidate-v1.json")
            self.assertEqual(handoff["cohort"], cohort)
            self.assertEqual(handoff["title_ids"], config["titles"])
            self.assertEqual(handoff["shared_candidate"]["sha256"], shared_sha)
            self.assertEqual(set(handoff["authorization"].values()), {False})

            retirement = _load(_repo_path(handoff["retirement_manifest"]["path"]))
            self.assertEqual(retirement["deleted_paths"], [])
            self.assertEqual(retirement["deleted_path_count"], 0)
            self.assertEqual(retirement["decision"], "retain-until-accepted-production-route-cutover")

            plan = _source(track_root / "plan.md")
            self.assertTrue(
                "host-proof" in plan.lower() or "Host-proof" in plan or "host proof" in plan.lower(),
                config["track_id"],
            )
            self.assertIn("host-proof", plan.lower(), config["track_id"])

            metadata = _load(track_root / "metadata.json")
            self.assertEqual(metadata["status"], "complete", config["track_id"])
            self.assertIn("historical", metadata["deviation_notes"].lower(), config["track_id"])

    def test_completed_new_game_intake_is_marked_complete_in_the_registry_only(self) -> None:
        """Keeps completed intake bookkeeping distinct from any new-game authorization."""
        metadata = _load(NEW_GAME_INTAKE_ROOT / "metadata.json")
        self.assertEqual(metadata["status"], "complete")
        self.assertFalse(metadata["validation"]["operational_authority_granted"])
        self.assertFalse(metadata["validation"]["future_intake_accepted"])

        plan = _source(NEW_GAME_INTAKE_ROOT / "plan.md")
        self.assertNotIn("- [ ]", plan)
        self.assertNotIn("- [~]", plan)
        self.assertIn(
            "- [x] **Track: APK Planned/New-Game Intake**",
            _source(TRACKS_REGISTRY),
        )


if __name__ == "__main__":
    unittest.main()
