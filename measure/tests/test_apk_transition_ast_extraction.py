"""Focused falsification tests for source-backed APK transition extraction."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "apk_source_denominator_inventory_20260712"
TRANSITION_MODULE = TRACK_DIR / "transition_ast.py"
PHASE1_GENERATOR = TRACK_DIR / "generate_phase1_denominators.py"
PHASE2_GENERATOR = TRACK_DIR / "generate_phase2_human_discovery.py"


def _load_module(name: str, path: Path) -> Any:
    """Loads one track-local generator module for focused behavioral tests.

    Args:
        name: Unique import name for the loaded module.
        path: Python source path to execute.

    Returns:
        The loaded Python module.
    """
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class TransitionAstUnitContracts(unittest.TestCase):
    """Falsifies regex-order inference with compiler-AST counterexamples."""

    def test_phase1_loads_python_and_typescript_helpers_from_exact_code_revision(self) -> None:
        """Rejects worktree helper execution when a production code revision is bound."""
        revision = "a" * 40
        phase1 = _load_module("apk_phase1_immutable_loader", PHASE1_GENERATOR)
        module_source = b"def extract_transition_writes(sources, *, code_revision=None):\n    return {'code_revision': code_revision}\n"
        with mock.patch.object(phase1, "run_git", return_value=module_source) as run_git:
            transition = phase1._load_transition_module(revision)
        run_git.assert_called_once_with(
            "show", f"{revision}:{phase1.TRANSITION_MODULE_PATH}"
        )
        self.assertEqual(
            transition.extract_transition_writes({}, code_revision=revision),
            {"code_revision": revision},
        )

        transition_module = _load_module(
            "apk_transition_ast_immutable_helper", TRANSITION_MODULE
        )
        immutable_bundle = b"const immutable = true;\n"
        git_result = subprocess.CompletedProcess(
            args=[], returncode=0, stdout=immutable_bundle, stderr=b""
        )
        compiler_result = subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout=b'{"literal_domain_writes":[]}',
            stderr=b"",
        )
        with mock.patch.object(
            transition_module.subprocess,
            "run",
            side_effect=(git_result, compiler_result),
        ) as run:
            self.assertEqual(
                transition_module.enumerate_typescript_transition_facts(
                    {}, mode="phase1", code_revision=revision
                ),
                [],
            )
        self.assertEqual(
            run.call_args_list[0].args[0],
            [
                "/usr/bin/git",
                "show",
                f"{revision}:{transition_module.AST_BUNDLE_PATH}",
            ],
        )
        self.assertEqual(
            run.call_args_list[1].args[0][0],
            "/opt/codex-desktop/resources/node-runtime/bin/node",
        )
        self.assertEqual(
            run.call_args_list[1].kwargs["input"],
            b'{"mode": "phase1", "sources": {}}',
        )
        self.assertEqual(run.call_args_list[1].kwargs["env"], transition_module.RUNTIME_ENV)

    def test_phase2_loads_typescript_helper_from_exact_code_revision(self) -> None:
        """Rejects Phase-2 worktree helper execution under a bound code revision."""
        revision = "b" * 40
        phase2 = _load_module("apk_phase2_immutable_helper", PHASE2_GENERATOR)
        immutable_bundle = b"const phase2 = true;\n"
        git_result = subprocess.CompletedProcess(
            args=[], returncode=0, stdout=immutable_bundle, stderr=b""
        )
        compiler_result = subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout=b'{"literal_domain_writes":[]}',
            stderr=b"",
        )
        with mock.patch.object(
            phase2.subprocess, "run", side_effect=(git_result, compiler_result)
        ) as run:
            self.assertEqual(
                phase2._enumerate_raw_transition_facts(
                    {}, code_revision=revision
                ),
                [],
            )
        self.assertEqual(
            run.call_args_list[0].args[0],
            ["/usr/bin/git", "show", f"{revision}:{phase2.TRANSITION_BUNDLE_PATH}"],
        )
        self.assertEqual(
            run.call_args_list[1].args[0][0],
            "/opt/codex-desktop/resources/node-runtime/bin/node",
        )
        self.assertEqual(
            run.call_args_list[1].kwargs["input"],
            b'{"mode": "phase2", "sources": {}}',
        )
        self.assertEqual(run.call_args_list[1].kwargs["env"], phase2.RUNTIME_ENV)

    def test_self_contained_bundle_ignores_poisoned_node_modules(self) -> None:
        """Proves runtime extraction never resolves TypeScript or tsx from node_modules."""
        transition = _load_module("apk_transition_ast_bundle_isolation", TRANSITION_MODULE)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            poison = root / "node_modules" / "typescript"
            poison.mkdir(parents=True)
            (poison / "package.json").write_text(
                '{"name":"typescript","main":"index.js"}',
                encoding="utf-8",
            )
            (poison / "index.js").write_text(
                "throw new Error('ambient typescript loaded');",
                encoding="utf-8",
            )
            with mock.patch.object(transition, "REPO_ROOT", root):
                facts = transition.enumerate_typescript_transition_facts(
                    {"fixture.ts": 'type State = "idle" | "done";'},
                    mode="phase1",
                )
        self.assertEqual(facts, [])

    def test_ast_extracts_only_single_source_state_edges_and_retains_candidates(self) -> None:
        """Requires proven guards/data flow and quarantines ambiguous writes."""
        module = _load_module("apk_transition_ast", TRANSITION_MODULE)
        source = """
