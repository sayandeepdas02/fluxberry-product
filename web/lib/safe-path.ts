/** Validate a `?next=` style redirect target: must be a same-origin relative path. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://safe-next.invalid');
    return url.origin === 'https://safe-next.invalid' ? value : null;
  } catch {
    return null;
  }
}
