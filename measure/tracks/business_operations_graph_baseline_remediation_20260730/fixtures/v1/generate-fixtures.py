"""Regenerates the frozen v1 Red-contract fixtures from source-anchored bytes."""
from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Sequence


REPO = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
HEAD = "3ff9b734a9e5a69f777108827b569e4f20a5ceb8"
SCHEMA = 1
ROUTES = [
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
]
EXCLUSIONS = [
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
]
CONFIG_PATHS = [
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
]
COMMANDS = [
    ("accounts-test", "CI=true pnpm --filter accounts test"),
    ("accounts-check-types", "CI=true pnpm --filter accounts check-types"),
    ("backend-test", "CI=true pnpm --filter @reading-advantage/backend test"),
    ("backend-check-types", "CI=true pnpm --filter @reading-advantage/backend check-types"),
    ("apk-test", "CI=true pnpm --filter @reading-advantage/advantage-play-kit test"),
    ("apk-check-types", "CI=true pnpm --filter @reading-advantage/advantage-play-kit check-types"),
    ("vocabulary-games-test", "CI=true pnpm --filter vocabulary-games test -- --runInBand"),
    ("vocabulary-games-check-types", "CI=true pnpm --filter vocabulary-games check-types"),
]
CAPABILITIES_PATH = "packages/backend/src/modules/company-identity/capabilities.ts"
SECURITY_CATEGORIES = (
    "authentication",
    "authorization",
    "validation",
    "scope",
    "audit",
    "destructiveEffect",
)
ROUTE_OPERATIONS = {
    "PUT /api/admin/employees/:accountId/company-roles": "company-role replacement",
    "PUT /api/admin/employees/:accountId/credential": "credential reset",
    "PUT /api/admin/employees/:accountId/roles": "application-role replacement",
    "DELETE /api/admin/employees/:accountId/sessions": "employee-session revocation",
    "PATCH /api/admin/employees/:accountId/status": "employee-status transition",
    "GET /api/admin/employees": "employee-directory listing",
    "POST /api/admin/employees": "employee creation",
    "GET /api/health": "process-liveness probe",
    "GET /api/oidc/authorize": "OIDC authorization-code request",
    "POST /api/oidc/introspect": "confidential-client introspection",
    "GET /api/oidc/jwks": "public signing-key publication",
    "POST /api/oidc/logout": "application-session logout",
    "POST /api/oidc/token": "OIDC authorization-code exchange",
    "GET /api/ready": "identity-database readiness probe",
    "POST /api/session/login": "employee sign-in",
    "POST /api/session/logout": "central SSO logout",
    "GET ": "Accounts sign-in or console page",
}
CAPABILITY_KEYS = {
    "PUT /api/admin/employees/:accountId/company-roles": "setCompanyRoles",
    "PUT /api/admin/employees/:accountId/credential": "resetCredential",
    "PUT /api/admin/employees/:accountId/roles": "setApplicationRoles",
    "DELETE /api/admin/employees/:accountId/sessions": "revokeSessions",
    "PATCH /api/admin/employees/:accountId/status": "setEmployeeStatus",
    "GET /api/admin/employees": "listEmployees",
    "POST /api/admin/employees": "createEmployee",
}
CAPABILITY_INPUT_TOKENS = {
    "setCompanyRoles": "input: companyRolesInputSchema",
    "resetCredential": "input: credentialInputSchema",
    "setApplicationRoles": "input: appRolesInputSchema",
    "revokeSessions": "input: revokeInputSchema",
    "setEmployeeStatus": "input: statusInputSchema",
    "listEmployees": "input: listEmployeesInputSchema",
    "createEmployee": "input: createInputSchema",
}
AUTHENTICATED_ROUTES = {
    *CAPABILITY_KEYS,
    "GET /api/oidc/authorize",
    "POST /api/oidc/introspect",
    "POST /api/oidc/logout",
}
VALIDATED_ROUTES = {
    *CAPABILITY_KEYS,
    "GET /api/oidc/authorize",
    "POST /api/oidc/introspect",
    "POST /api/oidc/logout",
    "POST /api/oidc/token",
    "POST /api/session/login",
    "POST /api/session/logout",
    "GET ",
}
DESTRUCTIVE_ROUTES = {
    "PUT /api/admin/employees/:accountId/company-roles",
    "PUT /api/admin/employees/:accountId/credential",
    "PUT /api/admin/employees/:accountId/roles",
    "DELETE /api/admin/employees/:accountId/sessions",
    "PATCH /api/admin/employees/:accountId/status",
    "POST /api/admin/employees",
    "POST /api/oidc/logout",
    "POST /api/session/logout",
}


def canonical(value: Any) -> bytes:
    """Returns the contract's canonical JSON bytes."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def digest(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest."""
    return hashlib.sha256(data).hexdigest()


def write_json(name: str, value: Any) -> dict[str, Any]:
    """Writes deterministic JSON and returns its immutable artifact reference."""
    data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
    (OUT / name).write_bytes(data)
    return {"path": name, "sha256": digest(data), "size": len(data)}


def tracked(path: str) -> bool:
    """Reports whether Git tracks a source path without changing the index."""
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", "--", path],
        cwd=REPO,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def archive_entry(path: str) -> dict[str, Any]:
    """Encodes one complete source file with replay metadata."""
    data = (REPO / path).read_bytes()
    return {
        "contentBase64": base64.b64encode(data).decode(),
        "mode": "100644",
        "path": path,
        "sha256": digest(data),
        "size": len(data),
        "state": "tracked" if tracked(path) else "untracked",
    }


