#!/usr/bin/env python3
"""Read-only cumulative admission contract for T8 Phase 2 provenance outputs.

It hash-binds accepted Phase 1 bytes and frozen denominator records without
rerunning Phase 1's archived full-tree caller scan. It validates only exact
in-repository, Git-pinned provenance citations and explicit unknown handling.
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
FREEZE_PATH = TRACK / "phase2-input-freeze-v1.json"
PHASE0_FREEZE_PATH = TRACK / "phase0-input-freeze-v1.json"
DELTA_PATH = TRACK / "accepted-denominator-delta-v1.json"
CANDIDATE_DELTA_PATH = TRACK / "candidate-denominator-delta-v1.json"
ROLE_MANIFEST_PATH = TRACK / "phase0-role-ownership-manifest-v1.json"
EXPECTED_FREEZE_SHA256 = "385248641ba8d7dcaeedd3920f4d11f67071987be06d336f3a624f5a31f724c0"
EXPECTED_PHASE0_SHA256 = "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b"
EXPECTED_DELTA_SHA256 = "71592625cbe09671937b7406afa38f3f59232c0345de455467121dc038863db2"
BASE_PATH = "measure/tracks/apk_source_denominator_inventory_20260712/asset-file-denominator.json"
BASE_PUBLICATION_REVISION = "ba95e6fb1db6acdaecd0808ca1f22dec339d6c5d"
BASE_RECORD_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
DELTA_REVISION = "65fc00d872ce5aa63820662ee0a1f14952e63235"
BASE_DENOMINATOR_SHA256 = "41c9ede1a8e5ddab21b74a99959fbddc35b5f5a6902740a740a48f174bf7f438"
PHASE1_BINDINGS = {
    "phase1_contract": (TRACK / "phase1-contract-test.py", "9bd2d9b77bc313932549c1062d8ec14920b87db245f00a4c5b502be708c130b5"),
    "phase1_green_report": (TRACK / "phase1-green-test-report-v1.json", "43b82cb7bad24fb3b4b06e3c2051eaf4f4355cf15e947370ed7cfe6e6ef93e6d"),
    "caller_receipt": (TRACK / "role-receipts/phase1/caller-analyst.json", "fa5b875194082200d92864e50e9776279f4bf93d52e90acaee6b2c52238e83de"),
    "mechanical_independent_review": (TRACK / "phase1-independent-review-v2.json", "3a0c2be188882c8f9f91eee7de977b4caa2db43f9e76a1846ad06c7601e76b10"),
    "caller_independent_review": (TRACK / "phase1-caller-v22-independent-review.json", "545e6c821640af3781c31d565d7816819b794c88315b2f5126f6a25abbb1f7e1"),
    "v21_nonconsumable_disposition": (TRACK / "phase1-caller-v21-disposition.json", "61b5be388f805c96dffa33ad0b3b1d38ab7619fc3524de8e9d534da202a126ad"),
}
PHASE1_ROOT_PATH = TRACK / "phase1-root-acceptance.json"
PHASE1_ROOT_SHA256 = "2b30be13c8c0f6b7d1d404489c6058b48b6839f58d5ae2ce84b67f9d6a1a6d61"
ARTIFACT_KEYS = {"schema_version", "track_id", "batch_id", "input_binding", "producer", "records", "resource_usage"}
RECORD_KEYS = {"canonical_path", "sha256", "revision", "source_blob_oid", "identical_hash_group", "repository_introduction", "upstream_provenance", "license", "prospective_eligibility"}
STATE_KEYS = {"status", "citations", "unknown_rationale"}
CITATION_KEYS = {"source_type", "claim_scope", "source_revision", "source_path", "source_blob_oid", "line_start", "line_end", "locator_text_sha256", "mapping_scope", "target_paths"}
ELIGIBILITY_KEYS = {"reuse", "adapt", "reason_code"}
RECEIPT_KEYS = {"schema_version", "track_id", "batch_id", "role", "native_task_name", "declared_model", "fork_turns", "inherited_narrative", "allowed_input_manifest_sha256", "allowed_input_paths", "role_boundary", "output_file_hashes", "findings", "resource_usage", "final_status"}
SOURCE_TYPES = {"in_repo_sidecar", "in_repo_mapping", "in_repo_license", "repository_history"}
SCOPES = {"repository_introduction", "upstream_provenance", "license"}
SOURCE_SCOPE_POLICY = {"in_repo_sidecar": SCOPES, "in_repo_mapping": SCOPES, "in_repo_license": {"license"}, "repository_history": {"repository_introduction"}}
RESOURCE_KEYS = {"candidate_paths", "hash_groups", "evidence_records", "command_invocations", "bytes_read", "within_ceiling"}
FORBIDDEN_ELIGIBILITY_REASON_TERMS = {"phase4", "phase 4", "disposition", "suitability", "reusable", "adaptable", "reuse", "adapt"}
TRUTH_BOUNDARY = "Authored the Phase 2 admission freeze, cumulative read-only contract, Red report, counterexamples, and this receipt only. No candidate provenance, license, repository-introduction, inspection, suitability, disposition, reviewer, or lifecycle fact was authored. The contract requires provenance-auditor as the sole factual producer and an isolated receipt per frozen batch."
HEX40 = re.compile(r"[0-9a-f]{40}")
HEX64 = re.compile(r"[0-9a-f]{64}")


def fail(message: str) -> None:
    """Raise one concise, stable admission-contract failure."""
    raise AssertionError(message)


def digest(value: bytes) -> str:
    """Return a lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> dict:
    """Load a JSON object and reject non-object roots."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        fail(f"JSON root must be an object: {path.relative_to(REPO)}")
    return value


def exact_keys(value: object, expected: set[str], label: str) -> dict:
    """Return an object only when it has the exact closed schema keys."""
    if not isinstance(value, dict) or set(value) != expected:
        actual = set(value) if isinstance(value, dict) else set()
        fail(f"{label} keys differ; missing={sorted(expected - actual)} extra={sorted(actual - expected)}")
    return value


def git(*args: str) -> bytes:
    """Run a read-only Git query against the canonical checkout."""
    result = subprocess.run(["git", *args], cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        fail(f"git {' '.join(args)} failed: {result.stderr.decode(errors='replace').strip()}")
    return result.stdout


def output_paths(batch_ids: list[str]) -> dict[str, Path]:
    """Return the single permitted Phase 2 artifact path for every batch."""
    return {batch_id: TRACK / "batches" / batch_id / "provenance-audit.json" for batch_id in batch_ids}


def phase2_input_binding(batch_id: str) -> dict:
    """Return the immutable, batch-specific binding required in one artifact."""
    freeze = load_json(FREEZE_PATH)
    return {
        "phase2_input_freeze_sha256": EXPECTED_FREEZE_SHA256,
        "phase0_input_freeze_sha256": EXPECTED_PHASE0_SHA256,
        "phase1_root_acceptance_sha256": PHASE1_ROOT_SHA256,
        "phase1_batch_input_sha256": freeze["phase1_batch_inputs"][batch_id],
        "base_denominator_sha256": BASE_DENOMINATOR_SHA256,
        "accepted_delta_sha256": EXPECTED_DELTA_SHA256,
        "base_record_revision": BASE_RECORD_REVISION,
        "delta_revision": DELTA_REVISION,
        "effective_candidate_paths": 428,
        "effective_identical_hash_groups": 227,
    }


def assert_phase1_bindings() -> tuple[dict, dict, dict]:
    """Hash-bind accepted Phase 1 and frozen denominator inputs without re-running it."""
    if digest(FREEZE_PATH.read_bytes()) != EXPECTED_FREEZE_SHA256:
        fail("Phase 2 input freeze SHA-256 drift")
    if digest(PHASE0_FREEZE_PATH.read_bytes()) != EXPECTED_PHASE0_SHA256:
        fail("Phase 0 input freeze SHA-256 drift")
    if digest(DELTA_PATH.read_bytes()) != EXPECTED_DELTA_SHA256:
        fail("accepted denominator delta SHA-256 drift")
    if digest(PHASE1_ROOT_PATH.read_bytes()) != PHASE1_ROOT_SHA256:
        fail("accepted Phase 1 root acceptance SHA-256 drift")
    freeze = load_json(FREEZE_PATH)
    root = load_json(PHASE1_ROOT_PATH)
    phase0 = load_json(PHASE0_FREEZE_PATH)
    if (freeze["schema_version"], freeze["track_id"], freeze["phase"], freeze["admission_status"]) != ("apk-asset-forensics.phase2-input-freeze.v1", "apk_existing_asset_candidate_audit_20260712", "phase2", "red-admission-only"):
        fail("Phase 2 input freeze identity differs")
    if freeze["phase0_input_freeze"] != {"path": str(PHASE0_FREEZE_PATH.relative_to(REPO)), "sha256": EXPECTED_PHASE0_SHA256}:
        fail("Phase 2 Phase 0 binding differs")
    if freeze["phase1_acceptance"]["path"] != str(PHASE1_ROOT_PATH.relative_to(REPO)) or freeze["phase1_acceptance"]["sha256"] != PHASE1_ROOT_SHA256:
        fail("Phase 2 root-acceptance binding differs")
    expected_evidence = {name: {"path": str(path.relative_to(REPO)), "sha256": sha} for name, (path, sha) in PHASE1_BINDINGS.items()}
    if freeze["phase1_acceptance"]["accepted_evidence"] != expected_evidence:
        fail("Phase 2 accepted Phase 1 evidence binding differs")
    if root.get("accepted_evidence_sha256") != {name: sha for name, (_path, sha) in PHASE1_BINDINGS.items()}:
        fail("accepted Phase 1 root evidence map differs")
    batch_inputs = freeze.get("phase1_batch_inputs")
    if not isinstance(batch_inputs, dict) or set(batch_inputs) != {f"AF-{index:02d}" for index in range(1, 13)}:
        fail("Phase 2 per-batch predecessor hash set differs")
    for batch_id, inputs in batch_inputs.items():
        expected_paths = {str((TRACK / "batches" / batch_id / name).relative_to(REPO)) for name in ("candidate-records-base.json", "mechanical-metadata.json", "caller-inventory.json")}
        if not isinstance(inputs, dict) or set(inputs) != expected_paths:
            fail(f"Phase 2 predecessor input paths differ: {batch_id}")
        for relative_path, expected_sha in inputs.items():
            source = REPO / relative_path
            if not HEX64.fullmatch(expected_sha) or not source.is_file() or digest(source.read_bytes()) != expected_sha:
                fail(f"Phase 2 predecessor input hash drift: {batch_id}")
    if (root.get("phase"), root.get("decision"), root.get("denominator")) != ("phase1", "accepted", {"candidate_paths": 428, "identical_hash_groups": 227, "batches": 12}):
        fail("accepted Phase 1 root decision or denominator differs")
    for name, (path, expected_sha) in PHASE1_BINDINGS.items():
        if not path.is_file() or digest(path.read_bytes()) != expected_sha:
            fail(f"accepted Phase 1 evidence hash drift: {name}")
    if phase0["denominator"]["record_revision"] != DELTA_REVISION or (phase0["denominator"]["candidate_paths"], phase0["denominator"]["identical_hash_groups"]) != (428, 227):
        fail("frozen effective denominator differs")
    if digest(ROLE_MANIFEST_PATH.read_bytes()) != "bdffe7d8248b08ebe3b1226082970cd09ba180ddf469c5096db3bebe2f811e36":
        fail("Phase 0 role ownership manifest SHA-256 drift")
    manifest = load_json(ROLE_MANIFEST_PATH)
    task = next((item for item in manifest.get("tasks", []) if item.get("task_id") == "phase2-provenance"), None)
    expected_forbidden = ["evidence-collector", "mechanical-metadata-inspector", "caller-analyst", "visual-audio-inspector", "requirements-mapper", "truth-test-author", "adversarial-reviewer"]
    if not task or task.get("owner_role") != "provenance-auditor" or task.get("forbidden_roles") != expected_forbidden:
        fail("Phase 2 provenance ownership differs")
    if freeze.get("phase0_role_ownership_manifest") != {"path": str(ROLE_MANIFEST_PATH.relative_to(REPO)), "sha256": "bdffe7d8248b08ebe3b1226082970cd09ba180ddf469c5096db3bebe2f811e36"}:
        fail("Phase 2 role-ownership binding differs")
    ownership = freeze.get("ownership", {})
    if ownership.get("producer_role") != "provenance-auditor" or ownership.get("forbidden_producer_roles") != expected_forbidden or ownership.get("receipt_pattern") != "role-receipts/<batch-id>/provenance-auditor.json" or ownership.get("truth_author_receipt") != "role-receipts/phase2/truth-test-author.json":
        fail("Phase 2 frozen ownership policy differs")
    return freeze, phase0, load_json(CANDIDATE_DELTA_PATH)


def effective_records(candidate_delta: dict) -> dict[str, dict]:
    """Derive the frozen effective denominator from accepted committed records only."""
    base = json.loads(git("show", f"{BASE_PUBLICATION_REVISION}:{BASE_PATH}"))
    base_bytes = git("show", f"{BASE_PUBLICATION_REVISION}:{BASE_PATH}")
    if digest(base_bytes) != BASE_DENOMINATOR_SHA256:
        fail("committed T2 base denominator bytes drift")
    records = {item["canonical_path"]: dict(item) for item in base["candidate_files"]}
    for replacement in candidate_delta["changes"]["replacements"]:
        prior = records.get(replacement["canonical_path"])
        if not prior or prior["sha256"] != replacement["prior_sha256"]:
            fail("accepted replacement binding differs")
        records[replacement["canonical_path"]] = dict(replacement)
    for addition in candidate_delta["changes"]["additions"]:
        if addition["canonical_path"] in records:
            fail("accepted addition duplicates a base path")
        records[addition["canonical_path"]] = dict(addition)
    if len(records) != 428 or len({item["identical_hash_group"] for item in records.values()}) != 227:
        fail("derived effective denominator count differs")
    return records


def expected_batches(phase0: dict, records: dict[str, dict]) -> dict[str, set[str]]:
    """Derive exact immutable batch path sets from frozen hash-group boundaries."""
    groups: dict[str, set[str]] = {}
    for path, record in records.items():
        groups.setdefault(record["identical_hash_group"], set()).add(path)
    result: dict[str, set[str]] = {}
    used: set[str] = set()
    for batch in phase0["batch_strategy"]["batches"]:
        chosen = [group for group in sorted(groups) if batch["first_group"] <= group <= batch["last_group"]]
        paths = set().union(*(groups[group] for group in chosen))
        if (len(chosen), len(paths)) != (batch["group_count"], batch["path_count"]) or not chosen or chosen[0] != batch["first_group"] or chosen[-1] != batch["last_group"]:
            fail(f"frozen batch boundary differs: {batch['batch_id']}")
        if used & paths:
            fail("frozen batches overlap")
        used |= paths
        result[batch["batch_id"]] = paths
    if used != set(records):
        fail("frozen batches omit denominator paths")
    return result


def git_blob_oid(revision: str, path: str) -> str:
    """Resolve one source path to its exact Git blob OID at a pinned revision."""
    if not HEX40.fullmatch(revision) or not path or path.startswith("/") or ".." in Path(path).parts or "\x00" in path:
        fail("citation revision or path is malformed")
    raw = git("ls-tree", revision, "--", path).decode("utf-8", errors="strict").strip()
    if not raw:
        fail("citation source path is absent at its pinned revision")
    metadata, observed_path = raw.split("\t", 1)
    _mode, kind, oid = metadata.split()
    if kind != "blob" or observed_path != path or not HEX40.fullmatch(oid):
        fail("citation source is not one exact regular Git blob")
    return oid


def cited_range_hash(revision: str, path: str, line_start: int, line_end: int) -> str:
    """Hash an exact inclusive Git-blob line range with terminators removed."""
    if not isinstance(line_start, int) or not isinstance(line_end, int) or line_start < 1 or line_end < line_start:
        fail("citation line range is malformed")
    lines = git("show", f"{revision}:{path}").splitlines()
    if line_end > len(lines):
        fail("citation line range exceeds pinned source")
    return digest(b"\n".join(lines[line_start - 1:line_end]))


def assert_citation_policy(value: object, scope: str, candidate_path: str, group_paths: set[str], source_bytes: bytes, label: str) -> dict:
    """Enforce source scope and explicit individual-or-complete-group target mapping."""
    citation = exact_keys(value, CITATION_KEYS, label)
    if citation["source_type"] not in SOURCE_TYPES or citation["claim_scope"] != scope or scope not in SOURCE_SCOPE_POLICY[citation["source_type"]]:
        fail(f"{label} source type or claim scope differs")
    if citation["mapping_scope"] not in {"individual_path", "complete_identical_hash_group"} or not isinstance(citation["target_paths"], list):
        fail(f"{label} target mapping is malformed")
    expected_targets = [candidate_path] if citation["mapping_scope"] == "individual_path" else sorted(group_paths)
    if citation["target_paths"] != expected_targets:
        fail(f"{label} target mapping is not exact")
    if any(not isinstance(path, str) or path.encode() not in source_bytes for path in expected_targets):
        fail(f"{label} cited evidence does not explicitly map every target path")
    return citation


def assert_citation(value: object, scope: str, candidate_path: str, group_paths: set[str], label: str) -> None:
    """Validate a factual citation's exact Git binding after policy enforcement."""
    citation = exact_keys(value, CITATION_KEYS, label)
    if citation["source_path"].startswith("measure/"):
        fail("Measure evidence is not admissible provenance evidence")
    if not HEX40.fullmatch(citation["source_revision"]) or not HEX40.fullmatch(citation["source_blob_oid"]) or not HEX64.fullmatch(citation["locator_text_sha256"]):
        fail(f"{label} Git locator digest is malformed")
    if git_blob_oid(citation["source_revision"], citation["source_path"]) != citation["source_blob_oid"]:
        fail(f"{label} source blob OID is stale")
    if cited_range_hash(citation["source_revision"], citation["source_path"], citation["line_start"], citation["line_end"]) != citation["locator_text_sha256"]:
        fail(f"{label} cited line hash is stale")
    source_lines = git("show", f"{citation['source_revision']}:{citation['source_path']}").splitlines()[citation["line_start"] - 1:citation["line_end"]]
    assert_citation_policy(citation, scope, candidate_path, group_paths, b"\n".join(source_lines), label)


