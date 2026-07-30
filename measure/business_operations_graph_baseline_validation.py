"""Fail-closed candidate validator for the business-operations graph baseline remediation.

Phase R0 contract module. Replays the frozen fixture set under ``fixtures/v1``,
verifies every contract documented in the track spec/plan, and rejects any
candidate whose source-snapshot, graph, audit, security-route, exclusion,
command, upstream-issue, lineage, worktree, schema, or parent-evidence
contents diverge from the immutable frozen artifacts. Acceptance (``ACCEPT``)
requires every gate to pass; otherwise the decision is ``BLOCKED`` and the
returned ``reasons`` enumerate every failure code so independent review can
reproduce the verdict deterministically.

The v1 public contract is intentionally bound to the frozen baseline constants
in this module. Callers must provide a trusted local ``fixtures/v1``-style
directory containing the hash-pinned artifacts referenced by the candidate;
the validator does not discover or regenerate fixture contents. Later fixture
generations require a new contract version and trust roots.
"""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
from typing import Any


CANDIDATE_SCHEMA_VERSION = 1
EXPECTED_BASELINE_HEAD = "3ff9b734a9e5a69f777108827b569e4f20a5ceb8"
EXPECTED_REPO_ROOT = "/home/daniel-bo/Desktop/reading-advantage-monorepo"

VALID_DECISIONS = {"ACCEPT", "BLOCKED"}

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
EXPECTED_SUCCESSOR_GATES = {
    "small_company_admin_privileges_20260722:Phase-S1",
    "customer_licensing_crm_20260722:contract-schema-red",
}
VALID_FINDING_SEVERITIES = {"Critical", "High", "Medium", "Low", "Info"}
EXPECTED_PARENT_PIN_KINDS = {"independent-review-fail", "producer-evidence-fail", "mid-red-rereview-fail"}
EXPECTED_CONFIG_PATHS = {
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "apps/accounts/package.json",
    "apps/accounts/tsconfig.json",
    "apps/accounts/tsconfig.test.json",
    "apps/advantage-games/package.json",
    "apps/advantage-games/tsconfig.json",
    "packages/advantage-play-kit/package.json",
    "packages/advantage-play-kit/tsconfig.json",
    "packages/backend/package.json",
    "packages/backend/tsconfig.json",
    "packages/backend/tsconfig.test.json",
    "packages/config/package.json",
    "packages/config/tsconfig/base.json",
}
EXPECTED_SOURCE_PATHS = {
    *(path for _, _, path in EXPECTED_ACCOUNTS_ROUTES),
    *EXPECTED_EXCLUSIONS,
    *EXPECTED_CONFIG_PATHS,
    "apps/accounts/app/layout.tsx",
    "packages/backend/src/modules/company-identity/capabilities.ts",
}
PARENT_MANIFEST_PIN = {
    "path": "parent-fail-artifacts-v1/manifest.json",
    "sha256": "15f3c61fbcea4ea13c777e4f80ff061de2fa007985ef38b77dd560b1c8c77d50",
    "size": 2209,
}
PARENT_ARTIFACT_PINS = {
    "phase0-review-b-safety-20260730.json": {
        "path": "parent-fail-artifacts-v1/phase0-review-b-safety-20260730.json",
        "sha256": "5bfe10b18aaf650687a337f02a64dab35de378ef8ba333e4946af6e80143fc9f",
        "size": 9256,
        "kind": "independent-review-fail",
    },
    "phase0-graph-baseline-producer-evidence-20260722.md": {
        "path": "parent-fail-artifacts-v1/phase0-graph-baseline-producer-evidence-20260722.md",
        "sha256": "6d3613787361d0747d6ed9f590583257d92ac15f6717fbd58d9a1bcc006181db",
        "size": 7206,
        "kind": "producer-evidence-fail",
    },
    "red-rereview-correctness-20260730.json": {
        "path": "parent-fail-artifacts-v1/red-rereview-correctness-20260730.json",
        "sha256": "e64fdbd2f67145a18c8e0d821b39629ec750cb71eae78acde357d245ddf19d73",
        "size": 8665,
        "kind": "mid-red-rereview-fail",
    },
}


def _canonicalize(value: Any) -> bytes:
    """Returns the canonical JSON bytes used by every frozen digest."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha(data: bytes) -> str:
    """Returns the lowercase SHA-256 hex digest of bytes."""
    return hashlib.sha256(data).hexdigest()


def _file_identity(path: Path) -> tuple[str, int]:
    """Returns the SHA-256 hex digest and byte size of one file."""
    data = path.read_bytes()
    return _sha(data), len(data)


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON fixture."""
    return json.loads(path.read_text(encoding="utf-8"))


def _expected_security_dispositions(route_name: str) -> dict[str, str]:
    """Returns the expected per-category disposition for one frozen route."""
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


def _expected_security_anchor_path(
    route_name: str,
    route_path: str,
    category: str,
) -> str:
    """Returns the only source path permitted for a route/category assertion."""
    if route_name in PERMISSION_CHECKED_ROUTE_NAMES and category in {
        "authorization", "validation", "scope", "audit"
    }:
        return "packages/backend/src/modules/company-identity/capabilities.ts"
    return route_path


def _resolve(parent: Any, path: str) -> Any:
    """Resolves a dot-delimited path through nested dicts and lists."""
    target = parent
    for segment in path.split("."):
        target = target[int(segment)] if isinstance(target, list) else target[segment]
    return target


def _is_int(value: Any) -> bool:
    """Reports whether a JSON value is an integer but not a boolean."""
    return isinstance(value, int) and not isinstance(value, bool)


def _is_sha256(value: Any) -> bool:
    """Reports whether a value is a lowercase SHA-256 hexadecimal digest."""
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def _strict_keys(
    value: Any,
    required: set[str],
    reason: str,
    reasons: list[str],
    *,
    optional: set[str] | None = None,
) -> bool:
    """Requires an object to contain exactly its declared required/optional keys."""
    if not isinstance(value, dict):
        reasons.append(reason)
        return False
    keys = set(value)
    if not required <= keys or not keys <= required | (optional or set()):
        reasons.append(reason)
        return False
    return True


def _normalize_repo_path(value: Any) -> str:
    """Returns one canonical repository-relative POSIX path or raises."""
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        raise MutablePathError("path must be a non-empty canonical POSIX string")
    path = PurePosixPath(value)
    parts = path.parts
    if path.is_absolute() or not parts or any(part in {"", ".", ".."} for part in parts):
        raise MutablePathError(f"path is not repository-relative: {value!r}")
    if ":" in parts[0] or path.as_posix() != value:
        raise MutablePathError(f"path is not canonical: {value!r}")
    return value


def _string_list(value: Any, *, allow_empty: bool = True) -> bool:
    """Reports whether a value is a duplicate-free list of strings."""
    return (
        isinstance(value, list)
        and (allow_empty or bool(value))
        and all(isinstance(item, str) for item in value)
        and len(value) == len(set(value))
    )


class MutablePathError(ValueError):
    """Raised when an evidence reference targets an unsafe path."""


def _validate_ref(ref: Any) -> Path:
    """Validates one immutable artifact reference and returns its safe path."""
    if not isinstance(ref, dict):
        raise MutablePathError("evidence reference must be a dict")
    if set(ref) != {"path", "sha256", "size"}:
        raise MutablePathError("evidence reference must contain only path, sha256, size")
    path = _normalize_repo_path(ref["path"])
    sha = ref["sha256"]
    size = ref["size"]
    if not _is_sha256(sha):
        raise MutablePathError(f"evidence reference sha256 must be a 64-char hex string: {sha!r}")
    if not _is_int(size) or size < 0:
        raise MutablePathError(f"evidence reference size must be a non-negative integer: {size!r}")
    return Path(path)


def _load_artifact(ref: Any, fixture_root: Path) -> tuple[dict[str, Any], bytes]:
    """Loads one artifact after validating its reference and content digest."""
    relative = _validate_ref(ref)
    path = fixture_root / relative
    if not path.exists():
        raise FileNotFoundError(f"artifact does not exist: {path}")
    data = path.read_bytes()
    actual_sha, actual_size = _sha(data), len(data)
    if actual_sha != ref["sha256"] or actual_size != ref["size"]:
        raise ValueError(
            f"artifact digest/size mismatch for {relative}: "
            f"expected {ref['sha256']}/{ref['size']} got {actual_sha}/{actual_size}"
        )
    return json.loads(data.decode("utf-8")), data


def _replay_archive(ref: Any, fixture_root: Path) -> tuple[dict[str, Any], dict[str, bytes]]:
    """Loads one source archive and decodes its base64 entries."""
    archive, _ = _load_artifact(ref, fixture_root)
    if set(archive) != {"archiveKind", "encoding", "entries", "schemaVersion"}:
        raise ValueError("archive schema invalid")
    if archive.get("archiveKind") != "source-snapshot" or archive.get("encoding") != "base64-per-entry" or archive.get("schemaVersion") != 1:
        raise ValueError("archive schema invalid")
    entries = archive.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("archive entries must be a non-empty list")
    replay: dict[str, bytes] = {}
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {
            "contentBase64", "mode", "path", "sha256", "size", "state"
        }:
            raise TypeError("archive entry schema invalid")
        try:
            path = _normalize_repo_path(entry.get("path"))
        except MutablePathError as error:
            raise MutablePathError("archive path invalid") from error
        if path in replay:
            raise ValueError(f"duplicate archive entry path: {path}")
        if entry.get("mode") not in {"100644", "100755"} or entry.get("state") not in {"tracked", "untracked"}:
            raise TypeError("archive entry schema invalid")
        if not isinstance(entry.get("contentBase64"), str) or not _is_sha256(entry.get("sha256")) or not _is_int(entry.get("size")):
            raise TypeError("archive entry schema invalid")
        content = base64.b64decode(entry["contentBase64"], validate=True)
        actual_sha, actual_size = _sha(content), len(content)
        if actual_sha != entry["sha256"] or actual_size != entry["size"]:
            raise ValueError(
                f"archive entry digest/size mismatch for {path}: "
                f"expected {entry['sha256']}/{entry['size']} got {actual_sha}/{actual_size}"
            )
        replay[path] = content
    return archive, replay


