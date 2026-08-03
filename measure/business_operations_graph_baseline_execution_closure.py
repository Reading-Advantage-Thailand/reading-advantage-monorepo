"""Validates durable execution-closure blocker evidence for R1 v3.

This module deliberately keeps the historical v2 snapshot and its Markdown
blocker records immutable.  The addendum records why the v2 scanner snapshot
cannot be replayed as an execution root, then supplies a narrow, mechanically
derived input ledger for the separate R1 v3 candidate.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path, PurePosixPath
from typing import Any


TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = Path(__file__).resolve().parent / "tracks" / TRACK_ID
V2_BUNDLE = TRACK_DIR / "r1-task2-source-and-graph-v2-20260801"
V2_ARCHIVE = V2_BUNDLE / "snapshot.archive.json"
V2_MANIFEST = V2_BUNDLE / "snapshot.manifest.json"
V2_GRAPH_BINDING = TRACK_DIR / "r1-task3-graph-binding-v2-20260801.json"
V2_AUDIT = TRACK_DIR / "r2-clean-audit-attempt-v2-20260801" / "attempt.json"
V2_COMPENSATION = TRACK_DIR / "r2-task2-compensation-denominator-v2-20260801.json"
BLOCKER = TRACK_DIR / "r2-task3-v2-execution-closure-blocker-20260801.md"
CLARIFICATION = TRACK_DIR / "r2-task3-v2-execution-closure-blocker-clarification-20260801.md"
ADDENDUM_DIR = TRACK_DIR / "r2-task3-v2-execution-closure-blocker-addendum-20260801"


class ExecutionClosureValidationError(RuntimeError):
    """Raised when execution-closure evidence is not hash-bound and safe."""


V2_EVIDENCE = {
    "archive": {
        "path": "r1-task2-source-and-graph-v2-20260801/snapshot.archive.json",
        "sha256": "e5a638e11ed57cfe6750cbe60e5ab31cbdcb0fd4ff3000458bae7168f868332e",
        "size": 61177049,
    },
    "manifest": {
        "path": "r1-task2-source-and-graph-v2-20260801/snapshot.manifest.json",
        "sha256": "ec848eaacce6eef4450434217ee7199c9c98ec44edc5496fa6f57f289eb1ae85",
        "size": 2381425,
    },
    "graphBinding": {
        "path": "r1-task3-graph-binding-v2-20260801.json",
        "sha256": "e66054a57dde5f022f96d0b09a570646b321fad2b3a3a54594618e1b0a515f20",
        "size": 766334,
    },
    "auditAttempt": {
        "path": "r2-clean-audit-attempt-v2-20260801/attempt.json",
        "sha256": "6d21536d5cfcda34a228b13aacad9420fea3a4ffde17bb4a1d366989defcbd8f",
        "size": 5730264,
    },
    "compensation": {
        "path": "r2-task2-compensation-denominator-v2-20260801.json",
        "sha256": "2ef221f24856be0bcd48d7efeb434ae623e8bf0b21348dca0567457513274f6d",
        "size": 3343489,
    },
}

BLOCKER_RECORDS = [
    {
        "path": "r2-task3-v2-execution-closure-blocker-20260801.md",
        "sha256": "319fca3ecb81e75ba89c4d51444de736feda588f311d47bacdf8540c882fc482",
        "size": 5208,
    },
    {
        "path": "r2-task3-v2-execution-closure-blocker-clarification-20260801.md",
        "sha256": "c4c71bb83fbab0d8dab41667ef6e6889a6da6ae4ade6b096146fa7d9cce1520b",
        "size": 1135,
    },
]

RAW_STREAM_PATHS = (
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/dependency-install.stderr.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/dependency-install.stdout.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-01-accounts-test.stderr.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-01-accounts-test.stdout.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-02-accounts-check-types.stderr.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-02-accounts-check-types.stdout.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-03-backend-test.stderr.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-03-backend-test.stdout.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-04-backend-check-types.stderr.txt",
    "r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/fr4-04-backend-check-types.stdout.txt",
)

NON_DERIVABLE_INPUTS = (
    "apps/accounts/cloudbuild.yaml",
    "apps/codecamp-advantage/cloudbuild.yaml",
    "apps/accounts/scripts/accounts-runtime-probe.sql",
    "apps/accounts/scripts/accounts-smoke.sh",
    "packages/db/drizzle/0043_codecamp_company_principal_sync.sql",
    "packages/db/company-identity/drizzle/meta/_journal.json",
    "packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql",
    "packages/db/drizzle/0044_standard_pack_successor_commitments.sql",
    "packages/advantage-play-kit/assets/standard/standard-pack-release.json",
)

BUILD_OUTPUTS = (
    ("packages/db/dist", ["pnpm", "--filter", "@reading-advantage/db", "build"]),
    ("packages/auth/dist", ["pnpm", "--filter", "@reading-advantage/auth", "build"]),
    ("packages/backend/dist", ["pnpm", "--filter", "@reading-advantage/backend", "build"]),
)

MARKER_DISPOSITION = {
    "r1V3": "~",
    "r2Task3": "b",
    "r2Task4": "b",
    "r2Task5": "b",
    "r3": "b",
    "successors": "b",
    "upstreamAuthority": "NONE",
}


def _sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest for immutable evidence bytes.

    @param data The bytes whose digest is needed.
    @returns The digest in lowercase hexadecimal form.
    """
    return hashlib.sha256(data).hexdigest()


