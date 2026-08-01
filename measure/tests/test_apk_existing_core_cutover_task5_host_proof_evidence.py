"""Guards preliminary Task 5 host-proof execution evidence from gaining authority."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
EVIDENCE_PATH = TRACK_ROOT / "task5-reading-primary-host-proof-evidence-v1.json"
READING_REPORT_PATH = TRACK_ROOT / "task5-reading-host-proof-playwright-report-v2.json"
READING_HISTORICAL_REPORT_PATH = TRACK_ROOT / "task5-reading-host-proof-playwright-report-v1.json"
PRIMARY_REPORT_PATH = TRACK_ROOT / "task5-primary-host-proof-playwright-report-v1.json"
KIMI_READING_REPORT_PATH = TRACK_ROOT / "task5-reading-host-proof-kimi-report-v1.json"
KIMI_PRIMARY_REPORT_PATH = TRACK_ROOT / "task5-primary-host-proof-kimi-report-v1.json"
TASK4_RECEIPT_PATH = TRACK_ROOT / "accepted-task4-qc-receipt-v1.json"
TASK4_RECEIPT_SHA256 = "b6ffefcebf8a75d9967f196693fe7cf14a133d66123537d201b52e9af4745dd9"
HOST_CONTRACT_PATH = "packages/game-contracts/src/host-proof-bindings.ts"
HOST_CONTRACT_SHA256 = "087f91cbdc108697f5d896de2ea47a807474eb9adac33f3784e176972ce2798d"
QUARANTINED_CATALOG = {
    "path": "packages/game-cartridges/src/catalog.ts",
    "sha256": "14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b",
    "remained_empty": True,
}
ROOT_EXPORTS = {
    "path": "packages/game-cartridges/src/index.ts",
    "sha256": "1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda",
    "host_proof_exported_from_root": False,
}
READING_BINDINGS = {
    "playwright_config": {
        "path": "apps/reading-advantage/playwright.config.ts",
        "sha256": "c9da3e45756ffd27a21a41a163fa9a4d1c94e9d240dc1c2d76ccb4e255832afb",
    },
    "auth_setup": {
        "path": "apps/reading-advantage/tests/e2e/host-proof-auth.setup.ts",
        "sha256": "e177b8d9effaa83b86e8b54864c75d5963c83b4c573f48d4c807e8bdb3db878b",
    },
    "host_matrix": {
        "path": "apps/reading-advantage/tests/e2e/host-proof-games.spec.ts",
        "sha256": "dcf3a3fb553ceb6f4bf7097c1565b0826a25ec510b2a64104e7b6553ffe23cbd",
    },
    "credential_config": {
        "path": "apps/reading-advantage/host-proof-test-config.ts",
        "sha256": "91ec29dd40db41ea3c20e96a69fb04d575b3727c23d36f5a7b62d5815f05ac36",
    },
    "seed_script": {
        "path": "apps/reading-advantage/scripts/seed-host-proof-session.ts",
        "sha256": "2215944f552737bd7ea9f5ecda6bc1c790cb9e95ef83b705fccff78499c21adf",
    },
    "host_client": {
        "path": "apps/reading-advantage/components/host-proof/HostProofGameClient.tsx",
        "sha256": "5ec5f4e953b2a1bed312516a4342717f538e28f27e7ce27cc9a88b9fcd352470",
    },
    "host_page": {
        "path": "apps/reading-advantage/app/[locale]/(host-proof)/student/host-proof/games/page.tsx",
        "sha256": "153eb18bb0617f9b9f0a9ec85d61b4136d8c2e04535fae143948f7d7eed327bb",
    },
    "host_route": {
        "path": "apps/reading-advantage/app/api/host-proof/games/completions/route.ts",
        "sha256": "ffa3d5d21530eada589138c7e790aa5f281659f9085cc45366c4805c759ae2f9",
    },
    "host_gate": {
        "path": "apps/reading-advantage/lib/host-proof-config.ts",
        "sha256": "b99c2384bd7cb279e2c89729f0804e40fdeb4c9e511786ad0bb4cfd221c93c32",
    },
    "qc_loader": {
        "path": "apps/reading-advantage/lib/host-proof-qc-loader.ts",
        "sha256": "d5c56bc6b4e0b5259617427522e79179e4a6f07c1ce37e89de7da0856ba2334d",
    },
    "next_config": {
        "path": "apps/reading-advantage/next.config.ts",
        "sha256": "07637e3b4c7dff391c602558c585ff63960344b9d43d30ac7beb86b1149d4da6",
    },
    "package_manifest": {
        "path": "apps/reading-advantage/package.json",
        "sha256": "d0baa969a988ce244c445a8383a6b10ac40a6954d158bb8d8b88019b3bfb8092",
    },
}
PRIMARY_BINDINGS = {
    "playwright_config": {
        "path": "apps/primary-advantage/playwright.config.ts",
        "sha256": "a15e524a27b5da72b065f46b1d34319280c9fff79f4208c018a50868886886a2",
    },
    "auth_setup": {
        "path": "apps/primary-advantage/tests/e2e/host-proof-auth.setup.ts",
        "sha256": "755c66a63aa7d35e78c1091d6434ec81a12004fb84b2a5ca22c59a5a681444f9",
    },
    "host_matrix": {
        "path": "apps/primary-advantage/tests/e2e/host-proof-games.spec.ts",
        "sha256": "2f8191da34e4af508310cb2ffdf9c6b69f50f5d1ba101a039e3b448d1bbe9299",
    },
    "credential_config": {
        "path": "apps/primary-advantage/host-proof-test-config.ts",
        "sha256": "acc25660c7abc31219a3eba35d14a351151ca27bea126db724e4374752357401",
    },
    "seed_script": {
        "path": "apps/primary-advantage/scripts/seed-host-proof-session.ts",
        "sha256": "7d9fcd005db35b1dce4fd5e2796903b85a477fd2d9e024f48746f9b6d7326b41",
    },
}
PRIMARY_HOST_MATRIX_SHA256 = "2f8191da34e4af508310cb2ffdf9c6b69f50f5d1ba101a039e3b448d1bbe9299"
CURRENT_SOURCE_HEAD = "c3f86c86b85ad0519ac57edf74978b5ee716ebe6"
TASK5_ACCEPTANCE_REVISION = "9c4a4e1d2"
READING_COMMAND_TEMPLATE = (
    "DATABASE_URL=<local-test-database> DIRECT_DATABASE_URL=<local-test-database> CI=true PLAYWRIGHT_PORT=3128 "
    "pnpm --filter reading-advantage exec playwright test tests/e2e/host-proof-games.spec.ts"
)
READING_ENVIRONMENT = {
    "parent": {
        "CI": "true",
        "DATABASE_URL": "<local-test-database>",
        "DIRECT_DATABASE_URL": "<local-test-database>",
        "PLAYWRIGHT_PORT": "3128",
    },
    "web_server": {
        "HOST_PROOF_ENABLED": "true",
        "NEXT_DIST_DIR": ".next/host-proof-3128",
        "PORT": "3128",
    },
    "values_redacted": True,
}
PRIMARY_COMMAND_TEMPLATE = (
    "DATABASE_URL=<local-test-database> CI=true PLAYWRIGHT_PORT=3139 "
    "pnpm --filter primary-advantage exec playwright test tests/e2e/host-proof-games.spec.ts"
)
PRIMARY_ENVIRONMENT = {
    "parent": {
        "CI": "true",
        "DATABASE_URL": "<local-test-database>",
        "PLAYWRIGHT_PORT": "3139",
    },
    "web_server": {
        "HOST_PROOF_ENABLED": "true",
        "PORT": "3139",
    },
    "values_redacted": True,
}
CURRENT_IMPLEMENTATION_BINDINGS = {
    "reading_host_client": {
        "path": "apps/reading-advantage/components/host-proof/HostProofGameClient.tsx",
        "sha256": "5ec5f4e953b2a1bed312516a4342717f538e28f27e7ce27cc9a88b9fcd352470",
    },
    "reading_host_page": {
        "path": "apps/reading-advantage/app/[locale]/(host-proof)/student/host-proof/games/page.tsx",
        "sha256": "153eb18bb0617f9b9f0a9ec85d61b4136d8c2e04535fae143948f7d7eed327bb",
    },
    "reading_host_route": {
        "path": "apps/reading-advantage/app/api/host-proof/games/completions/route.ts",
        "sha256": "ffa3d5d21530eada589138c7e790aa5f281659f9085cc45366c4805c759ae2f9",
    },
    "reading_host_gate": {
        "path": "apps/reading-advantage/lib/host-proof-config.ts",
        "sha256": "b99c2384bd7cb279e2c89729f0804e40fdeb4c9e511786ad0bb4cfd221c93c32",
    },
    "reading_qc_loader": {
        "path": "apps/reading-advantage/lib/host-proof-qc-loader.ts",
        "sha256": "d5c56bc6b4e0b5259617427522e79179e4a6f07c1ce37e89de7da0856ba2334d",
    },
    "reading_next_config": {
        "path": "apps/reading-advantage/next.config.ts",
        "sha256": "07637e3b4c7dff391c602558c585ff63960344b9d43d30ac7beb86b1149d4da6",
    },
    "primary_host_client": {
        "path": "apps/primary-advantage/components/host-proof/HostProofGameClient.tsx",
        "sha256": "5a6cace25ebdef87823010d3ea8637e8e2c850000c393325c806b55d700e0a64",
    },
    "primary_host_page": {
        "path": "apps/primary-advantage/app/[locale]/(host-proof)/student/host-proof/games/page.tsx",
        "sha256": "a2afa49cf95b7d578fe74fabf866ffac7376a1bee36e44d00d0e11e53b611971",
    },
    "primary_host_route": {
        "path": "apps/primary-advantage/app/api/host-proof/games/completions/route.ts",
        "sha256": "1e8044a8c8584b94b67980028e35cb1e1ad7c10bbc1a8a16ccbeffd71101752c",
    },
    "primary_host_gate": {
        "path": "apps/primary-advantage/lib/host-proof-config.ts",
        "sha256": "b99c2384bd7cb279e2c89729f0804e40fdeb4c9e511786ad0bb4cfd221c93c32",
    },
    "primary_next_config": {
        "path": "apps/primary-advantage/next.config.ts",
        "sha256": "7f2ec850e001aa00d30b5372fbdcf88f550822d6e846e1b716173146f11f293f",
    },
    "shared_domain_adapter": {
        "path": "packages/domain/src/games/host-proof.ts",
        "sha256": "1a56fc3d7c9d11aa29389acbeaf44e06cb1e6054f3909af679cb2cdf99b900fa",
    },
}
OBSERVED_IMPLEMENTATION_BINDINGS = {
    "reading_host_client": {
        "path": "apps/reading-advantage/components/host-proof/HostProofGameClient.tsx",
        "sha256": "393ac9d71b1b18ac305229bf7ab7852abd76476626eefc7bc08c45c4d646b189",
    },
    "reading_host_page": CURRENT_IMPLEMENTATION_BINDINGS["reading_host_page"],
    "reading_host_route": CURRENT_IMPLEMENTATION_BINDINGS["reading_host_route"],
    "reading_host_gate": CURRENT_IMPLEMENTATION_BINDINGS["reading_host_gate"],
    "reading_qc_loader": CURRENT_IMPLEMENTATION_BINDINGS["reading_qc_loader"],
    "reading_next_config": {
        "path": "apps/reading-advantage/next.config.ts",
        "sha256": "a36ccd5f233892d954bf4bac713efc969e37f88cfb39f42f2be22b1402be42bc",
    },
    "primary_host_client": {
        "path": "apps/primary-advantage/components/host-proof/HostProofGameClient.tsx",
        "sha256": "22d145aa3f7faf060d5c6f1d10fd2a5a01a34b0ae00839d44ba9905375923c6c",
    },
    "primary_host_page": CURRENT_IMPLEMENTATION_BINDINGS["primary_host_page"],
    "primary_host_route": CURRENT_IMPLEMENTATION_BINDINGS["primary_host_route"],
    "primary_host_gate": CURRENT_IMPLEMENTATION_BINDINGS["primary_host_gate"],
    "primary_next_config": CURRENT_IMPLEMENTATION_BINDINGS["primary_next_config"],
    "shared_domain_adapter": {
        "path": "packages/domain/src/games/host-proof.ts",
        "sha256": "913d857ef8bef3bef7d57078d7655b6885f7206ce6598de2e68084f31af1dfc9",
    },
}
CURRENT_READING_KIMI_BINDINGS = {
    key: OBSERVED_IMPLEMENTATION_BINDINGS[key]
    for key in (
        "reading_host_client", "reading_host_page", "reading_host_route",
        "reading_host_gate", "reading_qc_loader", "reading_next_config",
    )
}
CURRENT_PRIMARY_KIMI_BINDINGS = {
    key: OBSERVED_IMPLEMENTATION_BINDINGS[key]
    for key in (
        "primary_host_client", "primary_host_page", "primary_host_route",
        "primary_host_gate", "primary_next_config",
    )
}


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest for one exact file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load(path: Path) -> dict[str, Any]:
    """Loads a JSON object from one evidence path."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _repo_path(path: str) -> Path:
    """Returns one repository-relative path after rejecting an escape attempt."""
    candidate = Path(path)
    if candidate.is_absolute():
        raise AssertionError(f"Evidence path must be relative: {path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"Evidence path escapes repository: {path}") from error
    return resolved


def _revision_sha256(revision: str, path: str) -> str:
    """Returns one path's digest at an immutable Git revision."""
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    )
    return hashlib.sha256(result.stdout).hexdigest()


