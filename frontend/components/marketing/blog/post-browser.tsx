'use client';

import { useMemo, useState } from 'react';
import type { PostMeta } from '@/lib/blog-types';
import { cn } from '@/lib/utils';
import { PostCard } from './post-card';

export function PostBrowser({ posts, categories }: { posts: PostMeta[]; categories: string[] }) {
  const [active, setActive] = useState<string>('All');

  const visible = useMemo(
    () => (active === 'All' ? posts : posts.filter((post) => post.category === active)),
    [posts, active],
  );

  return (
    <div className="space-y-10">
      {/* Tab-style category filter */}
      <div className="border-b border-border">
        <nav className="-mb-px flex items-center gap-0 overflow-x-auto">
          {['All', ...categories].map((category) => {
            const isActive = category === active;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActive(category)}
                aria-pressed={isActive}
                className={cn(
                  'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none',
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {category === 'All' ? 'All articles' : category}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Post grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">No posts in this category yet.</p>
      )}
    </div>
  );
}
