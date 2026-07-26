#!/usr/bin/env python3
"""Fail-closed post-review contract for the future Phase 5 owner
acceptance gate.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

TRACK = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
TRACK_ID = "apk_existing_asset_candidate_audit_20260712"
ROOT_ACCEPTANCE = TRACK / "phase5-root-acceptance.json"
ACCEPTED_MANIFEST = TRACK / "phase5-accepted-manifest-v1.json"
OWNER_APPROVAL_EVENT = TRACK / "phase5-owner-approval-event-v1.json"
FROZEN_OWNER_DELEGATION_RECORD = (
    TRACK / "phase5-owner-delegation-rollout-record-v1.jsonl"
)
FROZEN_OWNER_DECISION_RECORD = (
    TRACK / "phase5-owner-decision-rollout-record-v2.jsonl"
)
OWNER_ROLLOUT_ORIGIN = Path(
    "/home/daniel-bo/.codex/sessions/2026/07/23/"
    "rollout-2026-07-23T17-32-19-"
    "019f8e88-86b8-7142-9cb4-6bd7c34b1385.jsonl"
)
ACCEPTANCE_GATE_VERSION = "apk-asset-forensics.phase5-acceptance-gate.v2"
OWNER_DELEGATION_MESSAGE = "Again YOU ARE THE PRODUCT OWNER!"
OWNER_DELEGATION_MESSAGE_SHA256 = (
    "83e28b2cd3669f2f3ca06c3305380adc4bda7f0f04c84655cb1d10b9a0624c89"
)
OWNER_APPROVAL_THREAD_ID = "019f8e88-86b8-7142-9cb4-6bd7c34b1385"
OWNER_APPROVAL_DECISION = "ACCEPT_T8_FOR_T9_ONLY_CONSUMPTION"
OWNER_DECISION_AUTHORITY = "delegated-root-product-owner"
OWNER_APPROVAL_SCOPE = "T8-for-T9-only-consumption"
ACTIVE_CONSUMER_SCOPE = "T9_ontology_only"
SUPERSEDED_ACCEPTANCE_ID = "phase5-owner-cycle-v2-local-only"
EXPECTED_FIXTURE_COUNT = 10
FAILED_OWNER_CYCLE_V1 = f"{TRACK}/phase5-failed-owner-cycle-v1"
FAILED_OWNER_CYCLE_V2 = f"{TRACK}/phase5-failed-owner-cycle-v2"
EXPECTED_FAILED_OWNER_CYCLES = {
    "phase5-failed-owner-cycle-v1": {
        f"{FAILED_OWNER_CYCLE_V1}/acceptance-truth-test-author-stale.json": (
            "bcd166cd54daa51d8b6ef6f4906126da2b291a6fe1e34ffe96e25d570c9d0494"
        ),
        f"{FAILED_OWNER_CYCLE_V1}/phase5-acceptance-false-green-report.json": (
            "f5ad8f962910e1cdf423544eea99e2328e10e0790f43bc2f78f5d14daa94158b"
        ),
        f"{FAILED_OWNER_CYCLE_V1}/phase5-accepted-manifest-stale.json": (
            "9d1a8697a3ab9314bfe02fadb54869a721a8a83c2c8c65e76d24bfb7c5a3f227"
        ),
        f"{FAILED_OWNER_CYCLE_V1}/phase5-root-acceptance-stale.json": (
            "8c46eb8d231a24687e1fcb7f818c1ac21657bf5f9ccd74c3bbd2de683ac77543"
        ),
    },
    "phase5-failed-owner-cycle-v2": {
        (
            f"{FAILED_OWNER_CYCLE_V2}/"
            "acceptance-truth-test-author-local-only.json"
        ): ("bcd166cd54daa51d8b6ef6f4906126da2b291a6fe1e34ffe96e25d570c9d0494"),
        f"{FAILED_OWNER_CYCLE_V2}/acceptance-truth-test-author-revoked.json": (
            "bcd166cd54daa51d8b6ef6f4906126da2b291a6fe1e34ffe96e25d570c9d0494"
        ),
        (
            f"{FAILED_OWNER_CYCLE_V2}/"
            "phase5-acceptance-green-report-revoked.json"
        ): ("f5ad8f962910e1cdf423544eea99e2328e10e0790f43bc2f78f5d14daa94158b"),
        f"{FAILED_OWNER_CYCLE_V2}/phase5-acceptance-local-only-report.json": (
            "f5ad8f962910e1cdf423544eea99e2328e10e0790f43bc2f78f5d14daa94158b"
        ),
        (
            f"{FAILED_OWNER_CYCLE_V2}/"
            "phase5-accepted-manifest-missing-user-event.json"
        ): ("1e3f3ca76214c9e582aa9e82c6bf1bece654fee808bfa91860621a6d39c6f766"),
        (
            f"{FAILED_OWNER_CYCLE_V2}/"
            "phase5-root-acceptance-missing-user-event.json"
        ): ("eec16a094cfe347b37b6ebefa0d21a059e971fd98151f7108673b96708f2ea3a"),
    },
}
CANDIDATE_REPORT = TRACK / "phase5-candidate-report-v1.json"
NON_CONSUMABLE_MANIFEST = (
    TRACK / "phase5-candidate-manifest-non-consumable-v1.json"
)
FIXTURE_MANIFEST = TRACK / "phase5-acceptance-fixture-manifest-v1.json"
FIXTURE_DIRECTORY = TRACK / "negative-fixtures/phase5-acceptance"
OUT_RED_REPORT = TRACK / "phase5-acceptance-red-report.json"
OUT_GREEN_REPORT = TRACK / "phase5-acceptance-green-report.json"
OUT_RECEIPT = TRACK / "role-receipts/phase5/acceptance-truth-test-author.json"

STATIC_BINDINGS = {
    str(
        CANDIDATE_REPORT
    ): "ad7bbe10e513fabf1cceb2893833c8f983d4b429f3a5b503b53edf028bb04f47",
    str(
        NON_CONSUMABLE_MANIFEST
    ): "c5626db8afdf357feda20637c8bcacf52a391c363c2acf0d9de1cd0561c330be",
    str(
        TRACK / "phase5_contract_test.py"
    ): "31062aeefe8abf7506eafd814a588f1e38e1a18488396870093561c8e80259d4",
    str(
        TRACK / "phase5-contract-test-report.json"
    ): "7aeaaec76c9b56ce0ba9c1fa11f2262164c4e76b3f178806a96a8a7c4e136861",
    str(
        TRACK / "role-receipts/phase5/truth-test-author.json"
    ): "49e747b7df827b112be563abca584fd8facf290b683a550cd34d37df96995af2",
    str(
        TRACK / "phase5-fixture-manifest-v1.json"
    ): "25808bfc4dbdfd39a311177f17ea42669c884c781121313b8ed27455707f5b12",
    str(
        TRACK / "role-receipts/phase5/report-manifest-producer.json"
    ): "fe9588b3df7777cffd257cfe47e32d0b3cd4f8d8fcf80c4764210aca7b13466e",
    str(
        TRACK / "phase4-root-acceptance.json"
    ): "af708fe63bd10e4508809446e5e2420601cfd8e5e04601db41d32b4be33e53cd",
    str(
        TRACK / "phase4-browser-evidence-freeze-v1.json"
    ): "5c64618ccd05b39ab63f1befb8d74d75f6a7fdf5b9613d31c8ee1b3369065231",
}
DYNAMIC_BINDING_PATHS = [
    TRACK / "phase5_acceptance_test.py",
    TRACK / "phase5-acceptance-fixture-manifest-v1.json",
]
FRESH_REVIEW_BUNDLES = {
    "AF-01-AF-06": {
        "batches": [f"AF-{number:02d}" for number in range(1, 7)],
        "review": TRACK / "phase5-reviews/AF-01-AF-06-v2.json",
        "receipt": TRACK
        / "role-receipts/phase5/AF-01-AF-06-v2-adversarial-reviewer.json",
        "review_sha256": (
            "c789ef9c07eba1e4281d25084684c1c6590eefae809ddf5ca21b56b4acde7eec"
        ),
    },
    "AF-07-AF-12": {
        "batches": [f"AF-{number:02d}" for number in range(7, 13)],
        "review": TRACK / "phase5-reviews/AF-07-AF-12-v2.json",
        "receipt": TRACK
        / "role-receipts/phase5/AF-07-AF-12-v2-adversarial-reviewer.json",
        "review_sha256": (
            "44944d6948a15e50593f3adc2b6882ae9510359bcebcafc2fd66d24eeb0db00d"
        ),
    },
}
RESTORED_LEDGERS = {
    (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/"
        "magic-defense-claim-ledger-v2.json"
    ): "10d974bd3e620a4aaacde171a80e5f82945f58fdbd38db57b996805b62b71e45",
    (
        "measure/tracks/apk_corpus_audit_puzzle_crafting_20260712/"
        "batch-a/enchanted-library/claim-evidence-ledger.v2.json"
    ): "8adc5b881104bf0ce78d0eb3895b65cb0485a4e516e9918461acfad0f7adfb2e",
    (
        "measure/tracks/apk_corpus_audit_puzzle_crafting_20260712/"
        "batch-b/potion-rush/claim-evidence-ledger-v2.json"
    ): "4183d0514812cd781f2ffd9a7442e692604eb2f2d86cf7ead7af54bc06f25dae",
}
SUPERSEDED_PRE_REPAIR_REVIEWS = {
    f"{TRACK}/phase5-reviews/AF-01-AF-04.json": (
        "799ba539fe8b1258ca0e4cbf7dbd0961eb66d44a01da84fc7bd49d752704c990"
    ),
    f"{TRACK}/role-receipts/phase5/AF-01-AF-04-adversarial-reviewer.json": (
        "5fd6702e28c437dd42447514fa57c859ab56cf2236569e38da209bc0e64e4b67"
    ),
    f"{TRACK}/phase5-reviews/AF-09-AF-12.json": (
        "c7e5bd17510d8bce25c31dd9ec584a58c042d858d1ba378156c45ca57609d0e4"
    ),
    f"{TRACK}/role-receipts/phase5/AF-09-AF-12-adversarial-reviewer.json": (
        "250f97f69856824978dc08ddbf054e6b02e1f0a86f943fb35e19507934a8e958"
    ),
    f"{TRACK}/phase5-reviews/AF-05-AF-08.json": (
        "f2c4fff40265d0b5a51700459c4f889cb75c46e50e071e492172e83f30144c65"
    ),
    f"{TRACK}/role-receipts/phase5/AF-05-AF-08-adversarial-reviewer.json": (
        "b4e6d8489af01e958bc591cfc25206bf5e06194d285d467f1cebe1e6f00ccffb"
    ),
}
EXPECTED_TOTALS = {
    "candidate_paths": 428,
    "identical_hash_groups": 227,
    "caller_locators": 533,
    "accepted_path_usage_links": {"total": 85, "scene": 77, "non_scene": 8},
    "unique_usage_ids": {"total": 45, "scene": 40, "non_scene": 5},
    "responsive_assessment_cells": 308,
    "dispositions": {"replace": 85, "reject": 14, "unknown": 329},
    "priority1": {
        "paths": 14,
        "required_disposition": "reject",
        "required_replacement_action": "retire",
        "all_reconciled": True,
    },
    "browser_usability_defects": 6,
}
PROHIBITIONS = [
    "canonical_standard_pack_candidate_key",
    "direct_legacy_adoption",
    "reuse",
    "adapt",
    "reference",
    "production",
    "shipping",
]


def digest(path: Path) -> str:
    """Returns the SHA-256 digest of exact file bytes.

    Args:
        path: File whose bytes are hashed.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path, overrides: dict[str, Any] | None = None) -> Any:
    """Loads one JSON artifact, optionally using an isolated in-memory override.

    Args:
        path: Repository-relative artifact path.
        overrides: Optional mutable-document overrides for counterexamples.

    Returns:
        Parsed JSON value.
    """
    key = str(path)
    if overrides and key in overrides:
        return overrides[key]
    return json.loads(path.read_text(encoding="utf-8"))


