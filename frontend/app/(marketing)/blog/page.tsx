import type { Metadata } from 'next';
import { getAllPosts, getCategories } from '@/lib/blog';
import { publicPageMetadata } from '@/lib/seo';
import { FeaturedPost } from '@/components/marketing/blog/featured-post';
import { PostBrowser } from '@/components/marketing/blog/post-browser';

const description =
  'Notes on hiring with less noise: screening, assessments, interviews, and how we build Fluxberry.';

export const metadata: Metadata = publicPageMetadata({
  title: 'Blog',
  description,
  path: '/blog',
});

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getCategories();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const rest = posts.filter((post) => post.slug !== featured?.slug);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      {/* Page header */}
      <div className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Blog</p>
        <h1 className="mt-2 text-mk-h2 text-foreground">Hiring, with less noise.</h1>
        <p className="mt-3 max-w-[480px] text-mk-body text-muted-foreground">{description}</p>
      </div>

      {/* Featured post */}
      {featured && (
        <div className="mb-14">
          <FeaturedPost post={featured} />
        </div>
      )}

      {/* Filtered grid */}
      <PostBrowser posts={rest} categories={categories} />
    </div>
  );
}
