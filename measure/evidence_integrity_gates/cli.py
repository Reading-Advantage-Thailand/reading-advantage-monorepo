"""Command-line adapter for fail-closed evidence integrity lifecycle validation."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence

from measure.evidence_integrity_gates.events import MappingEventResolver
from measure.evidence_integrity_gates.lifecycle import validate_lifecycle
from measure.evidence_integrity_gates.supervisor_gate import (
    canonical_review_prompt,
    validate_supervisor_completion,
)


def _decode_event(value: Mapping[str, Any]) -> dict[str, Any]:
    """Decodes one JSON-safe raw event record for the event adapter.

    @param value JSON event record with base64 byte fields.
    @returns Event record with exact byte fields required by the approval validator.
    @throws ValueError When an event is malformed or its declared hash is forged.
    """
    try:
        raw_export = base64.b64decode(value["raw_export_base64"], validate=True)
        message = base64.b64decode(value["message_base64"], validate=True)
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("event byte encoding is invalid") from error
    if hashlib.sha256(raw_export).hexdigest() != value.get("raw_export_sha256"):
        raise ValueError("event raw export hash does not match")
    event = dict(value)
    event.pop("raw_export_base64", None)
    event.pop("message_base64", None)
    event["raw_export_bytes"] = raw_export
    event["message_bytes"] = message
    return event


def build_event_resolver(history: Mapping[str, Any]) -> MappingEventResolver:
    """Builds the concrete JSON-event adapter for one lifecycle command.

    @param history Parsed lifecycle history with raw event records.
    @returns Resolver that validates authentic approval event bytes.
    @throws ValueError When the event inventory is malformed.
    """
    raw_events = history.get("events")
    if not isinstance(raw_events, Mapping):
        raise ValueError("history.events must be a mapping")
    events: dict[str, Mapping[str, Any]] = {}
    for event_id, value in raw_events.items():
        if not isinstance(event_id, str) or not isinstance(value, Mapping):
            raise ValueError("event inventory contains an invalid record")
        event = _decode_event(value)
        if event.get("id") != event_id:
            raise ValueError("event inventory key does not match event id")
        events[event_id] = event
    return MappingEventResolver(events)


def run_lifecycle(history_path: Path) -> dict[str, Any]:
    """Loads and validates one lifecycle history through concrete adapters.

    @param history_path JSON history path supplied by the CLI caller.
    @returns Deterministic lifecycle report.
    """
    try:
        history = json.loads(history_path.read_text(encoding="utf-8"))
        if not isinstance(history, Mapping):
            raise ValueError("history root must be an object")
        resolver = build_event_resolver(history)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        return {
            "ok": False,
            "state": "blocked",
            "blockers": [{"code": "INVALID_LIFECYCLE_HISTORY", "detail": {"error": str(error)}}],
            "transitions": [],
            "resource_report": {},
        }
    return validate_lifecycle(history, resolver)


def main(argv: Sequence[str] | None = None) -> int:
    """Runs the evidence integrity lifecycle command.

    @param argv Optional command arguments for embedding and tests.
    @returns Zero for acceptance, one for a gate blocker, or two for CLI misuse.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    lifecycle = subparsers.add_parser("lifecycle", help="validate a lifecycle history")
    lifecycle.add_argument("--history", type=Path, required=True, help="history JSON file")
    completion = subparsers.add_parser(
        "supervisor-completion", help="validate a protected track completion"
    )
    completion.add_argument("--repo", type=Path, required=True, help="repository root")
    completion.add_argument("--track", required=True, help="protected Measure track id")
    completion.add_argument(
        "--stage", choices=("preflight", "completion"), default="completion"
    )
    review_prompt = subparsers.add_parser(
        "review-prompt", help="emit the canonical review prompt for exact candidate bytes"
    )
    review_prompt.add_argument(
        "--candidate", type=Path, required=True, help="candidate manifest file"
    )
    arguments = parser.parse_args(argv)
    if arguments.command == "lifecycle":
        report = run_lifecycle(arguments.history)
    elif arguments.command == "review-prompt":
        try:
            prompt = canonical_review_prompt(arguments.candidate.read_bytes())
        except (OSError, ValueError) as error:
            parser.error(str(error))
        sys.stdout.buffer.write(prompt)
        return 0
    else:
        report = validate_supervisor_completion(
            arguments.repo, arguments.track, stage=arguments.stage
        )
    print(json.dumps(report, sort_keys=True, separators=(",", ":")))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
