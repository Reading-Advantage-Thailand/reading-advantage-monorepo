import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/tests/e2e/"],
  transformIgnorePatterns: ["/node_modules/(?!next-intl|use-intl)/"],
  moduleNameMapper: {
    "^@reading-advantage/advantage-play-kit$": "<rootDir>/../../packages/advantage-play-kit/src/index.ts",
    "^@reading-advantage/advantage-play-kit/(react|presentation)$": "<rootDir>/../../packages/advantage-play-kit/dist/$1/index.js",
    "^@reading-advantage/game-cartridges/qc$": "<rootDir>/../../packages/game-cartridges/src/existing-core-cutover-qc.ts",
    "^@reading-advantage/game-cartridges/(.*)$": "<rootDir>/../../packages/game-cartridges/src/$1.ts",
    "^@reading-advantage/game-contracts$": "<rootDir>/../../packages/game-contracts/src/index.ts",
    "^@reading-advantage/utils$": "<rootDir>/../../packages/utils/src/index.ts",
    "^@reading-advantage/utils/ffmpeg-process$": "<rootDir>/../../packages/utils/src/ffmpeg-process.ts",
    "^@reading-advantage/codecamp-knowledge$": "<rootDir>/../../packages/codecamp-knowledge/src/index.ts",
    "^@reading-advantage/codecamp-knowledge/(.*)$": "<rootDir>/../../packages/codecamp-knowledge/src/$1.ts",
    "^@reading-advantage/activity-runtime$": "<rootDir>/../../packages/activity-runtime/src/index.ts",
    "^@reading-advantage/activity-runtime/(.*)$": "<rootDir>/../../packages/activity-runtime/src/$1.ts",
    "^@reading-advantage/activity-tutorial$": "<rootDir>/../../packages/activity-tutorial/src/index.ts",
    "^@reading-advantage/activity-tutorial/(.*)$": "<rootDir>/../../packages/activity-tutorial/src/$1.ts",
    "^@reading-advantage/knowledge-space-core$": "<rootDir>/../../packages/knowledge-space-core/src/index.ts",
    "^@reading-advantage/practice-core/contract$": "<rootDir>/../../packages/practice-core/src/practice/contract.ts",
    "^@reading-advantage/practice-core/(.*)$": "<rootDir>/../../packages/practice-core/src/practice/$1.ts",
    "^@reading-advantage/srs-engine$": "<rootDir>/../../packages/srs-engine/src/index.ts",
    "^@reading-advantage/sales-knowledge$": "<rootDir>/../../packages/sales-knowledge/src/index.ts",
    "^@reading-advantage/ui$": "<rootDir>/../../packages/ui/src/index.ts",
    "^@reading-advantage/auth-client$": "<rootDir>/../../packages/auth-client/src/index.ts",
    "^@reading-advantage/auth$": "<rootDir>/../../packages/auth/src/index.ts",
    "^@reading-advantage/db$": "<rootDir>/../../packages/db/src/index.ts",
    "^@reading-advantage/db/schema$": "<rootDir>/../../packages/db/src/schema/index.ts",
    "^@reading-advantage/db/seed$": "<rootDir>/../../packages/db/src/seed/index.ts",
    "^@reading-advantage/storage$": "<rootDir>/../../packages/storage/src/index.ts",
    "^@reading-advantage/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@reading-advantage/api/routes/apk-challenges$": "<rootDir>/../../packages/api/src/routes/apk-challenges/index.ts",
    "^@reading-advantage/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^@reading-advantage/domain$": "<rootDir>/../../packages/domain/src/index.ts",
    "^@reading-advantage/domain/games$": "<rootDir>/../../packages/domain/src/games/index.ts",
    "^@reading-advantage/domain/rpg$": "<rootDir>/../../packages/domain/src/rpg/index.ts",
    "^@reading-advantage/domain/challenges$": "<rootDir>/../../packages/domain/src/challenges/index.ts",
    "^@reading-advantage/ai$": "<rootDir>/../../packages/ai/src/index.ts",
    "^@reading-advantage/ai/internal-sdk$": "<rootDir>/../../packages/ai/src/internal-sdk.ts",
    "^@/(.*)$": "<rootDir>/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
