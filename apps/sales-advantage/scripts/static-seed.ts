/**
 * Deterministic 2027 Sales curriculum release candidate: a shared core of sales
 * skills, then a Family branch (Tutor Advantage class packages and tutor
 * recruitment) and a School branch (Primary Advantage with Blended Learning).
 * Content comes from the advantage-pr source set (sales-training-scope-2027.md)
 * with a learn → practice → evaluate → reflect progression in each module.
 *
 * The graph is immutable and machine-reviewed, but it may be seeded in a release
 * only after curriculum/release-candidate.json carries explicit human approval.
 *
 * Run through: pnpm --filter sales-advantage seed:production-curriculum
 */

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { sql } from "drizzle-orm";

import { db, type DB } from "@reading-advantage/db/client";
import {
  salesChatMessages,
  salesConversations,
  salesModules,
  salesLessons,
  salesProgress,
  salesRoleplayAttempts,
  salesRoleplayScenarios,
  salesRubrics,
  salesQuizQuestions,
} from "@reading-advantage/db/schema";

/** Exact reviewed-graph predecessor accepted by the one-time reconciler. */
export const SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256 =
  "f8b1391302650874154066d5a21189a71d3cbaf78b528f579642fc9fc696f0e7";

/** Exact owner-controlled approval evidence digest required for reconciliation. */
export const SALES_CURRICULUM_OWNER_APPROVAL_SHA256 =
  "8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404";

/** Exact canonical digest of the approved replacement curriculum graph. */
export const SALES_CURRICULUM_APPROVED_GRAPH_SHA256 =
  "ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717";

type RubricCriterion = {
  criterion: string;
  weight: number;
  passingScore: number;
  sourceRef: string;
};

