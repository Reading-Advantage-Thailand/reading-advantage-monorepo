/**
 * CSV export stub (Task 5 red phase). Returns a placeholder so the
 * contract test compiles; the full implementation arrives in Task 6.
 * @param _request Incoming request.
 * @returns Placeholder CSV response.
 */
export async function GET(_request: Request): Promise<Response> {
  return new Response("placeholder", {
    status: 200,
    headers: { "content-type": "text/csv; charset=utf-8" },
  });
}
