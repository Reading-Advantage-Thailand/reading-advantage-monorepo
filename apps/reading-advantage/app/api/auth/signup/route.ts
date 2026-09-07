/**
 * Rejects obsolete self-service account creation.
 * @returns A stable response that directs clients away from this retired path.
 */
export async function POST(): Promise<Response> {
  return Response.json(
    { error: "Self-service signup is unavailable" },
    { status: 410 },
  );
}
