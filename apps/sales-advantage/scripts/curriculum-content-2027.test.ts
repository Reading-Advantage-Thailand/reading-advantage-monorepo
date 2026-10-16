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

  it("lists the 9 claims conditions of the scope document in the claims lesson", () => {
    const content = lesson("product-knowledge-2027", "The Words We Use").content;
    for (const condition of CLAIMS_CONDITIONS) {
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

  it("uses the canonical product states", () => {
    for (const line of [
      "- **Live:** Primary Advantage (one active school), Tutor Advantage, and CodeCamp Advantage (adult bootcamp).",
      "- **Reading Advantage:** no school uses it; work on the app is deferred. Its books sell through Tutor Advantage.",
      "- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24).",
      "- **Planned, no date:** Storytime and STEM Advantage.",
    ]) {
      expect(productLesson()).toContain(line);
    }
  });

  it("gives the tier prices, the Tutor Advantage price, and the Managed Service line", () => {
    for (const line of [
      "| **App-Only** | Digital platform access | ~1,000 THB/student/year |",
      "| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |",
      "| **Managed Service** | Not sold today. It launches in 2027 only if 1–2 more schools sign. Never pre-sell it. | No price |",
      "One class package = one printed workbook, about 22–23 hours, from 3,000 baht. The price adapts to the market.",
    ]) {
      expect(productLesson()).toContain(line);
    }
  });

  it("shows the placement-to-book map and the print status of each book", () => {
    for (const row of [
      "| 1 | Primary Advantage Origins 1: not printed → offer **Primary Advantage Origins 2** | Pre-A1 | Reading Advantage Origins 1: not printed → offer **Reading Advantage Origins 2** | A1 |",
      "| 2 | **Primary Advantage Origins 2**: printed | Pre-A1 | **Reading Advantage Origins 2**: printed | A1 |",
      "| 3 | **Primary Advantage Origins 3.1**: printed. Primary Advantage Origins 3.2: on sale from about 2026-11-08 | Pre-A1 | Reading Advantage Origins 3.1 and 3.2: not printed → offer **Reading Advantage Origins 2** | A1 |",
      "| 4 | Primary Advantage Quest 4: on sale from about 2026-11-08. Until then → offer **Primary Advantage Origins 3.1** | A1 | Reading Advantage Quest 4: not printed → offer **Reading Advantage Origins 2** | A2 |",
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
      "The books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2. Primary Advantage Origins 3.2 and Quest 4 go on sale from about 2026-11-08.",
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
