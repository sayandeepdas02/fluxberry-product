'use client';

import { useMemo, useState } from 'react';
import type { PostMeta } from '@/lib/blog-types';
import { cn } from '@/lib/utils';
import { TYPE } from '@/components/marketing/landing/primitives';
import { PostCard } from './post-card';

/** Category chips over a three-column grid (two on tablet, one on phone). */
export function PostBrowser({ posts, categories }: { posts: PostMeta[]; categories: string[] }) {
  const [active, setActive] = useState<string>('All');

  const visible = useMemo(
    () => (active === 'All' ? posts : posts.filter((post) => post.category === active)),
    [posts, active],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Chips in the landing's pill style; the selected one is the blue-tint pill. */}
      <div role="group" aria-label="Filter posts by category" className="flex flex-wrap items-center gap-2.5">
        {['All', ...categories].map((category) => {
          const isActive = category === active;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              aria-pressed={isActive}
              className={cn(
                'rounded-[30px] px-[13px] py-[6px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lp-blue-400',
                TYPE.pill,
                isActive
                  ? 'bg-lp-blue-50 text-lp-blue-400'
                  : 'bg-white text-lp-gray-600 shadow-[2px_2px_10px_rgba(0,0,0,0.03)] hover:text-black',
              )}
            >
              {category === 'All' ? 'All articles' : category}
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
          {visible.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className={cn('py-16 text-center text-lp-gray-600', TYPE.body)}>No posts in this category yet.</p>
      )}
    </div>
  );
}
