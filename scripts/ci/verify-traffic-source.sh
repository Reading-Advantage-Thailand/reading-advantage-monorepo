#!/usr/bin/env bash
# verify-traffic-source.sh — bind an uploaded source tree to a release commit.
#
# Usage:
#   verify-traffic-source.sh <commit> <repo-url> <uploaded-root>
#
# A person starts a traffic Cloud Build file by hand and uploads a source tree. This script
# proves that the upload equals the tree of the release commit, so that a wrong tree cannot
# change the production schema. The upload has no Git data, so the script loads the commit
# (trees only, one blob on demand) from the repository URL into a scratch folder.
#
# Method (spec section 3 of the track sales_traffic_source_binding_20261108):
#   1. Expected list: `git ls-tree -r -z` of the commit, minus the paths that the
#      `.gcloudignore` of that commit excludes (`git check-ignore --no-index`).
#   2. Actual list: every regular file and symbolic link below <uploaded-root>.
#   3. Both lists are NUL-separated, sorted bytewise, and compared two ways.
#   4. If the lists are equal, the Git blob id of each path is compared.
#
# Exit codes:
#   0 — the upload equals the commit
#   1 — a difference, a bad argument, a special entry, or a missing tool
#   other non-zero — a Git command failed
#
# Output on standard error, one line for each difference, in this order:
#   missing: <path>   the commit holds the path in scope; the upload lacks it
#   extra: <path>     the upload holds the path; the commit lacks it (or excludes it)
#   differs: <path>   the blob id or the type (file or link) differs
#
# Special entries (spec section 3c): a submodule entry or a `#!include:` line fails closed.
# The executable bit is not compared.

set -euo pipefail
# Bytewise order for `sort`, `comm`, and every character class below.
export LC_ALL=C
# A private URL must fail, not wait for a prompt.
export GIT_TERMINAL_PROMPT=0

scratch=""
bad=0

# Print a message on standard error and stop with exit 1.
fail() {
  printf 'verify-traffic-source: %s\n' "$*" >&2
  exit 1
}

# Stop when a tool is not on the PATH. The message names the tool.
require_tool() {
  command -v "$1" >/dev/null 2>&1 || fail "required tool is missing: $1"
}

# Remove the scratch folder on every exit.
cleanup() {
  if [ -n "$scratch" ]; then
    rm -rf -- "$scratch"
  fi
}

# Print one line on standard error for each NUL-separated path in a file.
# $1: the line prefix. $2: the file. Sets bad=1 when the file holds a path.
report() {
  local path
  while IFS= read -r -d '' path; do
    printf '%s: %s\n' "$1" "$path" >&2
    bad=1
  done < "$2"
}

# Write one record `<path><TAB><kind> <blob id>` (NUL-terminated) for each path of a file.
# $1: the kind (file or link). $2: the NUL-separated paths. $3: the blob ids, one per line.
pair_records() {
  local path id
  {
    while IFS= read -r -d '' path <&3; do
      IFS= read -r id <&4 || fail "no blob id for a path of kind $1"
      printf '%s\t%s %s\0' "$path" "$1" "$id"
    done
    if IFS= read -r id <&4; then
      fail "more blob ids than paths of kind $1"
    fi
  } 3< "$2" 4< "$3"
}

# --- Tool check and version lines. Nothing is loaded before this block ends. ---
require_tool bash
require_tool git
require_tool sed
require_tool tr
require_tool sort
require_tool comm
bash --version | sed -n '1p'
git --version

# The `-z` probe (PM order Q16): `sort` and `comm` must handle NUL-separated data.
if [ "$(printf 'b\0a\0' | sort -z | tr '\0' ' ')" != "a b " ]; then
  fail "sort does not support -z"
fi
printf 'a\0' | comm -z - /dev/null >/dev/null || fail "comm does not support -z"

for tool in cat find xargs grep readlink mktemp rm wc; do
  require_tool "$tool"
done

# --- Arguments. The commit is checked before any Git use of it. ---
[ "$#" -eq 3 ] || fail "usage: verify-traffic-source.sh <commit> <repo-url> <uploaded-root>"
commit=$1
url=$2
upload_arg=$3

case $commit in
  "" | *[!0-9a-f]*) fail "the release commit must be 40 lowercase hex characters" ;;
esac
[ "${#commit}" -eq 40 ] || fail "the release commit must be 40 lowercase hex characters"

case $url in
  "" | -*) fail "the repository URL must not be empty or start with a dash" ;;
esac
[ -d "$upload_arg" ] || fail "the uploaded root is not a folder"
root=$(cd -- "$upload_arg" && pwd -P)