def add(errors: list[str], code: str, detail: str) -> None:
    """Appends one stable machine-readable contract failure.

    Args:
        errors: Mutable error collection.
        code: Stable failure code.
        detail: Human-readable bounded detail.

    Returns:
        None.
    """
    errors.append(f"{code}: {detail}")


def parse_timestamp(value: Any) -> datetime | None:
    """Parses one timezone-aware ISO-8601 timestamp.

    Args:
        value: Candidate timestamp value.

    Returns:
        Parsed timestamp, or None when invalid or timezone-naive.
    """
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else None


def json_pointer(document: Any, pointer: Any) -> Any:
    """Resolves an RFC 6901 JSON pointer without accepting ambiguous syntax.

    Args:
        document: Parsed source metadata document.
        pointer: JSON pointer selecting one exact metadata value.

    Returns:
        Selected value.

    Raises:
        ValueError: When the pointer is invalid or cannot be resolved.
    """
    if pointer == "":
        return document
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        raise ValueError("invalid JSON pointer")
    value = document
    for raw_token in pointer[1:].split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        if isinstance(value, list):
            value = value[int(token)]
        elif isinstance(value, dict):
            value = value[token]
        else:
            raise ValueError("unresolvable JSON pointer")
    return value


def failed_owner_cycles_valid(root: Path, acceptance: Any) -> bool:
    """Returns whether both quarantined owner cycles are exactly disclosed.

    Args:
        root: Repository root.
        acceptance: Candidate root acceptance artifact.

    Returns:
        Whether both non-authoritative cycles and all frozen hashes match.
    """
    cycles = (
        acceptance.get("failed_owner_cycles")
        if isinstance(acceptance, dict)
        else None
    )
    if not isinstance(cycles, list) or len(cycles) != len(
        EXPECTED_FAILED_OWNER_CYCLES
    ):
        return False
    by_id = {
        item.get("cycle_id"): item for item in cycles if isinstance(item, dict)
    }
    if set(by_id) != set(EXPECTED_FAILED_OWNER_CYCLES):
        return False
    for cycle_id, artifacts in EXPECTED_FAILED_OWNER_CYCLES.items():
        cycle = by_id[cycle_id]
        if (
            cycle.get("authoritative") is not False
            or cycle.get("artifacts") != artifacts
            or not isinstance(cycle.get("reason"), str)
            or not cycle.get("reason")
        ):
            return False
        for relative, expected_hash in artifacts.items():
            path = root / relative
            if not path.is_file() or digest(path) != expected_hash:
                return False
    return True


