"""Blocking Red contracts for the business-operations graph baseline validator.

All Python-side positive controls are independently executable and must pass.
The suite remains Red solely because
``measure.business_operations_graph_baseline_validation`` is intentionally
absent until Phase R0 Green.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import importlib
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_DIR = REPO_ROOT / "measure/tracks/business_operations_graph_baseline_remediation_20260730"
FIXTURE_ROOT = TRACK_DIR / "fixtures/v1"
PARENT_FIXTURE_ROOT = FIXTURE_ROOT / "parent-fail-artifacts-v1"
PLAN_PATH = TRACK_DIR / "plan.md"
VALIDATOR_MODULE = "measure.business_operations_graph_baseline_validation"
BASELINE_HEAD = "3ff9b734a9e5a69f777108827b569e4f20a5ceb8"

# These literals are the trust roots. Coordinated replacement of an artifact
# and its mutable manifest/index still fails before the absent validator runs.
PARENT_MANIFEST_SHA256 = "15f3c61fbcea4ea13c777e4f80ff061de2fa007985ef38b77dd560b1c8c77d50"
FIXTURE_INDEX_SHA256 = "887f5975b5f876b08751cd3884bb39ac70678320abc9e187875ed84a10e2ea4f"
PARENT_PINS = {
    "phase0-review-b-safety-20260730.json": {
        "authoritative": "measure/tracks/small_company_admin_privileges_20260722/phase0-review-b-safety-20260730.json",
        "sha256": "5bfe10b18aaf650687a337f02a64dab35de378ef8ba333e4946af6e80143fc9f",
        "size": 9256,
        "kind": "independent-review-fail",
    },
    "phase0-graph-baseline-producer-evidence-20260722.md": {
        "authoritative": "measure/tracks/small_company_admin_privileges_20260722/phase0-graph-baseline-producer-evidence-20260722.md",
        "sha256": "6d3613787361d0747d6ed9f590583257d92ac15f6717fbd58d9a1bcc006181db",
        "size": 7206,
        "kind": "producer-evidence-fail",
    },
    "red-rereview-correctness-20260730.json": {
        "authoritative": "measure/tracks/business_operations_graph_baseline_remediation_20260730/red-rereview-correctness-20260730.json",
        "sha256": "e64fdbd2f67145a18c8e0d821b39629ec750cb71eae78acde357d245ddf19d73",
        "size": 8665,
        "kind": "mid-red-rereview-fail",
    },
}

EXPECTED_ACCOUNTS_ROUTES = {
    ("PUT", "/api/admin/employees/:accountId/company-roles", "apps/accounts/app/api/admin/employees/[accountId]/company-roles/route.ts"),
    ("PUT", "/api/admin/employees/:accountId/credential", "apps/accounts/app/api/admin/employees/[accountId]/credential/route.ts"),
    ("PUT", "/api/admin/employees/:accountId/roles", "apps/accounts/app/api/admin/employees/[accountId]/roles/route.ts"),
    ("DELETE", "/api/admin/employees/:accountId/sessions", "apps/accounts/app/api/admin/employees/[accountId]/sessions/route.ts"),
    ("PATCH", "/api/admin/employees/:accountId/status", "apps/accounts/app/api/admin/employees/[accountId]/status/route.ts"),
    ("GET", "/api/admin/employees", "apps/accounts/app/api/admin/employees/route.ts"),
    ("POST", "/api/admin/employees", "apps/accounts/app/api/admin/employees/route.ts"),
    ("GET", "/api/health", "apps/accounts/app/api/health/route.ts"),
    ("GET", "/api/oidc/authorize", "apps/accounts/app/api/oidc/authorize/route.ts"),
    ("POST", "/api/oidc/introspect", "apps/accounts/app/api/oidc/introspect/route.ts"),
    ("GET", "/api/oidc/jwks", "apps/accounts/app/api/oidc/jwks/route.ts"),
    ("POST", "/api/oidc/logout", "apps/accounts/app/api/oidc/logout/route.ts"),
    ("POST", "/api/oidc/token", "apps/accounts/app/api/oidc/token/route.ts"),
    ("GET", "/api/ready", "apps/accounts/app/api/ready/route.ts"),
    ("POST", "/api/session/login", "apps/accounts/app/api/session/login/route.ts"),
    ("POST", "/api/session/logout", "apps/accounts/app/api/session/logout/route.ts"),
    ("GET", "", "apps/accounts/app/page.tsx"),
}
EXPECTED_EXCLUSIONS = {
    "packages/advantage-play-kit/src/assets/semantic-product-bindings.test.ts",
    "packages/advantage-play-kit/src/qc/__tests__/qc-kit.test.ts",
    "packages/advantage-play-kit/src/scaffolding/__tests__/exemplar.test.ts",
    "packages/advantage-play-kit/src/scaffolding/__tests__/scaffold.test.ts",
    "packages/advantage-play-kit/src/assets/asset-contract-v2-adversarial.test.ts",
    "packages/advantage-play-kit/src/assets/asset-contract-v2.test.ts",
    "packages/advantage-play-kit/src/assets/assets-public-api.test.ts",
    "packages/advantage-play-kit/src/assets/semantic-product-bindings-v2.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-additive-release.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-legacy-source-packet.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-suitability-comparison-fixtures.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-suitability-ingestion-negative-fixtures.test-support.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-suitability-ingestion-negative.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-suitability-test-fixtures.test-support.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-suitability.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-test-paths.test-support.ts",
    "packages/advantage-play-kit/src/qc/__tests__/standard-pack-suitability-qc.test.ts",
    "packages/advantage-play-kit/vitest.config.ts",
    "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.test.tsx",
    "apps/advantage-games/tests/e2e/qc/authoring-qc.spec.ts",
    "apps/advantage-games/src/components/apk/AssetContractV2Qc.test.tsx",
    "apps/advantage-games/src/components/apk/StandardPackSuitabilityQc.test.tsx",
    "packages/backend/src/jobs/__tests__/postgres16-harness.ts",
    "packages/backend/src/jobs/__tests__/postgres16-harness.test.ts",
    "packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts",
}
EXPECTED_COMMANDS = {
    "accounts-test": "CI=true pnpm --filter accounts test",
    "accounts-check-types": "CI=true pnpm --filter accounts check-types",
    "backend-test": "CI=true pnpm --filter @reading-advantage/backend test",
    "backend-check-types": "CI=true pnpm --filter @reading-advantage/backend check-types",
    "apk-test": "CI=true pnpm --filter @reading-advantage/advantage-play-kit test",
    "apk-check-types": "CI=true pnpm --filter @reading-advantage/advantage-play-kit check-types",
    "vocabulary-games-test": "CI=true pnpm --filter vocabulary-games test -- --runInBand",
    "vocabulary-games-check-types": "CI=true pnpm --filter vocabulary-games check-types",
}
SECURITY_CATEGORIES = (
    "authentication",
    "authorization",
    "validation",
    "scope",
    "audit",
    "destructiveEffect",
)
SUPPORTED_DISPOSITIONS = {
    "authentication": {"authenticated", "public"},
    "authorization": {"permission-checked", "public"},
    "validation": {"request-validated", "not-applicable"},
    "scope": {"tenant-scoped", "global"},
    "audit": {"immutable-audit", "not-applicable"},
    "destructiveEffect": {"destructive", "none"},
}
AUTHENTICATED_ROUTE_NAMES = {
    "PUT /api/admin/employees/:accountId/company-roles",
    "PUT /api/admin/employees/:accountId/credential",
    "PUT /api/admin/employees/:accountId/roles",
    "DELETE /api/admin/employees/:accountId/sessions",
    "PATCH /api/admin/employees/:accountId/status",
    "GET /api/admin/employees",
    "POST /api/admin/employees",
    "GET /api/oidc/authorize",
    "POST /api/oidc/introspect",
    "POST /api/oidc/logout",
}
PERMISSION_CHECKED_ROUTE_NAMES = {
    name for name in AUTHENTICATED_ROUTE_NAMES if name.startswith(("GET /api/admin/", "POST /api/admin/", "PUT /api/admin/", "PATCH /api/admin/", "DELETE /api/admin/"))
}
VALIDATED_ROUTE_NAMES = {
    *PERMISSION_CHECKED_ROUTE_NAMES,
    "GET /api/oidc/authorize",
    "POST /api/oidc/introspect",
    "POST /api/oidc/logout",
    "POST /api/oidc/token",
    "POST /api/session/login",
    "POST /api/session/logout",
    "GET ",
}
DESTRUCTIVE_ROUTE_NAMES = {
    "PUT /api/admin/employees/:accountId/company-roles",
    "PUT /api/admin/employees/:accountId/credential",
    "PUT /api/admin/employees/:accountId/roles",
    "DELETE /api/admin/employees/:accountId/sessions",
    "PATCH /api/admin/employees/:accountId/status",
    "POST /api/admin/employees",
    "POST /api/oidc/logout",
    "POST /api/session/logout",
}
CLAIMS_BY_DISPOSITION = {
    ("authentication", "authenticated"): {
        "authentication.session-evidence",
        "authentication.sso-cookie-gate",
        "authentication.basic-client-gate",
        "authentication.bearer-gate",
    },
    ("authentication", "public"): {"authentication.public-or-optional-session-entrypoint"},
    ("authorization", "permission-checked"): {"authorization.company-admin-policy"},
    ("authorization", "public"): {"authorization.no-company-admin-capability"},
    ("validation", "request-validated"): {
        "validation.capability-input-schema",
        "validation.protocol-or-service-boundary",
    },
    ("validation", "not-applicable"): {"validation.input-free-endpoint"},
    ("scope", "global"): {"scope.company-global-policy", "scope.global-protocol-endpoint"},
    ("scope", "tenant-scoped"): {"scope.tenant-owner-boundary"},
    ("audit", "immutable-audit"): {"audit.immutable-capability-event"},
    ("audit", "not-applicable"): {"audit.no-route-level-immutable-claim"},
    ("destructiveEffect", "destructive"): {"destructiveEffect.employee-or-session-state-change"},
    ("destructiveEffect", "none"): {"destructiveEffect.no-destructive-state-call"},
}
CLAIM_TOKEN_CONSTRAINTS = {
    "authentication.session-evidence": ({"identityAuthenticationEvidence()"}, set()),
    "authentication.sso-cookie-gate": ({"ssoSessionToken", "if (!ssoSessionToken)"}, set()),
    "authentication.basic-client-gate": ({'startsWith("Basic ")', "status: 401"}, set()),
    "authentication.bearer-gate": ({'startsWith("Bearer ")', "status: 401"}, set()),
    "authentication.public-or-optional-session-entrypoint": (set(), {"identityAuthenticationEvidence"}),
    "authorization.company-admin-policy": ({'authorization: { mode: "policy"'}, set()),
    "authorization.no-company-admin-capability": (set(), {"companyIdentityCapabilityIds", "COMPANY_ADMIN"}),
    "validation.capability-input-schema": (set(), set()),
    "validation.protocol-or-service-boundary": (set(), set()),
    "validation.input-free-endpoint": ({"NextResponse.json"}, {"request.json", "request.formData", "searchParams.get"}),
    "scope.company-global-policy": ({'tenancy: { mode: "global"'}, {"tenantId", "schoolId"}),
    "scope.global-protocol-endpoint": (set(), {"tenantId", "schoolId"}),
    "audit.immutable-capability-event": ({"immutable: true"}, set()),
    "audit.no-route-level-immutable-claim": (set(), {"immutable: true", "companyIdentityCapabilityIds"}),
    "destructiveEffect.employee-or-session-state-change": (set(), set()),
    "destructiveEffect.no-destructive-state-call": (
        set(),
        {"resetCredential", "revokeSessions", "setEmployeeStatus", "service.localLogout", "service.globalLogout"},
    ),
}
REQUIRED_SECURITY_ADVERSARIES = {
    "security-disposition-fabricated",
    "security-evidence-kind-fabricated",
    "copied-route-wide-evidence",
    "fabricated-category-assertion",
    "public-exception-source-mismatch",
    "admin-public-exception-fabricated",
}
EXPECTED_SUCCESSOR_GATES = {
    "small_company_admin_privileges_20260722:Phase-S1",
    "customer_licensing_crm_20260722:contract-schema-red",
}


def _expected_security_dispositions(route_name: str) -> dict[str, str]:
    """Returns source-reviewed disposition expectations for one frozen route."""
    return {
        "authentication": "authenticated" if route_name in AUTHENTICATED_ROUTE_NAMES else "public",
        "authorization": "permission-checked" if route_name in PERMISSION_CHECKED_ROUTE_NAMES else "public",
        "validation": "request-validated" if route_name in VALIDATED_ROUTE_NAMES else "not-applicable",
        "scope": "global",
        "audit": "immutable-audit" if route_name in PERMISSION_CHECKED_ROUTE_NAMES else "not-applicable",
        "destructiveEffect": "destructive" if route_name in DESTRUCTIVE_ROUTE_NAMES else "none",
    }


def _expected_security_claims(route_name: str) -> dict[str, str]:
    """Returns the only source-assertion claim allowed per route category."""
    if route_name in PERMISSION_CHECKED_ROUTE_NAMES:
        authentication = "authentication.session-evidence"
    elif route_name == "GET /api/oidc/authorize":
        authentication = "authentication.sso-cookie-gate"
    elif route_name == "POST /api/oidc/introspect":
        authentication = "authentication.basic-client-gate"
    elif route_name == "POST /api/oidc/logout":
        authentication = "authentication.bearer-gate"
    else:
        authentication = "authentication.public-or-optional-session-entrypoint"
    return {
        "authentication": authentication,
        "authorization": (
            "authorization.company-admin-policy"
            if route_name in PERMISSION_CHECKED_ROUTE_NAMES
            else "authorization.no-company-admin-capability"
        ),
        "validation": (
            "validation.capability-input-schema"
            if route_name in PERMISSION_CHECKED_ROUTE_NAMES
            else (
                "validation.protocol-or-service-boundary"
                if route_name in VALIDATED_ROUTE_NAMES
                else "validation.input-free-endpoint"
            )
        ),
        "scope": (
            "scope.company-global-policy"
            if route_name in PERMISSION_CHECKED_ROUTE_NAMES
            else "scope.global-protocol-endpoint"
        ),
        "audit": (
            "audit.immutable-capability-event"
            if route_name in PERMISSION_CHECKED_ROUTE_NAMES
            else "audit.no-route-level-immutable-claim"
        ),
        "destructiveEffect": (
            "destructiveEffect.employee-or-session-state-change"
            if route_name in DESTRUCTIVE_ROUTE_NAMES
            else "destructiveEffect.no-destructive-state-call"
        ),
    }


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON fixture."""
    return json.loads(path.read_text(encoding="utf-8"))


