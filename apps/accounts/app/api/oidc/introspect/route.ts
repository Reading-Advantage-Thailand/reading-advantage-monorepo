import { NextResponse } from "next/server";

import { identityErrorResponse } from "@/lib/server/http";
import { getIdentityComposition } from "@/lib/server/identity";

/** Returns current revocation-aware application session identity. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Basic ")) {
      return NextResponse.json(
        { error: "invalid_client" },
        { status: 401, headers: { "WWW-Authenticate": 'Basic realm="accounts-introspection"' } },
      );
    }
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }
    return NextResponse.json(
      await (await getIdentityComposition()).service.introspect({
        accessToken: String(form.get("token") ?? ""),
        clientId: decoded.slice(0, separator),
        clientSecret: decoded.slice(separator + 1),
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const response = identityErrorResponse(error);
    return response.status === 400
      ? NextResponse.json({ error: "invalid_client" }, { status: 401 })
      : response;
  }
}
