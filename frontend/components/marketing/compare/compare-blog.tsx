import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PostMeta } from '@/lib/blog-types';
import { Reveal } from '@/components/marketing/landing/motion';
import { GradientButton, SectionHeader, TYPE } from '@/components/marketing/landing/primitives';
import { PostCard } from '@/components/marketing/blog/post-card';
import { COMPETITORS, comparePath } from './data';

/**
 * "Keep reading": up to three related blog posts, a button to the blog, and links to the other
 * comparison pages (internal links only, so every comparison is reachable from every other).
 */
export function CompareBlog({ posts, currentSlug }: { posts: PostMeta[]; currentSlug?: string }) {
  const others = COMPETITORS.filter((c) => c.slug !== currentSlug);
  return (
    <section className="bg-lp-gray-50 px-5 py-[70px] tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
      <div className="mx-auto flex max-w-[1300px] flex-col items-center gap-[60px]">
        <Reveal className="w-full">
          <SectionHeader
            pill="Blog"
            title="Keep reading"
            lead="Guides to choosing an applicant tracking system, what each one costs and how to hire faster."
            titleClassName="max-w-[500px]"
            leadClassName="max-w-[520px]"
          />
        </Reveal>

        {posts.length > 0 && (
          <div className="grid w-full gap-5 desktop:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        <GradientButton href="/blog">Read our blog</GradientButton>

        <nav aria-label="More comparisons" className="flex w-full flex-col items-center gap-5">
          <p className={cn('text-lp-gray-600', TYPE.label)}>Compare Zliptal with other tools</p>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {others.map((c) => (
              <li key={c.slug}>
                <Link
                  href={comparePath(c.slug)}
                  className={cn(
                    'block rounded-[30px] bg-white px-[15px] py-2 text-black shadow-[2px_2px_10px_rgba(0,0,0,0.04)] outline-none transition-colors hover:text-lp-blue-500 focus-visible:ring-2 focus-visible:ring-lp-blue-400',
                    TYPE.pill,
                  )}
                >
                  {`Zliptal vs ${c.name}`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
