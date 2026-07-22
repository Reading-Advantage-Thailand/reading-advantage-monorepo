import { describe, expectTypeOf, it } from "vitest";

import type {
  ClaimJobsRequest,
  ClaimJobsResult,
  DurableJobQueuePort,
  EnqueueJobRequest,
  EnqueueJobResult,
  FailJobRequest,
  FailJobResult,
  HeartbeatJobRequest,
  HeartbeatJobResult,
  ListDeadJobsRequest,
  ListDeadJobsResult,
  ReclaimExpiredJobsRequest,
  ReclaimExpiredJobsResult,
  ReplayJobRequest,
  ReplayJobResult,
  SettleJobRequest,
  SettleJobResult,
} from "../index.js";

describe("durable job lifecycle port Red matrix", () => {
  it("exposes only provider-neutral lifecycle operations to composition", () => {
    expectTypeOf<keyof DurableJobQueuePort>().toEqualTypeOf<
      | "enqueue"
      | "claim"
      | "heartbeat"
      | "settle"
      | "fail"
      | "reclaimExpired"
      | "listDead"
      | "replay"
    >();
  });

  it("preserves request/result pairs for every lifecycle transition", () => {
    expectTypeOf<DurableJobQueuePort["enqueue"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<EnqueueJobRequest>>();
    expectTypeOf<DurableJobQueuePort["enqueue"]>().returns.toEqualTypeOf<
      Promise<Readonly<EnqueueJobResult>>
    >();
    expectTypeOf<DurableJobQueuePort["claim"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<ClaimJobsRequest>>();
    expectTypeOf<DurableJobQueuePort["claim"]>().returns.toEqualTypeOf<
      Promise<Readonly<ClaimJobsResult>>
    >();
    expectTypeOf<DurableJobQueuePort["heartbeat"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<HeartbeatJobRequest>>();
    expectTypeOf<DurableJobQueuePort["heartbeat"]>().returns.toEqualTypeOf<
      Promise<Readonly<HeartbeatJobResult>>
    >();
    expectTypeOf<DurableJobQueuePort["settle"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<SettleJobRequest>>();
    expectTypeOf<DurableJobQueuePort["settle"]>().returns.toEqualTypeOf<
      Promise<Readonly<SettleJobResult>>
    >();
    expectTypeOf<DurableJobQueuePort["fail"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<FailJobRequest>>();
    expectTypeOf<DurableJobQueuePort["fail"]>().returns.toEqualTypeOf<
      Promise<Readonly<FailJobResult>>
    >();
    expectTypeOf<DurableJobQueuePort["reclaimExpired"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<ReclaimExpiredJobsRequest>>();
    expectTypeOf<DurableJobQueuePort["reclaimExpired"]>().returns.toEqualTypeOf<
      Promise<Readonly<ReclaimExpiredJobsResult>>
    >();
    expectTypeOf<DurableJobQueuePort["listDead"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<ListDeadJobsRequest>>();
    expectTypeOf<DurableJobQueuePort["listDead"]>().returns.toEqualTypeOf<
      Promise<Readonly<ListDeadJobsResult>>
    >();
    expectTypeOf<DurableJobQueuePort["replay"]>()
      .parameter(0)
      .toEqualTypeOf<Readonly<ReplayJobRequest>>();
    expectTypeOf<DurableJobQueuePort["replay"]>().returns.toEqualTypeOf<
      Promise<Readonly<ReplayJobResult>>
    >();
  });
});
