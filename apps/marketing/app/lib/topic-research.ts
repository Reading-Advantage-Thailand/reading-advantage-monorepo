export function buildTopicResearchPrompt(
  app: string,
  pastTopics: string[],
): string {
  const appDisplayName = app.replace(/-/g, " ");

  const pastSection =
    pastTopics.length > 0
      ? `Past topics — do NOT repeat or near-duplicate any of these:\n${pastTopics
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}`
      : "No past topics yet — propose any 5 distinct ideas.";

  return `You are a Thai marketing expert for K-12 education in Thailand.

App: ${appDisplayName} (${app})
Target audience: Thai school directors, parents, and teachers in K-12 schools.

${pastSection}

Propose exactly 5 distinct marketing video topics for this app. Each topic should be:
- A specific, compelling idea tailored to Thai K-12 stakeholders
- Different from any past topic listed above
- Concise (one sentence)

Return ONLY a JSON array of exactly 5 strings. No commentary, no markdown, no explanation.`;
}
