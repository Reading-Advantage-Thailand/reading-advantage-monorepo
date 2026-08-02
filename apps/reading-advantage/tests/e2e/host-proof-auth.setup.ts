import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getHostProofTestCredentials } from "../../host-proof-test-config";

const { username: TEST_USERNAME, password: TEST_PASSWORD } = getHostProofTestCredentials();
const authFile = process.env.HOST_PROOF_TEST_AUTH_FILE
  ?? "playwright/.auth/host-proof-reading-student.json";

setup("seed authenticated host-proof session", async ({ request }) => {
  setup.setTimeout(120_000);
  mkdirSync(dirname(authFile), { recursive: true });

  const response = await request.post("/api/auth/login", {
    data: { username: TEST_USERNAME, password: TEST_PASSWORD },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.user).toBeDefined();

  const historyResponse = await request.get("/api/host-proof/games/completions?limit=50");
  expect(historyResponse.status()).toBe(200);
  const pageResponse = await request.get("/en/student/host-proof/games");
  expect(pageResponse.status()).toBe(200);
  expect(pageResponse.url()).toContain("/en/student/host-proof/games");

  await request.storageState({ path: authFile });
});
