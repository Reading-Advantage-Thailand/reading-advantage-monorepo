"""Collaboration-event resolution boundary for evidence integrity gates."""

from __future__ import annotations

from threading import Lock
from typing import Any, Mapping, Protocol


class EventResolutionError(RuntimeError):
    """Raised when a collaboration event is unavailable or malformed."""


class EventResolver(Protocol):
    """Resolves immutable collaboration events by provider-issued identifier."""

    def resolve(self, event_id: str) -> Mapping[str, Any]:
        """Resolve one raw event.

        @param event_id Provider-issued event identifier.
        @returns Raw provider event fields.
        @throws EventResolutionError When the event cannot be resolved.
        """
        ...

    def claim_once(self, event_id: str) -> bool:
        """Atomically consume an event for one approval transition.

        @param event_id Provider-issued event identifier.
        @returns Whether the event had not previously been consumed.
        """
        ...


class MappingEventResolver:
    """Deterministic resolver used at the unit-test adapter boundary."""

    def __init__(self, events: Mapping[str, Mapping[str, Any]]) -> None:
        """Create a resolver over immutable event records.

        @param events Events keyed by provider-issued identifier.
        """
        self._events = dict(events)
        self._consumed: set[str] = set()
        self._claim_lock = Lock()

    def resolve(self, event_id: str) -> Mapping[str, Any]:
        """Resolve one event without synthesizing missing fields.

        @param event_id Provider-issued event identifier.
        @returns Exact stored event.
        @throws EventResolutionError When the event is absent.
        """
        try:
            return self._events[event_id]
        except KeyError as error:
            raise EventResolutionError(f"unreachable collaboration event: {event_id}") from error

    def claim_once(self, event_id: str) -> bool:
        """Consume an event exactly once for deterministic replay tests.

        @param event_id Provider-issued event identifier.
        @returns False when this resolver already consumed the event.
        """
        with self._claim_lock:
            if event_id in self._consumed:
                return False
            self._consumed.add(event_id)
            return True


__all__ = ["EventResolutionError", "EventResolver", "MappingEventResolver"]
