import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAllPosts, getPost, formatPostDate } from '@/lib/blog';
import { publicPageMetadata, toPlainDescription } from '@/lib/seo';
import { publicConfig } from '@/lib/config';
import { Frame } from '@/components/marketing/frame';
import { EyebrowPill } from '@/components/marketing/bits';
import { MkButton } from '@/components/marketing/mk-button';
import { Prose } from '@/components/marketing/blog/prose';
import { TocMinimap } from '@/components/marketing/blog/toc-minimap';

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
    }),
    openGraph: {
      title: post.title,
      description: toPlainDescription(post.description),
      type: 'article',
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [post.author],
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
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: publicConfig.appName },
    mainEntityOfPage: `${publicConfig.appUrl}/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="relative">
        <TocMinimap headings={post.headings} />

        <Frame>
          <article className="border-b border-ink-100 pb-24 pt-20">
            {/* A dashed full-bleed rule closes the header off — a softer boundary
                than the crosshair-pinned dividers used between page sections. */}
            <header className="mk-screen-dashed-bottom mx-auto flex max-w-[min(720px,100%-48px)] flex-col items-center pb-12 text-center">
              <Link
                href="/blog"
                className="mk-focus mb-6 inline-flex items-center gap-2 text-[14px] font-medium text-ink-500 transition-colors hover:text-ink"
              >
                <ArrowLeft className="size-4" />
                Back to blog
              </Link>
              <EyebrowPill className="mb-4">{post.category}</EyebrowPill>
              <h1 className="mt-2 max-w-[720px] text-balance text-mk-h1 text-ink">{post.title}</h1>
              <p className="mt-5 max-w-[620px] text-balance text-[17px] leading-[27px] text-ink-600">
                {post.description}
              </p>
              <p className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] tabular-nums text-ink-400">
                <span className="text-ink-secondary">{post.author}</span>
                <span aria-hidden className="text-ink-300">/</span>
                {formatPostDate(post.date)}
                <span aria-hidden className="text-ink-300">/</span>
                {post.readingTime} min read
              </p>
            </header>

            <div className="mx-auto mt-12 max-w-[min(680px,100%-48px)]">
              <Prose content={post.content} />
            </div>
          </article>
        </Frame>
      </div>

      <Frame>
        <section className="flex flex-col items-center border-b border-ink-100 py-24 text-center">
          <h2 className="max-w-[min(620px,100%-48px)] text-balance text-mk-h4 text-ink">
            See Fluxberry on your own pipeline.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <MkButton href="/signup">Start for free</MkButton>
            <MkButton href="/blog" variant="secondary">
              Read more
            </MkButton>
          </div>
        </section>
      </Frame>
    </>
  );
}
