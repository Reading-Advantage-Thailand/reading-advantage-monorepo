"""Live exact-source tests for the Phase 1 claim-evidence gate.

The source adapter deliberately reads a temporary Git repository rather than
mocking a submitted citation.  Claim fixture templates are rendered with the
repository's committed revision so each rejection proves one concrete boundary.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
from typing import Any

from measure.evidence_integrity_gates.git_source import GitSourceAdapter
from measure.evidence_integrity_gates.validator import validate_claim_evidence


HERE = Path(__file__).resolve().parent
FIXTURE_ROOT = HERE / "fixtures" / "claim_evidence"


def _run(root: Path, *args: str) -> str:
    """Runs one Git command in a fixture repository and returns stdout.

    @param root Temporary Git repository root.
    @param args Git arguments.
    @returns Decoded command stdout.
    """
    result = subprocess.run(
        ("git", *args),
        cwd=root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout.strip()


def _read_fixture(relative_path: str) -> dict[str, Any]:
    """Reads one versioned claim fixture template.

    @param relative_path Path relative to the claim-fixture root.
    @returns Parsed JSON object.
    """
    return json.loads((FIXTURE_ROOT / relative_path).read_text(encoding="utf-8"))


class ClaimEvidenceTests(unittest.TestCase):
    """Proves that exact evidence is resolved from Git bytes, not submitted prose."""

    def setUp(self) -> None:
        """Creates a repository with source, generated prose, and revision mutations."""
        self._temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self._temporary_directory.name)
        _run(self.root, "init", "--quiet")
        _run(self.root, "config", "user.email", "claims@example.test")
        _run(self.root, "config", "user.name", "Claim Fixture")
        (self.root / "src").mkdir()
        (self.root / "generated").mkdir()
        (self.root / "src" / "evidence.ts").write_text(
            "export const title = 'fixture';\nexport const status = 'ready';\n",
            encoding="utf-8",
        )
        (self.root / "src" / "other.ts").write_text("export const other = true;\n", encoding="utf-8")
        (self.root / "generated" / "report.md").write_text(
            "Generated report says the fixture is ready.\n", encoding="utf-8"
        )
        _run(self.root, "add", ".")
        _run(self.root, "commit", "--quiet", "-m", "source revision")
        self.source_revision = _run(self.root, "rev-parse", "HEAD")
        self.source_bytes = b"export const status = 'ready';\n"
        self.generated_bytes = b"Generated report says the fixture is ready.\n"

        (self.root / "src" / "evidence.ts").write_text(
            "export const title = 'fixture';\nexport const status = 'changed';\n",
            encoding="utf-8",
        )
        _run(self.root, "add", "src/evidence.ts")
        _run(self.root, "commit", "--quiet", "-m", "changed revision")
        self.changed_revision = _run(self.root, "rev-parse", "HEAD")
        self.unreachable_revision = _run(
            self.root,
            "commit-tree",
            _run(self.root, "rev-parse", "HEAD^{tree}"),
            "-m",
            "unreachable revision",
        )
        self.adapter = GitSourceAdapter(self.root)

    def tearDown(self) -> None:
        """Removes the temporary Git repository."""
        self._temporary_directory.cleanup()

    def _valid_claim(self) -> dict[str, Any]:
        """Renders the valid exact-source control with live revision data.

        @returns Claim record bound to the initial source revision.
        """
        claim = _read_fixture("valid/exact-source-control.json")
        rendered = self._render_fixture_variables(json.dumps(claim))
        return json.loads(rendered)

    def _render_fixture_variables(self, value: str) -> str:
        """Renders repository-specific values into a fixture template string.

        @param value JSON fixture text or a string fixture value.
        @returns Text with only the documented dynamic fixture variables replaced.
        """
        return (
            value.replace("${REVISION}", self.source_revision)
            .replace("${CHANGED_REVISION}", self.changed_revision)
            .replace("${UNREACHABLE_REVISION}", self.unreachable_revision)
            .replace("${CITED_RANGE_SHA256}", hashlib.sha256(self.source_bytes).hexdigest())
            .replace("${GENERATED_RANGE_SHA256}", hashlib.sha256(self.generated_bytes).hexdigest())
        )

    def _negative_claim(self, fixture_name: str) -> tuple[dict[str, Any], str]:
        """Applies a one-boundary mutation from a named negative fixture.

        @param fixture_name Negative fixture file name.
        @returns Mutated claim and its stable expected rejection code.
        """
        fixture = _read_fixture(f"invalid/{fixture_name}")
        claim = self._valid_claim()
        mutation = fixture["mutation"]
        for dotted_path, value in mutation.items():
            if isinstance(value, str):
                value = self._render_fixture_variables(value)
            target = claim
            components = dotted_path.split(".")
            for component in components[:-1]:
                target = target[component]
            target[components[-1]] = value
        return claim, fixture["expected_rejection_code"]

    def test_valid_exact_source_control_passes(self) -> None:
        """Accepts a claim only when its fact and citation resolve from source bytes."""
        self.assertEqual(validate_claim_evidence(self._valid_claim(), self.adapter), {"ok": True})

    def test_every_negative_fixture_has_a_stable_reason_code(self) -> None:
        """Rejects every named Phase 1 negative fixture for its declared reason."""
        for path in sorted((FIXTURE_ROOT / "invalid").glob("*.json")):
            with self.subTest(fixture=path.name):
                claim, expected_code = self._negative_claim(path.name)
                result = validate_claim_evidence(claim, self.adapter)
                self.assertEqual(result.get("code"), expected_code, result)

    def test_each_locator_component_mutation_is_refuted(self) -> None:
        """Refutes mutations to revision, path, line range, and cited-range hash."""
        for fixture_name in (
            "invalid_locator_revision.json",
            "invalid_locator_path.json",
            "invalid_locator_line_range.json",
            "invalid_locator_hash.json",
            "invalid_unreachable_revision.json",
        ):
            with self.subTest(fixture=fixture_name):
                claim, expected_code = self._negative_claim(fixture_name)
                result = validate_claim_evidence(claim, self.adapter)
                self.assertFalse(result.get("ok"), result)
                self.assertEqual(result.get("code"), expected_code)

    def test_fact_interpretation_boundary_is_refuted(self) -> None:
        """Rejects an inference when it is supplied as an extracted fact."""
        claim, expected_code = self._negative_claim("invalid_inference_as_fact.json")
        result = validate_claim_evidence(claim, self.adapter)
        self.assertEqual(result.get("code"), expected_code)

    def test_malformed_confidence_conflict_collector_and_reviewer_are_refuted(self) -> None:
        """Rejects each malformed accountability field with a specific reason code."""
        for fixture_name in (
            "invalid_confidence.json",
            "invalid_conflict.json",
            "invalid_collector.json",
            "invalid_reviewer.json",
        ):
            with self.subTest(fixture=fixture_name):
                claim, expected_code = self._negative_claim(fixture_name)
                result = validate_claim_evidence(claim, self.adapter)
                self.assertEqual(result.get("code"), expected_code, result)

    def test_source_class_cannot_lie_about_a_generated_path(self) -> None:
        """Rejects a generated path mislabeled as repository source evidence."""
        claim, expected_code = self._negative_claim("invalid_source_class_path.json")
        result = validate_claim_evidence(claim, self.adapter)
        self.assertEqual(result.get("code"), expected_code)


if __name__ == "__main__":
    unittest.main()