def current_approval_bindings(root: Path) -> dict[str, str]:
    """Returns exact candidate, review, and gate bytes requiring approval.

    Args:
        root: Repository root.

    Returns:
        Repository-relative paths mapped to their current SHA-256 digests.
    """
    paths = [
        CANDIDATE_REPORT,
        NON_CONSUMABLE_MANIFEST,
        *(bundle["review"] for bundle in FRESH_REVIEW_BUNDLES.values()),
        TRACK / "phase5_acceptance_test.py",
        FIXTURE_MANIFEST,
    ]
    return {
        str(path): digest(root / path)
        for path in paths
        if (root / path).is_file()
    }


def owner_decision_text(approval_bindings: dict[str, str]) -> str:
    """Builds the exact delegated product-owner decision block.

    Args:
        approval_bindings: Exact candidate, review, and gate file hashes.

    Returns:
        Versioned decision text for the root assistant rollout record.
    """
    ordered_paths = [
        str(CANDIDATE_REPORT),
        str(NON_CONSUMABLE_MANIFEST),
        *(str(bundle["review"]) for bundle in FRESH_REVIEW_BUNDLES.values()),
        str(TRACK / "phase5_acceptance_test.py"),
        str(FIXTURE_MANIFEST),
    ]
    lines = [
        "PRODUCT_OWNER_DECISION_V2",
        f"track={TRACK_ID}",
        f"decision={OWNER_APPROVAL_DECISION}",
        f"authority={OWNER_DECISION_AUTHORITY}",
        "scope=T9-only consumption",
        *(
            f"binding.{path}={approval_bindings[path]}"
            for path in ordered_paths
        ),
        "END_PRODUCT_OWNER_DECISION_V2",
    ]
    return "\n".join(lines)


def parse_owner_decision_text(text: Any) -> dict[str, Any] | None:
    """Parses the exact delegated product-owner decision block.

    Args:
        text: Candidate root-assistant decision text.

    Returns:
        Parsed decision fields and file bindings, or None.
    """
    if not isinstance(text, str):
        return None
    lines = text.splitlines()
    if (
        len(lines) < 6
        or lines[0] != "PRODUCT_OWNER_DECISION_V2"
        or lines[-1] != "END_PRODUCT_OWNER_DECISION_V2"
    ):
        return None
    fields: dict[str, str] = {}
    bindings: dict[str, str] = {}
    for line in lines[1:-1]:
        if "=" not in line:
            return None
        key, value = line.split("=", 1)
        if key.startswith("binding."):
            path = key.removeprefix("binding.")
            if not path or path in bindings:
                return None
            bindings[path] = value
        else:
            if key in fields:
                return None
            fields[key] = value
    if set(fields) != {"track", "decision", "authority", "scope"}:
        return None
    return {**fields, "bindings": bindings}


def frozen_rollout_record(
    root: Path,
    binding: Any,
    expected_path: Path,
    override: bytes | None,
) -> tuple[list[str], dict[str, Any] | None, bytes | None]:
    """Loads and hash-validates one exact frozen rollout JSONL record.

    Args:
        root: Repository root.
        binding: Frozen-record path, line, and hash binding.
        expected_path: Required repository-relative frozen path.
        override: Optional fixture-only authoritative bytes.

    Returns:
        Stable errors, parsed record, and exact line bytes.
    """
    required_keys = {
        "frozen_record_path",
        "frozen_record_sha256",
        "origin_line_number",
        "origin_line_sha256",
    }
    if not isinstance(binding, dict) or set(binding) != required_keys:
        return (
            ["owner-approval-evidence: exact frozen rollout record binding"],
            None,
            None,
        )
    frozen_path = root / expected_path
    line_number = binding.get("origin_line_number")
    if (
        binding.get("frozen_record_path") != str(expected_path)
        or not isinstance(line_number, int)
        or isinstance(line_number, bool)
        or line_number <= 0
        or not frozen_path.is_file()
    ):
        return (
            [
                "owner-approval-evidence: frozen rollout path and positive "
                "origin line"
            ],
            None,
            None,
        )
    raw = override if override is not None else frozen_path.read_bytes()
    raw_hash = hashlib.sha256(raw).hexdigest()
    if (
        not raw.endswith(b"\n")
        or len(raw.splitlines(keepends=True)) != 1
        or binding.get("frozen_record_sha256") != raw_hash
        or binding.get("origin_line_sha256") != raw_hash
    ):
        return (
            [
                "owner-approval-evidence: byte-exact single-line rollout "
                "freeze and origin line hash"
            ],
            None,
            None,
        )
    try:
        record = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return (
            ["owner-approval-evidence: frozen rollout record JSON"],
            None,
            None,
        )
    return [], record, raw


