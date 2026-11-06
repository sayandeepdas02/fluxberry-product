import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostMeta } from '@/lib/blog-types';
import { TYPE } from '@/components/marketing/landing/primitives';
import { PostCover } from './covers/cover';
import { PostMetaRow, postCardClass } from './post-card';

/** The lead post: a wide Product-style card, with the cover beside the text on desktop. */
export function FeaturedPost({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(postCardClass, 'grid grid-cols-1 gap-2.5 desktop:grid-cols-[750fr_530fr] desktop:gap-5')}
    >
      <PostCover
        slug={post.slug}
        title={post.title}
        sizes="(min-width: 1200px) 1100px, 100vw"
        className="h-[240px] rounded-[7px] tablet:h-[330px]"
      />
      <div className="flex flex-col justify-center gap-[15px] px-[5px] py-2.5 desktop:pr-5">
        <PostMetaRow post={post} />
        <h2 className="font-manrope text-lp-h2-p text-black transition-colors group-hover:text-lp-blue-500">
          {post.title}
        </h2>
        <p className={cn('line-clamp-3 text-lp-gray-600', TYPE.body)}>{post.description}</p>
        <span className={cn('mt-[5px] inline-flex items-center gap-1.5 text-lp-blue-500', TYPE.button)}>
          Read article
          <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
