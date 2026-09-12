import { createRankingRoute } from "@/lib/games/api";
export const dynamic = "force-static";

const { GET } = createRankingRoute();

export { GET };
