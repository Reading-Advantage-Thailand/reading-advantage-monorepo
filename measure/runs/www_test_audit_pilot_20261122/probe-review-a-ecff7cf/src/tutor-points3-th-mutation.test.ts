// Review A probe (round 6): change th tutorRole.points.3 through a module mock,
// then run the restored www-tutor-calculator.locale.test.ts cases. No source file is changed.
import { vi } from "vitest";

vi.mock("@/locales/pages/products/tutor-advantage", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/locales/pages/products/tutor-advantage")>();
  const th = structuredClone(real.th) as typeof real.th;
  const points = th.tutorRole.points as unknown as string[];
  if (!points[3].includes("แสดงตัวอย่าง")) throw new Error("probe target not found");
  points[3] = points[3].replace("แสดงตัวอย่าง", "แสดงรายได้จริง");
  return { ...real, th };
});

await import("@/__tests__/www-tutor-calculator.locale.test");
