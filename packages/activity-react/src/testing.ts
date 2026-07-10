import { vi, type Mock } from "vitest";
import type { MediaController, MediaSnapshot } from "./controllers.js";

/** Fake media controller returned to React component tests and host fixtures. */
export type FakeMediaController = MediaController & {
  emit(snapshot: MediaSnapshot): void;
  play: Mock<() => void>;
  pause: Mock<() => void>;
  seek: Mock<(seconds: number) => void>;
  destroy: Mock<() => void>;
};

/**
 * Creates a deterministic provider-neutral controller for tests.
 * @param initial Optional initial playback snapshot.
 * @returns Controllable media adapter with spy methods.
 */
export function createFakeMediaController(
  initial: MediaSnapshot = { status: "ready", currentSeconds: 0, durationSeconds: 90, captionsEnabled: true },
): FakeMediaController {
  let snapshot = initial;
  const listeners = new Set<(value: MediaSnapshot) => void>();
  const controller: FakeMediaController = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    play: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
    seek: vi.fn<(seconds: number) => void>(),
    destroy: vi.fn<() => void>(),
    emit: (next) => { snapshot = next; listeners.forEach((listener) => listener(snapshot)); },
  };
  return controller;
}