def _load_revision_object(revision: str, path: str) -> dict[str, Any]:
    """Loads one JSON object from an immutable Git revision."""
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    )
    value = json.loads(result.stdout)
    if not isinstance(value, dict):
        raise AssertionError(f"{revision}:{path} must contain an object")
    return value


def _canonical_json_sha256(value: dict[str, Any]) -> str:
    """Returns the digest of a deterministically serialized JSON object."""
    serialized = json.dumps(value, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


class ExistingCoreTask5HostProofEvidenceTests(unittest.TestCase):
    """Ensures execution observations cannot be mistaken for Task 5 acceptance."""

    def test_evidence_binds_exact_predecessor_contract_hosts_and_reports(self) -> None:
        """Requires both local host observations and every hash-bound executable input."""
        evidence = _load(EVIDENCE_PATH)
        self.assertEqual(set(evidence), {
            "schema_version", "evidence_id", "track_id", "task_number", "status", "scope",
            "predecessor_authorization", "host_contract", "committed_source_head", "executed_hosts", "current_implementation_baseline", "current_browser_observations", "production_quarantine",
            "claims", "required_before_task5_acceptance",
        })
        self.assertEqual(evidence["schema_version"], "apk-existing-core-task5-reading-primary-host-proof-evidence.v1")
        self.assertEqual(evidence["status"], "execution-recorded-only")
        self.assertEqual(evidence["predecessor_authorization"], {
            "path": str(TASK4_RECEIPT_PATH.relative_to(REPO_ROOT)),
            "sha256": TASK4_RECEIPT_SHA256,
            "authorization_status": "authorized-to-begin-task5-reading-primary-host-proof-only",
        })
        self.assertEqual(_sha256(TASK4_RECEIPT_PATH), TASK4_RECEIPT_SHA256)
        predecessor = _load(TASK4_RECEIPT_PATH)
        self.assertEqual(
            predecessor["downstream_authorization"]["status"],
            "authorized-to-begin-task5-reading-primary-host-proof-only",
        )
        self.assertIn(
            "declaring Task 5 success or completion",
            predecessor["downstream_authorization"]["excluded_actions"],
        )
        self.assertFalse(predecessor["claims"]["task5_host_proof_success_claimed"])
        self.assertFalse(predecessor["claims"]["reading_host_proof_success_claimed"])
        self.assertFalse(predecessor["claims"]["primary_host_proof_success_claimed"])
        self.assertEqual(evidence["host_contract"]["path"], HOST_CONTRACT_PATH)
        self.assertEqual(evidence["host_contract"]["sha256"], HOST_CONTRACT_SHA256)
        self.assertEqual(_revision_sha256(TASK5_ACCEPTANCE_REVISION, HOST_CONTRACT_PATH), HOST_CONTRACT_SHA256)
        self.assertEqual(evidence["host_contract"]["binding_ids"], [
            "dragon-flight", "magic-defense", "dungeon-liberator", "sorcerer-ziggurat", "astral-mage",
        ])
        self.assertEqual(evidence["host_contract"]["registration"], "reading-primary-host-proof-only")
        self.assertEqual(evidence["committed_source_head"], CURRENT_SOURCE_HEAD)
        self.assertEqual([host["application"] for host in evidence["executed_hosts"]], [
            "reading-advantage", "primary-advantage",
        ])

        expected_reports = [
            (READING_REPORT_PATH, "reading-advantage", "http://localhost:3128", READING_BINDINGS),
            (PRIMARY_REPORT_PATH, "primary-advantage", "http://localhost:3139", PRIMARY_BINDINGS),
        ]
        for host, (report_path, application, base_url, bindings) in zip(
            evidence["executed_hosts"], expected_reports, strict=True
        ):
            self.assertEqual(host["application"], application)
            self.assertEqual(host["base_url"], base_url)
            self.assertEqual(host["execution_report"]["path"], str(report_path.relative_to(REPO_ROOT)))
            self.assertEqual(host["execution_report"]["sha256"], _sha256(report_path))
            report = _load(report_path)
            if application == "reading-advantage":
                self.assertEqual(report["schema_version"], "apk-existing-core-task5-host-proof-playwright-observation.v2")
                self.assertEqual(report["source_status"], "current-source-rerun-after-remediation")
                self.assertEqual(report["supersedes"], {
                    "path": str(READING_HISTORICAL_REPORT_PATH.relative_to(REPO_ROOT)),
                    "sha256": "a22479fb00db47e2fa30f24f245c4e129e8a74373b937577e1a95e74fe1cf63a",
                    "reason": "Replaces the historical-before-remediation Reading observation with a current-source setup-backed rerun.",
                })
                self.assertEqual(_sha256(READING_HISTORICAL_REPORT_PATH), report["supersedes"]["sha256"])
                execution_binding = report["execution_binding"]
                self.assertEqual(execution_binding["command_template"], READING_COMMAND_TEMPLATE)
                self.assertEqual(
                    execution_binding["command_sha256"],
                    hashlib.sha256(READING_COMMAND_TEMPLATE.encode("utf-8")).hexdigest(),
                )
                environment = execution_binding["environment"]
                self.assertEqual(environment["environment_sha256"], _canonical_json_sha256(READING_ENVIRONMENT))
                self.assertEqual(
                    {key: value for key, value in environment.items() if key != "environment_sha256"},
                    READING_ENVIRONMENT,
                )
            else:
                self.assertEqual(set(report), {
                    "schema_version", "application", "status", "base_url", "route", "feature_flag", "runner",
                    "project", "authentication_fixture", "database_fixture", "execution_binding", "test_result_file",
                    "test_bindings", "tests", "observation_only", "source_status",
                })
                self.assertEqual(report["schema_version"], "apk-existing-core-task5-host-proof-playwright-observation.v1")
            self.assertEqual(report["application"], application)
            self.assertEqual(report["base_url"], base_url)
            self.assertEqual(
                report["route"],
                "/en/student/host-proof/games" if application == "reading-advantage" else "/student/host-proof/games",
            )
            self.assertEqual(report["feature_flag"], "HOST_PROOF_ENABLED=true")
            self.assertEqual(report["runner"], "playwright")
            self.assertEqual(report["project"], "chromium")
            self.assertEqual(report["status"], "passed")
            self.assertTrue(report["observation_only"])
            if application == "primary-advantage":
                self.assertEqual(report["source_status"], "current-source-rerun")
                execution_binding = report["execution_binding"]
                self.assertEqual(execution_binding["command_template"], PRIMARY_COMMAND_TEMPLATE)
                self.assertEqual(
                    execution_binding["command_sha256"],
                    hashlib.sha256(PRIMARY_COMMAND_TEMPLATE.encode("utf-8")).hexdigest(),
                )
                environment = execution_binding["environment"]
                self.assertEqual(environment["environment_sha256"], _canonical_json_sha256(PRIMARY_ENVIRONMENT))
                self.assertEqual(
                    {key: value for key, value in environment.items() if key != "environment_sha256"},
                    PRIMARY_ENVIRONMENT,
                )
            self.assertEqual(report["test_bindings"], bindings)
            for binding in report["test_bindings"].values():
                if report["source_status"] in {"current-source-rerun", "current-source-rerun-after-remediation"}:
                    self.assertEqual(_revision_sha256(CURRENT_SOURCE_HEAD, binding["path"]), binding["sha256"])
            result_file = report["test_result_file"]
            self.assertEqual(
                _revision_sha256(CURRENT_SOURCE_HEAD, result_file["path"]),
                result_file["sha256"],
            )
            if application == "reading-advantage":
                self.assertEqual(result_file["status"], "passed")
                self.assertEqual(result_file["failed_tests"], [])
                self.assertTrue(result_file["per_test_results"])
                self.assertEqual(
                    {key: result_file[key] for key in ("stats_expected", "stats_unexpected", "stats_skipped", "stats_flaky")},
                    {"stats_expected": 41, "stats_unexpected": 0, "stats_skipped": 0, "stats_flaky": 0},
                )
            else:
                self.assertEqual(result_file, {
                    "path": result_file["path"],
                    "sha256": result_file["sha256"],
                    "status": "passed",
                    "failed_tests": [],
                })
            self.assertEqual(
                {key: report["tests"][key] for key in ("passed", "failed", "skipped")},
                {"passed": 40, "failed": 0, "skipped": 0},
            )
            if application == "primary-advantage":
                self.assertEqual(
                    report["tests"]["result_artifact"],
                    {
                        "stats_expected": 41,
                        "stats_unexpected": 0,
                        "stats_skipped": 0,
                        "browser_case_total": 40,
                    },
                )
                result = _load_revision_object(CURRENT_SOURCE_HEAD, result_file["path"])
                self.assertEqual(result["config"]["configFile"].split("/")[-1], "playwright.config.ts")
                self.assertEqual(result["stats"]["expected"], 41)
                self.assertEqual(result["stats"]["unexpected"], 0)
                self.assertEqual(result["stats"]["skipped"], 0)
                browser_suite = next(
                    suite for suite in result["suites"] if suite["file"] == "host-proof-games.spec.ts"
                )
                setup_suite = next(
                    suite for suite in result["suites"] if suite["file"] == "host-proof-auth.setup.ts"
                )
                self.assertEqual(len(browser_suite["specs"]), 40)
                self.assertEqual(len(setup_suite["specs"]), 1)
            if application == "reading-advantage":
                result = _load_revision_object(CURRENT_SOURCE_HEAD, result_file["path"])
                self.assertEqual(result["stats"]["expected"], 41)
                self.assertEqual(result["stats"]["unexpected"], 0)
                self.assertEqual(result["stats"]["skipped"], 0)
                self.assertEqual(result["stats"]["flaky"], 0)
                browser_suite = next(
                    suite for suite in result["suites"] if suite["file"] == "host-proof-games.spec.ts"
                )
                setup_suite = next(
                    suite for suite in result["suites"] if suite["file"] == "host-proof-auth.setup.ts"
                )
                self.assertEqual(len(browser_suite["specs"]), 40)
                self.assertEqual(len(setup_suite["specs"]), 1)
            self.assertTrue(host["base_url"].startswith("http://localhost:"))

        baseline = evidence["current_implementation_baseline"]
        self.assertEqual(baseline["status"], "current-source-updated-after-browser-observation")
        self.assertEqual(
            baseline["meaning"],
            "The current source bindings are hash-bound below. The Kimi observations retain their exact prior-source bindings and therefore remain historical execution-only observations pending rerun; they do not update acceptance authority.",
        )
        self.assertEqual(baseline["bindings"], CURRENT_IMPLEMENTATION_BINDINGS)
        for binding in baseline["bindings"].values():
            self.assertEqual(_revision_sha256(CURRENT_SOURCE_HEAD, binding["path"]), binding["sha256"])
        self.assertEqual(baseline["observed_browser_bindings"], OBSERVED_IMPLEMENTATION_BINDINGS)

        expected_kimi_observations = [
            ("reading-advantage", "http://127.0.0.1:3011", KIMI_READING_REPORT_PATH, CURRENT_READING_KIMI_BINDINGS),
            ("primary-advantage", "http://127.0.0.1:3132", KIMI_PRIMARY_REPORT_PATH, CURRENT_PRIMARY_KIMI_BINDINGS),
        ]
        self.assertEqual(len(evidence["current_browser_observations"]), len(expected_kimi_observations))
        for browser_observation, (application, base_url, report_path, bindings) in zip(
            evidence["current_browser_observations"], expected_kimi_observations, strict=True
        ):
            self.assertEqual(browser_observation["application"], application)
            self.assertEqual(browser_observation["runner"], "kimi-webbridge")
            self.assertEqual(browser_observation["base_url"], base_url)
            self.assertEqual(browser_observation["execution_report"]["path"], str(report_path.relative_to(REPO_ROOT)))
            self.assertEqual(browser_observation["execution_report"]["sha256"], _sha256(report_path))
            kimi_report = _load(report_path)
            self.assertEqual(kimi_report["status"], "passed")
            self.assertTrue(kimi_report["observation_only"])
            self.assertEqual(kimi_report["source_status"], "historical-before-remediation")
            self.assertEqual(kimi_report["source_bindings"], bindings)
            self.assertEqual(bindings, {
                key: OBSERVED_IMPLEMENTATION_BINDINGS[key]
                for key in bindings
            })

    def test_evidence_preserves_quarantine_and_all_prohibited_claims(self) -> None:
        """Rejects any authority expansion from a local execution observation."""
        evidence = _load(EVIDENCE_PATH)
        self.assertEqual(evidence["production_quarantine"]["catalog"], QUARANTINED_CATALOG)
        self.assertEqual(_revision_sha256(TASK5_ACCEPTANCE_REVISION, QUARANTINED_CATALOG["path"]), QUARANTINED_CATALOG["sha256"])
        self.assertEqual(evidence["production_quarantine"]["root_exports"], ROOT_EXPORTS)
        self.assertEqual(_revision_sha256(TASK5_ACCEPTANCE_REVISION, ROOT_EXPORTS["path"]), ROOT_EXPORTS["sha256"])
        self.assertEqual(evidence["claims"], {
            "asset_adoption_claimed": False,
            "accepted_suitability_dossier_consumed": False,
            "task5_acceptance_claimed": False,
            "title_host_proof_completion_claimed": False,
            "migration_claimed": False,
            "cartridge_cutover_claimed": False,
            "catalog_or_loader_exposed": False,
            "legacy_retirement_claimed": False,
            "deployment_claimed": False,
            "product_owner_acceptance_claimed": False,
            "broader_cohort_acceptance_claimed": False,
            "commit_created_for_this_evidence": False,
        })
        self.assertEqual(evidence["required_before_task5_acceptance"], [
            "accepted Asset Contract v2 plus hash-bound per-title/per-role suitability dossiers",
            "accepted reuse or canonical-ingestion decision for every required role",
            "independent review and product-owner acceptance of the asset-adoption gate",
        ])

    def test_plan_keeps_only_dragon_flight_in_the_corrective_phase(self) -> None:
        """Rejects reuse of the superseded five-title host-proof lifecycle."""
        plan = (TRACK_ROOT / "plan.md").read_text(encoding="utf-8")
        task5 = next(line for line in plan.splitlines() if "Recover Task 5 through a Dragon Flight-only" in line)
        self.assertTrue(task5.startswith("- [~]"))
        self.assertIn("historical non-consumable", task5)
        self.assertIn("24-title candidate", task5)
        dragon_phase = next(line for line in plan.splitlines() if "Implement and verify the Dragon Flight dedicated runtime" in line)
        self.assertTrue(dragon_phase.startswith("  - [~]"))
        self.assertIn("No later title or cohort may consume", dragon_phase)
        self.assertIn("Terra phase acceptance, independent Sol review, and explicit product-owner authorization", dragon_phase)
        self.assertTrue(
            next(line for line in plan.splitlines() if "Gate Task 5 acceptance on asset adoption" in line).startswith("- [x]")
        )
        task6_line = next(line for line in plan.splitlines() if "Retire only each title's exact replaced legacy paths" in line)
        self.assertTrue(task6_line.startswith("- [b]"))
        self.assertIn("zero-deletion manifest is historical retention evidence", task6_line)
        owner_line = next(line for line in plan.splitlines() if "Obtain independent review and product-owner acceptance for the cohort" in line)
        self.assertTrue(owner_line.startswith("- [b]"))
        self.assertIn("title-specific Dragon Flight production proof", owner_line)
        self.assertNotIn("Prove Reading and Primary load", plan)

    def test_primary_host_matrix_is_historical_and_current_lifecycle_remains_dragon_only(self) -> None:
        """Pins the historical matrix without treating it as current cohort acceptance."""
        primary_matrix = REPO_ROOT / PRIMARY_BINDINGS["host_matrix"]["path"]
        self.assertEqual(PRIMARY_BINDINGS["host_matrix"]["sha256"], PRIMARY_HOST_MATRIX_SHA256)
        self.assertTrue(primary_matrix.is_file())
        self.assertEqual(
            _revision_sha256(CURRENT_SOURCE_HEAD, PRIMARY_BINDINGS["host_matrix"]["path"]),
            PRIMARY_HOST_MATRIX_SHA256,
        )

        plan = (TRACK_ROOT / "plan.md").read_text(encoding="utf-8")
        self.assertTrue(next(line for line in plan.splitlines() if "Gate Task 5 acceptance on asset adoption" in line).startswith("- [x]"))
        self.assertTrue(next(line for line in plan.splitlines() if "Canonical-reuse dossier package" in line).startswith("  - [x]"))
        self.assertTrue(next(line for line in plan.splitlines() if "Additive Task-3 current-lineage receipt" in line).startswith("  - [x]"))
        self.assertTrue(next(line for line in plan.splitlines() if "Source identity inventory" in line).startswith("  - [x]"))
        task5 = next(line for line in plan.splitlines() if "Recover Task 5 through a Dragon Flight-only" in line)
        self.assertTrue(task5.startswith("- [~]"))
        self.assertIn("shared 24-title candidate", task5)
        task6_line = next(line for line in plan.splitlines() if "Retire only each title's exact replaced legacy paths" in line)
        self.assertTrue(task6_line.startswith("- [b]"))
        owner_line = next(line for line in plan.splitlines() if "Obtain independent review and product-owner acceptance for the cohort" in line)
        self.assertTrue(owner_line.startswith("- [b]"))


if __name__ == "__main__":
    unittest.main()
