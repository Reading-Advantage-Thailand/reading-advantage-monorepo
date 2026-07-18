/**
 * Static seed for local dev — hand-authored curriculum focused on teaching
 * sales effectiveness as a universal skill, with Reading Advantage as the
 * applied context.
 *
 * This is the "minimum viable curriculum" used when the AI seed isn't run.
 * Every row lands as reviewStatus='approved' so the dev environment has
 * something to show immediately.
 *
 * Run: pnpm --filter sales-advantage tsx scripts/static-seed.ts
 */

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { client, db, type DB } from "@reading-advantage/db/client";
import {
  salesModules,
  salesLessons,
  salesRoleplayScenarios,
  salesRubrics,
  salesQuizQuestions,
} from "@reading-advantage/db/schema";

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
    sourceRef: "SPIN Selling — Rackham, 1988",
  },
  {
    criterion: "Demonstrated active listening (mirrored, labeled, or used silence)",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "Never Split the Difference — Voss, 2016",
  },
  {
    criterion: "Did NOT pitch product before establishing buyer pain",
    weight: 0.25,
    passingScore: 80,
    sourceRef: "SPIN Selling — discovery before solution",
  },
  {
    criterion: "Ended with a clear next-step ask",
    weight: 0.2,
    passingScore: 70,
    sourceRef: "Sandler — Up-front contract for next meeting",
  },
];

const objectionRubric: RubricCriterion[] = [
  {
    criterion: "Acknowledged the objection without immediate counter-attack",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "Feel-felt-found pattern",
  },
  {
    criterion: "Asked a clarifying question to isolate the REAL objection",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "Sandler reverse — the stated objection is rarely the real one",
  },
  {
    criterion: "Reframed using the buyer's own words (not generic sales-speak)",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "Challenger Sale — Tailor",
  },
  {
    criterion: "Closed with a trial-close question, not a monologue",
    weight: 0.2,
    passingScore: 70,
    sourceRef: "SPIN Need-payoff questions",
  },
];