def _validate_envelope_shapes(candidate: dict[str, Any], reasons: list[str]) -> bool:
    """Validates every candidate-owned nested envelope before dereferencing it."""
    valid = True
    if "parentEvidence" not in candidate:
        reasons.append("PARENT_EVIDENCE_MISSING")
    if not _strict_keys(
        candidate,
        {
            "audit", "candidateId", "compensation", "exclusions", "graph",
            "lineage", "parentEvidence", "requiredCommands", "schemaVersion",
            "securityRoutes", "sourceSnapshot", "upstreamIssue", "worktree",
        },
        "CANDIDATE_SCHEMA_INVALID",
        reasons,
    ):
        valid = False

    if not _strict_keys(
        candidate.get("worktree"),
        {"baselineHead", "branch", "root", "singleSharedWorktree", "state", "worktreeCount"},
        "WORKTREE_SCHEMA_INVALID",
        reasons,
    ):
        worktree_value = candidate.get("worktree")
        if isinstance(worktree_value, dict) and "singleSharedWorktree" not in worktree_value:
            reasons.append("WORKTREE_SINGLE_SHARED_FLAG_MISSING")
        valid = False
    else:
        worktree = candidate["worktree"]
        if (
            not isinstance(worktree["baselineHead"], str)
            or not isinstance(worktree["branch"], str)
            or not isinstance(worktree["root"], str)
            or not isinstance(worktree["singleSharedWorktree"], bool)
            or not isinstance(worktree["state"], str)
            or not _is_int(worktree["worktreeCount"])
        ):
            reasons.append("WORKTREE_SCHEMA_INVALID")
            valid = False

    if not _strict_keys(
        candidate.get("sourceSnapshot"),
        {
            "archive", "baselineHead", "branch", "manifest", "postScan",
            "preScan", "scanCommand", "scanConfig", "toolVersion",
        },
        "SOURCE_SNAPSHOT_SCHEMA_INVALID",
        reasons,
    ):
        snapshot_value = candidate.get("sourceSnapshot")
        if isinstance(snapshot_value, dict) and "manifest" not in snapshot_value:
            reasons.append("SOURCE_MANIFEST_MISSING")
        valid = False
    else:
        snapshot = candidate["sourceSnapshot"]
        for phase in ("preScan", "postScan"):
            if not _strict_keys(
                snapshot.get(phase),
                {
                    "denominatorSha256", "porcelainSha256", "stagedDiffSha256",
                    "stateArtifact", "statusSha256",
                },
                "SOURCE_SNAPSHOT_SCHEMA_INVALID",
                reasons,
            ):
                valid = False
        if (
            not isinstance(snapshot["baselineHead"], str)
            or not isinstance(snapshot["branch"], str)
            or snapshot["scanConfig"] is not None
            or not isinstance(snapshot["scanCommand"], str)
            or not isinstance(snapshot["toolVersion"], str)
        ):
            reasons.append("SOURCE_SNAPSHOT_SCHEMA_INVALID")
            valid = False

    if not _strict_keys(
        candidate.get("audit"),
        {
            "disposition", "duplicate", "exitCode", "missing", "orphan",
            "stale", "state", "unauditedFields", "unauditedRoutes",
        },
        "AUDIT_SCHEMA_INVALID",
        reasons,
    ):
        valid = False
    else:
        audit = candidate["audit"]
        if not _is_int(audit["exitCode"]) or any(
            not isinstance(audit[name], list)
            for name in ("duplicate", "missing", "orphan", "stale", "unauditedFields", "unauditedRoutes")
        ):
            reasons.append("AUDIT_SCHEMA_INVALID")
            valid = False

    compensation = candidate.get("compensation")
    if compensation is not None:
        if not _strict_keys(
            compensation,
            {
                "fieldCount", "fieldReconciliation", "firstInventorySha256",
                "limitation", "routeCount", "routeReconciliation",
                "secondInventorySha256", "toolLimitation",
            },
            "COMPENSATION_SCHEMA_INVALID",
            reasons,
        ):
            if isinstance(compensation, dict) and "routeReconciliation" not in compensation:
                reasons.append("ROUTE_RECONCILIATION_MISSING")
            if isinstance(compensation, dict) and "fieldReconciliation" not in compensation:
                reasons.append("FIELD_RECONCILIATION_MISSING")
            valid = False
        elif (
            not _is_int(compensation["fieldCount"])
            or not _is_int(compensation["routeCount"])
            or not isinstance(compensation["fieldReconciliation"], list)
            or not isinstance(compensation["routeReconciliation"], list)
            or not _is_sha256(compensation["firstInventorySha256"])
            or not _is_sha256(compensation["secondInventorySha256"])
            or not isinstance(compensation["limitation"], str)
            or not isinstance(compensation["toolLimitation"], bool)
        ):
            reasons.append("COMPENSATION_SCHEMA_INVALID")
            valid = False
        if isinstance(compensation, dict):
            for entry in compensation.get("routeReconciliation", []):
                if isinstance(entry, dict) and "declarationAnchor" not in entry:
                    reasons.append("DECLARATION_ANCHOR_MISSING")

    if not _strict_keys(
        candidate.get("exclusions"),
        {"candidateTypeScript", "graphFiles", "ledger"},
        "EXCLUSIONS_SHAPE_INVALID",
        reasons,
    ):
        valid = False
    else:
        exclusions = candidate["exclusions"]
        if (
            not _string_list(exclusions["candidateTypeScript"])
            or not _string_list(exclusions["graphFiles"])
            or not isinstance(exclusions["ledger"], list)
        ):
            reasons.append("EXCLUSIONS_SHAPE_INVALID")
            valid = False

    if not _strict_keys(
        candidate.get("requiredCommands"),
        {"artifact", "requiredNames"},
        "REQUIRED_COMMANDS_SCHEMA_INVALID",
        reasons,
    ):
        valid = False
    elif not _string_list(candidate["requiredCommands"]["requiredNames"], allow_empty=False):
        reasons.append("REQUIRED_COMMANDS_SCHEMA_INVALID")
        valid = False

    if not _strict_keys(
        candidate.get("securityRoutes"),
        {"denominatorSource", "discoveredRouteCount", "knownAccountsRouteMinimum", "routes"},
        "SECURITY_ROUTES_SCHEMA_INVALID",
        reasons,
    ):
        valid = False
    else:
        security_routes = candidate["securityRoutes"]
        if (
            not _is_int(security_routes["discoveredRouteCount"])
            or not _is_int(security_routes["knownAccountsRouteMinimum"])
            or not isinstance(security_routes["denominatorSource"], str)
            or not isinstance(security_routes["routes"], list)
        ):
            reasons.append("SECURITY_ROUTES_SCHEMA_INVALID")
            valid = False
        for route in security_routes.get("routes", []):
            if not _strict_keys(
                route,
                {
                    "declarationAnchor", "fingerprint", "id", "lineEnd", "lineStart",
                    "name", "path", "security", "sourceRangeSha256",
                },
                "SECURITY_ROUTE_INVALID",
                reasons,
            ):
                valid = False
                continue
            if not isinstance(route["security"], list):
                reasons.append("SECURITY_ROUTE_INVALID")
                valid = False
                continue
            if not _strict_keys(
                route.get("declarationAnchor"),
                {"kind", "lineEnd", "lineStart", "name", "path"},
                "SECURITY_ROUTE_DECLARATION_INVALID",
                reasons,
            ):
                valid = False
            categories = [
                evidence.get("category")
                for evidence in route["security"]
                if isinstance(evidence, dict) and isinstance(evidence.get("category"), str)
            ]
            if len(route["security"]) != len(SECURITY_CATEGORIES) or len(categories) != len(set(categories)):
                reasons.append("SECURITY_CATEGORY_DUPLICATE")
            for evidence in route["security"]:
                if not _strict_keys(
                    evidence,
                    {"anchor", "assertion", "category", "disposition", "evidenceKind", "rationale"},
                    "SECURITY_EVIDENCE_INVALID",
                    reasons,
                ):
                    if isinstance(evidence, dict) and "category" not in evidence:
                        reasons.append("SECURITY_CATEGORY_MISSING")
                    if isinstance(evidence, dict) and "disposition" not in evidence:
                        reasons.append("SECURITY_DISPOSITION_MISSING")
                    valid = False
                    continue
                if not _strict_keys(
                    evidence.get("assertion"),
                    {"claim", "forbiddenTokens", "requiredTokens", "rule"},
                    "SECURITY_ASSERTION_INVALID",
                    reasons,
                ):
                    valid = False
                else:
                    assertion = evidence["assertion"]
                    if (
                        not isinstance(assertion["claim"], str)
                        or not _string_list(assertion["requiredTokens"], allow_empty=False)
                        or not _string_list(assertion["forbiddenTokens"])
                        or not isinstance(assertion["rule"], str)
                    ):
                        reasons.append("SECURITY_ASSERTION_INVALID")
                        valid = False
                if not _strict_keys(
                    evidence.get("anchor"),
                    {"category", "kind", "lineEnd", "lineStart", "path", "sourceRangeSha256"},
                    "SECURITY_ANCHOR_INVALID",
                    reasons,
                ):
                    valid = False

    if not _strict_keys(
        candidate.get("upstreamIssue"),
        {"decisionReason", "issue", "required", "state"},
        "UPSTREAM_ISSUE_SCHEMA_INVALID",
        reasons,
    ):
        valid = False
    else:
        issue = candidate["upstreamIssue"]
        if (
            not isinstance(issue["decisionReason"], str)
            or not isinstance(issue["required"], bool)
            or not isinstance(issue["state"], str)
        ):
            reasons.append("UPSTREAM_ISSUE_SCHEMA_INVALID")
            valid = False
        if issue["issue"] is not None and not _strict_keys(
            issue["issue"], {"number", "receipt", "url"},
            "UPSTREAM_ISSUE_RECORD_INVALID", reasons,
        ):
            valid = False
        if candidate.get("audit", {}).get("disposition") == "clean" and (
            issue.get("required") or issue.get("issue") is not None
        ):
            reasons.append("UPSTREAM_ISSUE_NOT_PERMITTED")

    if not _strict_keys(
        candidate.get("lineage"),
        {"candidateManifest", "producerReceipt", "reviewerReceipt", "recomputedArtifactLedger"},
        "LINEAGE_KEYS_INVALID",
        reasons,
    ):
        valid = False
    return valid


def _validate_schema(candidate: Any, reasons: list[str]) -> bool:
    """Validates the candidate schema version and rejects unknown fields."""
    if not isinstance(candidate, dict):
        reasons.append("CANDIDATE_NOT_DICT")
        return False
    allowed_top_level = {
        "schemaVersion",
        "candidateId",
        "audit",
        "compensation",
        "exclusions",
        "graph",
        "lineage",
        "parentEvidence",
        "requiredCommands",
        "securityRoutes",
        "sourceSnapshot",
        "upstreamIssue",
        "worktree",
        "parentArtifact",
        "parentArtifacts",
    }
    for key in candidate:
        if key not in allowed_top_level:
            reasons.append("CANDIDATE_UNKNOWN_FIELD")
    schema = candidate.get("schemaVersion")
    if schema != CANDIDATE_SCHEMA_VERSION:
        reasons.append("CANDIDATE_SCHEMA_VERSION_MISMATCH")
    return True


