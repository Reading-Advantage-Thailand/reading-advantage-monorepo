import fs from "fs";
import path from "path";

const source = fs.readFileSync(
  path.join(__dirname, "wizardZombie.ts"),
  "utf8",
);

describe("wizardZombie determinism guard", () => {
  it("contains no Math.random calls in the source", () => {
    expect(source).not.toMatch(/Math\.random/);
  });

  it("contains no Date.now calls in the source", () => {
    expect(source).not.toMatch(/Date\.now/);
  });
});
