import Link from 'next/link';
import { formatPostDate, type PostMeta } from '@/lib/blog-types';
import { PostThumb } from './post-thumb';

/**
 * Grid cell for one post. Square corners, 12px padding, and a hover wash drawn by
 * an overlay so the card's own borders stay exactly 1px.
 */
export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex flex-col gap-3 p-3 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-700"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-px transition-colors group-hover:bg-[rgba(13,17,23,0.05)]"
      />
      <PostThumb className="aspect-[600/491] w-full" />
      <span className="relative text-mk-micro normal-case tracking-normal text-ink-500">{post.category}</span>
      <h3 className="relative text-mk-h5 text-ink">{post.title}</h3>
      <p className="relative line-clamp-2 text-[14px] leading-5 text-ink-600">{post.description}</p>
      {/* Mono + tabular figures for metadata, so dates line up column to column. */}
      <span className="relative mt-auto pt-4 font-mono text-[11px] tabular-nums text-ink-400">
        {formatPostDate(post.date)} <span className="mx-1 text-ink-300">/</span> {post.readingTime} min read
      </span>
    </Link>
  );
}

/** Keeps the three-column rhythm intact when a row is short on posts. */
export function EmptyCard() {
  return <span aria-hidden className="pointer-events-none relative flex min-h-[220px] flex-col p-3" />;
}