def assert_state(value: object, scope: str, candidate_path: str, group_paths: set[str], label: str) -> tuple[str, int]:
    """Validate one provenance state as exact evidence or explicit unknown."""
    state = exact_keys(value, STATE_KEYS, label)
    if state["status"] not in {"evidenced", "unknown"} or not isinstance(state["citations"], list):
        fail(f"{label} status or citations are malformed")
    if state["status"] == "evidenced":
        if not state["citations"] or state["unknown_rationale"] is not None:
            fail(f"{label} evidenced state lacks citations or contradicts its status")
        for index, citation in enumerate(state["citations"]):
            assert_citation(citation, scope, candidate_path, group_paths, f"{label} citation {index}")
        return state["status"], len(state["citations"])
    if state["citations"] or not isinstance(state["unknown_rationale"], str) or not state["unknown_rationale"].strip():
        fail(f"{label} unknown state is not explicit")
    return state["status"], 0


def assert_eligibility(value: object, upstream: str, license_status: str, label: str) -> None:
    """Require closed Phase 2 eligibility codes without Phase 4 disposition text."""
    eligibility = exact_keys(value, ELIGIBILITY_KEYS, label)
    complete = upstream == "evidenced" and license_status == "evidenced"
    expected = ("eligible_for_later_evaluation", "eligible_for_later_evaluation", "evidence_complete_pending_later_evaluation") if complete else ("blocked", "blocked", "evidence_incomplete")
    if (eligibility["reuse"], eligibility["adapt"], eligibility["reason_code"]) != expected:
        fail(f"{label} eligibility/status pairing differs")


