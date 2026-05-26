#!/usr/bin/env bash
# codecamp-pr-e2e.sh — End-to-end verification of the Codecamp PR review pipeline.
#
# Flow:
#   1. Fork an upstream exercise repo into the current `gh` user's account.
#   2. Clone the fork, create a feature branch, modify a file, push.
#   3. Open a PR from <user>:<branch> against upstream/main.
#   4. Poll the PR for the AI review comment (proves: webhook -> domain -> LLM -> postPrComment).
#   5. Optionally probe the production DB via psql/gcloud for a matching
#      `codecamp_pr_reviews` row (proves: webhook -> createPrReview).
#   6. Print pass/fail, leave the PR open for manual review, and write a JSON
#      result blob to ./e2e-results/.
#
# Usage:
#   scripts/codecamp-pr-e2e.sh                      # default: prod, exercise-git-github
#   UPSTREAM=Reading-Advantage-Thailand/codecamp-exercise-react-fundamentals \
#     scripts/codecamp-pr-e2e.sh
#
# Required:
#   - `gh` authenticated as a user whose login matches a `users.githubUsername`
#     row in the codecamp production DB (otherwise the webhook returns
#     "No matching codecamp user" and no review is created).
#   - `git` configured with a remote-push capable identity.
#
# Optional:
#   - `gcloud` authenticated for `gcloud sql connect` if --check-db is passed.
#
# Exit codes:
#   0 = pass (comment seen within timeout)
#   1 = setup failure (auth/fork/clone/push/PR)
#   2 = timeout — PR opened but no AI comment within POLL_TIMEOUT_SECS
#   3 = AI comment seen but indicates LLM failure ("Review failed — please check manually.")

set -euo pipefail

# ─── Config ────────────────────────────────────────────────
UPSTREAM="${UPSTREAM:-Reading-Advantage-Thailand/codecamp-exercise-git-github}"
WEBHOOK_HOST="${WEBHOOK_HOST:-https://codecamp.reading-advantage.com}"
BRANCH_PREFIX="${BRANCH_PREFIX:-e2e/ai-review}"
POLL_INTERVAL_SECS="${POLL_INTERVAL_SECS:-15}"
POLL_TIMEOUT_SECS="${POLL_TIMEOUT_SECS:-300}"
WORKDIR="${WORKDIR:-$(mktemp -d -t codecamp-e2e-XXXXXX)}"
RESULTS_DIR="${RESULTS_DIR:-$(pwd)/e2e-results}"
CHECK_DB=0
KEEP_FORK=0
CLEANUP_ON_EXIT=1

for arg in "$@"; do
  case "$arg" in
    --check-db) CHECK_DB=1 ;;
    --keep-fork) KEEP_FORK=1 ;;
    --no-cleanup) CLEANUP_ON_EXIT=0 ;;
    -h|--help)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *)
      echo "[!] Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$RESULTS_DIR"

# ─── Helpers ───────────────────────────────────────────────
log()    { printf '\033[36m[E2E]\033[0m %s\n' "$*"; }
ok()     { printf '\033[32m[PASS]\033[0m %s\n' "$*"; }
warn()   { printf '\033[33m[WARN]\033[0m %s\n' "$*" >&2; }
fail()   { printf '\033[31m[FAIL]\033[0m %s\n' "$*" >&2; }
die()    { fail "$*"; exit "${2:-1}"; }

cleanup() {
  local rc=$?
  if [[ "$CLEANUP_ON_EXIT" -eq 1 && -d "$WORKDIR" ]]; then
    log "cleaning workdir $WORKDIR"
    rm -rf "$WORKDIR"
  fi
  exit $rc
}
trap cleanup EXIT INT TERM

# ─── 0. Preflight ──────────────────────────────────────────
log "preflight: gh + git"
command -v gh  >/dev/null || die "gh CLI not installed"
command -v git >/dev/null || die "git not installed"
gh auth status >/dev/null 2>&1 || die "gh not authenticated; run: gh auth login"

GH_USER="$(gh api /user --jq .login)"
[[ -n "$GH_USER" ]] || die "could not resolve current gh user"
log "running as gh user: $GH_USER"

log "preflight: upstream repo exists + forkable"
UPSTREAM_META="$(gh api "/repos/$UPSTREAM" --jq '{name,default_branch,allow_forking,private}' 2>/dev/null)" \
  || die "upstream repo $UPSTREAM not accessible"
DEFAULT_BRANCH="$(jq -r .default_branch <<<"$UPSTREAM_META")"
ALLOW_FORK="$(jq -r .allow_forking <<<"$UPSTREAM_META")"
[[ "$ALLOW_FORK" == "true" ]] || die "upstream does not allow forking"
log "upstream default branch: $DEFAULT_BRANCH"

# ─── 1. Fork ───────────────────────────────────────────────
FORK="$GH_USER/$(basename "$UPSTREAM")"
log "ensuring fork: $FORK"
if gh api "/repos/$FORK" >/dev/null 2>&1; then
  log "fork already exists — reusing"
else
  gh repo fork "$UPSTREAM" --clone=false --remote=false >/dev/null
  # GitHub creates forks asynchronously; poll for readiness
  for i in {1..20}; do
    if gh api "/repos/$FORK" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  gh api "/repos/$FORK" >/dev/null 2>&1 || die "fork did not appear within 40s"
fi

