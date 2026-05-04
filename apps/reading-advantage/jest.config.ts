import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  // coverageProvider: "v8",
  // testEnvironment: "jsdom",
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",
  moduleNameMapper: {
    "^@reading-advantage/utils$": "<rootDir>/../../packages/utils/src/index.ts",
    "^@reading-advantage/ui$": "<rootDir>/../../packages/ui/src/index.ts",
    "^@reading-advantage/auth-client$": "<rootDir>/../../packages/auth-client/src/index.ts",
    "^@reading-advantage/auth$": "<rootDir>/../../packages/auth/src/index.ts",
    "^@reading-advantage/db$": "<rootDir>/../../packages/db/src/index.ts",
    "^@reading-advantage/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@reading-advantage/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^@reading-advantage/domain$": "<rootDir>/../../packages/domain/src/index.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
