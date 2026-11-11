// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildStaticSalesCurriculumRows,
  SALES_CURRICULUM_EXPIRING_FACTS,
} from "./static-seed";

// Content contract for the 2027 Sales curriculum (track
// sales_training_2027_20261015, stories S3–S7). The expected wording comes
// from the advantage-pr source set pinned at e6f7cc22e (2026-10-15).

const rows = buildStaticSalesCurriculumRows();

type Rows = typeof rows;
type Criterion = {
  criterion: string;
  weight: number;
  passingScore: number;
  sourceRef: string;
};

const CLAIMS_SOURCE_REF =
  "09-sales-enablement/sales-training-scope-2027.md#7-the-claims-criterion-for-roleplays";
const THAI = /[฀-๿]/;
const NEGATION =
  /\b(?:no|not|never|avoid|avoids|without|nothing|none|cannot|can't|don't|do not|does not|did not|fail|fails|banned|removed|forbidden|wrong)\b|ไม่|ห้าม/i;

/** Returns the module row with a slug, or fails the test. */
function moduleBySlug(slug: string): Rows["modules"][number] {
  const module = rows.modules.find((row) => row.slug === slug);
  if (!module) throw new Error(`module missing: ${slug}`);
  return module;
}

/** Returns the lessons of one module in lesson order. */
function lessonsOf(slug: string): Rows["lessons"] {
  const module = moduleBySlug(slug);
  return rows.lessons
    .filter((lesson) => lesson.moduleId === module.id)
    .sort((left, right) => left.order - right.order);
}

/** Returns the lesson with a title in one module, or fails the test. */
function lesson(slug: string, title: string): Rows["lessons"][number] {
  const row = lessonsOf(slug).find((candidate) => candidate.title === title);
  if (!row) throw new Error(`lesson missing: ${slug} / ${title}`);
  return row;
}

/** Returns the scenarios and rubrics of one roleplay lesson. */
function roleplay(slug: string, title: string) {
  const row = lesson(slug, title);
  const scenarios = rows.scenarios
    .filter((scenario) => scenario.lessonId === row.id)
    .sort((left, right) => left.order - right.order);
  return scenarios.map((scenario) => ({
    scenario,
    criteria: rows.rubrics.find((rubric) => rubric.id === scenario.rubricId)!
      .criteriaJson as Criterion[],
  }));
}

/** Teaching text: theory and roleplay guidance, correct quiz answers, and explanations. */
function teachingText(slug?: string): string {
  const lessons = slug ? lessonsOf(slug) : rows.lessons;
  const lessonIds = new Set(lessons.map((row) => row.id));
  return [
    ...lessons.flatMap((row) => [row.title, row.content]),
    ...rows.quizQuestions
      .filter((question) => lessonIds.has(question.lessonId))
      .flatMap((question) => [question.correctAnswer, question.explanation]),
    ...rows.rubrics
      .filter((rubric) =>
        rows.scenarios.some((scenario) =>
          scenario.rubricId === rubric.id && lessonIds.has(scenario.lessonId)
        )
      )
      .flatMap((rubric) =>
        (rubric.criteriaJson as Criterion[]).map((criterion) => criterion.criterion)
      ),
  ].join("\n");
}

/** Every text field in the graph, including scenarios and wrong quiz options. */
function allText(): string {
  return [
    ...rows.modules.flatMap((row) => [row.title, row.description, row.phase]),
    ...rows.lessons.flatMap((row) => [row.title, row.content]),
    ...rows.scenarios.flatMap((row) => [
      row.personaName,
      row.personaRole,
      row.situation,
      row.objective,
      JSON.stringify(row.prospectContextJson),
    ]),
    ...rows.rubrics.flatMap((row) =>
      (row.criteriaJson as Criterion[]).map((criterion) => criterion.criterion)
    ),
    ...rows.quizQuestions.flatMap((row) => [
      row.question,
      ...(row.optionsJson as string[]),
      row.correctAnswer,
      row.explanation,
    ]),
  ].join("\n");
}

/** The 9 conditions of the claims criterion (scope document §7), quoted in the claims lesson. */
const CLAIMS_CONDITIONS = [
  "1. A guarantee or a promise of an outcome (\"รับประกัน\", \"your child will improve\", any percentage gain).",
  "2. False urgency (\"only today\", \"the last seats\", a deadline that does not exist).",
  "3. A promise of Read Along with Reedy, or Tutor Advantage called an AI tutor.",
  "4. A book that is not printed, or any level above book level 4 or above A2.",
  "5. Pearson, GSE, or YLE in a line to a parent or a school.",
  "6. A book name without the product name (\"Origins 2\" alone).",
  "7. An earnings figure in a family sale. Commission talk belongs to tutor recruitment only.",
  "8. A Managed Service sale, or a date for Science, Math, or Zhongwen Advantage.",
  "9. \"Leading\", \"best\", \"#1\", or a percentage with no source.",
];

/**
 * The claims conditions the 7eff8c10 re-pin keeps. Condition 8 is re-pinned, so the
 * rows S13.7 and S13.9 hold its new text and drop its old text.
 */
