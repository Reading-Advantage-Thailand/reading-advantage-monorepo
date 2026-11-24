// Review A probe (round 6): change the th pricing S7 body price (3,000 บาท -> 2,500 บาท) through a module mock,
// then run the restored www-features-pricing.locale.test.ts cases. No source file is changed.
// The priceFloor key keeps "3,000 บาท", so only the restored S7 body pin can catch the change.
import { vi } from "vitest";

vi.mock("@/locales/pages/pricing", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/locales/pages/pricing")>();
  const from = "แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด";
  const to = "แพ็กเกจเริ่มต้นที่ 2,500 บาท และราคาอาจปรับตามตลาด";
  let hits = 0;
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      if (node.includes(from)) { hits += 1; return node.replace(from, to); }
      return node;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
    }
    return node;
  };
  const th = walk(real.th) as typeof real.th;
  if (hits !== 1) throw new Error(`probe expected 1 S7 body hit, got ${hits}`);
  return { ...real, th };
});

await import("@/__tests__/www-features-pricing.locale.test");
