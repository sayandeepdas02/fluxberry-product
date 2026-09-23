import Link from 'next/link';
import { formatPostDate, type PostMeta } from '@/lib/blog-types';
import { PostThumb } from './post-thumb';

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white no-underline transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-500"
    >
      <PostThumb className="aspect-[16/10] w-full" />
      <div className="flex flex-col gap-2.5 p-5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {post.category}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatPostDate(post.date)}
          </span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-berry-600">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {post.description}
        </p>
      </div>
    </Link>
  );
}

export function EmptyCard() {
  return <span aria-hidden className="pointer-events-none hidden lg:block" />;
}
