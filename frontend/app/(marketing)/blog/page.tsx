import type { Metadata } from 'next';
import { getAllPosts, getCategories } from '@/lib/blog';
import { publicPageMetadata } from '@/lib/seo';
import { BRAND } from '@/components/marketing/landing/content';
import { Appear } from '@/components/marketing/landing/motion';
import { GridBackdrop, SectionHeader } from '@/components/marketing/landing/primitives';
import { FeaturedPost } from '@/components/marketing/blog/featured-post';
import { PostBrowser } from '@/components/marketing/blog/post-browser';

const description = 'Case Studies, discussions, blogs, notes on hiring the best AI talent with Fluxberry';

export const metadata: Metadata = publicPageMetadata({
  title: 'Blog',
  description,
  path: '/blog',
  ownImage: true,
  siteName: BRAND,
});

/**
 * Blog index in the landing page's language: a hero-style header (the page
 * content starts where the landing hero's does, under the floating nav), then
 * the posts on the grey section background the landing uses for Solutions.
 */
export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getCategories();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const rest = posts.filter((post) => post.slug !== featured?.slug);

  return (
    <>
      <section className="relative px-5 pb-[70px] pt-[140px] tablet:px-[50px] tablet:pb-[100px] tablet:pt-[200px] desktop:px-[70px]">
        <GridBackdrop />
        <Appear className="relative mx-auto max-w-[1300px]">
          <SectionHeader
            pill="Blog"
            title="Insights on hiring AI Talent"
            lead={description}
            titleAs="h1"
            titleClassName="max-w-none text-balance"
            leadClassName="max-w-none text-balance"
          />
        </Appear>
      </section>

      <section className="bg-lp-gray-50 px-5 py-[70px] tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-[60px]">
          {featured && <FeaturedPost post={featured} />}
          <PostBrowser posts={rest} categories={categories} />
        </div>
      </section>
    </>
  );
}
