import { createVocabularyRoute } from "@/lib/games/api";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";

export const dynamic = "force-static";

const { GET } = createVocabularyRoute(SAMPLE_VOCABULARY);

export { GET };