type DemoState = { status: "idle" | "playing" | "victory" };

function proven(state: DemoState): DemoState {
  if (state.status !== "playing") return state;
  return { ...state, status: "victory" };
}

function ambiguous(state: DemoState): DemoState {
  const displayOnly = { status: "victory" };
  return { ...state, status: "idle" };
}

function chronological(state: DemoState): DemoState {
  // next.status = "idle" must never be parsed from a comment.
  const prose = "next.status = 'victory'";
  const next = { ...state };
  next.status = "playing";
  next.status = "victory";
  return next;
}
"""
        result = module.extract_transition_writes({"fixture.ts": source})
        proven = {
            (row["source_symbol"], row["from_state_id"], row["to_state_id"])
            for row in result["proven_transitions"]
        }
        self.assertEqual(proven, {("DemoState.status", "playing", "victory")})
        candidates = {
            (row["source_symbol"], row["to_state_id"])
            for row in result["transition_write_candidates"]
        }
        self.assertEqual(
            candidates,
            {
                ("DemoState.status", "idle"),
                ("DemoState.status", "playing"),
                ("DemoState.status", "victory"),
            },
        )
        self.assertTrue(
            all(row["record_kind"] == "transition_write_candidate" for row in result["transition_write_candidates"])
        )
        self.assertTrue(
            all(row["resolution_status"] == "unresolved" for row in result["transition_write_candidates"])
        )
        literal_writes = {
            (row["source_symbol"], row["to_state_id"], row["start_line"])
            for row in result["literal_domain_writes"]
        }
        classified_writes = {
            (row["source_symbol"], row["to_state_id"], row["start_line"])
            for collection in (result["proven_transitions"], result["transition_write_candidates"])
            for row in collection
        }
        self.assertEqual(
            classified_writes,
            literal_writes,
            "every AST-enumerated domain write must be proven or explicitly unresolved",
        )
        self.assertNotIn(
            ("DemoState.status", "victory"),
            {
                (row["source_symbol"], row["to_state_id"])
                for row in result["transition_write_candidates"]
                if row["start_line"] == 10
            },
            "an unrelated display object must not become a transition write",
        )
        self.assertEqual(
            len(result["literal_domain_writes"]),
            4,
            "comments, string contents, and unrelated display objects are not executable transition writes",
        )

    def test_zustand_writes_are_exactly_enumerated_and_source_proven(self) -> None:
        """Requires frozen store writes to bind guards or exact initializing actions."""
        phase1 = _load_module("apk_phase1_zustand_sources", PHASE1_GENERATOR)
        paths = [
            "apps/advantage-games/src/store/usePotionRushStore.ts",
            "apps/advantage-games/src/store/useRPGBattleStore.ts",
        ]
        sources = {
            path: phase1.blob(path).decode("utf-8", errors="replace")
            for path in paths
        }
        transition_module = _load_module("apk_transition_ast_zustand", TRANSITION_MODULE)
        phase1_facts = transition_module.enumerate_typescript_transition_facts(
            sources, mode="phase1"
        )
        phase2_facts = transition_module.enumerate_typescript_transition_facts(
            sources, mode="phase2"
        )

        def keyed(rows: list[dict[str, Any]]) -> dict[tuple[str, str, str, int], dict[str, Any]]:
            """Keys compiler writes by frozen path, declared property, target, and line."""
            return {
                (
                    row["path"],
                    row["source_symbol"],
                    row["to_state_id"],
                    row["start_line"],
                ): row
                for row in rows
            }

        phase1_by_key = keyed(phase1_facts)
        phase2_by_key = keyed(phase2_facts)
        self.assertEqual(set(phase1_by_key), set(phase2_by_key))
        required = {
            (paths[0], "gameState", "PLAYING", 170): "MENU",
            (paths[1], "status", "playing", 88): "idle",
            (paths[1], "status", "defeat", 104): "playing",
            (paths[1], "status", "victory", 115): "playing",
            (paths[1], "turn", "player", 129): "enemy",
            (paths[1], "selectionStep", "location", 176): "hero",
            (paths[1], "selectionStep", "enemy", 185): "location",
            (paths[1], "selectionStep", "ready", 194): "enemy",
        }
        self.assertEqual(set(phase1_by_key) & set(required), set(required))
        self.assertEqual(
            {key: phase1_by_key[key]["proven_from_state_id"] for key in required},
            required,
        )
        self.assertEqual(
            {key: phase2_by_key[key]["proven_from_state_id"] for key in required},
            required,
        )
        initializing = {key for key in required if key[2] in {"PLAYING", "playing"}}
        for rows in (phase1_by_key, phase2_by_key):
            self.assertEqual(
                {rows[key]["proof_kind"] for key in initializing},
                {"ast-zustand-initial-action-write"},
            )
        adjudicated = transition_module.extract_transition_writes(sources)
        classified = {
            (
                row["path"],
                row["source_symbol"],
                row["to_state_id"],
                row["start_line"],
            )
            for rows in (
                adjudicated["proven_transitions"],
                adjudicated["transition_write_candidates"],
            )
            for row in rows
        }
        self.assertEqual(classified, set(phase1_by_key))

    def test_guard_proof_is_bound_to_the_exact_call_argument(self) -> None:
        """Rejects propagation from guarded parameter a through unguarded argument b."""
        source = """
