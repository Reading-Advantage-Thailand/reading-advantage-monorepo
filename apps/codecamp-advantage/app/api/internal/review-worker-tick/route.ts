import { runWorkerTick } from "@reading-advantage/webhooks/review-worker";

export const runtime = "nodejs";

/**
 * Runs one durable PR-review worker tick for the authenticated Cloud Scheduler request.
 * @param request The request carrying the bearer token from Cloud Scheduler.
 * @returns A JSON response describing whether the tick was accepted.
 */
export async function POST(request: Request): Promise<Response> {
  const expectedToken = process.env.REVIEW_WORKER_TICK_TOKEN;
  const authorization = request.headers.get("authorization");
  const expectedAuthorization = expectedToken ? `Bearer ${expectedToken}` : null;

  if (!expectedAuthorization || authorization !== expectedAuthorization) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runWorkerTick();
    return Response.json({ ok: true });
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 512);
    console.error(
      JSON.stringify({
        level: "error",
        event: "review_worker_tick_failed",
        message,
      }),
    );
    return Response.json({ error: "Worker tick failed" }, { status: 500 });
  }
}
