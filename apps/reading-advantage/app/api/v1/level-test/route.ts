//route
// api/level-test

import { getCurrentUser } from "@/lib/session";
import fs from "fs";
import path from "path";
import { ScoreRange } from "@/types/constants";
import { NextRequest } from "next/server";

interface RequestContext {
  params: Promise<Record<string, never>>;
}

export async function GET(req: NextRequest, ctx: RequestContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(
        JSON.stringify({
          message: "Unauthorized",
        }),
        { status: 403 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "/assets/json",
      "level-test.json"
    );

    const fileContents = fs.readFileSync(filePath, "utf8");
    const dataObject = JSON.parse(fileContents)?.language_placement_test;

    return new Response(
      JSON.stringify({
        message: "success",
        language_placement_test: dataObject,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: error,
      }),
      { status: 500 }
    );
  }
}