type DemoState = { status: "idle" | "playing" | "victory" };

function finish(state: DemoState): DemoState {
  return { ...state, status: "victory" };
}

function caller(a: DemoState, b: DemoState): DemoState {
  if (a.status !== "playing") return b;
  return finish(b);
}
"""
        transition_module = _load_module("apk_transition_ast_alias_guard", TRANSITION_MODULE)
        for mode in ("phase1", "phase2"):
            with self.subTest(mode=mode):
                facts = transition_module.enumerate_typescript_transition_facts(
                    {"fixture.ts": source}, mode=mode
                )
                victory = [
                    row
                    for row in facts
                    if row["source_symbol"] == "DemoState.status"
                    and row["to_state_id"] == "victory"
                ]
                self.assertEqual(len(victory), 1)
                self.assertIsNone(victory[0]["proven_from_state_id"])

    def test_bare_callee_name_cannot_propagate_guard_across_files(self) -> None:
        """Rejects cross-file propagation without an exact imported symbol binding."""
        sources = {
            "caller.ts": """
type DemoState = { status: "idle" | "playing" | "victory" };
function caller(state: DemoState): DemoState {
  if (state.status !== "playing") return state;
  return finish(state);
}
""",
            "unrelated.ts": """
type DemoState = { status: "idle" | "playing" | "victory" };
function finish(state: DemoState): DemoState {
  return { ...state, status: "victory" };
}
""",
        }
        transition_module = _load_module("apk_transition_ast_cross_file_guard", TRANSITION_MODULE)
        for mode in ("phase1", "phase2"):
            with self.subTest(mode=mode):
                facts = transition_module.enumerate_typescript_transition_facts(
                    sources, mode=mode
                )
                victory = [
                    row
                    for row in facts
                    if row["path"] == "unrelated.ts"
                    and row["source_symbol"] == "DemoState.status"
                    and row["to_state_id"] == "victory"
                ]
                self.assertEqual(len(victory), 1)
                self.assertIsNone(victory[0]["proven_from_state_id"])


class TransitionGeneratorIntegrationContracts(unittest.TestCase):
    """Requires both discovery paths to integrate the AST extractor independently."""

    @classmethod
    def setUpClass(cls) -> None:
        """Regenerates the focused frozen-source surface subset in memory."""
        cls.phase1 = _load_module("apk_phase1_transition_generator", PHASE1_GENERATOR)
        cls.phase2 = _load_module("apk_phase2_transition_generator", PHASE2_GENERATOR)
        cls.paths = [
            "apps/advantage-games/src/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.tsx",
            "apps/advantage-games/src/lib/games/alchemistsSynthesis.ts",
            "apps/advantage-games/src/lib/games/devourerSlime.ts",
            "packages/advantage-play-kit/src/react/apk-game-host.tsx",
        ]
        cls.mechanical = cls.phase1.build_scene_state_denominator(cls.paths)
        reader = cls.phase2.GitObjectReader()
        try:
            states, transitions, candidates = cls.phase2._raw_store_surfaces(reader, cls.paths)
        finally:
            reader.close()
        cls.raw_states = states
        cls.raw_transitions = transitions
        cls.raw_candidates = candidates

    def test_phase1_extracts_exact_alchemists_devourer_and_apk_host_edges(self) -> None:
        """Requires the mechanical path to retain the frozen proven edge set."""
        edges = {
            (
                row["evidence"]["path"],
                row["source_symbol"],
                row["from_state_id"],
                row["to_state_id"],
            )
            for row in self.mechanical["transitions"]
        }
        expected = {
            (
                self.paths[0],
                "AlchemistsSynthesisState.status",
                "idle",
                "playing",
            ),
            (
                self.paths[1],
                "AlchemistsSynthesisState.status",
                "playing",
                "gameover",
            ),
            (
                self.paths[1],
                "AlchemistsSynthesisState.status",
                "playing",
                "victory",
            ),
            (self.paths[2], "SlimeState.phase", "playing", "defeat"),
            (self.paths[2], "SlimeState.phase", "playing", "victory"),
            (self.paths[3], "status", "loading", "complete"),
            (self.paths[3], "status", "paused", "ready"),
        }
        self.assertEqual(edges & expected, expected)
        candidates = {
            (row["evidence"]["path"], row["source_symbol"], row["to_state_id"])
            for row in self.mechanical["transition_write_candidates"]
        }
        self.assertIn((self.paths[3], "status", "paused"), candidates)
        self.assertIn((self.paths[3], "status", "ready"), candidates)

    def test_phase2_does_not_reuse_phase1_transition_adjudication(self) -> None:
        """Poisons the mechanical adjudicator while raw extraction remains usable."""
        transition_module = _load_module("apk_transition_ast_poison", TRANSITION_MODULE)
        reader = self.phase2.GitObjectReader()
        try:
            with mock.patch.object(
                transition_module,
                "extract_transition_writes",
                side_effect=AssertionError("Phase-1 conclusions are forbidden"),
            ):
                _states, transitions, candidates = self.phase2._raw_store_surfaces(reader, self.paths)
        finally:
            reader.close()
        self.assertTrue(transitions)
        self.assertTrue(candidates)

    def test_each_path_classifies_its_exact_compiler_enumerated_write_set(self) -> None:
        """Requires proven edges and candidates to partition every AST domain write."""
        source_texts = {
            path: self.phase1.blob(path).decode("utf-8", errors="replace")
            for path in self.paths
        }
        phase1_transition = _load_module("apk_transition_ast_partition", TRANSITION_MODULE)
        phase1_facts = phase1_transition.enumerate_typescript_transition_facts(
            source_texts, mode="phase1"
        )
        phase2_facts = self.phase2._enumerate_raw_transition_facts(source_texts)

        def fact_keys(rows: list[dict[str, Any]]) -> set[tuple[str, str, str, int]]:
            return {
                (row["path"], row["source_symbol"], row["to_state_id"], row["start_line"])
                for row in rows
            }

        mechanical_keys = {
            (
                row["evidence"]["path"],
                row["source_symbol"],
                row["to_state_id"],
                row["evidence"]["range"]["start_line"],
            )
            for collection in (
                self.mechanical["transitions"],
                self.mechanical["transition_write_candidates"],
            )
            for row in collection
        }
        raw_keys = {
            (
                row["path"],
                row["source_symbol"],
                row["to_state_id"],
                row["evidence"]["range"]["start_line"],
            )
            for collection in (self.raw_transitions, self.raw_candidates)
            for row in collection
        }
        self.assertEqual(mechanical_keys, fact_keys(phase1_facts))
        self.assertEqual(raw_keys, fact_keys(phase2_facts))

    def test_phase2_independently_extracts_the_same_required_proven_edges(self) -> None:
        """Requires raw-source discovery to invoke the compiler helper itself."""
        edges = {
            (row["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"])
            for row in self.raw_transitions
        }
        expected = {
            (self.paths[0], "AlchemistsSynthesisState.status", "idle", "playing"),
            (self.paths[1], "AlchemistsSynthesisState.status", "playing", "gameover"),
            (self.paths[1], "AlchemistsSynthesisState.status", "playing", "victory"),
            (self.paths[2], "SlimeState.phase", "playing", "defeat"),
            (self.paths[2], "SlimeState.phase", "playing", "victory"),
            (self.paths[3], "status", "loading", "complete"),
            (self.paths[3], "status", "paused", "ready"),
        }
        self.assertEqual(edges & expected, expected)
        candidates = {
            (row["path"], row["source_symbol"], row["to_state_id"])
            for row in self.raw_candidates
        }
        self.assertIn((self.paths[3], "status", "paused"), candidates)


class TransitionFullCorpusContracts(unittest.TestCase):
    """Reconciles both independent transition paths over the frozen corpus."""

    def test_full_corpus_proven_sets_and_write_partitions_are_exact(self) -> None:
        """Requires symmetric proven edges and exact accounting of every AST write."""
        phase1 = _load_module("apk_phase1_transition_full", PHASE1_GENERATOR)
        phase2 = _load_module("apk_phase2_transition_full", PHASE2_GENERATOR)
        transition_module = _load_module("apk_transition_ast_full", TRANSITION_MODULE)

        phase1_paths = phase1.baseline_paths()
        mechanical = phase1.build_scene_state_denominator(phase1_paths)
        phase1_source_paths = [
            path
            for path in phase1_paths
            if phase1.source_path(path)
            and Path(path).suffix in {".ts", ".tsx", ".js", ".jsx"}
        ]
        phase1_sources = {
            path: phase1.blob(path).decode("utf-8", errors="replace")
            for path in phase1_source_paths
        }
        phase1_facts = transition_module.enumerate_typescript_transition_facts(
            phase1_sources, mode="phase1"
        )

        phase2_source_paths = [
            row["path"]
            for row in phase2._tree_entries()
            if phase2._raw_source_path(row["path"])
        ]
        reader = phase2.GitObjectReader()
        try:
            _states, raw_transitions, raw_candidates = phase2._raw_store_surfaces(
                reader, phase2_source_paths
            )
        finally:
            reader.close()
        phase2_sources = {
            path: phase1.blob(path).decode("utf-8", errors="replace")
            for path in phase2_source_paths
            if Path(path).suffix in {".ts", ".tsx", ".js", ".jsx"}
        }
        phase2_facts = phase2._enumerate_raw_transition_facts(phase2_sources)

        def fact_key(row: dict[str, Any]) -> tuple[str, str, str, int]:
            """Keys one compiler write by source location and target domain literal."""
            return (
                row["path"],
                row["source_symbol"],
                row["to_state_id"],
                row["start_line"],
            )

        def output_write_key(row: dict[str, Any]) -> tuple[str, str, str, int]:
            """Keys one classified output write by its frozen evidence locator."""
            return (
                row.get("path", row["evidence"]["path"]),
                row["source_symbol"],
                row["to_state_id"],
                row["evidence"]["range"]["start_line"],
            )

        mechanical_write_keys = {
            output_write_key(row)
            for rows in (
                mechanical["transitions"],
                mechanical["transition_write_candidates"],
            )
            for row in rows
        }
        raw_write_keys = {
            output_write_key(row)
            for rows in (raw_transitions, raw_candidates)
            for row in rows
        }
        self.assertEqual(mechanical_write_keys, {fact_key(row) for row in phase1_facts})
        self.assertEqual(raw_write_keys, {fact_key(row) for row in phase2_facts})

        mechanical_proven = {
            (
                row["evidence"]["path"],
                row["source_symbol"],
                row["from_state_id"],
                row["to_state_id"],
                row["evidence"]["range"]["start_line"],
            )
            for row in mechanical["transitions"]
        }
        raw_proven = {
            (
                row["path"],
                row["source_symbol"],
                row["from_state_id"],
                row["to_state_id"],
                row["evidence"]["range"]["start_line"],
            )
            for row in raw_transitions
        }
        self.assertFalse(
            mechanical_proven - raw_proven,
            "independent raw discovery must retain every mechanically proven transition",
        )
        self.assertEqual(
            raw_proven - mechanical_proven,
            {
                (
                    "apps/advantage-games/src/store/usePotionRushStore.ts",
                    "gameState",
                    "MENU",
                    "PLAYING",
                    170,
                ),
                (
                    "apps/advantage-games/src/store/usePotionRushStore.ts",
                    "gameState",
                    "PLAYING",
                    "GAME_OVER",
                    453,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "selectionStep",
                    "enemy",
                    "ready",
                    194,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "selectionStep",
                    "hero",
                    "location",
                    176,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "selectionStep",
                    "location",
                    "enemy",
                    185,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "status",
                    "idle",
                    "playing",
                    88,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "status",
                    "playing",
                    "defeat",
                    104,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "status",
                    "playing",
                    "victory",
                    115,
                ),
                (
                    "apps/advantage-games/src/store/useRPGBattleStore.ts",
                    "turn",
                    "enemy",
                    "player",
                    129,
                ),
            },
            "independent raw discovery must preserve the exact mechanical counterexamples",
        )


if __name__ == "__main__":
    unittest.main()