def _validate_worktree(candidate: dict[str, Any], reasons: list[str]) -> None:
    """Validates the one shared master worktree invariant and declared state."""
    worktree = candidate.get("worktree")
    if not isinstance(worktree, dict):
        reasons.append("WORKTREE_MISSING")
        return
    state = worktree.get("state")
    if state != "VERIFIED":
        reasons.append("WORKTREE_STATE_UNKNOWN")
    branch = worktree.get("branch")
    if branch != "master":
        reasons.append("WORKTREE_BRANCH_NOT_MASTER")
    count = worktree.get("worktreeCount")
    if count != 1:
        reasons.append("WORKTREE_COUNT_NOT_ONE")
    if not worktree.get("singleSharedWorktree"):
        reasons.append("WORKTREE_SINGLE_SHARED_FLAG_MISSING")
    if worktree.get("root") != EXPECTED_REPO_ROOT:
        reasons.append("WORKTREE_ROOT_MISMATCH")
    if worktree.get("baselineHead") != EXPECTED_BASELINE_HEAD:
        reasons.append("WORKTREE_BASELINE_HEAD_MISMATCH")


def _validate_state_artifact(
    state: dict[str, Any],
    fixture_root: Path,
    reasons: list[str],
) -> None:
    """Recomputes porcelain, staged-diff, and status hashes from raw bytes."""
    try:
        artifact, _ = _load_artifact(state.get("stateArtifact"), fixture_root)
    except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
        reasons.append("SOURCE_STATE_ARTIFACT_INVALID")
        return
    if set(artifact) != {"porcelain", "schemaVersion", "stagedDiff", "status"}:
        reasons.append("SOURCE_STATE_ARTIFACT_SCHEMA_INVALID")
        return
    if artifact.get("schemaVersion") != 1 or any(
        not isinstance(artifact.get(key), str)
        for key in ("porcelain", "stagedDiff", "status")
    ):
        reasons.append("SOURCE_STATE_ARTIFACT_SCHEMA_INVALID")
        return
    for name, hash_name in (
        ("porcelain", "porcelainSha256"),
        ("stagedDiff", "stagedDiffSha256"),
        ("status", "statusSha256"),
    ):
        if state.get(hash_name) != _sha(artifact[name].encode("utf-8")):
            reasons.append("SOURCE_STATE_ARTIFACT_HASH_MISMATCH")


def _validate_source_snapshot(
    candidate: dict[str, Any],
    fixture_root: Path,
    reasons: list[str],
) -> tuple[dict[str, Any] | None, dict[str, bytes] | None, dict[str, Any] | None]:
    """Validates source-snapshot archive/manifest/pre/post scan drift."""
    snapshot = candidate.get("sourceSnapshot")
    if not isinstance(snapshot, dict):
        reasons.append("SOURCE_SNAPSHOT_MISSING")
        return None, None, None
    archive_ref = snapshot.get("archive")
    manifest_ref = snapshot.get("manifest")
    if not isinstance(manifest_ref, dict):
        reasons.append("SOURCE_MANIFEST_MISSING")
        manifest = None
    else:
        try:
            manifest, _ = _load_artifact(manifest_ref, fixture_root)
        except MutablePathError:
            reasons.append("MUTABLE_EVIDENCE_PATH")
            manifest = None
        except FileNotFoundError:
            reasons.append("SOURCE_MANIFEST_LOAD_FAILED")
            manifest = None
        except (ValueError, TypeError, json.JSONDecodeError):
            reasons.append("SOURCE_MANIFEST_HASH_MISMATCH")
            manifest = None

    archive = None
    replay: dict[str, bytes] | None = None
    if not isinstance(archive_ref, dict):
        reasons.append("ARCHIVE_REFERENCE_MISSING")
    else:
        try:
            archive, replay = _replay_archive(archive_ref, fixture_root)
        except MutablePathError as error:
            if "archive path invalid" in str(error):
                reasons.append("ARCHIVE_PATH_INVALID")
            else:
                reasons.append("MUTABLE_EVIDENCE_PATH")
        except FileNotFoundError:
            reasons.append("ARCHIVE_LOAD_FAILED")
        except TypeError:
            reasons.append("ARCHIVE_ENTRY_SCHEMA_INVALID")
        except (ValueError, base64.binascii.Error, json.JSONDecodeError) as error:
            message = str(error)
            if "digest/size mismatch" in message and "entry" not in message:
                reasons.append("ARCHIVE_DIGEST_MISMATCH")
            elif "duplicate" in message:
                reasons.append("ARCHIVE_DUPLICATE_PATH")
            else:
                reasons.append("ARCHIVE_ENTRY_DIGEST_MISMATCH")

    if isinstance(manifest, dict):
        manifest_keys = {
            "baselineHead", "branch", "denominatorSha256", "discovery", "entries",
            "porcelainSha256", "scanCommand", "scanConfig", "schemaVersion",
            "stagedDiffSha256", "statusSha256", "toolVersion",
        }
        if set(manifest) != manifest_keys:
            reasons.append("SOURCE_MANIFEST_SCHEMA_INVALID")
        discovery = manifest.get("discovery")
        if not isinstance(discovery, dict) or set(discovery) != {
            "candidateExtensions", "configPaths", "rule", "sourcePathCount",
            "sourcePathsSha256",
        }:
            reasons.append("SOURCE_DISCOVERY_PROVENANCE_INVALID")
        entries = manifest.get("entries")
        if not isinstance(entries, list):
            reasons.append("SOURCE_MANIFEST_SCHEMA_INVALID")
            entries = []
        manifest_paths: list[str] = []
        metadata_valid = True
        for entry in entries:
            if not isinstance(entry, dict) or set(entry) != {"mode", "path", "sha256", "size", "state"}:
                metadata_valid = False
                continue
            try:
                manifest_paths.append(_normalize_repo_path(entry.get("path")))
            except MutablePathError:
                metadata_valid = False
        if not metadata_valid or len(manifest_paths) != len(set(manifest_paths)):
            reasons.append("SOURCE_MANIFEST_ENTRY_SCHEMA_INVALID")
        if replay is not None and archive is not None:
            archive_metadata = [
                {key: entry[key] for key in ("path", "sha256", "size", "mode", "state")}
                for entry in archive["entries"]
            ]
            if archive_metadata != entries:
                reasons.append("ARCHIVE_MANIFEST_INVENTORY_MISMATCH")
            if manifest.get("denominatorSha256") != _sha(_canonicalize(archive_metadata)):
                reasons.append("SOURCE_DENOMINATOR_HASH_MISMATCH")
            if set(replay) != EXPECTED_SOURCE_PATHS:
                reasons.append("SOURCE_DENOMINATOR_INCOMPLETE")
        if isinstance(discovery, dict):
            if (
                discovery.get("candidateExtensions") != [".ts", ".tsx", ".mts", ".cts"]
                or not _string_list(discovery.get("configPaths"), allow_empty=False)
                or set(discovery.get("configPaths", [])) != EXPECTED_CONFIG_PATHS
                or discovery.get("rule") != "frozen-repository-discovery-v1"
                or discovery.get("sourcePathCount") != len(manifest_paths)
                or discovery.get("sourcePathsSha256") != _sha(_canonicalize(manifest_paths))
            ):
                reasons.append("SOURCE_DISCOVERY_PROVENANCE_INVALID")
        if (
            snapshot.get("baselineHead") != manifest.get("baselineHead")
            or snapshot.get("branch") != manifest.get("branch")
            or snapshot.get("scanCommand") != manifest.get("scanCommand")
            or snapshot.get("scanConfig") != manifest.get("scanConfig")
            or snapshot.get("toolVersion") != manifest.get("toolVersion")
            or manifest.get("baselineHead") != candidate.get("worktree", {}).get("baselineHead")
            or manifest.get("branch") != "master"
            or manifest.get("schemaVersion") != 1
            or manifest.get("toolVersion") != "0.1.0"
            or manifest.get("scanCommand") != "repo-graph scan . ./graph.db"
            or manifest.get("scanConfig") is not None
        ):
            reasons.append("SOURCE_PROVENANCE_MISMATCH")
        expected_state = {
            key: manifest.get(key)
            for key in ("denominatorSha256", "porcelainSha256", "stagedDiffSha256", "statusSha256")
        }
        for phase, drift_reason in (("preScan", "PRE_SCAN_DENOMINATOR_DRIFT"), ("postScan", "POST_SCAN_DRIFT")):
            state = snapshot.get(phase)
            if not isinstance(state, dict) or {key: state.get(key) for key in expected_state} != expected_state:
                reasons.append(drift_reason)
            elif phase == "preScan" and state.get("denominatorSha256") != manifest.get("denominatorSha256"):
                reasons.append(drift_reason)
            if isinstance(state, dict):
                _validate_state_artifact(state, fixture_root, reasons)
    return archive, replay, manifest