def rollout_source_errors(
    root: Path,
    event: dict[str, Any],
    approval_bindings: dict[str, str],
    frozen_record_overrides: dict[str, bytes] | None = None,
) -> tuple[list[str], datetime | None, dict[str, str] | None]:
    """Validates exact user delegation and later root-owner decision.

    Args:
        root: Repository root.
        event: Candidate delegated product-owner decision event.
        approval_bindings: Current bytes that the decision must authorize.
        frozen_record_overrides: Optional fixture-only record bytes by path.

    Returns:
        Errors, authoritative decision timestamp, and parsed bindings.
    """
    errors: list[str] = []
    context = event.get("authoritative_rollout_approval_context")
    expected_context_keys = {
        "source_kind",
        "origin_rollout_path",
        "user_delegation",
        "assistant_decision",
    }
    if not isinstance(context, dict) or set(context) != expected_context_keys:
        return (
            ["owner-approval-evidence: exact delegated-owner rollout context"],
            None,
            None,
        )
    if context.get(
        "source_kind"
    ) != "codex-rollout-user-delegation-plus-assistant-decision" or context.get(
        "origin_rollout_path"
    ) != str(OWNER_ROLLOUT_ORIGIN):
        add(
            errors,
            "owner-approval-evidence",
            "exact authoritative rollout origin",
        )
    overrides = frozen_record_overrides or {}
    delegation_errors, delegation_record, delegation_bytes = (
        frozen_rollout_record(
            root,
            context.get("user_delegation"),
            FROZEN_OWNER_DELEGATION_RECORD,
            overrides.get(str(FROZEN_OWNER_DELEGATION_RECORD)),
        )
    )
    decision_errors, decision_record, decision_bytes = frozen_rollout_record(
        root,
        context.get("assistant_decision"),
        FROZEN_OWNER_DECISION_RECORD,
        overrides.get(str(FROZEN_OWNER_DECISION_RECORD)),
    )
    errors.extend(delegation_errors)
    errors.extend(decision_errors)
    if (
        delegation_record is None
        or decision_record is None
        or delegation_bytes is None
        or decision_bytes is None
    ):
        return errors, None, None
    delegation_payload = delegation_record.get("payload")
    decision_payload = decision_record.get("payload")
    delegation_content = (
        delegation_payload.get("content")
        if isinstance(delegation_payload, dict)
        else None
    )
    decision_content = (
        decision_payload.get("content")
        if isinstance(decision_payload, dict)
        else None
    )
    delegation_metadata = (
        delegation_payload.get("internal_chat_message_metadata_passthrough")
        if isinstance(delegation_payload, dict)
        else None
    )
    decision_metadata = (
        decision_payload.get("internal_chat_message_metadata_passthrough")
        if isinstance(decision_payload, dict)
        else None
    )
    delegation_text = (
        delegation_content[0].get("text")
        if isinstance(delegation_content, list)
        and len(delegation_content) == 1
        and isinstance(delegation_content[0], dict)
        else None
    )
    decision_text = (
        decision_content[0].get("text")
        if isinstance(decision_content, list)
        and len(decision_content) == 1
        and isinstance(decision_content[0], dict)
        else None
    )
    delegation_turn = (
        delegation_metadata.get("turn_id")
        if isinstance(delegation_metadata, dict)
        else None
    )
    decision_turn = (
        decision_metadata.get("turn_id")
        if isinstance(decision_metadata, dict)
        else None
    )
    parsed_decision = parse_owner_decision_text(decision_text)
    delegation_valid = (
        delegation_record.get("type") == "response_item"
        and isinstance(delegation_payload, dict)
        and delegation_payload.get("type") == "message"
        and delegation_payload.get("role") == "user"
        and delegation_content
        == [{"type": "input_text", "text": OWNER_DELEGATION_MESSAGE}]
        and isinstance(delegation_turn, str)
        and bool(delegation_turn)
    )
    decision_valid = (
        decision_record.get("type") == "response_item"
        and isinstance(decision_payload, dict)
        and decision_payload.get("type") == "message"
        and decision_payload.get("role") == "assistant"
        and decision_content == [{"type": "output_text", "text": decision_text}]
        and isinstance(decision_turn, str)
        and bool(decision_turn)
        and decision_text == owner_decision_text(approval_bindings)
        and parsed_decision
        == {
            "track": TRACK_ID,
            "decision": OWNER_APPROVAL_DECISION,
            "authority": OWNER_DECISION_AUTHORITY,
            "scope": "T9-only consumption",
            "bindings": approval_bindings,
        }
    )
    delegation_at = parse_timestamp(delegation_record.get("timestamp"))
    decision_at = parse_timestamp(decision_record.get("timestamp"))
    if not delegation_valid or delegation_at is None:
        add(
            errors,
            "owner-approval-evidence",
            "exact user product-owner delegation record",
        )
    if not decision_valid or decision_at is None:
        add(
            errors,
            "owner-approval-evidence",
            "exact delegated root product-owner decision block",
        )
    if delegation_valid and (
        event.get("delegation_message") != delegation_text
        or event.get("delegation_message_sha256")
        != OWNER_DELEGATION_MESSAGE_SHA256
        or event.get("delegation_turn_event_id") != delegation_turn
    ):
        add(
            errors,
            "owner-approval-evidence",
            "event must bind authoritative delegation fields",
        )
    if decision_valid and (
        event.get("decision_text") != decision_text
        or event.get("decision_text_sha256")
        != hashlib.sha256(str(decision_text).encode()).hexdigest()
        or event.get("decision_turn_event_id") != decision_turn
        or event.get("decision_turn_timestamp")
        != decision_record.get("timestamp")
    ):
        add(
            errors,
            "owner-approval-evidence",
            "event must bind authoritative assistant decision fields",
        )
    delegation_line = context.get("user_delegation", {}).get(
        "origin_line_number"
    )
    decision_line = context.get("assistant_decision", {}).get(
        "origin_line_number"
    )
    if (
        not isinstance(delegation_line, int)
        or not isinstance(decision_line, int)
        or delegation_line >= decision_line
        or delegation_at is None
        or decision_at is None
        or delegation_at >= decision_at
    ):
        add(
            errors,
            "owner-approval-order",
            "user delegation must precede the root-owner decision",
        )
    if (
        OWNER_APPROVAL_THREAD_ID not in OWNER_ROLLOUT_ORIGIN.name
        or not OWNER_ROLLOUT_ORIGIN.is_file()
    ):
        add(
            errors,
            "owner-approval-evidence",
            "live rollout origin and filename thread binding",
        )
    else:
        live_lines = OWNER_ROLLOUT_ORIGIN.read_bytes().splitlines(keepends=True)
        live_delegation = (
            delegation_line <= len(live_lines)
            and live_lines[delegation_line - 1] == delegation_bytes
            if isinstance(delegation_line, int) and delegation_line > 0
            else False
        )
        live_decision = (
            decision_line <= len(live_lines)
            and live_lines[decision_line - 1] == decision_bytes
            if isinstance(decision_line, int) and decision_line > 0
            else False
        )
        try:
            session_meta = json.loads(live_lines[0].decode("utf-8"))
            session_payload = session_meta.get("payload", {})
            thread_valid = (
                session_meta.get("type") == "session_meta"
                and session_payload.get("id") == OWNER_APPROVAL_THREAD_ID
                and session_payload.get("session_id")
                == OWNER_APPROVAL_THREAD_ID
            )
        except (
            IndexError,
            UnicodeDecodeError,
            json.JSONDecodeError,
            AttributeError,
        ):
            thread_valid = False
        if not live_delegation or not live_decision or not thread_valid:
            add(
                errors,
                "owner-approval-evidence",
                "both live rollout lines and session thread must match",
            )
    parsed_bindings = (
        parsed_decision.get("bindings")
        if isinstance(parsed_decision, dict)
        else None
    )
    return errors, decision_at, parsed_bindings


