import { NextResponse } from "next/server";
import { createSentencesRoute } from "@/lib/games/api";
import { SAMPLE_SENTENCES } from "@/lib/games/sampleSentences";

const { GET } = createSentencesRoute(SAMPLE_SENTENCES);

export { GET };
export const dynamic = "force-static";
