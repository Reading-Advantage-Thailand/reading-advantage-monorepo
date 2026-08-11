#!/usr/bin/env bash
set -uo pipefail

FAILED=0
PASS_COUNT=0
FAIL_COUNT=0
RESULTS=()

pass() {
  RESULTS+=("PASS: $1")
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  RESULTS+=("FAIL: $1")
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAILED=1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if ! cd "$ROOT"; then
  fail "repository root is available"
  printf '%s\n' "${RESULTS[@]}"
  echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
  exit "$FAILED"
fi

TRACK_ID="codecamp_pr_mastery_evaluation_20260710"

# A9: keep this contract valid if the track is archived after acceptance.
track_dir_resolve() {
  local track_id="$1"
  if [ -d "measure/archive/$track_id" ]; then
    printf 'measure/archive/%s\n' "$track_id"
  else
    printf 'measure/tracks/%s\n' "$track_id"
  fi
}

TRACK_DIR="$(track_dir_resolve "$TRACK_ID")"
APPROVAL_ARTIFACT="$TRACK_DIR/release-approval.json"
APPROVED_CONFIG_COMMIT="508fac6fd"
APPROVED_REPOSITORY_HEAD="46f97a54d69c37f931c72069ff063d95e1525c41"

# Validate the durable artifact itself, or a negative in-memory fixture. The
# exact shape deliberately contains no message ID, signature, person name, or
# evaluation outcome beyond the owner-selected decision label.
validate_contract() {
  local source_kind="$1"
  local source="$2"

  python3 - "$source_kind" "$source" <<'PY'
import json
import sys
from pathlib import Path

source_kind, source = sys.argv[1:]

if source_kind == "file":
    path = Path(source)
    if not path.is_file():
        raise SystemExit(f"missing durable owner-approval artifact: {path}")
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as error:
        raise SystemExit(f"cannot read durable owner-approval artifact: {error}")
elif source_kind == "json":
    raw = source
else:
    raise SystemExit(f"unsupported validation source: {source_kind}")


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


try:
    artifact = json.loads(raw, object_pairs_hook=reject_duplicate_keys)
except (ValueError, TypeError, json.JSONDecodeError) as error:
    raise SystemExit(f"approval artifact must be strict JSON: {error}")

if not isinstance(artifact, dict):
    raise SystemExit("approval artifact must be a JSON object")

expected_keys = {
    "decision",
    "mode",
    "approved_config_commit",
    "approved_repository_head",
    "approver_marker",
    "scope",
    "source_statement",
}
actual_keys = set(artifact)
if actual_keys != expected_keys:
    missing = sorted(expected_keys - actual_keys)
    extra = sorted(actual_keys - expected_keys)
    raise SystemExit(f"approval artifact keys differ; missing={missing}, extra={extra}")

expected_scalars = {
    "decision": "approved",
    "mode": "active",
    "approved_config_commit": "508fac6fd",
    "approved_repository_head": "46f97a54d69c37f931c72069ff063d95e1525c41",
    "source_statement": "Approve active rollout",
}
for key, expected in expected_scalars.items():
    if artifact[key] != expected:
        raise SystemExit(f"{key} must equal the bounded release contract")

expected_marker = {
    "name": "CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY",
    "value": "codecamp-ops-release",
}
if artifact["approver_marker"] != expected_marker:
    raise SystemExit("approver marker does not match the deployed contract")

expected_scope = {
    "pr_feedback": "advisory",
    "merge_gate": False,
    "human_authority": False,
    "mastery_mutation": False,
    "s4_closeout": False,
}
if artifact["scope"] != expected_scope:
    raise SystemExit("approval scope is broader than advisory PR feedback")
PY
}

expect_rejected() {
  local label="$1"
  local candidate="$2"
  local validation_output

  if validation_output=$(validate_contract json "$candidate" 2>&1); then
    fail "$label"
  else
    pass "$label"
  fi
}

echo "=== approved rollout revisions resolve ==="
if git rev-parse --verify "${APPROVED_CONFIG_COMMIT}^{commit}" >/dev/null 2>&1 \
  && git rev-parse --verify "${APPROVED_REPOSITORY_HEAD}^{commit}" >/dev/null 2>&1 \
  && git merge-base --is-ancestor "$APPROVED_CONFIG_COMMIT" "$APPROVED_REPOSITORY_HEAD"; then
  pass "approved config commit 508fac6fd is an ancestor of reviewed repository head 46f97a54d"
else
  fail "approved config commit 508fac6fd is an ancestor of reviewed repository head 46f97a54d"
fi

echo "=== approved config revision carries the deployed active advisory contract ==="
if git show "${APPROVED_CONFIG_COMMIT}:apps/codecamp-advantage/cloudbuild.yaml" \
  | python3 -c '
import sys

text = sys.stdin.read()
required = (
    "CODECAMP_PR_REVIEW_ROLLOUT_MODE=active",
    "CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release",
)
missing = [value for value in required if value not in text]
if missing:
    raise SystemExit("missing deployed contract values: " + ", ".join(missing))
'; then
  pass "approved config revision carries active mode and the exact approver marker"
else
  fail "approved config revision carries active mode and the exact approver marker"
fi

echo "=== durable revision-bound owner approval artifact exists and matches the bounded contract ==="
if validation_output=$(validate_contract file "$APPROVAL_ARTIFACT" 2>&1); then
  pass "durable owner-approval artifact exists at $APPROVAL_ARTIFACT"
else
  validation_output="${validation_output//$'\n'/ }"
  fail "durable owner-approval artifact exists at $APPROVAL_ARTIFACT (${validation_output:-validation failed})"
fi

WRONG_MARKER='{"decision":"approved","mode":"active","approved_config_commit":"508fac6fd","approved_repository_head":"46f97a54d69c37f931c72069ff063d95e1525c41","approver_marker":{"name":"CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY","value":"mismatched-marker"},"scope":{"pr_feedback":"advisory","merge_gate":false,"human_authority":false,"mastery_mutation":false,"s4_closeout":false},"source_statement":"Approve active rollout"}'
echo "=== mismatched approver marker is rejected ==="
expect_rejected "mismatched CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY marker is rejected" "$WRONG_MARKER"

WRONG_CONFIG='{"decision":"approved","mode":"active","approved_config_commit":"000000000","approved_repository_head":"46f97a54d69c37f931c72069ff063d95e1525c41","approver_marker":{"name":"CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY","value":"codecamp-ops-release"},"scope":{"pr_feedback":"advisory","merge_gate":false,"human_authority":false,"mastery_mutation":false,"s4_closeout":false},"source_statement":"Approve active rollout"}'
echo "=== wrong approved config revision is rejected ==="
expect_rejected "wrong approved config revision is rejected" "$WRONG_CONFIG"

WRONG_HEAD='{"decision":"approved","mode":"active","approved_config_commit":"508fac6fd","approved_repository_head":"8e7a17ec38abd4e5dc33b8ed1ac7ac3186c22288","approver_marker":{"name":"CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY","value":"codecamp-ops-release"},"scope":{"pr_feedback":"advisory","merge_gate":false,"human_authority":false,"mastery_mutation":false,"s4_closeout":false},"source_statement":"Approve active rollout"}'
echo "=== wrong reviewed repository head is rejected ==="
expect_rejected "wrong reviewed repository head is rejected" "$WRONG_HEAD"

BROAD_SCOPE='{"decision":"approved","mode":"active","approved_config_commit":"508fac6fd","approved_repository_head":"46f97a54d69c37f931c72069ff063d95e1525c41","approver_marker":{"name":"CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY","value":"codecamp-ops-release"},"scope":{"pr_feedback":"advisory","merge_gate":true,"human_authority":false,"mastery_mutation":false,"s4_closeout":false},"source_statement":"Approve active rollout"}'
echo "=== broader merge authority is rejected ==="
expect_rejected "broader merge authority is rejected" "$BROAD_SCOPE"

BROAD_SOURCE='{"decision":"approved","mode":"active","approved_config_commit":"508fac6fd","approved_repository_head":"46f97a54d69c37f931c72069ff063d95e1525c41","approver_marker":{"name":"CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY","value":"codecamp-ops-release"},"scope":{"pr_feedback":"advisory","merge_gate":false,"human_authority":false,"mastery_mutation":false,"s4_closeout":false},"source_statement":"Approve active rollout and close S4"}'
echo "=== broadened source statement is rejected ==="
expect_rejected "broadened source statement is rejected" "$BROAD_SOURCE"

MISSING_DECISION='{"mode":"active","approved_config_commit":"508fac6fd","approved_repository_head":"46f97a54d69c37f931c72069ff063d95e1525c41","approver_marker":{"name":"CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY","value":"codecamp-ops-release"},"scope":{"pr_feedback":"advisory","merge_gate":false,"human_authority":false,"mastery_mutation":false,"s4_closeout":false},"source_statement":"Approve active rollout"}'
echo "=== absent owner decision is rejected ==="
expect_rejected "absent owner decision is rejected" "$MISSING_DECISION"

for result in "${RESULTS[@]}"; do
  printf '%s\n' "$result"
done
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
