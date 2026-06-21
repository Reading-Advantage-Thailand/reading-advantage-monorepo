export function normalizeTopic(topic: string): string {
  return topic
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+(?=[\u0E00-\u0E7F])/g, "")
    .trim();
}

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
