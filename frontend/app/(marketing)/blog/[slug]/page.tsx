import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllPosts, getPost, getRelatedPosts, formatPostDate, type Post } from '@/lib/blog';
import { postShareImagePath, publicPageMetadata, toPlainDescription } from '@/lib/seo';
import { publicConfig } from '@/lib/config';
import { BRAND } from '@/components/marketing/landing/content';
import { FOUNDER, FOUNDER_PERSON } from '@/lib/founder';
import { Appear } from '@/components/marketing/landing/motion';
import { GridBackdrop, Pill, TYPE } from '@/components/marketing/landing/primitives';
import { articleInter } from '@/components/marketing/blog/article-font';
import { Prose } from '@/components/marketing/blog/prose';
import { TocMinimap } from '@/components/marketing/blog/toc-minimap';
import { PostCover } from '@/components/marketing/blog/covers/cover';
import { ArticleToc, AuthorBox, KeyTakeaways } from '@/components/marketing/blog/article-aside';
import { PostCard } from '@/components/marketing/blog/post-card';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    ...publicPageMetadata({
      title: post.metaTitle ?? post.title,
      description: toPlainDescription(post.description),
      path: `/blog/${post.slug}`,
      ownImage: true,
      siteName: BRAND,
    }),
    // The share image is this post's own opengraph-image (title, category, byline).
    openGraph: {
      title: post.title,
      description: toPlainDescription(post.description),
      type: 'article',
      url: `/blog/${post.slug}`,
      siteName: BRAND,
      locale: 'en_US',
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      section: post.category,
      tags: post.keywords,
    },
    twitter: {
      card: 'summary_large_image',
      site: FOUNDER.xHandle,
      creator: FOUNDER.xHandle,
      title: post.title,
      description: toPlainDescription(post.description),
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = articleJsonLd(post);
  const related = getRelatedPosts(post.slug);
  const revised = post.updated > post.date;
  const listsFluxberry = numberedItems(post).some(({ name }) => name === BRAND);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <article className={articleInter.variable}>
        {/* Header in the landing's language: grid backdrop, pill, centred heading. */}
        <header className="relative px-5 pb-[50px] pt-[140px] tablet:px-[50px] tablet:pb-[60px] tablet:pt-[200px] desktop:px-[70px]">
          <GridBackdrop />
          <Appear className="relative mx-auto flex max-w-[760px] flex-col items-center text-center">
            <Link
              href="/blog"
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-sm text-lp-gray-600 outline-none transition-colors hover:text-black',
                'focus-visible:ring-2 focus-visible:ring-lp-blue-400',
                TYPE.nav,
              )}
            >
              <ArrowLeft aria-hidden className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Back to blog
            </Link>
            <Pill className="mt-6">{post.category}</Pill>
            <h1 className={cn('mt-2.5 text-balance text-black', TYPE.h2)}>{post.title}</h1>
            <p className={cn('mt-5 max-w-[620px] text-balance text-lp-gray-700', TYPE.body)}>{post.description}</p>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 font-inter text-[14px] leading-5 text-lp-gray-500">
              {post.author === FOUNDER.name ? (
                <a
                  href={FOUNDER.linkedinUrl}
                  target="_blank"
                  rel="author noopener noreferrer"
                  className="rounded-sm text-black outline-none hover:text-lp-blue-500 focus-visible:ring-2 focus-visible:ring-lp-blue-400"
                >
                  {post.author}
                </a>
              ) : (
                <span className="text-black">{post.author}</span>
              )}
              <span aria-hidden>·</span>
              {revised ? (
                <span>
                  Updated <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
                </span>
              ) : (
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              )}
              <span aria-hidden>·</span>
              <span>{post.readingTime} min read</span>
            </p>
            {listsFluxberry && (
              <p className="mt-3 max-w-[560px] text-balance font-inter text-[14px] leading-5 text-lp-gray-500">
                Fluxberry is our product and is on this list. Check each vendor&rsquo;s pricing and features before you
                buy.
              </p>
            )}
          </Appear>
        </header>

        {/* The post's cover as a banner, in the hero card's radius. */}
        <div className="px-5 tablet:px-[50px] desktop:px-[70px]">
          <Appear delay={0.15} className="mx-auto max-w-[1100px]">
            <PostCover
              slug={post.slug}
              title={post.title}
              sizes="(min-width: 1240px) 1100px, 100vw"
              className="aspect-[16/10] rounded-[15px] tablet:aspect-[2/1] tablet:rounded-[20px] desktop:rounded-[27px]"
            />
          </Appear>
        </div>

        <div className="relative px-5 pb-[70px] tablet:px-[50px] tablet:pb-[100px] desktop:px-[70px]">
          <TocMinimap headings={post.headings} />
          <div className="mx-auto max-w-[680px] pt-[50px]">
            <KeyTakeaways items={post.takeaways} />
            <ArticleToc headings={post.headings} />
            <Prose content={post.content} />
            <AuthorBox author={post.author} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="keep-reading"
          className="bg-lp-gray-50 px-5 py-[70px] tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]"
        >
          <div className="mx-auto max-w-[1300px]">
            <h2 id="keep-reading" className={cn('text-black', TYPE.h2)}>
              Keep reading
            </h2>
            <div className="mt-8 grid gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
              {related.map((item) => (
                <PostCard key={item.slug} post={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * The numbered H3s ("1. Fluxberry", "2. Gem"): the tools in a list post, or the
 * steps in a guide. They become the page's ItemList, and tell the header
 * whether the post ranks Fluxberry and so needs the disclosure.
 */
function numberedItems(post: Post) {
  return post.headings
    .filter(({ depth, text }) => depth === 3 && /^\d+\.\s/.test(text))
    .map(({ id, text }) => ({ id, name: text.replace(/^\d+\.\s+/, '') }));
}

/**
 * The article's structured data as one graph: the post itself, its place in the
 * site (breadcrumbs), and its FAQ, read from the same markdown the page renders
 * so the markup can never claim what the page doesn't say.
 */
function articleJsonLd(post: Post) {
  const site = publicConfig.appUrl;
  const url = `${site}/blog/${post.slug}`;
  const description = toPlainDescription(post.description);

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: post.title,
      description,
      url,
      mainEntityOfPage: url,
      image: `${site}${postShareImagePath(post.slug)}`,
      datePublished: post.date,
      dateModified: post.updated,
      author: post.author === FOUNDER.name ? FOUNDER_PERSON : { '@type': 'Person', name: post.author },
      publisher: {
        '@type': 'Organization',
        name: BRAND,
        url: site,
        logo: { '@type': 'ImageObject', url: `${site}/logo-mark.png` },
      },
      articleSection: post.category,
      ...(post.keywords.length > 0 ? { keywords: post.keywords } : {}),
      wordCount: post.wordCount,
      inLanguage: 'en',
      isPartOf: { '@type': 'Blog', name: `${BRAND} blog`, url: `${site}/blog` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: site },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${site}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];

  // No ratings or reviews: self-serving review markup on a vendor's own list breaks Google's guidelines.
  const items = numberedItems(post);
  if (items.length >= 3) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#list`,
      name: post.title,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: items.length,
      itemListElement: items.map(({ id, name }, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        url: `${url}#${id}`,
      })),
    });
  }

  if (post.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: post.faqs.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