def assert_resource_usage(value: object, expected_paths: int, expected_groups: int, citation_count: int, label: str) -> dict:
    """Require exact citation accounting and immutable per-batch provenance ceilings."""
    usage = exact_keys(value, RESOURCE_KEYS, label)
    if (usage["candidate_paths"], usage["hash_groups"], usage["evidence_records"], usage["within_ceiling"]) != (expected_paths, expected_groups, citation_count, True):
        fail(f"{label} counts or evidence-record accounting differ")
    if not all(isinstance(usage[key], int) and usage[key] >= 0 for key in ("command_invocations", "bytes_read")) or usage["evidence_records"] > 200 or usage["command_invocations"] > 120 or usage["bytes_read"] > 268435456:
        fail(f"{label} resource ceiling exceeded")
    return usage


def assert_receipt_resource_matches(receipt_usage: dict, artifact_usage: dict, label: str) -> None:
    """Require a receipt to reproduce its artifact resource usage exactly."""
    if receipt_usage != artifact_usage:
        fail(f"{label} differs from artifact resource usage")


def assert_artifact(path: Path, batch_id: str, expected_paths: set[str], records: dict[str, dict]) -> dict:
    """Validate one complete provenance-audit artifact against frozen Phase 2 rules."""
    artifact = exact_keys(load_json(path), ARTIFACT_KEYS, f"{batch_id} provenance artifact")
    if (artifact["schema_version"], artifact["track_id"], artifact["batch_id"]) != ("apk-asset-forensics.phase2-provenance-audit.v1", "apk_existing_asset_candidate_audit_20260712", batch_id):
        fail(f"{batch_id} provenance artifact identity differs")
    if artifact["input_binding"] != phase2_input_binding(batch_id) or artifact["producer"] != {"role": "provenance-auditor", "receipt_path": f"role-receipts/{batch_id}/provenance-auditor.json"}:
        fail(f"{batch_id} provenance input or producer binding differs")
    if not isinstance(artifact["records"], list):
        fail(f"{batch_id} provenance records must be a list")
    seen: set[str] = set()
    citation_count = 0
    for item in artifact["records"]:
        record = exact_keys(item, RECORD_KEYS, f"{batch_id} provenance record")
        candidate_path = record["canonical_path"]
        source = records.get(candidate_path)
        if source is None or candidate_path not in expected_paths:
            fail(f"{batch_id} provenance record has omitted, extra, or cross-batch path")
        for key in ("sha256", "revision", "identical_hash_group"):
            if record[key] != source[key]:
                fail(f"{batch_id} provenance record has stale {key}: {candidate_path}")
        if record["source_blob_oid"] != git_blob_oid(record["revision"], candidate_path):
            fail(f"{batch_id} provenance record source blob OID differs: {candidate_path}")
        group_paths = {path for path, member in records.items() if member["identical_hash_group"] == source["identical_hash_group"]}
        introduction, count = assert_state(record["repository_introduction"], "repository_introduction", candidate_path, group_paths, f"{batch_id} repository introduction")
        citation_count += count
        upstream, count = assert_state(record["upstream_provenance"], "upstream_provenance", candidate_path, group_paths, f"{batch_id} upstream provenance")
        citation_count += count
        license_status, count = assert_state(record["license"], "license", candidate_path, group_paths, f"{batch_id} license")
        citation_count += count
        assert_eligibility(record["prospective_eligibility"], upstream, license_status, f"{batch_id} prospective eligibility")
        if introduction not in {"evidenced", "unknown"}:
            fail("repository introduction state differs")
        if candidate_path in seen:
            fail(f"{batch_id} provenance record duplicates a path")
        seen.add(candidate_path)
    if seen != expected_paths:
        fail(f"{batch_id} provenance records omit or add frozen paths")
    groups = {records[path]["identical_hash_group"] for path in expected_paths}
    return assert_resource_usage(artifact["resource_usage"], len(expected_paths), len(groups), citation_count, f"{batch_id} provenance resource usage")


