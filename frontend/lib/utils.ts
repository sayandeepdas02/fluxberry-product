import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
