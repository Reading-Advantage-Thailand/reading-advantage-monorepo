/**
 * Service-authenticated review-queue tick endpoint.
 *
 * Cloud Scheduler (or an operator) POSTs here with
 * `Authorization: Bearer $REVIEW_WORKER_TICK_TOKEN`. The handler runs one
 * `runWorkerTick()` pass: reclaim stuck claims, claim due `review_jobs`,
 * process LLM advisory review, settle success/retry/dead.
 *
 * This replaces an in-process interval worker so Codecamp can stay on a
 * single Cloud Run service without always-on CPU for background work.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Runs one durable review-worker tick when authorized by the shared service token.
 * @param request Incoming HTTP request from Cloud Scheduler or ops.
 * @returns JSON with ok/error; 401 when the bearer token is missing or wrong.
 */
export async function POST(request: Request): Promise<Response> {
  const token = process.env.REVIEW_WORKER_TICK_TOKEN;
  if (!token || token.length < 32) {
    console.error("[Review Worker Tick] REVIEW_WORKER_TICK_TOKEN is not configured");
    return Response.json({ error: "Review worker tick is not configured" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${token}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runWorkerTick } = await import("@reading-advantage/webhooks/review-worker");
    const startedAt = Date.now();
    await runWorkerTick();
    const durationMs = Date.now() - startedAt;
    console.log(`[Review Worker Tick] completed in ${durationMs}ms`);
    return Response.json({ ok: true, durationMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review worker tick failed";
    console.error("[Review Worker Tick] failed:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
