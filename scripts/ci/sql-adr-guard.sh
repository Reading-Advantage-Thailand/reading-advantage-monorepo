#!/usr/bin/env bash
# sql-adr-guard.sh — CI gate that fails on DROP TABLE / DROP COLUMN
# statements in SQL migration files unless an ADR reference (-- ADR: or
# -- Why:) appears within 10 lines after the DROP.
#
# Usage:
#   sql-adr-guard.sh <sql-file>
#   sql-adr-guard.sh --allow <path> <sql-file>
#   sql-adr-guard.sh --help
#
# Exit codes:
#   0 — file passes (no DROP, or DROP with ADR ref, or grandfathered)
#   1 — file contains DROP without ADR reference within 10 lines
#   2 — usage error (missing file argument, etc.)

set -euo pipefail

print_help() {
  cat <<EOF
sql-adr-guard.sh — Require ADR references on DROP TABLE / DROP COLUMN

Usage:
  sql-adr-guard.sh <sql-file>
  sql-adr-guard.sh --allow <path> <sql-file>
  sql-adr-guard.sh --help

Options:
  --allow <path>   Grandfather a pre-existing migration file (skip check).
                   Use this to exclude files that have not yet been
                   annotated with ADR references. CI should invoke
                   --allow for each migration in the allowlist.

  --help           Print this help and exit.

The script scans the given SQL file for DROP TABLE or DROP COLUMN
statements. Each such statement must be followed within 10 lines by a
comment starting with -- ADR: or -- Why: (case-insensitive).

To grandfather a pre-existing migration that lacks ADR references, use
--allow with its path:

  sql-adr-guard.sh --allow packages/db/drizzle/0003_slow_firebrand.sql \\
                   packages/db/drizzle/0003_slow_firebrand.sql

Exit codes:
  0 — file passes the guard
  1 — file fails the guard (DROP without ADR reference)
  2 — usage error
EOF
}

ALLOWED=""
SQL_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --allow requires a file path argument" >&2
        exit 2
      fi
      ALLOWED="$2"
      shift 2
      ;;
    --help)
      print_help
      exit 0
      ;;
    -*)
      echo "ERROR: unknown option: $1" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
    *)
      SQL_FILE="$1"
      shift
      ;;
  esac
done

if [[ -z "$SQL_FILE" ]]; then
  echo "ERROR: no SQL file specified" >&2
  echo "Run with --help for usage." >&2
  exit 2
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: file not found: $SQL_FILE" >&2
  exit 2
fi

# Resolve absolute paths for comparison
SQL_FILE_ABS=$(realpath "$SQL_FILE" 2>/dev/null || readlink -f "$SQL_FILE" 2>/dev/null || echo "$SQL_FILE")

# Check if this file is allow-listed (grandfathered)
if [[ -n "$ALLOWED" ]]; then
  ALLOWED_ABS=$(realpath "$ALLOWED" 2>/dev/null || readlink -f "$ALLOWED" 2>/dev/null || echo "$ALLOWED")
  if [[ "$SQL_FILE_ABS" == "$ALLOWED_ABS" ]]; then
    echo "sql-adr-guard: $SQL_FILE is grandfathered (--allow). Skipping."
    exit 0
  fi
fi

# Find all DROP TABLE / DROP COLUMN line numbers
DROP_LINES=$(grep -Ein '(DROP\s+TABLE|DROP\s+COLUMN)' "$SQL_FILE" | grep -Ev '^[0-9]+:[[:space:]]*--' || true)

if [[ -z "$DROP_LINES" ]]; then
  # No DROP statements — file passes.
  exit 0
fi

# Check each DROP line for an ADR reference within the next 10 lines.
VIOLATIONS=0
while IFS= read -r drop_match; do
  line_num=$(echo "$drop_match" | cut -d: -f1)

  # Extract the next 10 lines after the DROP line, looking for -- ADR:
  # or -- Why: (case-insensitive on the ADR/Why label).
  end_line=$((line_num + 10))
  if sed -n "${line_num},${end_line}p" "$SQL_FILE" | grep -qiE '^--\s*ADR[:\s]|^--\s*Why[:\s]'; then
    # Found an ADR reference within 10 lines.
    continue
  fi

  # No ADR reference found — report the violation.
  if [[ $VIOLATIONS -eq 0 ]]; then
    echo "sql-adr-guard: DROP statement(s) found without ADR reference within 10 lines" >&2
  fi
  echo "  $SQL_FILE:$line_num: $drop_match" >&2
  VIOLATIONS=$((VIOLATIONS + 1))
done <<< "$DROP_LINES"

if [[ $VIOLATIONS -gt 0 ]]; then
  echo "" >&2
  echo "Action: add a comment within 10 lines of each DROP statement:" >&2
  echo "  -- ADR: <number> — <brief rationale>" >&2
  echo "Or grandfather this file with: --allow <path>" >&2
  exit 1
fi

exit 0
