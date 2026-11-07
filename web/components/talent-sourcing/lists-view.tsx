'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ListChecks, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { useLists, useCreateList } from '@/hooks/use-talent-sourcing';

export function ListsView() {
  const { data: lists, isLoading } = useLists();
  const createList = useCreateList();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = () => {
    if (!name.trim()) return;
    createList.mutate(
      { name: name.trim(), description: description.trim() || undefined, contactIds: [] } as any,
      {
        onSuccess: () => { toast.success('List created'); setOpen(false); setName(''); setDescription(''); },
        onError: () => toast.error('Could not create list'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Talent pools you&apos;ve saved from your searches.</p>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New list</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (lists ?? []).length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title="No lists yet"
          description="Save promising candidates into lists (talent pools), then reach out with a campaign."
          action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New list</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists!.map((l) => (
            <Link key={l.id} href={`/app/talent-sourcing/lists/${l.id}`}>
              <Card className="h-full p-4 transition-colors hover:border-primary/40">
                <div className="font-medium text-foreground">{l.name}</div>
                {l.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> {l.contactCount} contact{l.contactCount !== 1 ? 's' : ''}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New list</DialogTitle></DialogHeader>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Rust engineers" autoFocus />
          </Field>
          <Field label="Description (optional)">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} loading={createList.isPending} disabled={!name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
