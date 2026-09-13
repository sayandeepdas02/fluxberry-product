import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** First-run education for a feature the user hasn't tried yet, e.g. a demo/help link (spec item 4.5). */
  helpLink?: { label: string; href: string };
  className?: string;
  /** Set to 'h1' when this is the only content on the page (e.g. a "not found" state with no other heading). */
  as?: 'h1' | 'h2' | 'h3';
}

/**
 * Strong empty state (spec §2.4): what this is, why it's empty, what to do next.
 * Never show a blank page.
 */
export function EmptyState({ icon, title, description, action, helpLink, className, as: Tag = 'h3' }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm [&_svg]:size-5">
          {icon}
        </div>
      )}
      <Tag className="text-card-title text-foreground">{title}</Tag>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
      {helpLink && (
        <a
          href={helpLink.href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          {helpLink.label} <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
