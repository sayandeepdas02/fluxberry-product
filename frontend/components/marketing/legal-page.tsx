import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { getLegalDoc, type LegalSlug } from '@/lib/legal';
import { publicPageMetadata } from '@/lib/seo';
import { formatPostDate } from '@/lib/blog';
import { Appear } from './landing/motion';
import { GridBackdrop, Pill, TYPE } from './landing/primitives';
import { articleInter } from './blog/article-font';
import { Prose } from './blog/prose';

export function legalMetadata(slug: LegalSlug): Metadata {
  const doc = getLegalDoc(slug);
  return publicPageMetadata({ title: doc.title, description: doc.description, path: `/${slug}` });
}

/** A legal document in the blog article's frame: grid-backdrop header, then the markdown body. */
export function LegalPage({ slug }: { slug: LegalSlug }) {
  const doc = getLegalDoc(slug);

  return (
    <article className={articleInter.variable}>
      <header className="relative px-5 pb-[50px] pt-[140px] tablet:px-[50px] tablet:pb-[60px] tablet:pt-[200px] desktop:px-[70px]">
        <GridBackdrop />
        <Appear className="relative mx-auto flex max-w-[760px] flex-col items-center text-center">
          <Pill>Legal</Pill>
          <h1 className={cn('mt-2.5 text-balance text-black', TYPE.h2)}>{doc.title}</h1>
          <p className="mt-6 font-inter text-[14px] leading-5 text-lp-gray-600">
            Last updated <time dateTime={doc.updated}>{formatPostDate(doc.updated)}</time>
          </p>
        </Appear>
      </header>

      <div className="px-5 pb-[70px] tablet:px-[50px] tablet:pb-[100px] desktop:px-[70px]">
        <div className="mx-auto max-w-[680px] border-t border-lp-gray-150 pt-[50px]">
          <Prose content={doc.content} />
        </div>
      </div>
    </article>
  );
}
