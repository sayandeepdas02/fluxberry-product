'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import { useList, useListMembers, useRemoveFromList, useDeleteList } from '@/hooks/use-talent-sourcing';
import { ContactResultsPanel } from './contact-results-panel';

export function ListDetail({ listId }: { listId: string }) {
  const router = useRouter();
  const { data: list, isLoading } = useList(listId);
  const { data: members, isLoading: membersLoading } = useListMembers(listId);
  const removeFromList = useRemoveFromList();
  const deleteList = useDeleteList();

  const onRemove = async (contactIds: string[]) => {
    await Promise.allSettled(contactIds.map((contactId) => removeFromList.mutateAsync({ listId, contactId })));
    toast.success(`Removed ${contactIds.length} contact${contactIds.length !== 1 ? 's' : ''}`);
  };

  const onDelete = () => {
    deleteList.mutate(listId, {
      onSuccess: () => { toast.success('List deleted'); router.push('/app/talent-sourcing/lists'); },
      onError: () => toast.error('Could not delete list'),
    });
  };

  return (
    <div className="space-y-4">
      <Link href="/app/talent-sourcing/lists" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All lists
      </Link>

      {isLoading || !list ? (
        <Skeleton className="h-10 w-64" />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-section-title text-foreground">{list.name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" /> {list.contactCount} contact{list.contactCount !== 1 ? 's' : ''}
            </div>
            {list.description && <p className="mt-1 text-sm text-muted-foreground">{list.description}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={onDelete} loading={deleteList.isPending}>
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      )}

      {membersLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (members ?? []).length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="This list is empty"
          description="Add contacts from Search or the Contacts page to build up this talent pool."
        />
      ) : (
        <ContactResultsPanel contacts={members ?? []} onRemoveFromList={onRemove} />
      )}
    </div>
  );
}