def allowed_inputs(batch_id: str) -> list[str]:
    """Return the closed, per-batch input locator list for provenance evidence."""
    result = [str(FREEZE_PATH.relative_to(REPO)), str(PHASE1_ROOT_PATH.relative_to(REPO))]
    result.extend(str(path.relative_to(REPO)) for path, _sha in PHASE1_BINDINGS.values())
    result.extend(str((TRACK / "batches" / batch_id / name).relative_to(REPO)) for name in ("candidate-records-base.json", "mechanical-metadata.json", "caller-inventory.json"))
    result.extend([f"git:{BASE_PUBLICATION_REVISION}:{BASE_PATH}", f"git-tree:{BASE_RECORD_REVISION}", f"git-tree:{DELTA_REVISION}", "git-history:repository"])
    return result


def receipt_path(batch_id: str) -> Path:
    """Return the required isolated provenance receipt path for one batch."""
    return TRACK / "role-receipts" / batch_id / "provenance-auditor.json"


def assert_role_identity(receipt: dict, batch_id: str, role: str, final_status: str, label: str) -> None:
    """Require the exact native isolation identity for one role receipt."""
    identity = (receipt.get("schema_version"), receipt.get("track_id"), receipt.get("batch_id"), receipt.get("role"), receipt.get("declared_model"), receipt.get("fork_turns"), receipt.get("inherited_narrative"), receipt.get("allowed_input_manifest_sha256"), receipt.get("final_status"))
    if identity != ("apk-role-receipt.v1", "apk_existing_asset_candidate_audit_20260712", batch_id, role, "gpt-5.6-terra", "none", False, EXPECTED_FREEZE_SHA256, final_status):
        fail(f"{label} identity or isolation differs")