const CLAIMS_CONDITIONS_KEPT = CLAIMS_CONDITIONS.filter((_, index) => index !== 7);

/** A book name that has no product name in front of it. */
const BARE_BOOK_NAME =
  /(?<!(?:Primary|Reading) Advantage )(?<!(?:Primary|Reading) Advantage Origins \d(?:\.\d)? and )(?<![\w.])(?:Origins \d(?:\.\d)?|Quest \d)\b/;

/** Splits text into statements on line ends and on sentence ends after a word. */
function statements(text: string): string[] {
  return text
    .split(/\n|(?<=[^\d\s][.!?])\s+/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/** Returns the statements that match a pattern, have no negation, and are not a quoted claims condition. */
function positiveMentions(text: string, pattern: RegExp): string[] {
  return statements(text).filter((statement) =>
    pattern.test(statement) &&
    !NEGATION.test(statement) &&
    !CLAIMS_CONDITIONS.some((condition) => condition.includes(statement))
  );
}

describe("2027 course shape", () => {
  it("has the shared core, then the Family branch, then the School branch", () => {
    const ordered = [...rows.modules].sort((left, right) => left.order - right.order);
    expect(ordered.map((module) => [module.order, module.slug, module.phase])).toEqual([
      [1, "foundations-discovery", "Core"],
      [2, "framing-value", "Core"],
      [3, "objections", "Core"],
      [4, "product-knowledge-2027", "Core"],
      [5, "family-sale", "Family branch"],
      [6, "tutor-recruitment", "Family branch"],
      [7, "school-sale", "School branch"],
    ]);
  });

  it("gives each core roleplay a Thai-first family scenario and a school scenario", () => {
    for (const slug of ["foundations-discovery", "framing-value", "objections", "product-knowledge-2027"]) {
      const roleplays = lessonsOf(slug).filter((row) => row.type === "roleplay");
      expect(roleplays).toHaveLength(1);
      const scenarios = roleplay(slug, roleplays[0]!.title).map((entry) => entry.scenario);
      expect(scenarios).toHaveLength(2);
      expect(scenarios[0]!.situation).toMatch(/^[฀-๿]/);
      expect(scenarios[0]!.situation).toContain("\n\nEnglish: ");
      expect(scenarios[1]!.situation).not.toMatch(THAI);
    }
  });
});

describe("rubric rules (every roleplay)", () => {
  it("has 3–5 criteria with weights that sum to 1 and one claims criterion at passingScore 90", () => {
    expect(rows.rubrics.length).toBeGreaterThan(0);
    for (const rubric of rows.rubrics) {
      const criteria = rubric.criteriaJson as Criterion[];
      expect(criteria.length, rubric.name).toBeGreaterThanOrEqual(3);
      expect(criteria.length, rubric.name).toBeLessThanOrEqual(5);
      const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
      expect(Math.abs(total - 1), rubric.name).toBeLessThan(1e-9);
      const claims = criteria.filter((criterion) => criterion.sourceRef === CLAIMS_SOURCE_REF);
      expect(claims, rubric.name).toHaveLength(1);
      expect(claims[0]!.passingScore, rubric.name).toBe(90);
      expect(claims[0]!.criterion, rubric.name).toMatch(/^Claims: /);
    }
  });

  it("tells the scorer that one claims violation scores 0", () => {
    for (const rubric of rows.rubrics) {
      const claims = (rubric.criteriaJson as Criterion[])
        .find((criterion) => criterion.sourceRef === CLAIMS_SOURCE_REF)!;
      expect(claims.criterion, rubric.name).toContain("Score 100 when the trainee makes none of these claims; score 0 for any one of them.");
    }
  });

  it("lists the claims conditions of the scope document in the claims lesson", () => {
    const content = lesson("product-knowledge-2027", "The Words We Use").content;
    for (const condition of CLAIMS_CONDITIONS_KEPT) {
      expect(content).toContain(condition);
    }
  });
});

describe("S3 — the general modules teach only sourced content", () => {
  it("removes the unsourced lines and invented proof", () => {
    const text = allText();
    for (const phrase of [
      "Director Pim",
      "PSP school",
      "80% of reps",
      "48 hours",
      "24 hours",
      "30-day",
      "4.5x",
      "three schools most like yours",
      "monthly progress report",
      "Founding School",
      "20% of the time",
      "three times longer",
      "9-Product Suite",
    ]) {
      expect(text, phrase).not.toContain(phrase);
    }
  });

  it("states the pilot as one grade level for one semester, with no free period and no discount", () => {
    expect(teachingText()).toContain("one grade level for one semester");
    expect(positiveMentions(teachingText(), /\bpilot\b[^.]*\b(?:free|discount|\d+[- ]days?)\b/i)).toEqual([]);
  });
});

describe("S4 — product knowledge matches strategy v1.8", () => {
  const productLesson = () =>
    lesson("product-knowledge-2027", "One Catalogue, Two Channels").content;

  // Retarget 1: the product-state case moves into REPIN_ROWS. Rows S1.2, S1.3,
  // S1.4, S7.1, S7.2 and S7.3 hold the new lines and drop the old ones.

  it("gives the tier prices and the Tutor Advantage price", () => {
    for (const line of [
      "| **App-Only** | Digital platform access | ~1,000 THB/student/year |",
      "| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |",
      "One class package = one printed workbook, about 22–23 hours, from 3,000 baht. The price adapts to the market.",
    ]) {
      expect(productLesson()).toContain(line);
    }
  });

  // Retarget 3: rows 3 and 4 of the placement map move into REPIN_ROWS. Rows
  // S11.1, S11.2 and S13.5 hold the new sale dates and drop the old ones.

  it("shows the placement-to-book map and the print status of each book", () => {
    for (const row of [
      "| 1 | Primary Advantage Origins 1: not printed → offer **Primary Advantage Origins 2** | Pre-A1 | Reading Advantage Origins 1: not printed → offer **Reading Advantage Origins 2** | A1 |",
      "| 2 | **Primary Advantage Origins 2**: printed | Pre-A1 | **Reading Advantage Origins 2**: printed | A1 |",
    ]) {
      expect(productLesson()).toContain(row);
    }
  });

  it("names each book with its product name", () => {
    // A bare name is allowed only where a lesson quotes it as the forbidden form.
    expect(statements(allText()).filter((statement) =>
      BARE_BOOK_NAME.test(statement) && !/alone|without the product name/.test(statement)
    )).toEqual([]);
  });

  it("uses CEFR names only and no level above A2 in a positive line", () => {
    const text = teachingText();
    expect(positiveMentions(text, /\b(?:GSE|Pearson|YLE)\b/)).toEqual([]);
    // PR group 3 review: even the full Primary Advantage range (to B2) fails scope §7 item 4.
    expect(positiveMentions(text, /\b(?:B1|B2|C1|C2)\b/)).toEqual([]);
  });

  it("registers every dated fact as a fact that expires", () => {
    const text = allText();
    for (const fact of SALES_CURRICULUM_EXPIRING_FACTS) {
      expect(text, fact.fact).toContain(fact.text);
      expect(fact.checkIn).toMatch(/sales-training-scope-2027\.md §8/);
    }
    const dated = statements(text).filter((statement) => /\b20\d\d-\d\d-\d\d\b/.test(statement));
    for (const statement of dated) {
      expect(
        SALES_CURRICULUM_EXPIRING_FACTS.some((fact) => statement.includes(fact.text)),
        statement,
      ).toBe(true);
    }
  });
});

describe("S5 — the Tutor family sale", () => {
  it("teaches what the parent buys, the books on sale, and the Reedy statement", () => {
    const text = teachingText("family-sale");
    for (const line of [
      "Reedy voice practice is live in Tutor Advantage for students with an active class package, on lessons they completed. Read Along with Reedy is in development and not available.",
      "The books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2. Primary Advantage Origins 3.2 and Quest 4 go on sale from about 2026-11-22.",
      "Tutor Advantage is a tutor-led class network. It is not an AI tutor.",
    ]) {
      expect(text).toContain(line);
    }
  });

  it("teaches Daniel's start rule and the printed-book trial (Q-SE-12, 2026-10-16)", () => {
    const content = lesson("family-sale", "Placement: Program, Book Level, and the Printed Book").content;
    expect(content).toContain("**A new student starts at book level 1 or 2, unless the child has significant English.**");
    expect(content).toContain("2. Open lesson 1 of the start book: Primary Advantage Origins 2 or Reading Advantage Origins 2.");
    expect(content).not.toMatch(/interim|Daniel to confirm/);
    expect(content).toContain("If no printed book is below the level, offer the **lowest printed book** in the program.");
    expect(content).toContain("The result is the highest printed book that the child reads comfortably.");
  });

  it("gives the class hours and the per-hour figure of Q-SE-14 (Daniel, 2026-10-16)", () => {
    const text = allText();
    expect(text).not.toMatch(/about 25 hours|25 ชั่วโมง|120 baht|120 บาท/);
    const [entry] = roleplay("family-sale", "Roleplay R2: \"It Is Too Expensive\"");
    expect(entry!.criteria.map((criterion) => criterion.criterion)).toContain(
      "Value facts: states about 22–23 hours, about 135 baht per hour (any figure from 130 to 136 baht passes), the printed book, and the app",
    );
  });

  it("keeps commission talk out of the family sale", () => {
    expect(positiveMentions(teachingText("family-sale"), /commission|ค่าคอม/i)).toEqual([]);
  });

  it.each([
    ["Roleplay R1: First Conversation with a Parent", [[0.3, 60], [0.25, 60], [0.25, 60], [0.2, 90]]],
    ["Roleplay R2: \"It Is Too Expensive\"", [[0.2, 60], [0.3, 60], [0.2, 60], [0.1, 60], [0.2, 90]]],
    ["Roleplay R3: \"My Child Already Goes to a Tutor School\"", [[0.2, 60], [0.3, 60], [0.2, 60], [0.1, 60], [0.2, 90]]],
    ["Roleplay R4: Which Book Next?", [[0.3, 60], [0.2, 60], [0.2, 60], [0.1, 60], [0.2, 90]]],
    ["Roleplay R5: \"Can You Guarantee My Child Will Pass?\"", [[0.3, 70], [0.3, 60], [0.1, 60], [0.3, 90]]],
  ])("%s keeps the playbook weights and is Thai first", (title, expected) => {
    const [entry, ...extra] = roleplay("family-sale", title);
    expect(extra).toEqual([]);
    expect(entry!.criteria.map((criterion) => [criterion.weight, criterion.passingScore])).toEqual(expected);
    expect(entry!.scenario.situation).toMatch(/^[฀-๿]/);
    expect(entry!.scenario.situation).toContain("\n\nEnglish: ");
    expect(entry!.scenario.objective).toMatch(/^[฀-๿]/);
    expect(entry!.scenario.objective).toContain("\n\nEnglish: ");
  });

  it("practices the next-book conversation with no date, on a book that is not printed", () => {
    const [entry] = roleplay("family-sale", "Roleplay R4: Which Book Next?");
    expect(entry!.criteria[0]!.criterion).toContain("Reading Advantage Origins 3.1");
    expect(entry!.criteria[1]!.criterion).toMatch(/no print or sale date/i);
    expect(entry!.scenario.situation).toContain("lesson 12 of Reading Advantage Origins 2");
    expect(entry!.scenario.situation).not.toContain("Primary Advantage Origins 3.2");
  });
});

describe("S6 — tutor recruitment", () => {
  it("states the commission scale from the payout code", () => {
    const content = lesson("tutor-recruitment", "The Commission Scale").content;
    for (const fact of [
      "**Below 20,000 baht GV**, the rate rises in a straight line: 40% + GV ÷ 200,000. At 0 baht it is 40%. At 20,000 baht it is 50%.",
      "**Above 20,000 baht GV**, the rate keeps rising, more slowly, toward a limit of about 71.4%. It never reaches 71.4%.",
      "| 30,000 baht | 10 | 55.6% | 16,682 baht |",
      "Your payout = your rate × your GV − the payouts of the tutors you brought in (and their tutors).",
      "| Tutor A | 30,000 baht (12,000 + 18,000) | 55.6% | 16,682 − 8,820 = **7,862 baht** |",
      "**No students of your own, no payout.**",
      "**Verified tutors only.** An unverified tutor gets no payout.",
      "**3% withholding tax.**",
      "Every baht figure is arithmetic from that formula.",
    ]) {
      expect(content).toContain(fact);
    }
  });

  it("does not use the old step table or the old example", () => {
    const text = allText();
    expect(text).not.toMatch(/40\s*\/\s*50\s*\/\s*55/);
    expect(text).not.toMatch(/at 40% = 12,000/);
  });

  it.each([
    ["Roleplay RR1: \"How Does the Money Work?\"", [[0.3, 60], [0.3, 60], [0.2, 60], [0.2, 90]]],
    ["Roleplay RR2: \"Isn't This a Pyramid Scheme?\"", [[0.25, 60], [0.35, 60], [0.2, 60], [0.2, 90]]],
    ["Roleplay RR3: \"How Much Can I Make if I Bring In Friends?\"", [[0.35, 60], [0.25, 60], [0.2, 60], [0.2, 90]]],
  ])("%s keeps the kit weights and is Thai first", (title, expected) => {
    const [entry, ...extra] = roleplay("tutor-recruitment", title);
    expect(extra).toEqual([]);
    expect(entry!.criteria.map((criterion) => [criterion.weight, criterion.passingScore])).toEqual(expected);
    expect(entry!.scenario.situation).toMatch(/^[฀-๿]/);
    expect(entry!.scenario.situation).toContain("\n\nEnglish: ");
  });

  it("fails an income promise in the recruitment claims criterion", () => {
    for (const { criteria } of [
      ...roleplay("tutor-recruitment", "Roleplay RR1: \"How Does the Money Work?\""),
      ...roleplay("tutor-recruitment", "Roleplay RR2: \"Isn't This a Pyramid Scheme?\""),
      ...roleplay("tutor-recruitment", "Roleplay RR3: \"How Much Can I Make if I Bring In Friends?\""),
    ]) {
      const claims = criteria.find((criterion) => criterion.sourceRef === CLAIMS_SOURCE_REF)!;
      expect(claims.criterion).toContain("a promise of income");
      expect(claims.criterion).toContain("a baht figure that is not labeled as a formula example");
    }
  });
});

describe("S7 — the school sale", () => {
  it("sells Primary Advantage with Blended Learning, not Reading Advantage", () => {
    const text = teachingText("school-sale");
    expect(text).toContain("Primary Advantage with Blended Learning");
    expect(
      statements(text).filter((statement) =>
        /Reading Advantage(?! \(Thailand\))/.test(statement) &&
        !NEGATION.test(statement) &&
        !/Tutor Advantage|secondary students?/.test(statement)
      ),
    ).toEqual([]);
  });

  it("keeps the demo flows, the Big 4, the 8 objections, and the end-of-semester review", () => {
    const text = teachingText("school-sale");
    for (const phrase of [
      "## 15-minute first-contact demo",
      "## 45-minute standard demo",
      "## 90-minute deep demo",
      "# The End-of-Semester Review and Close",
      "Uninterrupted Reading",
      "Student Agency",
      "Data-Driven Consensus",
      "Workbook-First Protocol",
      "# The 8 School Objections",
      "## Objection 8:",
      "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
    ]) {
      expect(text).toContain(phrase);
    }
  });

  it("names Boonyathat only together with the consent rule", () => {
    const mentions = statements(allText()).filter((statement) => /Boonyathat/.test(statement));
    expect(mentions.length).toBeGreaterThan(0);
    for (const statement of mentions) {
      expect(statement).toMatch(/consent/);
    }
  });

  it("leaves the pilot terms open (Q-SV-05): no free period, no discount, no price concession", () => {
    const [demo] = roleplay("school-sale", "Roleplay: The 30-Minute Demo");
    expect(demo!.criteria.map((criterion) => criterion.criterion)).toContain(
      "Proposes the pilot (one grade level, one semester) with no free period and no discount",
    );
    expect(lesson("school-sale", "Roleplay: The Price-Conversation Close").content).toContain(
      "**Success standard:** the director agrees the pilot grade and semester, with no price concession.",
    );
  });

  it.each([
    "Roleplay: The 15-Minute Discovery Call",
    "Roleplay: The 30-Minute Demo",
    "Roleplay: The Price-Conversation Close",
  ])("%s has weighted criteria from the scenario checklist", (title) => {
    const [entry, ...extra] = roleplay("school-sale", title);
    expect(extra).toEqual([]);
    expect(entry!.criteria.filter((criterion) => criterion.sourceRef !== CLAIMS_SOURCE_REF)
      .every((criterion) => criterion.sourceRef.startsWith(
        "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-",
      ))).toBe(true);
  });
});

// S2 re-pin rows for advantage-pr 7eff8c106c7265b41d584c4ea997d65ea30dadfb.
// One row per review row of review/repin-7eff8c10.md that needs a seed change.
// A row proves two facts: the new source text holds, and the old text is gone.
// When several review sections name one seed line with different document
// wordings, every such row demands the phrase that all candidate wordings hold,
// so one correct seed edit satisfies all of them.

/** One review row of the re-pin review. */
type RepinRow = {
  section: number;
  id: string;
  source: string;
  newText: string[];
  oldText: string[];
};

/** The number of review rows that need a seed change. */
export const REPIN_ROW_COUNT = 67;

/** The rows of the re-pin, grouped by review section. */
export const REPIN_ROWS: RepinRow[] = [
  {
    section: 1,
    id: "S1.1",
    source: "09-sales-enablement/advantage-suite-at-a-glance.md",
    newText: ["Tutor Advantage is the company focus through May 2027."],
    oldText: ["The direct-to-family channel is the 2027 focus."],
  },
  {
    section: 1,
    id: "S1.2",
    source: "09-sales-enablement/advantage-suite-at-a-glance.md",
    newText: ["books are now in Tutor Advantage classes"],
    oldText: ["- **Reading Advantage:** no school uses it; work on the app is deferred. Its books sell through Tutor Advantage."],
  },
  {
    section: 1,
    id: "S1.3",
    source: "09-sales-enablement/advantage-suite-at-a-glance.md",
    newText: ["built from the Primary Advantage base app", "Anuban 2 to P2"],
    oldText: ["- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24).", "- **Planned, no date:** Storytime and STEM Advantage."],
  },
  {
    section: 1,
    id: "S1.4",
    source: "09-sales-enablement/advantage-suite-at-a-glance.md",
    newText: ["Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027."],
    oldText: ["Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027."],
  },
  {
    section: 1,
    id: "S1.5",
    source: "09-sales-enablement/advantage-suite-at-a-glance.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 2,
    id: "S2.1",
    source: "09-sales-enablement/battle-cards/vs-tutor.md",
    newText: ["about 2026-11-23 to 2026-11-30"],
    oldText: ["on sale from about 2026-11-22"],
  },
  {
    section: 2,
    id: "S2.2",
    source: "09-sales-enablement/battle-cards/vs-tutor.md",
    newText: ["built from the Primary Advantage base app"],
    oldText: ["\"coming programs\" with no date (Q-PR-24)"],
  },
  {
    section: 3,
    id: "S3.1",
    source: "09-sales-enablement/demo-scripts-checklist.md",
    newText: ["sample pages", "iPad"],
    oldText: [],
  },
  {
    section: 3,
    id: "S3.2",
    source: "09-sales-enablement/demo-scripts-checklist.md",
    newText: ["a direct question"],
    oldText: ["- One active school today (Kalasin, on Primary Advantage); under 500 students."],
  },
  {
    section: 3,
    id: "S3.3",
    source: "09-sales-enablement/demo-scripts-checklist.md",
    newText: ["Daniel agrees"],
    oldText: ["- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05).", "The school pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so offer no free period and no discount."],
  },
  {
    section: 3,
    id: "S3.4",
    source: "09-sales-enablement/demo-scripts-checklist.md",
    newText: ["A fuller service is in planning; we will share it when it is ready", "built from the Primary Advantage base app"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign.", "\"coming programs\" with no date (Q-PR-24)"],
  },
  {
    section: 4,
    id: "S4.1",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["Daniel agrees"],
    oldText: ["- Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05).", "- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05).", "The school pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so offer no free period and no discount."],
  },
  {
    section: 4,
    id: "S4.2",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 4,
    id: "S4.3",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["built from the Primary Advantage base app"],
    oldText: ["\"coming programs\" with no date (Q-PR-24)"],
  },
  {
    section: 4,
    id: "S4.4",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["since the cutover of 2026-10-20"],
    oldText: ["Primary Advantage cutover: target weekend of Oct 17/18, last date Oct 20", "Reedy Preview in Primary Advantage: only after the cutover passes"],
  },
  {
    section: 4,
    id: "S4.5",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["a direct question"],
    oldText: ["- One active school today (Kalasin, on Primary Advantage); under 500 students.", "Today we have one active school in Thailand, in Kalasin, on Primary Advantage, with under 500 active students.", "We are a Khon Kaen company with one active school and under 500 students today.", "Uses the approved Aka (2019) short form word for word, and states the current scale honestly (1 school, under 500 students)"],
  },
  {
    section: 4,
    id: "S4.6",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["Both stay on sale until their stock is gone. Then the new editions replace them.", "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027."],
    oldText: ["Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027."],
  },
  {
    section: 4,
    id: "S4.7",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["sample pages", "iPad"],
    oldText: [],
  },
  {
    section: 4,
    id: "S4.8",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["CEFR-aligned levels; the active program covers Pre-A1 to A2."],
    oldText: ["2. **The catalogue and the channels (15 minutes):** Primary Advantage for schools; the same books reach families through Tutor Advantage; the coming programs have no date."],
  },
  {
    section: 4,
    id: "S4.9",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 4,
    id: "S4.10",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["Mastery Advantage is rolling out to all of our products."],
    oldText: ["Today, Primary Advantage uses FSRS flashcard scheduling; the knowledge-graph layer is not yet in the Primary Advantage app."],
  },
  {
    section: 4,
    id: "S4.11",
    source: "09-sales-enablement/demo-scripts.md",
    newText: ["We are self-funded, with no outside investors, and we have one active school today."],
    oldText: ["We are: one active school, under 500 students, self-funded. That is why your school matters to us."],
  },
  {
    section: 5,
    id: "S5.1",
    source: "09-sales-enablement/distributor-launch-kit.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 5,
    id: "S5.2",
    source: "09-sales-enablement/distributor-launch-kit.md",
    newText: ["Both stay on sale until their stock is gone. Then the new editions replace them.", "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027."],
    oldText: ["Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027."],
  },
  {
    section: 5,
    id: "S5.3",
    source: "09-sales-enablement/distributor-launch-kit.md",
    newText: ["a direct question"],
    oldText: ["- One active school today (Kalasin, on Primary Advantage); under 500 students.", "Today we have one active school in Thailand, in Kalasin, on Primary Advantage, with under 500 active students."],
  },
  {
    section: 5,
    id: "S5.4",
    source: "09-sales-enablement/distributor-launch-kit.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign.", "**If Managed Service comes up:** \"Not sold today. It launches in 2027 only if 1–2 more schools sign.\""],
  },
  {
    section: 5,
    id: "S5.5",
    source: "09-sales-enablement/distributor-launch-kit.md",
    newText: ["Daniel agrees"],
    oldText: ["- Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05).", "- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05).", "The school pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so offer no free period and no discount."],
  },
  {
    section: 7,
    id: "S7.1",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["books are now in Tutor Advantage classes"],
    oldText: ["work on the app is deferred", "Its books sell through Tutor Advantage."],
  },
  {
    section: 7,
    id: "S7.2",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027."],
    oldText: ["Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027."],
  },
  {
    section: 7,
    id: "S7.3",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["Primary Advantage, Tutor Advantage, and CodeCamp Advantage", "books are now in Tutor Advantage classes", "built from the Primary Advantage base app", "Anuban 2 to P2"],
    oldText: ["- **Live:** Primary Advantage (one active school), Tutor Advantage, and CodeCamp Advantage (adult bootcamp).", "- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24).", "- **Planned, no date:** Storytime and STEM Advantage."],
  },
  {
    section: 7,
    id: "S7.4",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["Do not give a date for any of these lines."],
    oldText: ["Do not give a launch date for any planned line."],
  },
  {
    section: 7,
    id: "S7.5",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 7,
    id: "S7.6",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["complete curriculum is being brought to market"],
    oldText: ["Today we have one active school in Thailand, in Kalasin, on Primary Advantage, with under 500 active students.", "We are a Khon Kaen company with one active school and under 500 students today."],
  },
  {
    section: 7,
    id: "S7.7",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["Give this number only when a director asks, and never inflate it"],
    oldText: ["Never inflate this number.", "State the company size honestly.", "state the company size honestly"],
  },
  {
    section: 7,
    id: "S7.8",
    source: "09-sales-enablement/distributor-rep-onboarding/faq.md",
    newText: ["Daniel agrees"],
    oldText: ["- Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05).", "- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05).", "The school pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so offer no free period and no discount."],
  },
  {
    section: 8,
    id: "S8.1",
    source: "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
    newText: ["built from the Primary Advantage base app"],
    oldText: ["- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24).", "\"coming programs\" with no date (Q-PR-24)"],
  },
  {
    section: 8,
    id: "S8.2",
    source: "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 8,
    id: "S8.3",
    source: "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
    newText: ["a direct question about scale with the true count"],
    oldText: ["- One active school today (Kalasin, on Primary Advantage); under 500 students."],
  },
  {
    section: 8,
    id: "S8.4",
    source: "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign.", "**If Managed Service comes up:** \"Not sold today. It launches in 2027 only if 1–2 more schools sign.\""],
  },
  {
    section: 8,
    id: "S8.5",
    source: "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["**If Managed Service comes up:** \"Not sold today. It launches in 2027 only if 1–2 more schools sign.\"", "Uses zero banned terms; says only the one Managed Service line if it comes up."],
  },
  {
    section: 8,
    id: "S8.6",
    source: "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
    newText: ["Daniel agrees"],
    oldText: ["- Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05).", "- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05)."],
  },
  {
    section: 9,
    id: "S9.1",
    source: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
    newText: ["answers with the true count and never volunteers it"],
    oldText: ["State the company size honestly.", "We are a Khon Kaen company with one active school and under 500 students today."],
  },
  {
    section: 9,
    id: "S9.2",
    source: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
    newText: ["a direct question about scale with the true count"],
    oldText: ["Uses the approved Aka (2019) short form word for word, and states the current scale honestly (1 school, under 500 students)"],
  },
  {
    section: 9,
    id: "S9.3",
    source: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign.", "**If Managed Service comes up:** \"Not sold today. It launches in 2027 only if 1–2 more schools sign.\""],
  },
  {
    section: 9,
    id: "S9.4",
    source: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 10,
    id: "S10.1",
    source: "09-sales-enablement/facilitator-recruitment-kit.md",
    newText: ["After delivery, about 2026-11-23 to 2026-11-30: Primary Advantage Origins 3.2 and Primary Advantage Quest 4"],
    oldText: ["Primary Advantage Origins 3.2 and Quest 4: on sale from about 2026-11-22", "on sale from about 2026-11-22"],
  },
  {
    section: 11,
    id: "S11.1",
    source: "09-sales-enablement/line-trial-facilitator-script.md",
    newText: ["Primary Advantage Origins 3.2: on sale after delivery, about 2026-11-23 to 2026-11-30"],
    oldText: ["on sale from about 2026-11-22"],
  },
  {
    section: 11,
    id: "S11.2",
    source: "09-sales-enablement/line-trial-facilitator-script.md",
    newText: ["on sale after delivery, about 2026-11-23 to 2026-11-30"],
    oldText: ["on sale from about 2026-11-22"],
  },
  {
    section: 11,
    id: "S11.3",
    source: "09-sales-enablement/line-trial-facilitator-script.md",
    newText: ["Every book gets a graph-first rewrite, except Primary Advantage Origins 3.2 and Primary Advantage Quest 4, which need no rewrite.", "Reading Advantage Origins 2 follows the same edition handling.", "there is no automatic cut-over date"],
    oldText: [],
  },
  {
    section: 12,
    id: "S12.1",
    source: "09-sales-enablement/roi-calculator.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 12,
    id: "S12.2",
    source: "09-sales-enablement/roi-calculator.md",
    newText: ["built from the Primary Advantage base app"],
    oldText: ["\"coming programs\" with no date (Q-PR-24)"],
  },
  {
    section: 13,
    id: "S13.1",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["A fuller service is in planning; we will share it when it is ready"],
    oldText: ["Not sold today. It launches in 2027 only if 1–2 more schools sign."],
  },
  {
    section: 13,
    id: "S13.2",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["built from the Primary Advantage base app"],
    oldText: ["\"coming programs\" with no date (Q-PR-24)", "- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24)."],
  },
  {
    section: 13,
    id: "S13.3",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["Anuban 2 to P2"],
    oldText: ["- **Planned, no date:** Storytime and STEM Advantage."],
  },
  {
    section: 13,
    id: "S13.4",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["a direct question"],
    oldText: ["**Our size:** one active school (in Kalasin, on Primary Advantage) and under 500 active students. Say this honestly.", "Today we have one active school in Thailand, in Kalasin, on Primary Advantage, with under 500 active students.", "We are a Khon Kaen company with one active school and under 500 students today.", "Uses the approved Aka (2019) short form word for word, and states the current scale honestly (1 school, under 500 students)"],
  },
  {
    section: 13,
    id: "S13.5",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["on sale after delivery, about 2026-11-23 to 2026-11-30"],
    oldText: ["on sale from about 2026-11-22"],
  },
  {
    section: 13,
    id: "S13.6",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["Every book gets a graph-first rewrite, except Primary Advantage Origins 3.2 and Primary Advantage Quest 4, which need no rewrite.", "Reading Advantage Origins 2 follows the same edition handling.", "there is no automatic cut-over date"],
    oldText: [],
  },
  {
    section: 13,
    id: "S13.7",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["Science, Math, Zhongwen, or Storytime Advantage"],
    oldText: ["8. A Managed Service sale, or a date for Science, Math, or Zhongwen Advantage.", "a Managed Service sale, or a date for Science, Math, or Zhongwen Advantage"],
  },
  {
    section: 13,
    id: "S13.8",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["Daniel agrees"],
    oldText: ["- Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05).", "- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05).", "The school pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so offer no free period and no discount."],
  },
  {
    section: 13,
    id: "S13.9",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["Science, Math, Zhongwen, or Storytime Advantage"],
    oldText: ["8. A Managed Service sale, or a date for Science, Math, or Zhongwen Advantage.", "a Managed Service sale, or a date for Science, Math, or Zhongwen Advantage"],
  },
  {
    section: 13,
    id: "S13.10",
    source: "09-sales-enablement/sales-training-scope-2027.md",
    newText: ["since the cutover of 2026-10-20", "about 2026-11-23 to 2026-11-30"],
    oldText: ["Primary Advantage cutover: target weekend of Oct 17/18, last date Oct 20", "Reedy Preview in Primary Advantage: only after the cutover passes", "on sale from about 2026-11-22"],
  },
  {
    section: 14,
    id: "S14.1",
    source: "09-sales-enablement/tutor-family-sales-playbook.md",
    newText: ["Daniel ordered Primary Advantage Origins 3.2 and Primary Advantage Quest 4 on the night of 2026-10-26."],
    oldText: ["Primary Advantage Origins 3.2 and Quest 4 go on sale from about 2026-11-22."],
  },
  {
    section: 14,
    id: "S14.2",
    source: "09-sales-enablement/tutor-family-sales-playbook.md",
    newText: ["Every book gets a graph-first rewrite, except Primary Advantage Origins 3.2 and Primary Advantage Quest 4, which need no rewrite.", "Reading Advantage Origins 2 follows the same edition handling.", "there is no automatic cut-over date"],
    oldText: [],
  },
  {
    section: 14,
    id: "S14.3",
    source: "09-sales-enablement/tutor-family-sales-playbook.md",
    newText: ["Primary Advantage Origins 3.2 (after delivery, about 2026-11-23 to 2026-11-30)", "Primary Advantage Quest 4 (after delivery, about 2026-11-23 to 2026-11-30)", "Before delivery: tell the parent you will send a LINE message when it is ready"],
    oldText: ["on sale from about 2026-11-22", "Before that date: tell the parent that you will send a LINE message when it is ready"],
  },
  {
    section: 14,
    id: "S14.4",
    source: "09-sales-enablement/tutor-family-sales-playbook.md",
    newText: ["Primary Advantage Quest 5: not printed, and no print date", "Tell the parent the next book is not printed yet. Give no date. Promise no notice."],
    oldText: ["| Primary Advantage Quest 5: not printed |"],
  },
  {
    section: 14,
    id: "S14.5",
    source: "09-sales-enablement/tutor-family-sales-playbook.md",
    newText: ["เล่มต่อไปของชุดนี้ยังไม่ได้พิมพ์ค่ะ ตอนนี้ยังไม่มีกำหนดค่ะ", "The next book in this series is not printed yet. There is no date yet."],
    oldText: [],
  },
  {
    section: 14,
    id: "S14.6",
    source: "09-sales-enablement/tutor-family-sales-playbook.md",
    newText: ["Primary Advantage Origins 3.2 and Primary Advantage Quest 4 go on sale after delivery, about 2026-11-23 to 2026-11-30."],
    oldText: ["the books on sale from about 2026-11-22"],
  },
];