def owner_approval_errors(
    root: Path,
    event: Any,
    approval_bindings: dict[str, str] | None = None,
    frozen_record_override: bytes | None = None,
) -> list[str]:
    """Validates delegated product-owner evidence and chronology.

    Args:
        root: Repository root.
        event: Delegated product-owner decision event.
        approval_bindings: Optional fixture-only current-state override.
        frozen_record_override: Optional fixture-only decision record bytes.

    Returns:
        Stable owner evidence and ordering errors.
    """
    errors: list[str] = []
    if not isinstance(event, dict):
        return [f"owner-approval-evidence: missing {OWNER_APPROVAL_EVENT}"]
    frozen_overrides = (
        {str(FROZEN_OWNER_DECISION_RECORD): frozen_record_override}
        if frozen_record_override is not None
        else None
    )
    expected_bindings = (
        approval_bindings
        if approval_bindings is not None
        else current_approval_bindings(root)
    )
    rollout_errors, decision_at, decision_bindings = rollout_source_errors(
        root,
        event,
        expected_bindings,
        frozen_overrides,
    )
    errors.extend(rollout_errors)
    envelope_valid = (
        event.get("schema_version")
        == "apk-asset-forensics.phase5-delegated-owner-decision-event.v2"
        and event.get("track_id") == TRACK_ID
        and event.get("event_type") == "delegated-product-owner-decision"
        and event.get("delegation_message") == OWNER_DELEGATION_MESSAGE
        and event.get("delegation_message_sha256")
        == OWNER_DELEGATION_MESSAGE_SHA256
        and event.get("thread_id") == OWNER_APPROVAL_THREAD_ID
        and event.get("decision") == OWNER_APPROVAL_DECISION
        and event.get("authority") == OWNER_DECISION_AUTHORITY
        and event.get("scope") == OWNER_APPROVAL_SCOPE
        and isinstance(event.get("owner_identity"), str)
        and bool(event.get("owner_identity"))
    )
    if not envelope_valid:
        add(
            errors,
            "owner-approval-evidence",
            "exact delegation, thread, owner, decision, and scope",
        )
    if (
        event.get("approved_input_bindings") != expected_bindings
        or event.get("approved_input_bindings") != decision_bindings
        or event.get("acceptance_gate_version") != ACCEPTANCE_GATE_VERSION
    ):
        add(
            errors,
            "owner-approval-evidence",
            "event bindings must equal decision candidate/review/gate bytes",
        )
    review_times: list[datetime] = []
    for name, bundle in FRESH_REVIEW_BUNDLES.items():
        review_path = root / bundle["review"]
        if (
            not review_path.is_file()
            or digest(review_path) != bundle["review_sha256"]
        ):
            add(
                errors,
                "owner-approval-evidence",
                f"final fresh review drift: {name}",
            )
            continue
        reviewed_at = parse_timestamp(load(review_path).get("reviewed_at"))
        if reviewed_at is None:
            add(errors, "owner-approval-evidence", f"review timestamp: {name}")
        else:
            review_times.append(reviewed_at)
    if (
        decision_at is None
        or len(review_times) != len(FRESH_REVIEW_BUNDLES)
        or any(decision_at <= reviewed_at for reviewed_at in review_times)
    ):
        add(
            errors,
            "owner-approval-order",
            "root-owner decision must be later than both final reviews",
        )
    return errors


def clean_findings(value: Any) -> bool:
    """Returns whether a review has no Critical, High, or Medium finding.

    Args:
        value: Review or receipt object.

    Returns:
        Whether all blocking severity collections are empty.
    """
    findings = value.get("findings") if isinstance(value, dict) else None
    if isinstance(findings, dict):
        return all(
            not findings.get(name, [])
            for name in (
                "critical",
                "high",
                "medium",
                "Critical",
                "High",
                "Medium",
            )
        )
    if isinstance(findings, list):
        return all(
            isinstance(item, dict)
            and str(item.get("severity", "")).lower()
            not in {"critical", "high", "medium"}
            for item in findings
        )
    return False


def review_batch_ids(review: Any) -> list[str]:
    """Derives the exact sorted batch set from a review path-coverage ledger.

    Args:
        review: Fresh independent review object.

    Returns:
        Sorted unique batch identifiers.
    """
    coverage = review.get("path_coverage") if isinstance(review, dict) else None
    if not isinstance(coverage, list):
        return []
    return sorted(
        {
            item.get("batch_id")
            for item in coverage
            if isinstance(item, dict) and isinstance(item.get("batch_id"), str)
        }
    )


def clean_receipt(receipt: Any, batches: list[str]) -> bool:
    """Returns whether a reviewer receipt has clean findings and coverage.

    Args:
        receipt: Fresh independent reviewer receipt.
        batches: Expected batch identifiers.

    Returns:
        Whether the receipt is root-acceptance-ready with zero findings.
    """
    if not isinstance(receipt, dict):
        return False
    results = receipt.get("results")
    coverage = receipt.get("coverage")
    return (
        isinstance(results, dict)
        and all(
            results.get(name) == 0
            for name in ("critical", "high", "medium", "low")
        )
        and results.get("finding_ids") == []
        and isinstance(coverage, dict)
        and coverage.get("batch_ids") == batches
        and receipt.get("root_acceptance_ready") is True
        and str(receipt.get("final_status", "")).startswith(
            "review-pass-no-unresolved-critical-high-medium"
        )
    )


def fixture_gate(root: Path) -> tuple[list[str], list[dict[str, str]]]:
    """Validates the exact hash-bound negative-fixture inventory.

    Args:
        root: Repository root.

    Returns:
        Fixture-gate errors and ordered fixture metadata.
    """
    errors: list[str] = []
    try:
        manifest = load(root / FIXTURE_MANIFEST)
    except (OSError, json.JSONDecodeError):
        return ["fixture-manifest: unavailable"], []
    fixtures = manifest.get("fixtures") if isinstance(manifest, dict) else None
    live = {
        str(path.relative_to(root)): path
        for path in (root / FIXTURE_DIRECTORY).glob("*.json")
    }
    if (
        not isinstance(fixtures, list)
        or manifest.get("schema_version")
        != "apk-asset-forensics.phase5-acceptance-fixture-manifest.v1"
        or manifest.get("fixture_directory") != str(FIXTURE_DIRECTORY)
        or len(fixtures) != EXPECTED_FIXTURE_COUNT
    ):
        return ["fixture-manifest: envelope"], []
    declared = {
        item.get("path"): item
        for item in fixtures
        if isinstance(item, dict)
        and set(item) == {"path", "sha256", "operation", "expected_error_code"}
    }
    if set(declared) != set(live) or len(declared) != EXPECTED_FIXTURE_COUNT:
        add(errors, "fixture-manifest", "exact fixture set")
    operations: set[str] = set()
    for path, item in declared.items():
        try:
            document = load(live[path])
            if (
                item["operation"] in operations
                or digest(live[path]) != item["sha256"]
                or document
                != {
                    "operation": item["operation"],
                    "expected_error_code": item["expected_error_code"],
                }
            ):
                add(errors, "fixture-manifest", path)
            operations.add(item["operation"])
        except (OSError, json.JSONDecodeError):
            add(errors, "fixture-manifest", path)
    return errors, [declared[path] for path in sorted(declared)]


