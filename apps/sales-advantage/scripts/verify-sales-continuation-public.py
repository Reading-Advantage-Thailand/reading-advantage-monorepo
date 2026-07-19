#!/usr/bin/env python3
"""Fail-closed public and Cloud Run verification for the Sales continuation."""

from __future__ import annotations

import argparse
import json
import subprocess
import urllib.request
from pathlib import Path
from typing import Any

PROJECT = "reading-advantage"
REGION = "asia-southeast1"
SERVICE = "sales-advantage"
DOMAIN = "sales.reading-advantage.com"


def require(condition: bool, message: str) -> None:
    """Raise a stable verification error when a release assertion fails."""
    if not condition:
        raise RuntimeError(message)


def ready(resource: dict[str, Any]) -> bool:
    """Return whether a Google resource reports a true Ready condition."""
    return any(
        item.get("type") == "Ready" and str(item.get("status")).lower() == "true"
        for item in resource.get("status", {}).get("conditions", [])
    )


def load_json(path: Path) -> Any:
    """Read one untrusted JSON fixture."""
    return json.loads(path.read_text(encoding="utf-8"))


def gcloud_json(arguments: list[str]) -> Any:
    """Run gcloud and parse its JSON output."""
    output = subprocess.check_output(["gcloud", *arguments, "--format=json"], text=True)
    return json.loads(output)


def fetch_json(base_url: str, endpoint: str) -> Any:
    """Fetch and parse one public JSON endpoint."""
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{endpoint}",
        headers={"Accept": "application/json", "X-Request-Id": "sales-continuation"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        require(response.status == 200, f"{endpoint} returned HTTP {response.status}")
        return json.load(response)


def collect_live(args: argparse.Namespace) -> dict[str, Any]:
    """Collect current Cloud Run, domain, log, and public endpoint evidence."""
    service = gcloud_json(["run", "services", "describe", SERVICE, "--project", PROJECT, "--region", REGION, "--platform", "managed"])
    revision = gcloud_json(["run", "revisions", "describe", args.revision, "--project", PROJECT, "--region", REGION, "--platform", "managed"])
    domain = gcloud_json(["beta", "run", "domain-mappings", "describe", f"--domain={DOMAIN}", "--project", PROJECT, "--region", REGION, "--platform", "managed"])
    logs = gcloud_json(["logging", "read", f'resource.type="cloud_run_revision" AND resource.labels.service_name="{SERVICE}" AND resource.labels.revision_name="{args.revision}" AND severity>=ERROR', "--project", PROJECT, "--freshness=15m", "--limit=20"])
    base_url = args.base_url
    if not base_url and args.tag:
        tagged = next((item for item in service.get("status", {}).get("traffic", []) if item.get("tag") == args.tag), None)
        require(bool(tagged and tagged.get("url")), "candidate tag URL is absent")
        base_url = tagged["url"]
    base_url = base_url or f"https://{DOMAIN}"
    return {
        "service": service,
        "revision": revision,
        "domain": domain,
        "logs": logs,
        "health": fetch_json(base_url, "/api/health"),
        "ready": fetch_json(base_url, "/api/ready"),
    }


def collect_fixtures(directory: Path) -> dict[str, Any]:
    """Load deterministic public-verification fixtures."""
    return {
        name: load_json(directory / f"{name}.json")
        for name in ("service", "revision", "domain", "logs", "health", "ready")
    }


def verify(evidence: dict[str, Any], args: argparse.Namespace) -> None:
    """Validate mode, traffic, digest, domain, readiness, and clean logs."""
    revision = evidence["revision"]
    require(revision.get("metadata", {}).get("name") == args.revision, "revision identity mismatch")
    require(ready(revision), "revision is not ready")
    container = revision.get("spec", {}).get("containers", [{}])[0]
    require(container.get("image", "").endswith(f"@{args.digest}"), "revision digest mismatch")
    environment = {item.get("name"): item.get("value") for item in container.get("env", [])}
    require(environment.get("SALES_AUTH_MODE") == args.mode, "revision auth mode mismatch")

    traffic = evidence["service"].get("status", {}).get("traffic", [])
    matching = [item for item in traffic if item.get("revisionName") == args.revision]
    require(len(matching) == 1 and int(matching[0].get("percent", 0)) == args.traffic, "revision traffic mismatch")
    require(ready(evidence["domain"]), "custom domain is not ready")
    error_severities = {"ERROR", "CRITICAL", "ALERT", "EMERGENCY"}
    require(not any(item.get("severity") in error_severities for item in evidence["logs"]), "revision has error-severity logs")

    require(evidence["health"] == {"status": "alive", "service": SERVICE}, "health contract mismatch")
    readiness = evidence["ready"]
    require(readiness.get("status") == "ready" and readiness.get("service") == SERVICE, "readiness contract mismatch")
    require(readiness.get("mode") == args.mode, "public auth mode mismatch")
    dependencies = readiness.get("dependencies", {})
    require(dependencies.get("database") == "ready", "database readiness mismatch")
    expected_accounts = "ready" if args.mode == "company" else "not-required"
    require(dependencies.get("accounts") == expected_accounts, "Accounts readiness mismatch")


def main() -> None:
    """Parse arguments, collect evidence, and run the verifier."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture-dir", type=Path)
    parser.add_argument("--mode", choices=("company", "legacy-school"), required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--digest", required=True)
    parser.add_argument("--traffic", required=True, type=int)
    parser.add_argument("--tag")
    parser.add_argument("--base-url")
    args = parser.parse_args()
    evidence = collect_fixtures(args.fixture_dir) if args.fixture_dir else collect_live(args)
    verify(evidence, args)
    print(json.dumps({"event": "sales_continuation_public_verified", "mode": args.mode, "revision": args.revision, "digest": args.digest, "traffic": args.traffic}))


if __name__ == "__main__":
    main()
