import { createSentencesRoute } from "@/lib/games/api";
export const dynamic = "force-static";
import { SAMPLE_SENTENCES } from "@/lib/games/sampleSentences";

const { GET } = createSentencesRoute(SAMPLE_SENTENCES);

export { GET };
