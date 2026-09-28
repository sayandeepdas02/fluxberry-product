import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllPosts, getPost, formatPostDate } from '@/lib/blog';
import { publicPageMetadata, toPlainDescription } from '@/lib/seo';
import { publicConfig } from '@/lib/config';
import { BRAND } from '@/components/marketing/landing/content';
import { FOUNDER, FOUNDER_PERSON } from '@/lib/founder';
import { Appear } from '@/components/marketing/landing/motion';
import { GridBackdrop, Pill, TYPE } from '@/components/marketing/landing/primitives';
import { articleInter } from '@/components/marketing/blog/article-font';
import { Prose } from '@/components/marketing/blog/prose';
import { TocMinimap } from '@/components/marketing/blog/toc-minimap';
import { PostCover } from '@/components/marketing/blog/covers/cover';

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
      title: post.title,
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
      authors: [post.author],
      section: post.category,
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: toPlainDescription(post.description),
    datePublished: post.date,
    author: post.author === FOUNDER.name ? FOUNDER_PERSON : { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
      logo: { '@type': 'ImageObject', url: `${publicConfig.appUrl}/logo-mark.png` },
    },
    mainEntityOfPage: `${publicConfig.appUrl}/blog/${post.slug}`,
  };

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
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              <span aria-hidden>·</span>
              <span>{post.readingTime} min read</span>
            </p>
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
            <Prose content={post.content} />
          </div>
        </div>
      </article>
    </>
  );
}
