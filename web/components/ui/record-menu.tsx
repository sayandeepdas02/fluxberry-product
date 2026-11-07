'use client';

import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { cn } from '@/lib/utils';

export interface RecordMenuAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  hidden?: boolean;
  /** Renders a separator above this action. */
  separated?: boolean;
}

/**
 * The standard per-record "..." action menu (spec item 4.7) — one component,
 * one vocabulary, reused wherever a row/record needs Edit/Move/Delete-style
 * actions instead of ad-hoc buttons.
 */
export function RecordMenu({
  actions,
  align = 'end',
  className,
}: {
  actions: RecordMenuAction[];
  align?: 'start' | 'end';
  className?: string;
}) {
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(e) => e.stopPropagation()}>
        {visible.map((a, i) => (
          <React.Fragment key={i}>
            {a.separated && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={a.disabled}
              onSelect={a.onSelect}
              className={a.variant === 'destructive' ? 'text-destructive focus:text-destructive' : undefined}
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
