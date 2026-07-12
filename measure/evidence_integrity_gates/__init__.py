# measure/evidence_integrity_gates
# ==================================
#
# Phase 0 contract scaffold for the APK evidence integrity gates. This
# package is intentionally narrow: it freezes the contract shape, the
# stable rejection-code vocabulary, and the canonical dependency field
# so the harness tests in ``measure/tests/evidence_integrity_gates/`` can
# load fixtures and assert presence/structure before the Phase 1/2/3
# validators are implemented.
#
# Per spec.md FR3-FR5 and apk-evidence-reconstruction-program.md:
#   - validators accept records; they do not infer records.
#   - "unmeasured" is rejected, never defaulted.
#   - canonical dependency field is ``depends_on``; legacy ``dependencies``
#     alias is rejected.
#   - every negative fixture carries an expected stable rejection code.
#
# This module is the RED-phase stub. The Green phase will fill in the
# full validator implementations behind the same public surface.