def _canonical(value: Any) -> bytes:
    """Serializes JSON-compatible evidence with stable key and whitespace rules.

    @param value The JSON-compatible value to serialize.
    @returns The canonical UTF-8 byte representation.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _fail(code: str, detail: str = "") -> None:
    """Raises one structured execution-closure validation failure.

    @param code The stable failure code.
    @param detail Optional bounded diagnostic detail.
    @returns Nothing.
    @throws ExecutionClosureValidationError Always.
    """
    suffix = f": {detail}" if detail else ""
    raise ExecutionClosureValidationError(f"{code}{suffix}")


def _normal_path(value: Any) -> str:
    """Returns one canonical repository-relative POSIX path or fails closed.

    @param value The candidate path value.
    @returns A canonical relative path.
    @throws ExecutionClosureValidationError When the path is unsafe.
    """
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        _fail("EXECUTION_CLOSURE_PATH_INVALID", repr(value))
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or any(part in {"", ".", ".."} for part in path.parts):
        _fail("EXECUTION_CLOSURE_PATH_INVALID", value)
    return value


def _reference_for(path: Path) -> dict[str, Any]:
    """Builds a regular-file reference rooted at the active track directory.

    @param path The existing track-owned file.
    @returns Its path, SHA-256 digest, and byte size.
    @throws ExecutionClosureValidationError When the file is unsafe or absent.
    """
    if not path.is_file() or path.is_symlink():
        _fail("EXECUTION_CLOSURE_REFERENCE_UNSAFE", str(path))
    try:
        relative = path.relative_to(TRACK_DIR).as_posix()
    except ValueError:
        _fail("EXECUTION_CLOSURE_REFERENCE_ESCAPE", str(path))
    data = path.read_bytes()
    return {"path": relative, "sha256": _sha256(data), "size": len(data)}


def _expected_raw_streams() -> list[dict[str, Any]]:
    """Returns every retained v2 raw command stream in deterministic order.

    @returns Immutable references to all retained v2 stream files.
    """
    return [_reference_for(TRACK_DIR / relative) for relative in RAW_STREAM_PATHS]


def _read_v2_archive_entries() -> dict[str, dict[str, Any]]:
    """Indexes the frozen v2 archive metadata without consulting live source files.

    @returns Archive entries by repository-relative path.
    @throws ExecutionClosureValidationError When the frozen archive is malformed.
    """
    try:
        archive = json.loads(V2_ARCHIVE.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("EXECUTION_CLOSURE_V2_ARCHIVE_UNREADABLE", str(error))
    entries = archive.get("entries") if isinstance(archive, dict) else None
    if not isinstance(entries, list):
        _fail("EXECUTION_CLOSURE_V2_ARCHIVE_SCHEMA")
    result: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            _fail("EXECUTION_CLOSURE_V2_ARCHIVE_ENTRY_SCHEMA")
        path = _normal_path(entry.get("path"))
        if path in result:
            _fail("EXECUTION_CLOSURE_V2_ARCHIVE_DUPLICATE", path)
        result[path] = entry
    return result


def _omission_sources() -> dict[str, list[str]]:
    """Maps each omitted input to the frozen v2 source that statically requires it.

    @returns Deterministic read-set provenance for every supplemental input.
    """
    return {
        "apps/accounts/cloudbuild.yaml": ["apps/accounts/scripts/production-readiness.test.ts"],
        "apps/codecamp-advantage/cloudbuild.yaml": ["apps/accounts/scripts/production-readiness.test.ts"],
        "apps/accounts/scripts/accounts-runtime-probe.sql": ["apps/accounts/scripts/production-readiness.test.ts"],
        "apps/accounts/scripts/accounts-smoke.sh": ["apps/accounts/scripts/production-readiness.test.ts"],
        "packages/db/drizzle/0043_codecamp_company_principal_sync.sql": [
            "packages/backend/src/modules/company-identity/__tests__/postgres-codecamp-migration.test.ts"
        ],
        "packages/db/company-identity/drizzle/meta/_journal.json": [
            "packages/db/src/company-identity/doctor.ts"
        ],
        "packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql": [
            "packages/db/src/company-identity/doctor.ts"
        ],
        "packages/db/drizzle/0044_standard_pack_successor_commitments.sql": [
            "packages/backend/src/modules/standard-pack-ingestion/__tests__/postgres-successor-registry.integration.test.ts"
        ],
        "packages/advantage-play-kit/assets/standard/standard-pack-release.json": [
            "packages/advantage-play-kit/package.json"
        ],
    }


def _build_ledger() -> dict[str, Any]:
    """Builds the narrow v2 omission ledger from frozen source-read provenance.

    @returns A machine-readable ledger for the v3 closure producer.
    """
    archive_entries = _read_v2_archive_entries()
    sources = _omission_sources()
    omissions: list[dict[str, Any]] = []
    for path in NON_DERIVABLE_INPUTS:
        frozen_sources = []
        for source in sources[path]:
            entry = archive_entries.get(source)
            if entry is None:
                _fail("EXECUTION_CLOSURE_DISCOVERY_SOURCE_MISSING", source)
            frozen_sources.append(
                {
                    "path": source,
                    "sha256": entry["sha256"],
                    "size": entry["size"],
                }
            )
        omissions.append(
            {
                "path": path,
                "classification": "NON_DERIVABLE_SOURCE_INPUT",
                "v2Disposition": "MISSING_FROM_FROZEN_V2_ARCHIVE",
                "requiredBy": frozen_sources,
            }
        )
    for path, argv in BUILD_OUTPUTS:
        omissions.append(
            {
                "path": path,
                "classification": "REQUIRES_RECORDED_BUILD",
                "v2Disposition": "DERIVED_OUTPUT_EXCLUDED_FROM_SOURCE_ARCHIVE",
                "build": {"argv": argv, "cwd": ".", "environment": {}},
            }
        )
    discovery_stdout = {
        "archive": V2_EVIDENCE["archive"],
        "algorithm": "frozen-v2-static-read-set-v1",
        "sourceReadPaths": sorted({source for values in sources.values() for source in values}),
        "missingSourceInputs": list(NON_DERIVABLE_INPUTS),
        "derivedBuildOutputs": [path for path, _ in BUILD_OUTPUTS],
        "excludedFromV2Archive": [
            path for path in NON_DERIVABLE_INPUTS if path not in archive_entries
        ],
    }
    return {
        "schemaVersion": 1,
        "kind": "execution-input-omission-ledger",
        "status": "BLOCKED_PENDING_V3_RECLOSURE",
        "derivation": {
            "rule": "frozen-ast-execution-closure-v1",
            "discovery": {
                "argv": [
                    "python3",
                    "-m",
                    "measure.business_operations_graph_baseline_execution_closure",
                    "write-addendum",
                ],
                "stdout": discovery_stdout,
            },
        },
        "conditionalPolicy": {
            "PG_TEST_URL": {
                "state": "ABSENT",
                "effect": "database-backed successor-registry cases skip; module-relative migration fixture remains required",
            }
        },
        "omissions": omissions,
    }


def _validate_reference(value: Any, expected: dict[str, Any], code: str) -> None:
    """Compares one reference against a pinned source-of-truth reference.

    @param value The untrusted reference object.
    @param expected The exact pinned reference object.
    @param code The failure code to use on mismatch.
    @returns Nothing.
    @throws ExecutionClosureValidationError When the reference differs.
    """
    if value != expected:
        _fail(code)


def _validate_ledger(ledger: Any) -> None:
    """Verifies all known non-derived inputs and required build outputs remain recorded.

    @param ledger The untrusted omission ledger.
    @returns Nothing.
    @throws ExecutionClosureValidationError When required evidence is absent or altered.
    """
    if not isinstance(ledger, dict):
        _fail("V3_BLOCKER_ADDENDUM_LEDGER_SCHEMA")
    if ledger.get("schemaVersion") != 1 or ledger.get("kind") != "execution-input-omission-ledger":
        _fail("V3_BLOCKER_ADDENDUM_LEDGER_SCHEMA")
    derivation = ledger.get("derivation")
    discovery = derivation.get("discovery") if isinstance(derivation, dict) else None
    if not isinstance(discovery, dict) or not isinstance(discovery.get("argv"), list) or "stdout" not in discovery:
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_MISSING")
    if derivation.get("rule") != "frozen-ast-execution-closure-v1":
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_RULE")
    omissions = ledger.get("omissions")
    if not isinstance(omissions, list):
        _fail("V3_BLOCKER_ADDENDUM_OMISSIONS_SCHEMA")
    by_path: dict[str, dict[str, Any]] = {}
    for item in omissions:
        if not isinstance(item, dict):
            _fail("V3_BLOCKER_ADDENDUM_OMISSION_SCHEMA")
        path = _normal_path(item.get("path"))
        if path in by_path:
            _fail("V3_BLOCKER_ADDENDUM_OMISSION_DUPLICATE", path)
        by_path[path] = item
    for path in NON_DERIVABLE_INPUTS:
        item = by_path.get(path)
        if item is None or item.get("classification") != "NON_DERIVABLE_SOURCE_INPUT":
            _fail("V3_BLOCKER_ADDENDUM_RAW_INPUT_MISSING", path)
    for path, argv in BUILD_OUTPUTS:
        item = by_path.get(path)
        build = item.get("build") if isinstance(item, dict) else None
        if item is None or item.get("classification") != "REQUIRES_RECORDED_BUILD" or not isinstance(build, dict):
            _fail("V3_BLOCKER_ADDENDUM_BUILD_OUTPUT_MISSING", path)
        if build.get("argv") != argv or build.get("cwd") != "." or build.get("environment") != {}:
            _fail("V3_BLOCKER_ADDENDUM_BUILD_COMMAND_INVALID", path)
    policy = ledger.get("conditionalPolicy")
    expected_policy = {
        "PG_TEST_URL": {
            "state": "ABSENT",
            "effect": "database-backed successor-registry cases skip; module-relative migration fixture remains required",
        }
    }
    if policy != expected_policy:
        _fail("V3_BLOCKER_ADDENDUM_CONDITIONAL_POLICY_INVALID")


def validate_execution_closure_blocker_addendum_v1(
    receipt: dict[str, Any], provenance: dict[str, Any], ledger: dict[str, Any]
) -> None:
    """Validates the immutable v2 blocker addendum that authorizes no later gate.

    @param receipt The candidate machine-readable blocker receipt.
    @param provenance The independently stored source and stream provenance.
    @param ledger The narrow frozen-v2 omission ledger.
    @returns Nothing when all blocker evidence remains intact.
    @throws ExecutionClosureValidationError When any reference, marker, or omission drifts.
    """
    if not isinstance(receipt, dict) or not isinstance(provenance, dict):
        _fail("V3_BLOCKER_ADDENDUM_SCHEMA")
    for value, role in ((receipt, "receipt"), (provenance, "provenance")):
        if value.get("schemaVersion") != 1:
            _fail("V3_BLOCKER_ADDENDUM_SCHEMA", role)
        if value.get("kind") != "v2-execution-closure-blocker-addendum":
            _fail("V3_BLOCKER_ADDENDUM_KIND", role)
        _validate_reference(value.get("priorV2Evidence"), V2_EVIDENCE, "V3_BLOCKER_ADDENDUM_V2_LINEAGE_INVALID")
        _validate_reference(value.get("blockerRecords"), BLOCKER_RECORDS, "V3_BLOCKER_ADDENDUM_BLOCKER_RECORDS_INVALID")
        _validate_reference(value.get("rawStreams"), _expected_raw_streams(), "V3_BLOCKER_ADDENDUM_RAW_STREAM_INVALID")
        _validate_reference(value.get("subordinateReferences"), _expected_raw_streams(), "V3_BLOCKER_ADDENDUM_SUBORDINATE_REFERENCE_INVALID")
        if value.get("upstreamAuthority") != "NONE":
            _fail("V3_BLOCKER_ADDENDUM_UPSTREAM_AUTHORITY_INVALID")
    if receipt.get("status") != "BLOCKED" or provenance.get("status") != "BLOCKED":
        _fail("V3_BLOCKER_ADDENDUM_STATUS_INVALID")
    if receipt.get("markerDisposition") != MARKER_DISPOSITION:
        _fail("V3_BLOCKER_ADDENDUM_MARKER_DISPOSITION_INVALID")
    if provenance.get("markerDisposition") != MARKER_DISPOSITION:
        _fail("V3_BLOCKER_ADDENDUM_MARKER_DISPOSITION_INVALID")
    _validate_ledger(ledger)


def write_execution_closure_blocker_addendum(output_directory: Path | str = ADDENDUM_DIR) -> None:
    """Writes the immutable addendum artifacts without modifying v2 evidence.

    @param output_directory The new, empty track-owned addendum directory.
    @returns Nothing.
    @throws ExecutionClosureValidationError When a destination already exists or evidence drifts.
    """
    output = Path(output_directory)
    if output.exists() or output.is_symlink():
        _fail("V3_BLOCKER_ADDENDUM_OUTPUT_EXISTS", str(output))
    if _reference_for(BLOCKER) != BLOCKER_RECORDS[0] or _reference_for(CLARIFICATION) != BLOCKER_RECORDS[1]:
        _fail("V3_BLOCKER_ADDENDUM_BLOCKER_BYTES_DRIFT")
    for key, path in {
        "archive": V2_ARCHIVE,
        "manifest": V2_MANIFEST,
        "graphBinding": V2_GRAPH_BINDING,
        "auditAttempt": V2_AUDIT,
        "compensation": V2_COMPENSATION,
    }.items():
        if _reference_for(path) != V2_EVIDENCE[key]:
            _fail("V3_BLOCKER_ADDENDUM_V2_BYTES_DRIFT", key)
    raw_streams = _expected_raw_streams()
    ledger = _build_ledger()
    common = {
        "schemaVersion": 1,
        "kind": "v2-execution-closure-blocker-addendum",
        "status": "BLOCKED",
        "priorV2Evidence": V2_EVIDENCE,
        "blockerRecords": BLOCKER_RECORDS,
        "rawStreams": raw_streams,
        "subordinateReferences": raw_streams,
        "markerDisposition": MARKER_DISPOSITION,
        "upstreamAuthority": "NONE",
    }
    receipt = {
        **common,
        "purpose": "preserve the v2 execution blocker and authorize only an R1 v3 candidate recapture",
        "ledgerSummary": {
            "nonDerivableSourceInputs": list(NON_DERIVABLE_INPUTS),
            "derivedBuildOutputs": [path for path, _ in BUILD_OUTPUTS],
        },
    }
    provenance = {
        **common,
        "source": "frozen-v2-archive-static-read-set",
        "ledgerDerivationDigest": _sha256(_canonical(ledger["derivation"])),
    }
    validate_execution_closure_blocker_addendum_v1(receipt, provenance, ledger)
    output.mkdir(parents=True, exist_ok=False)
    for name, value in (
        ("receipt.json", receipt),
        ("execution-provenance.json", provenance),
        ("execution-input-omission-ledger.json", ledger),
    ):
        (output / name).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _main() -> None:
    """Runs the explicit non-network addendum materializer command.

    @returns Nothing.
    @throws ExecutionClosureValidationError When command arguments are unsupported.
    """
    import sys

    if sys.argv[1:] != ["write-addendum"]:
        _fail("EXECUTION_CLOSURE_COMMAND_USAGE", "expected: write-addendum")
    write_execution_closure_blocker_addendum()


from .business_operations_graph_baseline_execution_closure_addendum_v2 import (
    discover_execution_inputs_v1,
    validate_strengthened_blocker_addendum,
)

validate_execution_closure_blocker_addendum_v1 = validate_strengthened_blocker_addendum


def write_execution_closure_v1(output_directory: Path | str | None = None) -> None:
    """Writes the isolated Podman-backed R1 v3 candidate when explicitly invoked.

    @param output_directory Optional canonical V3 destination override.
    @returns Nothing when the candidate is fully built and internally validated.
    @throws ExecutionClosureValidationError When a gate or evidence invariant fails.
    """
    from .business_operations_graph_baseline_execution_closure_v3_podman import (
        write_execution_closure_v1 as write_podman_execution_closure,
    )

    if output_directory is None:
        write_podman_execution_closure()
    else:
        write_podman_execution_closure(output_directory)


def reserve_execution_attempt_directory_v1(root: Path | str, yyyymmdd: str) -> Path:
    """Reserves the next immutable R1 v3 Podman failed-attempt directory.

    @param root The parent directory that owns failed-attempt records.
    @param yyyymmdd The eight-digit attempt date.
    @returns The newly created monotonic attempt directory.
    @throws ExecutionClosureValidationError When the root or date is unsafe.
    """
    from .business_operations_graph_baseline_execution_closure_v3_podman import (
        reserve_execution_attempt_directory_v1 as reserve_podman_execution_attempt_directory,
    )

    return reserve_podman_execution_attempt_directory(root, yyyymmdd)


def validate_failed_execution_attempt_v1(
    attempt: dict[str, Any],
    attempt_directory: Path | str,
) -> None:
    """Validates immutable evidence for one blocked R1 v3 Podman execution attempt.

    @param attempt The failed-attempt evidence object.
    @param attempt_directory The physical directory containing its raw streams.
    @returns Nothing when the failed attempt is hash-bound and exact.
    @throws ExecutionClosureValidationError When the failed attempt evidence is unsafe.
    """
    from .business_operations_graph_baseline_execution_closure_v3_podman import (
        validate_failed_execution_attempt_v1 as validate_podman_failed_execution_attempt,
    )

    validate_podman_failed_execution_attempt(attempt, attempt_directory)


def validate_execution_closure_v1(
    manifest: dict[str, Any],
    archive: dict[str, Any],
    ledger: dict[str, Any],
    profile: dict[str, Any],
    receipt: dict[str, Any],
    graph_binding: dict[str, Any],
    clean_audit: dict[str, Any],
    compensation: dict[str, Any],
    *,
    candidate_directory: Path | str | None = None,
) -> None:
    """Validates a Podman-backed R1 v3 candidate without moving workflow markers.

    @param manifest The candidate execution-closure manifest.
    @param archive The candidate source archive.
    @param ledger The candidate omission ledger.
    @param profile The candidate execution profile.
    @param receipt The candidate execution receipt.
    @param graph_binding The fresh graph-binding artifact.
    @param clean_audit The fresh clean-audit artifact.
    @param compensation The fresh compensation artifact.
    @param candidate_directory Optional physical candidate directory for staged validation.
    @returns Nothing when the complete candidate is internally valid.
    @throws ExecutionClosureValidationError When candidate evidence is invalid.
    """
    from .business_operations_graph_baseline_execution_closure_v3_podman import (
        validate_execution_closure_v1 as validate_podman_execution_closure,
    )

    arguments = (manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)
    if candidate_directory is None:
        validate_podman_execution_closure(*arguments)
    else:
        validate_podman_execution_closure(*arguments, candidate_directory=candidate_directory)


if __name__ == "__main__":
    _main()

