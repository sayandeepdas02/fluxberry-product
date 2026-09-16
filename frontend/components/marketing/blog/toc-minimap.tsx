'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/blog-types';
import { cn } from '@/lib/utils';

/**
 * The article's table of contents as a stack of tick marks: width encodes depth,
 * the active section darkens, and the label only appears on hover. Wide screens
 * only — there is no room for it beside the column otherwise.
 */
export function TocMinimap({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    // Track the heading nearest the top of the viewport rather than the first
    // intersecting one, so short sections still register as you pass them.
    const onScroll = () => {
      let current = elements[0]?.id ?? '';
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
      }
      setActiveId(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="absolute bottom-0 left-4 top-14 hidden w-11 xl:block"
    >
      <ul className="sticky top-1/2 flex w-[38px] -translate-y-1/2 list-none flex-col gap-px p-0">
        {headings.map(({ id, text, depth }) => {
          const isActive = id === activeId;
          return (
            <li key={id} className="relative">
              <a href={`#${id}`} className="mk-focus group flex items-center gap-3 py-[5px] no-underline">
                <span
                  className={cn(
                    'block h-0.5 shrink-0 rounded-[1px] transition-[width,background-color] duration-200',
                    depth === 2 ? 'w-[30px]' : 'w-[18px]',
                    isActive ? 'w-[34px] bg-ink' : 'bg-ink-300 group-hover:w-[38px] group-hover:bg-ink-500',
                  )}
                />
                <span
                  className={cn(
                    'pointer-events-none absolute left-11 w-[220px] -translate-x-1 text-[14px] leading-[1.4] opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100',
                    isActive ? 'text-ink' : 'text-ink-600',
                  )}
                >
                  {text}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