def truth_allowed_inputs() -> list[str]:
    """Return the closed inputs permitted to this isolated Phase 2 truth author."""
    result = [str(PHASE0_FREEZE_PATH.relative_to(REPO)), str(ROLE_MANIFEST_PATH.relative_to(REPO)), str(DELTA_PATH.relative_to(REPO)), str(CANDIDATE_DELTA_PATH.relative_to(REPO)), str(PHASE1_ROOT_PATH.relative_to(REPO))]
    result.extend(str(path.relative_to(REPO)) for path, _sha in PHASE1_BINDINGS.values())
    for number in range(1, 13):
        batch_id = f"AF-{number:02d}"
        result.extend(str((TRACK / "batches" / batch_id / name).relative_to(REPO)) for name in ("candidate-records-base.json", "mechanical-metadata.json", "caller-inventory.json"))
    result.extend([f"git:{BASE_PUBLICATION_REVISION}:{BASE_PATH}", f"git-tree:{BASE_RECORD_REVISION}", f"git-tree:{DELTA_REVISION}"])
    return result


def assert_truth_receipt() -> None:
    """Validate the isolated truth-author receipt, its closed inputs, and all output hashes."""
    receipt = exact_keys(load_json(TRACK / "role-receipts/phase2/truth-test-author.json"), RECEIPT_KEYS, "phase2 truth-test-author receipt")
    assert_role_identity(receipt, "phase2-admission", "truth-test-author", "expected-red", "phase2 truth-test-author receipt")
    if receipt["allowed_input_paths"] != truth_allowed_inputs() or receipt["role_boundary"] != TRUTH_BOUNDARY:
        fail("phase2 truth-test-author receipt inputs or role boundary differ")
    expected_outputs = [FREEZE_PATH, TRACK / "forensics-contract-tests.py", TRACK / "forensics-contract-red-report-v1.json", *sorted((TRACK / "negative-fixtures/phase2").glob("*.json"))]
    expected_hashes = {str(path.relative_to(REPO)): digest(path.read_bytes()) for path in expected_outputs}
    if receipt["output_file_hashes"] != expected_hashes:
        fail("phase2 truth-test-author receipt output hashes differ")
    usage = exact_keys(receipt["resource_usage"], {"test_cases", "command_invocations", "bytes_read", "within_ceiling"}, "phase2 truth-test-author receipt resource usage")
    if (usage["test_cases"], usage["within_ceiling"]) != (24, True) or not all(isinstance(usage[key], int) and usage[key] >= 0 for key in ("command_invocations", "bytes_read")) or usage["command_invocations"] > 80 or usage["bytes_read"] > 134217728:
        fail("phase2 truth-test-author receipt resources differ")
    report = load_json(TRACK / "forensics-contract-red-report-v1.json")
    if (report.get("result"), report.get("exit_code"), report.get("contract_sha256"), report.get("phase2_input_freeze_sha256"), report.get("fixture_count")) != ("expected-red", 1, digest((TRACK / "forensics-contract-tests.py").read_bytes()), EXPECTED_FREEZE_SHA256, 24):
        fail("phase2 Red report binding differs")


