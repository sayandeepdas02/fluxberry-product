/** Turn arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      // strip combining diacritical marks (U+0300–U+036F)
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled'
  );
}

/**
 * Ensure a slug is unique within a scope by appending -2, -3, ... using a
 * caller-provided existence check.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
