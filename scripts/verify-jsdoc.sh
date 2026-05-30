#!/bin/bash
# Verifies that all shared package functions have JSDoc comments (build-graph summaries)
set -e

DB="./graph.db"
PACKAGES="domain api auth db webhooks ui auth-client utils"

RESULT=$(build-graph query --json "$DB" "SELECT COUNT(*) as remaining FROM nodes WHERE type = 'function' AND summary IS NULL AND package_id IN ($(echo "'$PACKAGES'" | tr ' ' ',' | sed "s/,/','/g")) AND file_path NOT LIKE '%__tests__%'" 2>/dev/null | grep -o '"remaining":[0-9]*' | grep -o '[0-9]*')

if [ "$RESULT" = "0" ]; then
  echo "✓ All shared package functions have JSDoc comments"
  exit 0
else
  echo "✗ $RESULT functions still missing JSDoc comments"
  exit 1
fi