def assert_receipt(output: Path, batch_id: str, expected_paths: set[str], records: dict[str, dict], artifact_usage: dict) -> None:
    """Require a bounded, isolated provenance-auditor receipt for one batch."""
    receipt = exact_keys(load_json(receipt_path(batch_id)), RECEIPT_KEYS, f"{batch_id} provenance receipt")
    assert_role_identity(receipt, batch_id, "provenance-auditor", "pass", f"{batch_id} provenance receipt")
    if not isinstance(receipt["native_task_name"], str) or not receipt["native_task_name"] or not isinstance(receipt["role_boundary"], str) or not receipt["role_boundary"]:
        fail(f"{batch_id} provenance receipt lacks native role provenance")
    if receipt["allowed_input_paths"] != allowed_inputs(batch_id):
        fail(f"{batch_id} provenance receipt input paths differ")
    if receipt["output_file_hashes"] != {str(output.relative_to(REPO)): digest(output.read_bytes())}:
        fail(f"{batch_id} provenance receipt output hash binding differs")
    findings = exact_keys(receipt["findings"], {"critical", "high", "medium", "low"}, f"{batch_id} provenance receipt findings")
    if any(findings[level] for level in ("critical", "high", "medium")):
        fail(f"{batch_id} provenance receipt has unresolved blocking findings")
    groups = {records[path]["identical_hash_group"] for path in expected_paths}
    usage = assert_resource_usage(receipt["resource_usage"], len(expected_paths), len(groups), artifact_usage["evidence_records"], f"{batch_id} provenance receipt resource usage")
    assert_receipt_resource_matches(usage, artifact_usage, f"{batch_id} provenance receipt resource usage")


def assert_prephase3_batch_allowlist(batch_dir: Path, names: set[str] | None = None) -> None:
    """Allow only the exact pre-Phase-3 JSON filenames in a batch directory."""
    allowed = {"candidate-records-base.json", "mechanical-metadata.json", "caller-inventory.json", "provenance-audit.json"}
    observed = names if names is not None else {str(path.relative_to(batch_dir)) for path in batch_dir.rglob("*.json")}
    if not observed <= allowed:
        fail("pre-Phase-3 batch JSON allowlist differs")


def assert_later_phase_absent() -> None:
    """Reject lifecycle outputs and enforce exact pre-Phase-3 batch file allowlists."""
    forbidden = [TRACK / name for name in ("independent-review.json", "product-owner-acceptance.json", "accepted-candidate-manifest.json", "forensics-contract-test-report.json")]
    batch_root = TRACK / "batches"
    if batch_root.exists():
        for batch_dir in batch_root.iterdir():
            if batch_dir.is_dir(): assert_prephase3_batch_allowlist(batch_dir)
    present = [str(path.relative_to(TRACK)) for path in forbidden if path.exists()]
    if present: fail("later-phase or lifecycle artifacts present: " + ", ".join(sorted(present)))


def valid_fixture_citation() -> dict:
    """Return one citation accepted by the same production artifact validator under a fake Git resolver."""
    return {"source_type":"in_repo_mapping","claim_scope":"repository_introduction","source_revision":"0"*40,"source_path":"assets/provenance.json","source_blob_oid":"f"*40,"line_start":1,"line_end":1,"locator_text_sha256":"a"*64,"mapping_scope":"individual_path","target_paths":["assets/a.png"]}


