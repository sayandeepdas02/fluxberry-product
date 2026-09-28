import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatPostDate, type PostMeta } from '@/lib/blog-types';
import { Pill, TYPE } from '@/components/marketing/landing/primitives';
import { PostCover } from './covers/cover';

/** Hover and focus treatment shared by the blog's clickable cards. */
export const postCardClass = cn(
  'group rounded-[15px] bg-white p-[15px] shadow-[2px_2px_10px_rgba(0,0,0,0.03)] outline-none',
  'transition-shadow duration-300 hover:shadow-[2px_6px_20px_rgba(0,0,0,0.07)] focus-visible:ring-2 focus-visible:ring-lp-blue-400',
);

/** Category pill plus date and reading time, shared by the featured and grid cards. */
export function PostMetaRow({ post }: { post: PostMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <Pill className="px-2.5 py-[3px]">{post.category}</Pill>
      <span className="font-inter text-[14px] leading-5 text-lp-gray-500">
        {formatPostDate(post.date)} · {post.readingTime} min read
      </span>
    </div>
  );
}

/** A post in the grid, built like the landing's Solutions cards: the cover over the text. */
export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className={cn(postCardClass, 'flex flex-col')}>
      <PostCover
        slug={post.slug}
        title={post.title}
        sizes="(min-width: 1200px) 640px, (min-width: 810px) 70vw, 100vw"
        className="aspect-[16/10] w-full rounded-[7px]"
      />
      <div className="mt-2.5 flex flex-1 flex-col gap-[15px] px-[5px] py-2.5">
        <PostMetaRow post={post} />
        <h3 className={cn('text-black transition-colors group-hover:text-lp-blue-500', TYPE.title)}>{post.title}</h3>
        <p className={cn('line-clamp-2 text-lp-gray-600', TYPE.body)}>{post.description}</p>
      </div>
    </Link>
  );
}
