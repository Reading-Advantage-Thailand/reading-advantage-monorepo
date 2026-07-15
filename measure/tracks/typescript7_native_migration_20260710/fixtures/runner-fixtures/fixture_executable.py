#!/usr/bin/env python3
"""Emit pinned stdout, stderr, and exit status from a JSON fixture record."""

from __future__ import annotations

import json
import signal
import sys
import time
from pathlib import Path
from typing import Any


def _load_record(path: Path) -> dict[str, Any]:
    """Load a deterministic subprocess fixture.

    Args:
        path: JSON fixture path supplied by the contract test.

    Returns:
        Parsed fixture object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("fixture root must be a JSON object")
    return value


def main() -> int:
    """Write fixture streams and return the pinned process exit status.

    Returns:
        Configured subprocess exit status.
    """
    if len(sys.argv) != 2:
        raise SystemExit("usage: fixture_executable.py FIXTURE.json")
    record = _load_record(Path(sys.argv[1]))
    stdout = record.get("stdout", "")
    stderr = record.get("stderr", "")
    if "stdout_json" in record:
        stdout = json.dumps(record["stdout_json"], sort_keys=True) + "\n"
    if not isinstance(stdout, str) or not isinstance(stderr, str):
        raise ValueError("stdout and stderr must be strings")
    exit_status = record.get("exit_status", 0)
    if isinstance(exit_status, bool) or not isinstance(exit_status, int):
        raise ValueError("exit_status must be an integer")
    if record.get("ignore_sigterm") is True:
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
    sys.stdout.write(stdout)
    sys.stderr.write(stderr)
    sleep_seconds = record.get("sleep_seconds", 0)
    if isinstance(sleep_seconds, bool) or not isinstance(sleep_seconds, (int, float)):
        raise ValueError("sleep_seconds must be numeric")
    if sleep_seconds > 0:
        time.sleep(sleep_seconds)
    return exit_status


if __name__ == "__main__":
    raise SystemExit(main())