def fixture_baseline() -> tuple[dict, dict, dict[str, dict]]:
    """Build a complete minimal AF-01 artifact/receipt pair for full-pipeline mutation tests."""
    record = {"canonical_path":"assets/a.png","sha256":"1"*64,"revision":"0"*40,"source_blob_oid":"f"*40,"identical_hash_group":"sha256:"+"1"*64,"repository_introduction":{"status":"unknown","citations":[],"unknown_rationale":"No explicit mapping."},"upstream_provenance":{"status":"unknown","citations":[],"unknown_rationale":"No explicit upstream mapping."},"license":{"status":"unknown","citations":[],"unknown_rationale":"No explicit asset license mapping."},"prospective_eligibility":{"reuse":"blocked","adapt":"blocked","reason_code":"evidence_incomplete"}}
    artifact={"schema_version":"apk-asset-forensics.phase2-provenance-audit.v1","track_id":"apk_existing_asset_candidate_audit_20260712","batch_id":"AF-01","input_binding":phase2_input_binding("AF-01"),"producer":{"role":"provenance-auditor","receipt_path":"role-receipts/AF-01/provenance-auditor.json"},"records":[record],"resource_usage":{"candidate_paths":1,"hash_groups":1,"evidence_records":0,"command_invocations":1,"bytes_read":1,"within_ceiling":True}}
    receipt={"schema_version":"apk-role-receipt.v1","track_id":"apk_existing_asset_candidate_audit_20260712","batch_id":"AF-01","role":"provenance-auditor","native_task_name":"fixture","declared_model":"gpt-5.6-terra","fork_turns":"none","inherited_narrative":False,"allowed_input_manifest_sha256":EXPECTED_FREEZE_SHA256,"allowed_input_paths":allowed_inputs("AF-01"),"role_boundary":"fixture","output_file_hashes":{},"findings":{"critical":[],"high":[],"medium":[],"low":[]},"resource_usage":dict(artifact["resource_usage"]),"final_status":"pass"}
    records={"assets/a.png":{"sha256":"1"*64,"revision":"0"*40,"identical_hash_group":"sha256:"+"1"*64},"assets/b.png":{"sha256":"2"*64,"revision":"0"*40,"identical_hash_group":"sha256:"+"1"*64}}
    return artifact,receipt,records


def assert_fixture_pipeline(fixture: dict) -> None:
    """Inject one descriptor into a complete artifact/receipt and run production admission validators."""
    import copy, tempfile
    artifact, receipt, records = fixture_baseline(); mutation=fixture["mutation"]; allowlist_names=None
    rec=artifact["records"][0]; citation=valid_fixture_citation()
    if mutation=="omitted": artifact["records"]=[]
    elif mutation=="extra": artifact["records"].append(copy.deepcopy(rec)); artifact["records"][1]["canonical_path"]="assets/extra.png"
    elif mutation=="stale_path": rec["sha256"]="0"*64
    elif mutation=="stale_oid": rec["source_blob_oid"]="0"*40
    elif mutation in {"wrong_group","stale_group"}: rec["identical_hash_group"]="sha256:"+"0"*64
    elif mutation=="uncited": rec["license"]={"status":"evidenced","citations":[],"unknown_rationale":None}
    elif mutation in {"unsupported_source","history_scope","fabricated_source","generic_license","sidecar_peer","same_hash"}:
        rec["repository_introduction"]={"status":"evidenced","citations":[citation],"unknown_rationale":None}; artifact["resource_usage"]["evidence_records"]=1; receipt["resource_usage"]["evidence_records"]=1
        if mutation=="unsupported_source": citation["source_type"]="filename_inference"
        if mutation=="history_scope": citation.update({"source_type":"repository_history","claim_scope":"license"}); rec["repository_introduction"]= {"status":"unknown","citations":[],"unknown_rationale":"No mapping."}; rec["license"]={"status":"evidenced","citations":[citation],"unknown_rationale":None}
        if mutation=="fabricated_source": citation["source_type"]="approved_external_authoring"
        if mutation=="generic_license": citation.update({"source_type":"in_repo_license","claim_scope":"license"}); rec["repository_introduction"]={"status":"unknown","citations":[],"unknown_rationale":"No mapping."};rec["license"]={"status":"evidenced","citations":[citation],"unknown_rationale":None}
        if mutation=="sidecar_peer": citation["target_paths"]=["assets/b.png"]
        if mutation=="same_hash": citation.update({"mapping_scope":"complete_identical_hash_group","target_paths":["assets/a.png","assets/b.png"]})
    elif mutation=="status_contradiction": rec["license"]["citations"]=[citation]
    elif mutation=="unknown_eligible": rec["prospective_eligibility"]={"reuse":"eligible_for_later_evaluation","adapt":"eligible_for_later_evaluation","reason_code":"evidence_complete_pending_later_evaluation"}
    elif mutation=="cross_role": receipt["role"]="evidence-collector"
    elif mutation=="resource_drift": artifact["resource_usage"]["evidence_records"]=1
    elif mutation=="batch_cap":
        rec["repository_introduction"]={"status":"evidenced","citations":[citation]*201,"unknown_rationale":None};artifact["resource_usage"]["evidence_records"]=201;receipt["resource_usage"]["evidence_records"]=201
    elif mutation=="receipt_drift": receipt["resource_usage"]["command_invocations"]=2
    elif mutation=="legacy_reason": rec["prospective_eligibility"]={"reuse":"blocked","adapt":"blocked","reason":"Phase4 disposition"}
    elif mutation=="dynamic_unused": rec["prospective_eligibility"]["reason_code"]="unused_dynamic_caller"
    elif mutation=="allowlist": allowlist_names={"candidate-records-base.json","nested/suitability-disposition.json"}
    elif mutation=="malformed": rec["repository_introduction"]={"status":"evidenced","citations":[{"bad":True}],"unknown_rationale":None};artifact["resource_usage"]["evidence_records"]=1;receipt["resource_usage"]["evidence_records"]=1
    elif mutation=="stale_evidence": citation["locator_text_sha256"]="0"*64;rec["repository_introduction"]={"status":"evidenced","citations":[citation],"unknown_rationale":None};artifact["resource_usage"]["evidence_records"]=1;receipt["resource_usage"]["evidence_records"]=1
    source_lines = "assets/a.png\n"
    if mutation == "generic_license": source_lines = "MIT License\n"
    old_blob,old_hash,old_git,old_receipt=git_blob_oid,cited_range_hash,git,receipt_path
    globals()["git_blob_oid"]=lambda _r,_p:"f"*40; globals()["cited_range_hash"]=lambda _r,_p,_a,_b:"a"*64; globals()["git"]=lambda *_args:source_lines.encode()
    try:
        with tempfile.TemporaryDirectory(dir=TRACK) as temp:
            fixture_root=Path(temp); cases=[]
            for number in range(2, 13):
                batch_id=f"AF-{number:02d}"; other, other_receipt, other_records = fixture_baseline(); candidate=f"assets/{batch_id}.png"
                other["batch_id"]=batch_id; other["input_binding"]=phase2_input_binding(batch_id); other["producer"]={"role":"provenance-auditor","receipt_path":f"role-receipts/{batch_id}/provenance-auditor.json"}; other["records"][0]["canonical_path"]=candidate
                other_receipt["batch_id"]=batch_id; other_receipt["allowed_input_paths"]=allowed_inputs(batch_id)
                other_records={candidate:{"sha256":"1"*64,"revision":"0"*40,"identical_hash_group":"sha256:"+"1"*64}}
                cases.append((batch_id, other, other_receipt, other_records, {candidate}))
            cases.append(("AF-01", artifact, receipt, records, {"assets/a.png"}))
            artifact_paths={}; receipt_paths={}
            for batch_id, value, value_receipt, _value_records, _paths in cases:
                artifact_path=fixture_root/f"{batch_id}-artifact.json"; artifact_path.write_text(json.dumps(value)); artifact_paths[batch_id]=artifact_path
                value_receipt["output_file_hashes"]={str(artifact_path.relative_to(REPO)):digest(artifact_path.read_bytes())}
                receipt_file=fixture_root/f"{batch_id}-receipt.json"; receipt_file.write_text(json.dumps(value_receipt)); receipt_paths[batch_id]=receipt_file
            globals()["receipt_path"]=lambda batch_id: receipt_paths[batch_id]
            for batch_id, _value, _value_receipt, value_records, paths in cases:
                usage=assert_artifact(artifact_paths[batch_id],batch_id,paths,value_records)
                assert_receipt(artifact_paths[batch_id],batch_id,paths,value_records,usage)
            if allowlist_names is not None: assert_prephase3_batch_allowlist(fixture_root, allowlist_names)
    finally:
        globals()["git_blob_oid"],globals()["cited_range_hash"],globals()["git"],globals()["receipt_path"]=old_blob,old_hash,old_git,old_receipt


