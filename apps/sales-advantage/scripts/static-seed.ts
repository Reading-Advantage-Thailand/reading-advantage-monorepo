/**
 * Deterministic Sales curriculum release candidate focused on teaching sales
 * effectiveness as a universal skill, with Reading Advantage as the applied
 * context and Codecamp-like learn → practice → evaluate → reflect progression.
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

const universalDiscoveryRubric: RubricCriterion[] = [
  {
    criterion: "Asked at least 2 open-ended discovery questions (Situation/Problem)",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "general-sales://spin-selling-rackham-1988#question-sequence",
  },
  {
    criterion: "Demonstrated active listening (mirrored, labeled, or used silence)",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "general-sales://never-split-the-difference-voss-2016#tactical-empathy",
  },
  {
    criterion: "Did NOT pitch product before establishing buyer pain",
    weight: 0.25,
    passingScore: 80,
    sourceRef: "general-sales://spin-selling-rackham-1988#discovery-before-solution",
  },
  {
    criterion: "Ended with a clear next-step ask",
    weight: 0.2,
    passingScore: 70,
    sourceRef: "general-sales://sandler-selling-system#up-front-contract",
  },
];

const objectionRubric: RubricCriterion[] = [
  {
    criterion: "Acknowledged the objection without immediate counter-attack",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "general-sales://feel-felt-found#acknowledge-before-response",
  },
  {
    criterion: "Asked a clarifying question to isolate the REAL objection",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "general-sales://sandler-selling-system#reverse-and-isolate",
  },
  {
    criterion: "Reframed using the buyer's own words (not generic sales-speak)",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "general-sales://challenger-sale-dixon-adamson-2011#tailor",
  },
  {
    criterion: "Closed with a trial-close question, not a monologue",
    weight: 0.2,
    passingScore: 70,
    sourceRef: "general-sales://spin-selling-rackham-1988#need-payoff",
  },
];

const closingRubric: RubricCriterion[] = [
  {
    criterion: "Framed price in terms of buyer's outcome, not absolute cost",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "09-sales-enablement/roi-calculator.md#methodology",
  },
  {
    criterion: "Did NOT discount when pushed; offered scope reduction instead",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "09-sales-enablement/distributor-rep-onboarding/faq.md#q11-what-if-a-school-asks-for-a-discount-or-a-special-price",
  },
  {
    criterion: "Asked for the commitment with a clear yes/no question",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
  },
  {
    criterion: "Confirmed implementation next steps before ending the call",
    weight: 0.15,
    passingScore: 70,
    sourceRef: "general-sales://sandler-selling-system#post-sell",
  },
];

export const staticSalesCurriculumModules = [
  {
    slug: "foundations-discovery",
    title: "Sales Foundations: Discovery & Listening",
    description:
      "Master the universal skill of buyer-centric discovery. Learn SPIN questioning, active listening, and the silence technique that great salespeople use to uncover real pain.",
    phase: "Foundations",
    order: 1,
    lessons: [
      {
        title: "Why Discovery Beats Pitching",
        type: "theory" as const,
        content: `# Why Discovery Beats Pitching

**TL;DR:** The salespeople who win consistently aren't the smoothest talkers — they're the best listeners. Discovery is the foundation of every sales methodology that's stood the test of time: SPIN, Sandler, Challenger, MEDDIC. Skip it and you're guessing.

## The 80/20 Rule of Conversations

Top performers talk **20% of the time**. They spend the other 80% asking questions and listening — *really* listening, not just waiting for their turn to talk.

When you pitch before you understand, you're solving a problem you only *think* the buyer has. When you discover first, the buyer tells you exactly which features matter — and exactly why.

## The SPIN Framework (Rackham, 1988)

Neil Rackham analyzed 35,000+ sales calls and found four question types that predict success:

1. **Situation questions** — "How many ESL teachers do you have right now?"
   *Gather facts about the buyer's current state. Use sparingly — buyers find these tedious.*

2. **Problem questions** — "Where are you finding it hardest to keep teachers consistent?"
   *Surface dissatisfaction. The buyer must hear themselves describe a pain.*

3. **Implication questions** — "What does inconsistent teaching cost you in parent retention each year?"
   *Make the pain expensive. Without implications, the buyer won't budget for a solution.*

4. **Need-payoff questions** — "If your teachers could deliver the same lesson the same way every time, what would that do for your enrollment numbers?"
   *Have the buyer describe the value of solving the problem. Now they're selling themselves.*

## The Sequence Matters

You can't jump to Need-payoff in question one. The sequence builds psychological investment. Skip Implication and the buyer will say "interesting, send me a brochure" and you'll never hear from them again.

## Practical Exercise

Pick a real opportunity in your pipeline. Write out 2 questions for each of the 4 SPIN categories — 8 questions total. Lead with Situation, build pressure through Problem and Implication, then close with Need-payoff. Practice them out loud before your next call.

## What Great Looks Like

| Rep type | What they do |
|---|---|
| Beginner | Pitches features. Asks "what are you looking for?" |
| Intermediate | Asks Situation + Problem questions. Pitches solution. |
| Top performer | Goes full SPIN. Buyer pitches the solution back. |

The goal: by the end of discovery, **the buyer is selling the solution to you**.`,
        order: 1,
      },
      {
        title: "Active Listening, Mirroring, and Labeling",
        type: "theory" as const,
        content: `# Active Listening, Mirroring, and Labeling

**TL;DR:** Chris Voss negotiated for the FBI by *not* speaking. Three techniques — mirroring, labeling, and the calibrated question — get buyers to talk three times longer and reveal what they actually want.

## Mirroring: The 3-Word Trick

When the buyer says something important, **repeat the last 1-3 words as a question**.

> Buyer: "Honestly, the budget is just really tight this year."
> You: *(slight pause)* "Really tight?"
> Buyer: "Yeah, the head office cut the discretionary fund by 30% in Q2, so we're trying to..."

The buyer keeps talking. They reveal what was behind the original statement. You never had to ask "why?" — which would have felt like an interrogation.

## Labeling: Name the Emotion

Sales is emotional. Buyers buy on emotion and justify with logic. Naming the emotion in the room defuses it.

Templates:
- "It sounds like…"
- "It seems like…"
- "It looks like…"

> Buyer: "Look, I've tried four different platforms in the last two years and none of them stuck."
> You: "It sounds like you've been burned before and you're worried this is another expensive mistake."
> Buyer: "*Exactly*. And the teachers complained every time."

You just earned more trust than 30 minutes of feature-pitching would have.

## The Calibrated Question

A calibrated question is open-ended and forces the buyer to think. The two power phrases:

- **"How am I supposed to do that?"** — when pushed to discount or accept impossible terms.
- **"What's the biggest challenge you're facing with X right now?"** — when you want to find the real pain.

Calibrated questions never start with "are you" or "do you" (closed). They start with "how" or "what".

## The Silence Rule

After you ask a hard question, **shut up**. Count to 5 in your head. The buyer will fill the silence — and what they fill it with is usually the truth.

## Practice

This week, on every sales call, mirror at least 3 times. Label the emotion at least once. Count out 5 seconds of silence after your hardest question. Track what happens.`,
        order: 2,
      },
      {
        title: "Open Questions, Closed Questions, and When to Use Each",
        type: "theory" as const,
        content: `# Open Questions, Closed Questions, and When to Use Each

**TL;DR:** Open questions expand. Closed questions confirm. Use 80% open in discovery, 80% closed in the close.

## Open vs. Closed

**Open** (How, What, Where, Why, Who, Tell me about…):
- "What's your biggest challenge with teacher turnover?"
- "How are parents responding to the current program?"

→ Get information. Get the buyer talking. Build understanding.

**Closed** (Are, Do, Have, Will, Can — yes/no answers):
- "Do you have budget approved for this quarter?"
- "Can we schedule the on-site demo for next Tuesday?"

→ Get commitment. Confirm. Move to next step.

## The Beginner's Mistake

New reps ask closed questions in discovery. They want a yes — they want to feel like they're "moving forward." But "Yes, we're interested" is meaningless. It tells you nothing about the buyer's actual pain.

## The Expert's Move

In discovery, every question should be open. Every. Single. One. If you catch yourself asking "do you…", reword to "what…" or "how…".

| Closed (weak) | Open (strong) |
|---|---|
| "Do you have problems with teacher consistency?" | "How does teacher turnover affect your program?" |
| "Are your parents happy with results?" | "What kind of feedback have you gotten from parents this year?" |
| "Is budget a concern?" | "How does the budget for English programming usually get decided?" |

## In the Close — Flip It

When you're closing, you want yes/no commitments. Open questions invite reconsideration. Closed questions force decision.

| Open (weak close) | Closed (strong close) |
|---|---|
| "What do you think?" | "Can we move forward with the App-Only tier for 100 students?" |
| "How do you feel about the price?" | "Does the App-Only tier at the price we discussed work for you?" |

## One Exception: The Trial Close

A "trial close" is a closed question used mid-conversation to test temperature without commitment.

- "If we could solve the teacher-consistency problem, would that be worth exploring further?"
- "Hypothetically, if the price matched your budget, would the App-Only tier be the right fit?"

Trial closes give you signal without pressure.`,
        order: 3,
      },
      {
        title: "Universal Discovery Quiz",
        type: "quiz" as const,
        content: "",
        order: 5,
        quizQuestions: [
          {
            question:
              "A buyer says, 'We've tried three platforms and none of them stuck.' What's the best next move?",
            options: [
              "Pitch how your platform is different from the competition.",
              "Mirror: 'None of them stuck?' and pause.",
              "Ask 'What were the three platforms?' so you can position against them.",
              "Offer a discount to remove price-shopping objections.",
            ],
            correctAnswer:
              "Mirror: 'None of them stuck?' and pause.",
            explanation:
              "Mirroring with the last 1-3 words invites the buyer to elaborate. You'll learn what 'didn't stick' really means — usually it's adoption, not features. Pitching too early kills the conversation.",
          },
          {
            question:
              "In SPIN, which question type makes the buyer's pain expensive enough to require a budget?",
            options: [
              "Situation question",
              "Problem question",
              "Implication question",
              "Need-payoff question",
            ],
            correctAnswer: "Implication question",
            explanation:
              "Implication questions surface the second- and third-order costs of the problem. Without them, the buyer agrees there's a problem but won't fund a solution.",
          },
          {
            question:
              "You ask a hard discovery question. The buyer pauses. What do you do?",
            options: [
              "Rephrase the question — they probably didn't understand.",
              "Move on to a different question to avoid awkwardness.",
              "Wait silently for at least 5 seconds.",
              "Fill the silence by giving examples of how other customers answered.",
            ],
            correctAnswer: "Wait silently for at least 5 seconds.",
            explanation:
              "Silence is one of the most powerful sales tools. Buyers think while they pause. Filling the silence steals their thinking time and you lose the real answer.",
          },
        ],
      },
      {
        title: "Discovery Roleplay: First Call with a Skeptical Director",
        type: "roleplay" as const,
        content: `**Method:** Open with an up-front contract, then use SPIN in sequence: establish only the situation facts you need, surface the operational problem, explore its impact, and let the director state the value of solving it.

**Listening standard:** Mirror or label the director's concern before the next question. Do not pitch Reading Advantage until the buyer's pain and desired outcome are explicit.

**Success standard:** Earn a specific next meeting whose agenda is tied to the concern the director named.`,
        order: 4,
        scenarios: [
          {
            personaName: "Director Pim",
            personaRole: "Director, mid-size Bangkok primary school (400 students)",
            situation:
              "You've been booked for a 15-minute discovery call. Director Pim has tried two ed-tech platforms before and abandoned both. Her teachers complained, parents didn't see results, and she ended up wasting budget.",
            objective:
              "Run a 3-minute SPIN discovery sequence. Surface the REAL pain (likely teacher buy-in, not curriculum quality). Do NOT pitch any Reading Advantage product. End by asking permission to schedule a longer demo focused specifically on her concern.",
            prospectContext:
              "Pim is busy, polite, but skeptical. She'll give short answers unless you earn them. Has been director for 7 years.",
            rubric: universalDiscoveryRubric,
          },
        ],
      },
    ],
  },
  {
    slug: "framing-value",
    title: "Framing Value in the Buyer's Language",
    description:
      "Stop selling features. Learn to translate every capability into outcomes the buyer's boss measures. Apply Challenger Teach-Tailor-Take Control and the psychology of anchoring.",
    phase: "Foundations",
    order: 2,
    lessons: [
      {
        title: "Features → Benefits → Outcomes",
        type: "theory" as const,
        content: `# Features → Benefits → Outcomes

**TL;DR:** Translate capabilities into observable buyer value without inventing an outcome.

## The Three-Layer Translation

| Layer | Reading Advantage example | Who uses it? |
|---|---|---|
| **Feature** | Leveled extensive-reading content | Product evaluator |
| **Benefit** | Students can read material selected for their level | Teacher |
| **Observable value** | The school receives per-school reporting of benchmark deltas, reading volume, and Big 4 fidelity | Director and families |

The final layer must remain measurable and honest. It is not permission to promise a score gain.

## Evidence-safe translation

> ❌ "Every student will gain a grade level."
>
> ✅ "We measure and report outcomes per school (benchmark deltas + reading volume + fidelity scores), because results vary by implementation quality and reading volume."

Use the approved statement exactly. If a buyer asks for a result the evidence does not support, explain what will be measured instead of improvising a number.

## Practice

For each feature, write the feature, the operational benefit, and the evidence the school can inspect. Label assumptions and never turn a planned capability into a current promise.`,
        order: 1,
      },
      {
        title: "Anchoring, Loss-Aversion, and Buyer Psychology",
        type: "theory" as const,
        content: `# Anchoring, Loss-Aversion, and Buyer Psychology

**TL;DR:** Anchor price to the buyer's verified current costs and keep every assumption visible.

## Evidence-based anchoring

Start with the school's own student count and current English-program costs. The canonical price bands are approximately **1,000 THB/student/year for App-Only** and **1,500 THB/student/year for Blended Learning**.

> "How many students are in scope, and what do you currently spend on teachers, materials, recruitment, and lesson planning?"

Then calculate annual cost as student count × the applicable per-student price. Do not invent a flat package price or imply that an estimate is a quote.

## Loss aversion without invented outcomes

Discuss operational costs the buyer confirms: delayed procurement, teacher turnover, duplicated materials, or lack of reporting. Never convert delay into an unsupported reading-gain number.

## Reduce status-quo friction

1. Quantify only buyer-supplied or canonical inputs.
2. Offer a smaller grade-level or semester scope instead of an ad-hoc discount.
3. Tie timing to the buyer's real training and procurement calendar.

The goal is a transparent decision model, not artificial urgency.`,
        order: 2,
      },
      {
        title: "The Challenger Sale: Teach, Tailor, Take Control",
        type: "theory" as const,
        content: `# The Challenger Sale: Teach, Tailor, Take Control

**TL;DR:** Top reps don't ask "what keeps you up at night?" They tell the buyer something the buyer didn't know — and reframe the problem.

## The Five Rep Profiles (Dixon & Adamson, 2011)

CEB studied 6,000 reps across 90 companies. They found five archetypes:

1. **Hard Worker** — high effort
2. **Lone Wolf** — independent
3. **Reactive Problem Solver** — answers fast
4. **Relationship Builder** — loved by clients
5. **Challenger** — teaches, tailors, takes control

In simple sales, Relationship Builders win. In **complex, high-stakes B2B** (which is what selling a school director a multi-year platform is), **Challengers win 4.5x more deals**.

## The Three Cs

### 1. Teach
You bring a **new perspective** the buyer hadn't considered.

> ❌ "What are your top priorities this year?"
>
> ✅ "Most schools we work with assume teacher turnover is a recruiting problem. It's almost always a teaching-consistency problem. Here's the data..."

You're now the expert. The buyer is listening, not pitching back.

### 2. Tailor
You **adapt the teach** to the buyer's specific situation — using language and metrics they use internally.

If they call parents "Mrs. and Mr." not "Khun", match it. If their KPIs say "retention rate" not "churn", match it. Tailoring is what makes Teaching land.

### 3. Take Control
You guide the conversation. You're polite but firm.

> Buyer: "Send me the brochure and I'll get back to you."
>
> ❌ Relationship Builder: "Sure! When works best?"
>
> ✅ Challenger: "I could — but the brochure won't tell you whether this works for your school specifically. What if we did a 20-minute call where I show you the three schools most like yours and what their first six months looked like? That'll give you something to actually decide on."

You didn't refuse. You redirected to a better next step.

## The Reframe

The signature Challenger move is the **reframe**: telling the buyer the problem they think they have is actually a symptom of a different, bigger problem you can solve.

Example for RA:
> Buyer: "We need to improve our students' English scores."
>
> Reframe: "Sure — but most schools that improve scores still lose enrollment to schools that look more *consistent* to parents. The actual competitive moat is delivering the same quality to every student, every class, every term. That's where your scores AND your retention come from."

The buyer just learned something. You just stopped competing on price.`,
        order: 3,
      },
      {
        title: "Value-Framing Roleplay: Parents Don't See Results",
        type: "roleplay" as const,
        content: `**Method:** Translate features into the buyer's observable outcome. Anchor the conversation on family retention and visible evidence of progress, then ask a need-payoff question in the director's own language.

**Claims guardrail:** Do not promise a percentage improvement or guaranteed outcome. Describe transparent reporting and use only approved research phrasing when evidence is requested.

**Success standard:** Secure agreement on a scoped pilot and the evidence the director will use to judge it.`,
        order: 4,
        scenarios: [
          {
            personaName: "Director Wisanu",
            personaRole: "Owner-operator, bilingual K-6 school in Chiang Mai",
            situation:
              "On a follow-up call, Wisanu says: 'Parents complain that they pay for English but don't see their kids actually improving. They can't tell what we're doing differently from the school down the road.'",
            objective:
              "Reframe the problem: this isn't about more English content — it's about visible, parent-facing evidence of progress. Use anchoring + loss-aversion. Do NOT discount. Move toward a scoped-pilot ask, not a full-contract pitch.",
            prospectContext:
              "Wisanu is the decision-maker AND the budget owner. Measures success in family renewals but has not supplied a verified churn figure.",
            rubric: [
              {
                criterion: "Reframed 'parents don't see results' as a visibility/reporting problem, not a curriculum problem",
                weight: 0.3,
                passingScore: 70,
                sourceRef: "general-sales://challenger-sale-dixon-adamson-2011#reframe",
              },
              {
                criterion: "Translated at least one feature into a parent-visible outcome (e.g., monthly progress report)",
                weight: 0.25,
                passingScore: 70,
                sourceRef: "general-sales://challenger-sale-dixon-adamson-2011#commercial-teaching",
              },
              {
                criterion: "Used loss-aversion framing on retained families (cost of inaction)",
                weight: 0.2,
                passingScore: 70,
                sourceRef: "general-sales://prospect-theory-kahneman-tversky-1979#loss-aversion",
              },
              {
                criterion: "Ended with a small-step ask (pilot, demo, data review) — not a contract pitch",
                weight: 0.25,
                passingScore: 70,
                sourceRef: "general-sales://prospect-theory-kahneman-tversky-1979#status-quo-bias",
              },
            ],
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
              "A director asks what result Reading Advantage will guarantee. What is the best response?",
            options: [
              "Promise one grade level if the school follows the implementation plan.",
              "Use the approved research phrasing and explain the transparent per-school measures the school will inspect.",
              "Quote an adoption percentage from another school.",
              "Avoid the question and return to product features.",
            ],
            correctAnswer:
              "Use the approved research phrasing and explain the transparent per-school measures the school will inspect.",
            explanation:
              "The claims policy allows approved research language and transparent per-school reporting; it does not allow product outcome guarantees.",
          },
        ],
      },
    ],
  },
  {
    slug: "objections",
    title: "Handling Resistance & Objections (Universal)",
    description:
      "Objections aren't rejections — they're requests for more information. Master the Sandler reverse, feel-felt-found, and the art of isolating the real objection before you respond.",
    phase: "Foundations",
    order: 3,
    lessons: [
      {
        title: "The Stated Objection is Almost Never the Real One",
        type: "theory" as const,
        content: `# The Stated Objection is Almost Never the Real One

**TL;DR:** When a buyer says "it's too expensive," they almost never mean it. Your job is to find the real objection — usually risk, fit, or authority.

## The Top 4 Real Objections

What buyers SAY:
- "It's too expensive."
- "We need to think about it."
- "Send me a proposal."

What they actually MEAN:
1. **Risk** — "I don't believe you'll deliver what you say."
2. **Fit** — "I don't think this is the right solution for my specific problem."
3. **Authority** — "I'm not the one who can actually decide."
4. **Urgency** — "I don't see why I should act now vs. six months from now."

If you respond to the stated objection (price), you'll lose. Drop the price and the real objection (risk) is still there.

## The Sandler Reverse

The Sandler reverse is the single most powerful objection-handling technique. When you hear an objection, **don't answer it** — ask a question instead.

> Buyer: "It's just too expensive for us right now."
>
> ❌ Weak: "I could do 10% off if you sign this month."
>
> ✅ Sandler reverse: "Help me understand — when you say 'too expensive', is it the absolute number, or is it that you don't yet see the value at that number? Because those are two different conversations."

You just learned which of the four real objections you're dealing with.

## Feel-Felt-Found (Used Sparingly)

When you've identified the real objection, the feel-felt-found pattern shows you've handled it before:

> "I understand how you **feel**. Director Pim at PSP school **felt** the same way — she'd been burned twice before. What she **found** was that the 30-day pilot let her see the actual data before committing. She started with one classroom; by the end of the semester she expanded to all of Grade 4."

Don't overuse this. Once per conversation max.

## The Isolation Question

Before you handle an objection, **isolate it**. Make sure it's the only one.

> "If we could solve the budget concern, is there anything else that would stop us from moving forward today?"

If the answer is "yes, there's also the teacher buy-in piece" — you just saved yourself from discounting only to discover the deal was never going to close.

## The Three-Question Sequence

Use this every time you hear an objection:

1. **Acknowledge** (label the emotion): "It sounds like budget is a real concern."
2. **Reverse** (ask a question): "Help me understand — is it the total cost, or the per-student cost, or the timing?"
3. **Isolate** (confirm it's the only issue): "If we solved the timing piece, is there anything else?"

You haven't pitched anything. You've turned an objection into a diagnostic conversation.`,
        order: 1,
      },
      {
        title: "Negotiating Without Discounting",
        type: "theory" as const,
        content: `# Negotiating Without Discounting

**TL;DR:** Use the approved per-student price and adjust scope when the buyer's budget is smaller than the proposed total.

## Canonical price discipline

The current reference bands are approximately 1,000 THB/student/year for App-Only and 1,500 THB/student/year for Blended Learning. Treat these as reference bands subject to an approved quote, not permission to invent a flat package price.

## Adjust scope, not the per-student rate

> Buyer: "The total is above our approved budget. Can you lower the rate?"
>
> Rep: "The flexibility lever is scope. We can begin with one grade level or a semester pilot at the approved per-student rate, then review the evidence before expanding."

Keep the student count, rate, and term visible. Escalate any request for a special price or contract term to an authorized approver.

## Observable success

A good response confirms the real budget constraint, proposes a smaller auditable scope, and records a concrete next decision step. It does not improvise discounts, urgency, or savings.`,
        order: 2,
      },
      {
        title: "Universal Objection Quiz",
        type: "quiz" as const,
        content: "",
        order: 4,
        quizQuestions: [
          {
            question:
              "A buyer says 'It's too expensive.' What's the best first move?",
            options: [
              "Offer a 10% discount to close quickly.",
              "Ask: 'When you say too expensive, is it the absolute number or the value at that number?'",
              "Send the ROI calculator immediately.",
              "Agree to think about scope reduction.",
            ],
            correctAnswer:
              "Ask: 'When you say too expensive, is it the absolute number or the value at that number?'",
            explanation:
              "The Sandler reverse — ask a question instead of answering. Price objections are almost never about price. Until you know whether it's risk, fit, authority, or actual budget, any response is a guess.",
          },
          {
            question:
              "Which is the WORST way to handle a buyer pushing for a discount?",
            options: [
              "Reduce scope (e.g., fewer students) to fit their budget.",
              "Trade payment terms for the same total price.",
              "Drop the per-unit price by 10% to close the deal.",
              "Use a calibrated question to make them justify the request.",
            ],
            correctAnswer:
              "Drop the per-unit price by 10% to close the deal.",
            explanation:
              "Discounting trains the buyer that your price is fake, anchors your next deal lower, and erodes margin team-wide. Pros adjust scope, not rate.",
          },
          {
            question:
              "What does it mean to 'isolate' an objection?",
            options: [
              "Repeat the objection back to the buyer to make sure you heard it correctly.",
              "Ask if there are any other concerns besides this one before solving it.",
              "Get the buyer to admit the objection in writing.",
              "Tell the buyer you'll come back to this after pitching more features.",
            ],
            correctAnswer:
              "Ask if there are any other concerns besides this one before solving it.",
            explanation:
              "Isolation prevents you from solving objection #1 only to find objection #2 — and then objection #3. Ask 'if we solved X, is there anything else?' before negotiating.",
          },
        ],
      },
      {
        title: "Objection Roleplay: 'We Tried Something Similar and It Failed'",
        type: "roleplay" as const,
        content: `**Method:** Acknowledge the prior loss, clarify what failed, and isolate the real objection before responding. Use a Sandler reverse instead of defending the product.

**Adoption guardrail:** Do not imply software alone fixes teacher adoption. Match the recommendation to the school's training and implementation capacity.

**Success standard:** Confirm the isolated risk and agree on one adoption-focused next step.`,
        order: 3,
        scenarios: [
          {
            personaName: "Director Pranom",
            personaRole: "Director, established (40-year) Bangkok primary school",
            situation:
              "Pranom says: 'We tried an English learning app two years ago. The teachers refused to use it after a month, parents got nothing out of it, and we wasted 80,000 baht. Why is yours going to be different?'",
            objective:
              "Do NOT defend Reading Advantage as a product. Use the Sandler reverse to surface the REAL underlying objection (almost certainly 'I'm worried teachers won't adopt this either'). Isolate it. Then propose a path that addresses adoption risk directly — not a feature pitch.",
            prospectContext:
              "Pranom has been in education 35+ years. She is the decision-maker. Her staff resists change. She trusts evidence over enthusiasm.",
            rubric: objectionRubric,
          },
        ],
      },
    ],
  },
  {
    slug: "ra-product-applied",
    title: "Reading Advantage: Product Knowledge (Applied)",
    description:
      "Now apply what you learned in Modules 1-3 to Reading Advantage's specific product suite. Learn what's true, what to claim, and what NEVER to promise.",
    phase: "Conversations",
    order: 4,
    lessons: [
      {
        title: "The 9-Product Suite and 3 Service Tiers",
        type: "theory" as const,
        content: `# The 9-Product Suite and 3 Service Tiers

**TL;DR:** The Advantage Suite has nine named products with different launch states. Never describe a planned product or service as live.

## The canonical suite

1. **Reading Advantage** — live
2. **Primary Advantage** — live
3. **Storytime Advantage** — coming early 2027
4. **Math Advantage** — coming late 2026
5. **Science Advantage** — slipped while Tutor is prioritized
6. **STEM Advantage** — coming mid 2027
7. **Zhongwen Advantage** — coming late 2026
8. **Tutor Advantage** — beta 2026
9. **CodeCamp Advantage** — coming 2026

Mastery Advantage is a planned shared adaptive engine; it is not one of the nine products and is not currently integrated into production products.

## Current service tiers

| Tier | Current positioning | Canonical price |
|---|---|---|
| **App-Only** | Digital platform access | ~1,000 THB/student/year |
| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |
| **Managed Service / The Teaching Advantage** | Future tier with certified facilitators | Planned for May 2027 at the earliest; do not pre-sell availability, staffing, or price |

For a school with current staffing challenges, recommend Blended Learning now and explain Managed Service only as a future option.

## Claims rule

Never promise a score gain, guarantee an outcome, or improvise evidence. In a sales conversation, the approved research form is: "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)." Pair it with transparent per-school reporting and the statement that results vary by implementation quality and reading volume.`,
        order: 1,
      },
      {
        title: "Honest Claims, Approved Citations",
        type: "theory" as const,
        content: `# Honest Claims, Approved Citations

**TL;DR:** Every learning-outcome claim must use an approved research form or named, verifiable per-school reporting.

## Approved sales-conversation language

Use this exact short form:

> "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)."

For product application, say:

> "Our platform leverages the same extensive-reading methodology shown to be effective in controlled research."

For Reading Advantage results, say:

> "We measure and report outcomes per school (benchmark deltas + reading volume + fidelity scores), because results vary by implementation quality and reading volume."

## Not approved

- specific improvement percentages or grade-level gains not tied to an approved source
- guarantees or "every student" promises
- teacher-adoption percentages without named, verifiable school data
- NPS or satisfaction figures without named, verifiable school data
- market-leadership claims

When asked for a stronger promise, state what the school will be able to inspect and offer the canonical research material. Never turn anecdote, aspiration, or a planned case study into evidence.`,
        order: 2,
      },
      {
        title: "Product Knowledge Quiz",
        type: "quiz" as const,
        content: "",
        order: 4,
        quizQuestions: [
          {
            question:
              "A school needs implementation support now and asks for Managed Service. What is the accurate response?",
            options: [
              "Sell Managed Service now at a custom flat price.",
              "Recommend Blended Learning now and describe Managed Service as planned for May 2027 at the earliest.",
              "Promise on-site staffing as soon as the contract is signed.",
              "Sell all nine products as a live bundle.",
            ],
            correctAnswer:
              "Recommend Blended Learning now and describe Managed Service as planned for May 2027 at the earliest.",
            explanation:
              "The canonical source treats Managed Service as a future option. Reps must not pre-sell its availability, staffing, or price.",
          },
          {
            question:
              "Which claim is approved for a sales conversation?",
            options: [
              "Every student improves by at least one grade level.",
              "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
              "Teacher adoption exceeds 85% at every trained school.",
              "Managed-service schools average an NPS of +42.",
            ],
            correctAnswer:
              "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
            explanation:
              "The outcome-claims policy requires this exact short form in sales conversations and prohibits improvised outcome statistics.",
          },
        ],
      },
      {
        title: "Roleplay: Choosing the Right Tier",
        type: "roleplay" as const,
        content: `**Method:** Diagnose staffing consistency, implementation capacity, and the outcome the school is buying before discussing product breadth. Recommend the smallest tier that can credibly solve the diagnosed problem.

**Fit guardrail:** Do not maximize initial deal size at the expense of adoption. Explain current App-Only and Blended Learning in operational terms; identify Managed Service as a future May 2027 option.

**Success standard:** The buyer can explain why the chosen tier fits the school's constraints and agrees to the next implementation-planning step.`,
        order: 3,
        scenarios: [
          {
            personaName: "Owner-Director Nakorn",
            personaRole: "Owner of a small 5-classroom English program",
            situation:
              "Nakorn asks for the full suite as if every product were live. He has a defined budget but does not understand product launch states or tier differences. His teachers are part-time and rotate frequently.",
            objective:
              "Use discovery (SPIN) to surface that his real problem is teacher inconsistency, not product breadth. Steer him toward a correctly scoped current offering, likely Blended Learning, and describe Managed Service only as a future May 2027 option. Demonstrate that you'll sacrifice deal size to fit the right solution.",
            prospectContext:
              "Nakorn is the sole decision-maker. Has budget authority and may accept an over-broad proposal unless the rep carefully explains current availability and implementation fit.",
            rubric: universalDiscoveryRubric,
          },
        ],
      },
    ],
  },
  {
    slug: "ra-objections-demo",
    title: "Applied: RA Objections & Demo Conversations",
    description:
      "Apply the universal objection framework to the 5 canonical Reading Advantage objections. Practice the 15-, 45-, and 90-minute demo flows.",
    phase: "Conversations",
    order: 5,
    lessons: [
      {
        title: "The 6 Canonical Objections (And the Real Concern Behind Each)",
        type: "theory" as const,
        content: `# The 6 Canonical Objections

**TL;DR:** Prepare for these six recurring objections from the canonical onboarding guide. The stated objection may not be the underlying concern.

## Objection 1: "Our teachers won't be able to use this"

**Stated**: capability concern
**Real**: adoption-risk concern (rep has been burned by ed-tech before)

**Response pattern**: Surface their past experience (Sandler reverse). Explain the defined Blended Learning training and fidelity commitments. Do not cite adoption rates without named, verifiable school data.

---

## Objection 2: "We've tried something similar and it failed"

**Stated**: skepticism of category
**Real**: distrust of vendor accountability

**Response pattern**: Ask exactly what failed. Was it adoption (Blended Learning addresses implementation support now), curriculum quality (let them compare), or parent communication (show the reporting commitment)? Don't defend — diagnose.

---

## Objection 3: "It's cheaper to just use textbooks"

**Stated**: cost
**Real**: doesn't see the value beyond what textbooks already do

**Response pattern**: Anchor to total cost (textbook + teacher salary + parent dissatisfaction + churn). Use the "Total Cost of English" framing. Don't argue price — reframe to outcome.

---

## Objection 4: "Where's your research? Show me the studies."

**Stated**: needs evidence
**Real**: usually authentic — this is a smart buyer

**Response pattern**: Give them the approved citations (Aka 2019). Be honest about variance. Offer to connect them with a peer director who can speak to actual results. Sophisticated buyers respect honesty about limits.

---

## Objection 5: "We already have a foreign teacher — that's enough"

**Stated**: solution sufficiency
**Real**: doesn't see consistency / scale problem

**Response pattern**: Use the Challenger reframe. "One excellent teacher gives 30 students one excellent year. Then they leave, and the next teacher is different. The platform gives every student the same quality every year — regardless of which teacher is in front of them." That's not anti-teacher; it's pro-consistency.

## Objection 6: "We are waiting to see if the government changes the English curriculum"

**Stated**: policy uncertainty
**Real**: timing or decision-risk concern

**Response pattern**: Ask what decision or date the school is waiting for. Offer to prepare an accurately scoped proposal or pilot contingent on that real milestone. Do not invent urgency or claim policy certainty.

## The Underlying Pattern

These objections respond to a consistent diagnostic pattern:

1. **Acknowledge** (label the concern)
2. **Reverse** (ask a question to find the real issue)
3. **Reframe** (use the underlying buyer concern, not the surface objection)
4. **Propose a small step** (pilot, demo, data review)

Memorize the pattern, not the script.`,
        order: 1,
      },
      {
        title: "The 15-, 45-, and 90-Minute Demo Flows",
        type: "theory" as const,
        content: `# The 15-, 45-, and 90-Minute Demo Flows

**TL;DR:** Every demo length has a different goal. Use the right one or you'll burn both the buyer's time and yours.

## 15-Minute Discovery Call (First Meeting)

**Goal**: Surface pain, confirm fit, book a longer demo.

Structure:
- 2 min: Set the agenda. "I'll spend 5 minutes understanding your school, 5 showing you something most schools haven't seen, and 5 deciding if it's worth a longer conversation."
- 5 min: SPIN discovery (mostly Situation + Problem)
- 5 min: One Challenger Teach moment. Show ONE thing that reframes their problem.
- 3 min: Trial close. "Based on what we discussed, does a 45-minute deep-dive next week make sense?"

**Anti-pattern**: Trying to demo features in 15 minutes. You'll lose.

## 45-Minute Virtual Demo (Second Meeting)

**Goal**: Show the product in the context of THEIR pain. Move to on-site or pilot ask.

Structure:
- 5 min: Recap what you learned last time. Confirm priorities.
- 10 min: Walk through the Big 4 — curriculum, consistency, parent visibility, adoption — in their language.
- 15 min: Live product walkthrough. Show only what addresses their specific pain.
- 5 min: Q&A.
- 10 min: Next step. Propose either on-site demo, scoped pilot, or proposal.

**Anti-pattern**: Comprehensive feature tour. You'll lose them at minute 25.

## 90-Minute On-Site Demo (Third Meeting)

**Goal**: Get buy-in from the broader team. Move to close.

Structure:
- 10 min: Stakeholder intros. WHO else is in the room?
- 15 min: Director-focused: business case, ROI, parent visibility
- 30 min: Teacher-focused: classroom workflow demo. Hands-on.
- 15 min: Operations: implementation timeline, training plan, support
- 10 min: Pricing / tier recommendation (specific to their situation)
- 10 min: Next-step ask. Specific. Time-bound.

**Anti-pattern**: Treating the on-site like a longer 45-min demo. The 90-min is multi-stakeholder. Different content for each.

## The Single Rule

**Always cut the demo short if you don't have buy-in by the halfway mark.** A 45-minute demo that's losing at minute 22 is a 22-minute demo. Stop, reset, ask: "I sense I might be missing what matters most to you. What questions do you have that I haven't addressed?"

That recovery move saves more deals than any feature in our product.`,
        order: 2,
      },
      {
        title: "Applied Objection Roleplay: Teachers Won't Adopt",
        type: "roleplay" as const,
        content: `**Method:** Label the adoption concern, ask what teachers rejected before, and isolate whether the issue is time, confidence, language, or implementation support. Only then map the concern to current Blended Learning support and, if relevant, explain Managed Service as planned for May 2027 at the earliest.

**Claims guardrail:** Never promise universal teacher adoption. State the training and service commitments precisely and distinguish them from outcomes outside our control.

**Success standard:** Agree on an adoption-risk test, responsible owner, and follow-up date.`,
        order: 3,
        scenarios: [
          {
            personaName: "Director Suchada",
            personaRole: "Director, 600-student Phuket primary school",
            situation:
              "Suchada is in the 45-min demo. She's nodding politely, but at minute 30 she says: 'Look, the platform looks great. But my teachers… they're 50+, they don't speak English, and they hate technology. They will never use this.'",
            objective:
              "Recognize this as Canonical Objection #1 (adoption risk). Don't defend the platform. Reverse to find the real concern. Recommend Blended Learning with its defined training and fidelity support now; mention Managed Service only as a future May 2027 option.",
            prospectContext:
              "Suchada has 18 teachers averaging 52 years old. She's heard the teachers say 'no more new platforms' multiple times. She has budget authority but needs a currently available, accurately scoped implementation plan.",
            rubric: objectionRubric,
          },
        ],
      },
      {
        title: "Applied Roleplay: '15-Minute Discovery Call'",
        type: "roleplay" as const,
        content: `**Method:** Contract for the short agenda, ask a compact SPIN sequence, teach one relevant insight, and reserve product demonstration for a later meeting earned through discovery.

**Time guardrail:** Do not compress a full demo into fifteen minutes. Protect enough time to summarize the director's concern and confirm it accurately.

**Success standard:** Book a longer meeting with the decision participants, problem, and agenda explicitly named.`,
        order: 4,
        scenarios: [
          {
            personaName: "Director Apinya",
            personaRole: "Director, well-known Bangkok prep school",
            situation:
              "You have 15 minutes — a referral from an existing client. Apinya is busy, prestigious, and doesn't have time for vendor pitches.",
            objective:
              "Run the 15-minute discovery flow: agenda → SPIN discovery → one Challenger teach → trial close to a longer demo. Do NOT demo product features.",
            prospectContext:
              "Apinya runs a 1,200-student prep school. Already has a foreign-teacher contract. Her school's English scores are good but parents complain about consistency between classes.",
            rubric: universalDiscoveryRubric,
          },
        ],
      },
      {
        title: "Applied Objections Quiz",
        type: "quiz" as const,
        content: "",
        order: 5,
        quizQuestions: [
          {
            question:
              "A director says, 'We already have a foreign teacher. We don't need a platform.' What's the best response framework?",
            options: [
              "Pitch how the platform is cheaper than a foreign teacher.",
              "Reframe: one teacher gives 30 students one excellent year; a platform gives every student consistent quality regardless of who teaches.",
              "Offer to add the platform on top of the foreign teacher at a discount.",
              "Move on — this director is not a fit.",
            ],
            correctAnswer:
              "Reframe: one teacher gives 30 students one excellent year; a platform gives every student consistent quality regardless of who teaches.",
            explanation:
              "This is Canonical Objection #5. The director sees 'foreign teacher' and 'platform' as competing solutions. They're not — one is delivery, one is consistency. The Challenger reframe shifts the conversation.",
          },
          {
            question:
              "What's the goal of a 15-minute discovery call?",
            options: [
              "Show the product's top features.",
              "Surface buyer pain, deliver one Teach moment, trial close to a longer demo.",
              "Close the deal.",
              "Hand off to a senior rep.",
            ],
            correctAnswer:
              "Surface buyer pain, deliver one Teach moment, trial close to a longer demo.",
            explanation:
              "15 minutes isn't enough to demo. It IS enough to qualify and earn time. Demo'ing features in a 15-minute call is the #1 mistake new reps make.",
          },
        ],
      },
    ],
  },
  {
    slug: "pricing-closing",
    title: "Pricing, Negotiation & Closing",
    description:
      "Apply universal closing technique to Reading Advantage's pricing structure. Hold price under pressure, ask for the order, hand off cleanly to implementation.",
    phase: "Close",
    order: 6,
    lessons: [
      {
        title: "The Total-Cost-of-English Frame",
        type: "theory" as const,
        content: `# The Total-Cost-of-English Frame

**TL;DR:** Compare the per-student offer with the buyer's verified total English-program costs, using transparent formulas.

## Start with canonical inputs

- App-Only: approximately **1,000 THB/student/year**.
- Blended Learning: approximately **1,500 THB/student/year**.
- Managed Service: planned for **May 2027 at the earliest**; do not pre-sell a price or staffing commitment.

Annual cost = students in scope × price per student. For example, 500 students at the Blended Learning reference price is 750,000 THB/year. Label that as a worked estimate, not a quote.

## Ask for the buyer's current costs

Invite the director to supply teacher salaries, recruitment, textbooks, grading time, and lesson-planning assumptions. Keep each input visible. Do not invent churn, savings, or outcome values.

## Compare like with like

The canonical calculator compares Blended Learning with alternatives such as a foreign teacher, textbook plus teacher, and private tutoring. It also names non-monetary factors such as continuity, QA, and teacher workload without pretending those factors are guaranteed savings.

## Handle budget pressure

If the approved per-student price does not fit, reduce the pilot scope or sequence the rollout. Do not create an ad-hoc flat price or unapproved discount.`,
        order: 1,
      },
      {
        title: "Asking for the Order: The Direct Close",
        type: "theory" as const,
        content: `# Asking for the Order: The Direct Close

**TL;DR:** 80% of reps lose the deal at the moment they need to ask. The rep who asks closes — the rep who hopes doesn't.

## Why Reps Don't Ask

Asking creates the possibility of "no." Most reps would rather stay in "maybe" indefinitely than risk the no.

But here's the thing: **the deal you don't ask for is already a no**. You just don't know it yet.

## The Direct Close

After the demo, after the objections, after the pricing — there comes a moment. Both of you know it. You either ask or you don't.

The direct close is one sentence:

> "Based on the agreed student count, the Blended Learning reference price is approximately 1,500 THB per student per year, subject to an approved quote. Does that scope and start window work for you?"

That's it. Specific tier. Specific price. Specific start date. Yes-or-no question. Then **shut up**.

## The Three Outcomes

After the direct close, only three things can happen:

1. **Yes.** Great. Move to implementation handoff.
2. **No.** Now you know. Ask "what would it take?" — you might find a path.
3. **Maybe / "Let me think about it."** This is your real signal. Use it.

## Handling the "Let Me Think About It"

This is almost always a hidden objection. The buyer is uncomfortable saying no.

> "Of course. Before you do, help me understand what specifically you need to think through. Is it about the price, about teacher adoption, about timing, or something else?"

You're not pushing. You're isolating. Once you know what they actually need to resolve, you can address it.

If they truly need to think, give them a deadline:

> "Take the weekend. Can I call you Tuesday at 2pm to talk it through?"

Specific. Time-bound. They either agree (commitment) or push back (revealing the real objection).

## The Scoped-Pilot Close

When the direct close fails on first ask, downgrade to a scoped pilot:

> "I understand the full commitment is a big step. Here's an alternative: a 30-day scoped pilot with one classroom. If by the end, the data and teacher feedback aren't worth showing parents, we walk away — no expansion, no contract. If it works, we expand. Does that feel like a fair next step?"

This is NOT discounting. It's reducing the buyer's risk. Most "no's" turn into "yes" at the scoped-pilot level.

## After the Yes

Don't keep selling. Close your laptop. Confirm next steps and get out:

> "Excellent. Here's what happens next: I'll send the contract this afternoon. Once you sign, our implementation lead will reach out within 48 hours to schedule kickoff. Your start date is April 15. Sound good?"

Move them off the sales call and into the implementation calendar. The deal isn't done until the contract is signed AND the implementation is scheduled.`,
        order: 2,
      },
      {
        title: "Closing Roleplay: The Final Pricing Conversation",
        type: "roleplay" as const,
        content: `**Method:** Restate the agreed outcome and scope before responding to price pressure. Hold the unit economics; adjust scope, sequence, or timing instead of granting an unsupported discount.

**Negotiation guardrail:** Do not invent urgency, savings, or guaranteed ROI. Any business-case estimate must expose its assumptions and remain the buyer's estimate.

**Success standard:** Reach a clear yes, no, or dated decision step with implementation ownership identified.`,
        order: 3,
        scenarios: [
          {
            personaName: "Director Wirat",
            personaRole: "Director, 800-student integrated K-9 school",
            situation:
              "You're on the closing call. The director is interested in Blended Learning at the approved per-student reference price. He says: 'My board approved less than that total — can you lower the per-student price?'",
            objective:
              "Hold price (do NOT discount the per-unit rate). Adjust scope — propose starting with fewer grade levels at the same rate, or offer a 6-month phased approach. Use 'how am I supposed to do that?' if the buyer pushes hard. Close with a specific next step.",
            prospectContext:
              "Wirat is genuinely budget-constrained but the deal is real. He has authority. He needs a yes/no this week.",
            rubric: closingRubric,
          },
          {
            personaName: "Director Apinya",
            personaRole: "Director, well-known Bangkok prep school",
            situation:
              "After two months of conversations, Apinya is ready to commit. She says: 'I think we're going to do this. Let me think about it over the weekend.'",
            objective:
              "Recognize this as a hidden objection (or stalling). Isolate the concern. Set a specific follow-up deadline. Ideally, get her to commit on the call. If she truly needs to think, lock in a specific call time.",
            prospectContext:
              "Apinya is the sole decision-maker. She's been thorough. She has the budget. The only barrier left is commitment friction.",
            rubric: closingRubric,
          },
        ],
      },
      {
        title: "Closing & Negotiation Quiz",
        type: "quiz" as const,
        content: "",
        order: 4,
        quizQuestions: [
          {
            question:
              "A director with a real budget cap pushes for a 30% discount. What's the pro move?",
            options: [
              "Drop the price 15% to meet in the middle.",
              "Hold price, reduce scope (fewer students or grade levels) to fit budget.",
              "Walk away — they're not serious.",
              "Refer them to a competitor.",
            ],
            correctAnswer:
              "Hold price, reduce scope (fewer students or grade levels) to fit budget.",
            explanation:
              "Discounting trains the market. Adjusting scope holds your per-unit value and gives the buyer a path. They get a starting point; you protect your future deals.",
          },
          {
            question:
              "After your direct close, the buyer says 'Let me think about it.' What does this usually mean?",
            options: [
              "They're going to think about it and will reach out next week.",
              "There's a hidden objection they haven't named yet.",
              "They've decided no but don't want to say it.",
              "Both B and C.",
            ],
            correctAnswer: "Both B and C.",
            explanation:
              "'Let me think about it' is almost always a softened no or a hidden objection. The right move is to isolate — 'what specifically do you need to think through?' — and either resolve the concern or set a specific follow-up time.",
          },
          {
            question:
              "What does the Total-Cost-of-English frame anchor the buyer to?",
            options: [
              "The textbook budget line item.",
              "The buyer's verified total English-program costs and the transparent per-student formula.",
              "The cheapest competitor's price.",
              "A free pilot.",
            ],
            correctAnswer:
              "The buyer's verified total English-program costs and the transparent per-student formula.",
            explanation:
              "The canonical ROI method uses buyer-supplied costs and student count × approved per-student price. It does not authorize invented flat package prices.",
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