/** The row count of every review section of the re-pin review. */
const REPIN_SECTION_COUNTS: Record<number, number> = {
  1: 5,
  2: 2,
  3: 4,
  4: 11,
  5: 5,
  6: 0,
  7: 8,
  8: 6,
  9: 4,
  10: 1,
  11: 3,
  12: 2,
  13: 10,
  14: 6,
};

describe("S2 - the curriculum uses the advantage-pr 7eff8c10 source set", () => {
  it("holds one row for every review row that needs a seed change", () => {
    expect(REPIN_ROWS).toHaveLength(REPIN_ROW_COUNT);
  });

  it("counts the rows of every review section", () => {
    const counts: Record<number, number> = {};
    for (const section of Object.keys(REPIN_SECTION_COUNTS).map(Number)) {
      counts[section] = 0;
    }
    for (const entry of REPIN_ROWS) {
      counts[entry.section] = (counts[entry.section] ?? 0) + 1;
    }
    expect(counts).toEqual(REPIN_SECTION_COUNTS);
  });

  it.each(REPIN_ROWS)(
    "section $section $id holds the new source text and drops the old text",
    (entry: RepinRow) => {
      for (const text of entry.newText) {
        expect(allText(), `${entry.id}: the new source text is missing`).toContain(text);
      }
      for (const text of entry.oldText) {
        expect(allText(), `${entry.id}: the old text is still in the seed`).not.toContain(text);
      }
    },
  );
});
