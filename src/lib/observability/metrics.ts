interface MetricEvent {
  name: string;
  value?: number;
  tags?: Record<string, string | number | boolean | null | undefined>;
  context?: Record<string, unknown>;
}

function serializeTags(tags?: MetricEvent['tags']): Record<string, string> | undefined {
  if (!tags) return undefined;
  return Object.fromEntries(
    Object.entries(tags)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export function emitMetric(event: MetricEvent): void {
  try {
    const payload = {
      _type: 'metric',
      timestamp: new Date().toISOString(),
      name: event.name,
      ...(event.value !== undefined ? { value: event.value } : {}),
      ...(event.tags ? { tags: serializeTags(event.tags) } : {}),
      ...(event.context ? { context: event.context } : {}),
    };

    console.info('[metric]', JSON.stringify(payload));
  } catch (error) {
    console.warn('[metric] Failed to emit metric', error);
  }
}

export type { MetricEvent };
