import { NextResponse } from "next/server";
import { createCompleteRoute } from "@/lib/games/api";

const { POST } = createCompleteRoute();

export { POST };
export const dynamic = "force-static";