# --- Load the commit into a scratch repository (non-bare: check-ignore needs a work tree). ---
scratch=$(mktemp -d "${TMPDIR:-/tmp}/verify-traffic-source.XXXXXX")
trap cleanup EXIT
repo=$scratch/repo

git init -q "$repo"
cd -- "$repo"
git remote add origin "$url"
git fetch -q --depth=1 --filter=blob:none origin "$commit"
git cat-file -e "${commit}^{commit}" || fail "the commit is not in the repository"

# The rules of the commit. Git loads this one blob on demand from the named remote.
rules=$scratch/gcloudignore
git show "${commit}:.gcloudignore" > "$rules" || fail "the commit has no .gcloudignore"
if grep -Eq '^[[:space:]]*#!include:' "$rules"; then
  fail "the .gcloudignore of the commit holds a #!include: line"
fi

# --- Expected list. ---
tree=$scratch/tree.z
git ls-tree -r -z "$commit" > "$tree"
sed -z 's/^[^\t]*\t//' "$tree" | sort -z > "$scratch/all-paths.z"

rc=0
git -c "core.excludesFile=$rules" check-ignore --no-index --stdin -z \
  < "$scratch/all-paths.z" > "$scratch/ignored.z" || rc=$?
[ "$rc" -le 1 ] || fail "git check-ignore failed with exit $rc"
sort -z < "$scratch/ignored.z" > "$scratch/ignored-sorted.z"
comm -z -23 "$scratch/all-paths.z" "$scratch/ignored-sorted.z" > "$scratch/expected-paths.z"

# A submodule entry in scope fails closed.
sed -z -n 's/^160000 [^\t]*\t//p' "$tree" | sort -z > "$scratch/gitlinks.z"
comm -z -12 "$scratch/gitlinks.z" "$scratch/expected-paths.z" > "$scratch/gitlinks-in-scope.z"
if [ -s "$scratch/gitlinks-in-scope.z" ]; then
  report "submodule" "$scratch/gitlinks-in-scope.z"
  fail "the commit holds a submodule entry in the upload scope"
fi

# --- Actual list. ---
cd -- "$root"
find . -type f -print0 | sed -z 's|^\./||' | sort -z > "$scratch/actual-files.z"
find . -type l -print0 | sed -z 's|^\./||' | sort -z > "$scratch/actual-links.z"
cat "$scratch/actual-files.z" "$scratch/actual-links.z" | sort -z > "$scratch/actual-paths.z"

# --- Two-way compare of the path lists. ---
comm -z -23 "$scratch/expected-paths.z" "$scratch/actual-paths.z" > "$scratch/missing.z"
comm -z -13 "$scratch/expected-paths.z" "$scratch/actual-paths.z" > "$scratch/extra.z"
report missing "$scratch/missing.z"
report extra "$scratch/extra.z"
[ "$bad" -eq 0 ] || exit 1

# --- Compare the blob id and the type of each path. The lists are equal here. ---
# Expected records: `<path><TAB><file|link> <blob id>`. The executable bit is not compared.
sed -z \
  -e 's/^\(100644\|100755\) blob \([0-9a-f]*\)\t\(.*\)$/\3\tfile \2/' -e t \
  -e 's/^120000 blob \([0-9a-f]*\)\t\(.*\)$/\2\tlink \1/' \
  "$tree" | sort -z > "$scratch/expected-records.z"

# Actual records. A file uses its bytes; a link uses its text. `--no-filters` ignores
# core.autocrlf and attributes, so the id is the id of the bytes on disk.
xargs -0 -r -n 500 git hash-object --no-filters -- < "$scratch/actual-files.z" > "$scratch/file-ids.txt"
{
  pair_records file "$scratch/actual-files.z" "$scratch/file-ids.txt"
  while IFS= read -r -d '' path; do
    id=$(readlink -n -- "$path" | git hash-object --stdin)
    printf '%s\tlink %s\0' "$path" "$id"
  done < "$scratch/actual-links.z"
} | sort -z > "$scratch/actual-records.z"

comm -z -13 "$scratch/expected-records.z" "$scratch/actual-records.z" > "$scratch/differs-records.z"
sed -z 's/\t[^\t]*$//' "$scratch/differs-records.z" > "$scratch/differs.z"
report differs "$scratch/differs.z"
[ "$bad" -eq 0 ] || exit 1

count=$(tr -cd '\0' < "$scratch/actual-records.z" | wc -c | tr -d ' ')
printf 'verify-traffic-source: the upload matches commit %s (%s paths)\n' "$commit" "$count"
