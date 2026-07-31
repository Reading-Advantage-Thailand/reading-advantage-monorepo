"""Verifies the R2 Accounts unaudited-route security matrix fails closed."""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import unittest
from functools import lru_cache
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
EVIDENCE_DIR = TRACK_DIR / "r2-task3-accounts-security-matrix-20260731"
MATRIX_PATH = EVIDENCE_DIR / "matrix.json"
R1_BUNDLE_DIR = TRACK_DIR / "r1-task2-source-and-graph-20260731"
R1_ARCHIVE_PATH = R1_BUNDLE_DIR / "snapshot.archive.json"
R1_MANIFEST_PATH = R1_BUNDLE_DIR / "snapshot.manifest.json"
R2_DENOMINATOR_PATH = TRACK_DIR / "r2-task2-compensation-denominator-20260731.json"

DIMENSIONS = (
    "authentication",
    "permissionOwnership",
    "validation",
    "scope",
    "audit",
    "destructiveEffect",
)
EXPECTED_GATE_COMMANDS = (
    ("CI=true", "pnpm", "--filter", "accounts", "test"),
    ("CI=true", "pnpm", "--filter", "accounts", "check-types"),
    ("CI=true", "pnpm", "--filter", "@reading-advantage/backend", "test"),
    ("CI=true", "pnpm", "--filter", "@reading-advantage/backend", "check-types"),
)


class MatrixValidationError(ValueError):
    """Raised when the candidate matrix is incomplete, tampered, or overclaims."""


