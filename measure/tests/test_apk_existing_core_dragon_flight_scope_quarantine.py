"""Guards the Dragon Flight-only corrective phase from 24-title scope leakage."""

from __future__ import annotations

import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def _read(relative_path: str) -> str:
    """Returns one repository source file as UTF-8 text."""
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


class DragonFlightScopeQuarantineTests(unittest.TestCase):
    """Requires the corrective host-proof slice to remain Dragon Flight-only."""

    def test_root_catalog_cannot_publish_the_quarantined_24_title_candidate(self) -> None:
        """Rejects root catalog bindings and dynamic loaders derived from all 24 titles."""
        catalog = _read("packages/game-cartridges/src/catalog.ts")

        self.assertNotIn("APK_HOST_PROOF_BINDINGS", catalog)
        self.assertNotIn("Object.fromEntries(cartridgeCatalog.map", catalog)
        self.assertNotIn("24 accepted catalog identities", catalog)
        self.assertNotIn("frozen 24-title catalog", catalog)

    def test_root_contract_and_domain_cannot_allowlist_all_24_titles(self) -> None:
        """Rejects a root contract or domain surface that promotes the 24-title candidate."""
        bindings = _read("packages/game-contracts/src/host-proof-bindings.ts")
        domain = _read("packages/domain/src/games/host-proof.ts")

        for source in (bindings, domain):
            with self.subTest(source=source[:80]):
                self.assertNotIn("APK_HOST_PROOF_BINDINGS", source)
                self.assertNotIn("apkHostProofCartridgeIdSchema", source)
                self.assertNotIn("24 accepted host-proof bindings", source)
                self.assertNotIn("one of the 24 accepted host-proof bindings", source)

    def test_dragon_flight_hosts_use_only_the_explicit_host_proof_subpath(self) -> None:
        """Requires both hosts to reach the dedicated Dragon Flight subpath without root catalog APIs."""
        host_and_loader_paths = (
            (
                "apps/reading-advantage/components/host-proof/HostProofGameClient.tsx",
                "apps/reading-advantage/lib/host-proof-qc-loader.ts",
            ),
            (
                "apps/primary-advantage/components/host-proof/HostProofGameClient.tsx",
                "apps/primary-advantage/lib/host-proof-cartridge-loader.ts",
            ),
        )

        for host_path, loader_path in host_and_loader_paths:
            host = _read(host_path)
            loader = _read(loader_path)
            with self.subTest(host_path=host_path, loader_path=loader_path):
                self.assertIn("host-proof", host)
                self.assertIn("@reading-advantage/game-cartridges/host-proof", loader)
                self.assertNotIn("cartridgeCatalog", host)
                self.assertNotIn("cartridgeLoaders", host)
                self.assertNotIn("loadCartridge(", host)
                self.assertNotIn("@reading-advantage/game-cartridges/catalog", loader)
                self.assertNotIn("cartridgeCatalog", loader)
                self.assertNotIn("cartridgeLoaders", loader)


if __name__ == "__main__":
    unittest.main()
