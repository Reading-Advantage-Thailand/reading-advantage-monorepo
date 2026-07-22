import { describe, expectTypeOf, it } from "vitest";

import type {
  DurableJobDeadLetterPort,
  DurableJobEnqueuePort,
  DurableJobReplayPort,
  DurableJobWorkerPort,
} from "../index.js";

describe("least-privilege durable job ports", () => {
  it("keeps producer, worker, dead-letter, and replay capabilities separate", () => {
    expectTypeOf<keyof DurableJobEnqueuePort>().toEqualTypeOf<"enqueue">();
    expectTypeOf<keyof DurableJobWorkerPort>().toEqualTypeOf<
      "claim" | "heartbeat" | "settle" | "fail" | "reclaimExpired"
    >();
    expectTypeOf<keyof DurableJobDeadLetterPort>().toEqualTypeOf<"listDead">();
    expectTypeOf<keyof DurableJobReplayPort>().toEqualTypeOf<"replay">();
  });
});