def required_binding_errors(
    root: Path, acceptance: dict[str, Any], overrides: dict[str, Any] | None
) -> list[str]:
    """Validates static and review bindings declared by root acceptance.

    Args:
        root: Repository root.
        acceptance: Candidate root-acceptance object.
        overrides: Optional counterexample documents.

    Returns:
        Stable binding errors.
    """
    errors: list[str] = []
    bindings = acceptance.get("input_bindings")
    expected_paths = (
        set(STATIC_BINDINGS)
        | {str(path) for path in DYNAMIC_BINDING_PATHS}
        | {str(OWNER_APPROVAL_EVENT)}
    )
    for bundle in FRESH_REVIEW_BUNDLES.values():
        expected_paths.update({str(bundle["review"]), str(bundle["receipt"])})
    if not isinstance(bindings, dict) or set(bindings) != expected_paths:
        add(errors, "acceptance-binding", "exact input binding set")
        return errors
    for relative, expected_hash in STATIC_BINDINGS.items():
        path = root / relative
        if (
            not path.is_file()
            or bindings.get(relative) != expected_hash
            or digest(path) != expected_hash
        ):
            add(errors, "acceptance-binding", relative)
    for relative_path in DYNAMIC_BINDING_PATHS + [OWNER_APPROVAL_EVENT]:
        relative = str(relative_path)
        path = root / relative_path
        if not path.is_file() or bindings.get(relative) != digest(path):
            add(errors, "acceptance-binding", relative)
    report = load(root / CANDIDATE_REPORT)
    report_records = (
        report.get("records", []) if isinstance(report, dict) else []
    )
    for name, bundle in FRESH_REVIEW_BUNDLES.items():
        review_path, receipt_path = (
            root / bundle["review"],
            root / bundle["receipt"],
        )
        if not review_path.is_file() or not receipt_path.is_file():
            add(errors, "fresh-review-missing", name)
            continue
        review = (
            overrides.get(str(bundle["review"]), load(review_path))
            if overrides
            else load(review_path)
        )
        receipt = load(receipt_path)
        if (
            digest(review_path) != bundle["review_sha256"]
            or bindings.get(str(bundle["review"])) != bundle["review_sha256"]
            or bindings.get(str(bundle["receipt"])) != digest(receipt_path)
        ):
            add(errors, "acceptance-binding", name)
        expected_records = [
            row
            for row in report_records
            if isinstance(row, dict)
            and row.get("batch_id") in bundle["batches"]
        ]
        coverage = (
            review.get("path_coverage") if isinstance(review, dict) else None
        )
        expected_by_path = {
            row.get("canonical_path"): row for row in expected_records
        }
        coverage_by_path = (
            {
                row.get("canonical_path"): row
                for row in coverage
                if isinstance(row, dict)
            }
            if isinstance(coverage, list)
            else {}
        )
        coverage_exact = (
            isinstance(coverage, list)
            and len(coverage) == len(expected_records) == len(coverage_by_path)
            and set(coverage_by_path) == set(expected_by_path)
            and all(
                coverage_by_path[path].get("record_sha256")
                == row.get("record_sha256")
                and coverage_by_path[path].get("manifest_entry_verified")
                is True
                for path, row in expected_by_path.items()
            )
        )
        if (
            not isinstance(review, dict)
            or not clean_findings(review)
            or review_batch_ids(review) != bundle["batches"]
            or not coverage_exact
        ):
            add(errors, "fresh-review-findings", name)
        receipt_report = (
            receipt.get("review_report") if isinstance(receipt, dict) else None
        )
        if not clean_receipt(receipt, bundle["batches"]) or receipt_report != {
            "path": str(bundle["review"]),
            "sha256": digest(review_path),
        }:
            add(errors, "fresh-review-receipt", name)
    return errors


