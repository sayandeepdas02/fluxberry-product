import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import Link from 'next/link';
import { slugifyHeading } from '@/lib/blog-types';
import { publicImageSize } from '@/lib/image-size';

/**
 * Article body. Styles are written as an explicit component map rather than a
 * `prose` class so they follow the landing page: Inter 18/30 body in the
 * landing's greys, Manrope headings, blue links and list markers, and the
 * soft 15px-radius panels for code and tables.
 *
 * Heading ids come from the same `slugifyHeading` the table of contents uses, so
 * the minimap and the anchors can never drift apart.
 *
 * Images are written `![alt text](/blog/<slug>/<descriptive-name>.webp "Caption")`
 * and render as a figure: the alt text describes the image for screen readers
 * and image search, the optional title becomes the visible caption. Local files
 * go through next/image with their real size read at build time.
 */

/** A paragraph holding nothing but one image, which renders as a figure instead of inside a <p>. */
function isImageOnly(node: unknown): boolean {
  const children = (node as { children?: { type: string; tagName?: string; value?: string }[] } | undefined)?.children;
  if (!children) return false;
  const meaningful = children.filter((child) => !(child.type === 'text' && !child.value?.trim()));
  return meaningful.length === 1 && meaningful[0].tagName === 'img';
}

function Figure({ src, alt, title }: { src: string; alt: string; title?: string }) {
  const size = publicImageSize(src);
  const imageClass = 'h-auto w-full rounded-[15px] border border-lp-gray-150 bg-lp-gray-50';
  return (
    <figure className="my-10">
      {size ? (
        <Image
          src={src}
          alt={alt}
          width={size.width}
          height={size.height}
          sizes="(min-width: 760px) 680px, 100vw"
          className={imageClass}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className={imageClass} />
      )}
      {title && (
        <figcaption className="mt-3 text-center text-[14px] leading-[22px] text-lp-gray-500">{title}</figcaption>
      )}
    </figure>
  );
}

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
    <div className="font-inter text-[18px] leading-[30px] text-lp-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2
              id={nextHeadingId(children)}
              className="mb-4 mt-12 scroll-mt-28 font-manrope text-[28px] font-semibold leading-[1.2] tracking-[-0.028em] text-black"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={nextHeadingId(children)}
              className="mb-3 mt-9 scroll-mt-28 font-manrope text-[22px] font-semibold leading-[1.25] tracking-[-0.02em] text-black"
            >
              {children}
            </h3>
          ),
          p: ({ node, children }) => (isImageOnly(node) ? <>{children}</> : <p className="mb-5">{children}</p>),
          img: ({ src, alt, title }) =>
            typeof src === 'string' ? <Figure src={src} alt={alt ?? ''} title={title ?? undefined} /> : null,
          ul: ({ children }) => (
            <ul className="mb-5 flex list-disc flex-col gap-2.5 pl-6 marker:text-lp-blue-400">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-5 flex list-decimal flex-col gap-2.5 pl-6 marker:font-manrope marker:font-semibold marker:text-lp-blue-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          a: ({ href, children }) => {
            const target = href ?? '#';
            const isInternal = target.startsWith('/') || target.startsWith('#');
            const className =
              'text-lp-blue-500 underline decoration-lp-blue-500/30 underline-offset-[3px] transition-colors hover:text-lp-blue-600 hover:decoration-lp-blue-600';
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
          strong: ({ children }) => <strong className="font-semibold text-black">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-8 border-l-2 border-lp-blue-400 py-1 pl-6 font-manrope text-[20px] font-medium not-italic leading-[1.45] tracking-[-0.005em] text-black [&>p]:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-lp-gray-150" />,
          code: ({ children, className }) =>
            className?.includes('language-') ? (
              <code className="block font-mono text-[14px] leading-6 text-black">{children}</code>
            ) : (
              <code className="whitespace-pre-wrap rounded-[5px] bg-lp-gray-100 px-1.5 py-0.5 font-mono text-[15px] text-black">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="my-8 overflow-x-auto rounded-[15px] bg-lp-gray-50 p-5">{children}</pre>
          ),
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto rounded-[15px] border border-lp-gray-150 bg-white">
              <table className="w-full border-collapse text-[15px] leading-[1.5] tabular-nums [&_tr:last-child_td]:border-b-0">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-lp-gray-50">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-lp-gray-150 px-4 py-3 text-left align-top font-manrope text-[14px] font-semibold text-black">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-lp-gray-100 px-4 py-3 text-left align-top text-lp-gray-700 first:font-semibold first:text-black">
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