def _validate_graph(
    candidate: dict[str, Any],
    fixture_root: Path,
    replay: dict[str, bytes] | None,
    reasons: list[str],
) -> dict[str, Any] | None:
    """Validates the graph artifact and per-row source-byte binding."""
    graph_ref = candidate.get("graph")
    if not isinstance(graph_ref, dict):
        reasons.append("GRAPH_ARTIFACT_MISSING")
        return None
    try:
        graph, _ = _load_artifact(graph_ref, fixture_root)
    except MutablePathError:
        reasons.append("MUTABLE_EVIDENCE_PATH")
        return None
    except FileNotFoundError:
        reasons.append("GRAPH_LOAD_FAILED")
        return None
    except ValueError:
        reasons.append("GRAPH_ARTIFACT_HASH_MISMATCH")
        return None

    if set(graph) != {
        "commitSha", "fileRows", "scanCommand", "scanConfig", "schemaVersion",
        "sourceManifestSha256", "toolVersion",
    }:
        reasons.append("GRAPH_SCHEMA_INVALID")
    snapshot = candidate.get("sourceSnapshot", {})
    if (
        graph.get("commitSha") is not None
        or graph.get("schemaVersion") != "2.0.0"
        or graph.get("toolVersion") != "0.1.0"
        or graph.get("scanCommand") != "repo-graph scan . ./graph.db"
        or graph.get("scanConfig") is not None
        or graph.get("sourceManifestSha256") != snapshot.get("manifest", {}).get("sha256")
    ):
        reasons.append("GRAPH_PROVENANCE_MISMATCH")

    exclusions = candidate.get("exclusions")
    graph_files: list[str] = []
    if isinstance(exclusions, dict) and isinstance(exclusions.get("graphFiles"), list):
        graph_files = list(exclusions["graphFiles"])
    declared_graph_paths = set(graph_files)
    file_rows = graph.get("fileRows")
    if not isinstance(file_rows, list):
        reasons.append("GRAPH_FILE_ROWS_MISSING")
        return graph
    row_paths: set[str] = set()
    for row in file_rows:
        if not isinstance(row, dict) or set(row) != {"path", "sourceSha256"}:
            reasons.append("GRAPH_FILE_ROW_INVALID")
            continue
        try:
            path = _normalize_repo_path(row.get("path"))
        except MutablePathError:
            reasons.append("GRAPH_FILE_ROW_PATH_MISSING")
            continue
        if path in row_paths:
            reasons.append("GRAPH_FILE_ROW_DUPLICATE")
            continue
        row_paths.add(path)
        if not _is_sha256(row.get("sourceSha256")):
            reasons.append("GRAPH_FILE_ROW_INVALID")
            continue
        if replay is None:
            continue
        if path not in replay:
            reasons.append("GRAPH_FILE_NOT_IN_SNAPSHOT")
            continue
        expected = _sha(replay[path])
        if row.get("sourceSha256") != expected:
            reasons.append("GRAPH_FILE_SOURCE_HASH_MISMATCH")
    for declared in declared_graph_paths:
        if replay is not None and declared not in replay:
            reasons.append("GRAPH_FILE_NOT_IN_SNAPSHOT")
    if row_paths != declared_graph_paths:
        reasons.append("GRAPH_FILE_INVENTORY_MISMATCH")
    return graph


def _validate_audit(
    candidate: dict[str, Any],
    graph: dict[str, Any] | None,
    manifest: dict[str, Any] | None,
    replay: dict[str, bytes] | None,
    reasons: list[str],
) -> str | None:
    """Validates the audit state, disposition, exit code, and clean-vs-compensation branch."""
    audit = candidate.get("audit")
    if not isinstance(audit, dict):
        reasons.append("AUDIT_MISSING")
        return None
    state = audit.get("state")
    disposition = audit.get("disposition")
    if state not in {"CLEAN", "COMPENSATED"}:
        reasons.append("AUDIT_STATE_UNKNOWN")
    if disposition not in {"clean", "compensation"}:
        reasons.append("AUDIT_DISPOSITION_UNKNOWN")
    if disposition == "clean" and state != "CLEAN":
        reasons.append("AUDIT_DISPOSITION_MISMATCH")
    if disposition == "compensation" and state != "COMPENSATED":
        reasons.append("AUDIT_DISPOSITION_MISMATCH")

    exit_code = audit.get("exitCode")
    unaudited_routes = audit.get("unauditedRoutes")
    unaudited_fields = audit.get("unauditedFields")
    for field_name in ("missing", "stale", "orphan", "duplicate"):
        value = audit.get(field_name)
        if isinstance(value, list) and value:
            reasons.append(f"AUDIT_{field_name.upper()}_NOT_EMPTY")

    compensation = candidate.get("compensation")
    if disposition == "clean":
        if exit_code != 0:
            reasons.append("CLEAN_AUDIT_NOT_ZERO")
        if isinstance(unaudited_routes, list) and unaudited_routes:
            reasons.append("CLEAN_AUDIT_NOT_EMPTY")
        if isinstance(unaudited_fields, list) and unaudited_fields:
            reasons.append("CLEAN_AUDIT_NOT_EMPTY")
        if compensation is not None:
            reasons.append("CLEAN_BRANCH_HAS_COMPENSATION")
    elif disposition == "compensation":
        if not _is_int(exit_code) or exit_code == 0:
            reasons.append("COMPENSATION_EXIT_ZERO_FORBIDDEN")
        if not isinstance(compensation, dict):
            reasons.append("COMPENSATION_MISSING")
        else:
            route_count = compensation.get("routeCount")
            field_count = compensation.get("fieldCount")
            actual_route_count = len(unaudited_routes) if isinstance(unaudited_routes, list) else 0
            actual_field_count = len(unaudited_fields) if isinstance(unaudited_fields, list) else 0
            if route_count == 0 or field_count == 0 or (actual_route_count == 0 and actual_field_count == 0):
                reasons.append("COMPENSATION_DENOMINATOR_EMPTY")
            if route_count != actual_route_count:
                reasons.append("COMPENSATION_ROUTE_COUNT_MISMATCH")
            if field_count != actual_field_count:
                reasons.append("COMPENSATION_FIELD_COUNT_MISMATCH")
            if not compensation.get("toolLimitation"):
                reasons.append("PROJECT_OWNED_COMPENSATION_FORBIDDEN")
            first = compensation.get("firstInventorySha256")
            second = compensation.get("secondInventorySha256")
            inventory = {"fields": unaudited_fields, "routes": unaudited_routes}
            inventory_sha = _sha(_canonicalize(inventory))
            if first != inventory_sha or second != inventory_sha or first != second:
                reasons.append("COMPENSATION_INVENTORY_DRIFT")
            route_reconciliation = compensation.get("routeReconciliation")
            field_reconciliation = compensation.get("fieldReconciliation")
            if not isinstance(route_reconciliation, list):
                reasons.append("ROUTE_RECONCILIATION_MISSING")
            else:
                route_ids = [entry.get("id") for entry in route_reconciliation if isinstance(entry, dict)]
                if len(route_ids) != len(set(route_ids)):
                    reasons.append("ROUTE_RECONCILIATION_DUPLICATE")
                if route_reconciliation != unaudited_routes:
                    reasons.append("ROUTE_RECONCILIATION_INCOMPLETE")
                if isinstance(replay, dict):
                    _validate_route_reconciliation(route_reconciliation, replay, reasons)
            if not isinstance(field_reconciliation, list):
                reasons.append("FIELD_RECONCILIATION_MISSING")
            else:
                field_ids = [entry.get("id") for entry in field_reconciliation if isinstance(entry, dict)]
                if len(field_ids) != len(set(field_ids)):
                    reasons.append("FIELD_RECONCILIATION_DUPLICATE")
                if field_reconciliation != unaudited_fields:
                    reasons.append("FIELD_RECONCILIATION_INCOMPLETE")
                if isinstance(replay, dict):
                    _validate_field_reconciliation(field_reconciliation, replay, reasons)
    return disposition


def _validate_route_reconciliation(
    entries: list[Any],
    replay: dict[str, bytes],
    reasons: list[str],
) -> None:
    """Replays every compensation route-reconciliation entry against the source archive."""
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict) or set(entry) != {
            "declarationAnchor", "fingerprint", "id", "lineEnd", "lineStart",
            "name", "path", "sourceRangeSha256",
        }:
            reasons.append("ROUTE_RECONCILIATION_INVALID")
            continue
        anchor = entry.get("declarationAnchor")
        if not isinstance(anchor, dict) or set(anchor) != {
            "kind", "lineEnd", "lineStart", "name", "path"
        }:
            reasons.append("DECLARATION_ANCHOR_MISSING")
            continue
        path = anchor.get("path")
        line_start = anchor.get("lineStart")
        line_end = anchor.get("lineEnd")
        if path not in replay:
            reasons.append("ROUTE_RECONCILIATION_PATH_NOT_IN_SNAPSHOT")
            continue
        if not isinstance(line_start, int) or not isinstance(line_end, int) or line_start < 1 or line_end < line_start:
            reasons.append("ROUTE_RECONCILIATION_INVALID_RANGE")
            continue
        lines = replay[path].splitlines(keepends=True)
        end_index = min(line_end, len(lines))
        range_bytes = b"".join(lines[line_start - 1 : end_index])
        expected = entry.get("sourceRangeSha256")
        if not range_bytes or expected != _sha(range_bytes):
            reasons.append("ROUTE_SOURCE_RANGE_HASH_MISMATCH")
        if entry.get("path") != path or entry.get("lineStart") != line_start or entry.get("lineEnd") != line_end:
            reasons.append("ROUTE_RECONCILIATION_ANCHOR_MISMATCH")
        if entry.get("fingerprint") != _sha(_canonicalize(anchor)):
            reasons.append("ROUTE_FINGERPRINT_MISMATCH")


def _validate_field_reconciliation(
    entries: list[Any],
    replay: dict[str, bytes],
    reasons: list[str],
) -> None:
    """Replays every compensation field-reconciliation entry against the source archive."""
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {
            "declarationAnchor", "fingerprint", "id", "lineEnd", "lineStart",
            "name", "path", "sourceRangeSha256",
        }:
            reasons.append("FIELD_RECONCILIATION_INVALID")
            continue
        anchor = entry.get("declarationAnchor")
        if not isinstance(anchor, dict) or set(anchor) != {
            "kind", "lineEnd", "lineStart", "name", "path"
        }:
            reasons.append("FIELD_RECONCILIATION_ANCHOR_MISSING")
            continue
        path = anchor.get("path")
        if path not in replay:
            reasons.append("FIELD_RECONCILIATION_PATH_NOT_IN_SNAPSHOT")
            continue
        line = anchor.get("lineStart")
        if not isinstance(line, int) or line < 1:
            reasons.append("FIELD_RECONCILIATION_INVALID_LINE")
            continue
        lines = replay[path].splitlines(keepends=True)
        if line > len(lines):
            reasons.append("FIELD_RECONCILIATION_LINE_OUT_OF_RANGE")
            continue
        range_bytes = lines[line - 1]
        expected = entry.get("sourceRangeSha256")
        if expected != _sha(range_bytes):
            reasons.append("FIELD_SOURCE_RANGE_HASH_MISMATCH")
        if entry.get("path") != path or entry.get("lineStart") != line or entry.get("lineEnd") != anchor.get("lineEnd"):
            reasons.append("FIELD_RECONCILIATION_ANCHOR_MISMATCH")
        if entry.get("fingerprint") != _sha(_canonicalize(anchor)):
            reasons.append("FIELD_FINGERPRINT_MISMATCH")


