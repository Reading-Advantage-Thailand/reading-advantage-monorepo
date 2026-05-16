import github from "@reading-advantage/webhooks/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/pr";

  const forwardedRequest = new Request(url, {
    body: await request.arrayBuffer(),
    headers: request.headers,
    method: request.method,
  });

  return github.fetch(forwardedRequest);
}
