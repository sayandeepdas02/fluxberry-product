import { ChevronDown } from 'lucide-react';
import type { Heading } from '@/lib/blog-types';
import { cn } from '@/lib/utils';
import { FOUNDER } from '@/lib/founder';

/*
 * The blocks around an article's body: the answer-first summary and the table
 * of contents above it, the author box below. Set in the body's own type
 * (Manrope headings, Inter text, landing greys and blues) so they read as part
 * of the article, not as widgets.
 */

const linkClass =
  'rounded-sm text-lp-blue-500 underline decoration-lp-blue-500/30 underline-offset-[3px] outline-none transition-colors hover:text-lp-blue-600 hover:decoration-lp-blue-600 focus-visible:ring-2 focus-visible:ring-lp-blue-400';

/**
 * "Key takeaways": the post's answer in a few bullets before the body, the
 * part a reader skims first and an answer engine is most likely to quote.
 */
export function KeyTakeaways({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="key-takeaways" className="mb-10 rounded-[15px] bg-lp-blue-50 px-6 py-5">
      <h2 id="key-takeaways" className="font-manrope text-[18px] font-semibold leading-7 tracking-[-0.01em] text-black">
        Key takeaways
      </h2>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[16px] leading-[26px] text-lp-gray-800 marker:text-lp-blue-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The table of contents inside the column, for screens too narrow for the
 * minimap beside it (which is also the view Google indexes). Its anchor links
 * are what search results use for "Jump to" links.
 */
export function ArticleToc({ headings }: { headings: Heading[] }) {
  if (headings.length < 3) return null;
  return (
    <nav aria-label="In this article" className="mb-10 rounded-[15px] border border-lp-gray-150 xl:hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[15px] px-6 py-4 font-manrope text-[16px] font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400 [&::-webkit-details-marker]:hidden">
          In this article
          <ChevronDown aria-hidden className="size-4 text-lp-gray-500 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <ol className="flex list-none flex-col gap-2 px-6 pb-5 text-[15px] leading-[22px]">
          {headings.map(({ id, text, depth }) => (
            <li key={id} className={cn(depth === 3 && 'pl-4')}>
              <a href={`#${id}`} className={cn(linkClass, 'no-underline', depth === 3 ? 'text-lp-gray-600' : 'text-black')}>
                {text}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}

/**
 * Who wrote the post and why they know the subject: the byline's fuller form,
 * linked to the same profiles the author's structured data lists.
 */
export function AuthorBox({ author }: { author: string }) {
  if (author !== FOUNDER.name) return null;
  const initials = FOUNDER.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('');

  return (
    <section aria-label="About the author" className="mt-14 flex gap-4 rounded-[15px] border border-lp-gray-150 p-6">
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lp-blue-50 font-manrope text-[16px] font-semibold text-lp-blue-500"
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="font-manrope text-[18px] font-semibold leading-6 text-black">
          <a href={FOUNDER.linkedinUrl} target="_blank" rel="author noopener noreferrer" className={cn(linkClass, 'text-black no-underline')}>
            {FOUNDER.name}
          </a>
        </p>
        <p className="text-[14px] leading-5 text-lp-gray-500">{FOUNDER.role}</p>
        <p className="mt-3 text-[16px] leading-[26px] text-lp-gray-700">{FOUNDER.bio}</p>
        <p className="mt-3 flex gap-4 text-[14px] leading-5">
          <a href={FOUNDER.linkedinUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            LinkedIn
          </a>
          <a href={FOUNDER.xUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            X (Twitter)
          </a>
        </p>
      </div>
    </section>
  );
}
