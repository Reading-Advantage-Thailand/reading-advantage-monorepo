// Fresh mutation probe for the Phase 4 acceptance at 2bfbd373f.
// Run from apps/www-reading-advantage:
//   node --input-type=module -e "$(cat <path of this file>)" <mutant-name>
// It applies one text change to a locale source file in memory through a Vitest plugin.
// No file on disk changes. The control run (name "control") applies no change.
// The mutants use new values, not the values of the adversarial pass at 7336f42b3.
import { startVitest } from "vitest/node";

const PRICING = "/src/locales/pages/pricing.ts";
const TUTOR = "/src/locales/pages/products/tutor-advantage.ts";
const MUTANTS = {
  control: [],
  "S7-2400-en-th": [
    [PRICING, "Packages start at 3,000 baht and adapt to the market.", "Packages start at 2,400 baht and adapt to the market."],
    [PRICING, "แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด", "แพ็กเกจเริ่มต้นที่ 2,400 บาท และราคาอาจปรับตามตลาด"],
  ],
  "S9A2-invoice-en": [
    [PRICING, "A: No. Printed workbooks are priced separately, per book, by quotation.", "A: No. Printed workbooks are priced separately, per book, by invoice."],
  ],
  "P3-th-guarantee": [
    [TUTOR, "เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ทักมาคุยกับเราเรื่องกรณีของคุณเองได้", "เครื่องคำนวณในหน้านี้รับรองรายได้ของคุณ"],
  ],
};
const name = process.argv[1] ?? "control";
const edits = MUTANTS[name];
if (!edits) throw new Error("unknown mutant " + name);
const hits = {};
const plugin = {
  name: "acceptance-mutate",
  enforce: "pre",
  transform(code, id) {
    let out = code;
    for (const [file, from, to] of edits) {
      if (!id.endsWith(file)) continue;
      if (!out.includes(from)) continue;
      out = out.split(from).join(to);
      hits[file + "|" + from.slice(0, 24)] = (hits[file + "|" + from.slice(0, 24)] ?? 0) + 1;
    }
    return out === code ? undefined : out;
  },
};
const FILES = [
  "src/__tests__/www-features-pricing.locale.test.ts",
  "src/__tests__/www-pricing-page.content.test.tsx",
  "src/__tests__/www-tutor-calculator.locale.test.ts",
  "src/__tests__/www-tutor-reedy-claim.test.tsx",
];
const ctx = await startVitest("test", FILES, { watch: false, maxWorkers: 1, reporters: ["verbose"] }, { plugins: [plugin] });
await ctx.close();
console.log("MUTANT", name, "edit-hits", JSON.stringify(hits));
