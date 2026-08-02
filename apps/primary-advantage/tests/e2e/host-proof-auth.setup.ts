import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getHostProofTestCredentials } from "../../host-proof-test-config";

const { classCode: TEST_CLASS_CODE, studentUsername: TEST_STUDENT_USERNAME } =
  getHostProofTestCredentials();
const authFile = process.env.HOST_PROOF_TEST_AUTH_FILE
  ?? "playwright/.auth/host-proof-student.json";

setup("seed authenticated host-proof session", async ({ request }) => {
  setup.skip(!TEST_CLASS_CODE, "HOST_PROOF_TEST_CLASS_CODE not set");

  mkdirSync(dirname(authFile), { recursive: true });

  const response = await request.post("/api/auth/login", {
    data: {
      username: TEST_STUDENT_USERNAME,
      password: TEST_CLASS_CODE,
    },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.user).toBeDefined();

  await request.storageState({ path: authFile });
});
