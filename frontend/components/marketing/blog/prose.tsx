import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { slugifyHeading } from '@/lib/blog-types';

/**
 * Article body. Styles are written as an explicit component map rather than a
 * `prose` class so the measurements match the rest of the marketing pages
 * (18px/30px body, 44px space above an h2, hairline tables).
 *
 * Heading ids come from the same `slugifyHeading` the table of contents uses, so
 * the minimap and the anchors can never drift apart.
 */

function toText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(toText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return toText((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

export function Prose({ content }: { content: string }) {
  // Mirrors the unique-ID logic in extractHeadings so TocMinimap links and
  // rendered anchor IDs always agree, even when a heading text repeats.
  const slugCounts = new Map<string, number>();
  function nextHeadingId(children: ReactNode): string {
    const slug = slugifyHeading(toText(children));
    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    return count === 0 ? slug : `${slug}-${count}`;
  }

  return (
    <div className="text-[18px] leading-[30px] text-ink-600">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2
              id={nextHeadingId(children)}
              className="mb-4 mt-11 scroll-mt-24 text-mk-h4 text-ink"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={nextHeadingId(children)}
              className="mb-3.5 mt-9 scroll-mt-24 text-[22px] font-medium leading-[1.25] tracking-[-0.5px] text-ink"
            >
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-5">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-5 flex list-disc flex-col gap-2.5 pl-6 marker:text-berry-500">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-5 flex list-decimal flex-col gap-2.5 pl-6 marker:text-ink-400">{children}</ol>
          ),
          li: ({ children }) => <li className="text-[18px] leading-7">{children}</li>,
          a: ({ href, children }) => {
            const target = href ?? '#';
            const isInternal = target.startsWith('/') || target.startsWith('#');
            const className = 'text-berry-700 underline underline-offset-2 hover:text-berry-900';
            return isInternal ? (
              <Link href={target} className={className}>
                {children}
              </Link>
            ) : (
              <a href={target} className={className} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-8 border-l-2 border-berry-200 py-1 pl-6 text-[20px] font-normal not-italic leading-[1.4] text-ink [&>p]:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-ink-line" />,
          code: ({ children, className }) =>
            className?.includes('language-') ? (
              <code className="block font-mono text-[13px] leading-6 text-ink">{children}</code>
            ) : (
              <code className="whitespace-pre-wrap rounded-[4px] border border-ink-200 bg-ink-100/60 px-1 py-px font-mono text-[14px] font-normal text-ink-600 retina:border-[0.5px]">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="my-8 overflow-x-auto border border-ink-200 bg-ink-50 p-4">{children}</pre>
          ),
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto border border-ink-200">
              <table className="w-full border-collapse text-[15px] leading-[1.5] tabular-nums">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-ink-100">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-ink-200 px-4 py-3 text-left align-top font-medium text-ink">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-ink-line px-4 py-3 text-left align-top text-ink-600 first:font-medium first:text-ink">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
