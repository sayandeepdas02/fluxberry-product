import Link from 'next/link';
import { formatPostDate, type PostMeta } from '@/lib/blog-types';
import { PostThumb } from './post-thumb';

/** The lead post: wide artwork on the left, headline and dek on the right. */
export function FeaturedPost({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group mx-3 grid grid-cols-1 items-center gap-6 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-700 md:grid-cols-[1fr_1.3fr] md:gap-10"
    >
      <PostThumb className="aspect-[16/10] w-full md:aspect-[3/2]" />
      <div className="flex flex-col justify-center gap-4">
        <span className="text-mk-micro normal-case tracking-normal text-ink-500">{post.category}</span>
        <h2 className="text-mk-h4 text-ink group-hover:underline group-hover:underline-offset-4">{post.title}</h2>
        <p className="text-mk-body text-ink-600">{post.description}</p>
        <span className="font-mono text-[11px] tabular-nums text-ink-400">
          {post.author} <span className="mx-1 text-ink-300">/</span> {formatPostDate(post.date)}{' '}
          <span className="mx-1 text-ink-300">/</span> {post.readingTime} min read
        </span>
      </div>
    </Link>
  );
}