def assert_fixtures() -> None:
    """Run every mutation through the complete factored production admission pipeline."""
    fixtures=sorted((TRACK/"negative-fixtures/phase2").glob("*.json"))
    if len(fixtures)!=24: fail("Phase 2 negative fixture count must be exactly 24")
    for path in fixtures:
        try: assert_fixture_pipeline(load_json(path))
        except AssertionError as error:
            if load_json(path)["expected_error"] != str(error): fail(f"fixture rejected for wrong reason: {path.name}: {error}")
        else: fail(f"negative fixture was accepted: {path.name}")


def pending_summary(outputs: dict[str, Path]) -> str | None:
    """Return the sole intended Red while Phase 2 producer artifacts remain absent."""
    output_count = sum(path.exists() for path in outputs.values())
    receipt_count = sum(receipt_path(batch_id).exists() for batch_id in outputs)
    if (output_count, receipt_count) != (12, 12):
        return f"pending Phase 2 provenance outputs: provenance-audit files {output_count}/12; provenance receipts {receipt_count}/12"
    return None


def main() -> int:
    """Run the cumulative Phase 2 contract and emit Green only for complete evidence."""
    parser = argparse.ArgumentParser()
    parser.parse_args()
    try:
        _freeze, phase0, candidate_delta = assert_phase1_bindings()
        records = effective_records(candidate_delta)
        batches = expected_batches(phase0, records)
        batch_ids = list(batches)
        assert_truth_receipt()
        assert_later_phase_absent()
        assert_fixtures()
        outputs = output_paths(batch_ids)
        pending = pending_summary(outputs)
        if pending:
            fail(pending)
        actual = set((TRACK / "batches").glob("*/provenance-audit.json"))
        if actual != set(outputs.values()):
            fail("provenance-audit file set is not exactly the 12 frozen batch locations")
        actual_receipts = set((TRACK / "role-receipts").glob("AF-*/provenance-auditor.json")) if (TRACK / "role-receipts").exists() else set()
        if actual_receipts != {receipt_path(batch_id) for batch_id in batch_ids}:
            fail("provenance receipt file set is not exactly the 12 frozen batch locations")
        for batch_id, paths in batches.items():
            artifact_usage = assert_artifact(outputs[batch_id], batch_id, paths, records)
            assert_receipt(outputs[batch_id], batch_id, paths, records, artifact_usage)
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"RED: {error}", file=sys.stderr)
        return 1
    print("GREEN: Phase 2 provenance outputs exactly reconcile to frozen Phase 1 acceptance and provenance policy")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
