import { describe, expect, it } from "vitest";
import { createDeterministicRandom, createMockGameFactory, createMockHost } from "./test-kit.js";
import { mountCartridge } from "../runtime/runtime.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "./fixtures.js";

describe("APK test kit", () => {
  it("provides repeatable seeded random values", () => {
    const first = createDeterministicRandom(42);
    const second = createDeterministicRandom(42);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("provides a mock factory and host with leak counters", async () => {
    const factory = createMockGameFactory();
    const host = createMockHost();
    const handle = await mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host,
      },
      factory,
    );
    factory.contexts[0]?.complete(validResults);
    expect(host.complete).toHaveBeenCalledWith(validResults);
    expect(factory.liveInstances).toBe(1);
    await handle.destroy();
    expect(factory.liveInstances).toBe(0);
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
  });
});
