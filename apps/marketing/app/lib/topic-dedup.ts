/**
 * Produces the canonical persisted comparison key for a Marketing topic.
 * @param topic The user- or AI-supplied topic.
 * @returns An NFC, lowercase, whitespace-normalized comparison key.
 */
export function normalizeTopic(topic: string): string {
  return topic
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\s+(?=[\u0E00-\u0E7F])/gu, "");
}

/**
 * Removes topics already represented by existing or earlier proposed values.
 * @param proposed Candidate topics in preferred display order.
 * @param existing Previously persisted topics.
 * @returns Display topics whose normalized keys are distinct.
 */
export function deduplicateTopics(
  proposed: string[],
  existing: string[],
): string[] {
  const existingNormalized = new Set(existing.map(normalizeTopic));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const topic of proposed) {
    const normalized = normalizeTopic(topic);
    if (existingNormalized.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(topic);
  }
  return result;
}
