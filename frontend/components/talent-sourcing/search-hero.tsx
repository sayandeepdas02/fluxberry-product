'use client';

import { useState } from 'react';
import { UserSearch, ArrowRight, Clock } from 'lucide-react';
import type { SourcingSearchDto } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const EXAMPLES = [
  'Senior Rust engineer, 4+ years, based in Bangalore',
  'Product designers at Series B startups in London',
  'Staff data engineers who know Spark and dbt, remote US',
  'Engineering managers in fintech, 8+ years, Berlin',
];

export function SearchHero({
  onSubmit,
  loading,
  recentSearches,
  onOpenSearch,
}: {
  onSubmit: (prompt: string) => void;
  loading?: boolean;
  recentSearches?: SourcingSearchDto[];
  onOpenSearch?: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const submit = () => { if (prompt.trim().length >= 3) onSubmit(prompt.trim()); };

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center pt-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UserSearch className="size-6" />
      </div>
      <h2 className="mt-4 text-section-title text-foreground">Find people who haven&apos;t applied yet</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Describe your ideal candidate in plain language. Fluxberry turns it into filters you can review before you search.
      </p>

      <div className="mt-6 w-full">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
          }}
          rows={3}
          placeholder="e.g. Senior Software Engineer with 4+ years of Rust experience, based in Bangalore"
          className="resize-none text-left"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Parsing your prompt is free — you only spend credits when you search.</span>
          <Button onClick={submit} loading={loading} disabled={prompt.trim().length < 3}>
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPrompt(ex)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      {recentSearches && recentSearches.length > 0 && (
        <div className="mt-10 w-full text-left">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" /> Recent searches
          </div>
          <div className="divide-y divide-border rounded-xl border border-border">
            {recentSearches.slice(0, 5).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenSearch?.(s.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
              >
                <span className="truncate text-sm text-foreground">{s.prompt}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{s.fetched} profiles</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
