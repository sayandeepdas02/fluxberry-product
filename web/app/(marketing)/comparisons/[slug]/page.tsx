import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { faqJsonLd, jsonLdScript, publicPageMetadata } from '@/lib/seo';
import { BRAND, PRODUCT } from '@/components/marketing/landing/content';
import { ProductSection } from '@/components/marketing/landing/product-section';
import { FaqSection } from '@/components/marketing/landing/faq-section';
import { CompareHero } from '@/components/marketing/compare/compare-hero';
import { ComparisonTable } from '@/components/marketing/compare/comparison-table';
import { CompareCta } from '@/components/marketing/compare/compare-cta';
import { CompareBlog } from '@/components/marketing/compare/compare-blog';
import { COMPETITORS, compareSlug, comparePath, getCompetitor, type Competitor } from '@/components/marketing/compare/data';
import { fill } from '@/components/marketing/compare/fill';

type Params = { slug: string };

/** `zliptal-vs-greenhouse` -> the Greenhouse record. */
function resolve(slug: string): Competitor | undefined {
  return slug.startsWith('zliptal-vs-') ? getCompetitor(slug.slice('zliptal-vs-'.length)) : undefined;
}

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return COMPETITORS.map((c) => ({ slug: compareSlug(c.slug) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const competitor = resolve((await params).slug);
  if (!competitor) return {};
  return publicPageMetadata({
    title: `Zliptal vs ${competitor.name}: a simpler alternative`,
    description: fill(competitor.metaDescription),
    path: comparePath(competitor.slug),
    siteName: BRAND,
  });
}

function faqItems(c: Competitor) {
  return [
    { q: `Why is Zliptal a better alternative to ${c.name}?`, a: c.why },
    { q: `How does Zliptal's pricing compare with ${c.name}?`, a: c.pricing },
    { q: `Is Zliptal easier to set up than ${c.name}?`, a: c.setup },
    c.extra,
    { q: `When should I stay with ${c.name}?`, a: c.stay },
    {
      q: `Can I move from ${c.name} to Zliptal?`,
      a: `Yes. There is no self-serve import yet, so the simplest path is to start new roles in Zliptal and let ${c.name} finish the roles already in progress. Email us and we will help you get set up.`,
    },
  ].map((item) => ({ q: item.q, a: fill(item.a) }));
}

/** A "Zliptal vs X" page: hero, feature comparison, FAQ, Zliptal's features, a call to action, then the blog. */
export default async function ComparisonPage({ params }: { params: Promise<Params> }) {
  const competitor = resolve((await params).slug);
  if (!competitor) notFound();

  const items = faqItems(competitor);
  const url = `${publicConfig.appUrl}${comparePath(competitor.slug)}`;
  const bySlug = new Map(getAllPosts().map((post) => [post.slug, post]));
  const posts = competitor.posts.flatMap((slug) => bySlug.get(slug) ?? []).slice(0, 3);

  const jsonLd = {
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: publicConfig.appUrl },
          { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${publicConfig.appUrl}/comparisons` },
          { '@type': 'ListItem', position: 3, name: `Zliptal vs ${competitor.name}`, item: url },
        ],
      },
      faqJsonLd(items),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <CompareHero
        name={competitor.name}
        headline={competitor.headline}
        lead={competitor.lead}
        glance={competitor.glance}
      />
      <ComparisonTable competitor={competitor} />
      <FaqSection
        items={items}
        pill="FAQ"
        title={`Zliptal vs ${competitor.name}: your questions`}
        lead={`Why teams choose Zliptal over ${competitor.name}, and when they should not.`}
      />
      <ProductSection
        id="features"
        background="bg-white"
        pill="Features"
        title="Everything you need to hire, in one place"
        lead={PRODUCT.lead}
      />
      <CompareCta name={competitor.name} />
      <CompareBlog posts={posts} currentSlug={competitor.slug} />
    </>
  );
}
