import { type Mock, vi } from "vitest";

import type {
  APKGameInstance,
  APKHostAdapter,
  GameFactory,
  GameFactoryContext,
} from "../runtime/types.js";

/** Mock factory with observable instances and lifecycle counts. */
export type MockGameFactory = GameFactory & {
  /** Every factory context received by the mock. */
  readonly contexts: GameFactoryContext[];
  /** Every renderer instance created by the mock. */
  readonly instances: Array<APKGameInstance & { destroy: Mock }>;
  /** Number of instances not yet destroyed. */
  readonly liveInstances: number;
};

/** Mock host with observable completion and diagnostics callbacks. */
export type MockHostAdapter = APKHostAdapter & {
  /** Completion spy. */
  complete: Mock;
  /** Diagnostic event spy. */
  diagnostic: Mock;
  /** Navigation spy. */
  navigate: Mock;
};

/**
 * Creates a deterministic pseudo-random generator for cartridge tests.
 * @param seed Integer seed for the Mulberry32 generator.
 * @returns A function yielding repeatable values from zero up to one.
 */
export function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates an injected renderer factory with deterministic leak counters.
 * @returns A callable mock factory and its recorded contexts and instances.
 */
export function createMockGameFactory(): MockGameFactory {
  const contexts: GameFactoryContext[] = [];
  const instances: Array<APKGameInstance & { destroy: Mock }> = [];
  let liveInstances = 0;
  const factory = (async (context: GameFactoryContext) => {
    contexts.push(context);
    liveInstances += 1;
    let destroyed = false;
    const instance = {
      pause: vi.fn(),
      resume: vi.fn(),
      resize: vi.fn(),
      setMuted: vi.fn(),
      destroy: vi.fn(() => {
        if (destroyed) return;
        destroyed = true;
        liveInstances -= 1;
      }),
    };
    instances.push(instance);
    return instance;
  }) as unknown as MockGameFactory;
  Object.defineProperties(factory, {
    contexts: { value: contexts, enumerable: true },
    instances: { value: instances, enumerable: true },
    liveInstances: { get: () => liveInstances, enumerable: true },
  });
  return factory;
}

/**
 * Creates an observable mock host adapter for runtime and cartridge tests.
 * @returns A host adapter whose callbacks are Vitest spies.
 */
export function createMockHost(): MockHostAdapter {
  return {
    complete: vi.fn(),
    diagnostic: vi.fn(),
    navigate: vi.fn(),
  };
}
