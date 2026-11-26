#!/usr/bin/env bash
set -euo pipefail

# Python 3 is available in the Cloud SDK builder and on the GitHub runner.
exec python3 - "$(dirname "${BASH_SOURCE[0]}")/traffic-hold.txt" "$@" <<'PY'
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def report(message):
    print(message, flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            print(message, file=summary)


def fail(message):
    report(f"traffic: ERROR: {message}")
    sys.exit(1)


if len(sys.argv) != 6 or sys.argv[5] not in ("direct", "gated"):
    fail("usage: ensure-traffic.sh SERVICE REGION PROJECT direct|gated")

hold_file, service, region, project, mode = sys.argv[1:]
scope = ["--region", region, "--project", project]

try:
    holds = {}
    for line in Path(hold_file).read_text().splitlines():
        if line and not line.startswith("#"):
            name, workflow, reason = line.split("|")
            if not name or not workflow or not reason or name in holds:
                raise ValueError("invalid hold entry")
            holds[name] = (workflow, reason)
except (OSError, ValueError) as error:
    fail(f"could not read traffic hold list: {error}")

hold = holds.get(service)
if mode == "gated" and not hold:
    fail(f"{service} has no manual traffic entry")


def gcloud(args, error):
    try:
        return subprocess.check_output(["gcloud", *args], text=True)
    except (OSError, subprocess.CalledProcessError):
        fail(error)


def describe():
    raw = gcloud(
        ["run", "services", "describe", service, *scope, "--format", "json"],
        f"could not describe {service}",
    )
    try:
        status = json.loads(raw)["status"]
        latest = status.get("latestReadyRevisionName")
        if not isinstance(latest, str) or not latest:
            fail(f"{service} has no latest ready revision")
        if status.get("latestCreatedRevisionName", latest) != latest:
            fail(f"{service}: the latest created revision is not ready")
        serving = {}
        follows_latest = 0
        for target in status["traffic"]:
            percent = target.get("percent", 0)
            if type(percent) is not int or not 0 <= percent <= 100:
                raise ValueError("invalid traffic percent")
            if not percent:
                continue
            follows = target.get("latestRevision") is True
            revision = target.get("revisionName") or (latest if follows else None)
            if not isinstance(revision, str) or not revision:
                raise ValueError("missing serving revision")
            if follows and revision != latest:
                raise ValueError("LATEST points to a different serving revision")
            serving[revision] = serving.get(revision, 0) + percent
            if follows:
                follows_latest += percent
        if sum(serving.values()) != 100:
            raise ValueError("traffic does not total 100 percent")
        return latest, serving, follows_latest
    except (ValueError, TypeError, KeyError, AttributeError) as error:
        fail(f"{service}: invalid service traffic data: {error}")


def warn_if_stale(latest, serving):
    # Default Cloud Run names contain the revision number, even if old revisions
    # have been deleted. For custom names, use creation order instead.
    def number(revision):
        match = re.fullmatch(re.escape(service) + r"-(\d{5,})-[a-z0-9]+", revision)
        return int(match[1]) if match else None

    order = None
    for revision in serving:
        if number(latest) is not None and number(revision) is not None:
            distance = number(latest) - number(revision)
        else:
            if order is None:
                raw = gcloud(
                    ["run", "revisions", "list", "--service", service, *scope,
                     "--sort-by", "metadata.creationTimestamp", "--format", "json"],
                    f"could not list revisions for {service}",
                )
                try:
                    order = [entry["metadata"]["name"] for entry in json.loads(raw)]
                except (ValueError, TypeError, KeyError) as error:
                    fail(f"{service}: invalid revision list: {error}")
            if revision not in order or latest not in order:
                fail(f"{service}: could not determine revision distance")
            distance = order.index(latest) - order.index(revision)
        if distance > 1:
            report(f"WARNING: Serving revision {revision} is more than one revision behind {latest}.")


latest, serving, follows_latest = describe()
if serving == {latest: 100}:
    report(f"traffic: ok. {latest} serves 100% of traffic for {service}.")
elif hold and latest not in serving:
    workflow, reason = hold
    old = ", ".join(
        revision if percent == 100 else f"{revision} ({percent}%)"
        for revision, percent in serving.items()
    )
    report(f"traffic: HELD. Revision {latest} is ready and takes NO traffic. "
           f"Serving: {old}. To route traffic, run {workflow}.")
    report(f"traffic: hold reason: {reason}.")
    warn_if_stale(latest, serving)
elif hold or len(serving) != 1:
    fail(f"{service}: unexpected traffic split: {serving}; latest ready revision: {latest}")
else:
    gcloud(
        ["run", "services", "update-traffic", service, *scope, "--to-latest", "--quiet"],
        f"could not restore traffic to LATEST for {service}",
    )
    confirmed, traffic, follows_latest = describe()
    if confirmed != latest or traffic != {latest: 100} or follows_latest != 100:
        fail(f"could not confirm 100% traffic to LATEST ({latest}) for {service}")
    report(f"traffic: ok. Restored LATEST for {service}; {latest} serves 100% of traffic.")
PY