def _validate_security_routes(
    candidate: dict[str, Any],
    replay: dict[str, bytes] | None,
    reasons: list[str],
) -> None:
    """Validates every security-route, category, claim, and source-range contract."""
    security_routes = candidate.get("securityRoutes")
    if not isinstance(security_routes, dict):
        reasons.append("SECURITY_ROUTES_MISSING")
        return
    discovered = security_routes.get("discoveredRouteCount")
    routes = security_routes.get("routes")
    if not isinstance(routes, list):
        reasons.append("SECURITY_ROUTES_LIST_MISSING")
        return
    if discovered != len(routes):
        reasons.append("SECURITY_ROUTE_COUNT_MISMATCH")

    actual_routes: set[tuple[str, str, str]] = set()
    rationales: set[str] = set()
    for route in routes:
        if not isinstance(route, dict):
            reasons.append("SECURITY_ROUTE_INVALID")
            continue
        name = route.get("name")
        path = route.get("path")
        if not isinstance(name, str) or not isinstance(path, str):
            reasons.append("SECURITY_ROUTE_NAME_OR_PATH_MISSING")
            continue
        try:
            method, route_path = name.split(" ", 1)
        except ValueError:
            reasons.append(f"SECURITY_ROUTE_NAME_INVALID:{name!r}")
            continue
        actual_routes.add((method, route_path, path))
        expected_dispositions = _expected_security_dispositions(name)
        expected_claims = _expected_security_claims(name)

        if replay is not None and path in replay:
            line_start = route.get("lineStart")
            line_end = route.get("lineEnd")
            if isinstance(line_start, int) and isinstance(line_end, int):
                lines = replay[path].splitlines(keepends=True)
                end_index = min(line_end, len(lines))
                if line_start >= 1 and line_start <= end_index:
                    range_bytes = b"".join(lines[line_start - 1 : end_index])
                    if route.get("sourceRangeSha256") != _sha(range_bytes):
                        reasons.append("ROUTE_SOURCE_RANGE_HASH_MISMATCH")

        anchor = route.get("declarationAnchor")
        if isinstance(anchor, dict):
            expected_fingerprint = _sha(_canonicalize(anchor))
            if route.get("fingerprint") != expected_fingerprint:
                reasons.append("ROUTE_FINGERPRINT_MISMATCH")

        security = route.get("security")
        if not isinstance(security, list):
            reasons.append("SECURITY_ROUTE_SECURITY_MISSING")
            continue
        if len(security) != len(SECURITY_CATEGORIES):
            reasons.append("SECURITY_CATEGORY_DUPLICATE")
        categories: list[str] = []
        evidence_kind_seen: set[Any] = set()
        last_claim: Any = None
        for evidence in security:
            if not isinstance(evidence, dict):
                reasons.append("SECURITY_EVIDENCE_INVALID")
                continue
            category = evidence.get("category")
            if isinstance(category, str):
                categories.append(category)
            if category is None:
                reasons.append("SECURITY_CATEGORY_MISSING")
            elif category not in SECURITY_CATEGORIES:
                reasons.append("SECURITY_CATEGORY_UNSUPPORTED")
            disposition = evidence.get("disposition")
            if disposition is None:
                reasons.append("SECURITY_DISPOSITION_MISSING")
            elif category in SUPPORTED_DISPOSITIONS and disposition not in SUPPORTED_DISPOSITIONS[category]:
                reasons.append("SECURITY_DISPOSITION_UNSUPPORTED")
            if (
                isinstance(category, str)
                and category in expected_dispositions
                and disposition != expected_dispositions[category]
            ):
                reasons.append("SECURITY_ROUTE_EXPECTATION_MISMATCH")

            evidence_kind = evidence.get("evidenceKind")
            if evidence_kind is None:
                reasons.append("SECURITY_EVIDENCE_KIND_MISSING")
            elif evidence_kind != "reviewed-source-assertion":
                reasons.append("SECURITY_EVIDENCE_KIND_UNSUPPORTED")
            evidence_kind_seen.add(evidence_kind)

            rationale = evidence.get("rationale")
            if not isinstance(rationale, str) or len(rationale) <= 60:
                reasons.append("SECURITY_RATIONALE_INSUFFICIENT")
            elif isinstance(category, str) and rationale.startswith(f"{category}:"):
                reasons.append("SECURITY_RATIONALE_TEMPLATED")
            elif "is established by the reviewed" in rationale:
                reasons.append("SECURITY_RATIONALE_BANNED_PHRASE")
            elif rationale in rationales:
                reasons.append("SECURITY_RATIONALE_NOT_UNIQUE")
            else:
                rationales.add(rationale)

            assertion = evidence.get("assertion")
            if not isinstance(assertion, dict):
                reasons.append("SECURITY_ASSERTION_INVALID")
                continue
            if set(assertion) != {"claim", "forbiddenTokens", "requiredTokens", "rule"}:
                reasons.append("SECURITY_ASSERTION_KEYS_INVALID")
            rule = assertion.get("rule")
            if rule != "all-required-and-no-forbidden-tokens-in-range":
                reasons.append("SECURITY_ASSERTION_RULE_INVALID")
            claim = assertion.get("claim")
            last_claim = claim
            if (
                isinstance(category, str)
                and category in expected_claims
                and claim != expected_claims[category]
            ):
                reasons.append("SECURITY_ROUTE_EXPECTATION_MISMATCH")
            if category in SUPPORTED_DISPOSITIONS and disposition in SUPPORTED_DISPOSITIONS[category]:
                valid_claims = CLAIMS_BY_DISPOSITION.get((category, disposition), set())
                if claim not in valid_claims:
                    reasons.append("SECURITY_ASSERTION_SOURCE_MISMATCH")
            if claim in CLAIM_TOKEN_CONSTRAINTS:
                required_constraints, forbidden_constraints = CLAIM_TOKEN_CONSTRAINTS[claim]
                required_tokens = set(assertion.get("requiredTokens", []))
                forbidden_tokens = set(assertion.get("forbiddenTokens", []))
                if not required_constraints <= required_tokens:
                    reasons.append("SECURITY_ASSERTION_REQUIRED_TOKENS_MISSING")
                if not forbidden_constraints <= forbidden_tokens:
                    reasons.append("SECURITY_ASSERTION_FORBIDDEN_TOKENS_MISSING")

            evidence_anchor = evidence.get("anchor")
            if not isinstance(evidence_anchor, dict):
                reasons.append("SECURITY_ANCHOR_MISSING")
            else:
                if evidence_anchor.get("category") != category or evidence_anchor.get("kind") != "SecuritySourceRange":
                    reasons.append("SECURITY_ANCHOR_SCHEMA_MISMATCH")
                expected_anchor_path = (
                    _expected_security_anchor_path(name, path, category)
                    if isinstance(category, str)
                    else path
                )
                if evidence_anchor.get("path") != expected_anchor_path:
                    reasons.append("SECURITY_ROUTE_EXPECTATION_MISMATCH")
                if replay is not None:
                    anchor_path = evidence_anchor.get("path")
                    if anchor_path not in replay:
                        reasons.append("SECURITY_ANCHOR_PATH_NOT_IN_SNAPSHOT")
                    else:
                        line_start = evidence_anchor.get("lineStart")
                        line_end = evidence_anchor.get("lineEnd")
                        if isinstance(line_start, int) and isinstance(line_end, int) and line_start >= 1 and line_end >= line_start:
                            lines = replay[anchor_path].splitlines(keepends=True)
                            end_index = min(line_end, len(lines))
                            if line_start <= end_index:
                                range_bytes = b"".join(lines[line_start - 1 : end_index])
                                if not range_bytes:
                                    reasons.append("SECURITY_ANCHOR_RANGE_EMPTY")
                                elif evidence_anchor.get("sourceRangeSha256") != _sha(range_bytes):
                                    reasons.append("SECURITY_ANCHOR_RANGE_HASH_MISMATCH")
                                else:
                                    decoded = range_bytes.decode("utf-8")
                                    for token in assertion.get("requiredTokens", []):
                                        if token not in decoded:
                                            reasons.append("SECURITY_ASSERTION_REQUIRED_TOKEN_MISSING")
                                    for token in assertion.get("forbiddenTokens", []):
                                        if token in decoded:
                                            reasons.append("SECURITY_ASSERTION_FORBIDDEN_TOKEN_PRESENT")
        filtered_categories = [c for c in categories if c is not None]
        if filtered_categories and sorted(filtered_categories) != sorted(SECURITY_CATEGORIES):
            reasons.append("SECURITY_CATEGORY_DUPLICATE")
        if name in PERMISSION_CHECKED_ROUTE_NAMES and evidence_kind_seen != {"reviewed-source-assertion"}:
            reasons.append("SECURITY_EVIDENCE_KIND_UNSUPPORTED")
        if name in PERMISSION_CHECKED_ROUTE_NAMES and last_claim in {"authorization.no-company-admin-capability"}:
            reasons.append("SECURITY_ASSERTION_SOURCE_MISMATCH")
    if actual_routes != EXPECTED_ACCOUNTS_ROUTES:
        reasons.append("SECURITY_ROUTE_DENOMINATOR_MISMATCH")
    for route in routes:
        security = route.get("security") if isinstance(route, dict) else None
        if not isinstance(security, list):
            continue
        anchor_signatures: set[tuple[Any, ...]] = set()
        for evidence in security:
            if isinstance(evidence, dict):
                anchor = evidence.get("anchor")
                if isinstance(anchor, dict):
                    anchor_signatures.add((
                        anchor.get("path"),
                        anchor.get("lineStart"),
                        anchor.get("lineEnd"),
                        anchor.get("sourceRangeSha256"),
                    ))
        if len(anchor_signatures) == 1 and len(security) == len(SECURITY_CATEGORIES):
            reasons.append("SECURITY_EVIDENCE_COPIED_ACROSS_CATEGORIES")
        dispositions = {
            evidence.get("category"): evidence.get("disposition")
            for evidence in security
            if isinstance(evidence, dict)
        }
        scope_disposition = dispositions.get("scope")
        if scope_disposition not in {"global", "tenant-scoped"}:
            reasons.append("GLOBAL_ROUTE_TENANT_SCOPED")
        elif scope_disposition == "tenant-scoped":
            reasons.append("GLOBAL_ROUTE_TENANT_SCOPED")
        auth_disposition = dispositions.get("authentication")
        auth_evidence = next(
            (ev for ev in security if isinstance(ev, dict) and ev.get("category") == "authentication"),
            None,
        )
        auth_anchor_path = auth_evidence.get("anchor", {}).get("path") if isinstance(auth_evidence, dict) else None
        route_name = route.get("name")
        route_path = route.get("path")
        if auth_disposition == "authenticated":
            if route_name not in AUTHENTICATED_ROUTE_NAMES:
                if auth_anchor_path == route_path:
                    reasons.append("PUBLIC_ROUTE_AUTHENTICATED")
                else:
                    reasons.append("SECURITY_EXCEPTION_SOURCE_MISMATCH")
        elif auth_disposition == "public" and route_name in AUTHENTICATED_ROUTE_NAMES:
            reasons.append("SECURITY_EXCEPTION_SOURCE_MISMATCH")
        elif (
            auth_evidence is not None
            and auth_anchor_path is not None
            and route_path is not None
            and auth_anchor_path != route_path
        ):
            reasons.append("SECURITY_EXCEPTION_SOURCE_MISMATCH")


