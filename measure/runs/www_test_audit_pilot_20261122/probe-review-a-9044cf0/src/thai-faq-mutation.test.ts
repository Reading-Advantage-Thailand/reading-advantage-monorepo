// Review A probe (round 5): mutate the live th faq.items.5.answer through a module mock,
// then run the real www-tutor-calculator.locale.test.ts cases against it.
// No source file is changed. Expected: only the new exact-pin case fails.
import { vi } from "vitest";

vi.mock("@/locales/pages/products/tutor-advantage", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/locales/pages/products/tutor-advantage")>();
  const th = structuredClone(real.th) as typeof real.th;
  const items = th.faq.items as unknown as { answer: string }[];
  items[5] = { ...items[5], answer: items[5].answer.replace("ทุกเดือน", "ทุกปี") };
  return { ...real, th };
});

await import("@/__tests__/www-tutor-calculator.locale.test");