def _canonical(value: Any) -> bytes:
    """Serializes a JSON value with the frozen canonical representation.

    @param value The JSON-compatible value to serialize.
    @returns Canonical UTF-8 JSON bytes.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256(value: bytes) -> str:
    """Returns the lowercase SHA-256 digest for bytes.

    @param value The bytes to hash.
    @returns The hexadecimal digest.
    """
    return hashlib.sha256(value).hexdigest()


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact.

    @param path The artifact to parse.
    @returns The parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def _artifact_reference(path: Path) -> dict[str, Any]:
    """Builds a relative immutable reference to an existing evidence artifact.

    @param path The immutable artifact to reference.
    @returns Path, SHA-256, and byte-size metadata.
    """
    data = path.read_bytes()
    return {
        "path": path.relative_to(TRACK_DIR).as_posix(),
        "sha256": _sha256(data),
        "size": len(data),
    }


@lru_cache(maxsize=1)
def _load_frozen_sources() -> tuple[dict[str, bytes], dict[str, dict[str, Any]]]:
    """Returns decoded R1 archive bytes and the manifest index by path.

    @returns Frozen source bytes and their manifest metadata.
    """
    archive = _load_json(R1_ARCHIVE_PATH)
    manifest = _load_json(R1_MANIFEST_PATH)
    sources: dict[str, bytes] = {}
    for entry in archive["entries"]:
        if entry["kind"] == "file":
            sources[entry["path"]] = base64.b64decode(entry["contentBase64"])
    return sources, {entry["path"]: entry for entry in manifest["entries"]}


@lru_cache(maxsize=1)
def _accounts_routes() -> list[dict[str, Any]]:
    """Selects the complete Accounts route subset from the frozen R2 denominator.

    @returns Denominator routes owned by the Accounts app.
    """
    denominator = _load_json(R2_DENOMINATOR_PATH)["unauditedDenominator"]
    return [
        route
        for route in denominator["routeReconciliation"]
        if route["path"].startswith("apps/accounts/app/")
    ]


def _source_range(source: bytes, line_start: int, line_end: int) -> bytes:
    """Returns one inclusive line range from frozen source bytes.

    @param source The frozen source bytes.
    @param line_start The one-based first line.
    @param line_end The one-based final line.
    @returns The exact range bytes.
    @throws MatrixValidationError When the range is outside the source file.
    """
    lines = source.splitlines(keepends=True)
    if line_start < 1 or line_end < line_start or line_end > len(lines):
        raise MatrixValidationError("ANCHOR_RANGE_OUT_OF_BOUNDS")
    return b"".join(lines[line_start - 1 : line_end])


def _require_exact_keys(value: Any, keys: set[str], code: str) -> dict[str, Any]:
    """Checks that an evidence object has exactly its declared keys.

    @param value The candidate object.
    @param keys The complete allowed key set.
    @param code The fail-closed error code.
    @returns The checked object.
    @throws MatrixValidationError When the object shape differs from the contract.
    """
    if not isinstance(value, dict) or set(value) != keys:
        raise MatrixValidationError(code)
    return value


def _validate_matrix(matrix: Any) -> None:
    """Validates the Accounts matrix against the immutable R1/R2 evidence.

    @param matrix The candidate matrix to validate.
    @returns Nothing.
    @throws MatrixValidationError When completeness, source binding, or honesty fails.
    """
    _require_exact_keys(
        matrix,
        {
            "assertionCatalog",
            "denominator",
            "gateResults",
            "kind",
            "phase",
            "routeMatrix",
            "schemaVersion",
            "sourceBundle",
            "status",
            "testCatalog",
            "track",
        },
        "MATRIX_SCHEMA_INVALID",
    )
    if matrix["schemaVersion"] != 1 or matrix["kind"] != "accounts-unaudited-route-security-matrix":
        raise MatrixValidationError("MATRIX_SCHEMA_VERSION_INVALID")
    if matrix["track"] != TRACK_ID or matrix["phase"] != "R2 Task 3 — Accounts unaudited-route security matrix":
        raise MatrixValidationError("MATRIX_TRACK_INVALID")
    _require_exact_keys(
        matrix["status"],
        {"acceptance", "owner", "reason"},
        "MATRIX_STATUS_INVALID",
    )
    if matrix["status"]["acceptance"] != "BLOCKED_PENDING_INDEPENDENT_REVIEW":
        raise MatrixValidationError("MATRIX_FALSE_ACCEPTANCE")

    expected_bundle = {
        "archive": _artifact_reference(R1_ARCHIVE_PATH),
        "manifest": _artifact_reference(R1_MANIFEST_PATH),
        "r2CompensationDenominator": _artifact_reference(R2_DENOMINATOR_PATH),
    }
    if matrix["sourceBundle"] != expected_bundle:
        raise MatrixValidationError("MATRIX_SOURCE_BUNDLE_TAMPERED")

    frozen_routes = _accounts_routes()
    expected_route_ids = [route["id"] for route in frozen_routes]
    _require_exact_keys(
        matrix["denominator"],
        {"routeCount", "routeIdsSha256", "selector"},
        "MATRIX_DENOMINATOR_INVALID",
    )
    if matrix["denominator"]["selector"] != {
        "pathPrefix": "apps/accounts/app/",
        "source": "r2-task2-compensation-denominator-20260731.json",
        "type": "route",
    }:
        raise MatrixValidationError("MATRIX_DENOMINATOR_SELECTOR_INVALID")
    if matrix["denominator"]["routeCount"] != len(frozen_routes):
        raise MatrixValidationError("MATRIX_ROUTE_COUNT_MISMATCH")
    if matrix["denominator"]["routeIdsSha256"] != _sha256(_canonical(expected_route_ids)):
        raise MatrixValidationError("MATRIX_ROUTE_ID_DIGEST_MISMATCH")

    assertions = _validate_assertion_catalog(matrix["assertionCatalog"])
    tests = _validate_test_catalog(matrix["testCatalog"])
    _validate_route_matrix(matrix["routeMatrix"], frozen_routes, assertions, tests)
    _validate_gates(matrix["gateResults"])


def _validate_assertion_catalog(value: Any) -> dict[str, dict[str, Any]]:
    """Checks frozen source assertions and returns them indexed by ID.

    @param value The assertion catalog.
    @returns Catalog assertions keyed by immutable ID.
    @throws MatrixValidationError When an assertion lacks a frozen, testable anchor.
    """
    if not isinstance(value, list) or not value:
        raise MatrixValidationError("MATRIX_ASSERTION_CATALOG_MISSING")
    sources, manifest = _load_frozen_sources()
    index: dict[str, dict[str, Any]] = {}
    for assertion in value:
        _require_exact_keys(
            assertion,
            {"forbiddenSnippets", "id", "lineEnd", "lineStart", "path", "requiredSnippets", "sourceRangeSha256"},
            "MATRIX_ASSERTION_INVALID",
        )
        assertion_id = assertion["id"]
        if not isinstance(assertion_id, str) or not assertion_id or assertion_id in index:
            raise MatrixValidationError("MATRIX_ASSERTION_ID_INVALID")
        path = assertion["path"]
        if not isinstance(path, str) or path not in sources or path not in manifest:
            raise MatrixValidationError("MATRIX_ASSERTION_PATH_NOT_FROZEN")
        selected = _source_range(sources[path], assertion["lineStart"], assertion["lineEnd"])
        if assertion["sourceRangeSha256"] != _sha256(selected):
            raise MatrixValidationError("MATRIX_ASSERTION_DIGEST_MISMATCH")
        text = selected.decode("utf-8")
        if not all(isinstance(snippet, str) and snippet in text for snippet in assertion["requiredSnippets"]):
            raise MatrixValidationError("MATRIX_ASSERTION_REQUIRED_SNIPPET_MISSING")
        if any(not isinstance(snippet, str) or snippet in text for snippet in assertion["forbiddenSnippets"]):
            raise MatrixValidationError("MATRIX_ASSERTION_FORBIDDEN_SNIPPET_PRESENT")
        index[assertion_id] = assertion
    return index


def _validate_test_catalog(value: Any) -> dict[str, dict[str, Any]]:
    """Checks executable-test citations against their frozen test source.

    @param value The executable test catalog.
    @returns Catalog test citations keyed by ID.
    @throws MatrixValidationError When a citation is not a frozen test assertion.
    """
    if not isinstance(value, list) or not value:
        raise MatrixValidationError("MATRIX_TEST_CATALOG_MISSING")
    sources, manifest = _load_frozen_sources()
    index: dict[str, dict[str, Any]] = {}
    for test in value:
        _require_exact_keys(
            test,
            {"id", "path", "requiredTestTitle", "sourceSha256"},
            "MATRIX_TEST_CITATION_INVALID",
        )
        test_id = test["id"]
        path = test["path"]
        if not isinstance(test_id, str) or not test_id or test_id in index:
            raise MatrixValidationError("MATRIX_TEST_CITATION_ID_INVALID")
        if not isinstance(path, str) or not path.endswith((".test.ts", ".test.tsx")):
            raise MatrixValidationError("MATRIX_TEST_CITATION_NOT_A_TEST")
        if path not in sources or path not in manifest:
            raise MatrixValidationError("MATRIX_TEST_CITATION_PATH_NOT_FROZEN")
        if test["sourceSha256"] != manifest[path]["sha256"]:
            raise MatrixValidationError("MATRIX_TEST_CITATION_DIGEST_MISMATCH")
        if not isinstance(test["requiredTestTitle"], str) or test["requiredTestTitle"] not in sources[path].decode("utf-8"):
            raise MatrixValidationError("MATRIX_TEST_CITATION_TITLE_MISSING")
        index[test_id] = test
    return index


def _validate_route_matrix(
    value: Any,
    frozen_routes: list[dict[str, Any]],
    assertions: dict[str, dict[str, Any]],
    tests: dict[str, dict[str, Any]],
) -> None:
    """Checks complete per-route source bindings and all security dispositions.

    @param value The candidate route matrix.
    @param frozen_routes The R2 Accounts route denominator.
    @param assertions The validated frozen source assertions.
    @param tests The validated executable test citations.
    @returns Nothing.
    @throws MatrixValidationError When a route or a required disposition is missing.
    """
    if not isinstance(value, list) or not value:
        raise MatrixValidationError("MATRIX_ROUTES_MISSING")
    frozen_by_id = {route["id"]: route for route in frozen_routes}
    actual_ids: list[str] = []
    sources, manifest = _load_frozen_sources()
    for route in value:
        _require_exact_keys(route, {"dispositions", "frozenAnchor", "id", "name"}, "MATRIX_ROUTE_INVALID")
        route_id = route["id"]
        if not isinstance(route_id, str) or route_id in actual_ids or route_id not in frozen_by_id:
            raise MatrixValidationError("MATRIX_ROUTE_ID_INVALID")
        actual_ids.append(route_id)
        source = frozen_by_id[route_id]
        if route["name"] != source["name"]:
            raise MatrixValidationError("MATRIX_ROUTE_NAME_MISMATCH")
        anchor = _require_exact_keys(
            route["frozenAnchor"],
            {
                "anchorProvenance",
                "declarationAnchor",
                "denominatorEntrySha256",
                "fingerprint",
                "frozenFile",
                "lineEnd",
                "lineStart",
                "path",
                "sourceRangeSha256",
            },
            "MATRIX_ROUTE_ANCHOR_INVALID",
        )
        for key in ("anchorProvenance", "declarationAnchor", "fingerprint", "lineEnd", "lineStart", "path", "sourceRangeSha256"):
            if anchor[key] != source[key]:
                raise MatrixValidationError("MATRIX_ROUTE_ANCHOR_MISMATCH")
        if anchor["denominatorEntrySha256"] != _sha256(_canonical(source)):
            raise MatrixValidationError("MATRIX_ROUTE_DENOMINATOR_DIGEST_MISMATCH")
        path = source["path"]
        expected_file = {"sha256": manifest[path]["sha256"], "size": manifest[path]["size"]}
        if anchor["frozenFile"] != expected_file:
            raise MatrixValidationError("MATRIX_ROUTE_FILE_DIGEST_MISMATCH")
        selected = _source_range(sources[path], source["lineStart"], source["lineEnd"])
        if _sha256(selected) != source["sourceRangeSha256"]:
            raise MatrixValidationError("MATRIX_ROUTE_RANGE_DIGEST_MISMATCH")
        if _sha256(_canonical(source["declarationAnchor"])) != source["fingerprint"]:
            raise MatrixValidationError("MATRIX_ROUTE_FINGERPRINT_MISMATCH")
        _validate_dispositions(route["dispositions"], assertions, tests)
    if actual_ids != [route["id"] for route in frozen_routes]:
        raise MatrixValidationError("MATRIX_ROUTE_SET_INCOMPLETE")


def _validate_dispositions(
    value: Any,
    assertions: dict[str, dict[str, Any]],
    tests: dict[str, dict[str, Any]],
) -> None:
    """Checks that every required security dimension has non-vacuous evidence.

    @param value The route security dispositions.
    @param assertions The source assertions available to cite.
    @param tests The executable tests available to cite.
    @returns Nothing.
    @throws MatrixValidationError When a disposition is missing or overclaims acceptance.
    """
    if not isinstance(value, dict) or set(value) != set(DIMENSIONS):
        raise MatrixValidationError("MATRIX_SECURITY_DIMENSION_MISSING")
    for dimension in DIMENSIONS:
        disposition = _require_exact_keys(
            value[dimension],
            {"acceptance", "assertionIds", "disposition", "findingId", "testIds"},
            "MATRIX_DISPOSITION_INVALID",
        )
        if not isinstance(disposition["disposition"], str) or not disposition["disposition"]:
            raise MatrixValidationError("MATRIX_DISPOSITION_UNEXPLAINED")
        assertion_ids = disposition["assertionIds"]
        test_ids = disposition["testIds"]
        if not isinstance(assertion_ids, list) or not isinstance(test_ids, list):
            raise MatrixValidationError("MATRIX_DISPOSITION_EVIDENCE_INVALID")
        if not assertion_ids and not test_ids:
            raise MatrixValidationError("MATRIX_DISPOSITION_EVIDENCE_MISSING")
        if len(set(assertion_ids)) != len(assertion_ids) or not all(item in assertions for item in assertion_ids):
            raise MatrixValidationError("MATRIX_DISPOSITION_ASSERTION_INVALID")
        if len(set(test_ids)) != len(test_ids) or not all(item in tests for item in test_ids):
            raise MatrixValidationError("MATRIX_DISPOSITION_TEST_INVALID")
        if disposition["acceptance"] == "BLOCKING_GAP":
            if not isinstance(disposition["findingId"], str) or not disposition["findingId"]:
                raise MatrixValidationError("MATRIX_BLOCKING_GAP_UNTRACKED")
        elif disposition["acceptance"] == "EVIDENCED_CANDIDATE":
            if disposition["findingId"] is not None:
                raise MatrixValidationError("MATRIX_EVIDENCED_DISPOSITION_HAS_FINDING")
        else:
            raise MatrixValidationError("MATRIX_DISPOSITION_ACCEPTANCE_INVALID")
        if dimension == "audit" and any(assertion_id.endswith("-no-audit") for assertion_id in assertion_ids):
            if disposition["acceptance"] != "BLOCKING_GAP":
                raise MatrixValidationError("MATRIX_AUDIT_GAP_LAUNDERED")


def _validate_gates(value: Any) -> None:
    """Checks the four required FR4 commands and their honest disposition.

    @param value The gate evidence object.
    @returns Nothing.
    @throws MatrixValidationError When a required command is omitted or false-green.
    """
    _require_exact_keys(value, {"commands", "disposition"}, "MATRIX_GATES_INVALID")
    if not isinstance(value["commands"], list) or len(value["commands"]) != len(EXPECTED_GATE_COMMANDS):
        raise MatrixValidationError("MATRIX_GATE_COUNT_INVALID")
    commands: list[tuple[str, ...]] = []
    exits: list[int] = []
    for result in value["commands"]:
        _require_exact_keys(result, {"command", "exitCode", "owner", "result"}, "MATRIX_GATE_RESULT_INVALID")
        command = result["command"]
        if not isinstance(command, list) or not all(isinstance(token, str) for token in command):
            raise MatrixValidationError("MATRIX_GATE_COMMAND_INVALID")
        commands.append(tuple(command))
        if not isinstance(result["exitCode"], int) or result["exitCode"] < 0:
            raise MatrixValidationError("MATRIX_GATE_EXIT_INVALID")
        exits.append(result["exitCode"])
        expected_result = "PASS" if result["exitCode"] == 0 else "FAIL"
        if result["result"] != expected_result:
            raise MatrixValidationError("MATRIX_GATE_FALSE_GREEN")
        if not isinstance(result["owner"], str) or not result["owner"]:
            raise MatrixValidationError("MATRIX_GATE_OWNER_MISSING")
    if tuple(commands) != EXPECTED_GATE_COMMANDS:
        raise MatrixValidationError("MATRIX_GATE_COMMAND_SET_INVALID")
    expected_disposition = "ALL_REQUIRED_GATES_PASSED" if all(exit_code == 0 for exit_code in exits) else "FAILED_GATES_BLOCK_ACCEPTANCE"
    if value["disposition"] != expected_disposition:
        raise MatrixValidationError("MATRIX_GATE_DISPOSITION_FALSE")


class R2AccountsSecurityMatrixTests(unittest.TestCase):
    """Verifies the complete, frozen, and fail-closed Accounts route matrix."""

    maxDiff = None

    def test_matrix_is_complete_and_bound_to_r1_and_r2(self) -> None:
        """Accepts only the complete exact Accounts route subset from R2."""
        _validate_matrix(_load_json(MATRIX_PATH))
        self.assertGreaterEqual(len(_accounts_routes()), 17)

    def test_route_anchors_replay_against_frozen_archive_bytes(self) -> None:
        """Recomputes every route anchor digest without reading live application source."""
        matrix = _load_json(MATRIX_PATH)
        sources, _ = _load_frozen_sources()
        for route in matrix["routeMatrix"]:
            with self.subTest(route=route["id"]):
                anchor = route["frozenAnchor"]
                selected = _source_range(sources[anchor["path"]], anchor["lineStart"], anchor["lineEnd"])
                self.assertEqual(_sha256(selected), anchor["sourceRangeSha256"])
                self.assertEqual(_sha256(_canonical(anchor["declarationAnchor"])), anchor["fingerprint"])

    def test_tamper_and_counterexample_mutations_fail_closed(self) -> None:
        """Rejects omitted routes, altered anchors, false-green gates, and audit-gap laundering."""
        matrix = _load_json(MATRIX_PATH)
        mutations: tuple[tuple[str, Any], ...] = (
            ("omitted route", lambda value: value["routeMatrix"].pop()),
            ("duplicate route", lambda value: value["routeMatrix"].append(copy.deepcopy(value["routeMatrix"][0]))),
            ("tampered frozen range", lambda value: value["routeMatrix"][0]["frozenAnchor"].__setitem__("sourceRangeSha256", "0" * 64)),
            ("unexplained authorization", lambda value: value["routeMatrix"][0]["dispositions"]["permissionOwnership"].update({"assertionIds": [], "testIds": []})),
            ("false green failed gate", lambda value: value["gateResults"]["commands"][0].update({"exitCode": 1, "result": "PASS"})),
            ("audit gap laundering", lambda value: value["routeMatrix"][8]["dispositions"]["audit"].update({"acceptance": "EVIDENCED_CANDIDATE", "findingId": None})),
            ("unknown top-level field", lambda value: value.__setitem__("producerApproval", True)),
        )
        for name, mutate in mutations:
            with self.subTest(mutation=name):
                candidate = copy.deepcopy(matrix)
                mutate(candidate)
                with self.assertRaises(MatrixValidationError):
                    _validate_matrix(candidate)


if __name__ == "__main__":
    unittest.main()
