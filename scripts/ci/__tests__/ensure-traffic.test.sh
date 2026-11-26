#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export PATH="$tmp:$PATH" CALLS="$tmp/calls" GITHUB_STEP_SUMMARY="$tmp/summary"

cat > "$tmp/gcloud" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$CALLS"
new="$SERVICE-00003-abc"
old="$SERVICE-00001-def"
if [[ "$FIXTURE" == custom-names ]]; then
  new="$SERVICE-release-new"
  old="$SERVICE-release-old"
fi
case "$1 $2 $3" in
  'run services describe')
    [[ "$4" == "$SERVICE" && "$*" == *"--region test-region --project test-project --format json"* ]]
    [[ "$FIXTURE" != describe-failure ]] || exit 1
    if [[ "$FIXTURE" == no-ready ]]; then
      echo '{"status":{}}'
    elif [[ "$FIXTURE" == not-ready ]]; then
      printf '{"status":{"latestReadyRevisionName":"%s","latestCreatedRevisionName":"%s"}}\n' "$old" "$new"
    elif [[ "$FIXTURE" == latest-alias ]]; then
      printf '{"status":{"latestReadyRevisionName":"%s","traffic":[{"latestRevision":true,"percent":100}]}}\n' "$new"
    elif [[ "$FIXTURE" == all-latest || "$FIXTURE" == explicit-latest ]] ||
         [[ "$FIXTURE" == pinned && -f "$CALLS.updated" ]]; then
      latest=true
      [[ "$FIXTURE" != explicit-latest ]] || latest=false
      printf '{"status":{"latestReadyRevisionName":"%s","traffic":[{"revisionName":"%s","latestRevision":%s,"percent":100}]}}\n' "$new" "$new" "$latest"
    elif [[ "$FIXTURE" == split ]]; then
      printf '{"status":{"latestReadyRevisionName":"%s","traffic":[{"revisionName":"%s","percent":50},{"revisionName":"%s","percent":50}]}}\n' "$new" "$old" "$new"
    else
      [[ "$FIXTURE" != one-behind ]] || old="$SERVICE-00002-ghi"
      printf '{"status":{"latestReadyRevisionName":"%s","traffic":[{"revisionName":"%s","percent":100},{"revisionName":"%s","tag":"candidate"}]}}\n' "$new" "$old" "$new"
    fi
    ;;
  'run services update-traffic')
    [[ "$4" == "$SERVICE" && "$*" == *"--region test-region --project test-project --to-latest"* ]]
    [[ "$FIXTURE" != update-failure ]] || exit 1
    touch "$CALLS.updated"
    ;;
  'run revisions list')
    [[ "$*" == *"--service $SERVICE --region test-region --project test-project"* ]]
    printf '[{"metadata":{"name":"%s"}},{"metadata":{"name":"%s-00002-ghi"}},{"metadata":{"name":"%s"}}]\n' "$old" "$SERVICE" "$new"
    ;;
  *) exit 98 ;;
esac
STUB
chmod +x "$tmp/gcloud"

run_case() {
  export FIXTURE="$1" SERVICE="$2"
  local mode="$3" expected_status="$4" expected_updates="$5" expected_text="$6"
  rm -f "$CALLS.updated"
  : > "$CALLS"
  : > "$GITHUB_STEP_SUMMARY"
  local status=0 output
  output="$(bash "$root/scripts/ci/ensure-traffic.sh" "$SERVICE" test-region test-project "$mode" 2>&1)" || status=$?
  if [[ "$status" != "$expected_status" || "$output" != *"$expected_text"* ]]; then
    printf 'FAIL %s (%s): exit %s, output: %s\n' "$FIXTURE" "$SERVICE" "$status" "$output" >&2
    exit 1
  fi
  [[ "$(grep -c 'run services update-traffic' "$CALLS" || true)" == "$expected_updates" ]]
  grep -Fq "$expected_text" "$GITHUB_STEP_SUMMARY"
  if [[ "$FIXTURE" == pinned && "$expected_updates" == 1 ]]; then
    [[ "$(grep -c 'run services describe' "$CALLS")" == 2 ]]
  fi
  printf 'PASS %s (%s)\n' "$FIXTURE" "$SERVICE"
}

www=www-reading-advantage
run_case all-latest "$www" direct 0 0 "traffic: ok"
run_case latest-alias "$www" direct 0 0 "traffic: ok"
run_case explicit-latest "$www" direct 0 0 "traffic: ok"
run_case pinned "$www" direct 0 1 "traffic: ok"
run_case pinned primary-advantage-app gated 0 0 \
  "traffic: HELD. Revision primary-advantage-app-00003-abc is ready and takes NO traffic. Serving: primary-advantage-app-00001-def. To route traffic, run apps/primary-advantage/cloudbuild-traffic.yaml."
grep -Fq 'WARNING: Serving revision primary-advantage-app-00001-def is more than one revision behind' "$GITHUB_STEP_SUMMARY"
run_case custom-names marketing gated 0 0 "apps/marketing/cloudbuild-traffic.yaml."
grep -Fq 'WARNING: Serving revision marketing-release-old is more than one revision behind' "$GITHUB_STEP_SUMMARY"
grep -Fq 'run revisions list' "$CALLS"
run_case one-behind storytime-app gated 0 0 "docs/runbooks/storytime-deploy.md (step 4)"
if grep -q 'more than one revision behind' "$GITHUB_STEP_SUMMARY"; then
  echo "FAIL: one revision behind is not stale" >&2
  exit 1
fi
run_case pinned sales-advantage direct 0 0 "apps/sales-advantage/cloudbuild-traffic.yaml."
run_case describe-failure "$www" direct 1 0 "could not describe"
run_case no-ready "$www" direct 1 0 "no latest ready revision"
run_case not-ready "$www" direct 1 0 "latest created revision is not ready"
run_case update-failure "$www" direct 1 1 "could not restore traffic to LATEST"
run_case confirmation-failure "$www" direct 1 1 "could not confirm"
run_case split "$www" direct 1 0 "unexpected traffic split"
run_case split accounting gated 1 0 "unexpected traffic split"
run_case pinned unknown-service gated 1 0 "no manual traffic entry"