def _validate_exclusions(
    candidate: dict[str, Any],
    replay: dict[str, bytes] | None,
    reasons: list[str],
) -> None:
    """Validates the candidate-TypeScript minus graph-files compensation ledger."""
    exclusions = candidate.get("exclusions")
    if not isinstance(exclusions, dict):
        reasons.append("EXCLUSIONS_MISSING")
        return
    candidate_ts = exclusions.get("candidateTypeScript")
    graph_files = exclusions.get("graphFiles")
    ledger = exclusions.get("ledger")
    if not isinstance(candidate_ts, list) or not isinstance(graph_files, list) or not isinstance(ledger, list):
        reasons.append("EXCLUSIONS_SHAPE_INVALID")
        return

    snapshot_ts: set[str] = set()
    if replay is not None:
        snapshot_ts = {path for path in replay if path.endswith((".ts", ".tsx", ".mts", ".cts"))}
        if set(candidate_ts) != snapshot_ts:
            reasons.append("EXCLUSION_DENOMINATOR_DRIFT")

    graph_set = set(graph_files)
    if not graph_set <= snapshot_ts:
        reasons.append("GRAPH_FILE_INVENTORY_MISMATCH")
    expected = snapshot_ts - graph_set if replay is not None else set(candidate_ts) - graph_set
    ledger_paths = {entry["path"] for entry in ledger if isinstance(entry, dict) and isinstance(entry.get("path"), str)}
    if ledger_paths != expected:
        reasons.append("EXCLUSION_LEDGER_INCOMPLETE")
    if expected != EXPECTED_EXCLUSIONS and expected != set() and replay is None:
        reasons.append("EXCLUSION_LEDGER_INCOMPLETE")

    for entry in ledger:
        if not isinstance(entry, dict) or set(entry) != {
            "adminCrmRelevance", "class", "disposition", "package", "path",
            "sha256", "tsconfigExclusion",
        }:
            reasons.append("EXCLUSION_LEDGER_ENTRY_INVALID")
            continue
        path = entry.get("path")
        if not isinstance(path, str) or not path:
            reasons.append("EXCLUSION_LEDGER_PATH_MISSING")
            continue
        if replay is not None:
            expected_sha = _sha(replay.get(path, b""))
            if entry.get("sha256") != expected_sha:
                reasons.append("EXCLUSION_LEDGER_HASH_MISMATCH")
        if (
            not entry.get("package")
            or not entry.get("tsconfigExclusion")
            or entry.get("class") not in {"production", "test", "test-support", "config"}
            or entry.get("disposition") != "source-hash-plus-required-package-gates"
            or entry.get("adminCrmRelevance") != "required compensating regression/type evidence"
        ):
            reasons.append("EXCLUSION_LEDGER_FIELDS_MISSING")


def _validate_required_commands(
    candidate: dict[str, Any],
    manifest: dict[str, Any] | None,
    fixture_root: Path,
    reasons: list[str],
) -> None:
    """Validates the hash-bound, snapshot-bound command-result records."""
    required = candidate.get("requiredCommands")
    if not isinstance(required, dict):
        reasons.append("REQUIRED_COMMANDS_MISSING")
        return
    required_names = required.get("requiredNames")
    artifact_ref = required.get("artifact")
    if not isinstance(required_names, list):
        reasons.append("REQUIRED_COMMAND_NAMES_INVALID")
        return
    if required_names != list(EXPECTED_COMMANDS):
        reasons.append("REQUIRED_COMMAND_MISSING")
    if not isinstance(artifact_ref, dict):
        reasons.append("COMMAND_ARTIFACT_MISSING")
        return
    try:
        artifact, _ = _load_artifact(artifact_ref, fixture_root)
    except MutablePathError:
        reasons.append("MUTABLE_EVIDENCE_PATH")
        return
    except FileNotFoundError:
        reasons.append("COMMAND_ARTIFACT_LOAD_FAILED")
        return
    except ValueError:
        reasons.append("COMMAND_ARTIFACT_HASH_MISMATCH")
        return
    records = artifact.get("records")
    if set(artifact) != {"records", "schemaVersion"} or artifact.get("schemaVersion") != 1 or not isinstance(records, list):
        reasons.append("COMMAND_ARTIFACT_RECORDS_INVALID")
        return
    record_names = [record.get("name") for record in records if isinstance(record, dict)]
    if record_names != list(EXPECTED_COMMANDS) or len(records) != len(EXPECTED_COMMANDS):
        reasons.append("COMMAND_RECORD_SET_MISMATCH")
    manifest_ref = candidate.get("sourceSnapshot", {}).get("manifest", {})
    manifest_sha = manifest_ref.get("sha256") if isinstance(manifest_ref, dict) else None
    for record in records:
        if not isinstance(record, dict) or set(record) != {
            "command", "exitCode", "name", "recordSha256",
            "snapshotManifestSha256", "status", "stderr", "stderrSha256",
            "stdout", "stdoutSha256",
        }:
            reasons.append("COMMAND_RECORD_SCHEMA_INVALID")
            continue
        name = record.get("name")
        command = record.get("command")
        exit_code = record.get("exitCode")
        status = record.get("status")
        if name in EXPECTED_COMMANDS and command != EXPECTED_COMMANDS[name]:
            reasons.append("COMMAND_NAME_COMMAND_MISMATCH")
        if not _is_int(exit_code) or exit_code != 0:
            reasons.append("COMMAND_EXIT_NONZERO")
        if status not in {"PASS"}:
            reasons.append("COMMAND_STATE_UNKNOWN")
        stdout = record.get("stdout")
        stderr = record.get("stderr")
        if not isinstance(stdout, str) or not isinstance(stderr, str):
            reasons.append("COMMAND_RECORD_SCHEMA_INVALID")
            continue
        if record.get("stdoutSha256") != _sha(stdout.encode("utf-8")):
            reasons.append("COMMAND_STDOUT_HASH_MISMATCH")
        if record.get("stderrSha256") != _sha(stderr.encode("utf-8")):
            reasons.append("COMMAND_STDERR_HASH_MISMATCH")
        if manifest_sha is not None and record.get("snapshotManifestSha256") != manifest_sha:
            reasons.append("COMMAND_SNAPSHOT_BINDING_MISMATCH")
        body = {key: value for key, value in record.items() if key != "recordSha256"}
        if record.get("recordSha256") != _sha(_canonicalize(body)):
            reasons.append("COMMAND_RECORD_HASH_MISMATCH")


def _validate_upstream_issue(
    candidate: dict[str, Any],
    audit_disposition: str | None,
    fixture_root: Path,
    reasons: list[str],
) -> None:
    """Validates the FR6 upstream-issue decision matrix for clean vs compensation branches."""
    issue = candidate.get("upstreamIssue")
    if not isinstance(issue, dict):
        reasons.append("UPSTREAM_ISSUE_MISSING")
        return
    required = issue.get("required")
    state = issue.get("state")
    artifact = issue.get("issue")
    if state not in {"NOT_REQUIRED", "REQUIRED_RECORDED"}:
        reasons.append("UPSTREAM_ISSUE_STATE_UNKNOWN")
    if audit_disposition == "clean":
        if required or state == "REQUIRED_RECORDED" or artifact is not None:
            reasons.append("UPSTREAM_ISSUE_NOT_PERMITTED")
    elif audit_disposition == "compensation":
        compensation = candidate.get("compensation")
        tool_limitation = (
            isinstance(compensation, dict)
            and compensation.get("toolLimitation") is True
        )
        if tool_limitation and (required is not True or state != "REQUIRED_RECORDED" or artifact is None):
            reasons.append("UPSTREAM_ISSUE_REQUIRED_FOR_TOOL_LIMITATION")
        if required and artifact is None:
            reasons.append("UPSTREAM_ISSUE_REQUIRED")
        if artifact is not None:
            if not isinstance(artifact, dict) or set(artifact) != {"number", "receipt", "url"}:
                reasons.append("UPSTREAM_ISSUE_RECORD_INVALID")
            else:
                if (
                    not _is_int(artifact.get("number"))
                    or artifact.get("number") <= 0
                    or artifact.get("url") != f"https://github.com/bodangren/repo-graph/issues/{artifact.get('number')}"
                ):
                    reasons.append("UPSTREAM_ISSUE_RECORD_INCOMPLETE")
                try:
                    receipt, _ = _load_artifact(artifact.get("receipt"), fixture_root)
                except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
                    reasons.append("UPSTREAM_ISSUE_RECEIPT_INVALID")
                    return
                required_receipt_keys = {
                    "auditExcerptSha256", "commands", "expected", "fixtureSha256",
                    "issueNumber", "observed", "repository", "schemaVersion",
                    "toolVersion", "url",
                }
                if set(receipt) != required_receipt_keys:
                    reasons.append("UPSTREAM_ISSUE_RECEIPT_INVALID")
                elif (
                    receipt.get("schemaVersion") != 1
                    or receipt.get("repository") != "bodangren/repo-graph"
                    or receipt.get("toolVersion") != "0.1.0"
                    or receipt.get("issueNumber") != artifact.get("number")
                    or receipt.get("url") != artifact.get("url")
                    or receipt.get("commands") != [
                        "repo-graph scan . ./graph.db",
                        "repo-graph audit ./graph.db --json",
                    ]
                    or not _is_sha256(receipt.get("fixtureSha256"))
                    or not _is_sha256(receipt.get("auditExcerptSha256"))
                    or not isinstance(receipt.get("expected"), str)
                    or not isinstance(receipt.get("observed"), str)
                ):
                    reasons.append("UPSTREAM_ISSUE_RECEIPT_INVALID")


