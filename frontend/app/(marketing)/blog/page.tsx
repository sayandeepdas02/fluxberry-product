import type { Metadata } from 'next';
import { getAllPosts, getCategories } from '@/lib/blog';
import { publicPageMetadata } from '@/lib/seo';
import { Frame } from '@/components/marketing/frame';
import { Divider } from '@/components/marketing/divider';
import { EyebrowPill } from '@/components/marketing/bits';
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

  return (
    <>
      <Frame>
        <section className="relative isolate flex flex-col items-center overflow-hidden py-24 text-center">
          <span className="mk-grid-bg" aria-hidden />
          <EyebrowPill className="mb-4">Blog</EyebrowPill>
          <h1 className="max-w-[min(620px,100%-48px)] text-balance text-mk-h1 text-ink">
            Hiring, with less noise.
          </h1>
          <p className="mt-5 max-w-[min(520px,100%-48px)] text-balance text-ink-600">{description}</p>
        </section>
      </Frame>

      <Divider variant="band" />

      <Frame>
        {featured && (
          <>
            <section className="border-t border-ink-200 py-3">
              <FeaturedPost post={featured} />
            </section>
            <Divider />
          </>
        )}
        <PostBrowser posts={posts} categories={categories} />
      </Frame>
    </>
  );
}