const closingRubric: RubricCriterion[] = [
  {
    criterion: "Framed price in terms of buyer's outcome, not absolute cost",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "Value framing — anchoring buyer to outcome not price",
  },
  {
    criterion: "Did NOT discount when pushed; offered scope reduction instead",
    weight: 0.3,
    passingScore: 70,
    sourceRef: "Negotiation — protect margin, adjust scope",
  },
  {
    criterion: "Asked for the commitment with a clear yes/no question",
    weight: 0.25,
    passingScore: 70,
    sourceRef: "Direct close — ask for the order",
  },
  {
    criterion: "Confirmed implementation next steps before ending the call",
    weight: 0.15,
    passingScore: 70,
    sourceRef: "Sandler Post-Sell",
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
        order: 4,
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
        content: "",
        order: 5,
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

**TL;DR:** Buyers don't buy features. They buy what those features do for the metric their boss cares about.

## The Three-Layer Translation

Every product has features. Few reps can translate them.

| Layer | Example (RA App-Only) | Who cares? |
|---|---|---|
| **Feature** | "Adaptive Lexile-based reading engine" | Engineering only |
| **Benefit** | "Each student gets text at their exact level" | Teachers |
| **Outcome** | "Average reading level rises 1.2 years in 9 months" | Director, Parents |

**Buyers buy outcomes.** Teachers like benefits. Engineers like features. Match your language to your audience.

## The Director's Scorecard

A school director is measured on:
1. **Enrollment growth** (parent satisfaction → referrals)
2. **Teacher retention** (low turnover = less recruiting cost)
3. **Visible outcomes** (test scores, certifications, parent-facing reports)
4. **Operational simplicity** (less admin overhead)

Every feature you mention should ladder up to one of these four. If it doesn't, drop it.

## The Outcome Pyramid Exercise

For each Reading Advantage feature, write out three layers:

\`\`\`
Feature: [adaptive Lexile reading engine]
  ↓
Benefit: [students always read at their level]
  ↓
Outcome: [measurable reading-level gain → director can show parents progress reports]
\`\`\`

If you can't get to the third layer, you don't understand the feature well enough to sell it.

## In Practice

> ❌ "We have an adaptive Lexile reading engine that uses NLP."
>
> ❌ "Our adaptive engine means each student reads at their level."
>
> ✅ "When you walk into the next parent meeting, you'll have data showing each student's reading-level gain — by name, by month. That's what makes parents recommend you."

The third version skipped the feature entirely. The director still bought.`,
        order: 1,
      },
      {
        title: "Anchoring, Loss-Aversion, and Buyer Psychology",
        type: "theory" as const,
        content: `# Anchoring, Loss-Aversion, and Buyer Psychology

**TL;DR:** Buyers are not rational. Understanding three biases — anchoring, loss-aversion, and status-quo bias — lets you frame price and decision in ways that align with how brains actually work.

## Anchoring

The first number the buyer hears becomes the reference point for everything that follows.

> ❌ "Our App-Only is 50,000 baht per year."
>
> ✅ "Most schools your size invest 200,000-400,000 baht annually on English programming, between teacher salaries, materials, and parent communications. Our App-Only handles all three for 50,000."

You haven't lied. You've reframed the anchor. Now 50,000 feels like a steal, not a stretch.

## Loss-Aversion

People feel losses **2x more strongly than equivalent gains** (Kahneman & Tversky, 1979).

> ❌ "You'll gain 1.2 grade levels of reading improvement."
>
> ✅ "Right now, every month you wait costs roughly 0.13 grade levels of student progress that you can never recover. By the time these students graduate, that's nearly a full year of reading ability lost."

Same data. Loss framing creates urgency.

## Status-Quo Bias

The biggest competitor isn't another vendor. It's **doing nothing**.

Most "no decisions" aren't rejections — they're indefinite postponements. To beat status-quo bias:

1. **Quantify the cost of inaction.** Use Implication questions from SPIN.
2. **Make the next step trivially small.** Not "buy our 3-year contract" — "do a 30-day scoped pilot with 1 classroom."
3. **Use a deadline anchored in the buyer's calendar.** "If we start by April 15, you'll have data to share at the parent meeting in June." Not "this offer expires Friday."

## Putting It Together

Combined frame for a closing conversation:

> "Schools like yours typically spend 200K+ on English programs **(anchor)**.
>
> If you wait another semester to act, each student loses about 6 weeks of reading-level progress **(loss-aversion)**.
>
> Let's start with one classroom for 30 days. If by June you don't have data worth sharing with parents, we walk away **(reduce status-quo friction)**."

Three lines. Three biases addressed. One small-step ask.`,
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
        content: "",
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
              "Wisanu is the decision-maker AND the budget owner. Loses 5-8 families per year over the 'no visible progress' complaint. He measures success in renewals.",
            rubric: [
              {
                criterion: "Reframed 'parents don't see results' as a visibility/reporting problem, not a curriculum problem",
                weight: 0.3,
                passingScore: 70,
                sourceRef: "Challenger Sale — Reframe",
              },
              {
                criterion: "Translated at least one feature into a parent-visible outcome (e.g., monthly progress report)",
                weight: 0.25,
                passingScore: 70,
                sourceRef: "Features → Benefits → Outcomes",
              },
              {
                criterion: "Used loss-aversion framing on retained families (cost of inaction)",
                weight: 0.2,
                passingScore: 70,
                sourceRef: "Kahneman & Tversky 1979",
              },
              {
                criterion: "Ended with a small-step ask (pilot, demo, data review) — not a contract pitch",
                weight: 0.25,
                passingScore: 70,
                sourceRef: "Status-quo bias reduction",
              },
            ],
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

**TL;DR:** Every time you discount, you train the buyer that your price is fake. The pros adjust scope, terms, or timing — never the per-unit price.

## Why Discounting Destroys Your Pipeline

When you give a 10% discount, three things happen:

1. **This deal**: You lost 10% of revenue.
2. **Next deal**: This buyer tells one peer "they discount." Your next deal starts with a 10% expectation.
3. **All deals**: Your reps learn discounting is acceptable. The whole sales team's margin erodes.

The math is unforgiving. A 10% discount on a 30% margin business cuts profit by 33%.

## The Pro Move: Adjust Scope, Not Price

The buyer's budget is real. The full deal might not fit. **Reduce the deal**, not the rate.

> Buyer: "We just don't have 50,000 baht for this. Can you come down?"
>
> ❌ Amateur: "Let me see what I can do… how about 45,000?"
>
> ✅ Pro: "I can't move the per-student rate without changing what we're delivering. But — if we start with 50 students instead of 100, you're at 25,000 for the first year. That gives you the data to make the case for expanding next year. Would that work for the budget?"

You held price. You found a path. The buyer got something workable.

## Three Trade Levers

When pushed, trade — don't give.

| Lever | What you trade | What you ask for in return |
|---|---|---|
| **Scope** | Fewer students / classrooms | Same rate per unit |
| **Timing** | 6-month pilot then renew | Locked-in 2-year rate after |
| **Payment terms** | Annual upfront → quarterly | 3% premium on quarterly |

Every trade should be **symmetric**: if you give something, you ask for something.

## The "How am I supposed to do that?" Question

When the buyer pushes hard for a discount, deflect with a calibrated question (from Voss):

> Buyer: "Look, I need this for 30,000 or we can't move forward."
>
> You: "How am I supposed to do that? Honestly — walk me through it. What would I tell my colleague back at the office about the unique factors that justified the lower price?"

You haven't said no. You've made the buyer justify their request. 7 times out of 10, they back down or find more budget. The other 3 times, you learn something true about the deal you didn't know.

## The Walk-Away Number

Decide BEFORE the call: what's the minimum I'll accept? If the buyer goes below that, you must be willing to walk. If you can't walk, you have no leverage.

A deal that loses money is worse than no deal. It anchors your future pipeline at unsustainable prices.`,
        order: 2,
      },
      {
        title: "Universal Objection Quiz",
        type: "quiz" as const,
        content: "",
        order: 3,
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
        content: "",
        order: 4,
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

**TL;DR:** Reading Advantage isn't one product — it's nine, packaged into three tiers. Match the tier to the school's situation, not the price they hope for.

## The Suite at a Glance

1. **Reading Advantage** (core adaptive reading platform)
2. **Primary Advantage** (K-3 phonics + early reading)
3. **Science Advantage** (English-medium science curriculum)
4. **Mastery Advantage** (math with English-medium delivery)
5. **CodeCamp Advantage** (coding in English for grades 4+)
6. **Speaking Advantage** (speech evaluation, pronunciation)
7. **Listening Advantage** (audio comprehension)
8. **Writing Advantage** (guided writing with AI feedback)
9. **Test Advantage** (placement, progress, exit assessments)

## The 3 Service Tiers

| Tier | What's included | Best for |
|---|---|---|
| **App-Only** | All 9 products. Teacher uses on their own. | Schools with strong, English-confident teachers who just need a curriculum to follow. |
| **Blended** | App + monthly teacher training + quarterly observation. | Schools where teachers WANT the platform but need coaching to use it well. |
| **Managed Service** | App + on-site Reading Advantage staff delivering instruction 2-5 days/week. | Schools that can't keep qualified English teachers and need outsourcing. |

## How to Choose the Tier

The discovery question that picks the tier:

> "Tell me about your current English teachers. How long has the team been together? What's their English level?"

- Teachers stable, fluent → App-Only
- Teachers stable, not fluent → Blended (training fills the gap)
- High turnover, hard to recruit → Managed Service (outsource the problem)

**Critical**: Don't sell App-Only to a school that needs Managed Service. They'll fail and churn, and you'll lose the renewal.

## The Big 4 Protocol

Every demo and discovery touches the "Big 4":

1. **Curriculum quality** — what we teach
2. **Teacher consistency** — same lesson, same way, every classroom
3. **Parent visibility** — monthly reports parents can read
4. **Adoption risk** — what we do to make sure it actually gets used

Skip any of these and the deal will surface that objection later. Address all four proactively.

## What NEVER to Claim (Outcome Claims Policy)

- Never promise specific score gains ("scores will go up X points")
- Never claim "every student" will improve
- Never compare without an approved short-form citation
- Never use the word "guaranteed"

Use approved citations from the outcome-claims policy: "In peer-reviewed evaluation (Aka et al., 2019), schools using Reading Advantage saw an average reading-level gain of 1.2 years over 9 months. Results vary by implementation quality."

The full sentence — including the variance disclaimer — is non-negotiable.`,
        order: 1,
      },
      {
        title: "Honest Claims, Approved Citations",
        type: "theory" as const,
        content: `# Honest Claims, Approved Citations

**TL;DR:** The fastest way to lose a sophisticated buyer is to over-claim. The fastest way to win them is to under-claim with rigorous evidence.

## Why Honesty Wins in B2B Education

School directors talk to each other. If you promise outcomes that don't materialize, your next 10 deals in that district are dead before they start. Education is a small world.

## The Three Tiers of Claims

1. **Hard claim** (cite-able, defensible) — peer-reviewed study, internal data with N>50
2. **Soft claim** (anecdotal but specific) — "Pim's school at PSP saw…"
3. **Aspirational** (forward-looking) — "Your students could…"

Use hard claims when challenged. Use soft claims to make hard claims feel real. Use aspirational claims for vision-setting, never as a substitute for evidence.

## The Approved Short-Form Citations

The only outcome claims you may make verbally:

✅ "In a peer-reviewed evaluation (Aka et al., 2019), schools using Reading Advantage saw an average reading-level gain of 1.2 years over 9 months. Results vary by implementation quality."

✅ "Schools that follow our recommended teacher-training protocol report 85%+ teacher adoption at 6 months. Schools that skip training see lower numbers."

✅ "Across our managed-service schools, average parent satisfaction (NPS) is +42. The school-by-school range is +15 to +68."

## The Banned Phrases

❌ "Guaranteed results"
❌ "Every student will improve"
❌ "Better than [competitor]" (without citation)
❌ "100% of our schools"
❌ "Your scores will go up X%"

## Handling Pressure to Over-Claim

Directors will sometimes push you to make stronger claims. Hold the line:

> Director: "Look, just tell me — will my students' English scores go up?"
>
> ❌ Weak: "Yes, definitely!"
>
> ✅ Strong: "I can't promise that — and you shouldn't trust any vendor who does. What I CAN show you is the data from schools most like yours: their range, their average, their worst cases. That's the honest answer. Want to see it?"

This response builds MORE trust, not less. Sophisticated buyers know nothing is guaranteed. They want a vendor who's truthful about variance.`,
        order: 2,
      },
      {
        title: "Product Knowledge Quiz",
        type: "quiz" as const,
        content: "",
        order: 3,
        quizQuestions: [
          {
            question:
              "A school has 6 turnover-prone non-native English teachers. Which tier fits?",
            options: [
              "App-Only — let teachers use the platform on their own.",
              "Blended — give them monthly training.",
              "Managed Service — Reading Advantage staff delivers instruction.",
              "App-Only with a steep discount.",
            ],
            correctAnswer:
              "Managed Service — Reading Advantage staff delivers instruction.",
            explanation:
              "High turnover is the textbook signal for Managed Service. Selling App-Only here will fail at implementation. The renewal will be lost and the rep loses the LTV.",
          },
          {
            question:
              "Which claim is approved per Reading Advantage's outcome-claims policy?",
            options: [
              "Every student improves by at least one grade level.",
              "In peer-reviewed evaluation (Aka et al., 2019), schools saw an average reading-level gain of 1.2 years over 9 months. Results vary.",
              "Better English scores guaranteed.",
              "100% of our schools see results.",
            ],
            correctAnswer:
              "In peer-reviewed evaluation (Aka et al., 2019), schools saw an average reading-level gain of 1.2 years over 9 months. Results vary.",
            explanation:
              "The full sentence — including 'Results vary' — is the only approved short-form citation. Drop the disclaimer and you're over-claiming.",
          },
        ],
      },
      {
        title: "Roleplay: Choosing the Right Tier",
        type: "roleplay" as const,
        content: "",
        order: 4,
        scenarios: [
          {
            personaName: "Owner-Director Nakorn",
            personaRole: "Owner of a small 5-classroom English program",
            situation:
              "Nakorn says: 'I want all 9 products and I have 200,000 baht to spend.' He's enthusiastic but doesn't understand the tier difference. His teachers are part-time and rotate frequently.",
            objective:
              "Use discovery (SPIN) to surface that his real problem is teacher inconsistency, not product breadth. Steer him from App-Only toward Blended or Managed Service even though it's a smaller initial product scope. Demonstrate that you'll sacrifice deal size to fit the right solution.",
            prospectContext:
              "Nakorn is the sole decision-maker. Has cash. Will say yes to anything in his price range — which is the problem. He'll cancel in 6 months if the fit is wrong.",
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
        title: "The 5 Canonical Objections (And the Real Concern Behind Each)",
        type: "theory" as const,
        content: `# The 5 Canonical Objections

**TL;DR:** Every Reading Advantage deal will hit one or more of these five. The stated objection is rarely the real concern.

## Objection 1: "Our teachers won't be able to use this"

**Stated**: capability concern
**Real**: adoption-risk concern (rep has been burned by ed-tech before)

**Response pattern**: Surface their past experience (Sandler reverse). Offer the Blended tier specifically to address training. Show data on adoption rates at schools with comparable teacher profiles.

---

## Objection 2: "We've tried something similar and it failed"

**Stated**: skepticism of category
**Real**: distrust of vendor accountability

**Response pattern**: Ask exactly what failed. Was it adoption (Managed Service fixes this), curriculum quality (let them compare), or parent communication (show our monthly reports)? Don't defend — diagnose.

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

## The Underlying Pattern

Notice that none of these objections respond well to a feature pitch. All five respond well to:

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
        content: "",
        order: 3,
        scenarios: [
          {
            personaName: "Director Suchada",
            personaRole: "Director, 600-student Phuket primary school",
            situation:
              "Suchada is in the 45-min demo. She's nodding politely, but at minute 30 she says: 'Look, the platform looks great. But my teachers… they're 50+, they don't speak English, and they hate technology. They will never use this.'",
            objective:
              "Recognize this as Canonical Objection #1 (adoption risk). Don't defend the platform. Reverse to find the real concern. Steer toward Managed Service tier or Blended with extensive training — and explicitly address the teacher-buy-in concern.",
            prospectContext:
              "Suchada has 18 teachers averaging 52 years old. She's heard the teachers say 'no more new platforms' multiple times. Her budget can afford Managed Service but she's never considered it.",
            rubric: objectionRubric,
          },
        ],
      },
      {
        title: "Applied Roleplay: '15-Minute Discovery Call'",
        type: "roleplay" as const,
        content: "",
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

**TL;DR:** Don't compare your price to textbooks. Compare it to the total cost of running an English program — teacher salaries, materials, recruiting, parent satisfaction, churn — and you'll win every time.

## Why Single-Line Price Comparison Loses

When a director says "this costs more than textbooks", they're comparing apples to oranges. Textbooks are part of the cost. Teacher salaries are 70% of the cost. Don't take the bait.

## The Total Cost Math (per 100 students/year)

| Line item | Annual cost |
|---|---|
| 2 English teachers (salary, benefits) | 720,000 baht |
| Textbooks + materials | 60,000 baht |
| Parent meetings + reports prep | 40,000 baht |
| Teacher recruitment when one leaves | 30,000-80,000 baht |
| Parent churn (1 family / 100K of revenue lost annually) | 100,000+ baht |
| **Total realistic baseline** | **~950,000 baht** |

Now position Reading Advantage:

- App-Only: 50,000 baht. Reduces materials cost, increases parent visibility. Net: ~900K, but with measurable outcomes.
- Blended: 120,000 baht. Same plus monthly teacher training. Net: ~870K with much better retention.
- Managed Service: 400,000 baht. Replaces ONE teacher salary entirely. Net: ~630K with full consistency.

**You haven't made the school spend more. You've redirected spend they were already making.**

## The Anchor Sentence

Memorize this opening for every pricing conversation:

> "Most schools your size spend somewhere between 800K and 1.2M baht annually on the full English program — teachers, materials, parent communications, churn. Where does your school sit on that range?"

You've anchored to a 6-figure number. Now your 50K-400K offer feels like a portion of an existing budget, not a new line item.

## The "We Can't Afford It" Counter

When the director still says they can't afford it, use Implication questions:

> "Got it. Can I ask — if you do nothing for another year, what does the cost of parent churn look like?"

> "How much did you spend on teacher recruiting in the last 12 months?"

You're not arguing. You're making them calculate the cost of inaction themselves.`,
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

> "Based on everything we've discussed, the Blended tier at 120,000 baht starting in April fits your school. Can we move forward?"

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
        content: "",
        order: 3,
        scenarios: [
          {
            personaName: "Director Wirat",
            personaRole: "Director, 800-student integrated K-9 school",
            situation:
              "You're on the closing call. The director is interested in the Blended tier (120,000 baht). He says: 'Look, my board approved 80,000 — that's all I have. Can you do it at 80 or no?'",
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
              "The 6-figure annual cost of running an English program including teachers, materials, and churn.",
              "The cheapest competitor's price.",
              "A free pilot.",
            ],
            correctAnswer:
              "The 6-figure annual cost of running an English program including teachers, materials, and churn.",
            explanation:
              "Anchoring to total program cost (800K-1.2M) makes your 50K-400K offer feel like a portion of existing spend, not a new line item. This is anchoring psychology applied to pricing.",
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

/** Recursively sorts JSON object keys while preserving array order. */
function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
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
    assertCompleteCurriculum(await readCurriculumRows(transaction));
    return SALES_CURRICULUM_EXPECTED_COUNTS;
  });
}

/**
 * Inserts the exact curriculum atomically or verifies an already-complete seed.
 * @param database Migration-credential database connection.
 * @returns Whether this invocation inserted rows or verified an idempotent replay.
 * @throws When any nonempty curriculum state is incomplete or inconsistent.
 */
export async function seedStaticSalesCurriculum(
  database: DB = db,
): Promise<"inserted" | "already-complete"> {
  return database.transaction(async (transaction) => {
    const current = await readCurriculumRows(transaction);
    const currentCount = Object.values(current)
      .reduce((sum, values) => sum + values.length, 0);
    if (currentCount > 0) {
      assertCompleteCurriculum(current);
      return "already-complete";
    }
    await transaction.insert(salesModules).values(expectedRows.modules);
    await transaction.insert(salesLessons).values(expectedRows.lessons);
    await transaction.insert(salesRubrics).values(expectedRows.rubrics);
    await transaction.insert(salesRoleplayScenarios).values(expectedRows.scenarios);
    await transaction.insert(salesQuizQuestions).values(expectedRows.quizQuestions);
    assertCompleteCurriculum(await readCurriculumRows(transaction));
    return "inserted";
  });
}

/** Executes the production curriculum seed command. */
async function main(): Promise<void> {
  if (process.argv.includes("--force")) {
    throw new Error("SALES_CURRICULUM_FORCE_RESEED_FORBIDDEN");
  }
  const result = await seedStaticSalesCurriculum();
  process.stdout.write(
    `Sales curriculum ${result}: ${JSON.stringify(SALES_CURRICULUM_EXPECTED_COUNTS)}\n`,
  );
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main()
    .catch((error: unknown) => {
      process.stderr.write(
        `Sales curriculum seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await client.end({ timeout: 5 });
    });
}
