"""Guards the bounded Task 5 host-proof remediation surfaces."""

from __future__ import annotations

import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def _read(relative_path: str) -> str:
    """Returns one repository source file as text."""
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


class ExistingCoreTask5HostProofRemediationTests(unittest.TestCase):
    """Prevents the audited Task 5 regressions from returning."""

    def test_primary_e2e_uses_setup_owned_credentials_and_the_dragon_locale_route(self) -> None:
        """Requires credential ownership in setup and a bounded Dragon Flight browser journey."""
        setup = _read("apps/primary-advantage/tests/e2e/host-proof-auth.setup.ts")
        source = _read("apps/primary-advantage/tests/e2e/host-proof-games.spec.ts")
        self.assertIn('from "../../host-proof-test-config"', setup)
        self.assertIn("getHostProofTestCredentials()", setup)
        self.assertNotIn("getHostProofTestCredentials()", source)
        self.assertNotIn('process.env.HOST_PROOF_TEST_CLASS_CODE ?? ""', source)
        self.assertIn('/en/student/host-proof/games', source)
        self.assertIn("Dragon Flight host-proof surface", source)
        self.assertIn("/api/host-proof/games/attempts", source)
        self.assertIn("/api/host-proof/games/completions", source)

    def test_primary_playwright_binds_seed_and_distinct_json_result_artifact(self) -> None:
        """Requires automatic fixture seeding and a host-specific Playwright result artifact."""
        command = _read("apps/primary-advantage/host-proof-test-config.ts")
        config = _read("apps/primary-advantage/playwright.config.ts")
        self.assertIn("scripts/seed-host-proof-session.ts", command)
        self.assertIn('outputFile: "test-results/host-proof-results.json"', config)

    def test_pglite_reset_preserves_append_only_registry_tables_without_trigger_bypass(self) -> None:
        """Requires the live test reset to skip immutable registry tables rather than weaken guards."""
        source = _read("packages/domain/src/__tests__/helpers/testDb.ts")
        self.assertIn('"standard_pack_successor_commitments"', source)
        self.assertIn('"standard_pack_successor_admission_receipts"', source)
        self.assertNotIn("DISABLE TRIGGER", source)
        self.assertNotIn("DROP TRIGGER", source)

    def test_hosts_use_only_the_dragon_runtime_boundary_and_shared_responsive_options(self) -> None:
        """Rejects resurrection of the generic multi-title host composition."""
        contract = _read("packages/game-contracts/src/host-proof-bindings.ts")
        for relative_path in (
            "apps/reading-advantage/components/host-proof/HostProofGameClient.tsx",
            "apps/primary-advantage/components/host-proof/HostProofGameClient.tsx",
        ):
            source = _read(relative_path)
            self.assertIn("APKGameHost", source)
            self.assertIn("HOST_PROOF_RESPONSIVE_OPTIONS", source)
            self.assertIn('data-host-proof-boundary="dragon-flight-corrective-proof"', source)
            self.assertIn("showClientResult={false}", source)
            self.assertIn("showRestartControl={false}", source)
            self.assertNotIn("cartridgeCatalog", source)
            self.assertNotIn("loadCartridge(", source)
            self.assertNotIn("recordHostProofGameCompletion", source)
        self.assertIn("HOST_PROOF_RESPONSIVE_WIDE_MIN_WIDTH = 800", contract)

    def test_domain_adapter_parses_the_exported_host_proof_request_schema(self) -> None:
        """Requires persistence to consume the exported bounded request contract."""
        source = _read("packages/domain/src/games/host-proof.ts")
        self.assertIn("hostProofCompletionRequestSchema.safeParse(input)", source)
        self.assertIn("input: hostProofParsed.data", source)


if __name__ == "__main__":
    unittest.main()
