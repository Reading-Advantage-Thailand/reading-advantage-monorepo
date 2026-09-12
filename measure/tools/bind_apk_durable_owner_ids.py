#!/usr/bin/env python3
"""Bind non-null durable product-owner IDs into APK formal-acceptance packages.

Usage:
  python3 measure/tools/bind_apk_durable_owner_ids.py \\
    --message-id <real-id> --event-id <real-id> \\
    [--track apk_existing_core_cutover_20260727 ...]

Refuses empty/null/placeholder IDs. Does not invent IDs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_TRACKS = [
    "apk_existing_core_cutover_20260727",
    "apk_existing_action_cutover_20260727",
    "apk_legacy_defense_cutover_20260727",
    "apk_legacy_puzzle_cutover_20260727",
    "apk_legacy_traversal_cutover_20260727",
    "apk_cross_host_closeout_20260727",
]
PLACEHOLDER = re.compile(
    r"^(null|none|n/a|todo|tbd|placeholder|fake|example).*$",
    re.I,
)


def refuse_id(label: str, value: str | None) -> str:
    """Rejects empty or placeholder durable identifiers."""
    if value is None or not str(value).strip():
        raise SystemExit(f"{label} must be non-empty")
    cleaned = str(value).strip()
    if PLACEHOLDER.match(cleaned):
        raise SystemExit(f"{label} looks like a placeholder, refusing: {cleaned!r}")
    if cleaned.lower() in {"0", "undefined", "missing"}:
        raise SystemExit(f"{label} is not a durable id: {cleaned!r}")
    return cleaned


def sha256_file(path: Path) -> str:
    """Returns the SHA-256 digest of one file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    """Binds supplied durable IDs into acceptance packages and marks tracks complete."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--message-id", required=True, help="Real durable_user_message_id")
    parser.add_argument("--event-id", required=True, help="Real durable_user_event_id")
    parser.add_argument(
        "--track",
        action="append",
        dest="tracks",
        help="Track id (repeatable). Default: all cutover tracks awaiting durable IDs.",
    )
    parser.add_argument(
        "--event-timestamp",
        default=None,
        help="Optional ISO-8601 event timestamp if known",
    )
    args = parser.parse_args()
    message_id = refuse_id("message-id", args.message_id)
    event_id = refuse_id("event-id", args.event_id)
    tracks = args.tracks or DEFAULT_TRACKS

    for track_id in tracks:
        path = (
            REPO
            / "measure/tracks"
            / track_id
            / "product-owner-formal-acceptance-2026-08-02.json"
        )
        if not path.is_file():
            raise SystemExit(f"missing acceptance package: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        event = data.setdefault("approval_event", {})
        event["durable_user_message_id"] = message_id
        event["durable_user_message_id_available"] = True
        event["durable_user_event_id"] = event_id
        event["durable_user_event_id_available"] = True
        if args.event_timestamp:
            event["event_timestamp"] = args.event_timestamp
            event["event_timestamp_available"] = True
        event["limitation"] = (
            "Durable user-message and user-event identifiers supplied by the product owner "
            "and bound without fabrication."
        )
        data["status"] = "accepted-formal-close-with-durable-ids"
        auth = data.setdefault("authorization", {})
        auth["track_formal_close_authorized"] = True
        auth["durable_id_formal_close_authorized"] = True
        auth["technical_evidence_goal_authorized"] = True
        auth["production_catalog_exposure_authorized"] = False
        auth["legacy_path_deletion_authorized"] = False
        auth["production_deployment_authorized"] = False
        data["next_step"] = (
            "Flip plan owner-close tasks and measure/tracks.md registry to complete; "
            "production cutover remains a separate authorization."
        )
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

        meta_path = REPO / "measure/tracks" / track_id / "metadata.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["status"] = "complete"
        meta["completion_blocker"] = None
        meta["updated_at"] = "2026-08-02T00:00:00Z"
        meta["owner_formal_close"] = {
            "authorized": True,
            "acceptance_path": str(path.relative_to(REPO)),
            "acceptance_sha256": sha256_file(path),
            "durable_message_id": message_id,
            "durable_event_id": event_id,
            "durable_ids_available": True,
        }
        meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        print(f"bound {track_id} message_id={message_id!r} event_id={event_id!r}")
        print(f"  acceptance_sha256={sha256_file(path)}")

    print(
        "Next: mark plan owner-close tasks [x], flip measure/tracks.md [b]->[x] for bound tracks, "
        "update test_apk_product_owner_formal_acceptance_20260802 to expect durable IDs, "
        "and re-run Measure + dual-host suites."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
