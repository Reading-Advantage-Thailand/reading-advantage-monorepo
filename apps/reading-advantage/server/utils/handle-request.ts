import { NextResponse, NextRequest } from "next/server";

export async function handleRequest(router: any, request: NextRequest, ctx: { params?: unknown }): Promise<NextResponse> {
    const result = await router.run(request, ctx);
    if (result instanceof NextResponse) {
        return result;
    }
    throw new Error("Expected a NextResponse from router.run");
}
