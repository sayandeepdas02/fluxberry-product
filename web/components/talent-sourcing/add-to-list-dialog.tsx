'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useLists, useCreateList, useAddToList } from '@/hooks/use-talent-sourcing';

/** Add contacts to an existing talent pool, or spin up a new one. */
export function AddToListDialog({
  open,
  onOpenChange,
  contactIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactIds: string[];
  onDone?: () => void;
}) {
  const { data: lists } = useLists();
  const createList = useCreateList();
  const addToList = useAddToList();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) { setSelected(null); setCreating(false); setNewName(''); }
  }, [open]);

  const busy = createList.isPending || addToList.isPending;

  const run = async () => {
    try {
      if (creating) {
        if (!newName.trim()) return;
        await createList.mutateAsync({ name: newName.trim(), contactIds } as any);
      } else {
        if (!selected) return;
        await addToList.mutateAsync({ listId: selected, contactIds });
      }
      toast.success(`Added ${contactIds.length} contact${contactIds.length !== 1 ? 's' : ''} to the list`);
      onOpenChange(false);
      onDone?.();
    } catch {
      toast.error('Could not add to list');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {contactIds.length > 1 ? `${contactIds.length} contacts` : 'contact'} to a list</DialogTitle>
        </DialogHeader>

        {creating ? (
          <Field label="New list name">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rust engineers — Q3" autoFocus />
          </Field>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {(lists ?? []).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No lists yet — create one.</p>
            )}
            {(lists ?? []).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelected(l.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  selected === l.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                )}
              >
                <span className="truncate font-medium text-foreground">{l.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{l.contactCount}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-4" /> Create a new list
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} loading={busy} disabled={creating ? !newName.trim() : !selected}>
            {creating ? 'Create & add' : 'Add to list'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