def _canonicalize(value: Any) -> bytes:
    """Returns canonical bytes used by every fixture digest."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha(data: bytes) -> str:
    """Returns the lowercase SHA-256 digest of bytes."""
    return hashlib.sha256(data).hexdigest()


def _file_identity(path: Path) -> tuple[str, int]:
    """Returns the SHA-256 and byte size of one file."""
    data = path.read_bytes()
    return _sha(data), len(data)


def _resolve(parent: Any, path: str) -> Any:
    """Resolves a dot-delimited path through dicts and lists."""
    target = parent
    for segment in path.split("."):
        target = target[int(segment)] if isinstance(target, list) else target[segment]
    return target


def _set_path(value: Any, path: str, replacement: Any) -> None:
    """Sets a dot-delimited path on a copied fixture value."""
    *parents, leaf = path.split(".")
    target = value
    for segment in parents:
        target = target[int(segment)] if isinstance(target, list) else target[segment]
    if isinstance(target, list):
        target[int(leaf)] = replacement
    else:
        target[leaf] = replacement


def _delete_path(value: Any, path: str) -> None:
    """Deletes a dot-delimited path on a copied fixture value."""
    *parents, leaf = path.split(".")
    target = value
    for segment in parents:
        target = target[int(segment)] if isinstance(target, list) else target[segment]
    if isinstance(target, list):
        del target[int(leaf)]
    else:
        del target[leaf]


ENVELOPES = _load_json(FIXTURE_ROOT / "candidate-envelopes-v1.json")
INVALID = _load_json(FIXTURE_ROOT / "invalid-candidates-v1.json")
PARENT_MANIFEST = _load_json(PARENT_FIXTURE_ROOT / "manifest.json")


class BusinessOperationsGraphBaselineRemediationRedTests(unittest.TestCase):
    """Defines the fail-closed v1 candidate-validation contract."""

    maxDiff = None

    def _validate(self, candidate: dict[str, Any]) -> dict[str, Any]:
        """Calls the intentionally absent dedicated validator."""
        try:
            module = importlib.import_module(VALIDATOR_MODULE)
        except ModuleNotFoundError as error:
            self.fail(
                "Red expected: dedicated module "
                "measure.business_operations_graph_baseline_validation does not exist"
            )
            raise AssertionError("unreachable") from error
        self.assertEqual(module.CANDIDATE_SCHEMA_VERSION, ENVELOPES["schemaVersion"])
        result = module.validate_candidate(candidate, fixture_root=FIXTURE_ROOT)
        self.assertIsInstance(result, dict)
        self.assertIn(result.get("decision"), {"ACCEPT", "BLOCKED"})
        self.assertIsInstance(result.get("reasons"), list)
        return result

    def _validate_at(
        self,
        candidate: Any,
        fixture_root: Path,
    ) -> dict[str, Any]:
        """Validates a candidate against a temporary adversarial artifact tree."""
        module = importlib.import_module(VALIDATOR_MODULE)
        result = module.validate_candidate(candidate, fixture_root=fixture_root)
        self.assertIsInstance(result, dict)
        self.assertIn(result.get("decision"), {"ACCEPT", "BLOCKED"})
        self.assertIsInstance(result.get("reasons"), list)
        return result

    def _rewrite_artifact(
        self,
        fixture_root: Path,
        reference: dict[str, Any],
        mutate: Any,
    ) -> dict[str, Any]:
        """Rewrites one copied JSON artifact and returns its refreshed reference."""
        path = fixture_root / reference["path"]
        value = _load_json(path)
        mutate(value)
        data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
        path.write_bytes(data)
        return {"path": reference["path"], "sha256": _sha(data), "size": len(data)}

    def _with_fixture_copy(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        """Copies the immutable fixture tree for one mutation-oriented test."""
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name) / "v1"
        shutil.copytree(FIXTURE_ROOT, root)
        return temporary, root

    def _assert_reason(self, result: dict[str, Any], reason: str) -> None:
        """Requires a fail-closed result containing one targeted reason code."""
        self.assertEqual(result["decision"], "BLOCKED")
        self.assertIn(reason, result["reasons"])

    def _assert_ref(self, reference: dict[str, Any]) -> Path:
        """Asserts an immutable fixture reference and returns its safe path."""
        self.assertEqual(set(reference), {"path", "sha256", "size"})
        relative = Path(reference["path"])
        self.assertFalse(relative.is_absolute())
        self.assertNotIn("..", relative.parts)
        path = FIXTURE_ROOT / relative
        self.assertEqual(_file_identity(path), (reference["sha256"], reference["size"]))
        return path

    def _archive(self, candidate: dict[str, Any]) -> tuple[dict[str, bytes], dict[str, Any]]:
        """Replays a source archive and proves exact manifest equality."""
        archive = _load_json(self._assert_ref(candidate["sourceSnapshot"]["archive"]))
        manifest = _load_json(self._assert_ref(candidate["sourceSnapshot"]["manifest"]))
        replay: dict[str, bytes] = {}
        metadata = []
        for entry in archive["entries"]:
            self.assertNotIn(entry["path"], replay)
            content = base64.b64decode(entry["contentBase64"], validate=True)
            self.assertEqual((_sha(content), len(content)), (entry["sha256"], entry["size"]))
            replay[entry["path"]] = content
            metadata.append({key: entry[key] for key in ("path", "sha256", "size", "mode", "state")})
        self.assertEqual(metadata, manifest["entries"])
        self.assertEqual(manifest["denominatorSha256"], _sha(_canonicalize(metadata)))
        for phase in ("preScan", "postScan"):
            self.assertEqual({
                key: candidate["sourceSnapshot"][phase][key]
                for key in ("denominatorSha256", "porcelainSha256", "stagedDiffSha256", "statusSha256")
            }, {
                key: manifest[key]
                for key in ("denominatorSha256", "porcelainSha256", "stagedDiffSha256", "statusSha256")
            })
            state = _load_json(self._assert_ref(candidate["sourceSnapshot"][phase]["stateArtifact"]))
            self.assertEqual(_sha(state["porcelain"].encode()), manifest["porcelainSha256"])
            self.assertEqual(_sha(state["stagedDiff"].encode()), manifest["stagedDiffSha256"])
            self.assertEqual(_sha(state["status"].encode()), manifest["statusSha256"])
        return replay, manifest

    def _assert_blocked(self, fixture: dict[str, Any]) -> None:
        """Applies one frozen invalid mutation and requires a matching block."""
        candidate = copy.deepcopy(ENVELOPES["candidates"][fixture["base"]])
        for path, replacement in fixture.get("set", {}).items():
            _set_path(candidate, path, replacement)
        for path in fixture.get("delete", []):
            _delete_path(candidate, path)
        for path, value in fixture.get("append", {}).items():
            _resolve(candidate, path).append(copy.deepcopy(value))
        result = self._validate(candidate)
        self.assertEqual(result["decision"], "BLOCKED", fixture["id"])
        self.assertTrue(set(fixture["reasonCodes"]) & set(result["reasons"]), fixture["id"])

    def _assert_accepted(self, branch: str) -> None:
        """Requires acceptance of one Python-preflighted valid branch."""
        candidate = copy.deepcopy(ENVELOPES["candidates"][branch])
        result = self._validate(candidate)
        self.assertEqual(result["decision"], "ACCEPT", branch)
        self.assertEqual(result["reasons"], [], branch)

    def test_literal_fixture_index_pins_every_generated_fixture(self) -> None:
        """Rejects coordinated fixture/index rewrites using a test-literal trust root."""
        index_path = FIXTURE_ROOT / "fixture-index-v1.json"
        self.assertEqual(_file_identity(index_path)[0], FIXTURE_INDEX_SHA256)
        index = _load_json(index_path)
        indexed = {entry["path"] for entry in index["artifacts"]}
        actual = {path.name for path in FIXTURE_ROOT.iterdir() if path.is_file() and path.name != index_path.name}
        self.assertEqual(indexed, actual)
        for entry in index["artifacts"]:
            self._assert_ref(entry)
        self._validate(ENVELOPES["candidates"]["clean"])

    def test_authoritative_parent_fail_bytes_match_literal_frozen_pins(self) -> None:
        """Binds live authoritative FAIL artifacts to immutable frozen bytes and semantics."""
        self.assertEqual(_file_identity(PARENT_FIXTURE_ROOT / "manifest.json")[0], PARENT_MANIFEST_SHA256)
        self.assertEqual(PARENT_MANIFEST["baselineHead"], BASELINE_HEAD)
        self.assertEqual(PARENT_MANIFEST["expectedClassification"], "BLOCKED")
        self.assertEqual(set(PARENT_MANIFEST["artifacts"]), set(PARENT_PINS))
        for name, pin in PARENT_PINS.items():
            frozen = PARENT_FIXTURE_ROOT / name
            authoritative = REPO_ROOT / pin["authoritative"]
            self.assertEqual(frozen.read_bytes(), authoritative.read_bytes(), name)
            self.assertEqual(_file_identity(frozen), (pin["sha256"], pin["size"]), name)
            manifest_entry = PARENT_MANIFEST["artifacts"][name]
            self.assertEqual((manifest_entry["sha256"], manifest_entry["size"], manifest_entry["kind"]), (pin["sha256"], pin["size"], pin["kind"]))
        review_b = _load_json(PARENT_FIXTURE_ROOT / "phase0-review-b-safety-20260730.json")
        self.assertEqual(review_b["verdict"], "FAIL")
        self.assertFalse(review_b["decision"]["phase0AcceptanceMayTruthfullyBeGranted"])
        self.assertFalse(review_b["decision"]["liftSmallCompanyPhaseS1Block"])
        self.assertFalse(review_b["decision"]["liftCustomerLicensingCrmBlock"])
        self.assertEqual({row["id"] for row in review_b["findings"]}, {"RB-01", "RB-02", "RB-03"})
        producer = (PARENT_FIXTURE_ROOT / "phase0-graph-baseline-producer-evidence-20260722.md").read_text()
        self.assertIn("audit ./graph.db --json` exited **`1`", producer)
        self.assertIn("Phase S1 remains blocked", producer)
        rereview = _load_json(PARENT_FIXTURE_ROOT / "red-rereview-correctness-20260730.json")
        self.assertEqual(rereview["decision"], "FAIL")
        self._validate({"schemaVersion": 1, "parentArtifacts": PARENT_MANIFEST})

    def test_parent_fail_hash_drift_is_rejected(self) -> None:
        """Requires a frozen-parent content mutation to remain blocked."""
        name, pin = next(iter(PARENT_PINS.items()))
        content = (PARENT_FIXTURE_ROOT / name).read_bytes().replace(b"FAIL", b"PASS", 1)
        result = self._validate({
            "schemaVersion": 1,
            "parentArtifact": {"name": name, "contentBase64": base64.b64encode(content).decode(), **pin},
        })
        self.assertEqual(result["decision"], "BLOCKED")
        self.assertIn("PARENT_ARTIFACT_HASH_DRIFT", result["reasons"])

    def test_valid_source_archives_replay_and_match_manifests(self) -> None:
        """Proves both valid archives contain replayable exact source bytes."""
        for branch, candidate in ENVELOPES["candidates"].items():
            with self.subTest(branch=branch):
                replay, manifest = self._archive(candidate)
                self.assertEqual(manifest["baselineHead"], BASELINE_HEAD)
                self.assertEqual(manifest["branch"], "master")
                self.assertIn("apps/accounts/app/api/admin/employees/route.ts", replay)
                self._validate(candidate)

    def test_review_b_accounts_route_denominator_is_source_anchored(self) -> None:
        """Recomputes all 17 Review B route anchors from frozen source bytes."""
        for branch, candidate in ENVELOPES["candidates"].items():
            with self.subTest(branch=branch):
                replay, _ = self._archive(candidate)
                routes = candidate["securityRoutes"]["routes"]
                actual = set()
                rationales: set[str] = set()
                self.assertEqual(candidate["securityRoutes"]["discoveredRouteCount"], len(routes))
                for route in routes:
                    method, route_path = route["name"].split(" ", 1)
                    actual.add((method, route_path, route["path"]))
                    lines = replay[route["path"]].splitlines(keepends=True)
                    range_bytes = b"".join(lines[route["lineStart"] - 1 : route["lineEnd"]])
                    self.assertEqual(route["sourceRangeSha256"], _sha(range_bytes))
                    self.assertEqual(route["fingerprint"], _sha(_canonicalize(route["declarationAnchor"])))
                    security = route["security"]
                    self.assertIsInstance(security, list)
                    self.assertEqual({evidence["category"] for evidence in security}, set(SECURITY_CATEGORIES))
                    self.assertEqual(len(security), len(SECURITY_CATEGORIES))
                    expected_dispositions = _expected_security_dispositions(route["name"])
                    expected_claims = _expected_security_claims(route["name"])
                    assertion_signatures = set()
                    for evidence in security:
                        self.assertEqual(set(evidence), {"anchor", "assertion", "category", "disposition", "evidenceKind", "rationale"})
                        self.assertIn(evidence["disposition"], SUPPORTED_DISPOSITIONS[evidence["category"]])
                        self.assertEqual(evidence["disposition"], expected_dispositions[evidence["category"]])
                        self.assertEqual(evidence["evidenceKind"], "reviewed-source-assertion")
                        self.assertGreater(len(evidence["rationale"]), 60)
                        self.assertFalse(evidence["rationale"].startswith(f"{evidence['category']}:"))
                        self.assertNotIn("is established by the reviewed", evidence["rationale"])
                        self.assertNotIn(evidence["rationale"], rationales)
                        rationales.add(evidence["rationale"])
                        self.assertEqual(evidence["anchor"]["category"], evidence["category"])
                        self.assertEqual(evidence["anchor"]["kind"], "SecuritySourceRange")
                        anchor_path = evidence["anchor"]["path"]
                        self.assertIn(anchor_path, replay)
                        anchor_lines = replay[anchor_path].splitlines(keepends=True)
                        anchor_bytes = b"".join(anchor_lines[
                            evidence["anchor"]["lineStart"] - 1 : evidence["anchor"]["lineEnd"]
                        ])
                        self.assertTrue(anchor_bytes)
                        self.assertEqual(evidence["anchor"]["sourceRangeSha256"], _sha(anchor_bytes))
                        assertion = evidence["assertion"]
                        self.assertEqual(set(assertion), {"claim", "forbiddenTokens", "requiredTokens", "rule"})
                        self.assertEqual(assertion["rule"], "all-required-and-no-forbidden-tokens-in-range")
                        self.assertIn(assertion["claim"], CLAIMS_BY_DISPOSITION[(evidence["category"], evidence["disposition"])])
                        self.assertEqual(assertion["claim"], expected_claims[evidence["category"]])
                        self.assertTrue(assertion["requiredTokens"])
                        required_constraints, forbidden_constraints = CLAIM_TOKEN_CONSTRAINTS[assertion["claim"]]
                        self.assertTrue(required_constraints <= set(assertion["requiredTokens"]))
                        self.assertTrue(forbidden_constraints <= set(assertion["forbiddenTokens"]))
                        decoded_range = anchor_bytes.decode("utf-8")
                        for token in assertion["requiredTokens"]:
                            self.assertIn(token, decoded_range)
                        for token in assertion["forbiddenTokens"]:
                            self.assertNotIn(token, decoded_range)
                        assertion_signatures.add((
                            assertion["claim"],
                            anchor_path,
                            evidence["anchor"]["lineStart"],
                            evidence["anchor"]["lineEnd"],
                            tuple(assertion["requiredTokens"]),
                            tuple(assertion["forbiddenTokens"]),
                        ))
                    self.assertEqual(len(assertion_signatures), len(SECURITY_CATEGORIES))
                self.assertEqual(actual, EXPECTED_ACCOUNTS_ROUTES)
                route_names = {route["name"] for route in routes}
                self.assertEqual(
                    {name for name in route_names if name not in AUTHENTICATED_ROUTE_NAMES},
                    {
                        "GET /api/health",
                        "GET /api/oidc/jwks",
                        "POST /api/oidc/token",
                        "GET /api/ready",
                        "POST /api/session/login",
                        "POST /api/session/logout",
                        "GET ",
                    },
                )
                self.assertEqual({
                    route["name"]
                    for route in routes
                    if {item["category"]: item["disposition"] for item in route["security"]}["scope"] == "global"
                }, route_names)
                self._validate(candidate)

    def test_security_disposition_counterexamples_are_blocked(self) -> None:
        """Rejects incomplete, duplicated, unsupported, and semantically false entries."""
        self.assertTrue(REQUIRED_SECURITY_ADVERSARIES <= {
            fixture["id"] for fixture in INVALID["securityDispositions"]
        })
        for fixture in INVALID["securityDispositions"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_typescript_minus_graph_denominator_is_derived_from_snapshot(self) -> None:
        """Derives clean and 26-file compensation sets from frozen archive bytes."""
        for branch, candidate in ENVELOPES["candidates"].items():
            with self.subTest(branch=branch):
                replay, _ = self._archive(candidate)
                candidate_ts = {path for path in replay if path.endswith((".ts", ".tsx", ".mts", ".cts"))}
                graph = _load_json(self._assert_ref(candidate["graph"]))
                graph_files = {row["path"] for row in graph["fileRows"]}
                self.assertEqual(set(candidate["exclusions"]["candidateTypeScript"]), candidate_ts)
                self.assertEqual(set(candidate["exclusions"]["graphFiles"]), graph_files)
                expected = candidate_ts - graph_files
                ledger = {row["path"]: row for row in candidate["exclusions"]["ledger"]}
                self.assertEqual(set(ledger), expected)
                for path, row in ledger.items():
                    self.assertEqual(row["sha256"], _sha(replay[path]))
                    self.assertTrue(row["package"] and row["tsconfigExclusion"] and row["class"] and row["disposition"])
                self.assertEqual(expected, EXPECTED_EXCLUSIONS if branch == "compensation" else set())
                self._validate(candidate)

    def test_graph_rows_recompute_against_frozen_snapshot_bytes(self) -> None:
        """Binds every graph row to a same-path source archive digest."""
        for branch, candidate in ENVELOPES["candidates"].items():
            with self.subTest(branch=branch):
                replay, _ = self._archive(candidate)
                graph = _load_json(self._assert_ref(candidate["graph"]))
                self.assertIsNone(graph["commitSha"])
                for row in graph["fileRows"]:
                    self.assertIn(row["path"], replay)
                    self.assertEqual(row["sourceSha256"], _sha(replay[row["path"]]))
                self._validate(candidate)

    def test_command_records_bind_stdout_stderr_exit_hash_and_snapshot(self) -> None:
        """Recomputes all eight complete command records for both branches."""
        for branch, candidate in ENVELOPES["candidates"].items():
            with self.subTest(branch=branch):
                artifact = _load_json(self._assert_ref(candidate["requiredCommands"]["artifact"]))
                records = {row["name"]: row for row in artifact["records"]}
                self.assertEqual(candidate["requiredCommands"]["requiredNames"], list(EXPECTED_COMMANDS))
                self.assertEqual(set(records), set(EXPECTED_COMMANDS))
                for name, command in EXPECTED_COMMANDS.items():
                    row = records[name]
                    self.assertEqual((row["command"], row["exitCode"], row["status"]), (command, 0, "PASS"))
                    self.assertEqual(row["stdoutSha256"], _sha(row["stdout"].encode()))
                    self.assertEqual(row["stderrSha256"], _sha(row["stderr"].encode()))
                    self.assertEqual(row["snapshotManifestSha256"], candidate["sourceSnapshot"]["manifest"]["sha256"])
                    body = {key: value for key, value in row.items() if key != "recordSha256"}
                    self.assertEqual(row["recordSha256"], _sha(_canonicalize(body)))
                self._validate(candidate)

    def test_distinct_candidate_producer_reviewer_and_recomputed_ledgers(self) -> None:
        """Proves non-circular candidate/producer/reviewer lineage and both gate hashes."""
        for branch, candidate in ENVELOPES["candidates"].items():
            with self.subTest(branch=branch):
                lineage = candidate["lineage"]
                self.assertEqual(len({ref["path"] for ref in lineage.values()}), 4)
                core = copy.deepcopy(candidate)
                del core["lineage"]
                candidate_sha = _sha(_canonicalize(core))
                manifest = _load_json(self._assert_ref(lineage["candidateManifest"]))
                producer = _load_json(self._assert_ref(lineage["producerReceipt"]))
                ledger = _load_json(self._assert_ref(lineage["recomputedArtifactLedger"]))
                reviewer = _load_json(self._assert_ref(lineage["reviewerReceipt"]))
                self.assertEqual(manifest["candidateSha256"], candidate_sha)
                self.assertEqual(producer["candidateSha256"], candidate_sha)
                self.assertEqual(reviewer["candidateSha256"], candidate_sha)
                self.assertEqual(producer["candidateManifest"], lineage["candidateManifest"])
                self.assertEqual(reviewer["candidateManifest"], lineage["candidateManifest"])
                self.assertEqual(reviewer["producerReceipt"], lineage["producerReceipt"])
                self.assertEqual(reviewer["recomputedArtifactLedger"], lineage["recomputedArtifactLedger"])
                self.assertNotEqual(producer["identity"], reviewer["identity"])
                self.assertEqual((producer["role"], reviewer["role"], reviewer["decision"]), ("producer", "independent-reviewer", "ACCEPT"))
                expected_refs = manifest["artifacts"] + [lineage["candidateManifest"], lineage["producerReceipt"]]
                self.assertEqual(ledger["artifacts"], expected_refs)
                for reference in ledger["artifacts"]:
                    self._assert_ref(reference)
                gates = ledger["successorGates"]
                self.assertEqual({gate["name"] for gate in gates}, EXPECTED_SUCCESSOR_GATES)
                for gate in gates:
                    body = {key: value for key, value in gate.items() if key != "recordSha256"}
                    self.assertEqual(gate["recordSha256"], _sha(_canonicalize(body)))
                    self.assertEqual(gate["state"], "BLOCKED_UNTIL_HASH_BOUND_HANDOFF")
                self._validate(candidate)

    def test_clean_candidate_is_accepted(self) -> None:
        """Requires the internally consistent clean branch to be accepted."""
        self._assert_accepted("clean")

    def test_tool_limitation_compensation_candidate_is_accepted(self) -> None:
        """Requires the issue-recorded tool-limitation branch to be accepted."""
        candidate = ENVELOPES["candidates"]["compensation"]
        self.assertTrue(candidate["compensation"]["toolLimitation"])
        self.assertTrue(candidate["upstreamIssue"]["required"])
        self.assertIsNotNone(candidate["upstreamIssue"]["issue"])
        self._assert_accepted("compensation")

    def test_source_snapshot_failures_are_blocked(self) -> None:
        """Rejects archive, manifest, mutable-path, and scan-drift counterexamples."""
        for fixture in INVALID["sourceSnapshot"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_graph_reconciliation_failures_are_blocked(self) -> None:
        """Rejects graph artifact and source-row mismatches."""
        for fixture in INVALID["graphReconciliation"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_complete_clean_compensation_and_project_owned_branch_matrix(self) -> None:
        """Rejects all invalid cross-branch and unknown audit states."""
        for fixture in INVALID["auditBranches"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_route_exclusion_and_command_ledgers_are_fail_closed(self) -> None:
        """Rejects omissions, source-hash drift, and unknown command state."""
        for fixture in INVALID["compensationLedgers"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_acceptance_identity_hash_issue_and_unknown_states_are_fail_closed(self) -> None:
        """Rejects issue, reviewer, severity, schema, worktree, and hash failures."""
        for fixture in INVALID["acceptance"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_anti_pattern_corpus_is_fail_closed(self) -> None:
        """Exercises A3, A4, A5, A7, A15, and A16 directly."""
        for fixture in INVALID["antiPatterns"]:
            with self.subTest(fixture=fixture["id"]):
                self._assert_blocked(fixture)

    def test_malformed_external_values_are_total_and_fail_closed(self) -> None:
        """Rejects malformed nested values and every missing lineage reference."""
        clean = ENVELOPES["candidates"]["clean"]
        cases: list[tuple[str, Any, str]] = []
        for key in (
            "candidateManifest",
            "producerReceipt",
            "reviewerReceipt",
            "recomputedArtifactLedger",
        ):
            candidate = copy.deepcopy(clean)
            del candidate["lineage"][key]
            cases.append((f"missing-lineage-{key}", candidate, "LINEAGE_KEYS_INVALID"))
        malformed = copy.deepcopy(clean)
        malformed["worktree"]["worktreeCount"] = "one"
        cases.append(("malformed-worktree-count", malformed, "WORKTREE_SCHEMA_INVALID"))
        nested_unknown = copy.deepcopy(clean)
        nested_unknown["audit"]["unknown"] = True
        cases.append(("nested-unknown-audit-field", nested_unknown, "AUDIT_SCHEMA_INVALID"))
        unhashable_tokens = copy.deepcopy(clean)
        unhashable_tokens["securityRoutes"]["routes"][0]["security"][0]["assertion"]["requiredTokens"] = [{}]
        cases.append(("malformed-security-tokens", unhashable_tokens, "SECURITY_ASSERTION_INVALID"))
        for name, candidate, reason in cases:
            with self.subTest(case=name):
                self._assert_reason(self._validate(candidate), reason)

        temporary, root = self._with_fixture_copy()
        with temporary:
            candidate = copy.deepcopy(clean)
            archive_ref = candidate["sourceSnapshot"]["archive"]
            candidate["sourceSnapshot"]["archive"] = self._rewrite_artifact(
                root,
                archive_ref,
                lambda value: value["entries"].__setitem__(0, None),
            )
            self._assert_reason(
                self._validate_at(candidate, root),
                "ARCHIVE_ENTRY_SCHEMA_INVALID",
            )

    def test_archive_paths_are_canonical_repository_relative_and_unique(self) -> None:
        """Rejects absolute, traversal, alias, backslash, and normalized duplicates."""
        for malicious_path in (
            "/absolute.ts",
            "../escape.ts",
            "a/../same.ts",
            "a\\same.ts",
            "./same.ts",
        ):
            with self.subTest(path=malicious_path):
                temporary, root = self._with_fixture_copy()
                with temporary:
                    candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
                    archive_ref = candidate["sourceSnapshot"]["archive"]

                    def mutate(value: dict[str, Any]) -> None:
                        value["entries"][0]["path"] = malicious_path

                    candidate["sourceSnapshot"]["archive"] = self._rewrite_artifact(
                        root, archive_ref, mutate
                    )
                    self._assert_reason(
                        self._validate_at(candidate, root),
                        "ARCHIVE_PATH_INVALID",
                    )

        temporary, root = self._with_fixture_copy()
        with temporary:
            candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
            archive_ref = candidate["sourceSnapshot"]["archive"]

            def duplicate(value: dict[str, Any]) -> None:
                value["entries"][1]["path"] = value["entries"][0]["path"]

            candidate["sourceSnapshot"]["archive"] = self._rewrite_artifact(
                root, archive_ref, duplicate
            )
            self._assert_reason(
                self._validate_at(candidate, root),
                "ARCHIVE_DUPLICATE_PATH",
            )

    def test_source_provenance_and_archive_manifest_replay_are_mandatory(self) -> None:
        """Rejects omitted provenance, metadata mismatch, and truncated denominators."""
        required_paths = {
            "pnpm-lock.yaml",
            "packages/config/package.json",
            "packages/config/tsconfig/base.json",
            "apps/accounts/tsconfig.test.json",
            "packages/backend/tsconfig.test.json",
        }
        for branch, candidate in ENVELOPES["candidates"].items():
            replay, manifest = self._archive(candidate)
            self.assertTrue(required_paths <= set(replay), branch)
            self.assertEqual(set(manifest["discovery"]["configPaths"]), {
                path for path in replay if not path.endswith((".ts", ".tsx", ".mts", ".cts"))
            })
            self.assertEqual(candidate["sourceSnapshot"]["baselineHead"], manifest["baselineHead"])
            self.assertEqual(candidate["sourceSnapshot"]["branch"], manifest["branch"])

        missing = copy.deepcopy(ENVELOPES["candidates"]["clean"])
        del missing["sourceSnapshot"]["toolVersion"]
        self._assert_reason(self._validate(missing), "SOURCE_SNAPSHOT_SCHEMA_INVALID")

        temporary, root = self._with_fixture_copy()
        with temporary:
            candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
            manifest_ref = candidate["sourceSnapshot"]["manifest"]
            candidate["sourceSnapshot"]["manifest"] = self._rewrite_artifact(
                root,
                manifest_ref,
                lambda value: value["entries"][0].__setitem__("mode", "100755"),
            )
            self._assert_reason(
                self._validate_at(candidate, root),
                "ARCHIVE_MANIFEST_INVENTORY_MISMATCH",
            )

        temporary, root = self._with_fixture_copy()
        with temporary:
            candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
            archive_ref = candidate["sourceSnapshot"]["archive"]

            def truncate_archive(value: dict[str, Any]) -> None:
                value["entries"] = [
                    entry for entry in value["entries"]
                    if entry["path"] != "pnpm-lock.yaml"
                ]

            candidate["sourceSnapshot"]["archive"] = self._rewrite_artifact(
                root, archive_ref, truncate_archive
            )
            archive = _load_json(root / archive_ref["path"])
            metadata = [
                {key: entry[key] for key in ("path", "sha256", "size", "mode", "state")}
                for entry in archive["entries"]
            ]
            denominator = _sha(_canonicalize(metadata))
            manifest_ref = candidate["sourceSnapshot"]["manifest"]

            def truncate_manifest(value: dict[str, Any]) -> None:
                value["entries"] = metadata
                value["denominatorSha256"] = denominator
                value["discovery"]["sourcePathCount"] = len(metadata)
                value["discovery"]["sourcePathsSha256"] = _sha(
                    _canonicalize([entry["path"] for entry in metadata])
                )

            candidate["sourceSnapshot"]["manifest"] = self._rewrite_artifact(
                root, manifest_ref, truncate_manifest
            )
            for phase in ("preScan", "postScan"):
                candidate["sourceSnapshot"][phase]["denominatorSha256"] = denominator
            self._assert_reason(
                self._validate_at(candidate, root),
                "SOURCE_DENOMINATOR_INCOMPLETE",
            )

    def test_graph_metadata_and_exact_file_inventory_are_mandatory(self) -> None:
        """Rejects absent graph provenance and graph/declaration inventory drift."""
        temporary, root = self._with_fixture_copy()
        with temporary:
            candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
            graph_ref = candidate["graph"]
            candidate["graph"] = self._rewrite_artifact(
                root,
                graph_ref,
                lambda value: value.pop("toolVersion"),
            )
            self._assert_reason(
                self._validate_at(candidate, root),
                "GRAPH_SCHEMA_INVALID",
            )

        candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
        del candidate["exclusions"]["graphFiles"][0]
        self._assert_reason(
            self._validate(candidate),
            "GRAPH_FILE_INVENTORY_MISMATCH",
        )

    def test_compensation_requires_exact_complete_reconciliation(self) -> None:
        """Rejects omitted, partial, duplicate, miscounted, and unhashed ledgers."""
        mutations = (
            ("omit-routes", lambda value: value["compensation"].pop("routeReconciliation"), "ROUTE_RECONCILIATION_MISSING"),
            ("partial-routes", lambda value: value["compensation"]["routeReconciliation"].pop(), "ROUTE_RECONCILIATION_INCOMPLETE"),
            ("duplicate-route", lambda value: value["compensation"]["routeReconciliation"].append(copy.deepcopy(value["compensation"]["routeReconciliation"][0])), "ROUTE_RECONCILIATION_DUPLICATE"),
            ("partial-fields", lambda value: value["compensation"]["fieldReconciliation"].pop(), "FIELD_RECONCILIATION_INCOMPLETE"),
            ("duplicate-field", lambda value: value["compensation"]["fieldReconciliation"].append(copy.deepcopy(value["compensation"]["fieldReconciliation"][0])), "FIELD_RECONCILIATION_DUPLICATE"),
            ("route-count", lambda value: value["compensation"].__setitem__("routeCount", 999), "COMPENSATION_ROUTE_COUNT_MISMATCH"),
            ("field-count", lambda value: value["compensation"].__setitem__("fieldCount", 999), "COMPENSATION_FIELD_COUNT_MISMATCH"),
            ("inventory-hash", lambda value: value["compensation"].pop("firstInventorySha256"), "COMPENSATION_SCHEMA_INVALID"),
        )
        for name, mutate, reason in mutations:
            with self.subTest(case=name):
                candidate = copy.deepcopy(ENVELOPES["candidates"]["compensation"])
                mutate(candidate)
                self._assert_reason(self._validate(candidate), reason)

    def test_parent_trust_roots_and_exact_receipt_artifact_set_are_required(self) -> None:
        """Rejects parent-disconnected and self-selected artifact inventories."""
        clean = ENVELOPES["candidates"]["clean"]
        self.assertIn("parentEvidence", clean)
        missing_parent = copy.deepcopy(clean)
        del missing_parent["parentEvidence"]
        self._assert_reason(
            self._validate(missing_parent),
            "PARENT_EVIDENCE_MISSING",
        )
        drifted_parent = copy.deepcopy(clean)
        drifted_parent["parentEvidence"]["sha256"] = "0" * 64
        self._assert_reason(
            self._validate(drifted_parent),
            "PARENT_MANIFEST_TRUST_ROOT_MISMATCH",
        )

        temporary, root = self._with_fixture_copy()
        with temporary:
            candidate = copy.deepcopy(clean)
            manifest_ref = candidate["lineage"]["candidateManifest"]

            def omit_artifact(value: dict[str, Any]) -> None:
                value["artifacts"].pop(0)

            candidate["lineage"]["candidateManifest"] = self._rewrite_artifact(
                root, manifest_ref, omit_artifact
            )
            self._assert_reason(
                self._validate_at(candidate, root),
                "CANDIDATE_MANIFEST_ARTIFACTS_MISMATCH",
            )

    def test_reviewer_reject_or_critical_high_finding_blocks_acceptance(self) -> None:
        """Requires a FINAL ACCEPT decision with no Critical or High findings."""
        cases = (
            ("reject", lambda value: value.__setitem__("decision", "REJECT"), "REVIEW_DECISION_NOT_ACCEPT"),
            ("high", lambda value: value["findings"].append({"id": "H1", "severity": "High", "summary": "adversarial finding"}), "REVIEW_CRITICAL_HIGH_FINDING"),
            ("not-final", lambda value: value.__setitem__("state", "DRAFT"), "REVIEW_STATE_NOT_FINAL"),
        )
        for name, mutate, reason in cases:
            with self.subTest(case=name):
                temporary, root = self._with_fixture_copy()
                with temporary:
                    candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
                    reviewer_ref = candidate["lineage"]["reviewerReceipt"]
                    candidate["lineage"]["reviewerReceipt"] = self._rewrite_artifact(
                        root, reviewer_ref, mutate
                    )
                    self._assert_reason(
                        self._validate_at(candidate, root),
                        reason,
                    )

    def test_security_evidence_is_route_and_category_specific(self) -> None:
        """Rejects disposition downgrade and cross-route evidence substitution."""
        candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
        admin = candidate["securityRoutes"]["routes"][0]
        health = candidate["securityRoutes"]["routes"][7]
        authorization = admin["security"][1]
        authorization["disposition"] = "public"
        authorization["assertion"] = copy.deepcopy(health["security"][1]["assertion"])
        authorization["anchor"] = copy.deepcopy(health["security"][1]["anchor"])
        self._assert_reason(
            self._validate(candidate),
            "SECURITY_ROUTE_EXPECTATION_MISMATCH",
        )

    def test_tool_limitation_requires_immutable_upstream_issue_receipt(self) -> None:
        """Rejects suppressing the issue required by tool-limitation compensation."""
        candidate = copy.deepcopy(ENVELOPES["candidates"]["compensation"])
        candidate["upstreamIssue"] = {
            "decisionReason": "verified-repo-graph-tool-limitation",
            "issue": None,
            "required": False,
            "state": "NOT_REQUIRED",
        }
        self._assert_reason(
            self._validate(candidate),
            "UPSTREAM_ISSUE_REQUIRED_FOR_TOOL_LIMITATION",
        )

    def test_command_artifact_schema_and_record_set_are_exact(self) -> None:
        """Rejects unknown command fields and duplicate/missing exact command records."""
        cases = (
            (
                "unknown-field",
                lambda value: value["records"][0].__setitem__("unknown", True),
                "COMMAND_RECORD_SCHEMA_INVALID",
            ),
            (
                "duplicate-record",
                lambda value: value["records"].__setitem__(1, copy.deepcopy(value["records"][0])),
                "COMMAND_RECORD_SET_MISMATCH",
            ),
        )
        for name, mutate, reason in cases:
            with self.subTest(case=name):
                temporary, root = self._with_fixture_copy()
                with temporary:
                    candidate = copy.deepcopy(ENVELOPES["candidates"]["clean"])
                    command_ref = candidate["requiredCommands"]["artifact"]
                    candidate["requiredCommands"]["artifact"] = self._rewrite_artifact(
                        root, command_ref, mutate
                    )
                    self._assert_reason(
                        self._validate_at(candidate, root),
                        reason,
                    )

    def test_a8_plan_uses_only_allowed_task_markers(self) -> None:
        """Proves the active plan uses only the unambiguous marker vocabulary."""
        markers = re.findall(r"^- \[(.)\] ", PLAN_PATH.read_text(), flags=re.MULTILINE)
        self.assertTrue(markers)
        self.assertFalse([marker for marker in markers if marker not in {"~", "x", "b"}])
        self._validate(ENVELOPES["candidates"]["clean"])


if __name__ == "__main__":
    unittest.main()
