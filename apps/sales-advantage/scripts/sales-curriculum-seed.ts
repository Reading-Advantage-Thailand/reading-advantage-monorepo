/**
 * Curriculum seed script for Sales Advantage.
 *
 * Generates draft curriculum content (modules, lessons, roleplay scenarios,
 * rubrics, quiz questions) from the canonical sales-enablement documents
 * and a curated set of general sales-effectiveness resources.
 *
 * Design principle: The curriculum's PRIMARY focus is teaching reps HOW to sell
 * effectively (discovery, listening, value framing, objection handling, closing)
 * — not just reciting Reading Advantage product features. Modules 1-3 cover
 * universal sales skills (SPIN, Sandler, Challenger, Voss). Modules 4-6 apply
 * those skills to RA-specific scenarios.
 *
 * Usage:
 *   AI_PROVIDER=openrouter pnpm --filter sales-advantage seed:curriculum
 *   AI_PROVIDER=mock pnpm --filter sales-advantage seed:curriculum  # dry run
 *   pnpm --filter sales-advantage seed:curriculum -- --force        # re-generate
 *
 * Output: Inserts rows into sales_* tables with reviewStatus='draft'.
 * Use the admin UI to approve content before it appears to reps.
 */

import { db } from "@reading-advantage/db";
import {
  salesModules,
  salesLessons,
  salesRoleplayScenarios,
  salesRubrics,
  salesQuizQuestions,
} from "@reading-advantage/db/schema";
import { getAIClient } from "@reading-advantage/ai";
import { z } from "zod";

const rubricCriteriaSchema = z.object({
  criterion: z.string(),
  weight: z.number().min(0).max(1),
  passingScore: z.number().min(0).max(100),
  sourceRef: z.string(),
});

const scenarioSchema = z.object({
  personaName: z.string(),
  personaRole: z.string(),
  situation: z.string(),
  objective: z.string(),
  prospectContext: z.string(),
  rubric: z.object({
    name: z.string(),
    criteria: z.array(rubricCriteriaSchema),
  }),
});

const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
  explanation: z.string(),
});

const lessonSchema = z.object({
  title: z.string(),
  type: z.enum(["theory", "roleplay", "quiz"]),
  content: z.string().describe("Rich markdown theory content for theory lessons"),
  order: z.number(),
  scenarios: z.array(scenarioSchema).optional().describe("Required for roleplay lessons"),
  quizQuestions: z.array(quizQuestionSchema).optional().describe("Required for quiz lessons"),
});

const moduleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  phase: z.string(),
  order: z.number(),
  lessons: z.array(lessonSchema).min(1),
});

const curriculumSchema = z.object({
  modules: z.array(moduleSchema).min(6).max(6),
});

async function getSourceDocuments(): Promise<string[]> {
  const baseDir = process.env.HOME ? `${process.env.HOME}/Desktop/advantage-pr/09-sales-enablement` : "~/Desktop/advantage-pr/09-sales-enablement/";
  const docPaths = [
    `${baseDir}/distributor-rep-onboarding/README.md`,
    `${baseDir}/objection-handling-guide.md`,
    `${baseDir}/role-play-scenarios.md`,
    `${baseDir}/demo-scripts.md`,
    `${baseDir}/roi-calculator.md`,
    `${baseDir}/06-research-and-evidence/outcome-claims-policy.md`,
  ];
  const docs: string[] = [];
  for (const p of docPaths) {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(p, "utf-8");
      docs.push(`[${p}]\n${content.slice(0, 3000)}`);
    } catch (e) {
      console.warn(`[WARN] Could not read ${p}. Continuing without it.`);
    }
  }
  return docs;
}