def acceptance_errors(
    root: Path,
    acceptance: Any,
    accepted_manifest: Any,
    owner_event: Any,
    overrides: dict[str, Any] | None = None,
    approval_bindings: dict[str, str] | None = None,
    frozen_record_override: bytes | None = None,
) -> list[str]:
    """Validates future owner artifacts without creating or deciding them.

    Args:
        root: Repository root.
        acceptance: Future root-acceptance object.
        accepted_manifest: Future accepted-manifest object.
        owner_event: Hash-bound post-review owner approval event.
        overrides: Optional isolated fixture documents.
        approval_bindings: Optional fixture-only current approval state.
        frozen_record_override: Optional fixture-only authoritative line bytes.

    Returns:
        Stable contract errors.
    """
    errors: list[str] = []
    if not isinstance(acceptance, dict):
        return ["root-acceptance-missing: phase5-root-acceptance.json"]
    if not isinstance(accepted_manifest, dict):
        return ["accepted-manifest-missing: phase5-accepted-manifest-v1.json"]
    errors.extend(
        owner_approval_errors(
            root, owner_event, approval_bindings, frozen_record_override
        )
    )
    event_binding = (
        {
            "path": str(OWNER_APPROVAL_EVENT),
            "sha256": digest(root / OWNER_APPROVAL_EVENT),
        }
        if (root / OWNER_APPROVAL_EVENT).is_file()
        else None
    )
    approval_at = (
        parse_timestamp(owner_event.get("decision_turn_timestamp"))
        if isinstance(owner_event, dict)
        else None
    )
    accepted_at = parse_timestamp(acceptance.get("accepted_at"))
    owner_event_id = (
        owner_event.get("decision_turn_event_id")
        if isinstance(owner_event, dict)
        else None
    )
    owner_identity = (
        owner_event.get("owner_identity")
        if isinstance(owner_event, dict)
        else None
    )
    root_schema_valid = (
        acceptance.get("schema_version")
        == "apk-asset-forensics.phase5-root-acceptance.v1"
        and acceptance.get("track_id") == TRACK_ID
        and acceptance.get("phase") == 5
        and acceptance.get("decision") == "ACCEPT_PHASE5"
        and acceptance.get("accepted_by") == "root-orchestrator-product-owner"
        and isinstance(owner_identity, str)
        and bool(owner_identity)
        and acceptance.get("owner_identity") == owner_identity
        and acceptance.get("scope") == "T9-only consumption"
        and acceptance.get("revocation_state") == "active"
        and acceptance.get("superseded_acceptance_id")
        == SUPERSEDED_ACCEPTANCE_ID
        and acceptance.get("owner_approval_event_binding") == event_binding
        and acceptance.get("owner_approval_turn_event_id") == owner_event_id
        and acceptance.get("next_gate")
        == {
            "name": "APK Evidence-Backed Ontology Synthesis",
            "status": "OPEN_T9_ONLY",
            "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        }
    )
    if not root_schema_valid:
        add(
            errors,
            "root-acceptance-schema",
            "active owner identity, decision, scope, event binding, and "
            "superseded acceptance",
        )
    if not failed_owner_cycles_valid(root, acceptance):
        add(
            errors,
            "failed-owner-cycle-disclosure",
            "exact v1 and v2 quarantined owner cycles",
        )
    if accepted_at is None or approval_at is None or accepted_at <= approval_at:
        add(
            errors,
            "owner-approval-order",
            "root acceptance timestamp must be later than approval timestamp",
        )
    if acceptance.get("blocking_findings") != {
        "Critical": [],
        "High": [],
        "Medium": [],
        "Low": [],
    }:
        add(errors, "root-blocking-findings", "exact empty severity ledger")
    if acceptance.get("accepted_reconciliation") != EXPECTED_TOTALS:
        add(errors, "accepted-reconciliation", "exact totals")
    errors.extend(required_binding_errors(root, acceptance, overrides))
    if acceptance.get("restored_ledger_bindings") != RESTORED_LEDGERS:
        add(errors, "restored-ledger-binding", "exact restored ledger hashes")
    for relative, expected_hash in RESTORED_LEDGERS.items():
        path = root / relative
        if not path.is_file() or digest(path) != expected_hash:
            add(errors, "restored-ledger-binding", relative)
    if (
        acceptance.get("superseded_pre_repair_reviews")
        != SUPERSEDED_PRE_REPAIR_REVIEWS
    ):
        add(
            errors,
            "failed-review-disclosure",
            "exact superseded pre-repair reviews",
        )
    report = load(root / CANDIDATE_REPORT, overrides)
    non_consumable = load(root / NON_CONSUMABLE_MANIFEST, overrides)
    if (
        report.get("reconciliation_summary") != EXPECTED_TOTALS
        or non_consumable.get("reconciliation_summary") != EXPECTED_TOTALS
    ):
        add(errors, "candidate-publication-parity", "candidate totals")
    phase4_acceptance = load(root / TRACK / "phase4-root-acceptance.json")
    expected_visual = {
        "source_phase4_root_acceptance": {
            "path": str(TRACK / "phase4-root-acceptance.json"),
            "sha256": STATIC_BINDINGS[
                str(TRACK / "phase4-root-acceptance.json")
            ],
        },
        "evidence_scope": "bounded-composite-scene-only",
        "browser_is_per_path_runtime_load_proof": False,
        "root_direct_visual_review_preserved": True,
        "usability_defect_disclosures": phase4_acceptance.get(
            "browser_and_direct_visual_review", {}
        ).get("usability_defect_disclosures"),
    }
    if acceptance.get("browser_and_direct_visual_review") != expected_visual:
        add(
            errors,
            "root-visual-scope",
            "exact bounded browser and direct-visual disclosure",
        )
    accepted_entries = accepted_manifest.get("entries")
    manifest_schema_valid = (
        accepted_manifest.get("schema_version")
        == "apk-asset-forensics.phase5-accepted-manifest.v1"
        and accepted_manifest.get("track_id") == TRACK_ID
        and accepted_manifest.get("phase") == 5
        and accepted_manifest.get("status") == "ACCEPTED_PHASE5"
        and accepted_manifest.get("revocation_state") == "active"
        and accepted_manifest.get("superseded_acceptance_id")
        == SUPERSEDED_ACCEPTANCE_ID
    )
    if not manifest_schema_valid:
        add(
            errors,
            "accepted-manifest-schema",
            "active identity and superseded acceptance",
        )
    if accepted_manifest.get("reconciliation_summary") != EXPECTED_TOTALS:
        add(errors, "accepted-reconciliation", "accepted manifest exact totals")
    if (
        accepted_manifest.get("consumer_scope") != ACTIVE_CONSUMER_SCOPE
        or accepted_manifest.get("prohibitions") != PROHIBITIONS
    ):
        add(
            errors,
            "accepted-consumer-scope",
            "T9 ontology only and prohibitions",
        )
    expected_root_binding = (
        {"path": str(ROOT_ACCEPTANCE), "sha256": digest(root / ROOT_ACCEPTANCE)}
        if (root / ROOT_ACCEPTANCE).is_file()
        else None
    )
    if (
        accepted_manifest.get("root_acceptance_binding")
        != expected_root_binding
    ):
        add(errors, "accepted-root-binding", "exact root acceptance")
    if accepted_manifest.get("candidate_report_binding") != {
        "path": str(CANDIDATE_REPORT),
        "sha256": digest(root / CANDIDATE_REPORT),
    } or accepted_manifest.get("non_consumable_manifest_binding") != {
        "path": str(NON_CONSUMABLE_MANIFEST),
        "sha256": digest(root / NON_CONSUMABLE_MANIFEST),
    }:
        add(
            errors,
            "accepted-publication-binding",
            "candidate report or non-consumable manifest",
        )
    if (
        accepted_entries != non_consumable.get("entries")
        or not isinstance(accepted_entries, list)
        or len(accepted_entries) != 428
    ):
        add(errors, "accepted-entry-parity", "exact 428 non-consumable entries")
    else:
        report_by_path = {
            row.get("canonical_path"): row
            for row in report.get("records", [])
            if isinstance(row, dict)
        }
        for entry in accepted_entries:
            record = report_by_path.get(entry.get("canonical_path"))
            if not isinstance(record, dict) or entry.get(
                "report_record_sha256"
            ) != record.get("record_sha256"):
                add(
                    errors,
                    "accepted-entry-parity",
                    str(entry.get("canonical_path")),
                )
            if (
                entry.get("canonical_standard_pack_candidate_key") is not None
                or entry.get("direct_legacy_adoption") is not False
                or entry.get("disposition", {}).get("value")
                in {"reuse", "adapt", "reference"}
            ):
                add(
                    errors,
                    "accepted-entry-prohibition",
                    str(entry.get("canonical_path")),
                )
    return errors


def mutate(
    root: Path,
    acceptance: dict[str, Any],
    manifest: dict[str, Any],
    owner_event: dict[str, Any],
    overrides: dict[str, Any],
    fixture_state: dict[str, Any],
    operation: str,
) -> None:
    """Applies one isolated future-gate counterexample in memory.

    Args:
        root: Repository root.
        acceptance: Mutable acceptance copy.
        manifest: Mutable accepted-manifest copy.
        owner_event: Mutable owner approval event copy.
        overrides: Mutable future-document overrides.
        fixture_state: Mutable fixture-only approval bindings and rollout bytes.
        operation: Fixture operation name.

    Returns:
        None.
    """
    if operation == "missing_path":
        manifest["entries"].pop()
    elif operation == "entry_drift":
        manifest["entries"][0]["asset_sha256"] = "0" * 64
    elif operation == "stale_binding":
        acceptance["input_bindings"][str(CANDIDATE_REPORT)] = "0" * 64
    elif operation == "illicit_scope_adoption":
        manifest["consumer_scope"] = "production"
        manifest["entries"][0]["direct_legacy_adoption"] = True
    elif operation == "missing_failed_cycle_disclosure":
        acceptance["failed_owner_cycles"].pop()
    elif operation == "restored_ledger_drift":
        acceptance["restored_ledger_bindings"][next(iter(RESTORED_LEDGERS))] = (
            "0" * 64
        )
    elif operation == "review_finding":
        review_path = str(next(iter(FRESH_REVIEW_BUNDLES.values()))["review"])
        review = copy.deepcopy(overrides[review_path])
        review["findings"] = {
            "critical": [],
            "high": [{"severity": "high"}],
            "medium": [],
            "low": [],
        }
        overrides[review_path] = review
    elif operation == "approval_message_hash_drift":
        owner_event["decision_text"] = str(owner_event["decision_text"]) + " "
    elif operation == "approval_before_review":
        record = json.loads(
            (root / FROZEN_OWNER_DECISION_RECORD).read_text(encoding="utf-8")
        )
        record["timestamp"] = "2026-07-24T01:00:00.000Z"
        frozen_bytes = (
            json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
        ).encode("utf-8")
        fixture_state["frozen_record_override"] = frozen_bytes
        owner_event["decision_turn_timestamp"] = record["timestamp"]
        decision_binding = owner_event[
            "authoritative_rollout_approval_context"
        ]["assistant_decision"]
        decision_binding["frozen_record_sha256"] = hashlib.sha256(
            frozen_bytes
        ).hexdigest()
        decision_binding["origin_line_sha256"] = hashlib.sha256(
            frozen_bytes
        ).hexdigest()
    elif operation == "approval_event_replay":
        fixture_state["approval_bindings"][str(NON_CONSUMABLE_MANIFEST)] = (
            "f" * 64
        )
        fixture_state["approval_bindings"][
            str(TRACK / "phase5_acceptance_test.py")
        ] = "e" * 64
        owner_event["approved_input_bindings"] = copy.deepcopy(
            fixture_state["approval_bindings"]
        )


def main() -> int:
    """Runs the gate and optionally writes its red diagnostic.

    Returns:
        Process status zero only after a future owner publication passes.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    fixture_errors, fixtures = fixture_gate(root)
    acceptance_path = root / ROOT_ACCEPTANCE
    manifest_path = root / ACCEPTED_MANIFEST
    event_path = root / OWNER_APPROVAL_EVENT
    errors = list(fixture_errors)
    fixture_results: list[dict[str, Any]] = []
    acceptance = load(acceptance_path) if acceptance_path.is_file() else None
    manifest = load(manifest_path) if manifest_path.is_file() else None
    owner_event = load(event_path) if event_path.is_file() else None
    if acceptance is None:
        add(errors, "root-acceptance-missing", str(ROOT_ACCEPTANCE))
    if manifest is None:
        add(errors, "accepted-manifest-missing", str(ACCEPTED_MANIFEST))
    if owner_event is None:
        add(
            errors, "owner-approval-evidence", f"missing {OWNER_APPROVAL_EVENT}"
        )
        if isinstance(acceptance, dict) and (
            acceptance.get("decision") != "PENDING_POST_REVIEW_USER_APPROVAL"
            or acceptance.get("revocation_state") != "revoked"
            or acceptance.get("next_gate", {}).get("status")
            != "CLOSED_PENDING_OWNER_APPROVAL"
            or not failed_owner_cycles_valid(root, acceptance)
        ):
            add(
                errors,
                "root-acceptance-schema",
                "pending/revoked publication must stay closed and disclose "
                "both quarantined owner cycles",
            )
        if isinstance(manifest, dict) and (
            manifest.get("status") != "ACCEPTED_PHASE5"
            or manifest.get("revocation_state") != "active"
            or manifest.get("consumer_scope") != ACTIVE_CONSUMER_SCOPE
        ):
            add(
                errors,
                "accepted-manifest-schema",
                "revoked or pending T9-only publication",
            )
    elif acceptance is not None and manifest is not None:
        errors.extend(
            acceptance_errors(root, acceptance, manifest, owner_event)
        )
        for fixture in fixtures:
            a, m, e = (
                copy.deepcopy(acceptance),
                copy.deepcopy(manifest),
                copy.deepcopy(owner_event),
            )
            overrides = {
                str(bundle["review"]): load(root / bundle["review"])
                for bundle in FRESH_REVIEW_BUNDLES.values()
                if (root / bundle["review"]).is_file()
            }
            fixture_state: dict[str, Any] = {
                "approval_bindings": current_approval_bindings(root),
                "frozen_record_override": None,
            }
            mutate(
                root, a, m, e, overrides, fixture_state, fixture["operation"]
            )
            found = acceptance_errors(
                root,
                a,
                m,
                e,
                overrides,
                fixture_state["approval_bindings"],
                fixture_state["frozen_record_override"],
            )
            codes = sorted({item.split(":", 1)[0] for item in found})
            fixture_results.append(
                {
                    "fixture": fixture["path"],
                    "operation": fixture["operation"],
                    "expected_error_code": fixture["expected_error_code"],
                    "error_codes": codes,
                    "rejected": fixture["expected_error_code"] in codes,
                }
            )
    result = {
        "schema_version": (
            "apk-asset-forensics.phase5-acceptance-test-report.v1"
        ),
        "track_id": TRACK_ID,
        "role": "phase5-acceptance-test-author",
        "production": {"passed": not errors, "errors": errors},
        "counterexample_count": len(fixture_results),
        "all_counterexamples_rejected": bool(fixture_results)
        and all(item["rejected"] for item in fixture_results),
        "counterexamples": fixture_results,
        "final_status": "acceptance-contract-pass"
        if not errors
        and fixture_results
        and all(item["rejected"] for item in fixture_results)
        else "red-before-owner-publication",
    }
    if args.write:
        output_path = (
            OUT_GREEN_REPORT
            if result["final_status"] == "acceptance-contract-pass"
            else OUT_RED_REPORT
        )
        (root / output_path).write_text(
            json.dumps(result, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        if output_path == OUT_GREEN_REPORT:
            receipt = {
                "schema_version": (
                    "apk-role-receipt.phase5-acceptance-truth-test-author.v1"
                ),
                "role": "phase5-acceptance-truth-test-author",
                "output_file_hashes": {
                    str(OUT_GREEN_REPORT): digest(root / OUT_GREEN_REPORT),
                    str(TRACK / "phase5_acceptance_test.py"): digest(
                        root / TRACK / "phase5_acceptance_test.py"
                    ),
                },
                "production": result["production"],
                "counterexamples": {
                    "count": result["counterexample_count"],
                    "all_rejected": result["all_counterexamples_rejected"],
                },
                "final_status": result["final_status"],
            }
            (root / OUT_RECEIPT).write_text(
                json.dumps(receipt, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
    print(json.dumps(result, indent=2, sort_keys=True))
    return (
        0
        if result["production"]["passed"]
        and result["all_counterexamples_rejected"]
        else 1
    )


if __name__ == "__main__":
    raise SystemExit(main())