def source_artifacts(branch: str, source_paths: list[str]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Writes a replayable source archive and its exact metadata manifest."""
    entries = [archive_entry(path) for path in sorted(set(source_paths))]
    archive = {
        "archiveKind": "source-snapshot",
        "encoding": "base64-per-entry",
        "entries": entries,
        "schemaVersion": SCHEMA,
    }
    archive_ref = write_json(f"snapshot-{branch}-v1.archive.json", archive)
    metadata = [{key: entry[key] for key in ("path", "sha256", "size", "mode", "state")} for entry in entries]
    denominator = digest(canonical(metadata))
    raw_state = {
        "porcelain": f"{branch}:porcelain:v1\n",
        "schemaVersion": SCHEMA,
        "stagedDiff": "",
        "status": f"{branch}:status:v1\n",
    }
    pre_state_ref = write_json(f"source-state-{branch}-pre-v1.json", raw_state)
    post_state_ref = write_json(f"source-state-{branch}-post-v1.json", raw_state)
    state_hashes = {
        "denominatorSha256": denominator,
        "porcelainSha256": digest(raw_state["porcelain"].encode()),
        "stagedDiffSha256": digest(raw_state["stagedDiff"].encode()),
        "statusSha256": digest(raw_state["status"].encode()),
    }
    discovery = {
        "candidateExtensions": [".ts", ".tsx", ".mts", ".cts"],
        "configPaths": sorted(CONFIG_PATHS),
        "rule": "frozen-repository-discovery-v1",
        "sourcePathCount": len(metadata),
        "sourcePathsSha256": digest(canonical([entry["path"] for entry in metadata])),
    }
    manifest = {
        "baselineHead": HEAD,
        "branch": "master",
        "discovery": discovery,
        "entries": metadata,
        "scanCommand": "repo-graph scan . ./graph.db",
        "scanConfig": None,
        "schemaVersion": SCHEMA,
        "toolVersion": "0.1.0",
        **state_hashes,
    }
    manifest_ref = write_json(f"snapshot-{branch}-v1.manifest.json", manifest)
    pre_state = {**state_hashes, "stateArtifact": pre_state_ref}
    post_state = {**state_hashes, "stateArtifact": post_state_ref}
    return archive_ref, manifest_ref, {
        "manifest": manifest,
        "postState": post_state,
        "preState": pre_state,
        "stateArtifacts": [pre_state_ref, post_state_ref],
    }


def source_range(path: str, method: str) -> tuple[int, int, str]:
    """Returns a stable exported-handler line range and digest from source bytes."""
    data = (REPO / path).read_bytes()
    lines = data.splitlines(keepends=True)
    text = data.decode()
    if path.endswith("page.tsx"):
        start, end = 1, len(lines)
    else:
        match = re.search(rf"^export\s+(?:async\s+)?function\s+{method}\b", text, re.MULTILINE)
        if not match:
            raise ValueError(f"missing {method} export in {path}")
        start = text[: match.start()].count("\n") + 1
        later = re.search(r"^export\s+(?:async\s+)?function\s+", text[match.end() :], re.MULTILINE)
        end = text[: match.end() + later.start()].count("\n") if later else len(lines)
    return start, end, digest(b"".join(lines[start - 1 : end]))


def assertion_anchor(
    category: str,
    path: str,
    required_tokens: list[str],
    forbidden_tokens: list[str] | None = None,
) -> dict[str, Any]:
    """Builds the smallest frozen source range containing all assertion tokens."""
    lines = (REPO / path).read_bytes().splitlines(keepends=True)
    token_lines = []
    for token in required_tokens:
        matches = [index for index, line in enumerate(lines, 1) if token.encode() in line]
        if not matches:
            raise ValueError(f"missing security assertion token {token!r} in {path}")
        token_lines.append(matches[0])
    start, end = min(token_lines), max(token_lines)
    range_bytes = b"".join(lines[start - 1 : end])
    for token in forbidden_tokens or []:
        if token.encode() in range_bytes:
            raise ValueError(f"forbidden security assertion token {token!r} in {path}:{start}-{end}")
    return {
        "category": category,
        "kind": "SecuritySourceRange",
        "lineEnd": end,
        "lineStart": start,
        "path": path,
        "sourceRangeSha256": digest(range_bytes),
    }


def source_assertion(
    *,
    category: str,
    disposition: str,
    claim: str,
    path: str,
    required_tokens: list[str],
    forbidden_tokens: list[str] | None,
    rationale: str,
) -> dict[str, Any]:
    """Creates one constrained, replayable, category-specific source assertion."""
    return {
        "anchor": assertion_anchor(category, path, required_tokens, forbidden_tokens),
        "assertion": {
            "claim": claim,
            "forbiddenTokens": forbidden_tokens or [],
            "requiredTokens": required_tokens,
            "rule": "all-required-and-no-forbidden-tokens-in-range",
        },
        "category": category,
        "disposition": disposition,
        "evidenceKind": "reviewed-source-assertion",
        "rationale": rationale,
    }


def route_security_assertions(method: str, route_path: str, source_path: str) -> list[dict[str, Any]]:
    """Returns six semantically constrained assertions for one Accounts route."""
    route_name = f"{method} {route_path}"
    operation = ROUTE_OPERATIONS[route_name]
    capability_key = CAPABILITY_KEYS.get(route_name)
    route_token = f"function {method}"

    if capability_key:
        authentication = source_assertion(
            category="authentication",
            disposition="authenticated",
            claim="authentication.session-evidence",
            path=source_path,
            required_tokens=["identityAuthenticationEvidence()"],
            forbidden_tokens=[],
            rationale=f"The {operation} adapter obtains opaque employee-session evidence before capability execution; anonymous evidence is therefore not silently treated as authenticated.",
        )
    elif route_name == "GET /api/oidc/authorize":
        authentication = source_assertion(
            category="authentication", disposition="authenticated", claim="authentication.sso-cookie-gate",
            path=source_path, required_tokens=["ssoSessionToken", "if (!ssoSessionToken)"], forbidden_tokens=[],
            rationale="OIDC authorization requires the host-only SSO cookie and redirects to sign-in when that cookie is absent, rather than issuing a code anonymously.",
        )
    elif route_name == "POST /api/oidc/introspect":
        authentication = source_assertion(
            category="authentication", disposition="authenticated", claim="authentication.basic-client-gate",
            path=source_path, required_tokens=['startsWith("Basic ")', "status: 401"], forbidden_tokens=[],
            rationale="Token introspection rejects requests without an HTTP Basic confidential-client credential before consulting application-session state.",
        )
    elif route_name == "POST /api/oidc/logout":
        authentication = source_assertion(
            category="authentication", disposition="authenticated", claim="authentication.bearer-gate",
            path=source_path, required_tokens=['startsWith("Bearer ")', "status: 401"], forbidden_tokens=[],
            rationale="Application logout requires a bearer session token and returns an invalid-token response before revocation when the credential is absent.",
        )
    else:
        public_tokens = {
            "GET /api/health": [route_token, 'status: "alive"'],
            "GET /api/ready": [route_token, "probeDatabase()"],
            "GET /api/oidc/jwks": [route_token, ".jwk"],
            "POST /api/oidc/token": [route_token, "service.exchangeCode"],
            "POST /api/session/login": [route_token, "service.authenticate"],
            "POST /api/session/logout": [route_token, "store.get(composition.cookie.name)"],
            "GET ": ["AccountsPage", "currentEmployee()"],
        }[route_name]
        authentication = source_assertion(
            category="authentication", disposition="public", claim="authentication.public-or-optional-session-entrypoint",
            path=source_path, required_tokens=public_tokens,
            forbidden_tokens=["identityAuthenticationEvidence"],
            rationale=f"The {operation} source exposes a public or optional-session entrypoint and contains no mandatory employee, Basic-client, or bearer authentication gate in the cited range.",
        )

    if capability_key:
        capability_token = f"companyIdentityCapabilityIds.{capability_key}"
        capability_binding = (
            f"id: {capability_token}"
            if capability_key == "listEmployees"
            else f"commandPolicies({capability_token}"
        )
        authorization = source_assertion(
            category="authorization", disposition="permission-checked", claim="authorization.company-admin-policy",
            path=CAPABILITIES_PATH,
            required_tokens=['authorization: { mode: "policy"', capability_binding], forbidden_tokens=[],
            rationale=f"The capability selected by the {operation} route inherits the exact company-admin policy instead of trusting an ad hoc role string in the HTTP adapter.",
        )
        validation = source_assertion(
            category="validation", disposition="request-validated", claim="validation.capability-input-schema",
            path=CAPABILITIES_PATH,
            required_tokens=[CAPABILITY_INPUT_TOKENS[capability_key], capability_binding], forbidden_tokens=[],
            rationale=f"The {operation} capability binds its transport input to the reviewed Zod-derived descriptor schema before the private service handler can run.",
        )
        scope = source_assertion(
            category="scope", disposition="global", claim="scope.company-global-policy",
            path=CAPABILITIES_PATH,
            required_tokens=['tenancy: { mode: "global"', capability_binding], forbidden_tokens=["tenantId", "schoolId"],
            rationale=f"The {operation} capability is explicitly owned by the company-identity global policy; no caller-provided school or tenant identifier selects its boundary.",
        )
        audit = source_assertion(
            category="audit", disposition="immutable-audit", claim="audit.immutable-capability-event",
            path=CAPABILITIES_PATH,
            required_tokens=["immutable: true", capability_binding], forbidden_tokens=[],
            rationale=f"The registered descriptor reached by {operation} requires an immutable capability audit event rather than relying on mutable request logging.",
        )
    else:
        authorization = source_assertion(
            category="authorization", disposition="public", claim="authorization.no-company-admin-capability",
            path=source_path, required_tokens=[route_token if route_path else "AccountsPage"],
            forbidden_tokens=["companyIdentityCapabilityIds", "COMPANY_ADMIN"],
            rationale=f"The {operation} adapter does not invoke a company-administration capability or claim company-role ownership; its protocol checks remain distinct from employee permissions.",
        )
        if route_name in VALIDATED_ROUTES:
            validation_tokens = {
                "GET /api/oidc/authorize": ["new URL(request.url)", "service.authorize"],
                "POST /api/oidc/introspect": ["request.formData()", "service.introspect"],
                "POST /api/oidc/logout": ['startsWith("Bearer ")', "service.localLogout"],
                "POST /api/oidc/token": ["request.formData()", "service.exchangeCode"],
                "POST /api/session/login": ["request.json()", "service.authenticate"],
                "POST /api/session/logout": ["requireSameOrigin(request)", "service.globalLogout"],
                "GET ": ['startsWith("/")', '!search.returnTo.startsWith("//")'],
            }[route_name]
            validation = source_assertion(
                category="validation", disposition="request-validated", claim="validation.protocol-or-service-boundary",
                path=source_path, required_tokens=validation_tokens, forbidden_tokens=[],
                rationale=f"The {operation} range performs protocol-shape checks or delegates the collected boundary values to the typed identity service before producing success.",
            )
        else:
            validation = source_assertion(
                category="validation", disposition="not-applicable", claim="validation.input-free-endpoint",
                path=source_path, required_tokens=[route_token, "NextResponse.json"], forbidden_tokens=["request.json", "request.formData", "searchParams.get"],
                rationale=f"The {operation} handler accepts no caller-controlled request payload or query value in the cited response path, so request-body validation is not applicable.",
            )
        scope = source_assertion(
            category="scope", disposition="global", claim="scope.global-protocol-endpoint",
            path=source_path, required_tokens=[route_token if route_path else "AccountsPage"], forbidden_tokens=["tenantId", "schoolId"],
            rationale=f"The {operation} is a company-wide identity or protocol endpoint and the frozen adapter range contains no frontend-selected tenant or school boundary.",
        )
        audit = source_assertion(
            category="audit", disposition="not-applicable", claim="audit.no-route-level-immutable-claim",
            path=source_path, required_tokens=[route_token if route_path else "AccountsPage"], forbidden_tokens=["immutable: true", "companyIdentityCapabilityIds"],
            rationale=f"The {operation} route makes no route-level immutable-audit claim; any downstream protocol persistence is deliberately not relabeled as capability audit evidence.",
        )

    destructive = route_name in DESTRUCTIVE_ROUTES
    destructive_tokens = {
        "PUT /api/admin/employees/:accountId/company-roles": ["setCompanyRoles", "targetAccountId"],
        "PUT /api/admin/employees/:accountId/credential": ["resetCredential", "targetAccountId"],
        "PUT /api/admin/employees/:accountId/roles": ["setApplicationRoles", "targetAccountId"],
        "DELETE /api/admin/employees/:accountId/sessions": ["revokeSessions", "targetAccountId"],
        "PATCH /api/admin/employees/:accountId/status": ["setEmployeeStatus", "targetAccountId"],
        "POST /api/admin/employees": ["createEmployee", "input: body"],
        "POST /api/oidc/logout": ["service.localLogout", "bearer.slice(7)"],
        "POST /api/session/logout": ["service.globalLogout", "maxAge: 0"],
    }
    effect = source_assertion(
        category="destructiveEffect",
        disposition="destructive" if destructive else "none",
        claim="destructiveEffect.employee-or-session-state-change" if destructive else "destructiveEffect.no-destructive-state-call",
        path=source_path,
        required_tokens=destructive_tokens.get(route_name, [route_token if route_path else "AccountsPage"]),
        forbidden_tokens=[] if destructive else ["resetCredential", "revokeSessions", "setEmployeeStatus", "service.localLogout", "service.globalLogout"],
        rationale=(
            f"The {operation} range invokes the named employee or session state transition, so its destructive effect is explicit and source-bound."
            if destructive else
            f"The {operation} range contains no credential reset, employee suspension, role replacement, or session-revocation call and therefore records no destructive effect."
        ),
    )
    assertions = [authentication, authorization, validation, scope, audit, effect]
    if tuple(item["category"] for item in assertions) != SECURITY_CATEGORIES:
        raise AssertionError(f"security category order drift for {route_name}")
    return assertions


def security_routes() -> list[dict[str, Any]]:
    """Builds the exact 17-node Accounts route denominator reported by Review B."""
    rows = []
    for method, route_path, source_path in ROUTES:
        start, end, range_sha = source_range(source_path, method)
        anchor = {
            "kind": "RouteHandler",
            "lineEnd": end,
            "lineStart": start,
            "name": f"{method} {route_path}",
            "path": source_path,
        }
        assertions = route_security_assertions(method, route_path, source_path)
        rows.append({
            "declarationAnchor": anchor,
            "fingerprint": digest(canonical(anchor)),
            "id": f"route:{source_path}:{method}:{route_path}",
            "lineEnd": end,
            "lineStart": start,
            "name": f"{method} {route_path}",
            "path": source_path,
            "security": assertions,
            "sourceRangeSha256": range_sha,
        })
    return rows


def exclusions_ledger(archive: dict[str, Any]) -> list[dict[str, Any]]:
    """Builds the exact 26-file TypeScript-minus-graph compensation ledger."""
    hashes = {entry["path"]: entry["sha256"] for entry in archive["entries"]}
    rows = []
    for path in EXCLUSIONS:
        if path.startswith("packages/advantage-play-kit/"):
            package = "@reading-advantage/advantage-play-kit"
            exclusion = "outside include src/**/*" if path.endswith("vitest.config.ts") else "src/**/*.test*.ts[x]"
        elif path.startswith("apps/advantage-games/"):
            package = "vocabulary-games"
            exclusion = "**/*.test.tsx or **/*.spec.ts"
        else:
            package = "@reading-advantage/backend"
            exclusion = "src/**/__tests__ or src/**/*.test.ts"
        rows.append({
            "adminCrmRelevance": "required compensating regression/type evidence",
            "class": "config" if path.endswith("vitest.config.ts") else ("test-support" if "test-support" in path or path.endswith("harness.ts") else "test"),
            "disposition": "source-hash-plus-required-package-gates",
            "package": package,
            "path": path,
            "sha256": hashes[path],
            "tsconfigExclusion": exclusion,
        })
    return rows


def command_artifact(branch: str, snapshot_sha: str, status: str = "PASS", suffix: str = "") -> dict[str, Any]:
    """Writes hash-bound stdout, stderr, exit, and snapshot command records."""
    records = []
    for name, command in COMMANDS:
        body = {
            "command": command,
            "exitCode": 0,
            "name": name,
            "snapshotManifestSha256": snapshot_sha,
            "status": status,
            "stderr": "",
            "stderrSha256": digest(b""),
            "stdout": f"fixture contract result: {name}: PASS\n",
        }
        body["stdoutSha256"] = digest(body["stdout"].encode())
        records.append({**body, "recordSha256": digest(canonical(body))})
    return write_json(f"command-results-{branch}{suffix}-v1.json", {"records": records, "schemaVersion": SCHEMA})


def artifact_ref(name: str) -> dict[str, Any]:
    """Returns the immutable reference for an already-written fixture."""
    data = (OUT / name).read_bytes()
    return {"path": name, "sha256": digest(data), "size": len(data)}


def upstream_issue_artifact() -> dict[str, Any]:
    """Writes the immutable minimal repo-graph limitation issue receipt."""
    return write_json("upstream-issue-compensation-v1.receipt.json", {
        "auditExcerptSha256": digest(b"17 routes; 2 fields; audit exit 1"),
        "commands": [
            "repo-graph scan . ./graph.db",
            "repo-graph audit ./graph.db --json",
        ],
        "expected": "scanner-emitted route and field nodes can be audited",
        "fixtureSha256": digest(b"minimal-route-field-fixture-v1"),
        "issueNumber": 123,
        "observed": "audit exit 1 retains scanner-emitted unaudited nodes",
        "repository": "bodangren/repo-graph",
        "schemaVersion": SCHEMA,
        "toolVersion": "0.1.0",
        "url": "https://github.com/bodangren/repo-graph/issues/123",
    })


def candidate(branch: str, compensation: bool) -> dict[str, Any]:
    """Generates one internally consistent candidate and distinct role artifacts."""
    route_paths = [path for _, _, path in ROUTES]
    common = route_paths + ["apps/accounts/app/layout.tsx", CAPABILITIES_PATH] + CONFIG_PATHS
    source_paths = common + EXCLUSIONS
    archive_ref, source_manifest_ref, source = source_artifacts(branch, source_paths)
    archive = json.loads((OUT / archive_ref["path"]).read_text())
    ts_paths = sorted(entry["path"] for entry in archive["entries"] if entry["path"].endswith((".ts", ".tsx", ".mts", ".cts")))
    base_graph_files = sorted(set(route_paths + ["apps/accounts/app/layout.tsx", CAPABILITIES_PATH]))
    graph_files = base_graph_files if compensation else ts_paths
    graph_rows = [{"path": path, "sourceSha256": next(e["sha256"] for e in archive["entries"] if e["path"] == path)} for path in graph_files]
    graph_ref = write_json(f"graph-{branch}-v1.json", {
        "commitSha": None,
        "fileRows": graph_rows,
        "scanCommand": "repo-graph scan . ./graph.db",
        "scanConfig": None,
        "schemaVersion": "2.0.0",
        "sourceManifestSha256": source_manifest_ref["sha256"],
        "toolVersion": "0.1.0",
    })
    commands_ref = command_artifact(branch, source_manifest_ref["sha256"])
    routes = security_routes()
    fields = []
    for name in ("metadata.description", "metadata.title"):
        path = "apps/accounts/app/layout.tsx"
        data = (REPO / path).read_bytes()
        lines = data.splitlines(keepends=True)
        token = name.split(".")[-1]
        line = next(i for i, value in enumerate(lines, 1) if re.search(rf"\b{token}\s*:", value.decode()))
        anchor = {"kind": "PropertyAssignment", "lineEnd": line, "lineStart": line, "name": name, "path": path}
        fields.append({
            "declarationAnchor": anchor,
            "fingerprint": digest(canonical(anchor)),
            "id": f"field:{path}:{name}",
            "lineEnd": line,
            "lineStart": line,
            "name": name,
            "path": path,
            "sourceRangeSha256": digest(lines[line - 1]),
        })
    audit = {
        "disposition": "compensation" if compensation else "clean",
        "duplicate": [],
        "exitCode": 1 if compensation else 0,
        "missing": [],
        "orphan": [],
        "stale": [],
        "state": "COMPENSATED" if compensation else "CLEAN",
        "unauditedFields": fields if compensation else [],
        "unauditedRoutes": [{key: row[key] for key in ("id", "name", "path", "lineStart", "lineEnd", "fingerprint", "sourceRangeSha256", "declarationAnchor")} for row in routes] if compensation else [],
    }
    reconciliation = None
    if compensation:
        route_reconciliation = [copy.deepcopy(row) for row in audit["unauditedRoutes"]]
        field_reconciliation = [{**row} for row in fields]
        inventory = {"fields": audit["unauditedFields"], "routes": audit["unauditedRoutes"]}
        reconciliation = {
            "fieldCount": len(fields),
            "fieldReconciliation": field_reconciliation,
            "firstInventorySha256": digest(canonical(inventory)),
            "limitation": "repo-graph 0.1.0 cannot audit scanner-emitted route and field nodes without a full rerun",
            "routeCount": len(routes),
            "routeReconciliation": route_reconciliation,
            "secondInventorySha256": digest(canonical(inventory)),
            "toolLimitation": True,
        }
    ledger = exclusions_ledger(archive) if compensation else []
    parent_ref = artifact_ref("parent-fail-artifacts-v1/manifest.json")
    issue_receipt_ref = upstream_issue_artifact() if compensation else None
    core = {
        "audit": audit,
        "candidateId": f"{branch}-v1",
        "compensation": reconciliation,
        "exclusions": {
            "candidateTypeScript": ts_paths,
            "graphFiles": graph_files,
            "ledger": ledger,
        },
        "graph": graph_ref,
        "parentEvidence": parent_ref,
        "requiredCommands": {
            "artifact": commands_ref,
            "requiredNames": [name for name, _ in COMMANDS],
        },
        "schemaVersion": SCHEMA,
        "securityRoutes": {
            "denominatorSource": "Review B unaudited Accounts routes at baseline HEAD",
            "discoveredRouteCount": len(routes),
            "knownAccountsRouteMinimum": 17,
            "routes": routes,
        },
        "sourceSnapshot": {
            "archive": archive_ref,
            "baselineHead": HEAD,
            "branch": "master",
            "manifest": source_manifest_ref,
            "postScan": source["postState"],
            "preScan": source["preState"],
            "scanCommand": "repo-graph scan . ./graph.db",
            "scanConfig": None,
            "toolVersion": "0.1.0",
        },
        "upstreamIssue": {
            "decisionReason": "verified-repo-graph-tool-limitation" if compensation else "documented-clean-path",
            "issue": {
                "number": 123,
                "receipt": issue_receipt_ref,
                "url": "https://github.com/bodangren/repo-graph/issues/123",
            } if compensation else None,
            "required": compensation,
            "state": "REQUIRED_RECORDED" if compensation else "NOT_REQUIRED",
        },
        "worktree": {
            "baselineHead": HEAD,
            "branch": "master",
            "root": str(REPO),
            "singleSharedWorktree": True,
            "state": "VERIFIED",
            "worktreeCount": 1,
        },
    }
    candidate_sha = digest(canonical(core))
    derived_artifacts = [
        archive_ref,
        source_manifest_ref,
        *source["stateArtifacts"],
        graph_ref,
        commands_ref,
        parent_ref,
    ]
    if issue_receipt_ref is not None:
        derived_artifacts.append(issue_receipt_ref)
    candidate_manifest = {
        "artifacts": derived_artifacts,
        "candidateId": core["candidateId"],
        "candidateSha256": candidate_sha,
        "schemaVersion": SCHEMA,
        "successorGates": [
            {"name": "small_company_admin_privileges_20260722:Phase-S1", "state": "BLOCKED_UNTIL_HASH_BOUND_HANDOFF"},
            {"name": "customer_licensing_crm_20260722:contract-schema-red", "state": "BLOCKED_UNTIL_HASH_BOUND_HANDOFF"},
        ],
    }
    manifest_ref = write_json(f"candidate-{branch}-v1.manifest.json", candidate_manifest)
    producer_ref = write_json(f"producer-{branch}-v1.receipt.json", {
        "candidateManifest": manifest_ref,
        "candidateSha256": candidate_sha,
        "identity": "producer@example.test",
        "role": "producer",
        "schemaVersion": SCHEMA,
        "state": "CANDIDATE_PUBLISHED",
        "timestamp": "2026-07-30T00:00:00Z",
    })
    recomputed = [*candidate_manifest["artifacts"], manifest_ref, producer_ref]
    gate_rows = [{**gate, "recordSha256": digest(canonical(gate))} for gate in candidate_manifest["successorGates"]]
    ledger_ref = write_json(f"reviewer-{branch}-v1.artifact-ledger.json", {
        "artifacts": recomputed,
        "candidateSha256": candidate_sha,
        "schemaVersion": SCHEMA,
        "successorGates": gate_rows,
    })
    reviewer_body = {
        "candidateManifest": manifest_ref,
        "candidateSha256": candidate_sha,
        "decision": "ACCEPT",
        "findings": [],
        "identity": "reviewer@example.test",
        "producerReceipt": producer_ref,
        "recomputedArtifactLedger": ledger_ref,
        "role": "independent-reviewer",
        "schemaVersion": SCHEMA,
        "severityGate": "Critical/High forces REJECT",
        "state": "FINAL",
        "successorGates": "blocked-until-handoff",
        "timestamp": "2026-07-30T01:00:00Z",
    }
    reviewer_ref = write_json(f"reviewer-{branch}-v1.receipt.json", reviewer_body)
    core["lineage"] = {
        "candidateManifest": manifest_ref,
        "producerReceipt": producer_ref,
        "recomputedArtifactLedger": ledger_ref,
        "reviewerReceipt": reviewer_ref,
    }
    return core


def invalid_corpus(clean: dict[str, Any], compensation: dict[str, Any]) -> dict[str, Any]:
    """Returns focused mutations for branch, state, evidence, and lineage boundaries."""
    unknown_review = copy.deepcopy(json.loads((OUT / clean["lineage"]["reviewerReceipt"]["path"]).read_text()))
    unknown_review["decision"] = "MAYBE"
    unknown_review_ref = write_json("reviewer-clean-unknown-state-v1.receipt.json", unknown_review)
    unknown_severity = copy.deepcopy(unknown_review)
    unknown_severity["decision"] = "REJECT"
    unknown_severity["findings"] = [{"id": "UNKNOWN", "severity": "Urgent"}]
    unknown_severity_ref = write_json("reviewer-clean-unknown-severity-v1.receipt.json", unknown_severity)
    command_unknown_ref = command_artifact("clean", clean["sourceSnapshot"]["manifest"]["sha256"], "UNKNOWN", "-unknown-state")
    copied_route = clean["securityRoutes"]["routes"][0]
    copied_route_wide_set: dict[str, Any] = {}
    for index, evidence in enumerate(copied_route["security"]):
        copied_route_wide_set[f"securityRoutes.routes.0.security.{index}.anchor"] = {
            "category": evidence["category"],
            "kind": "SecuritySourceRange",
            "lineEnd": copied_route["lineEnd"],
            "lineStart": copied_route["lineStart"],
            "path": copied_route["path"],
            "sourceRangeSha256": copied_route["sourceRangeSha256"],
        }
        copied_route_wide_set[f"securityRoutes.routes.0.security.{index}.assertion.requiredTokens"] = ["function PUT"]
        copied_route_wide_set[f"securityRoutes.routes.0.security.{index}.assertion.forbiddenTokens"] = []
        copied_route_wide_set[f"securityRoutes.routes.0.security.{index}.rationale"] = (
            "The same whole-handler range is copied as evidence without proving this category."
        )
    return {
        "schemaVersion": SCHEMA,
        "sourceSnapshot": [
            {"id": "archive-digest-tampered", "base": "clean", "set": {"sourceSnapshot.archive.sha256": "0" * 64}, "reasonCodes": ["ARCHIVE_DIGEST_MISMATCH"]},
            {"id": "archive-mutable-path", "base": "clean", "set": {"sourceSnapshot.archive.path": "../live.json"}, "reasonCodes": ["MUTABLE_EVIDENCE_PATH"]},
            {"id": "pre-scan-denominator-drift", "base": "clean", "set": {"sourceSnapshot.preScan.denominatorSha256": "0" * 64}, "reasonCodes": ["PRE_SCAN_DENOMINATOR_DRIFT"]},
            {"id": "post-scan-status-drift", "base": "clean", "set": {"sourceSnapshot.postScan.statusSha256": "0" * 64}, "reasonCodes": ["POST_SCAN_DRIFT"]},
            {"id": "manifest-missing", "base": "clean", "delete": ["sourceSnapshot.manifest"], "reasonCodes": ["SOURCE_MANIFEST_MISSING"]},
        ],
        "graphReconciliation": [
            {"id": "graph-artifact-hash", "base": "clean", "set": {"graph.sha256": "0" * 64}, "reasonCodes": ["GRAPH_ARTIFACT_HASH_MISMATCH"]},
            {"id": "graph-outside-snapshot", "base": "clean", "set": {"exclusions.graphFiles.0": "outside.ts"}, "reasonCodes": ["GRAPH_FILE_NOT_IN_SNAPSHOT"]},
        ],
        "auditBranches": [
            {"id": "nonzero-labeled-clean", "base": "clean", "set": {"audit.exitCode": 1}, "reasonCodes": ["CLEAN_AUDIT_NOT_ZERO"]},
            {"id": "clean-with-compensation", "base": "compensation", "set": {"audit.exitCode": 0, "audit.disposition": "clean", "audit.state": "CLEAN"}, "reasonCodes": ["CLEAN_AUDIT_NOT_EMPTY", "CLEAN_BRANCH_HAS_COMPENSATION"]},
            {"id": "compensation-empty", "base": "compensation", "set": {"audit.unauditedRoutes": [], "audit.unauditedFields": [], "compensation.routeCount": 0, "compensation.fieldCount": 0}, "reasonCodes": ["COMPENSATION_DENOMINATOR_EMPTY"]},
            {"id": "compensation-project-owned-no-issue", "base": "compensation", "set": {"compensation.toolLimitation": False, "upstreamIssue.required": False, "upstreamIssue.issue": None, "upstreamIssue.state": "NOT_REQUIRED"}, "reasonCodes": ["PROJECT_OWNED_COMPENSATION_FORBIDDEN"]},
            {"id": "unknown-audit-state", "base": "clean", "set": {"audit.state": "UNKNOWN"}, "reasonCodes": ["AUDIT_STATE_UNKNOWN"]},
            {"id": "unknown-audit-disposition", "base": "clean", "set": {"audit.disposition": "maybe"}, "reasonCodes": ["AUDIT_DISPOSITION_UNKNOWN"]},
        ],
        "compensationLedgers": [
            {"id": "omitted-review-b-route", "base": "compensation", "delete": ["securityRoutes.routes.0"], "reasonCodes": ["SECURITY_ROUTE_DENOMINATOR_MISMATCH"]},
            {"id": "omitted-route-anchor", "base": "compensation", "delete": ["compensation.routeReconciliation.0.declarationAnchor"], "reasonCodes": ["DECLARATION_ANCHOR_MISSING"]},
            {"id": "route-range-hash", "base": "compensation", "set": {"compensation.routeReconciliation.0.sourceRangeSha256": "0" * 64}, "reasonCodes": ["ROUTE_SOURCE_RANGE_HASH_MISMATCH"]},
            {"id": "omitted-exclusion", "base": "compensation", "delete": ["exclusions.ledger.0"], "reasonCodes": ["EXCLUSION_LEDGER_INCOMPLETE"]},
            {"id": "candidate-denominator-drift", "base": "compensation", "delete": ["exclusions.candidateTypeScript.0"], "reasonCodes": ["EXCLUSION_DENOMINATOR_DRIFT"]},
            {"id": "command-artifact-hash", "base": "clean", "set": {"requiredCommands.artifact.sha256": "0" * 64}, "reasonCodes": ["COMMAND_ARTIFACT_HASH_MISMATCH"]},
            {"id": "command-unknown-state", "base": "clean", "set": {"requiredCommands.artifact": command_unknown_ref}, "reasonCodes": ["COMMAND_STATE_UNKNOWN"]},
        ],
        "securityDispositions": [
            {"id": "security-category-missing", "base": "clean", "delete": ["securityRoutes.routes.0.security.0.category"], "reasonCodes": ["SECURITY_CATEGORY_MISSING"]},
            {"id": "security-category-duplicated", "base": "clean", "append": {"securityRoutes.routes.0.security": {"category": "authentication", "disposition": "public", "evidenceKind": "reviewed-source-assertion", "rationale": "authentication: duplicate", "anchor": {}}}, "reasonCodes": ["SECURITY_CATEGORY_DUPLICATE"]},
            {"id": "security-category-unsupported", "base": "clean", "set": {"securityRoutes.routes.0.security.0.category": "csrf"}, "reasonCodes": ["SECURITY_CATEGORY_UNSUPPORTED"]},
            {"id": "security-disposition-missing", "base": "clean", "delete": ["securityRoutes.routes.0.security.0.disposition"], "reasonCodes": ["SECURITY_DISPOSITION_MISSING"]},
            {"id": "security-disposition-fabricated", "base": "clean", "set": {"securityRoutes.routes.0.security.0.disposition": "implicitly-trusted"}, "reasonCodes": ["SECURITY_DISPOSITION_UNSUPPORTED"]},
            {"id": "security-evidence-kind-fabricated", "base": "clean", "set": {"securityRoutes.routes.0.security.0.evidenceKind": "reviewed-by-generator"}, "reasonCodes": ["SECURITY_EVIDENCE_KIND_UNSUPPORTED"]},
            {"id": "copied-route-wide-evidence", "base": "clean", "set": copied_route_wide_set, "reasonCodes": ["SECURITY_EVIDENCE_COPIED_ACROSS_CATEGORIES"]},
            {"id": "fabricated-category-assertion", "base": "clean", "set": {"securityRoutes.routes.0.security.1.assertion.claim": "authorization.no-company-admin-capability"}, "reasonCodes": ["SECURITY_ASSERTION_SOURCE_MISMATCH"]},
            {"id": "public-exception-source-mismatch", "base": "clean", "set": {
                "securityRoutes.routes.7.security.0.anchor": copy.deepcopy(clean["securityRoutes"]["routes"][0]["security"][0]["anchor"]),
                "securityRoutes.routes.7.security.0.assertion": copy.deepcopy(clean["securityRoutes"]["routes"][0]["security"][0]["assertion"]),
            }, "reasonCodes": ["SECURITY_EXCEPTION_SOURCE_MISMATCH"]},
            {"id": "admin-public-exception-fabricated", "base": "clean", "set": {"securityRoutes.routes.0.security.0.disposition": "public"}, "reasonCodes": ["SECURITY_EXCEPTION_SOURCE_MISMATCH"]},
            {"id": "public-route-authenticated", "base": "clean", "set": {"securityRoutes.routes.7.security.0.disposition": "authenticated"}, "reasonCodes": ["PUBLIC_ROUTE_AUTHENTICATED"]},
            {"id": "global-route-tenant-scoped", "base": "clean", "set": {"securityRoutes.routes.7.security.3.disposition": "tenant-scoped"}, "reasonCodes": ["GLOBAL_ROUTE_TENANT_SCOPED"]},
        ],
        "acceptance": [
            {"id": "required-issue-missing", "base": "compensation", "set": {"upstreamIssue.issue": None}, "reasonCodes": ["UPSTREAM_ISSUE_REQUIRED"]},
            {"id": "clean-issue-present", "base": "clean", "set": {"upstreamIssue.required": True, "upstreamIssue.state": "REQUIRED_RECORDED", "upstreamIssue.issue": {"url": "https://example.test/1"}}, "reasonCodes": ["UPSTREAM_ISSUE_NOT_PERMITTED"]},
            {"id": "producer-self-review", "base": "clean", "set": {"lineage.reviewerReceipt": clean["lineage"]["producerReceipt"]}, "reasonCodes": ["PRODUCER_SELF_APPROVAL"]},
            {"id": "reviewer-receipt-hash", "base": "clean", "set": {"lineage.reviewerReceipt.sha256": "0" * 64}, "reasonCodes": ["REVIEW_RECEIPT_HASH_MISMATCH"]},
            {"id": "unknown-review-decision", "base": "clean", "set": {"lineage.reviewerReceipt": unknown_review_ref}, "reasonCodes": ["REVIEW_DECISION_UNKNOWN"]},
            {"id": "unknown-finding-severity", "base": "clean", "set": {"lineage.reviewerReceipt": unknown_severity_ref}, "reasonCodes": ["REVIEW_FINDING_SEVERITY_UNKNOWN"]},
            {"id": "worktree-unknown-state", "base": "clean", "set": {"worktree.state": "UNKNOWN"}, "reasonCodes": ["WORKTREE_STATE_UNKNOWN"]},
            {"id": "worktree-wrong-branch", "base": "clean", "set": {"worktree.branch": "feature"}, "reasonCodes": ["WORKTREE_BRANCH_NOT_MASTER"]},
            {"id": "worktree-multiple", "base": "clean", "set": {"worktree.worktreeCount": 2}, "reasonCodes": ["WORKTREE_COUNT_NOT_ONE"]},
            {"id": "unexpected-candidate-field", "base": "clean", "set": {"unexpected": True}, "reasonCodes": ["CANDIDATE_UNKNOWN_FIELD"]},
        ],
        "antiPatterns": [
            {"id": "a3-count", "base": "compensation", "set": {"securityRoutes.discoveredRouteCount": 99}, "reasonCodes": ["SECURITY_ROUTE_COUNT_MISMATCH"]},
            {"id": "a4-vacuous", "base": "compensation", "set": {"compensation.routeCount": 0}, "reasonCodes": ["COMPENSATION_DENOMINATOR_EMPTY"]},
            {"id": "a5-conflict", "base": "clean", "set": {"audit.disposition": "compensation"}, "reasonCodes": ["AUDIT_DISPOSITION_MISMATCH"]},
            {"id": "a7-filter-drop", "base": "clean", "delete": ["requiredCommands.requiredNames.0"], "reasonCodes": ["REQUIRED_COMMAND_MISSING"]},
            {"id": "a15-stale-producer", "base": "clean", "set": {"lineage.producerReceipt.sha256": "0" * 64}, "reasonCodes": ["PRODUCER_RECEIPT_HASH_MISMATCH"]},
            {"id": "a16-shared-flag", "base": "clean", "delete": ["worktree.singleSharedWorktree"], "reasonCodes": ["WORKTREE_SINGLE_SHARED_FLAG_MISSING"]},
        ],
    }


def _generate_all(output: Path) -> None:
    """Writes all generated v1 fixtures into the supplied output directory."""
    global OUT

    previous_out = OUT
    OUT = output
    try:
        clean = candidate("clean", False)
        compensation = candidate("compensation", True)
        write_json("candidate-envelopes-v1.json", {"candidates": {"clean": clean, "compensation": compensation}, "schemaVersion": SCHEMA})
        write_json("invalid-candidates-v1.json", invalid_corpus(clean, compensation))
        names = sorted(path.name for path in OUT.glob("*.json") if path.name != "fixture-index-v1.json")
        names.append("generate-fixtures.py")
        write_json("fixture-index-v1.json", {
            "artifacts": [artifact_ref(name) for name in sorted(names)],
            "schemaVersion": SCHEMA,
        })
    finally:
        OUT = previous_out


def _fixture_files(root: Path) -> dict[str, bytes]:
    """Returns fixture file bytes while ignoring interpreter bytecode caches."""
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in root.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    }


def _check_generated_fixtures() -> int:
    """Regenerates into a temporary directory and reports any fixture drift."""
    with tempfile.TemporaryDirectory(prefix="r0-fixture-check-") as directory:
        expected_root = Path(directory)
        shutil.copy2(Path(__file__), expected_root / "generate-fixtures.py")
        shutil.copytree(
            OUT / "parent-fail-artifacts-v1",
            expected_root / "parent-fail-artifacts-v1",
        )
        _generate_all(expected_root)

        expected_files = _fixture_files(expected_root)
        actual_files = _fixture_files(OUT)
        mismatches: list[str] = []
        for name in sorted(set(expected_files) | set(actual_files)):
            if expected_files.get(name) != actual_files.get(name):
                mismatches.append(name)

    if mismatches:
        print("CHECK FAIL: fixture drift detected", file=sys.stderr)
        for name in mismatches:
            print(f"- {name}", file=sys.stderr)
        return 1
    print(f"CHECK PASS: {len(actual_files)} fixture files match; no fixtures written")
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    """Checks or regenerates all v1 fixtures according to the requested mode."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="compare regenerated fixtures without writing the fixture directory",
    )
    args = parser.parse_args(argv)
    if args.check:
        return _check_generated_fixtures()

    _generate_all(OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
