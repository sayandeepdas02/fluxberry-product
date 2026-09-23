import Link from 'next/link';
import { formatPostDate, type PostMeta } from '@/lib/blog-types';

/** Full-width dark hero card for the lead post. */
export function FeaturedPost({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-2xl bg-ink no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-500"
    >
      <div className="flex flex-col justify-between p-8 md:p-12 md:min-h-[260px]">
        <div>
          <span className="font-mono text-[11px] tabular-nums text-ink-400">
            {formatPostDate(post.date)} · {post.readingTime} min read
          </span>
          <h2 className="mt-4 max-w-xl text-mk-h3 text-white group-hover:underline group-hover:underline-offset-4">
            {post.title}
          </h2>
          <p className="mt-3 max-w-lg line-clamp-3 text-sm leading-relaxed text-ink-400">
            {post.description}
          </p>
        </div>
        <div className="mt-8 flex items-center gap-3">
          <span className="inline-flex h-7 items-center rounded-full border border-ink-600 px-3 text-[11px] font-medium text-ink-300">
            {post.category}
          </span>
          <span className="text-sm text-ink-500">{post.author}</span>
        </div>
      </div>
    </Link>
  );
}