def _validate_parent_evidence(
    candidate: dict[str, Any],
    fixture_root: Path,
    reasons: list[str],
) -> None:
    """Loads the pinned parent FAIL trust roots required by normal acceptance."""
    reference = candidate.get("parentEvidence")
    if reference is None:
        reasons.append("PARENT_EVIDENCE_MISSING")
        return
    if reference != PARENT_MANIFEST_PIN:
        reasons.append("PARENT_MANIFEST_TRUST_ROOT_MISMATCH")
        return
    try:
        manifest, _ = _load_artifact(reference, fixture_root)
    except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
        reasons.append("PARENT_MANIFEST_TRUST_ROOT_MISMATCH")
        return
    if set(manifest) != {
        "artifacts", "baselineHead", "expectedClassification", "purpose",
        "schemaVersion", "trackId",
    }:
        reasons.append("PARENT_MANIFEST_SCHEMA_INVALID")
        return
    if (
        manifest.get("schemaVersion") != 1
        or manifest.get("baselineHead") != candidate.get("worktree", {}).get("baselineHead")
        or manifest.get("expectedClassification") != "BLOCKED"
        or manifest.get("trackId") != "business_operations_graph_baseline_remediation_20260730"
    ):
        reasons.append("PARENT_FAILURE_SEMANTICS_INVALID")
    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, dict) or set(artifacts) != set(PARENT_ARTIFACT_PINS):
        reasons.append("PARENT_ARTIFACTS_INVALID")
        return
    loaded: dict[str, bytes] = {}
    for name, pin in PARENT_ARTIFACT_PINS.items():
        entry = artifacts.get(name)
        if not isinstance(entry, dict):
            reasons.append("PARENT_ARTIFACTS_INVALID")
            continue
        kind_specific_keys = {
            "independent-review-fail": {"verdict", "openFindings"},
            "producer-evidence-fail": {
                "auditExitCode", "excludedTypeScriptCount", "unauditedSymbols"
            },
            "mid-red-rereview-fail": {"decision", "openFindings"},
        }[pin["kind"]]
        if set(entry) != {
            "kind", "path", "reason", "sha256", "size", *kind_specific_keys
        }:
            reasons.append("PARENT_ARTIFACTS_INVALID")
            continue
        expected_ref = {key: pin[key] for key in ("path", "sha256", "size")}
        if (
            {key: entry.get(key) for key in ("path", "sha256", "size")} != expected_ref
            or entry.get("kind") != pin["kind"]
        ):
            reasons.append("PARENT_ARTIFACT_TRUST_ROOT_MISMATCH")
            continue
        try:
            relative = _validate_ref(expected_ref)
            data = (fixture_root / relative).read_bytes()
        except (MutablePathError, FileNotFoundError, OSError):
            reasons.append("PARENT_ARTIFACT_TRUST_ROOT_MISMATCH")
            continue
        if _sha(data) != pin["sha256"] or len(data) != pin["size"]:
            reasons.append("PARENT_ARTIFACT_TRUST_ROOT_MISMATCH")
            continue
        loaded[name] = data
    review_data = loaded.get("phase0-review-b-safety-20260730.json")
    rereview_data = loaded.get("red-rereview-correctness-20260730.json")
    producer_data = loaded.get("phase0-graph-baseline-producer-evidence-20260722.md", b"")
    try:
        review = json.loads(review_data) if review_data is not None else {}
        rereview = json.loads(rereview_data) if rereview_data is not None else {}
    except (TypeError, json.JSONDecodeError):
        reasons.append("PARENT_FAILURE_SEMANTICS_INVALID")
        return
    if (
        review.get("verdict") != "FAIL"
        or {finding.get("id") for finding in review.get("findings", []) if isinstance(finding, dict)}
        != {"RB-01", "RB-02", "RB-03"}
        or rereview.get("decision") != "FAIL"
        or b"audit ./graph.db --json` exited **`1`" not in producer_data
        or b"Phase S1 remains blocked" not in producer_data
    ):
        reasons.append("PARENT_FAILURE_SEMANTICS_INVALID")


def _derived_artifact_references(candidate: dict[str, Any]) -> list[dict[str, Any]]:
    """Derives the complete ordered candidate artifact set from the envelope."""
    snapshot = candidate.get("sourceSnapshot", {})
    references = [
        snapshot.get("archive"),
        snapshot.get("manifest"),
        snapshot.get("preScan", {}).get("stateArtifact"),
        snapshot.get("postScan", {}).get("stateArtifact"),
        candidate.get("graph"),
        candidate.get("requiredCommands", {}).get("artifact"),
        candidate.get("parentEvidence"),
    ]
    issue = candidate.get("upstreamIssue", {}).get("issue")
    if isinstance(issue, dict):
        references.append(issue.get("receipt"))
    return references


def _validate_lineage(
    candidate: dict[str, Any],
    fixture_root: Path,
    reasons: list[str],
) -> None:
    """Validates candidate manifest, producer/reviewer receipts, and recomputation ledger."""
    lineage = candidate.get("lineage")
    if not isinstance(lineage, dict):
        reasons.append("LINEAGE_MISSING")
        return
    expected_keys = {"candidateManifest", "producerReceipt", "reviewerReceipt", "recomputedArtifactLedger"}
    if set(lineage) != expected_keys:
        reasons.append("LINEAGE_KEYS_INVALID")
        return

    try:
        candidate_manifest, _ = _load_artifact(lineage["candidateManifest"], fixture_root)
    except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
        reasons.append("CANDIDATE_MANIFEST_INVALID")
        candidate_manifest = {}
    try:
        producer, _ = _load_artifact(lineage["producerReceipt"], fixture_root)
    except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
        reasons.append("PRODUCER_RECEIPT_HASH_MISMATCH")
        producer = {}
    try:
        reviewer, _ = _load_artifact(lineage["reviewerReceipt"], fixture_root)
    except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
        reasons.append("REVIEW_RECEIPT_HASH_MISMATCH")
        reviewer = {}
    try:
        ledger, _ = _load_artifact(lineage["recomputedArtifactLedger"], fixture_root)
    except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
        reasons.append("RECOMPUTED_LEDGER_INVALID")
        ledger = {}

    core = {key: value for key, value in candidate.items() if key != "lineage"}
    candidate_sha = _sha(_canonicalize(core))
    if candidate_manifest.get("candidateSha256") != candidate_sha:
        reasons.append("CANDIDATE_SHA_MISMATCH")
    if producer.get("candidateSha256") != candidate_sha:
        reasons.append("PRODUCER_CANDIDATE_SHA_MISMATCH")
    if reviewer.get("candidateSha256") != candidate_sha:
        reasons.append("REVIEWER_CANDIDATE_SHA_MISMATCH")

    if producer.get("candidateManifest") != lineage.get("candidateManifest"):
        reasons.append("PRODUCER_MANIFEST_REFERENCE_MISMATCH")
    if reviewer.get("candidateManifest") != lineage.get("candidateManifest"):
        reasons.append("REVIEWER_MANIFEST_REFERENCE_MISMATCH")
    if reviewer.get("producerReceipt") != lineage.get("producerReceipt"):
        reasons.append("REVIEWER_PRODUCER_REFERENCE_MISMATCH")
    if reviewer.get("recomputedArtifactLedger") != lineage.get("recomputedArtifactLedger"):
        reasons.append("REVIEWER_LEDGER_REFERENCE_MISMATCH")

    if producer.get("role") != "producer":
        reasons.append("PRODUCER_ROLE_INVALID")
    if reviewer.get("role") != "independent-reviewer":
        reasons.append("REVIEWER_ROLE_INVALID")
    if producer.get("identity") == reviewer.get("identity"):
        reasons.append("PRODUCER_SELF_APPROVAL")

    if set(candidate_manifest) != {
        "artifacts", "candidateId", "candidateSha256", "schemaVersion", "successorGates"
    }:
        reasons.append("CANDIDATE_MANIFEST_SCHEMA_INVALID")
    if set(producer) != {
        "candidateManifest", "candidateSha256", "identity", "role",
        "schemaVersion", "state", "timestamp",
    }:
        reasons.append("PRODUCER_RECEIPT_SCHEMA_INVALID")
    if set(reviewer) != {
        "candidateManifest", "candidateSha256", "decision", "findings", "identity",
        "producerReceipt", "recomputedArtifactLedger", "role", "schemaVersion",
        "severityGate", "state", "successorGates", "timestamp",
    }:
        reasons.append("REVIEW_RECEIPT_SCHEMA_INVALID")
    if set(ledger) != {"artifacts", "candidateSha256", "schemaVersion", "successorGates"}:
        reasons.append("RECOMPUTED_LEDGER_SCHEMA_INVALID")
    if (
        candidate_manifest.get("schemaVersion") != 1
        or candidate_manifest.get("candidateId") != candidate.get("candidateId")
        or ledger.get("schemaVersion") != 1
        or ledger.get("candidateSha256") != candidate_sha
    ):
        reasons.append("LINEAGE_METADATA_MISMATCH")
    manifest_gates = candidate_manifest.get("successorGates")
    if not isinstance(manifest_gates, list) or {
        (gate.get("name"), gate.get("state"))
        for gate in manifest_gates
        if isinstance(gate, dict)
    } != {
        (name, "BLOCKED_UNTIL_HASH_BOUND_HANDOFF")
        for name in EXPECTED_SUCCESSOR_GATES
    }:
        reasons.append("CANDIDATE_MANIFEST_GATES_INCOMPLETE")
    if producer.get("state") != "CANDIDATE_PUBLISHED" or producer.get("schemaVersion") != 1:
        reasons.append("PRODUCER_RECEIPT_STATE_INVALID")

    decision = reviewer.get("decision")
    if decision not in {"ACCEPT", "REJECT"}:
        reasons.append("REVIEW_DECISION_UNKNOWN")
    elif decision != "ACCEPT":
        reasons.append("REVIEW_DECISION_NOT_ACCEPT")
    if reviewer.get("state") != "FINAL":
        reasons.append("REVIEW_STATE_NOT_FINAL")
    if reviewer.get("severityGate") != "Critical/High forces REJECT":
        reasons.append("REVIEW_SEVERITY_GATE_INVALID")
    if reviewer.get("successorGates") != "blocked-until-handoff":
        reasons.append("REVIEW_SUCCESSOR_GATE_STATE_INVALID")
    findings = reviewer.get("findings")
    if not isinstance(findings, list):
        reasons.append("REVIEW_FINDINGS_INVALID")
    else:
        for finding in findings:
            if not isinstance(finding, dict) or set(finding) != {"id", "severity", "summary"}:
                reasons.append("REVIEW_FINDING_INVALID")
                if not isinstance(finding, dict):
                    continue
            severity = finding.get("severity")
            if severity not in VALID_FINDING_SEVERITIES:
                reasons.append("REVIEW_FINDING_SEVERITY_UNKNOWN")
            if severity in {"Critical", "High"}:
                reasons.append("REVIEW_CRITICAL_HIGH_FINDING")

    if isinstance(ledger, dict):
        ledger_artifacts = ledger.get("artifacts")
        expected_manifest_artifacts = _derived_artifact_references(candidate)
        derived_paths: list[str] = []
        for reference in expected_manifest_artifacts:
            try:
                derived_paths.append(_validate_ref(reference).as_posix())
            except MutablePathError:
                reasons.append("CANDIDATE_DERIVED_ARTIFACT_INVALID")
        if len(derived_paths) != len(set(derived_paths)):
            reasons.append("CANDIDATE_DERIVED_ARTIFACT_DUPLICATE")
        manifest_artifacts = candidate_manifest.get("artifacts") if isinstance(candidate_manifest, dict) else None
        if manifest_artifacts != expected_manifest_artifacts:
            reasons.append("CANDIDATE_MANIFEST_ARTIFACTS_MISMATCH")
        expected_artifacts = expected_manifest_artifacts + [lineage["candidateManifest"], lineage["producerReceipt"]]
        if ledger_artifacts != expected_artifacts:
            reasons.append("RECOMPUTED_LEDGER_ARTIFACTS_MISMATCH")
        for reference in ledger_artifacts or []:
            try:
                _load_artifact(reference, fixture_root)
            except (MutablePathError, FileNotFoundError, ValueError, TypeError, json.JSONDecodeError):
                reasons.append("RECOMPUTED_LEDGER_ARTIFACT_INVALID")
        gates = ledger.get("successorGates")
        if not isinstance(gates, list):
            reasons.append("RECOMPUTED_LEDGER_GATES_INVALID")
        else:
            seen_gate_names = set()
            for gate in gates:
                if not isinstance(gate, dict):
                    reasons.append("RECOMPUTED_LEDGER_GATE_INVALID")
                    continue
                name = gate.get("name")
                seen_gate_names.add(name)
                body = {key: value for key, value in gate.items() if key != "recordSha256"}
                if gate.get("recordSha256") != _sha(_canonicalize(body)):
                    reasons.append("RECOMPUTED_LEDGER_GATE_HASH_MISMATCH")
                if gate.get("state") != "BLOCKED_UNTIL_HASH_BOUND_HANDOFF":
                    reasons.append("RECOMPUTED_LEDGER_GATE_STATE_INVALID")
            if seen_gate_names != EXPECTED_SUCCESSOR_GATES:
                reasons.append("RECOMPUTED_LEDGER_GATES_INCOMPLETE")


