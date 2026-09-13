import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = React.HTMLAttributes<HTMLHeadingElement>;

// Semantic tag and visual size are fixed together per export — a call site can't
// pair the wrong tag with the wrong size, which is the bug CardTitle's hardcoded
// <h3> used to invite everywhere it stood in for a page's actual h1/h2.
export function H1({ className, ...props }: Props) {
  return <h1 className={cn('text-page-title', className)} {...props} />;
}

export function H2({ className, ...props }: Props) {
  return <h2 className={cn('text-section-title', className)} {...props} />;
}

export function H3({ className, ...props }: Props) {
  return <h3 className={cn('text-card-title', className)} {...props} />;
}

export function H4({ className, ...props }: Props) {
  return <h4 className={cn('text-subtle-title', className)} {...props} />;
}
