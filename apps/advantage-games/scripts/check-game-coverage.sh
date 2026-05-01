#!/bin/bash
# check-game-coverage.sh
# Run jest coverage for audited game logic files.
# Usage: bash scripts/check-game-coverage.sh [camelCaseGameName]
#        bash scripts/check-game-coverage.sh          (runs all)
#
# PSEUDOCODE:
#   if arg given:
#     jest --coverage --collectCoverageFrom=src/lib/games/<arg>*.ts
#                     --testPathPatterns=<arg>
#   else:
#     jest --coverage --collectCoverageFrom=src/lib/games/{shadowGateDungeon,runeForgeChamber,
#                       villageGuardian,labyrinthGoblinKing,abyssalWell,archersRevenge}*.ts
#                     --testPathPatterns=(all six games)
#
# NOTE: Coverage numbers are only meaningful if tests assert real behavior.
# A test that mocks the entire game and checks nothing will show 100% and catch 0 bugs.
# Each game's tests should call createXxxState() and tickXxx() directly and assert
# that state changes correctly — no mocking of pure functions.

GAMES="shadowGateDungeon|runeForgeChamber|villageGuardian|labyrinthGoblinKing|abyssalWell|archersRevenge"
PATTERN="${1:-$GAMES}"

CI=true npx jest --coverage \
  $(for g in ${PATTERN//|/ }; do echo "--collectCoverageFrom=src/lib/games/${g}*.ts"; done) \
  --testPathPatterns="($PATTERN)" \
  2>&1
