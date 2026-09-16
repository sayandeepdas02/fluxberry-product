'use client';

import { useMemo, useState } from 'react';
import type { PostMeta } from '@/lib/blog-types';
import { cn } from '@/lib/utils';
import { CrossMark } from '../pixel-icons';
import { Divider } from '../divider';
import { PanelHeader, Sup } from '../frame';
import { PostCard, EmptyCard } from './post-card';

/*
 * Dashed cell separators. Each breakpoint owns a mutually exclusive rule
 * (`sm:max-lg:` vs `lg:`) so the column count and the divider logic can never
 * disagree — mixing them in one cascade makes nth-child specificity decide, and
 * that is not something worth debugging later.
 */
// NOTE: written out in full — Tailwind scans source as plain text, so a class
// assembled from template interpolation would never be generated.
const CELL = [
  'relative',
  // vertical rule on the cell's right edge, except in the last column
  "after:absolute after:inset-y-0 after:right-0 after:hidden after:w-px after:content-[''] after:bg-[repeating-linear-gradient(to_bottom,#c4c4c4_0_4px,transparent_4px_8px)]",
  'sm:max-lg:[&:not(:nth-child(2n))]:after:block',
  'lg:[&:not(:nth-child(3n))]:after:block',
  // horizontal rule above every row but the first
  "before:absolute before:inset-x-0 before:top-0 before:hidden before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,#c4c4c4_0_4px,transparent_4px_8px)]",
  'max-sm:[&:nth-child(n+2)]:before:block',
  'sm:max-lg:[&:nth-child(n+3)]:before:block',
  'lg:[&:nth-child(n+4)]:before:block',
].join(' ');

/**
 * Category chips plus the post grid. Client-side because filtering is the only
 * interactive part of the blog index — the posts themselves arrive pre-rendered.
 */
export function PostBrowser({ posts, categories }: { posts: PostMeta[]; categories: string[] }) {
  const [active, setActive] = useState<string>('All');

  const visible = useMemo(
    () => (active === 'All' ? posts : posts.filter((post) => post.category === active)),
    [posts, active],
  );

  // Pad the last row so the dashed three-column grid never ends ragged.
  const cells = useMemo(() => {
    const padding = visible.length % 3 === 0 ? 0 : 3 - (visible.length % 3);
    return [...visible, ...Array.from({ length: padding }, () => null)] as (PostMeta | null)[];
  }, [visible]);

  return (
    <>
      <section className="px-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {['All', ...categories].map((category) => {
            const isActive = category === active;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActive(category)}
                aria-pressed={isActive}
                className={cn(
                  'mk-focus border px-3.5 py-[7px] text-[13px] font-medium leading-5 transition-colors',
                  isActive
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink-200 bg-ink-100 text-ink-600 hover:border-ink-300 hover:text-ink',
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <Divider />

      <section className="relative">
        <div className="px-3 pb-3 pt-4">
          <PanelHeader>
            <span>
              {active === 'All' ? 'All posts' : active}
              <Sup>({visible.length})</Sup>
            </span>
            <span className="normal-case tracking-normal">Newest first</span>
          </PanelHeader>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cells.map((post, i) =>
            post ? (
              <div key={post.slug} className={CELL}>
                <PostCard post={post} />
              </div>
            ) : (
              <div key={`empty-${i}`} className={CELL}>
                <EmptyCard />
              </div>
            ),
          )}
        </div>

        {/* Closing rule with nodes at each column boundary. */}
        <div className="relative h-20">
          <span className="mk-dash-line absolute inset-x-0 top-0" aria-hidden />
          <CrossMark className="absolute -top-px left-0 -translate-x-1/2 -translate-y-1/2 text-ink-300" />
          <CrossMark className="absolute -top-px left-1/3 hidden -translate-x-1/2 -translate-y-1/2 text-ink-300 lg:block" />
          <CrossMark className="absolute -top-px left-2/3 hidden -translate-x-1/2 -translate-y-1/2 text-ink-300 lg:block" />
          <CrossMark className="absolute -top-px right-0 translate-x-1/2 -translate-y-1/2 text-ink-300" />
        </div>
      </section>
    </>
  );
}
