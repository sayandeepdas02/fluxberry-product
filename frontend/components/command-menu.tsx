'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Briefcase, Users, Plus, BarChart3, Search } from 'lucide-react';
import { useJobs } from '@/hooks/use-jobs';
import { useCandidates } from '@/hooks/use-candidates';
import { cn } from '@/lib/utils';

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const jobsQuery = useJobs({ status: 'all' });
  const candidatesQuery = useCandidates({ search: query || undefined, limit: 5 });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
  };

  if (!open) return null;

  const matchingJobs = (jobsQuery.data ?? []).filter(
    (j) => !query || j.title.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 5);

  const candidates = candidatesQuery.data?.items ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onPointerDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search jobs, candidates…"
              className="flex-1 bg-transparent py-3 pl-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-xs text-muted-foreground">Esc</kbd>
          </div>
          <Command.List className="max-h-96 overflow-y-auto py-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results
            </Command.Empty>

            <CommandSection heading="Quick actions">
              <CommandItem icon={<Plus className="size-4" />} label="New job" onSelect={() => go('/app/jobs/new')} />
              <CommandItem icon={<BarChart3 className="size-4" />} label="Analytics" onSelect={() => go('/app/analytics')} />
            </CommandSection>

            {matchingJobs.length > 0 && (
              <CommandSection heading="Jobs">
                {matchingJobs.map((j) => (
                  <CommandItem
                    key={j.id}
                    icon={<Briefcase className="size-4" />}
                    label={j.title}
                    hint={j.status}
                    onSelect={() => go(`/app/jobs/${j.id}`)}
                  />
                ))}
              </CommandSection>
            )}

            {candidates.length > 0 && (
              <CommandSection heading="Candidates">
                {candidates.map((c) => (
                  <CommandItem
                    key={c.applicationId}
                    icon={<Users className="size-4" />}
                    label={c.name}
                    hint={c.email}
                    onSelect={() => go(`/app/candidates/${c.candidateId}`)}
                  />
                ))}
              </CommandSection>
            )}

            <CommandSection heading="Navigate">
              <CommandItem icon={<Users className="size-4" />} label="All candidates" onSelect={() => go('/app/candidates')} />
              <CommandItem icon={<Briefcase className="size-4" />} label="All jobs" onSelect={() => go('/app/jobs')} />
            </CommandSection>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group heading={heading} className="[&>[cmdk-group-heading]]:px-3 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-medium [&>[cmdk-group-heading]]:text-muted-foreground">
      {children}
    </Command.Group>
  );
}

function CommandItem({
  icon, label, hint, onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm',
        'aria-selected:bg-accent aria-selected:text-foreground',
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Command.Item>
  );
}
