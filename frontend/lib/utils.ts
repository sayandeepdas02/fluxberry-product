import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be told about our named font sizes. Without this it can't
 * tell `text-card-title` (a size) from `text-ink` (a colour) — both look like
 * `text-*` — so it treats them as conflicting and silently drops the first one.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'page-title',
            'section-title',
            'card-title',
            'subtle-title',
            'body-lg',
            'body',
            'body-sm',
            'caption',
            'mk-hero',
            'mk-h1',
            'mk-h2',
            'mk-h3',
            'mk-h4',
            'mk-h5',
            'mk-title',
            'mk-lead',
            'mk-body',
            'mk-label',
            'mk-nav',
            'mk-meta',
            'mk-micro',
          ],
        },
      ],
    },
  },
});

/** Merge Tailwind class names (shadcn convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a salary range like ₹18L–₹30L or $80k–$120k. */
export function formatSalary(
  salary?: { min?: number | null; max?: number | null; currency?: string } | null,
): string | null {
  if (!salary || (salary.min == null && salary.max == null)) return null;
  const cur = salary.currency ?? 'INR';
  const fmt = (n: number) => {
    if (cur === 'INR') {
      if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 ? 1 : 0)}Cr`;
      if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 ? 1 : 0)}L`;
      return `₹${n.toLocaleString('en-IN')}`;
    }
    const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : `${cur} `;
    if (n >= 1000) return `${sym}${Math.round(n / 1000)}k`;
    return `${sym}${n}`;
  };
  if (salary.min != null && salary.max != null) return `${fmt(salary.min)}–${fmt(salary.max)}`;
  return fmt((salary.min ?? salary.max)!);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
