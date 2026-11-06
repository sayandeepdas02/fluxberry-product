'use client';

import { useState } from 'react';
import { Tag, Plus, Check } from 'lucide-react';
import type { LabelDto } from '@/lib/shared';
import { useLabels, useCreateLabel, useSetApplicationLabels } from '@/hooks/use-labels';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

const SWATCHES = ['#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#64748b', '#0891b2'];

export function LabelChips({ labels }: { labels: LabelDto[] }) {
  if (!labels.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((l) => (
        <span
          key={l.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${l.color}1a`, color: l.color }}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: l.color }} />
          {l.name}
        </span>
      ))}
    </div>
  );
}

export function LabelPicker({ applicationId, selected }: { applicationId: string; selected: LabelDto[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: labels } = useLabels();
  const createLabel = useCreateLabel();
  const setLabels = useSetApplicationLabels();

  const selectedIds = new Set(selected.map((l) => l.id));
  const matches = (labels ?? []).filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = (labels ?? []).some((l) => l.name.toLowerCase() === query.trim().toLowerCase());

  const toggle = (labelId: string) => {
    const next = selectedIds.has(labelId)
      ? selected.filter((l) => l.id !== labelId).map((l) => l.id)
      : [...selected.map((l) => l.id), labelId];
    setLabels.mutate({ applicationId, labelIds: next });
  };

  const createAndApply = async () => {
    const name = query.trim();
    if (!name) return;
    try {
      const color = SWATCHES[(labels?.length ?? 0) % SWATCHES.length];
      const label = await createLabel.mutateAsync({ name, color });
      setLabels.mutate({ applicationId, labelIds: [...selected.map((l) => l.id), label.id] });
      setQuery('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create label');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="size-3.5" /> Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Input
          autoFocus
          placeholder="Add label..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim() && !exactMatch) createAndApply();
          }}
          className="h-8 mb-2"
        />
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {matches.map((l) => (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
            >
              <span className="flex size-4 items-center justify-center">
                {selectedIds.has(l.id) && <Check className="size-3.5" />}
              </span>
              <span className="size-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="flex-1 truncate">{l.name}</span>
            </button>
          ))}
          {matches.length === 0 && !query && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No labels found</p>
          )}
          {query.trim() && !exactMatch && (
            <button
              onClick={createAndApply}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-secondary"
            >
              <Plus className="size-3.5" /> Create &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
