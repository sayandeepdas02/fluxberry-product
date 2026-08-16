/**
 * Robust JSON extraction from an LLM response. Handles code fences and stray
 * prose around the JSON object. Throws if nothing parseable is found.
 */
export function extractJson<T = unknown>(text: string): T {
  const trimmed = text.trim();
  // Try direct parse first.
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    /* fall through */
  }
  // Strip ```json ... ``` fences.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      /* fall through */
    }
  }
  // Grab the first {...} or [...] block.
  const objMatch = trimmed.match(/[{[][\s\S]*[}\]]/);
  if (objMatch) {
    return JSON.parse(objMatch[0]) as T;
  }
  throw new Error('No JSON found in AI response');
}

export function clampScore(n: unknown, min = 0, max = 10): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(min, Math.min(max, v));
}

export function asStringArray(v: unknown, limit = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.trim()).slice(0, limit) as string[];
}