/** Facts in the 2027 lessons that change over time (advantage-pr sales-training-scope-2027.md §8). */
export const SALES_CURRICULUM_EXPIRING_FACTS = Object.freeze([
  {
    fact: "Primary Advantage Origins 3.2 and Quest 4 on sale in Tutor Advantage",
    text: "on sale from about 2026-11-08",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
  {
    fact: "LINE placement trial tool (Q-SE-12)",
    text: "Until the tool exists",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
  {
    fact: "School pilot: paid or free (Q-SV-05)",
    text: "Whether the pilot is paid or free is not decided (Q-SV-05)",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
  {
    fact: "Public date for Science, Math, and Zhongwen Advantage (Q-PR-24)",
    text: "Science, Math, and Zhongwen Advantage (Q-PR-24)",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
  {
    fact: "First Reading Advantage set print date (Q-WB-11)",
    text: "Reading Advantage Origins 3.1 and 3.2: not printed",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
  {
    fact: "Primary Advantage cutover (what is live in a school demo)",
    text: "Primary Advantage cutover: target weekend of Oct 17/18, last date Oct 20",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
  {
    fact: "Reedy Preview in Primary Advantage",
    text: "Reedy Preview in Primary Advantage: only after the cutover passes",
    checkIn: "advantage-pr 09-sales-enablement/sales-training-scope-2027.md §8",
  },
]);

const CLAIMS_SOURCE_REF =
  "09-sales-enablement/sales-training-scope-2027.md#7-the-claims-criterion-for-roleplays";

/** The claim that only the trainee's sales channel can make wrong. */
const CHANNEL_CLAIMS = {
  family: "an earnings figure or commission talk in a family sale",
  school: "a discount, a free period, or a response time",
  recruitment:
    "a promise of income; a baht figure that is not labeled as a formula example; \"get rich\" framing or pressure to recruit",
} as const;

/**
 * Builds the claims criterion of the scope document §7: one violation fails the attempt.
 * @param weight Criterion weight in the rubric.
 * @param focus The roleplay-specific claims standard from the source playbook.
 * @param channel The sales channel whose own forbidden claim applies.
 * @returns A criterion with passingScore 90 and the scope §7 source reference.
 */
function claimsCriterion(
  weight: number,
  focus: string,
  channel: keyof typeof CHANNEL_CLAIMS,
): RubricCriterion {
  return {
    criterion:
      `Claims: ${focus} The trainee makes none of these claims: a guarantee or a promise of an outcome (including "รับประกัน" or any percentage gain); false urgency; a promise of Read Along with Reedy, or Tutor Advantage called an AI tutor; a book that is not printed, or a level above book level 4 or above A2; Pearson, GSE, or YLE in a line to a parent or a school; a book name without the product name; ${CHANNEL_CLAIMS[channel]}; a Managed Service sale, or a date for Science, Math, or Zhongwen Advantage; "leading", "best", "#1", or a percentage with no source. Score 100 when the trainee makes none of these claims; score 0 for any one of them.`,
    weight,
    passingScore: 90,
    sourceRef: CLAIMS_SOURCE_REF,
  };
}

/**
 * Joins the Thai text and its English version for one roleplay field.
 * @param thai The Thai text, shown first.
 * @param english The English version, a second option for the trainee.
 * @returns Thai first, then a blank line and the English text.
 */
function thaiFirst(thai: string, english: string): string {
  return `${thai}\n\nEnglish: ${english}`;
}

/**
 * Builds the discovery rubric shared by the core discovery roleplay.
 * @param channel The sales channel of the scenario.
 * @returns Five weighted criteria, including the claims criterion.
 */
function discoveryRubric(channel: "family" | "school"): RubricCriterion[] {
  return [
    {
      criterion:
        "Asked at least 2 open discovery questions (situation and problem) before describing the product",
      weight: 0.25,
      passingScore: 70,
      sourceRef: "general-sales://spin-selling-rackham-1988#question-sequence",
    },
    {
      criterion: "Showed active listening (mirrored, labeled, or used silence)",
      weight: 0.2,
      passingScore: 70,
      sourceRef: "general-sales://never-split-the-difference-voss-2016#tactical-empathy",
    },
    {
      criterion: "Did not pitch the product before the buyer named the need",
      weight: 0.2,
      passingScore: 70,
      sourceRef: "general-sales://spin-selling-rackham-1988#discovery-before-solution",
    },
    {
      criterion: "Ended with a clear next-step ask with a day and a time",
      weight: 0.15,
      passingScore: 70,
      sourceRef: "general-sales://sandler-selling-system#up-front-contract",
    },
    claimsCriterion(0.2, "Makes no product claims and no promise during discovery.", channel),
  ];
}

/**
 * Builds the value-framing rubric shared by the core value roleplay.
 * @param channel The sales channel of the scenario.
 * @returns Five weighted criteria, including the claims criterion.
 */
function valueRubric(channel: "family" | "school"): RubricCriterion[] {
  return [
    {
      criterion:
        "Reframed \"I cannot see results\" as a need to see progress, not a need for more content",
      weight: 0.25,
      passingScore: 70,
      sourceRef: "general-sales://challenger-sale-dixon-adamson-2011#reframe",
    },
    {
      criterion:
        "Translated at least one feature into value that the buyer can see (for example, progress in the child's app, or per-school reporting)",
      weight: 0.25,
      passingScore: 70,
      sourceRef: "general-sales://challenger-sale-dixon-adamson-2011#commercial-teaching",
    },
    {
      criterion:
        "Used a cost of doing nothing that the buyer confirmed, with no invented number",
      weight: 0.15,
      passingScore: 70,
      sourceRef: "general-sales://prospect-theory-kahneman-tversky-1979#loss-aversion",
    },
    {
      criterion:
        "Ended with a small next step (a placement trial, or a pilot of one grade level for one semester), not a full contract",
      weight: 0.15,
      passingScore: 70,
      sourceRef: "general-sales://prospect-theory-kahneman-tversky-1979#status-quo-bias",
    },
    claimsCriterion(0.2, "Promises no score, no percentage, and no result.", channel),
  ];
}

/**
 * Builds the objection rubric shared by the core objection roleplay.
 * @param channel The sales channel of the scenario.
 * @returns Five weighted criteria, including the claims criterion.
 */
function objectionRubric(channel: "family" | "school"): RubricCriterion[] {
  return [
    {
      criterion: "Acknowledged the objection without an immediate counter-attack",
      weight: 0.2,
      passingScore: 70,
      sourceRef: "general-sales://feel-felt-found#acknowledge-before-response",
    },
    {
      criterion: "Asked a clarifying question to isolate the real objection",
      weight: 0.25,
      passingScore: 70,
      sourceRef: "general-sales://sandler-selling-system#reverse-and-isolate",
    },
    {
      criterion: "Reframed with the buyer's own words, not general sales words",
      weight: 0.2,
      passingScore: 70,
      sourceRef: "general-sales://challenger-sale-dixon-adamson-2011#tailor",
    },
    {
      criterion: "Closed with a trial-close question or one next step, not a monologue",
      weight: 0.15,
      passingScore: 70,
      sourceRef: "general-sales://spin-selling-rackham-1988#need-payoff",
    },
    claimsCriterion(0.2, "Does not say that software alone solves the problem, and promises no result.", channel),
  ];
}

/**
 * Builds the product-knowledge rubric for the core product roleplay.
 * @param channel The sales channel of the scenario.
 * @returns Four weighted criteria, including the claims criterion.
 */
function productRubric(channel: "family" | "school"): RubricCriterion[] {
  return [
    {
      criterion:
        "Answered each question directly and correctly from the 2027 product facts",
      weight: 0.35,
      passingScore: 60,
      sourceRef: channel === "family"
        ? "09-sales-enablement/sales-training-scope-2027.md#4-facts-to-train-approved-wording"
        : "09-sales-enablement/distributor-rep-onboarding/faq.md#q3-what-do-we-sell-and-which-products-are-live-right-now",
    },
    {
      criterion: "Corrected the wrong idea calmly, without blaming the buyer",
      weight: 0.2,
      passingScore: 60,
      sourceRef: "general-sales://feel-felt-found#acknowledge-before-response",
    },
    {
      criterion:
        "Returned to the buyer's need with one discovery question or one next step",
      weight: 0.2,
      passingScore: 60,
      sourceRef: "general-sales://spin-selling-rackham-1988#question-sequence",
    },
    claimsCriterion(
      0.25,
      "Promises nothing that is not live and printed today, and gives no date for a planned line.",
      channel,
    ),
  ];
}

export const staticSalesCurriculumModules = [
  {
    slug: "foundations-discovery",
    title: "Sales Foundations: Discovery & Listening",
    description:
      "Learn buyer-centered discovery for both sales channels: SPIN questions, active listening, and open questions. The same skills work with a parent on LINE and with a school director.",
    phase: "Core",
    order: 1,
    lessons: [
      {
        title: "Why Discovery Beats Pitching",
        type: "theory" as const,
        content: `# Why Discovery Beats Pitching

**TL;DR:** The seller who asks good questions and listens finds the real need. Discovery comes before the product in every method that this course teaches: SPIN, Sandler, and the Challenger approach. If you skip it, you guess.

## Listen more than you talk

In discovery, ask a question and then listen. When you describe the product before you understand the need, you answer a problem that the buyer may not have. When you ask first, the buyer tells you what matters and why.

## The SPIN Framework (Rackham, 1988)

Neil Rackham's research team studied more than 35,000 sales calls. They found four question types in successful calls:

1. **Situation questions** collect facts. Use few of them.
   - Parent: "Which grade is your child in?"
   - School: "How many English teachers do you have now?"
2. **Problem questions** find what is not working.
   - Parent: "Where does your child learn English now: at school, or other places too?"
   - School: "What happens when a foreign teacher leaves mid-year?"
3. **Implication questions** show what the problem costs.
   - Parent: "How does your child feel when English homework comes home?"
   - School: "What happens to the English program while you look for a new teacher?"
4. **Need-payoff questions** let the buyer say the value of a solution.
   - Parent: "What would it mean for your child to read a book at their own level?"
   - School: "What would it mean if the English lessons continued when a teacher leaves?"

## The sequence matters

Do not jump to need-payoff questions in the first minute. The sequence builds the buyer's own reasons. If you skip the implication questions, the buyer says "Interesting, send me some information", and the conversation stops.

## Practical exercise

Pick one real family or one real school. Write two questions for each of the four SPIN types: eight questions in total. Say them aloud before your next conversation.

## What good discovery looks like

| Seller | What they do |
|---|---|
| Beginner | Describes the product. Asks "What are you looking for?" |
| Intermediate | Asks situation and problem questions, then describes the product. |
| Strong | Uses the full SPIN sequence. The buyer explains the need in their own words. |

The goal: at the end of discovery, the buyer has said why the problem matters.`,
        order: 1,
      },
      {
        title: "Active Listening, Mirroring, and Labeling",
        type: "theory" as const,
        content: `# Active Listening, Mirroring, and Labeling

**TL;DR:** Chris Voss, a former FBI hostage negotiator, teaches three listening tools in *Never Split the Difference* (2016): mirroring, labeling, and the calibrated question. They help the buyer say more about what they want.

## Mirroring

When the buyer says something important, **repeat the last one to three words as a question**.

> Parent: "ราคาก็สำคัญนะคะ ตอนนี้ค่าใช้จ่ายเยอะ"
> Tutor: "ค่าใช้จ่ายเยอะ?"
> Parent: "ค่ะ ลูกเรียนพิเศษอยู่สองที่แล้ว..."
>
> English: Parent: "The price matters. We have many costs now." Tutor: "Many costs?" Parent: "Yes, my child already has two extra classes..."

The buyer continues and tells you more. You did not ask "Why?", which can sound like an interrogation.

## Labeling: name the feeling

Buyers decide with feeling and explain with logic. When you name the feeling, it becomes smaller.

Templates:
- "It sounds like…"
- "It seems like…"
- "It looks like…"

> Director: "We tried two English apps, and the teachers stopped using both."
> You: "It sounds like you are worried that this is another expensive mistake."
> Director: "Exactly. And the teachers complained each time."

## The calibrated question

A calibrated question is open. It makes the buyer think. Two useful forms:

- **"How am I supposed to do that?"**: when the buyer asks for a discount or for terms that you cannot give.
- **"What is the biggest challenge with English for your child (or your school) right now?"**: when you look for the real need.

Calibrated questions start with "how" or "what", not with "are you" or "do you".

## Use silence

After a hard question, stop talking. Count to five in your head. The buyer fills the silence, often with the real answer.

## Practice

In each conversation this week, mirror at least three times, label a feeling at least once, and wait five seconds after your hardest question. Write down what happened.`,
        order: 2,
      },
      {
        title: "Open Questions, Closed Questions, and When to Use Each",
        type: "theory" as const,
        content: `# Open Questions, Closed Questions, and When to Use Each

**TL;DR:** Open questions open the conversation. Closed questions confirm a decision. Use mostly open questions in discovery and mostly closed questions in the close.

## Open and closed

**Open** (how, what, where, why, who, "tell me about…"):
- "What do you most want for your child: reading, speaking, or vocabulary?"
- "How do parents react to the English program now?"

→ They get information and get the buyer talking.

**Closed** (are, do, have, will, can: yes or no):
- "Is Tuesday or Thursday better for the trial?"
- "Can we schedule the demo with your head of English next week?"

→ They get a commitment and move to the next step.

## The beginner's mistake

New sellers ask closed questions in discovery because they want a "yes". But "Yes, we are interested" tells you nothing about the need.

## The better move

In discovery, make your questions open. If you hear yourself say "Do you…", change it to "What…" or "How…".

| Closed (weak) | Open (strong) |
|---|---|
| "Does your child have problems with English?" | "What does your child find hardest in English?" |
| "Are parents happy with the English program?" | "What do parents say about the English program this year?" |
| "Is budget a concern?" | "How does the school decide the English budget?" |

## In the close, change direction

In the close, you want a yes or a no. An open question invites the buyer to think again. A closed question asks for the decision.

| Open (weak close) | Closed (strong close) |
|---|---|
| "What do you think?" | "Can your child start in the Tuesday group next week?" |
| "How do you feel about the plan?" | "Can we start the pilot in Grade 4 next semester?" |

## One exception: the trial close

A trial close is a closed question in the middle of the conversation. It tests interest without pressure.

- "If the book matches your child's level, would you like to talk about a start date?"
- "If this solves the problem of teachers who leave, is it worth a longer meeting with your academic team?"`,
        order: 3,
      },
      {
        title: "Discovery Roleplay: The First Conversation",
        type: "roleplay" as const,
        content: `**Method:** Open with a short agenda (an up-front contract). Then use SPIN in order: only the situation facts that you need, the problem, its effect, and let the buyer say the value of a solution.

**Listening standard:** Mirror or label the buyer's concern before your next question. Do not describe Tutor Advantage or Primary Advantage until the buyer has named the need.

**Parent version:** Ask about the grade, where the child learns English now, what the parent wants most, what the child likes, and free days and times (family sales playbook §3). Ask in Thai or in English.

**School version:** Ask how long the English program has run, what happens when a foreign teacher leaves, and how the school measures whether the program works (role-play scenario 1).

**Focus:** questions first. Talk about the product only after the buyer has told you what they need.

**Success standard:** Agree a specific next step with a day and a time: a placement trial for the parent, or a longer meeting for the director.`,
        order: 4,
        scenarios: [
          {
            personaName: "คุณพ่อของน้องต้นข้าว (Ton Khao's father)",
            personaRole: "Parent of a Grade 4 (ป.4) child, Kalasin",
            situation: thaiFirst(
              "คุณพ่อของน้องต้นข้าวเจอคุณที่งานของโรงเรียน และแอด LINE ไว้ วันนี้คุณโทรคุยกับเขาเป็นครั้งแรก เขายังไม่รู้จักคลาสของคุณ คุณพ่อพูดว่า: \"สวัสดีครับ ลูกผมอยู่ ป.4 ครับ ภาษาอังกฤษไม่ค่อยดี อยากรู้ว่าคลาสของครูเป็นยังไงครับ\"",
              "Ton Khao's father met you at a school event and added you on LINE. Today you call him for the first time. He does not know your class yet. The father says: \"Hello. My son is in Grade 4. His English is not very good. What is your class like?\"",
            ),
            objective: thaiFirst(
              "ใช้คำถาม SPIN: ถามเรื่องชั้นเรียน ที่ที่น้องเรียนภาษาอังกฤษตอนนี้ สิ่งที่คุณพ่ออยากได้ และวันเวลาที่ว่าง ฟังและทวนคำพูดของคุณพ่อ อย่าเพิ่งเล่าเรื่องคลาสก่อนรู้ความต้องการ แล้วขอนัดทดลองอ่านโดยระบุวันและเวลา",
              "Use SPIN questions: ask about the grade, where the child learns English now, what the father wants most, and free days and times. Listen and mirror the father's words. Do not describe the class before you know the need. Then ask for a placement trial with a day and a time.",
            ),
            prospectContext:
              "The father is friendly but busy. He gives short answers until the trainee asks good questions. He worries that his son is shy about speaking English. Score the trainee's side only; the trainee may speak Thai or English.",
            rubric: discoveryRubric("family"),
          },
          {
            personaName: "Director Somsri",
            personaRole: "Director, 400-student private primary school, Udon Thani",
            situation:
              "You have a 15-minute first call. Director Somsri's school has two foreign teachers, and one has just given notice. She tried two education apps before, and the teachers stopped using both. She does not know Primary Advantage or the company.",
            objective:
              "Run a short SPIN discovery. Find the real need (likely: what happens to the English program when a teacher leaves). Do not describe Primary Advantage yet. End by asking for a longer meeting with her academic team, with a day and a time.",
            prospectContext:
              "Somsri is busy, polite, and careful. She gives short answers until the trainee earns longer ones. She has been director for seven years.",
            rubric: discoveryRubric("school"),
          },
        ],
      },
      {
        title: "Universal Discovery Quiz",
        type: "quiz" as const,
        content: "",
        order: 5,
        quizQuestions: [
          {
            question:
              "A director says, 'We have tried three platforms and none of them stuck.' What is the best next move?",
            options: [
              "Explain how your product is different from the others.",
              "Mirror: 'None of them stuck?' and pause.",
              "Ask 'What were the three platforms?' so that you can compare yourself with them.",
              "Offer a discount to remove the price objection.",
            ],
            correctAnswer: "Mirror: 'None of them stuck?' and pause.",
            explanation:
              "A mirror of the last words invites the buyer to say more. You learn what 'did not stick' really means, which is often adoption, not features. A pitch at this point stops the conversation.",
          },
          {
            question:
              "In SPIN, which question type shows the buyer what the problem costs?",
            options: [
              "Situation question",
              "Problem question",
              "Implication question",
              "Need-payoff question",
            ],
            correctAnswer: "Implication question",
            explanation:
              "Implication questions show the effects of the problem. Without them, the buyer agrees that there is a problem but does not act on it.",
          },
          {
            question:
              "You ask a hard discovery question. The buyer pauses. What do you do?",
            options: [
              "Ask the question again in other words.",
              "Move to a different question.",
              "Wait in silence for about five seconds.",
              "Fill the silence with examples.",
            ],
            correctAnswer: "Wait in silence for about five seconds.",
            explanation:
              "The buyer thinks during the pause. If you fill the silence, you take away the thinking time and you lose the real answer.",
          },
          {
            question:
              "A parent's first LINE message is 'How much is your class?' What is the best first move?",
            options: [
              "Give the price and the start dates, then wait.",
              "Answer briefly, then ask which grade the child is in and what the parent wants most.",
              "Send the parent info deck and wait.",
              "Offer a free first class.",
            ],
            correctAnswer:
              "Answer briefly, then ask which grade the child is in and what the parent wants most.",
            explanation:
              "Discovery comes before the product. A short, honest answer keeps trust, and the questions find the need. The tutor offers no free class.",
          },
        ],
      },
    ],
  },
  {
    slug: "framing-value",
    title: "Framing Value in the Buyer's Language",
    description:
      "Translate each feature into value that the buyer can see, without inventing an outcome. Use anchoring and the Challenger approach with parents and with school directors.",
    phase: "Core",
    order: 2,
    lessons: [
      {
        title: "Features → Benefits → Outcomes",
        type: "theory" as const,
        content: `# Features → Benefits → Outcomes

**TL;DR:** Translate what the product does into value that the buyer can see. Never invent an outcome.

## The three layers

| Layer | Tutor Advantage example | Primary Advantage example | Who cares most? |
|---|---|---|---|
| **Feature** | A printed workbook at the child's level, with its matching app in LINE | Printed workbooks of 14 lessons with a fixed lesson plan | The person who checks the product |
| **Benefit** | The child reads with a local tutor in a small group, one lesson at a time | Thai teachers teach with confidence; native fluency is not necessary | The child, or the teacher |
| **Value the buyer can see** | Progress that the parent can see in the child's app | Quarterly fidelity reports and per-school reporting | The parent, or the director |

The outcome layer names what the buyer can see and check: the book level, the lessons completed, and the progress in the app.

## Evidence-safe translation

> ❌ "Your child will improve one level this term."
>
> ✅ "What your child gets is a book at their level, a small class with a local teacher, and progress that you can see in your child's app."

> ❌ "Every student will gain a grade level."
>
> ✅ "We measure and report outcomes per school (benchmark deltas + reading volume + fidelity scores), because results vary by implementation quality and reading volume."

Use the approved statements word for word. If a buyer asks for a result that the evidence does not support, explain what the buyer will be able to see instead.

## Practice

For each feature, write the feature, the benefit, and the evidence that the buyer can check. Mark each assumption. Describe only features that are live today.`,
        order: 1,
      },
      {
        title: "Anchoring, Loss-Aversion, and Buyer Psychology",
        type: "theory" as const,
        content: `# Anchoring, Loss-Aversion, and Buyer Psychology

**TL;DR:** Anchor the price to facts that the buyer can check, and keep each assumption visible.

## Anchor to real facts

**With a parent:** one class package is one printed book, about 25 hours, from 3,000 baht. That is about 120 baht per hour, and it includes the printed book and the app. Give the per-hour figure only together with these facts.

**With a school:** start with the school's own student count and its current English costs. The approved prices are about 1,000 THB/student/year for App-Only and about 1,500 THB/student/year for Blended Learning.

> "How many students are in scope, and what do you spend now on teachers, materials, recruitment, and lesson planning?"

Then calculate the annual cost: the student count × the price per student. Do not invent a package price, and do not say that an estimate is a quote.

## Loss aversion without invented outcomes

People feel a loss more strongly than an equal gain (Kahneman and Tversky, 1979). Talk only about costs that the buyer confirms: a teacher who leaves mid-year, materials that do not match, no reports for the board, or a child who loses interest in reading. Never turn a delay into a reading-gain number.

## Reduce status-quo friction

1. Use only numbers that the buyer gives, or approved prices.
2. For a school, offer a smaller start, the pilot: one grade level for one semester. Do not offer a discount.
3. Tie timing to real dates: the school procurement window (February to April), or the child's free days. Never make false urgency.

The goal is a clear decision, not pressure.`,
        order: 2,
      },
      {
        title: "The Challenger Sale: Teach, Tailor, Take Control",
        type: "theory" as const,
        content: `# The Challenger Sale: Teach, Tailor, Take Control

**TL;DR:** Strong sellers do not only ask "What keeps you up at night?" They teach the buyer something useful and reframe the problem.

## Five seller profiles (Dixon and Adamson, 2011)

The research for *The Challenger Sale* studied more than 6,000 sales reps. It describes five profiles:

1. **Hard Worker**: high effort
2. **Lone Wolf**: works alone
3. **Reactive Problem Solver**: answers fast
4. **Relationship Builder**: liked by clients
5. **Challenger**: teaches, tailors, and takes control

The authors found that Challengers did best in complex sales. A school sale is complex: several people decide, and the decision lasts a school year.

## The three Cs

### 1. Teach
Give the buyer a view that they did not have.

> ❌ "What are your top priorities this year?"
>
> ✅ "Many private schools tell me the same thing: when a foreign teacher leaves, the program stops until a new teacher comes. The question is not only how to find a teacher. It is how to keep the lessons going when a teacher leaves."

The teach must be true and sourced. This one comes from the school demo script. A seller who has not heard this from schools yet uses the market line from the demo script: "Thai private schools outside the major cities find it hard to recruit and keep qualified foreign English teachers." Never invent data to teach.

### 2. Tailor
Fit the teach to this buyer, in the buyer's words.

If the parent talks about "confidence", use "confidence". If the director talks about "parents' trust", use "parents' trust". Tailoring makes the teach land.

### 3. Take control
Guide the conversation. Be polite and firm.

> Buyer: "Send me some information and I will get back to you."
>
> ❌ "Sure! When is a good time?"
>
> ✅ "I can. A document cannot show whether this fits your school. Can we have 45 minutes next week with your academic team? I will show the app and bring printed workbooks."

You did not refuse. You offered a better next step.

## The reframe

The reframe shows the buyer that the problem they see is part of a bigger problem that you can help with.

> Parent: "I just want my child to get better grades in English."
>
> Reframe: "The class starts with a placement trial. The trial finds the printed book that your child starts with, and your child reads one lesson at a time with a local tutor."

> Director: "We need better English scores."
>
> Reframe: "A school can give every class the same lesson plan, the same workbook, and the same quality check, also when a teacher leaves. Rather than promise a specific number, we commit to transparent per-school reporting."

The buyer learned something, and the conversation moved away from price.`,
        order: 3,
      },
      {
        title: "Value-Framing Roleplay: \"I Cannot See What I Pay For\"",
        type: "roleplay" as const,
        content: `**Method:** Translate features into value that the buyer can see. Reframe "I cannot see results" as a need to see progress. Ask a need-payoff question in the buyer's own words.

**Parent facts you may use:** a printed book at the child's level; a local tutor in a small group; progress that the parent can see in the child's app; Reedy voice practice after each completed lesson, for students with an active class package.

**School facts you may use:** a fixed lesson plan for every lesson; 2-day teacher training; quarterly fidelity observations; per-school reporting of benchmark deltas, reading volume, and fidelity scores.

**Evidence:** if research comes up, use the approved Aka (2019) form, word for word.

**Success standard:** The buyer agrees to a small next step: a placement trial for the parent, or a pilot of one grade level for one semester for the director.`,
        order: 4,
        scenarios: [
          {
            personaName: "คุณแม่ของน้องใบเตย (Bai Toey's mother)",
            personaRole: "Parent of a Grade 5 (ป.5) child, Khon Kaen",
            situation: thaiFirst(
              "คุณแม่ของน้องใบเตยส่งลูกไปเรียนพิเศษภาษาอังกฤษมาหนึ่งปีแล้ว ตอนนี้กำลังคิดว่าจะให้ลูกเรียนต่อที่ไหนดี คุณแม่พูดว่า: \"จ่ายค่าเรียนพิเศษมาทั้งปี แต่ไม่รู้เลยว่าลูกเก่งขึ้นหรือเปล่า ไม่เห็นว่าเรียนอะไรไปบ้างค่ะ\"",
              "Bai Toey's mother has paid for an extra English class for one year. Now she is thinking about where her daughter should study next. She says: \"I paid for extra classes all year, but I do not know if my child got better. I cannot see what she learned.\"",
            ),
            objective: thaiFirst(
              "เปลี่ยนมุมมองจาก \"ไม่เห็นผล\" เป็น \"อยากเห็นความคืบหน้า\" อธิบายสิ่งที่คุณแม่จะเห็นได้จริง: หนังสือที่เหมาะกับระดับของน้อง และความคืบหน้าที่ดูได้ในแอปของน้อง แล้วชวนทดลองอ่านโดยระบุวันและเวลา",
              "Reframe \"I cannot see results\" as \"I want to see progress\". Explain what the mother can really see: a book at her child's level and progress that she can see in her child's app. Then invite her to a placement trial with a day and a time.",
            ),
            prospectContext:
              "The mother is polite but tired of paying without information. She asks whether her child will surely improve. A strong trainee does not promise; a weak trainee says that the child will improve.",
            rubric: valueRubric("family"),
          },
          {
            personaName: "Director Wisanu",
            personaRole: "Owner-director, private primary school, Khon Kaen",
            situation:
              "On a follow-up call, Wisanu says: 'Parents complain that they pay for English but do not see their children improve. They cannot tell what we do differently from the school down the road.'",
            objective:
              "Reframe the problem: the school needs progress that parents and the board can see, not only more English content. Explain the fixed lesson plan, the quarterly fidelity observations, and per-school reporting. Move toward a pilot of one grade level for one semester.",
            prospectContext:
              "Wisanu is the decision-maker and the budget owner. He measures success in families who stay, but he has no verified number for families who left.",
            rubric: valueRubric("school"),
          },
        ],
      },
      {
        title: "Value-Framing Reflection Quiz",
        type: "quiz" as const,
        content: "",
        order: 5,
        quizQuestions: [
          {
            question:
              "A director asks what result Primary Advantage will guarantee. What is the best response?",
            options: [
              "Promise one grade level if the school follows the implementation plan.",
              "Use the approved research form and explain the per-school reporting that the school will see.",
              "Quote an adoption percentage from another school.",
              "Avoid the question and return to product features.",
            ],
            correctAnswer:
              "Use the approved research form and explain the per-school reporting that the school will see.",
            explanation:
              "The outcome-claims policy allows the approved research forms and transparent per-school reporting. It does not allow an outcome guarantee.",
          },
          {
            question:
              "A parent asks, 'Will my child surely pass the English test?' Which answer is approved?",
            options: [
              "Yes, if your child comes to every class.",
              "We do not promise test scores. What we give is a book at your child's level, a small class with a local teacher, and progress that you can see in your child's app.",
              "Most of our students improve by 20%.",
              "Our method is the best in Thailand.",
            ],
            correctAnswer:
              "We do not promise test scores. What we give is a book at your child's level, a small class with a local teacher, and progress that you can see in your child's app.",
            explanation:
              "This is the approved answer from the LINE trial script. A guarantee, a percentage with no source, or \"the best\" fails the claims criterion.",
          },
        ],
      },
    ],
  },
  {
    slug: "objections",
    title: "Handling Resistance & Objections",
    description:
      "An objection is a request for more information. Learn the Sandler reverse, isolation, and feel-felt-found, and find the real objection before you answer.",
    phase: "Core",
    order: 3,
    lessons: [
      {
        title: "The Stated Objection Is Often Not the Real One",
        type: "theory" as const,
        content: `# The Stated Objection Is Often Not the Real One

**TL;DR:** When a buyer says "It is too expensive", the price is often not the whole story. Your job is to find the real objection: usually risk, fit, authority, or timing.

## Four real objections

What buyers say:
- "It is too expensive."
- "We need to think about it."
- "Send me a proposal."

What they can mean:
1. **Risk**: "I do not believe that this will work for us."
2. **Fit**: "I do not think that this solves my problem."
3. **Authority**: "I am not the person who decides."
4. **Timing**: "I do not see why I should act now."

If you answer only the stated objection (the price), the real objection (for example, risk) stays.

## The Sandler reverse

When you hear an objection, do not answer it at once. Ask a question instead.

> Buyer: "It is just too expensive for us right now."
>
> ❌ Weak: "I can give you 10% off if you sign this month."
>
> ✅ Sandler reverse: "Help me understand: when you say 'too expensive', is it the total amount, or is it that you do not yet see the value at that amount? Those are two different conversations."

Now you know which real objection you have.

## Feel-felt-found (use with care)

When you know the real objection, feel-felt-found shows that you understand:

> "I understand how you **feel**. Other parents have **felt** the same way. What they **found** was [a true fact that you can show]."

Say "Other parents have felt the same way" only when it is true for you. Complete the "found" part only with something true that you saw yourself, or with an approved fact. Never invent a school, a person, or a result. Never name a school, or show its data, without its written consent. Use this pattern at most once in a conversation.

## The isolation question

Before you answer an objection, make sure that it is the only one.

> "If we solve the budget question, is there anything else that stops us from moving forward?"

If the answer is "Yes, the teachers also worry about it", you learned it before you made any offer.

## The three-question sequence

Use it each time that you hear an objection:

1. **Acknowledge** (label the feeling): "It sounds like the budget is a real concern."
2. **Reverse** (ask a question): "Help me understand: is it the total cost, the cost per student, or the timing?"
3. **Isolate** (confirm that it is the only issue): "If we solve the timing, is there anything else?"

You did not pitch anything. You turned the objection into a diagnosis.`,
        order: 1,
      },
      {
        title: "Negotiating Without Discounting",
        type: "theory" as const,
        content: `# Negotiating Without Discounting

**TL;DR:** You offer no discount. Hold the approved price, explain what it includes, and change the size of the start, not the price.

## The approved prices

- **Schools:** App-Only about 1,000 THB/student/year; Blended Learning about 1,500 THB/student/year.
- **Families:** one class package from 3,000 baht: one printed book, about 25 hours, about 120 baht per hour, with the printed book and the app.

Discount policy is Daniel's decision, and it is not set (Q-SV-05). So the seller offers no discount and no free period.

## Change the start, not the price

> Director: "The total is above our approved budget. Can you lower the price?"
>
> Seller: "I cannot offer a discount. What I can offer is a pilot: one grade level for one semester, so that you see the program in your school before a full commitment. I will ask Daniel about the pilot terms for your school."

> Parent: "ถูกลงได้ไหมคะ" (Can you make it cheaper?)
>
> Tutor: "เข้าใจค่ะ ราคาเริ่มต้น 3,000 บาทต่อหนึ่งแพ็กเกจ ประมาณ 25 ชั่วโมง เฉลี่ยประมาณ 120 บาทต่อชั่วโมง และรวมหนังสือฉบับพิมพ์กับแอปแล้วค่ะ" (I understand. The price starts at 3,000 baht for one package of about 25 hours. That is about 120 baht per hour, and it includes the printed book and the app.)

Keep the student count, the price, and the term visible. Send each request for a special price or special terms to Daniel or Phikul.

## What good looks like

A good answer confirms the real budget limit, offers a smaller start at the approved price, and agrees a dated next step. It never improvises a discount, urgency, or savings.`,
        order: 2,
      },
      {
        title: "Objection Roleplay: \"We Tried Something Like This and It Failed\"",
        type: "roleplay" as const,
        content: `**Method:** Acknowledge the earlier bad experience. Ask what failed, and isolate the real objection before you answer. Use a Sandler reverse instead of a defense of the product.

**Parent facts you may use:** a local tutor teaches a small group from a printed book; the app helps with flashcards, games, and speaking practice with Reedy after each completed lesson; the parent can see progress in the child's app.

**School facts you may use:** the workbook comes first, with a fixed lesson plan; 2-day teacher training; quarterly observations with a standard form; one person on our team is the school's implementation contact.

**Success standard:** Confirm the real risk and agree one next step that tests it.`,
        order: 3,
        scenarios: [
          {
            personaName: "คุณแม่ของน้องภูมิ (Phum's mother)",
            personaRole: "Parent of a Grade 2 (ป.2) child, Udon Thani",
            situation: thaiFirst(
              "คุณแม่ของน้องภูมิเคยสมัครแอปเรียนภาษาอังกฤษให้ลูก แต่น้องใช้ได้สองสัปดาห์ก็เลิก คุณแม่พูดว่า: \"เคยสมัครแอปเรียนภาษาอังกฤษให้ลูกแล้วค่ะ เล่นได้สองอาทิตย์ก็ไม่เปิดอีกเลย เสียเงินเปล่า คลาสนี้จะต่างกันยังไงคะ\"",
              "Phum's mother once paid for an English learning app. Her son used it for two weeks and then stopped. She says: \"I paid for an English app before. He used it for two weeks and never opened it again. It was a waste of money. How is this class different?\"",
            ),
            objective: thaiFirst(
              "รับฟังและยอมรับความรู้สึกของคุณแม่ก่อน ถามว่าตอนนั้นอะไรทำให้น้องเลิกใช้ แล้วหาความกังวลจริง อธิบายว่าคลาสนี้มีครูติวเตอร์สอนกลุ่มเล็กจากหนังสือฉบับพิมพ์ และแอปเป็นตัวช่วย แล้วเสนอขั้นต่อไปหนึ่งอย่าง",
              "First acknowledge the mother's feeling. Ask what made her son stop, and find the real concern. Explain that in this class a tutor teaches a small group from a printed book, and the app helps. Then offer one next step.",
            ),
            prospectContext:
              "The mother is open but does not want to waste money again. Her real concern is that her son loses interest without a person to guide him.",
            rubric: objectionRubric("family"),
          },
          {
            personaName: "Director Pranom",
            personaRole: "Director, established primary school (40 years), Khon Kaen",
            situation:
              "Pranom says: 'We tried an English learning app two years ago. The teachers refused to use it after a month, parents got nothing from it, and we wasted 80,000 baht. Why will yours be different?'",
            objective:
              "Do not defend Primary Advantage as a product. Use the Sandler reverse to find the real objection (likely: 'I am worried that the teachers will not use this either'). Isolate it. Then propose a next step that tests teacher adoption, not a feature pitch.",
            prospectContext:
              "Pranom has worked in education for more than 35 years. She is the decision-maker. Her staff resist change. She trusts evidence more than enthusiasm.",
            rubric: objectionRubric("school"),
          },
        ],
      },
      {
        title: "Universal Objection Quiz",
        type: "quiz" as const,
        content: "",
        order: 4,
        quizQuestions: [
          {
            question: "A buyer says 'It is too expensive.' What is the best first move?",
            options: [
              "Offer a 10% discount to close quickly.",
              "Ask: 'When you say too expensive, is it the total amount or the value at that amount?'",
              "Send the ROI calculator at once.",
              "Agree to think about a smaller order.",
            ],
            correctAnswer:
              "Ask: 'When you say too expensive, is it the total amount or the value at that amount?'",
            explanation:
              "This is the Sandler reverse: ask a question instead of an answer. Until you know whether it is risk, fit, authority, or the real budget, any answer is a guess.",
          },
          {
            question: "Which is the worst way to answer a buyer who pushes for a discount?",
            options: [
              "Offer a smaller start, such as the pilot, at the approved price.",
              "Explain again what the price includes.",
              "Lower the price by 10% to close the deal.",
              "Use a calibrated question to find the real budget limit.",
            ],
            correctAnswer: "Lower the price by 10% to close the deal.",
            explanation:
              "The seller offers no discount: discount policy is Daniel's decision (Q-SV-05). A discount also teaches the buyer that the price is not real. Change the size of the start, not the price.",
          },
          {
            question: "What does it mean to 'isolate' an objection?",
            options: [
              "Repeat the objection to check that you heard it correctly.",
              "Ask whether there are other concerns before you answer this one.",
              "Ask the buyer to write the objection down.",
              "Come back to it after more product features.",
            ],
            correctAnswer:
              "Ask whether there are other concerns before you answer this one.",
            explanation:
              "Isolation stops you from solving objection 1 and then finding objection 2 and objection 3. Ask 'If we solve this, is there anything else?' first.",
          },
        ],
      },
    ],
  },
  {
    slug: "product-knowledge-2027",
    title: "Product Knowledge 2027: One Catalogue, Two Channels",
    description:
      "What the company sells in 2027, through which channel, at which price, and what is live today. Learn the claims rules that every roleplay checks.",
    phase: "Core",
    order: 4,
    lessons: [
      {
        title: "One Catalogue, Two Channels",
        type: "theory" as const,
        content: `# One Catalogue, Two Channels

**TL;DR:** We are a curriculum publisher. The product is a printed workbook (14 lessons) and its digital twin. The same books sell through two channels: **Blended Learning** for schools and **Tutor Advantage** for families, direct. Sell only what is live and printed today.

## The two channels

| Channel | Who buys | What they buy |
|---|---|---|
| **Blended Learning** | Schools | Workbooks + app + teacher training + Big 4 fidelity observations |
| **Tutor Advantage** | Families | One class package per workbook, taught by a local tutor in a small group |

The direct-to-family channel is the 2027 focus.

## What is live (as of October 2026)

- **Live:** Primary Advantage (one active school), Tutor Advantage, and CodeCamp Advantage (adult bootcamp).
- **Reading Advantage:** no school uses it; work on the app is deferred. Its books sell through Tutor Advantage.
- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24).
- **Planned, no date:** Storytime and STEM Advantage.

Do not give a launch date for any planned line.

**Mastery Advantage** is the engine behind every book: Knowledge Space Theory + FSRS. It is in production for CodeCamp Advantage. It is entering Primary Advantage through tagged content; adaptive features are targeted for May 2027.

**Our size:** one active school (in Kalasin, on Primary Advantage) and under 500 active students. Say this honestly. Name Boonyathat, or show its data, only with the school's written consent (Q-SE-03).

## Tutor Advantage: what the family buys

Tutor Advantage is a tutor-led class network with a unilevel commission for tutors. It is not an AI tutor app. One class package = one printed workbook, about 25 hours, from 3,000 baht. The price adapts to the market. Reedy voice practice is live in Tutor Advantage for students with an active class package, on lessons they completed. Read Along with Reedy is in development and not available.

## The school tiers

| Tier | What you get | Price |
|---|---|---|
| **App-Only** | Digital platform access | ~1,000 THB/student/year |
| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |
| **Managed Service** | Not sold today. It launches in 2027 only if 1–2 more schools sign. Never pre-sell it. | No price |

Blended Learning means physical workbooks + the digital app. Never say "AI + human teacher". The school pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so offer no free period and no discount.

## The books and the placement-to-book map

Children use Primary Advantage books. Secondary students use Reading Advantage books. A placement gives a program and a book level from 1 to 4. Parents hear CEFR names only. If the book for the level is not printed, the tutor offers the nearest printed book below the level. If no printed book is below the level, the tutor offers the lowest printed book in that program.

| Book level | Primary Advantage (children) | CEFR | Reading Advantage (secondary students) | CEFR |
|---|---|---|---|---|
| 1 | Primary Advantage Origins 1: not printed → offer **Primary Advantage Origins 2** | Pre-A1 | Reading Advantage Origins 1: not printed → offer **Reading Advantage Origins 2** | A1 |
| 2 | **Primary Advantage Origins 2**: printed | Pre-A1 | **Reading Advantage Origins 2**: printed | A1 |
| 3 | **Primary Advantage Origins 3.1**: printed. Primary Advantage Origins 3.2: on sale from about 2026-11-08 | Pre-A1 | Reading Advantage Origins 3.1 and 3.2: not printed → offer **Reading Advantage Origins 2** | A1 |
| 4 | Primary Advantage Quest 4: on sale from about 2026-11-08. Until then → offer **Primary Advantage Origins 3.1** | A1 | Reading Advantage Quest 4: not printed → offer **Reading Advantage Origins 2** | A2 |

A placement above book level 4 does not exist in the training. A tutor never offers a book that is not printed and never names a level above A2.

## Facts that expire

The print status, the "on sale" dates, and the open decisions change. These lessons mark them: the books on sale from about 2026-11-08, the Reading Advantage books that are not printed, the trial tool, the pilot terms, and the coming programs. Before each sales week, ask Daniel or Phikul which of these facts changed.`,
        order: 1,
      },
      {
        title: "The Words We Use",
        type: "theory" as const,
        content: `# The Words We Use

**TL;DR:** Every claim about learning outcomes must trace to a published research citation or to our own transparent per-school reporting. If a claim does not trace to one of these two, do not make it.

## Approved research forms (Aka, 2019)

Use one form, word for word. Do not paraphrase.

- **Short form** (sales conversations): "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)."
- **Long form** (formal presentations): "A controlled one-year study (Aka, 2019) found that extensive-reading instruction (2 hours/week) outperformed grammar instruction on reading test scores. On the post-test reading section (0–100 scale), the extensive-reading group scored higher (61.78 vs 52.29; ~+9.5 points)."
- **Applied to our product:** "Our platform leverages the same extensive-reading methodology shown to be effective in controlled research."

For results, say: "We measure and report outcomes per school (benchmark deltas + reading volume + fidelity scores), because results vary by implementation quality and reading volume."

## CEFR names only

Say "CEFR-aligned", and name CEFR levels only: Pre-A1, A1, A2. Never say GSE, Pearson, or YLE to a parent or a school. The active program stops at A2, so never offer a level above A2.

## Book names

Always say the full book name with the product name: "Primary Advantage Origins 2", "Reading Advantage Origins 2". Never say "Origins 2" alone.

## The class, the app, and the prices

- "A local tutor teaches a small group from a printed book."
- "Reedy voice practice after each completed lesson."
- Family: "from 3,000 baht for a class package".
- School: "App-Only ~1,000 ฿ and Blended Learning ~1,500 ฿ for each student each year".

## What fails a roleplay

Every roleplay in this course has a claims criterion with passingScore 90. One violation fails the attempt. These are the 9 violations:

1. A guarantee or a promise of an outcome ("รับประกัน", "your child will improve", any percentage gain).
2. False urgency ("only today", "the last seats", a deadline that does not exist).
3. A promise of Read Along with Reedy, or Tutor Advantage called an AI tutor.
4. A book that is not printed, or any level above book level 4 or above A2.
5. Pearson, GSE, or YLE in a line to a parent or a school.
6. A book name without the product name ("Origins 2" alone).
7. An earnings figure in a family sale. Commission talk belongs to tutor recruitment only.
8. A Managed Service sale, or a date for Science, Math, or Zhongwen Advantage.
9. "Leading", "best", "#1", or a percentage with no source.

In tutor recruitment, item 7 changes: commission talk is allowed, but a promise of income fails, and every baht figure must be a labeled example from the commission formula. In a school sale, item 7 is: a discount, a free period, or a promised response time.

## When the buyer asks for a guarantee

1. Say that it is the right question.
2. Give the Aka (2019) short form.
3. Explain what the buyer will be able to see: per-school reports for a school, or progress in the child's app for a parent.
4. Never turn a story, a hope, or a planned case study into evidence.`,
        order: 2,
      },
      {
        title: "Roleplay: \"What Exactly Do You Sell?\"",
        type: "roleplay" as const,
        content: `**Method:** Answer the question directly and honestly. Correct a wrong idea calmly. Then ask one discovery question to return to the buyer's need.

**Parent facts:** Tutor Advantage is a tutor-led class network. It is not an AI tutor. A local tutor teaches a small group from a printed book. Reedy voice practice is live in Tutor Advantage for students with an active class package, on lessons they completed. Read Along with Reedy is in development and not available.

**School facts:** For schools, we sell Primary Advantage with Blended Learning (or App-Only). We do not offer a secondary program to schools now; families of secondary students can join a Tutor Advantage class with the Reading Advantage books. Managed Service: "Not sold today. It launches in 2027 only if 1–2 more schools sign." Science, Math, and Zhongwen Advantage are coming programs with no date.

**Success standard:** The buyer has a correct picture of what is live, and agrees one next step.`,
        order: 3,
        scenarios: [
          {
            personaName: "คุณแม่ของน้องแพรวา (Praewa's mother)",
            personaRole: "Parent of a Grade 3 (ป.3) child, Khon Kaen",
            situation: thaiFirst(
              "คุณแม่ของน้องแพรวาเห็นโพสต์เรื่องคลาสใน Facebook และเข้าใจว่าเป็นแอปที่มี AI สอน คุณแม่พูดว่า: \"คลาสนี้เป็นติวเตอร์ AI ใช่ไหมคะ ลูกจะได้อ่านหนังสือตาม Reedy ได้เลยหรือเปล่าคะ\"",
              "Praewa's mother saw a post about the class on Facebook. She thinks that it is an app where an AI teaches. She says: \"Is this an AI tutor class? Can my child read along with Reedy right away?\"",
            ),
            objective: thaiFirst(
              "แก้ความเข้าใจผิดอย่างสุภาพ: ครูติวเตอร์เป็นคนสอน ไม่ใช่ติวเตอร์ AI อธิบายว่าน้องฝึกพูดกับ Reedy ได้หลังเรียนจบแต่ละบท ส่วน Read Along with Reedy ยังไม่เปิดให้ใช้ แล้วถามคำถามเพื่อรู้ความต้องการหนึ่งข้อ",
              "Correct the wrong idea politely: a tutor teaches; it is not an AI tutor. Explain that the child can practice speaking with Reedy after each completed lesson, and that Read Along with Reedy is not available. Then ask one discovery question.",
            ),
            prospectContext:
              "The mother is excited about AI. If the trainee agrees that it is an AI tutor, or promises Read Along with Reedy, the claims criterion fails.",
            rubric: productRubric("family"),
          },
          {
            personaName: "Director Anong",
            personaRole: "Director, private school with primary and secondary sections, Khon Kaen",
            situation:
              "After a short demo, Director Anong asks three questions: 'Can you also run the English program for our secondary section? Can your company send teachers to run the whole English department? And when does your Math program start?'",
            objective:
              "Answer each question honestly. Primary Advantage is for primary grades; there is no secondary program for schools now, and families of secondary students can join Tutor Advantage. For the second question, say the Managed Service line only: 'Not sold today. It launches in 2027 only if 1–2 more schools sign.' Give no date for Math Advantage. Then return to her primary-section need.",
            prospectContext:
              "Anong is interested and decisive. She will sign quickly if the trainee says yes to everything, so a weak trainee over-promises.",
            rubric: productRubric("school"),
          },
        ],
      },
      {
        title: "Product Knowledge Quiz",
        type: "quiz" as const,
        content: "",
        order: 4,
        quizQuestions: [
          {
            question:
              "A school needs help now and asks for Managed Service. What is the accurate response?",
            options: [
              "Sell Managed Service now at a custom price.",
              "Recommend Blended Learning now and say: 'Not sold today. It launches in 2027 only if 1–2 more schools sign.'",
              "Promise our own teachers in the classroom when the contract is signed.",
              "Offer Managed Service at the App-Only price.",
            ],
            correctAnswer:
              "Recommend Blended Learning now and say: 'Not sold today. It launches in 2027 only if 1–2 more schools sign.'",
            explanation:
              "Managed Service is not sold today. Say the one line, and return to Blended Learning.",
          },
          {
            question: "Which claim is approved for a sales conversation?",
            options: [
              "Every student improves by at least one level.",
              "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
              "Our program is the best in Thailand.",
              "Children learn 40% faster with our books.",
            ],
            correctAnswer:
              "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
            explanation:
              "This is the approved short form, word for word. The other claims fail the claims criterion.",
          },
          {
            question:
              "A secondary student places at book level 3. Which book does the tutor offer today?",
            options: [
              "Reading Advantage Origins 3.1",
              "Reading Advantage Origins 2",
              "Primary Advantage Origins 3.1",
              "Reading Advantage Quest 4",
            ],
            correctAnswer: "Reading Advantage Origins 2",
            explanation:
              "Reading Advantage Origins 3.1 and 3.2 are not printed. The tutor offers the nearest printed book below the level: Reading Advantage Origins 2.",
          },
          {
            question: "Which statement about Reedy is correct today?",
            options: [
              "Read Along with Reedy is open to every student.",
              "Reedy voice practice is live in Tutor Advantage for students with an active class package, on lessons they completed.",
              "Reedy is an AI tutor that replaces the tutor.",
              "Reedy works only in schools.",
            ],
            correctAnswer:
              "Reedy voice practice is live in Tutor Advantage for students with an active class package, on lessons they completed.",
            explanation:
              "Read Along with Reedy is in development and not available. Tutor Advantage is a tutor-led class network, not an AI tutor.",
          },
          {
            question: "After a placement trial, what does the parent hear?",
            options: [
              "A GSE score.",
              "The full book name and its CEFR level.",
              "A Pearson level.",
              "The child's percentage score.",
            ],
            correctAnswer: "The full book name and its CEFR level.",
            explanation:
              "Parents hear the full book name and its CEFR level only. Never say GSE, Pearson, or YLE, and do not tell the parent a score.",
          },
        ],
      },
    ],
  },
  {
    slug: "family-sale",
    title: "Family Sale: Tutor Advantage Class Packages",
    description:
      "Sell one Tutor Advantage class package to a family: the parent conversation, the placement trial, the close, and the next book. Thai first, with English.",
    phase: "Family branch",
    order: 5,
    lessons: [
      {
        title: "What the Parent Buys and the Five-Step Family Sale",
        type: "theory" as const,
        content: `# What the Parent Buys and the Five-Step Family Sale

**TL;DR:** A tutor sells one Tutor Advantage class package to a family: one printed book, about 25 hours, from 3,000 baht. The sale has five steps, from the first contact to the next book.

**Video — Selling Tutor Advantage to a Family:** [Thai](https://www.youtube.com/watch?v=-hFxfRmQ3wM) · [English](https://www.youtube.com/watch?v=lvc979ref6M)

## What the parent buys

- **One class package = one printed workbook**, about 25 hours, in a small group with a local tutor. 14 lessons in each book.
- **Price:** from 3,000 baht per class package. The price adapts to the market.
- **The app:** the LINE student app that matches the book: the lesson, flashcards, vocabulary games, progress, and class chat.
- **Reedy:** Reedy voice practice is live in Tutor Advantage for students with an active class package, on lessons they completed. Read Along with Reedy is in development and not available.
- The books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2. Primary Advantage Origins 3.2 and Quest 4 go on sale from about 2026-11-08. Children use Primary Advantage books. Secondary students use Reading Advantage books.

Tutor Advantage is a tutor-led class network. It is not an AI tutor.

## The family sale in five steps

| Step | What the tutor does | Result |
|---|---|---|
| **1. First contact** | Meets the parent through their own network, LINE, or Facebook. Asks to talk for 10 minutes. | A conversation on LINE or in person |
| **2. The parent conversation** | Asks questions and listens. Explains the class in two sentences. | The parent agrees to a placement trial |
| **3. The placement trial** | Runs the trial. | A program and a book level from 1 to 4, then a printed book |
| **4. The close** | Names the book, explains it, gives the price, and asks when the child can start. Answers objections. | The parent enrolls and pays in the LINE student app |
| **5. Start and the next book** | Teaches the 14 lessons. At about lesson 12, talks with the parent about the next book. | A second class package |

## After the conversation

**If the parent says yes:**
1. Help the parent open the class in the LINE student app and enroll the child.
2. If the child is under 18, the parent fills in the guardian details. The app asks for them.
3. The parent pays in the app (PromptPay or card).
4. Show the parent the class schedule and the class chat.
5. Send the parent info deck (PDF) in LINE.

**If the parent says maybe:** add the parent as a LINE contact, send the parent info deck (PDF), send one follow-up message after 3 days, and invite the parent to watch a class if the group agrees.

**If the parent says no:** thank the parent for their time, ask if you can keep the LINE contact for future classes, and invite the parent to follow the official LINE account.

Never talk about tutor commission with a parent. Before you use any photo or video of a child from the trial or the class, get written parental consent.`,
        order: 1,
      },
      {
        title: "Placement: Program, Book Level, and the Printed Book",
        type: "theory" as const,
        content: `# Placement: Program, Book Level, and the Printed Book

**TL;DR:** The placement trial gives a **program** and a **book level from 1 to 4**. Then the tutor offers a printed book. There is no level above 4.

## The placement result

- A child in primary school uses **Primary Advantage** books.
- A secondary student uses **Reading Advantage** books.
- The parent hears the book name and its CEFR level. Never say GSE, Pearson, or YLE.
- If the book for the level is not printed, offer the **nearest printed book below** the level. If no printed book is below the level, offer the **lowest printed book** in the program.

| Book level | Primary Advantage (children) | Reading Advantage (secondary students) |
|---|---|---|
| 1 | Primary Advantage Origins 1 (Pre-A1): not printed → **Primary Advantage Origins 2** | Reading Advantage Origins 1 (A1): not printed → **Reading Advantage Origins 2** |
| 2 | **Primary Advantage Origins 2** (Pre-A1): printed | **Reading Advantage Origins 2** (A1): printed |
| 3 | **Primary Advantage Origins 3.1** (Pre-A1): printed. Primary Advantage Origins 3.2: on sale from about 2026-11-08 | Reading Advantage Origins 3.1 and 3.2 (A1): not printed → **Reading Advantage Origins 2** |
| 4 | Primary Advantage Quest 4 (A1): on sale from about 2026-11-08. Until then → **Primary Advantage Origins 3.1** | Reading Advantage Quest 4 (A2): not printed → **Reading Advantage Origins 2** |

Check the print status before each trial. It changes when a new book is printed.

## The trial tool

The LINE placement trial tool is not in the Tutor Advantage code yet, and no result screen exists (Q-SE-12). When it is built, it must report a program and a book level from 1 to 4.

**Until the tool exists, use the printed books** (interim method; Daniel to confirm, Q-SE-12):

1. Ask the parent which school grade the child is in. Primary school: Primary Advantage books. Secondary school: Reading Advantage books.
2. Open lesson 1 of the lowest printed book in that program.
3. The child reads the article aloud and answers the first comprehension questions.
4. If the child reads with few stops and answers most questions, try lesson 1 of the next printed book.
5. The result is the highest printed book that the child reads comfortably.

## Before and during the trial

**Setup (2 minutes).** The tutor says:

> "สวัสดีค่ะคุณพ่อคุณแม่ วันนี้เราจะทดลองอ่านภาษาอังกฤษกับน้องประมาณ 10 นาที เพื่อดูว่าน้องควรเริ่มจากหนังสือเล่มไหน ไม่ต้องเตรียมตัวอะไรเลยค่ะ"
>
> "Hello! Today we will do a short English reading trial with your child, about 10 minutes. It shows which book your child should start with. No preparation is necessary."

**During the trial,** watch the child and make notes: confidence (does the child stop, guess, or work through the text step by step?), reading speed, and engagement. Use the notes to make the closing conversation personal. Do not tell the parent a score.`,
        order: 2,
      },
      {
        title: "The Parent Conversation, the Close, and Objections",
        type: "theory" as const,
        content: `# The Parent Conversation, the Close, and Objections

**TL;DR:** Ask, then listen. Do not sell before the placement trial. After the trial, give the result, explain the book, bridge to the class package, and ask when the child can start.

## The parent conversation (discovery)

| Ask about | Thai | English |
|---|---|---|
| School grade | "น้องเรียนอยู่ชั้นไหนคะ" | "Which grade is your child in?" |
| English now | "ตอนนี้น้องเรียนภาษาอังกฤษที่ไหนบ้างคะ ที่โรงเรียนหรือที่อื่นด้วย" | "Where does your child learn English now: at school, or other places too?" |
| What the parent wants | "คุณพ่อคุณแม่อยากให้น้องเก่งเรื่องไหนมากที่สุดคะ อ่าน พูด หรือคำศัพท์" | "What do you most want for your child: reading, speaking, or vocabulary?" |
| What the child likes | "น้องชอบอ่านหนังสือหรือฟังนิทานไหมคะ" | "Does your child like books or stories?" |
| Time | "วันและเวลาไหนที่น้องว่างเรียนคะ" | "Which days and times is your child free?" |

**Explain the class in two sentences:**

> "คลาสของเราเป็นกลุ่มเล็ก มีครูติวเตอร์ในพื้นที่สอนจากหนังสือแบบฝึกหัดฉบับพิมพ์ที่เหมาะกับระดับของน้อง พร้อมแอปใน LINE ที่คู่กับหนังสือ เราทดลองอ่านกับน้องประมาณ 10 นาทีก่อน เพื่อดูว่าน้องควรเริ่มจากเล่มไหนค่ะ"
>
> "Our class is a small group. A local tutor teaches from a printed workbook at your child's level, with a matching app in LINE. First we do a 10-minute reading trial to see which book your child should start with."

## The close after the trial

**Step 1: Give the result (30 seconds).**

> "เสร็จแล้วค่ะ! น้องเริ่มที่หนังสือ [ชื่อหนังสือเต็ม] ได้เลยค่ะ เล่มนี้อยู่ในระดับ [Pre-A1 / A1] ตามกรอบ CEFR"
>
> "Done! Your child can start with [full book name]. This book is at [Pre-A1 / A1] on the CEFR scale."

Always say the full book name, for example "Primary Advantage Origins 2".

**Step 2: Explain the book (1 minute).** Use the line for the book that you offer. For a Primary Advantage Origins book (Pre-A1):

> "หนังสือเล่มนี้เป็นเรื่องสั้นพร้อมภาพประกอบ น้องจะได้ฟัง อ่าน และพูดคำศัพท์กับประโยคง่าย ๆ ทีละบท โดยมีครูติวเตอร์สอนเป็นกลุ่มเล็ก หนึ่งเล่มมี 14 บทเรียนค่ะ"
>
> "This book has short stories with pictures. Your child listens, reads, and says simple words and sentences, one lesson at a time, with a local tutor in a small group. One book has 14 lessons."

For Reading Advantage Origins 2 (A1, secondary students):

> "หนังสือเล่มนี้ทำมาสำหรับนักเรียนมัธยม เป็นบทความสั้นที่น้องอ่านได้อย่างมั่นใจ น้องจะได้อ่าน เก็บคำศัพท์ ตอบคำถาม และเขียนประโยคของตัวเอง ทีละบท กับครูติวเตอร์ในกลุ่มเล็ก หนึ่งเล่มมี 14 บทเรียนค่ะ"
>
> "This book is for secondary students. It has short articles that your child can read with confidence. Your child reads, collects words, answers questions, and writes their own sentences, one lesson at a time, with a local tutor in a small group. One book has 14 lessons."

When the book for the level is not printed, add:

> "หนังสือเล่มที่ตรงกับระดับของน้องยังพิมพ์ไม่เสร็จ เราจึงให้น้องเริ่มจากเล่มนี้ ซึ่งน้องอ่านได้อย่างมั่นใจ เมื่อเล่มต่อไปพร้อม เราจะแจ้งคุณพ่อคุณแม่ทาง LINE ค่ะ"
>
> "The book at your child's level is not printed yet. So your child starts with this book, which your child can read with confidence. When the next book is ready, we will tell you on LINE."

Never give a print date to a parent.

**Step 3: Bridge to the class package (1 minute).**

> "หนึ่งแพ็กเกจคลาสคือหนังสือหนึ่งเล่ม ประมาณ 25 ชั่วโมง ราคาเริ่มต้น 3,000 บาท ในแพ็กเกจน้องจะได้: ครูติวเตอร์ในพื้นที่สอนเป็นกลุ่มเล็ก หนังสือแบบฝึกหัดฉบับพิมพ์ พร้อมแอปใน LINE ที่คู่กับหนังสือ บัตรคำศัพท์และเกมคำศัพท์ในแอป และฝึกพูดภาษาอังกฤษกับ Reedy หลังเรียนจบแต่ละบท คุณพ่อคุณแม่อยากให้น้องเริ่มเรียนเมื่อไหร่คะ"
>
> "One class package is one book, about 25 hours, from 3,000 baht. In the package, your child gets: a local tutor who teaches a small group; the printed workbook, with its matching app in LINE; flashcards and vocabulary games in the app; and English speaking practice with Reedy after each completed lesson. When would you like your child to start?"

## Objections

| The parent says | The tutor answers (Thai) | English |
|---|---|---|
| "โรงเรียนของลูกมีครูต่างชาติอยู่แล้ว" (My child's school already has a foreign teacher.) | "เข้าใจค่ะ ครูต่างชาติช่วยให้นักเรียนได้ฟังสำเนียงและฝึกพูด แต่ในห้องเรียนใหญ่ ครูต้องแบ่งเวลาให้นักเรียนหลายคน คลาสของเราเป็นกลุ่มเล็ก ครูติวเตอร์ในพื้นที่ดูแลน้องได้ใกล้ชิดขึ้น และน้องเรียนจากหนังสือที่เหมาะกับระดับของน้องค่ะ" | "I understand. A foreign teacher helps students hear real accents and practice speaking. But in a large class, the teacher shares their time with many students. Our classes are small groups, so a local tutor can give your child closer attention, with a book at your child's level." |
| "มันแพงไป" (It is too expensive.) | "เข้าใจค่ะ ราคาเริ่มต้น 3,000 บาทต่อหนึ่งแพ็กเกจ ประมาณ 25 ชั่วโมง เฉลี่ยประมาณ 120 บาทต่อชั่วโมง และรวมหนังสือฉบับพิมพ์กับแอปแล้วค่ะ" | "I understand. The price starts at 3,000 baht for one package of about 25 hours. That is about 120 baht per hour, and it includes the printed book and the app." |
| "ลูกเรียนพิเศษอยู่แล้ว" (My child already goes to a tutor or a tutor school.) | "ดีค่ะ คลาสของเราเรียนตามหนังสือที่จัดลำดับบทเรียนไว้แล้ว เน้นการอ่าน คำศัพท์ และการพูดในกลุ่มเล็ก น้องเรียนควบคู่กับที่เรียนอยู่ได้ค่ะ" | "Good. Our class follows a book with a fixed order of lessons. It focuses on reading, vocabulary, and speaking in a small group. Your child can do it together with their current classes." |
| "ไม่มีเวลา" (No time.) | "ตารางเรียนของกลุ่มจัดกับครูติวเตอร์ในพื้นที่ สัปดาห์ละ [X] ครั้ง ครั้งละ [X] นาทีค่ะ" | "The group schedule is set with the local tutor: [X] times a week, [X] minutes each time." |
| "ขอดูก่อน" (Let me think about it.) | "ได้ค่ะ ไม่ต้องรีบตัดสินใจ ถ้าสนใจ แอด LINE ของเราไว้ได้เลยค่ะ เดี๋ยวส่งข้อมูลให้คุณพ่อคุณแม่ดูค่ะ" | "Of course. There is no hurry. If you are interested, add us on LINE, and I will send you the information." |
| "เรียนภาษาอังกฤษที่โรงเรียนก็พอแล้ว" (English at school is enough.) | "เข้าใจค่ะ ที่โรงเรียนน้องได้เรียนไวยากรณ์และคำศัพท์ คลาสของเราเพิ่มการอ่านเรื่องที่เหมาะกับระดับของน้องอย่างสม่ำเสมอ งานวิจัยแสดงให้เห็นว่าการอ่านเชิงกว้างมีประสิทธิภาพเหนือกว่าการสอนแบบไวยากรณ์ดั้งเดิม (Aka, 2019) ค่ะ" | "I understand. At school, your child learns grammar and vocabulary. Our class adds regular reading at your child's level. Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)." |
| "เรียนแล้วลูกจะสอบได้คะแนนดีขึ้นไหม" (Will my child get better test scores?) | "เราไม่สัญญาเรื่องคะแนนค่ะ สิ่งที่เราให้ได้คือหนังสือที่เหมาะกับระดับของน้อง คลาสกลุ่มเล็กกับครูในพื้นที่ และความคืบหน้าที่ดูได้ในแอปของน้องค่ะ" | "We do not promise test scores. What we give is a book at your child's level, a small class with a local teacher, and progress that you can see in your child's app." |
| "เป็นติวเตอร์ AI หรือเปล่า" (Is this an AI tutor?) | "ไม่ใช่ค่ะ ครูติวเตอร์เป็นคนสอนในคลาส แอปช่วยเรื่องบัตรคำศัพท์ เกม และการฝึกพูดกับ Reedy หลังเรียนจบแต่ละบทค่ะ" | "No. A tutor teaches the class. The app helps with flashcards, games, and speaking practice with Reedy after each completed lesson." |

## Words to use and words to avoid

| Use | Avoid | Why |
|---|---|---|
| "หนังสือที่เหมาะกับระดับของน้อง" (a book at your child's level) | Avoid "รับประกันผล" (guaranteed results) and "เก่งขึ้นแน่นอน" (will surely improve) | It describes what the class gives |
| The full book name: "Primary Advantage Origins 2" | Avoid "Origins 2" alone | Naming rule |
| CEFR: Pre-A1, A1, A2 | Avoid GSE, Pearson, YLE, and B1–C2 | CEFR only; the active scope stops at A2 |
| "ครูติวเตอร์เป็นคนสอน" (a tutor teaches) | Avoid "ติวเตอร์ AI" (AI tutor) and "Read Along with Reedy" | Not an AI tutor; Read Along is not available |
| "ไม่ต้องรีบตัดสินใจ" (no hurry) | Avoid "วันนี้วันสุดท้าย" and "ที่นั่งสุดท้าย" (last day, last seats) | No false urgency |
| The price "ราคาเริ่มต้น 3,000 บาท" | Avoid the ฿2,500 that some app screens show, and avoid any discount | Approved price; no discount |
| Research: the approved Aka (2019) forms only | Avoid any percentage or score gain | Outcome-claims policy |`,
        order: 3,
      },
      {
        title: "The Next Book",
        type: "theory" as const,
        content: `# The Next Book

**TL;DR:** At about lesson 12 of a book, talk with the parent about the next book. Say the full book name. Never give a print date.

| The child finishes | The next printed book | If the next book is not printed |
|---|---|---|
| Primary Advantage Origins 2 | Primary Advantage Origins 3.1 | — |
| Primary Advantage Origins 3.1 | Primary Advantage Origins 3.2 (on sale from about 2026-11-08) | Before that date: tell the parent that you will send a LINE message when it is ready |
| Primary Advantage Origins 3.2 | Primary Advantage Quest 4 (on sale from about 2026-11-08) | — |
| Primary Advantage Quest 4 | Primary Advantage Quest 5: not printed | Tell the parent that you will send a LINE message when it is ready |
| Reading Advantage Origins 2 | Reading Advantage Origins 3.1: not printed (Q-WB-11) | Tell the parent that you will send a LINE message when it is ready |

> "น้องเรียนเล่มนี้ใกล้จบแล้วค่ะ เล่มต่อไปคือ [ชื่อหนังสือเต็ม] ต่อจากบทที่น้องเรียนมา ถ้าคุณพ่อคุณแม่อยากให้น้องเรียนต่อ เราเปิดกลุ่มใหม่ได้เลยค่ะ"
>
> "Your child is near the end of this book. The next book is [full book name]. It continues from the lessons your child has done. If you want your child to continue, we can start a new group."

Never give a parent a print date. A secondary student who finishes Reading Advantage Origins 2 has no next printed book today. This is a known gap (Q-WB-11).`,
        order: 4,
      },
      {
        title: "Roleplay R1: First Conversation with a Parent",
        type: "roleplay" as const,
        content: `**Method:** Ask at least three discovery questions before you describe the product. Then explain the class in two sentences and ask for a placement trial with a day and a time.

**Discovery questions:** "น้องเรียนอยู่ชั้นไหนคะ" (Which grade is your child in?); "ตอนนี้น้องเรียนภาษาอังกฤษที่ไหนบ้างคะ" (Where does your child learn English now?); "คุณพ่อคุณแม่อยากให้น้องเก่งเรื่องไหนมากที่สุดคะ" (What do you most want for your child?); "น้องชอบอ่านหนังสือหรือฟังนิทานไหมคะ" (Does your child like books or stories?); "วันและเวลาไหนที่น้องว่างเรียนคะ" (Which days and times is your child free?).

**The class in two sentences:** a small group; a local tutor; a printed workbook at the child's level; a matching app in LINE; a 10-minute reading trial first.

**Success standard:** the parent agrees to a placement trial on a named day and time.`,
        order: 5,
        scenarios: [
          {
            personaName: "คุณแม่ของน้องมิว (Mew's mother)",
            personaRole: "Parent of a Grade 3 (ป.3) child, Khon Kaen",
            situation: thaiFirst(
              "คุณแม่ของน้องมิว (ป.3 ขอนแก่น) ส่งข้อความ LINE มาหลังจากเพื่อนเล่าเรื่องคลาสให้ฟัง คุณแม่ยังไม่รู้ว่า Tutor Advantage คืออะไร คุณแม่พูดว่า: \"สวัสดีค่ะ เพื่อนบอกว่ามีคลาสภาษาอังกฤษของครูใช่ไหมคะ เป็นคลาสแบบไหนคะ ลูกอยู่ ป.3 ค่ะ\"",
              "Mew's mother (Grade 3, Khon Kaen) sends a LINE message after a friend told her about the class. She does not know what Tutor Advantage is. She says: \"Hello. A friend says you teach an English class. What kind of class is it? My child is in Grade 3.\"",
            ),
            objective: thaiFirst(
              "ถามคำถามเพื่อรู้ความต้องการอย่างน้อยสามข้อก่อนเล่าเรื่องคลาส อธิบายคลาสในสองประโยค แล้วขอนัดทดลองอ่านโดยระบุวันและเวลา",
              "Ask at least three discovery questions before you describe the class. Explain the class in two sentences. Then ask for a placement trial with a day and a time.",
            ),
            prospectContext:
              "The mother is curious and friendly. She answers questions fully when asked. She does not know the price or the product. Score the trainee's side only; the trainee may speak Thai or English.",
            rubric: [
              {
                criterion:
                  "Discovery: asks at least three of the playbook discovery questions (grade, English now, what the parent wants, what the child likes, free time) before describing the product",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r1-first-conversation-with-a-parent",
              },
              {
                criterion:
                  "Clear explanation: explains a small group, a local tutor, a printed book at the child's level, and the LINE app",
                weight: 0.25,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r1-first-conversation-with-a-parent",
              },
              {
                criterion: "Next step: asks for a placement trial with a day and a time",
                weight: 0.25,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r1-first-conversation-with-a-parent",
              },
              claimsCriterion(
                0.2,
                "Makes no promise of an outcome, no false urgency, no AI-tutor claim, and names no book without its product name.",
                "family",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay R2: \"It Is Too Expensive\"",
        type: "roleplay" as const,
        content: `**Method:** Accept the concern before you give facts. Then explain what the package includes and give the per-hour figure. Ask a calm question about the start, or offer to send the parent info deck.

**The facts:** "เข้าใจค่ะ ราคาเริ่มต้น 3,000 บาทต่อหนึ่งแพ็กเกจ ประมาณ 25 ชั่วโมง เฉลี่ยประมาณ 120 บาทต่อชั่วโมง และรวมหนังสือฉบับพิมพ์กับแอปแล้วค่ะ" (I understand. The price starts at 3,000 baht for one package of about 25 hours. That is about 120 baht per hour, and it includes the printed book and the app.)

**No discount:** offer no discount and no free class. Do not compare with a named competitor or with a market rate that has no source.

**Success standard:** the parent can repeat what the package includes, and agrees to a start date or to receive the parent info deck.`,
        order: 6,
        scenarios: [
          {
            personaName: "คุณพ่อของน้องข้าวหอม (Khao Hom's father)",
            personaRole: "Parent, after a placement trial for Primary Advantage Origins 2",
            situation: thaiFirst(
              "หลังจากทดลองอ่าน คุณเสนอหนังสือ Primary Advantage Origins 2 ให้น้อง คุณพ่อบอกว่าราคาสูง คุณพ่อพูดว่า: \"3,000 บาทเลยเหรอครับ แพงไปหน่อยนะ ที่อื่นถูกกว่านี้\"",
              "After the trial, you offer Primary Advantage Origins 2. The father says that the price is high. He says: \"3,000 baht? That is a bit expensive. Other places are cheaper.\"",
            ),
            objective: thaiFirst(
              "ยอมรับความกังวลของคุณพ่อก่อน อธิบายว่าในแพ็กเกจมีอะไรบ้าง บอกตัวเลขประมาณ 120 บาทต่อชั่วโมง แล้วถามเรื่องวันเริ่มเรียนโดยไม่ลดราคา",
              "Acknowledge the father's concern first. Explain what the package includes, give the figure of about 120 baht per hour, and ask about a start date without a discount.",
            ),
            prospectContext:
              "The father likes the trial result but is careful with money. He mentions cheaper places but names none. If the trainee offers a discount or a free class, the 'No discount' criterion fails.",
            rubric: [
              {
                criterion: "Acknowledge: accepts the concern before giving facts",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r2-it-is-too-expensive",
              },
              {
                criterion:
                  "Value facts: states about 25 hours, about 120 baht per hour, the printed book, and the app",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r2-it-is-too-expensive",
              },
              {
                criterion:
                  "No discount: offers no discount and no free class; does not compare with a named competitor or an unsourced market rate",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r2-it-is-too-expensive",
              },
              {
                criterion:
                  "Next step: asks a calm question about the start, or offers to send the parent info deck",
                weight: 0.1,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r2-it-is-too-expensive",
              },
              claimsCriterion(0.2, "No promise, no false urgency, no unapproved price.", "family"),
            ],
          },
        ],
      },
      {
        title: "Roleplay R3: \"My Child Already Goes to a Tutor School\"",
        type: "roleplay" as const,
        content: `**Method:** Respect the current class. Explain the difference: a leveled printed book, and small-group reading, vocabulary, and speaking. Name the book for a secondary student with its full name. Leave the choice to the parent.

**The line:** "ดีค่ะ คลาสของเราเรียนตามหนังสือที่จัดลำดับบทเรียนไว้แล้ว เน้นการอ่าน คำศัพท์ และการพูดในกลุ่มเล็ก น้องเรียนควบคู่กับที่เรียนอยู่ได้ค่ะ" (Good. Our class follows a book with a fixed order of lessons. It focuses on reading, vocabulary, and speaking in a small group. Your child can do it together with their current classes.)

**The book:** a secondary student starts with Reading Advantage Origins 2 (A1), the printed Reading Advantage book.

**Success standard:** the parent agrees to a trial or to receive information, with no pressure.`,
        order: 7,
        scenarios: [
          {
            personaName: "คุณแม่ของน้องเจมส์ (James's mother)",
            personaRole: "Parent of a Grade 7 (ม.1) student, Khon Kaen",
            situation: thaiFirst(
              "คุณแม่ของนักเรียน ม.1 บอกว่าลูกชายไปเรียนกวดวิชาทุกวันเสาร์อาทิตย์ คุณแม่พูดว่า: \"ลูกไปเรียนกวดวิชาวันเสาร์อาทิตย์อยู่แล้วค่ะ จะต้องเรียนเพิ่มอีกเหรอคะ\"",
              "The mother of a Grade 7 student says that her son goes to a tutor school on weekends. She says: \"My son already goes to a tutor school on weekends. Does he need another class?\"",
            ),
            objective: thaiFirst(
              "ไม่พูดถึงโรงเรียนกวดวิชาในทางลบ อธิบายความต่าง: หนังสือฉบับพิมพ์ที่ตรงกับระดับ และการอ่าน คำศัพท์ การพูดในกลุ่มเล็ก บอกชื่อหนังสือ Reading Advantage Origins 2 แบบเต็ม แล้วให้คุณแม่เป็นคนเลือก",
              "Say nothing negative about the tutor school. Explain the difference: a leveled printed book, and reading, vocabulary, and speaking in a small group. Name Reading Advantage Origins 2 with its full name. Then leave the choice to the mother.",
            ),
            prospectContext:
              "The mother is happy with the tutor school and worries about her son's time. A weak trainee criticizes the tutor school or promises better grades.",
            rubric: [
              {
                criterion: "Respect: says nothing negative about the tutor school",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r3-my-child-already-goes-to-a-tutor-school",
              },
              {
                criterion:
                  "Difference: explains a leveled printed book and small-group reading, vocabulary, and speaking",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r3-my-child-already-goes-to-a-tutor-school",
              },
              {
                criterion:
                  "Right book: names Reading Advantage Origins 2 (secondary student) with its full name",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r3-my-child-already-goes-to-a-tutor-school",
              },
              {
                criterion: "Choice: invites a trial or offers to send information; no pressure",
                weight: 0.1,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r3-my-child-already-goes-to-a-tutor-school",
              },
              claimsCriterion(
                0.2,
                "No promise of grades, no attack on a competitor, no false urgency.",
                "family",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay R4: Which Book Next?",
        type: "roleplay" as const,
        content: `**Method:** Name the next book with its full name. Give no print or sale date. Promise a LINE message when the book is ready. Mention something that the child did well, and invite the parent to keep the child's place in the next group.

**The line:** "น้องเรียนเล่มนี้ใกล้จบแล้วค่ะ เล่มต่อไปคือ [ชื่อหนังสือเต็ม] ต่อจากบทที่น้องเรียนมา ถ้าคุณพ่อคุณแม่อยากให้น้องเรียนต่อ เราเปิดกลุ่มใหม่ได้เลยค่ะ" (Your child is near the end of this book. The next book is [full book name]. It continues from the lessons your child has done. If you want your child to continue, we can start a new group.)

**The fact:** after Reading Advantage Origins 2, the next book is Reading Advantage Origins 3.1. It is not printed yet (Q-WB-11). Never give a parent a print date.

**Success standard:** the parent knows the name of the next book, expects a LINE message, and wants to keep the child's place.`,
        order: 8,
        scenarios: [
          {
            personaName: "คุณแม่ของน้องต้น (Ton's mother)",
            personaRole: "Parent of a Grade 7 (ม.1) student at lesson 12 of Reading Advantage Origins 2",
            situation: thaiFirst(
              "น้องต้นอยู่ ม.1 และเรียนถึงบทที่ 12 ของ Reading Advantage Origins 2 แล้ว เล่มต่อไปคือ Reading Advantage Origins 3.1 ซึ่งยังไม่พิมพ์ คุณคุยกับคุณแม่ทาง LINE คุณแม่พูดว่า: \"ลูกใกล้เรียนจบเล่มนี้แล้ว เรียนต่อเล่มไหนดีคะ แล้วเล่มต่อไปมีเมื่อไหร่คะ\"",
              "Ton, a Grade 7 student, is at lesson 12 of Reading Advantage Origins 2. The next book, Reading Advantage Origins 3.1, is not printed yet. You talk with his mother on LINE. She says: \"My child is nearly finished with this book. Which book comes next, and when is it available?\"",
            ),
            objective: thaiFirst(
              "บอกชื่อเล่มต่อไปแบบเต็ม ไม่บอกวันพิมพ์หรือวันวางขาย สัญญาว่าจะส่งข้อความ LINE เมื่อหนังสือพร้อม ชมสิ่งที่น้องทำได้ดีในเล่มนี้ แล้วชวนคุณแม่จองที่ในกลุ่มต่อไป",
              "Name the next book with its full name. Give no print or sale date. Promise a LINE message when the book is ready. Mention something that the child did well in this book, and invite the mother to keep her child's place in the next group.",
            ),
            prospectContext:
              "The mother wants a date. A weak trainee gives a date or says that the book is available now. The child did well in the vocabulary games.",
            rubric: [
              {
                criterion: "Correct next book: names Reading Advantage Origins 3.1",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r4-which-book-next",
              },
              {
                criterion: "No date: gives no print or sale date",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r4-which-book-next",
              },
              {
                criterion: "Follow-up: promises a LINE message when the book is ready",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r4-which-book-next",
              },
              {
                criterion: "Relationship: mentions something that the child did well in the book",
                weight: 0.1,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r4-which-book-next",
              },
              claimsCriterion(
                0.2,
                "No promise of an outcome, and no book that is not printed offered as available.",
                "family",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay R5: \"Can You Guarantee My Child Will Pass?\"",
        type: "roleplay" as const,
        content: `**Method:** Say clearly that there is no guarantee. Explain what the class does give. Keep the conversation open.

**The line:** "เราไม่สัญญาเรื่องคะแนนค่ะ สิ่งที่เราให้ได้คือหนังสือที่เหมาะกับระดับของน้อง คลาสกลุ่มเล็กกับครูในพื้นที่ และความคืบหน้าที่ดูได้ในแอปของน้องค่ะ" (We do not promise test scores. What we give is a book at your child's level, a small class with a local teacher, and progress that you can see in your child's app.)

**What we give:** a book at the child's level, a small class with a local teacher, progress in the app, and Reedy voice practice after completed lessons.

**Evidence:** if research comes up, use only an approved Aka (2019) form, word for word: "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)."

**Success standard:** the father hears an honest answer and still wants to talk about a start.`,
        order: 9,
        scenarios: [
          {
            personaName: "คุณพ่อของน้องฟ้าใส (Fah Sai's father)",
            personaRole: "Parent of a Grade 6 (ป.6) child, Kalasin",
            situation: thaiFirst(
              "คุณพ่อของน้องฟ้าใส (ป.6) อยากได้คำสัญญาว่าลูกจะสอบเข้าโรงเรียนมัธยมได้ คุณพ่อพูดว่า: \"ถ้าเรียนกับครูแล้ว ลูกจะสอบเข้า ม.1 ได้แน่ไหมครับ รับประกันได้ไหม\"",
              "Fah Sai's father (Grade 6) wants a promise that she will pass the English entrance test for a secondary school. He says: \"If she studies with you, will she surely pass the entrance test for Grade 7? Can you guarantee it?\"",
            ),
            objective: thaiFirst(
              "บอกตรง ๆ ว่าเราไม่สัญญาเรื่องผลสอบ อธิบายสิ่งที่คลาสให้ได้ และคุยกับคุณพ่อต่อ",
              "Say clearly that we do not promise test results. Explain what the class does give, and keep the conversation open.",
            ),
            prospectContext:
              "The father is anxious about the entrance test. He presses twice for a guarantee. Any guarantee, 'surely', or percentage fails the claims criterion.",
            rubric: [
              {
                criterion: "Honest answer: says that we do not promise test results",
                weight: 0.3,
                passingScore: 70,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r5-can-you-guarantee-my-child-will-pass",
              },
              {
                criterion:
                  "What we give: a book at the child's level, a small class with a local teacher, progress in the app, Reedy voice practice after completed lessons",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r5-can-you-guarantee-my-child-will-pass",
              },
              {
                criterion:
                  "Evidence: if research comes up, uses only an approved Aka (2019) form",
                weight: 0.1,
                passingScore: 60,
                sourceRef: "09-sales-enablement/tutor-family-sales-playbook.md#r5-can-you-guarantee-my-child-will-pass",
              },
              claimsCriterion(
                0.3,
                "No guarantee in any form (\"รับประกัน\", \"แน่นอน\"), no percentage, no false urgency.",
                "family",
              ),
            ],
          },
        ],
      },
      {
        title: "Family Sale Quiz",
        type: "quiz" as const,
        content: "",
        order: 10,
        quizQuestions: [
          {
            question:
              "A primary-school child places at book level 4, and Primary Advantage Quest 4 is not on sale yet. Which book does the tutor offer?",
            options: [
              "Primary Advantage Quest 4",
              "Primary Advantage Origins 3.1",
              "Primary Advantage Origins 2",
              "Reading Advantage Origins 2",
            ],
            correctAnswer: "Primary Advantage Origins 3.1",
            explanation:
              "Until Primary Advantage Quest 4 is on sale, the tutor offers the nearest printed book below the level: Primary Advantage Origins 3.1.",
          },
          {
            question: "Which line explains the class correctly?",
            options: [
              "Our AI tutor teaches your child at home.",
              "A local tutor teaches a small group from a printed workbook at your child's level, with a matching app in LINE.",
              "Your child reads along with Reedy in every lesson.",
              "Your child will reach A2 in one package.",
            ],
            correctAnswer:
              "A local tutor teaches a small group from a printed workbook at your child's level, with a matching app in LINE.",
            explanation:
              "Tutor Advantage is a tutor-led class network. It is not an AI tutor. Read Along with Reedy is not available.",
          },
          {
            question: "When does the tutor talk with the parent about the next book?",
            options: [
              "At lesson 1",
              "At about lesson 12",
              "After the last lesson",
              "Only if the parent asks",
            ],
            correctAnswer: "At about lesson 12",
            explanation:
              "At about lesson 12 of a book, the tutor talks with the parent about the next book, with its full name and no print date.",
          },
          {
            question:
              "A parent asks how much the tutor earns from the class. What does the tutor do?",
            options: [
              "Explain the commission scale.",
              "Do not talk about tutor commission with a parent; return to the child's learning.",
              "Show the earnings screen.",
              "Say that the tutor earns 55.6%.",
            ],
            correctAnswer:
              "Do not talk about tutor commission with a parent; return to the child's learning.",
            explanation:
              "Never talk about commission with a parent. An earnings figure in a family sale fails the claims criterion.",
          },
          {
            question: "After the parent says yes, how does the parent pay?",
            options: [
              "In cash to the tutor",
              "In the LINE student app (PromptPay or card)",
              "By bank transfer to the tutor's account",
              "At the school office",
            ],
            correctAnswer: "In the LINE student app (PromptPay or card)",
            explanation:
              "The parent enrolls the child and pays in the LINE student app, with PromptPay or a card.",
          },
        ],
      },
    ],
  },
  {
    slug: "tutor-recruitment",
    title: "Tutor Recruitment: Bring In New Tutors",
    description:
      "Explain the tutor role, the commission scale, and the rules that protect teaching to a person who may become a tutor. Talk openly about money, and show how the pay is calculated.",
    phase: "Family branch",
    order: 6,
    lessons: [
      {
        title: "What a Tutor Does, and What Is Ready",
        type: "theory" as const,
        content: `# What a Tutor Does, and What Is Ready

**TL;DR:** A tutor teaches a small group of students in their own community, from a printed workbook. The tutor app has a lesson plan for every lesson, and each new tutor gets training before the first class. Tell a recruit what is ready today and what is not.

## What a Tutor Advantage tutor does

One class package is one printed book, about 25 hours, 14 lessons.

- **Teach:** run each lesson in the tutor app: 18 phases built on the 13 printed workbook steps, with flashcards, two games, pair conversation, and a wrap-up.
- **Sell:** find families, run the placement trial, and enroll students (the Family Sale module).
- **Look after families:** answer parents on LINE, keep the schedule, talk about the next book.
- **Bring in tutors (optional):** introduce new tutors and help them start.

What the company does: the books, the lesson plans, the apps, the payments, and the monthly commission settlement.

## A week as a tutor (example)

- **Three evenings:** teach your groups in the tutor app.
- **Two days:** answer parents on LINE; run placement trials with new families.
- **Optional:** help a tutor that you brought in to prepare their first lessons.

What you do not do: write lesson plans, design the curriculum, or mark every digital exercise. The app marks the digital exercises.

## What is ready and what is not

| Ready today | Not ready |
|---|---|
| The tutor app (lesson hub, prepare, rehearsal, the live lesson, schedule, chat, earnings, network) | The LINE placement trial tool (use the interim printed-book method, Q-SE-12) |
| The LINE student app, online payment (PromptPay or card) | Read Along with Reedy (in development, not available) |
| Reedy voice practice for students with an active class package, on lessons they completed | Automatic progress reports for parents |
| Printed books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2 | More books, and book lines for the coming programs (no dates) |
| Primary Advantage Origins 3.2 and Quest 4: on sale from about 2026-11-08 | |
| Monthly commission settlement | |

## What we provide

| What you get | Details |
|---|---|
| The lesson plans | The 18-phase lesson flow in the tutor app for every printed book |
| The materials | Printed workbooks |
| The sales tools | The LINE placement trial script and the family sales playbook |
| The training | Onboarding with Phikul and Daniel, then ongoing support |
| The apps | The tutor app, and the LINE student app for your students |
| The commission | The formula in the commission lesson, shown in the app; monthly settlement |
| The community | A LINE group with other tutors and the company team |

## How a new tutor starts

1. Contact us on LINE (https://line.me/ti/p/Pf7_EF98Pv) or by phone (+66 099-005-8038).
2. Attend a 30-minute information session (online or in person).
3. Complete the onboarding with Phikul and Daniel.
4. Verify the account in the tutor app (ID card, bank book, address).
5. Run the first placement trial, with help.
6. Teach the first class.`,
        order: 1,
      },
      {
        title: "The Commission Scale",
        type: "theory" as const,
        content: `# The Commission Scale

**TL;DR:** Talk openly and directly about the commission scale with a person who may become a tutor. The scale comes from the Tutor Advantage payout code, with the production base rate 0.5. Every baht figure is arithmetic from that formula.

**Video — Tutor Advantage Commission Scale:** [Thai](https://www.youtube.com/watch?v=-d2WBnLCVOk) · [English](https://www.youtube.com/watch?v=54fsgdoxzs8)

Commission talk is for tutor recruits only. Never talk about commission with a parent.

## How the rate works

- Your rate depends on your **group volume (GV)** for the calendar month: the class-package payments from your own students, plus the payments from the students of every tutor that you brought in, and the tutors they brought in.
- **Below 20,000 baht GV**, the rate rises in a straight line: 40% + GV ÷ 200,000. At 0 baht it is 40%. At 20,000 baht it is 50%.
- **Above 20,000 baht GV**, the rate keeps rising, more slowly, toward a limit of about 71.4%. It never reaches 71.4%.
- The tutor app shows your rate, your GV for the month, and the next target.

## Example rates (all GV from your own students)

| Monthly GV | About this many class packages at 3,000 baht | Rate | Commission before tax |
|---|---|---|---|
| 3,000 baht | 1 | 41.5% | 1,245 baht |
| 6,000 baht | 2 | 43.0% | 2,580 baht |
| 15,000 baht | 5 | 47.5% | 7,125 baht |
| 30,000 baht | 10 | 55.6% | 16,682 baht |
| 60,000 baht | 20 | 62.0% | 37,205 baht |
| 100,000 baht | about 33 | 65.0% | 65,000 baht |
| 200,000 baht | about 67 | 67.6% | 135,202 baht |

The tutor app shows the same formula: for example, 5,000 baht GV gives 42.50%. GV counts payments received in that month. A class package is paid once, so a month's GV depends on the packages paid in that month.

## The differential: when you bring in a tutor

Your payout = your rate × your GV − the payouts of the tutors you brought in (and their tutors).

**Example.** Tutor A has 4 students of her own (12,000 baht). Tutor A brought in Tutor B, who has 6 students (18,000 baht).

| | GV | Rate | Payout |
|---|---|---|---|
| Tutor B | 18,000 baht | 49.0% | 8,820 baht |
| Tutor A | 30,000 baht (12,000 + 18,000) | 55.6% | 16,682 − 8,820 = **7,862 baht** |

Without Tutor B, Tutor A's 12,000 baht would give 46.0% = 5,520 baht. Both tutors get paid for teaching, and Tutor A also gets the difference in rate on Tutor B's volume.

## The rules that protect teaching

- **No students of your own, no payout.** A tutor who has tutors below them but no students of their own in the month gets no payout for that month.
- **Verified tutors only.** An unverified tutor gets no payout. To verify, upload your ID card, your bank book, and an address for documents in the tutor app.
- **3% withholding tax.** The app shows the commission before tax and the estimated net after 3% withholding tax.
- **Monthly settlement.** The company settles commission once a month, after the month ends.

## How to say a figure

Say each baht figure as an example from the formula:

> "นี่เป็นตัวอย่างจากสูตรค่ะ"
>
> "That is an example from the formula."`,
        order: 2,
      },
      {
        title: "Answering a Future Tutor's Questions",
        type: "theory" as const,
        content: `# Answering a Future Tutor's Questions

**TL;DR:** People who may become tutors ask about money, pyramid schemes, classrooms, and the course standard. Answer directly, and show the formula with one example.

## Objections from people who may become tutors

Thai first, English below.

### "Is this a pyramid scheme?" / "เป็นแชร์ลูกโซ่หรือเปล่า"

> "ไม่ใช่ค่ะ ค่าคอมมิชชันมาจากแพ็กเกจคลาสที่ครอบครัวจ่ายเงินจริงเท่านั้น ติวเตอร์ที่ไม่มีนักเรียนของตัวเองในเดือนนั้นจะไม่ได้รับเงินในเดือนนั้น ถึงจะมีติวเตอร์ในทีมก็ตาม ถ้าไม่มีใครสอน ก็ไม่มีใครได้เงิน และคุณดูสูตรกับเรทของตัวเองได้ในแอปค่ะ"
>
> "No. Commission comes only from class packages that families pay for. A tutor with no students of their own in a month gets no payout that month, even with tutors below them. If nobody teaches, nobody earns. You also see the formula and your rate in the app."

### "How much will I earn?" / "จะได้เดือนละเท่าไร"

> "ขึ้นอยู่กับจำนวนแพ็กเกจคลาสที่มีการจ่ายเงินในเดือนนั้นค่ะ ขอให้ดูสูตรและตัวอย่างนะคะ เช่น ถ้าในหนึ่งเดือนมี 10 แพ็กเกจ แพ็กเกจละ 3,000 บาท ยอดรวม 30,000 บาท เรท 55.6% จะได้ประมาณ 16,700 บาทก่อนหักภาษี นี่เป็นตัวอย่างจากสูตรค่ะ"
>
> "It depends on how many class packages are paid in the month. I can show you the formula and some examples. For example, 10 class packages at 3,000 baht in one month is 30,000 baht, at 55.6%, which is about 16,700 baht before tax. That is an example from the formula."

### "I have no classroom" / "ไม่มีห้องเรียน"

> "ไม่ต้องมีค่ะ ติวเตอร์สอนที่บ้าน ห้องประชุมในชุมชน หรือที่เงียบ ๆ ที่อื่นก็ได้ ขอแค่มีโทรศัพท์หรือแท็บเล็ตที่ต่ออินเทอร์เน็ตค่ะ"
>
> "You do not need one. Tutors teach at home, in a community room, or at another quiet place. You need a phone or tablet with internet."

### "Is the course a recognized standard?" / "หลักสูตรได้มาตรฐานไหม"

> "หนังสือของเราสอดคล้องกับกรอบ CEFR และหนังสือทุกเล่มระบุระดับ CEFR ไว้ค่ะ"
>
> "Our books are CEFR-aligned. Each book names its CEFR level."

## Good practice

- Say each baht figure as an example from the formula.
- Talk about commission only with future tutors, not with parents.
- Say "CEFR-aligned" and name the CEFR level of the book.
- Use the approved Aka (2019) form for research.
- Collect parental consent for all named students, photos, and videos.

In the recruitment roleplays, commission talk is allowed: say each baht figure as an example from the formula (see "The Words We Use", M4.2).`,
        order: 3,
      },
      {
        title: "Roleplay RR1: \"How Does the Money Work?\"",
        type: "roleplay" as const,
        content: `**Method:** Explain the model first: commission on monthly group volume, not an hourly wage. Then give the scale and at least two of the rules. Give any baht figure as a formula example.

**The scale:** "Below 20,000 baht GV, the rate rises in a straight line: 40% + GV ÷ 200,000. At 0 baht it is 40%. At 20,000 baht it is 50%. Above 20,000 baht GV, the rate keeps rising, more slowly, toward a limit of about 71.4%."

**The rules:** own students needed; verified tutors only; 3% withholding tax; monthly settlement.

**The line:** "นี่เป็นตัวอย่างจากสูตรค่ะ" (That is an example from the formula.)

**Success standard:** the recruit can explain how the rate works and asks for the information session.`,
        order: 4,
        scenarios: [
          {
            personaName: "น้องเฟิร์น (Fern)",
            personaRole: "University student, Khon Kaen, wants part-time work",
            situation: thaiFirst(
              "น้องเฟิร์นเป็นนักศึกษามหาวิทยาลัยในขอนแก่น อยากหางานพิเศษ และถามว่าติวเตอร์ได้เงินอย่างไร น้องเฟิร์นพูดว่า: \"พี่คะ ถ้าเป็นติวเตอร์กับ Tutor Advantage ได้เงินยังไงคะ ได้ต่อชั่วโมงหรือเปล่า\"",
              "Fern is a university student in Khon Kaen. She wants part-time work and asks how tutors get paid. She says: \"How do tutors get paid at Tutor Advantage? Is it per hour?\"",
            ),
            objective: thaiFirst(
              "อธิบายว่าเป็นค่าคอมมิชชันจากยอดกลุ่มรายเดือน ไม่ใช่ค่าจ้างรายชั่วโมง บอกเรท 40% ตอนเริ่ม 50% ที่ยอดกลุ่ม 20,000 บาท และเพิ่มขึ้นเข้าใกล้ประมาณ 71.4% บอกกฎอย่างน้อยสองข้อ และบอกตัวเลขเงินเป็นตัวอย่างจากสูตรเท่านั้น",
              "Explain that the pay is commission on monthly group volume, not an hourly wage. Give the rate: 40% at the start, 50% at 20,000 baht GV, rising toward about 71.4%. Name at least two rules, and give any baht figure only as a formula example.",
            ),
            prospectContext:
              "Fern is careful with money and expects an hourly wage. She asks how much she will get each month. If the trainee promises an income, the claims criterion fails.",
            rubric: [
              {
                criterion:
                  "Correct model: says commission on monthly group volume, not an hourly wage",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr1-how-does-the-money-work",
              },
              {
                criterion:
                  "Correct scale: says 40% at the start, 50% at 20,000 baht GV, rising toward about 71.4%",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr1-how-does-the-money-work",
              },
              {
                criterion:
                  "Rules: names at least two (own students needed, verification, 3% withholding tax, monthly settlement)",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr1-how-does-the-money-work",
              },
              claimsCriterion(
                0.2,
                "Gives any baht figure as a formula example, not a promise; no false urgency.",
                "recruitment",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay RR2: \"Isn't This a Pyramid Scheme?\"",
        type: "roleplay" as const,
        content: `**Method:** Answer the question directly and calmly. Explain that teaching comes first: commission comes only from paid class packages, and a tutor with no students of their own gets no payout. Offer to show the formula, the differential, and the earnings screen.

**The line:** "ไม่ใช่ค่ะ ค่าคอมมิชชันมาจากแพ็กเกจคลาสที่ครอบครัวจ่ายเงินจริงเท่านั้น ติวเตอร์ที่ไม่มีนักเรียนของตัวเองในเดือนนั้นจะไม่ได้รับเงินในเดือนนั้น" (No. Commission comes only from class packages that families pay for. A tutor with no students of their own in a month gets no payout that month.)

**The facts:** the pay comes from teaching. A month with no students of your own gives no payout.

**Success standard:** the recruit understands that nobody earns if nobody teaches, and wants to see the formula.`,
        order: 5,
        scenarios: [
          {
            personaName: "คุณจอย (Khun Joy)",
            personaRole: "Mother who sells products online, Udon Thani",
            situation: thaiFirst(
              "คุณจอยเป็นคุณแม่ที่ขายของออนไลน์ และระวังธุรกิจเครือข่ายมาก คุณจอยพูดว่า: \"ฟังแล้วเหมือนขายตรง ชวนคนมาต่อ ๆ กัน แบบนี้เป็นแชร์ลูกโซ่หรือเปล่าคะ\"",
              "Khun Joy is a mother who sells products online. She is careful about network businesses. She says: \"This sounds like direct sales: you bring in people and they bring in more. Is it a pyramid scheme?\"",
            ),
            objective: thaiFirst(
              "ตอบคำถามตรง ๆ อย่างใจเย็น อธิบายว่าค่าคอมมิชชันมาจากแพ็กเกจคลาสที่จ่ายเงินแล้วเท่านั้น และติวเตอร์ที่ไม่มีนักเรียนของตัวเองจะไม่ได้รับเงิน แล้วเสนอให้ดูสูตร ส่วนต่าง และหน้าจอรายได้",
              "Answer the question directly and calmly. Explain that commission comes only from paid class packages, and that a tutor with no students of their own gets no payout. Then offer to show the formula, the differential, and the earnings screen.",
            ),
            prospectContext:
              "Joy lost money in a network business before. She becomes calmer when the trainee explains that teaching comes first. 'Get rich' language or pressure to recruit makes her end the conversation.",
            rubric: [
              {
                criterion: "Direct answer: answers the question directly and calmly",
                weight: 0.25,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr2-isnt-this-a-pyramid-scheme",
              },
              {
                criterion:
                  "Teaching first: explains that commission comes only from paid class packages, and that a tutor with no own students gets no payout",
                weight: 0.35,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr2-isnt-this-a-pyramid-scheme",
              },
              {
                criterion:
                  "Transparency: offers to show the formula, the differential, and the earnings screen",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr2-isnt-this-a-pyramid-scheme",
              },
              claimsCriterion(
                0.2,
                "No income promise, no \"get rich\" framing, no pressure to recruit.",
                "recruitment",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay RR3: \"How Much Can I Make if I Bring In Friends?\"",
        type: "roleplay" as const,
        content: `**Method:** Explain the differential: your rate on the whole group volume, minus what your recruits receive. Use a worked example from the formula and label it as an example. Say that the friends must teach their own students, and that she must keep her own students.

**The worked example:** Tutor A has 4 students of her own (12,000 baht). Tutor B has 6 students (18,000 baht). Tutor A's GV is 30,000 baht at 55.6%: 16,682 − 8,820 = 7,862 baht. Without Tutor B, Tutor A's 12,000 baht would give 46.0% = 5,520 baht.

**Label the example one time:** "That is an example from the formula."

**Success standard:** the tutor understands the differential and knows that teaching comes first.`,
        order: 6,
        scenarios: [
          {
            personaName: "ครูนิด (Tutor Nid)",
            personaRole: "Tutor Advantage tutor who teaches one group, Kalasin",
            situation: thaiFirst(
              "ครูนิดเป็นติวเตอร์ที่สอนอยู่หนึ่งกลุ่ม และอยากรู้ว่าจะเกิดอะไรขึ้นถ้าชวนเพื่อนสองคนมาเป็นติวเตอร์ ครูนิดพูดว่า: \"ถ้าชวนเพื่อนมาเป็นติวเตอร์อีกสองคน หนูจะได้เพิ่มเท่าไรคะ\"",
              "Nid is a tutor who teaches one group. She wants to know what happens if she brings in two friends as tutors. She says: \"If I bring in two friends as tutors, how much more will I get?\"",
            ),
            objective: thaiFirst(
              "อธิบายส่วนต่าง: เรทของคุณคูณยอดกลุ่มทั้งหมด ลบเงินที่ติวเตอร์ที่คุณชวนมาได้รับ ใช้ตัวอย่างจากสูตรและบอกว่าเป็นตัวอย่าง บอกว่าเพื่อนต้องสอนนักเรียนของตัวเอง และครูนิดต้องมีนักเรียนของตัวเองต่อไป",
              "Explain the differential: your rate on the whole group volume, minus what your recruits receive. Use a formula example and label it as an example. Say that the friends must teach their own students, and that Nid must keep her own students.",
            ),
            prospectContext:
              "Nid is excited and wants a big number. She asks twice for 'how much exactly'. A weak trainee gives a figure that is not from the formula, or suggests that she can stop teaching.",
            rubric: [
              {
                criterion:
                  "Differential: explains your rate on the whole group volume, minus what your recruits receive",
                weight: 0.35,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr3-how-much-can-i-make-if-i-bring-in-friends",
              },
              {
                criterion:
                  "Worked example: uses a formula example (for example the Tutor A and Tutor B table) and labels it as an example",
                weight: 0.25,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr3-how-much-can-i-make-if-i-bring-in-friends",
              },
              {
                criterion:
                  "Teaching first: says the friends must teach their own students, and she must keep her own students",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/facilitator-recruitment-kit.md#rr3-how-much-can-i-make-if-i-bring-in-friends",
              },
              claimsCriterion(
                0.2,
                "No income promise; no figure that is not from the formula.",
                "recruitment",
              ),
            ],
          },
        ],
      },
      {
        title: "Tutor Recruitment Quiz",
        type: "quiz" as const,
        content: "",
        order: 7,
        quizQuestions: [
          {
            question: "How does a Tutor Advantage tutor get paid?",
            options: [
              "An hourly wage for each lesson.",
              "Commission on the monthly group volume (GV), with a rate that rises with GV.",
              "A fixed monthly salary.",
              "A bonus for each new tutor brought in.",
            ],
            correctAnswer:
              "Commission on the monthly group volume (GV), with a rate that rises with GV.",
            explanation:
              "The rate is 40% + GV ÷ 200,000 below 20,000 baht GV, and it keeps rising, more slowly, toward about 71.4% above it.",
          },
          {
            question:
              "A tutor has tutors below them but no students of their own this month. What is the payout?",
            options: [
              "The full differential on the team's volume.",
              "Half of the normal payout.",
              "No payout for that month.",
              "The 40% base rate.",
            ],
            correctAnswer: "No payout for that month.",
            explanation:
              "No students of your own, no payout. Teaching comes first: if nobody teaches, nobody earns.",
          },
          {
            question:
              "A recruit asks, 'How much will I earn?' Which answer is correct?",
            options: [
              "You will earn at least 16,700 baht a month.",
              "It depends on the class packages paid in the month. For example, 30,000 baht GV at 55.6% is about 16,700 baht before tax. That is an example from the formula.",
              "Most tutors earn 30,000 baht a month.",
              "Bring in five friends and you will earn more than a teacher.",
            ],
            correctAnswer:
              "It depends on the class packages paid in the month. For example, 30,000 baht GV at 55.6% is about 16,700 baht before tax. That is an example from the formula.",
            explanation:
              "Every baht figure is arithmetic from the formula, labeled as an example.",
          },
          {
            question:
              "Tutor A (12,000 baht own GV) brought in Tutor B (18,000 baht). What is Tutor A's payout?",
            options: [
              "16,682 baht",
              "7,862 baht",
              "5,520 baht",
              "8,820 baht",
            ],
            correctAnswer: "7,862 baht",
            explanation:
              "Tutor A's GV is 30,000 baht at 55.6% = 16,682 baht, minus Tutor B's payout of 8,820 baht: 7,862 baht.",
          },
          {
            question: "Which step is necessary before a tutor gets a payout?",
            options: [
              "Bring in one new tutor.",
              "Verify the account in the tutor app (ID card, bank book, address).",
              "Pay a joining fee.",
              "Teach for one full year.",
            ],
            correctAnswer:
              "Verify the account in the tutor app (ID card, bank book, address).",
            explanation:
              "Verified tutors only: an unverified tutor gets no payout. The app also shows the 3% withholding tax.",
          },
        ],
      },
    ],
  },
  {
    slug: "school-sale",
    title: "School Sale: Primary Advantage with Blended Learning",
    description:
      "Sell a one-semester pilot of Primary Advantage with Blended Learning to a primary school: the rules, the demos, the 8 objections, the total cost of English, and the end-of-semester review.",
    phase: "School branch",
    order: 7,
    lessons: [
      {
        title: "The 2027 School Sale: Rules for Every Conversation",
        type: "theory" as const,
        content: `# The 2027 School Sale: Rules for Every Conversation

**TL;DR:** Sell Primary Advantage with Blended Learning (or App-Only) to primary schools. The pilot is one grade level for one semester. Quote the two standard prices, and propose the pilot.

**Video — Primary Advantage Selling to a School:** [Thai](https://www.youtube.com/watch?v=PH5D9niLoUg) · [English](https://www.youtube.com/watch?v=o5HDBZBge-w)

## The rules (Daniel, 2026 decisions)

- Sell **Primary Advantage with Blended Learning** (or App-Only). Reading Advantage is not offered to schools now.
- Quote App-Only ~1,000 THB/student/year and Blended Learning ~1,500 THB/student/year only.
- Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05).
- The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05).
- **Managed Service:** one line only. "Not sold today. It launches in 2027 only if 1–2 more schools sign." Never pre-sell it.
- **Science, Math, and Zhongwen Advantage:** "coming programs" with no date (Q-PR-24).
- Show only features that are live in the Primary Advantage production app on the day of the demo. Before each demo, ask Daniel or Phikul which facts changed. Two facts decide what is live:
  - Primary Advantage cutover: target weekend of Oct 17/18, last date Oct 20. Until it passes, the legacy build is production.
  - Reedy Preview in Primary Advantage: only after the cutover passes. Do not show Reedy in a Primary demo before then.
- Name Boonyathat, or show its data, only with the school's written consent (Q-SE-03).

## Who buys, and when

The buyers are Thai private primary schools outside the major cities. Procurement runs February to April; the school year starts in mid-May. The people who can say "yes" to a pilot are the school director, the head of academic affairs, and the head of English.

## How to explain Blended Learning

Blended Learning means physical workbooks + the digital app. Never say "AI + human teacher". Your own Thai teachers teach the lessons from the printed workbook. We train them for 2 days and observe classes every quarter.

## The Big 4 classroom-fidelity protocol

Every class follows the Big 4, and we observe classes every quarter:

1. **Uninterrupted Reading:** students read without interruption.
2. **Student Agency:** students choose their reading and their vocabulary targets.
3. **Data-Driven Consensus:** app data guides teaching decisions.
4. **Workbook-First Protocol:** students work in the workbook first, then check in the app.

## Our size

"Today we have one active school in Thailand, in Kalasin, on Primary Advantage, with under 500 active students. We are a Khon Kaen company, self-funded. We build the right product before we grow."

Never inflate this number. Never call us "leading" or "number one".`,
        order: 1,
      },
      {
        title: "The 15-, 45-, and 90-Minute Demos",
        type: "theory" as const,
        content: `# The 15-, 45-, and 90-Minute Demos

**TL;DR:** The 15-minute demo earns a 45-minute demo. The 45-minute demo agrees a pilot. The 90-minute demo gives a multi-grade school the complete picture. Each demo ends with one next step.

## 15-minute first-contact demo

**Objective:** qualify the school and get a 45-minute demo with the academic team. **Audience:** the school director or the head of academic affairs, at first contact.

**Open with the problem they know:** "Many private schools tell me the same thing: it is hard to find and keep qualified foreign English teachers. When a teacher leaves, the program stops until a new teacher comes. Parents ask why their children's English does not improve." A seller who has not heard this from schools yet says: "Thai private schools outside the major cities find it hard to recruit and keep qualified foreign English teachers."

**Introduce the solution:** "We are a curriculum publisher in Khon Kaen. Primary Advantage is a series of printed English workbooks with a matching app. Each workbook has 14 lessons with a fixed lesson plan. Your own Thai teachers teach the lessons. We train them and observe classes every quarter. We call this Blended Learning: physical workbooks plus the digital app."

**Key facts:**

- CEFR-aligned: the active program covers Pre-A1 to A2.
- Printed workbooks of 14 lessons, each with a digital twin in the app.
- Scripted lessons: no lesson planning for your teachers.
- Quarterly fidelity observations and per-school reporting.
- One active school today (Kalasin, on Primary Advantage); under 500 students.

**Expected objections and answers:**

- "We already have a foreign teacher." → "Keep a good foreign teacher. Also give your Thai teachers a system and materials for consistent lessons. Then, if the foreign teacher leaves, your English program continues."
- "Budget is locked this year." → "I understand. What does your English program cost now: textbooks, digital tools, a foreign teacher's salary? Many schools plan the purchase in the February to April procurement window."
- "We tried apps before, and teachers did not use them." → "We do not give you only software. The workbook comes first: every lesson starts on paper with a fixed lesson plan. We train your teachers, and we observe classes every quarter with a standard form. One person on our team is your school's implementation contact."

**Next step:** "Can we have 45 minutes next week with your academic team? I will show the app and bring printed workbooks." Leave behind the school sale deck (PDF).

## 45-minute standard demo

**Objective:** show how Primary Advantage with Blended Learning works in a classroom, and agree a pilot: one grade level for one semester. **Audience:** the school director, the head of academic affairs, and the head of English.

1. **Agenda (5 minutes):** the Thai classroom problem, the workbook and the app, the research behind the method, and how the school can audit the quality.
2. **Built for the Thai classroom reality (5 minutes):** scripted workbook lessons, so Thai teachers teach with confidence; classes of 30 or more; a Thai-language interface; a Khon Kaen team with sales and support in Thai.
3. **The workbook and the app (5 minutes):** each lesson follows the same 13 printed steps, from Before You Read to Lesson Reflection, and has its twin in the app. Printed today: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027.
4. **Research-backed method (5 minutes):** use the Aka (2019) long form, word for word. Then say: "Rather than promise a specific number, we commit to transparent per-school reporting. You'll see pre/post benchmark deltas, total reading volume per student, and Big 4 fidelity scores every quarter."
5. **Quality you can audit (5 minutes):** name the Big 4: Uninterrupted Reading, Student Agency, Data-Driven Consensus, Workbook-First Protocol. Put the observation form on the table.
6. **App walkthrough (10 minutes):** live production screens only: a lesson with the article, audio, questions, and vocabulary; a game and the flashcards; the teacher view. Put the printed workbook next to the screen.
7. **Workbook samples (5 minutes):** printed pages from Primary Advantage Origins 2 and Primary Advantage Origins 3.1.

**"Parents want native speakers":** "Parents want their children to read and speak English with confidence. A foreign teacher is one way, but it is hard to keep one outside the big cities. Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019). We give you per-school reports to show parents what their children read and learn."

**"We need results this year":** "We measure and report outcomes per school (benchmark deltas + reading volume + fidelity scores), because results vary by implementation quality and reading volume."

**Next step:** "Let's plan a pilot: one grade level for one semester. We train the teachers before the semester starts. At the end of the semester, we review the data with you and decide on the next school year."

## 90-minute deep demo

**Objective:** give a school that plans a multi-grade adoption the complete picture. **Audience:** the school director, the academic leadership team, and the IT lead.

1. **The problem (10 minutes):** foreign-teacher turnover, and materials from different publishers that do not match. Directors cannot see how English performs across grades.
2. **The catalogue and the channels (15 minutes):** Primary Advantage for schools; the same books reach families through Tutor Advantage; the coming programs have no date.
3. **Mastery Advantage, the engine (20 minutes):** Knowledge Space Theory and FSRS. It is in production for CodeCamp Advantage. It enters Primary Advantage through tagged content: shadow mode in semester 2 of 2026, adaptive features targeted for May 2027. Today, Primary Advantage uses FSRS flashcard scheduling; the knowledge-graph layer is not yet in the Primary Advantage app.
4. **Per-school data and reporting (15 minutes):** reading volume, comprehension accuracy, vocabulary progress, and Big 4 fidelity scores. Agree the method for baseline and end-of-semester checks with the school before the semester.
5. **A phased plan (10 minutes):** semester 1 is the pilot (one grade level, Blended Learning); the next school year adds grades with printed books; later, further levels up to A2 as their books are printed.
6. **The company boilerplate (5 minutes):** read it word for word.

> Reading Advantage (Thailand) is a curriculum publisher headquartered in Khon Kaen, Thailand. It publishes leveled English workbooks of 14 lessons each, with a matching digital app, for Thai schools and families. Every article, question, and vocabulary item is being tagged to Mastery Advantage, an engine that combines Knowledge Space Theory with the FSRS spaced-repetition scheduler and runs in production in CodeCamp Advantage. Schools use the books through Blended Learning, which pairs physical workbooks with the app and scripted lessons, so Thai teachers can deliver native-standard English instruction without depending on foreign-teacher recruitment. Families join tutor-led classes through Tutor Advantage.

**"Will the next levels arrive on time?":** "We sell only books that are printed. We do not pre-sell books that do not exist."

**"You are very small":** "We are: one active school, under 500 students, self-funded. That is why your school matters to us."`,
        order: 2,
      },
      {
        title: "The 8 School Objections",
        type: "theory" as const,
        content: `# The 8 School Objections

**TL;DR:** Accept the objection as legitimate. Answer from a canonical source. Then commit to transparent per-school reporting.

## Objection 1: "Our Thai teachers aren't good enough at English to teach this."

"That is exactly the problem we designed for. The Blended Learning model pairs our app with physical, scripted workbooks. Your teacher doesn't need to be a native speaker. Every Primary Advantage lesson has the same 13 printed steps, from Before You Read to Lesson Reflection. The teacher opens the workbook and follows the steps. Thai teachers run the scripted lessons after two days of training."

## Objection 2: "We bought software before, and nobody used it."

"We do not sell only a login. One person on our team is your school's implementation contact. Every quarter, we observe classes with a standard form and send you a fidelity report: how many workbook lessons the classes complete, how much the students read, and how closely the lessons follow the Big 4 classroom-fidelity protocol. When a class stops using the program, the app data and the observations show it."

## Objection 3: "It is too expensive compared to textbooks."

"Let us look at the total cost of English, not only the line item. A textbook costs less at the start. But a textbook does not include a lesson plan for every step, audio for every article, practice in an app, teacher training, or quarterly observation reports. At about 1,500 THB per student per year, Blended Learning includes the printed workbooks, the app, scripted lessons, 2-day teacher training, and quarterly fidelity observations. Let us add up your current English costs together, and compare."

## Objection 4: "We want to see results before we commit."

"That is the right question. Here is what we can say, and here is what we commit to."

Research: "A controlled one-year study (Aka, 2019) found that extensive-reading instruction (2 hours/week) outperformed grammar instruction on reading test scores. On the post-test reading section (0–100 scale), the extensive-reading group scored higher (61.78 vs 52.29; ~+9.5 points)."

Transparency: "Rather than promise a specific number, we commit to transparent per-school reporting. You'll see pre/post benchmark deltas, total reading volume per student, and Big 4 fidelity scores every quarter."

The pilot: one grade level for one semester. At the end of the semester, we review the data together.

## Objection 5: "We already have a foreign teacher program. Why change?"

"If your foreign-teacher program is stable, that is excellent. Here is the question I would ask: what happens to your English program if your foreign teacher resigns tomorrow? Our Blended Learning program builds an English-teaching system inside your school that does not depend on one teacher. You can start with one grade level for one semester as a pilot, next to your foreign-teacher program."

## Objection 6: "We are waiting to see if the government changes the English curriculum."

"I understand the caution. Our books are CEFR-aligned, and each book names its CEFR level. The workbook program runs next to your English classes. It does not replace the curriculum that your school follows."

Do not comment on MOE policy or predict a policy change.

## Objection 7: "Can you give us a discount, or a free trial?"

"Our prices are App-Only about 1,000 THB per student per year and Blended Learning about 1,500 THB per student per year. I cannot offer a discount. What I can offer is a pilot: one grade level for one semester, so that you see the program in your school before a full commitment. I will ask Daniel about the pilot terms for your school."

## Objection 8: "Do you have something for our secondary section?"

"Today we offer Primary Advantage for primary grades. We do not offer a secondary program to schools now. Families of secondary students can join a Tutor Advantage class with the Reading Advantage books."

Do not sell the Reading Advantage app to schools. Do not give a date for a secondary program.`,
        order: 3,
      },
      {
        title: "The Total-Cost-of-English Frame",
        type: "theory" as const,
        content: `# The Total-Cost-of-English Frame

**TL;DR:** When a director pushes back on price, compare the per-student price with the school's own total cost of English. Use the school's numbers, keep each input visible, and invent nothing.

## Start with the standard prices

- App-Only: approximately **1,000 THB/student/year**.
- Blended Learning: approximately **1,500 THB/student/year**.
- Managed Service is not quoted in sales conversations.

Annual cost = students in scope × price per student. For example, 500 students at the Blended Learning reference price is 750,000 THB/year. Label that as a worked estimate, not a quote.

## Run the frame in a meeting

1. **Get their current numbers:** "How many students are in your English program? Are you paying for foreign teachers now? What is your total English-program budget: textbooks, digital tools, and foreign-teacher salaries?"
2. **Show their current total cost:** add up their line items with them: textbooks, workbooks, digital tools, foreign-teacher salaries, recruitment fees, lesson-planning time, and grading time.
3. **Show what Blended Learning costs at their scale:** their student count × the reference price.
4. **Compare side by side.**
5. **Add what does not appear on a budget line:** no foreign-teacher recruitment cycle, scripted lessons that reduce preparation time, and quarterly fidelity reports for the board.

## Rules

- Use the school's own numbers. Do not present a market price as a fact about the school.
- Do not invent turnover, savings, or outcome values.
- If the price does not fit, make the start smaller (one grade level for one semester), not the price. Do not create a flat price or a discount.
- Research: use the approved Aka (2019) forms only.`,
        order: 4,
      },
      {
        title: "The End-of-Semester Review and Close",
        type: "theory" as const,
        content: `# The End-of-Semester Review and Close

**TL;DR:** At the end of the pilot semester, show the data honestly, including the weaknesses, and propose an agreement for the next school year.

## Objective and audience

Turn a one-semester pilot into an agreement for the next school year. The audience is the school director (the decision-maker), with the academic head and the head of English.

## Present the pilot data (10 minutes)

- Reading volume for the pilot grade: articles read, time on task.
- Teacher feedback: what worked in the workbook lessons, what was hard.
- Student engagement: lesson completion, comprehension accuracy.
- The quarterly fidelity observation: where the classes scored well, and where they can improve.
- Baseline and end-of-semester checks, if the school agreed them at the start.

Say weaknesses honestly. An example: "Class 4/2 started slowly. The teacher was not comfortable with the workbook format at first. We had a coaching session in week 5, and the observation in week 12 was better. The fidelity system is there to find problems early."

## Present the proposal

- Product: Primary Advantage with Blended Learning.
- Students: the grades and the student count.
- Annual cost: the student count × the reference price per student per year.
- Included: the app, the printed workbooks, 2-day teacher training for new teachers, quarterly fidelity observations, end-of-semester reviews.
- Timeline: the agreement date, the teacher training dates before the school year, the first observation date.

**Timing (a fact, not pressure):** "Thai school procurement runs from February to April for the May school year. If we agree in that window, we can train your teachers before the first semester."

## Objections at the review

| The director says | The answer |
|---|---|
| "The board has not reviewed this yet." | "Can we have 30 minutes with the board? I will bring a one-page summary of the pilot data, the proposal, and the training timeline." |
| "The budget is not approved." | "We can prepare the agreement now, with the signature after the budget is approved." |
| "Let's wait until next term." | "That is your decision. If you start later, we plan teacher training for the new start date." |
| "Can we extend the pilot for another semester?" | "We can talk about it. Daniel decides pilot terms. An agreement for the school year gives your teachers and students continuity, with the same support as the pilot." |

## Next step

"I will prepare the agreement with the scope, the price, and the timeline that we discussed. Then we schedule teacher training and the first observation."`,
        order: 5,
      },
      {
        title: "Roleplay: The 15-Minute Discovery Call",
        type: "roleplay" as const,
        content: `**Method:** Introduce the company in one sentence. Name the problem in the director's language within the first 60 seconds. Ask at least 3 open discovery questions before you describe the product. Then describe Primary Advantage with Blended Learning briefly and ask for a demo with a date and a time.

**Discovery questions:** "How long has your current English program been running?" "What happens when a foreign teacher leaves mid-year?" "How do you currently measure whether the English program is working?"

**Solution teaser:** "printed English workbooks with a matching app, a fixed lesson plan for every lesson, teacher training, and quarterly observations. Your own Thai teachers teach the lessons, and the program stays when a teacher leaves."

**Success standard:** a scheduled demo with a named date and time.`,
        order: 6,
        scenarios: [
          {
            personaName: "Director Wichai",
            personaRole: "Director, 400-student private school, Udon Thani",
            situation:
              "This is your first call to Director Wichai. His school has 2 foreign teachers, and one just gave notice. He does not know Primary Advantage or the company. He says: 'You have 15 minutes. What is this about?'",
            objective:
              "Name the problem in his language within the first 60 seconds. Ask at least 3 open discovery questions before you describe the product. Describe Blended Learning as physical workbooks + digital app. Then ask for a demo with a named date and time.",
            prospectContext:
              "Wichai is skeptical of edtech but open to hearing solutions. Foreign-teacher turnover has been a problem, the school has no formal measurement system, and parents sometimes complain. He gives this information only when asked.",
            rubric: [
              {
                criterion:
                  "Names the problem in the director's language (not product language) within the first 60 seconds",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-1-the-15-minute-discovery-call",
              },
              {
                criterion: "Asks at least 3 open discovery questions before pitching",
                weight: 0.3,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-1-the-15-minute-discovery-call",
              },
              {
                criterion:
                  "Positions Blended Learning as \"physical workbooks + digital app\", never \"AI + human teacher\"",
                weight: 0.15,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-1-the-15-minute-discovery-call",
              },
              {
                criterion: "Secures a scheduled demo with a named date and time",
                weight: 0.15,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-1-the-15-minute-discovery-call",
              },
              claimsCriterion(
                0.2,
                "Uses no banned terms from the outcome-claims policy.",
                "school",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay: The 30-Minute Demo",
        type: "roleplay" as const,
        content: `**Method:** Recap the discovery call. Show live production screens, printed pages from Primary Advantage Origins 2 and Primary Advantage Origins 3.1, and the quarterly observation form. Name the Big 4. Use the approved research form. State the company size honestly. Handle at least two objections with approved answers. Close with the pilot.

**Research, word for word:** "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)."

**Our size:** "We are a Khon Kaen company with one active school and under 500 students today."

**If Managed Service comes up:** "Not sold today. It launches in 2027 only if 1–2 more schools sign."

**The close:** "Try Primary Advantage with Blended Learning for one grade level, for one semester. We train your teachers before it starts and observe the classes. At the end of the semester, we review the data together and plan the next school year."

**Success standard:** the school agrees to plan a pilot: one grade level for one semester, with no free period and no discount.`,
        order: 7,
        scenarios: [
          {
            personaName: "Director Ratana",
            personaRole: "Director, 600-student private school with primary grades, Khon Kaen",
            situation:
              "This is the second meeting. Director Ratana and Khun Somsak, the head of academic affairs, join. A colleague at another school told Ratana about Primary Advantage. Somsak says: 'Technology cannot replace a good teacher. Show me evidence that this works.'",
            objective:
              "Run a 30-minute version of the standard demo. Name the Big 4, use the Aka (2019) short form word for word, state the company size honestly, handle at least 2 objections with approved answers, and propose the pilot: one grade level for one semester.",
            prospectContext:
              "Ratana is interested but careful with the budget. Somsak challenges the research and asks whether the company can send teachers. Ratana asks about a discount near the end.",
            rubric: [
              {
                criterion: "Demonstrates the Big 4 protocol and names all four correctly",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-2-the-30-minute-demo",
              },
              {
                criterion:
                  "Uses the approved Aka (2019) short form word for word, and states the current scale honestly (1 school, under 500 students)",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-2-the-30-minute-demo",
              },
              {
                criterion: "Handles at least 2 objections using canonical-source responses only",
                weight: 0.25,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-2-the-30-minute-demo",
              },
              {
                criterion:
                  "Proposes the pilot (one grade level, one semester) at the standard prices",
                weight: 0.15,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-2-the-30-minute-demo",
              },
              claimsCriterion(
                0.2,
                "Uses zero banned terms; says only the one Managed Service line if it comes up.",
                "school",
              ),
            ],
          },
        ],
      },
      {
        title: "Roleplay: The Price-Conversation Close",
        type: "roleplay" as const,
        content: `**Method:** Recap and confirm the remaining concern. Frame the conversation around the total cost of English, not the per-student line item. State the price bands correctly. Handle the discount request without a price concession. Offer the scoped pilot and move to concrete next steps.

**The total cost:** "Let us look at what you are spending today on English: foreign-teacher salaries, recruitment agency fees, textbook purchases, teacher grading time, lesson-planning hours."

**The price:** App-Only ~1,000 THB/student/year, Blended Learning ~1,500 THB/student/year.

**The discount request:** "I cannot offer a discount. Our prices are built for Thai private-school budgets. What I can offer is a pilot: one grade level for one semester, so you see the system work before a full-school commitment. If you want to talk about multi-year terms, I will ask Daniel."

**Next steps:** the grade level for the pilot, the semester, and a signed pilot agreement. Then the implementation contact plans the teacher training.

**Success standard:** the director agrees the pilot grade and semester, with the standard price.`,
        order: 8,
        scenarios: [
          {
            personaName: "Director Prasert",
            personaRole: "Director, 350-student private school, Kalasin",
            situation:
              "This is the decision meeting. Director Prasert saw the demo and likes the concept, but the board will check every new recurring expense. He says: 'Can you give us a better price if we commit to multiple years?'",
            objective:
              "Frame the conversation around the total cost of English. State the two price bands correctly. Handle the discount request without a price concession, offer the scoped pilot, and move to concrete next steps.",
            prospectContext:
              "Prasert trusts the trainee but must justify the cost to his board. He has budget for English-program improvement. He asks for a discount twice and asks how fast the company answers problems.",
            rubric: [
              {
                criterion:
                  "Frames the conversation around the total cost of English, not only the per-student line item",
                weight: 0.25,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
              },
              {
                criterion: "States the two price bands correctly, without inflating or discounting them",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
              },
              {
                criterion:
                  "Handles the discount request without an unauthorized price concession, and offers a scoped pilot (not full-school)",
                weight: 0.2,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
              },
              {
                criterion:
                  "Moves to concrete next steps (the implementation contact, the training plan)",
                weight: 0.15,
                passingScore: 60,
                sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
              },
              claimsCriterion(
                0.2,
                "Never promises a specific outcome or improvement percentage.",
                "school",
              ),
            ],
          },
        ],
      },
      {
        title: "School Sale Quiz",
        type: "quiz" as const,
        content: "",
        order: 9,
        quizQuestions: [
          {
            question: "What is the school pilot in 2027?",
            options: [
              "The whole school for one month.",
              "One grade level for one semester.",
              "Two grades for one school year.",
              "One class for two weeks.",
            ],
            correctAnswer: "One grade level for one semester.",
            explanation:
              "The pilot is one grade level for one semester. Whether the pilot is paid or free is not decided (Q-SV-05), so the seller quotes the standard prices and asks Daniel about the pilot terms.",
          },
          {
            question: "Which are the Big 4 of the classroom-fidelity protocol?",
            options: [
              "Uninterrupted Reading, Student Agency, Data-Driven Consensus, Workbook-First Protocol",
              "Phonics, Grammar, Writing, Speaking",
              "Daily Writing, Weekly Tests, Monthly Reports, Native Teachers",
              "App First, Games, Rewards, Homework",
            ],
            correctAnswer:
              "Uninterrupted Reading, Student Agency, Data-Driven Consensus, Workbook-First Protocol",
            explanation:
              "These are the canonical Big 4 names. We observe classes against them every quarter.",
          },
          {
            question: "A director asks about the secondary section. What is the correct answer?",
            options: [
              "Sell Reading Advantage to the school at the App-Only price.",
              "Today we offer Primary Advantage for primary grades. Families of secondary students can join a Tutor Advantage class with the Reading Advantage books.",
              "Promise a secondary program next year.",
              "Offer Primary Advantage Quest 4 to secondary students.",
            ],
            correctAnswer:
              "Today we offer Primary Advantage for primary grades. Families of secondary students can join a Tutor Advantage class with the Reading Advantage books.",
            explanation:
              "Objection 8: we do not offer a secondary program to schools now, and we give no date for one.",
          },
          {
            question: "A director asks for a multi-year discount. What does the seller do?",
            options: [
              "Give 10% off for a 3-year agreement.",
              "Say that you cannot offer a discount, offer the pilot (one grade level for one semester), and ask Daniel about multi-year terms.",
              "Offer a free first semester.",
              "Offer Managed Service at the Blended Learning price.",
            ],
            correctAnswer:
              "Say that you cannot offer a discount, offer the pilot (one grade level for one semester), and ask Daniel about multi-year terms.",
            explanation:
              "Discount policy is Daniel's decision (Q-SV-05). Change the size of the start, not the price.",
          },
          {
            question: "What is the consent rule for naming Boonyathat or showing its data?",
            options: [
              "In every demo, as proof.",
              "Only with the school's written consent.",
              "Only in the 90-minute demo.",
              "Never, under any condition.",
            ],
            correctAnswer: "Only with the school's written consent.",
            explanation:
              "Name Boonyathat, or show its data, only with the school's written consent (Q-SE-03).",
          },
        ],
      },
    ],
  },
];

type ModuleRow = Pick<typeof salesModules.$inferSelect,
  "id" | "slug" | "title" | "description" | "phase" | "order">;
type LessonRow = Pick<typeof salesLessons.$inferSelect,
  "id" | "moduleId" | "title" | "type" | "content" | "order" | "reviewStatus">;
type RubricRow = Pick<typeof salesRubrics.$inferSelect,
  "id" | "name" | "criteriaJson" | "reviewStatus">;
type ScenarioRow = Pick<typeof salesRoleplayScenarios.$inferSelect,
  "id" | "lessonId" | "personaName" | "personaRole" | "situation" |
  "objective" | "prospectContextJson" | "rubricId" | "order">;
type QuizRow = Pick<typeof salesQuizQuestions.$inferSelect,
  "id" | "lessonId" | "question" | "optionsJson" | "correctAnswer" |
  "explanation" | "order">;

interface CurriculumRows {
  modules: ModuleRow[];
  lessons: LessonRow[];
  rubrics: RubricRow[];
  scenarios: ScenarioRow[];
  quizQuestions: QuizRow[];
}

interface LessonRemap {
  sourceLessonId: string;
  targetLessonId: string;
}

interface ReconciliationActivityCounts {
  attempts: number;
  conversations: number;
  chatMessages: number;
}

interface ReconciliationPlanInput {
  currentGraphSha256: string;
  currentModules: Array<Pick<ModuleRow, "id" | "slug">>;
  currentLessons: Array<Pick<LessonRow, "id" | "moduleId" | "title">>;
  progressLessonIds: string[];
  activityCounts: ReconciliationActivityCounts;
  approvalSha256?: string;
}

interface SeedStaticSalesCurriculumOptions {
  approvalSha256?: string;
}

type SalesTransaction = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * Derives a stable UUID-shaped identifier from one reviewed curriculum key.
 * @param key Canonical curriculum row key.
 * @returns Deterministic RFC 4122 variant identifier.
 */
function curriculumId(key: string): string {
  const bytes = createHash("sha256")
    .update("reading-advantage-sales-curriculum-v1\0")
    .update(key)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Builds the exact hand-authored production curriculum rows and stable keys.
 * @returns Complete deterministic curriculum graph in foreign-key order.
 */
export function buildStaticSalesCurriculumRows(): CurriculumRows {
  const rows: CurriculumRows = {
    modules: [],
    lessons: [],
    rubrics: [],
    scenarios: [],
    quizQuestions: [],
  };
  for (const module of staticSalesCurriculumModules) {
    const moduleId = curriculumId(`module:${module.slug}`);
    rows.modules.push({
      id: moduleId,
      slug: module.slug,
      title: module.title,
      description: module.description,
      phase: module.phase,
      order: module.order,
    });
    for (const lesson of module.lessons) {
      const lessonId = curriculumId(`lesson:${module.slug}:${lesson.order}`);
      rows.lessons.push({
        id: lessonId,
        moduleId,
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        order: lesson.order,
        reviewStatus: "approved",
      });
      if ("scenarios" in lesson && lesson.scenarios) {
        lesson.scenarios.forEach((scenario, index) => {
          const rubricId = curriculumId(
            `rubric:${module.slug}:${lesson.order}:${index + 1}`,
          );
          rows.rubrics.push({
            id: rubricId,
            name: `${lesson.title} Rubric`,
            criteriaJson: scenario.rubric,
            reviewStatus: "approved",
          });
          rows.scenarios.push({
            id: curriculumId(
              `scenario:${module.slug}:${lesson.order}:${index + 1}`,
            ),
            lessonId,
            personaName: scenario.personaName,
            personaRole: scenario.personaRole,
            situation: scenario.situation,
            objective: scenario.objective,
            prospectContextJson: { context: scenario.prospectContext },
            rubricId,
            order: index + 1,
          });
        });
      }
      if ("quizQuestions" in lesson && lesson.quizQuestions) {
        lesson.quizQuestions.forEach((question, index) => {
          rows.quizQuestions.push({
            id: curriculumId(
              `quiz:${module.slug}:${lesson.order}:${index + 1}`,
            ),
            lessonId,
            question: question.question,
            optionsJson: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            order: index + 1,
          });
        });
      }
    }
  }
  return rows;
}

const expectedRows = buildStaticSalesCurriculumRows();

/** Builds the stable semantic identity used only to carry learner progress forward. */
function lessonSemanticKey(moduleSlug: string, lessonTitle: string): string {
  return `${moduleSlug}\0${lessonTitle}`;
}

/**
 * Plans the sole approved predecessor-to-current curriculum reconciliation.
 * @param input Verified predecessor identity, activity counts, and progress rows.
 * @returns Progress rows remapped to approved lesson identifiers without changing metadata.
 * @throws When approval, predecessor identity, activity safety, or semantic mapping fails.
 */
export function buildSalesCurriculumReconciliationPlan(
  input: ReconciliationPlanInput,
): { lessonRemaps: LessonRemap[] } {
  if (input.approvalSha256 !== SALES_CURRICULUM_OWNER_APPROVAL_SHA256) {
    throw new Error("SALES_CURRICULUM_RECONCILIATION_APPROVAL_MISMATCH");
  }
  if (input.currentGraphSha256 !== SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256) {
    throw new Error(
      `SALES_CURRICULUM_RECONCILIATION_PREDECESSOR_DIGEST_MISMATCH actual=${input.currentGraphSha256}`,
    );
  }
  if (Object.values(input.activityCounts).some((count) => count > 0)) {
    throw new Error(
      `SALES_CURRICULUM_RECONCILIATION_ACTIVITY_PRESENT ${JSON.stringify(input.activityCounts)}`,
    );
  }

  const currentModuleSlugs = new Map(
    input.currentModules.map((module) => [module.id, module.slug]),
  );
  const currentLessons = new Map(input.currentLessons.map((lesson) => [
    lesson.id,
    lesson,
  ]));
  const currentSemanticKeys = new Set<string>();
  for (const lesson of input.currentLessons) {
    const moduleSlug = currentModuleSlugs.get(lesson.moduleId);
    if (!moduleSlug) {
      throw new Error(
        `SALES_CURRICULUM_RECONCILIATION_CURRENT_MODULE_UNMAPPABLE lesson=${lesson.id}`,
      );
    }
    const key = lessonSemanticKey(moduleSlug, lesson.title);
    if (currentSemanticKeys.has(key)) {
      throw new Error(
        `SALES_CURRICULUM_RECONCILIATION_SEMANTIC_LESSON_AMBIGUOUS key=${JSON.stringify(key)}`,
      );
    }
    currentSemanticKeys.add(key);
  }

  const expectedModuleSlugs = new Map(
    expectedRows.modules.map((module) => [module.id, module.slug]),
  );
  const expectedLessons = new Map<string, LessonRow>();
  for (const lesson of expectedRows.lessons) {
    const moduleSlug = expectedModuleSlugs.get(lesson.moduleId);
    if (!moduleSlug) {
      throw new Error("SALES_CURRICULUM_RECONCILIATION_APPROVED_GRAPH_INVALID");
    }
    const key = lessonSemanticKey(moduleSlug, lesson.title);
    if (expectedLessons.has(key)) {
      throw new Error("SALES_CURRICULUM_RECONCILIATION_APPROVED_GRAPH_AMBIGUOUS");
    }
    expectedLessons.set(key, lesson);
  }

  const lessonRemaps = [...new Set(input.progressLessonIds)].map((lessonId) => {
    const currentLesson = currentLessons.get(lessonId);
    if (!currentLesson) {
      throw new Error(
        `SALES_CURRICULUM_RECONCILIATION_CURRENT_LESSON_UNMAPPABLE lesson=${lessonId}`,
      );
    }
    const moduleSlug = currentModuleSlugs.get(currentLesson.moduleId);
    if (!moduleSlug) {
      throw new Error(
        `SALES_CURRICULUM_RECONCILIATION_CURRENT_MODULE_UNMAPPABLE lesson=${lessonId}`,
      );
    }
    const key = lessonSemanticKey(moduleSlug, currentLesson.title);
    const targetLesson = expectedLessons.get(key);
    if (!targetLesson) {
      throw new Error(
        `SALES_CURRICULUM_RECONCILIATION_TARGET_LESSON_MISSING key=${JSON.stringify(key)}`,
      );
    }
    return { sourceLessonId: lessonId, targetLessonId: targetLesson.id };
  });

  const targetLessonIds = new Set<string>();
  for (const remap of lessonRemaps) {
    if (targetLessonIds.has(remap.targetLessonId)) {
      throw new Error(
        `SALES_CURRICULUM_RECONCILIATION_PROGRESS_COLLISION lesson=${remap.targetLessonId}`,
      );
    }
    targetLessonIds.add(remap.targetLessonId);
  }
  return { lessonRemaps };
}

/** Exact production curriculum cardinalities used by deployment verification. */
export const SALES_CURRICULUM_EXPECTED_COUNTS = Object.freeze({
  modules: expectedRows.modules.length,
  lessons: expectedRows.lessons.length,
  rubrics: expectedRows.rubrics.length,
  scenarios: expectedRows.scenarios.length,
  quizQuestions: expectedRows.quizQuestions.length,
});

/** Reads the complete curriculum graph inside one database transaction. */
async function readCurriculumRows(
  transaction: SalesTransaction,
): Promise<CurriculumRows> {
  const [modules, lessons, rubrics, scenarios, quizQuestions] =
    await Promise.all([
      transaction.select({
        id: salesModules.id,
        slug: salesModules.slug,
        title: salesModules.title,
        description: salesModules.description,
        phase: salesModules.phase,
        order: salesModules.order,
      }).from(salesModules),
      transaction.select({
        id: salesLessons.id,
        moduleId: salesLessons.moduleId,
        title: salesLessons.title,
        type: salesLessons.type,
        content: salesLessons.content,
        order: salesLessons.order,
        reviewStatus: salesLessons.reviewStatus,
      }).from(salesLessons),
      transaction.select({
        id: salesRubrics.id,
        name: salesRubrics.name,
        criteriaJson: salesRubrics.criteriaJson,
        reviewStatus: salesRubrics.reviewStatus,
      }).from(salesRubrics),
      transaction.select({
        id: salesRoleplayScenarios.id,
        lessonId: salesRoleplayScenarios.lessonId,
        personaName: salesRoleplayScenarios.personaName,
        personaRole: salesRoleplayScenarios.personaRole,
        situation: salesRoleplayScenarios.situation,
        objective: salesRoleplayScenarios.objective,
        prospectContextJson: salesRoleplayScenarios.prospectContextJson,
        rubricId: salesRoleplayScenarios.rubricId,
        order: salesRoleplayScenarios.order,
      }).from(salesRoleplayScenarios),
      transaction.select({
        id: salesQuizQuestions.id,
        lessonId: salesQuizQuestions.lessonId,
        question: salesQuizQuestions.question,
        optionsJson: salesQuizQuestions.optionsJson,
        correctAnswer: salesQuizQuestions.correctAnswer,
        explanation: salesQuizQuestions.explanation,
        order: salesQuizQuestions.order,
      }).from(salesQuizQuestions),
    ]);
  return { modules, lessons, rubrics, scenarios, quizQuestions };
}

/** Reads progress plus activity that cannot be discarded by graph replacement. */
async function readReconciliationState(
  transaction: SalesTransaction,
): Promise<{
  progressLessonIds: string[];
  activityCounts: ReconciliationActivityCounts;
}> {
  const [progressRows, attempts, conversations, chatMessages] = await Promise.all([
    transaction.select({
      lessonId: salesProgress.lessonId,
    }).from(salesProgress),
    transaction.select({ id: salesRoleplayAttempts.id })
      .from(salesRoleplayAttempts),
    transaction.select({ id: salesConversations.id }).from(salesConversations),
    transaction.select({ id: salesChatMessages.id }).from(salesChatMessages),
  ]);
  return {
    progressLessonIds: progressRows.map((row) => row.lessonId),
    activityCounts: {
      attempts: attempts.length,
      conversations: conversations.length,
      chatMessages: chatMessages.length,
    },
  };
}

/** Recursively sorts JSON object keys while preserving array order. */
function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableJsonValue(child)]),
    );
  }
  return value;
}

/** Returns a stable serialization for exact graph comparison. */
function canonicalRows(rows: CurriculumRows): string {
  const sort = <T extends { id: string }>(values: T[]): T[] =>
    [...values].sort((left, right) => left.id.localeCompare(right.id));
  return JSON.stringify(stableJsonValue({
    modules: sort(rows.modules),
    lessons: sort(rows.lessons),
    rubrics: sort(rows.rubrics),
    scenarios: sort(rows.scenarios),
    quizQuestions: sort(rows.quizQuestions),
  }));
}

/**
 * Returns the canonical SHA-256 identity of a curriculum graph.
 * @param rows Curriculum rows whose exact identity is required.
 * @returns Canonical SHA-256 graph digest.
 */
export function curriculumRowsDigest(rows: CurriculumRows): string {
  return createHash("sha256").update(canonicalRows(rows)).digest("hex");
}

/**
 * Verifies that rows are the exact owner-approved production graph.
 * @param rows Curriculum rows to compare with the pinned approval digest.
 * @returns The exact approved graph digest.
 * @throws When the graph digest differs from the approved release candidate.
 */
export function assertApprovedSalesCurriculumGraph(
  rows: CurriculumRows,
): string {
  const actual = curriculumRowsDigest(rows);
  if (actual !== SALES_CURRICULUM_APPROVED_GRAPH_SHA256) {
    throw new Error(
      `SALES_CURRICULUM_APPROVED_GRAPH_DIGEST_MISMATCH actual=${actual}`,
    );
  }
  return actual;
}

/** Fails unless the database graph exactly matches the reviewed static graph. */
function assertCompleteCurriculum(rows: CurriculumRows): void {
  if (canonicalRows(rows) !== canonicalRows(expectedRows)) {
    const counts = Object.fromEntries(
      Object.entries(rows).map(([key, values]) => [key, values.length]),
    );
    throw new Error(
      `SALES_CURRICULUM_INCOMPLETE_OR_INCONSISTENT ${JSON.stringify(counts)}`,
    );
  }
}

/**
 * Verifies exact counts, approved statuses, row content, types, and foreign keys.
 * @param database Sales database connection to inspect.
 * @returns Exact verified production curriculum counts.
 * @throws When any curriculum row is missing, extra, draft, or inconsistent.
 */
export async function verifyStaticSalesCurriculum(
  database: DB = db,
): Promise<typeof SALES_CURRICULUM_EXPECTED_COUNTS> {
  return database.transaction(async (transaction) => {
    const rows = await readCurriculumRows(transaction);
    assertCompleteCurriculum(rows);
    assertApprovedSalesCurriculumGraph(rows);
    return SALES_CURRICULUM_EXPECTED_COUNTS;
  });
}

/** Inserts the exact approved curriculum rows in foreign-key order. */
async function insertExpectedCurriculum(
  transaction: SalesTransaction,
): Promise<void> {
  await transaction.insert(salesModules).values(expectedRows.modules);
  await transaction.insert(salesLessons).values(expectedRows.lessons);
  await transaction.insert(salesRubrics).values(expectedRows.rubrics);
  await transaction.insert(salesRoleplayScenarios).values(expectedRows.scenarios);
  await transaction.insert(salesQuizQuestions).values(expectedRows.quizQuestions);
}

/** Snapshots and remaps learner progress without decoding timestamps or numerics in JavaScript. */
async function snapshotAndRemapProgress(
  transaction: SalesTransaction,
  lessonRemaps: LessonRemap[],
): Promise<void> {
  await transaction.execute(sql.raw(`
    CREATE TEMP TABLE sales_curriculum_progress_snapshot ON COMMIT DROP AS
    SELECT id, user_id, lesson_id, status, completed_at, score, created_at, updated_at
    FROM sales_progress
  `));
  await transaction.execute(sql.raw(`
    CREATE TEMP TABLE sales_curriculum_lesson_remap (
      source_lesson_id uuid PRIMARY KEY,
      target_lesson_id uuid NOT NULL UNIQUE
    ) ON COMMIT DROP
  `));
  if (lessonRemaps.length > 0) {
    await transaction.execute(sql`
      INSERT INTO sales_curriculum_lesson_remap
        (source_lesson_id, target_lesson_id)
      VALUES ${sql.join(
        lessonRemaps.map((remap) => sql`(
          ${remap.sourceLessonId}::uuid,
          ${remap.targetLessonId}::uuid
        )`),
        sql`, `,
      )}
    `);
  }
  await transaction.execute(sql.raw(`
    DO $reconciliation$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM sales_curriculum_progress_snapshot AS snapshot
        LEFT JOIN sales_curriculum_lesson_remap AS remap
          ON remap.source_lesson_id = snapshot.lesson_id
        WHERE remap.source_lesson_id IS NULL
      ) THEN
        RAISE EXCEPTION 'SALES_CURRICULUM_RECONCILIATION_PROGRESS_MAPPING_MISSING';
      END IF;
    END
    $reconciliation$
  `));
  await transaction.execute(sql.raw(`
    UPDATE sales_curriculum_progress_snapshot AS snapshot
    SET lesson_id = remap.target_lesson_id
    FROM sales_curriculum_lesson_remap AS remap
    WHERE snapshot.lesson_id = remap.source_lesson_id
  `));
  await transaction.execute(sql.raw(`
    DO $reconciliation$
    BEGIN
      IF EXISTS (
        SELECT user_id, lesson_id
        FROM sales_curriculum_progress_snapshot
        GROUP BY user_id, lesson_id
        HAVING count(*) <> 1
      ) THEN
        RAISE EXCEPTION 'SALES_CURRICULUM_RECONCILIATION_PROGRESS_COLLISION';
      END IF;
    END
    $reconciliation$
  `));
}

/** Restores learner progress from native PostgreSQL values and proves exact equality both ways. */
async function restoreAndVerifyProgress(
  transaction: SalesTransaction,
): Promise<void> {
  await transaction.execute(sql.raw(`
    INSERT INTO sales_progress
      (id, user_id, lesson_id, status, completed_at, score, created_at, updated_at)
    SELECT id, user_id, lesson_id, status, completed_at, score, created_at, updated_at
    FROM sales_curriculum_progress_snapshot
  `));
  await transaction.execute(sql.raw(`
    DO $reconciliation$
    BEGIN
      IF EXISTS (
        (SELECT id, user_id, lesson_id, status, completed_at, score, created_at, updated_at
         FROM sales_progress
         EXCEPT ALL
         SELECT id, user_id, lesson_id, status, completed_at, score, created_at, updated_at
         FROM sales_curriculum_progress_snapshot)
        UNION ALL
        (SELECT id, user_id, lesson_id, status, completed_at, score, created_at, updated_at
         FROM sales_curriculum_progress_snapshot
         EXCEPT ALL
         SELECT id, user_id, lesson_id, status, completed_at, score, created_at, updated_at
         FROM sales_progress)
      ) THEN
        RAISE EXCEPTION 'SALES_CURRICULUM_RECONCILIATION_PROGRESS_RESTORE_MISMATCH';
      END IF;
    END
    $reconciliation$
  `));
}

/**
 * Inserts, verifies, or reconciles the exact approved curriculum atomically.
 * @param database Migration-credential database connection.
 * @param options Owner-controlled approval evidence required only for reconciliation.
 * @returns Whether rows were inserted, reconciled, or already complete.
 * @throws When graph identity, approval, activity safety, mapping, or restoration fails.
 */
export async function seedStaticSalesCurriculum(
  database: DB = db,
  options: SeedStaticSalesCurriculumOptions = {},
): Promise<"inserted" | "reconciled" | "already-complete"> {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql.raw(`
      LOCK TABLE
        sales_modules,
        sales_lessons,
        sales_rubrics,
        sales_roleplay_scenarios,
        sales_quiz_questions,
        sales_progress,
        sales_roleplay_attempts,
        sales_conversations,
        sales_chat_messages
      IN ACCESS EXCLUSIVE MODE
    `));
    const current = await readCurriculumRows(transaction);
    const currentCount = Object.values(current)
      .reduce((sum, values) => sum + values.length, 0);
    if (currentCount === 0) {
      await insertExpectedCurriculum(transaction);
      const inserted = await readCurriculumRows(transaction);
      assertCompleteCurriculum(inserted);
      assertApprovedSalesCurriculumGraph(inserted);
      return "inserted";
    }

    const currentGraphSha256 = curriculumRowsDigest(current);
    if (currentGraphSha256 === SALES_CURRICULUM_APPROVED_GRAPH_SHA256) {
      assertCompleteCurriculum(current);
      assertApprovedSalesCurriculumGraph(current);
      return "already-complete";
    }
    if (currentGraphSha256 !== SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256) {
      assertCompleteCurriculum(current);
      throw new Error("SALES_CURRICULUM_RECONCILIATION_UNREACHABLE");
    }

    const reconciliationState = await readReconciliationState(transaction);
    const plan = buildSalesCurriculumReconciliationPlan({
      currentGraphSha256,
      currentModules: current.modules,
      currentLessons: current.lessons,
      progressLessonIds: reconciliationState.progressLessonIds,
      activityCounts: reconciliationState.activityCounts,
      approvalSha256: options.approvalSha256,
    });

    await snapshotAndRemapProgress(transaction, plan.lessonRemaps);
    await transaction.delete(salesProgress);
    await transaction.delete(salesQuizQuestions);
    await transaction.delete(salesRoleplayScenarios);
    await transaction.delete(salesRubrics);
    await transaction.delete(salesLessons);
    await transaction.delete(salesModules);
    await insertExpectedCurriculum(transaction);
    await restoreAndVerifyProgress(transaction);

    const reconciled = await readCurriculumRows(transaction);
    assertCompleteCurriculum(reconciled);
    assertApprovedSalesCurriculumGraph(reconciled);
    return "reconciled";
  }, { isolationLevel: "serializable" });
}

/**
 * Rejects execution of the library-only seed module outside the reviewed gate.
 * @throws Always, because production seeding must use seed-reviewed-curriculum.
 */
export function rejectDirectStaticSeedInvocation(): never {
  throw new Error("SALES_CURRICULUM_DIRECT_SEED_FORBIDDEN_USE_REVIEWED_ENTRYPOINT");
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    rejectDirectStaticSeedInvocation();
  } catch (error: unknown) {
    process.stderr.write(
      `Sales curriculum seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
