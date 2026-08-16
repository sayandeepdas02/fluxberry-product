'use client';

import ReactMarkdown from 'react-markdown';

/** Renders trusted markdown (AI job descriptions) with calm prose styles. */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:mt-5 prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground first:prose-headings:mt-0">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