# ─── 2. Clone + branch + commit + push ─────────────────────
BRANCH="$BRANCH_PREFIX/$(date -u +%Y%m%d-%H%M%S)"
log "cloning fork into $WORKDIR"
git -C "$WORKDIR" clone "https://github.com/$FORK.git" repo --quiet
REPO="$WORKDIR/repo"
git -C "$REPO" checkout -b "$BRANCH" --quiet

# Use README.md if present, else create one
TARGET_FILE="README.md"
if [[ ! -f "$REPO/$TARGET_FILE" ]]; then
  TARGET_FILE="E2E-NOTE.md"
fi
{
  printf '\n\n<!-- e2e marker %s -->\n' "$(date -u +%FT%TZ)"
  printf 'E2E PR review test run by %s.\n' "$GH_USER"
} >> "$REPO/$TARGET_FILE"

git -C "$REPO" add "$TARGET_FILE"
git -C "$REPO" -c user.email="$GH_USER@users.noreply.github.com" \
              -c user.name="$GH_USER" \
              commit -m "test: e2e ai-review smoke ($BRANCH)" --quiet
log "pushing branch $BRANCH"
git -C "$REPO" push -u origin "$BRANCH" --quiet

# ─── 3. Open PR against upstream ───────────────────────────
log "opening PR against $UPSTREAM:$DEFAULT_BRANCH"
PR_URL="$(gh pr create \
  --repo "$UPSTREAM" \
  --head "$GH_USER:$BRANCH" \
  --base "$DEFAULT_BRANCH" \
  --title "E2E AI-review smoke: $BRANCH" \
  --body  "Automated end-to-end test for the codecamp PR-review webhook pipeline.

This PR is created by \`scripts/codecamp-pr-e2e.sh\` and will be closed automatically after verification. Safe to ignore." \
  2>&1 | tail -n1)"

[[ "$PR_URL" =~ ^https://github.com/ ]] || die "gh pr create did not return a URL: $PR_URL"
log "PR opened: $PR_URL"
PR_NUMBER="$(awk -F/ '{print $NF}' <<<"$PR_URL")"

# ─── 4. Poll for AI review comment ─────────────────────────
log "polling for AI review comment (timeout: ${POLL_TIMEOUT_SECS}s, every ${POLL_INTERVAL_SECS}s)"
DEADLINE=$(( $(date +%s) + POLL_TIMEOUT_SECS ))
COMMENT_BODY=""
while (( $(date +%s) < DEADLINE )); do
  COMMENT_BODY="$(gh api "/repos/$UPSTREAM/issues/$PR_NUMBER/comments" \
    --jq '.[] | select(.body | startswith("## 🤖 CodeCamp AI Review")) | .body' \
    2>/dev/null | head -n1 || true)"
  if [[ -n "$COMMENT_BODY" ]]; then
    break
  fi
  printf '.'
  sleep "$POLL_INTERVAL_SECS"
done
printf '\n'

RESULT_JSON="$RESULTS_DIR/$(date -u +%Y%m%dT%H%M%SZ)-$GH_USER.json"
write_result() {
  local outcome="$1" detail="$2"
  jq -n \
    --arg outcome "$outcome" \
    --arg detail "$detail" \
    --arg pr "$PR_URL" \
    --arg user "$GH_USER" \
    --arg upstream "$UPSTREAM" \
    --arg branch "$BRANCH" \
    --arg ts "$(date -u +%FT%TZ)" \
    '{outcome:$outcome,detail:$detail,pr_url:$pr,gh_user:$user,upstream:$upstream,branch:$branch,ts:$ts}' \
    > "$RESULT_JSON"
  log "result written: $RESULT_JSON"
}

if [[ -z "$COMMENT_BODY" ]]; then
  fail "no AI review comment seen within ${POLL_TIMEOUT_SECS}s"
  fail "investigate: $WEBHOOK_HOST logs, GitHub App Deliveries tab, codecamp_webhook_events table"
  write_result "timeout" "no AI review comment within ${POLL_TIMEOUT_SECS}s"
  exit 2
fi

if grep -q 'Review failed — please check manually.' <<<"$COMMENT_BODY"; then
  fail "AI comment seen but indicates LLM failure (Review failed path)"
  printf '%s\n' "$COMMENT_BODY"
  write_result "llm_failed" "comment posted but review pipeline errored"
  exit 3
fi

ok "AI review comment posted:"
printf '%s\n' "$COMMENT_BODY" | sed 's/^/    /'

# ─── 5. (Optional) DB probe ────────────────────────────────
if [[ "$CHECK_DB" -eq 1 ]]; then
  log "verifying codecamp_pr_reviews row via psql..."
  if [[ -z "${DATABASE_URL:-}" ]]; then
    warn "--check-db requested but DATABASE_URL not set; skipping"
  else
    ROW="$(psql "$DATABASE_URL" -tAc \
      "select id::text, review_status, llm_review_summary is not null
         from codecamp_pr_reviews
        where pr_url = '$PR_URL'")"
    if [[ -z "$ROW" ]]; then
      fail "no codecamp_pr_reviews row found for $PR_URL"
      write_result "no_db_row" "comment posted but DB row missing"
      exit 3
    fi
    ok "db row: $ROW"
  fi
fi

write_result "pass" "AI review comment posted and verified"
ok "E2E PASS — PR left open at $PR_URL for human review"
log "to close the PR + branch, run:"
log "    gh pr close $PR_URL --delete-branch"
[[ "$KEEP_FORK" -eq 0 ]] && log "fork retained at https://github.com/$FORK (delete manually if undesired)"
exit 0
