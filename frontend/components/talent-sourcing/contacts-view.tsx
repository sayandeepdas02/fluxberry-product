'use client';

import { useEffect, useState } from 'react';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useContacts } from '@/hooks/use-talent-sourcing';
import { ContactResultsPanel } from './contact-results-panel';

const LIMIT = 25;

export function ContactsView() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState<'all' | 'yes'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useContacts({
    page,
    limit: LIMIT,
    search: search || undefined,
    hasEmail: emailFilter === 'yes' ? true : undefined,
  });
  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search contacts" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={emailFilter} onValueChange={(v) => { setEmailFilter(v as 'all' | 'yes'); setPage(1); }}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            <SelectItem value="yes">Has email</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{total} contacts</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No contacts yet"
          description="People you find through Search are saved here automatically."
        />
      ) : (
        <ContactResultsPanel
          key={`${page}-${search}-${emailFilter}`}
          contacts={contacts}
          footer={
            totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 pt-1 text-sm text-muted-foreground">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null
          }
        />
      )}
    </div>
  );
}
