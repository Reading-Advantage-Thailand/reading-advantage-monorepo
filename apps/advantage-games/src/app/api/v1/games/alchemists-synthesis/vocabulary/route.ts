import { createVocabularyRoute } from "@/lib/games/api";
export const dynamic = "force-static";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";

const { GET } = createVocabularyRoute(SAMPLE_VOCABULARY);

export { GET };