def _validate_parent_artifact(
    candidate: dict[str, Any],
    reasons: list[str],
) -> dict[str, Any]:
    """Validates one single base64 parent-artifact payload against its pin."""
    payload = candidate.get("parentArtifact")
    if not isinstance(payload, dict):
        reasons.append("PARENT_ARTIFACT_INVALID")
        return {"decision": "BLOCKED", "reasons": reasons}
    name = payload.get("name")
    encoded = payload.get("contentBase64")
    declared_sha = payload.get("sha256")
    declared_size = payload.get("size")
    kind = payload.get("kind")
    if not isinstance(name, str) or not isinstance(encoded, str):
        reasons.append("PARENT_ARTIFACT_INVALID")
        return {"decision": "BLOCKED", "reasons": reasons}
    if kind not in EXPECTED_PARENT_PIN_KINDS:
        reasons.append("PARENT_ARTIFACT_KIND_UNKNOWN")
    try:
        content = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error):
        reasons.append("PARENT_ARTIFACT_BASE64_INVALID")
        return {"decision": "BLOCKED", "reasons": reasons}
    actual_sha = _sha(content)
    actual_size = len(content)
    if actual_sha != declared_sha or actual_size != declared_size:
        reasons.append("PARENT_ARTIFACT_HASH_DRIFT")
    review_decision_required = True
    if name == "phase0-review-b-safety-20260730.json":
        review_decision_required = b"FAIL" in content
        if b"FAIL" not in content:
            reasons.append("PARENT_REVIEW_B_VERDICT_NOT_FAIL")
    elif name == "phase0-graph-baseline-producer-evidence-20260722.md":
        if b"audit ./graph.db --json` exited **`1`" not in content:
            reasons.append("PARENT_PRODUCER_EVIDENCE_AUDIT_NOT_ONE")
        if b"Phase S1 remains blocked" not in content:
            reasons.append("PARENT_PRODUCER_EVIDENCE_BLOCKED_NOT_ASSERTED")
    elif name == "red-rereview-correctness-20260730.json":
        if b"FAIL" not in content:
            reasons.append("PARENT_REVIEW_DECISION_NOT_FAIL")
    else:
        reasons.append("PARENT_ARTIFACT_NAME_UNKNOWN")
    if not review_decision_required and "PARENT_REVIEW_B_VERDICT_NOT_FAIL" not in reasons:
        reasons.append("PARENT_ARTIFACT_HASH_DRIFT")
    return {"decision": "BLOCKED", "reasons": reasons}


def _validate_parent_artifacts(
    candidate: dict[str, Any],
    reasons: list[str],
) -> dict[str, Any]:
    """Validates the parent-artifacts manifest structure without forcing a decision."""
    manifest = candidate.get("parentArtifacts")
    if not isinstance(manifest, dict):
        reasons.append("PARENT_ARTIFACTS_INVALID")
    else:
        artifacts = manifest.get("artifacts")
        if not isinstance(artifacts, dict):
            reasons.append("PARENT_ARTIFACTS_INVALID")
        else:
            for name, entry in artifacts.items():
                if not isinstance(entry, dict):
                    reasons.append("PARENT_ARTIFACTS_INVALID")
                    continue
                kind = entry.get("kind")
                if kind not in EXPECTED_PARENT_PIN_KINDS:
                    reasons.append("PARENT_ARTIFACTS_KIND_UNKNOWN")
                if not isinstance(entry.get("sha256"), str) or len(entry["sha256"]) != 64:
                    reasons.append("PARENT_ARTIFACTS_HASH_INVALID")
                if not isinstance(entry.get("size"), int) or entry["size"] < 0:
                    reasons.append("PARENT_ARTIFACTS_SIZE_INVALID")
                if name == "phase0-review-b-safety-20260730.json":
                    if entry.get("verdict") != "FAIL":
                        reasons.append("PARENT_REVIEW_B_VERDICT_NOT_FAIL")
                    open_findings = entry.get("openFindings")
                    if not isinstance(open_findings, list) or set(open_findings) != {"RB-01", "RB-02", "RB-03"}:
                        reasons.append("PARENT_REVIEW_B_FINDINGS_INCOMPLETE")
                elif name == "phase0-graph-baseline-producer-evidence-20260722.md":
                    if entry.get("auditExitCode") != 1:
                        reasons.append("PARENT_PRODUCER_EVIDENCE_AUDIT_NOT_ONE")
                elif name == "red-rereview-correctness-20260730.json":
                    if entry.get("decision") != "FAIL":
                        reasons.append("PARENT_REVIEW_DECISION_NOT_FAIL")
                else:
                    reasons.append("PARENT_ARTIFACTS_NAME_UNKNOWN")
    return {"decision": "BLOCKED", "reasons": reasons}


def _dedupe_reasons(reasons: list[str]) -> list[str]:
    """Returns reason codes in first-seen order without duplicates."""
    return list(dict.fromkeys(reasons))


def _validate_fixture_root(fixture_root: Any) -> Path | None:
    """Returns a usable trusted local fixture directory, or ``None``.

    @param fixture_root Fixture directory supplied at the public boundary.
    @returns The resolved directory when it is valid, otherwise ``None``.
    """
    if not isinstance(fixture_root, Path) or fixture_root.is_symlink():
        return None
    try:
        resolved = fixture_root.resolve(strict=True)
    except (OSError, RuntimeError, ValueError):
        return None
    return resolved if resolved.is_dir() else None


def _validate_candidate(candidate: Any, *, fixture_root: Path) -> dict[str, Any]:
    """Runs fail-closed validation after the public totality boundary."""
    reasons: list[str] = []
    if not isinstance(candidate, dict):
        return {"decision": "BLOCKED", "reasons": ["CANDIDATE_NOT_DICT"]}
    if "parentArtifact" in candidate:
        return _validate_parent_artifact(candidate, reasons)
    if "parentArtifacts" in candidate:
        return _validate_parent_artifacts(candidate, reasons)

    if not _validate_schema(candidate, reasons):
        return {"decision": "BLOCKED", "reasons": _dedupe_reasons(reasons)}
    if not _validate_envelope_shapes(candidate, reasons):
        return {"decision": "BLOCKED", "reasons": _dedupe_reasons(reasons)}

    _validate_worktree(candidate, reasons)
    _, replay, manifest = _validate_source_snapshot(candidate, fixture_root, reasons)
    graph = _validate_graph(candidate, fixture_root, replay, reasons)
    audit_disposition = _validate_audit(candidate, graph, manifest, replay, reasons)
    _validate_security_routes(candidate, replay, reasons)
    _validate_exclusions(candidate, replay, reasons)
    _validate_required_commands(candidate, manifest, fixture_root, reasons)
    _validate_upstream_issue(candidate, audit_disposition, fixture_root, reasons)
    _validate_parent_evidence(candidate, fixture_root, reasons)
    _validate_lineage(candidate, fixture_root, reasons)

    deduped = _dedupe_reasons(reasons)
    decision = "ACCEPT" if not deduped else "BLOCKED"
    return {"decision": decision, "reasons": deduped}


def validate_candidate(candidate: Any, *, fixture_root: Path) -> dict[str, Any]:
    """Validates one candidate envelope and always returns ``{decision, reasons}``.

    ``fixture_root`` must be a trusted local, non-symlink fixture directory
    containing the hash-pinned v1 artifacts referenced by the candidate. This
    API is deliberately scoped to the frozen repository root and baseline
    constants above; it is not a general-purpose validator for regenerated or
    portable fixture versions.

    The validator is fail-closed: ``ACCEPT`` is returned only when every gate
    (schema, worktree, source snapshot, graph, audit, security routes,
    exclusions, required commands, upstream issue, lineage) reports no
    failure. Otherwise the decision is ``BLOCKED`` and ``reasons`` lists every
    distinct reason code that fired so the independent reviewer can reproduce
    the verdict deterministically.

    @param candidate Candidate envelope or parent-evidence payload to validate.
    @param fixture_root Trusted local v1 fixture directory used for artifact replay.
    @returns A stable decision and deduplicated reason-code list.
    """
    trusted_root = _validate_fixture_root(fixture_root)
    if trusted_root is None:
        return {"decision": "BLOCKED", "reasons": ["FIXTURE_ROOT_INVALID"]}
    try:
        return _validate_candidate(candidate, fixture_root=trusted_root)
    except Exception as error:  # Boundary must remain total for hostile JSON-like input.
        return {
            "decision": "BLOCKED",
            "reasons": [f"VALIDATOR_INTERNAL_ERROR:{type(error).__name__}"],
        }