const CURRICULUM_SYSTEM_PROMPT = `You are generating curriculum for an internal sales-coaching app called "Sales Advantage."

CURRICULUM DESIGN PRINCIPLE:
The primary purpose is to teach reps HOW TO SELL EFFECTIVELY as a general skill —
discovery questioning, listening, framing value in the buyer's language, handling
resistance, asking for the order. Reading Advantage product knowledge is the secondary
layer, applied once the rep can already hold a buyer-centric conversation.

The curriculum has 6 modules. Modules 1-3 teach UNIVERSAL sales methodology.
Modules 4-6 apply those skills to Reading Advantage's product suite.

AVAILABLE SOURCE MATERIAL (included below):
- Distributor rep onboarding (5-day path)
- Objection handling guide
- Role-play scenarios
- Demo scripts
- ROI calculator
- Outcome claims policy
- Plus the following general sales canon (study these and incorporate into Modules 1-3):
  * SPIN Selling (Rackham, 1988): Situation → Problem → Implication → Need-payoff
  * Sandler 7-step: Bonding → Up-front contract → Pain → Budget → Decision → Fulfillment → Post-sell
  * Challenger Sale (Dixon & Adamson): Teach → Tailor → Take Control
  * Never Split the Difference (Voss): Active listening, mirroring, labeling, calibrated questions
  * Buyer psychology: anchoring, loss-aversion, status-quo bias

OUTPUT SCHEMA:
{
  "modules": [
    {
      "slug": "unique-kebab-case",
      "title": "Module Title",
      "description": "2-3 sentence overview",
      "phase": "Foundations" | "Conversations" | "Close",
      "order": 1-6,
      "lessons": [
        {
          "title": "Lesson Title",
          "type": "theory" | "roleplay" | "quiz",
          "content": "For theory lessons: rich markdown covering the concept with TL;DR, examples, and a 3-5 exercise/summary.",
          "order": 1-N,
          "scenarios": [
            {
              "personaName": "e.g., Director Somchai",
              "personaRole": "e.g., School Director",
              "situation": "The scenario setup",
              "objective": "What the rep must achieve",
              "prospectContext": "Brief school context",
              "rubric": {
                "name": "Rubric Name",
                "criteria": [
                  { "criterion": "Criterion name", "weight": 0.3, "passingScore": 70, "sourceRef": "source doc reference" }
                ]
              }
            }
          ],
          "quizQuestions": [
            { "question": "Question text", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Why A is correct" }
          ]
        }
      ]
    }
  ]
}

MODULE STRUCTURE:
Module 1: Sales Foundations — Discovery & Listening (5 lessons: 4 theory, 1 roleplay)
  - SPIN framework, active listening, labeling, silence, open vs closed questions
Module 2: Framing Value in the Buyer's Language (4 lessons: 3 theory, 1 roleplay)
  - Features → benefits → outcomes, anchoring, Challenger Teach-Tailor-Take Control
Module 3: Handling Resistance & Objections (4 lessons: 2 theory, 1 roleplay, 1 quiz)
  - Sandler reverse, feel-felt-found, isolating objections, trial close, when to walk away
Module 4: Reading Advantage Product Knowledge & RA-Specific Discovery (4 lessons: 2 theory, 1 roleplay, 1 quiz)
  - 9-product suite, service tiers, Big 4 Protocol, Messaging House, honest claims discipline
Module 5: Applied Objection Handling & Demo for RA (5 lessons: 2 theory, 2 roleplay, 1 quiz)
  - The 5 canonical objections, 15/45/90-minute demos, competitive kill-shots
Module 6: Pricing, Negotiation & Closing (4 lessons: 1 theory, 2 roleplay, 1 quiz)
  - TCO framing, pricing anchors, handling discount push, scoped-pilot close, implementation handoff

Total: ~26 lessons, ~10 roleplay scenarios, ~4 quizzes, ~12 unique rubrics.
Output JSON that strictly follows the schema above. Every roleplay scenario MUST have a rubric.`;

async function generateCurriculum(): Promise<z.infer<typeof curriculumSchema>> {
  const sourceDocs = await getSourceDocuments();
  const srcText = sourceDocs.length > 0
    ? `\n\nSOURCE DOCUMENTS (for Modules 4-6):\n${sourceDocs.join("\n---\n")}`
    : "\n\n(No RA-specific source docs found. Generate generic sales curriculum for Modules 1-3 and placeholder content for Modules 4-6.)";

  const aiClient = getAIClient();
  const result = await aiClient.generateObject({
    schema: curriculumSchema,
    prompt: `${CURRICULUM_SYSTEM_PROMPT}\n${srcText}`,
    temperature: 0.7,
    maxTokens: 16384,
  });

  return result;
}

async function seed(): Promise<void> {
  const force = process.argv.includes("--force");

  // Check if already seeded
  if (!force) {
    const existing = await db.select().from(salesModules).limit(1);
    if (existing.length > 0) {
      console.log("Curriculum already exists (found modules). Use --force to re-generate.");
      return;
    }
  }

  console.log("Generating curriculum via AI...");
  const curriculum = await generateCurriculum();
  console.log(`Generated ${curriculum.modules.length} modules.`);

  for (const mod of curriculum.modules) {
    // Upsert module
    const [savedMod] = await db
      .insert(salesModules)
      .values({
        id: crypto.randomUUID(),
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        phase: mod.phase,
        order: mod.order,
      })
      .onConflictDoNothing()
      .returning();
    const moduleId = savedMod?.id ?? "fallback-id";

    for (const lesson of mod.lessons) {
      const [savedLesson] = await db
        .insert(salesLessons)
        .values({
          id: crypto.randomUUID(),
          moduleId,
          title: lesson.title,
          type: lesson.type,
          content: lesson.content ?? "",
          order: lesson.order,
          reviewStatus: "draft",
        })
        .returning();
      const lessonId = savedLesson?.id;

      if (lesson.scenarios && lesson.scenarios.length > 0 && lessonId) {
        for (const sc of lesson.scenarios) {
          const [savedRubric] = await db
            .insert(salesRubrics)
            .values({
              id: crypto.randomUUID(),
              name: sc.rubric.name,
              criteriaJson: sc.rubric.criteria,
              reviewStatus: "draft",
            })
            .returning();
          const rubricId = savedRubric?.id;

          if (rubricId) {
            await db.insert(salesRoleplayScenarios).values({
              id: crypto.randomUUID(),
              lessonId,
              personaName: sc.personaName,
              personaRole: sc.personaRole,
              situation: sc.situation,
              objective: sc.objective,
              prospectContextJson: { context: sc.prospectContext },
              rubricId,
              order: 1,
            });
          }
        }
      }

      if (lesson.quizQuestions && lesson.quizQuestions.length > 0 && lessonId) {
        for (let qi = 0; qi < lesson.quizQuestions.length; qi++) {
          const q = lesson.quizQuestions[qi];
          await db.insert(salesQuizQuestions).values({
            id: crypto.randomUUID(),
            lessonId,
            question: q.question,
            optionsJson: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: qi + 1,
          });
        }
      }
    }
  }

  console.log(
    `Inserted ${curriculum.modules.length} modules. All in reviewStatus='draft'.`,
  );
  console.log("Run the admin UI to review and approve content.");
}

seed()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });