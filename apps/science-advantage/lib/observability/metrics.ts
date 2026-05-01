type MetricTags = Record<string, string | number | boolean | undefined>;

function serializeTags(tags?: MetricTags) {
  if (!tags) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(tags).map(([key, value]) => [key, String(value)])
  );
}

function log(metric: string, value: number, tags?: MetricTags) {
  const timestamp = new Date().toISOString();
  console.info('[metrics]', {
    metric,
    value,
    tags: serializeTags(tags),
    timestamp,
  });
}

export const metrics = {
  increment(metric: string, value = 1, tags?: MetricTags) {
    log(metric, value, tags);
  },
  observe(metric: string, value: number, tags?: MetricTags) {
    log(metric, value, tags);
  },
};

export type { MetricTags };
