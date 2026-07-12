#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import hashlib
import json
import subprocess
from pathlib import Path

failures = []
superseded = set()
for path in Path("measure/tests").glob("**/role-receipts/*-supersession.json"):
    payload = json.loads(path.read_text(encoding="utf-8"))
    old = payload.get("superseded_receipt")
    replacement = payload.get("replacement_evidence")
    if not isinstance(old, str) or not isinstance(replacement, str) or not Path(replacement).is_file():
        failures.append(f"{path}: invalid supersession binding")
        continue
    superseded.add(old)

receipts = sorted(
    path for path in Path("measure/tests").glob("**/role-receipts/phase*.json")
    if "supersession" not in path.name and str(path) not in superseded
)
for receipt_path in receipts:
    payload = json.loads(receipt_path.read_text(encoding="utf-8"))
    attestation = payload.get("tool_attested_receipts", {}).get("this_subagent_receipt", {})
    hashes = attestation.get("enumerated_output_file_hashes")
    if not isinstance(hashes, dict) or not hashes:
        failures.append(f"{receipt_path}: missing enumerated_output_file_hashes")
        continue
    for output, expected in hashes.items():
        path = Path(output)
        if not path.is_file():
            failures.append(f"{receipt_path}: missing output {output}")
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            failures.append(
                f"{receipt_path}: stale hash for {output}: expected {expected}, got {actual}"
            )

# Scan both active and archived track roots for OpenCode provenance.
# Deduplicate by track: if a track exists in both roots (possible during
# partial archive), prefer the active track path.
provenance_by_track: dict[str, Path] = {}
for root in ("measure/tracks", "measure/archive"):
    for path in sorted(Path(root).glob("*/phase*-opencode-provenance.json")):
        track = path.parent.name
        # Only register if unseen (first root wins, i.e. active > archived)
        if track not in provenance_by_track:
            provenance_by_track[track] = path
provenance_files = sorted(provenance_by_track.values())
for provenance_path in provenance_files:
    payload = json.loads(provenance_path.read_text(encoding="utf-8"))
    for role in payload.get("roles", []):
        hashes = role.get("output_sha256")
        if not isinstance(hashes, dict) or not hashes:
            failures.append(f"{provenance_path}: role has no output hashes")
            continue
        for output, expected in hashes.items():
            commit = role.get("output_commit")
            if not isinstance(commit, str):
                failures.append(f"{provenance_path}: role has no output commit")
                continue
            result = subprocess.run(
                ("git", "show", f"{commit}:{output}"),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            if result.returncode != 0:
                failures.append(f"{provenance_path}: missing {output} at {commit}")
                continue
            actual = hashlib.sha256(result.stdout).hexdigest()
            if actual != expected:
                failures.append(f"{provenance_path}: stale hash for {output}: expected {expected}, got {actual}")

if not receipts and not provenance_files:
    raise SystemExit("FAIL: A15 — no active phase role evidence found")
if failures:
    print("FAIL: A15 — role receipt output hashes do not match HEAD:")
    print("\n".join(failures))
    raise SystemExit(1)
print(f"PASS: role evidence output hashes match HEAD ({len(receipts)} legacy receipt(s), {len(provenance_files)} OpenCode manifest(s))")
PY
