'use client';

import { useState } from 'react';
import { Download, ListPlus, UserPlus, Trash2, X } from 'lucide-react';
import type { SourcedContactDto } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { downloadContactsCsv } from '@/hooks/use-talent-sourcing';
import { ContactTable } from './contact-table';
import { ContactDrawer } from './contact-drawer';
import { ConvertDialog } from './convert-dialog';
import { AddToListDialog } from './add-to-list-dialog';

/**
 * Shared results surface: the contact table, floating bulk bar, profile drawer,
 * and the convert / add-to-list dialogs. Reused by Search, Contacts, and a
 * list's detail view so every place a contact appears behaves identically.
 */
export function ContactResultsPanel({
  contacts,
  onRemoveFromList,
  footer,
}: {
  contacts: SourcedContactDto[];
  /** When present, rows and the bulk bar gain a "Remove from list" action. */
  onRemoveFromList?: (contactIds: string[]) => void;
  footer?: React.ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [convertIds, setConvertIds] = useState<string[] | null>(null);
  const [listIds, setListIds] = useState<string[] | null>(null);

  const clear = () => setSelectedIds(new Set());
  const exportContacts = async (ids: string[]) => {
    try {
      await downloadContactsCsv(ids);
      toast.success(`Exported ${ids.length} contact${ids.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const drawerIndex = drawerId ? contacts.findIndex((c) => c.id === drawerId) : -1;

  return (
    <>
      <ContactTable
        items={contacts}
        selectedIds={selectedIds}
        onSelect={(id) => setSelectedIds((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        })}
        onSelectAll={() => setSelectedIds((prev) =>
          prev.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)),
        )}
        onOpen={setDrawerId}
        onExport={(id) => exportContacts([id])}
        onConvert={(id) => setConvertIds([id])}
        onAddToList={(id) => setListIds([id])}
        onRemove={onRemoveFromList ? (id) => onRemoveFromList([id]) : undefined}
      />

      {footer}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 shadow-lg">
            <span className="mr-2 text-sm font-medium text-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setListIds(Array.from(selectedIds))}>
              <ListPlus className="size-4" /> Add to list
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConvertIds(Array.from(selectedIds))}>
              <UserPlus className="size-4" /> Add to job
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportContacts(Array.from(selectedIds))}>
              <Download className="size-4" /> Export
            </Button>
            {onRemoveFromList && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { onRemoveFromList(Array.from(selectedIds)); clear(); }}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clear}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ContactDrawer
        contactId={drawerId}
        onOpenChange={(o) => { if (!o) setDrawerId(null); }}
        onExport={(id) => exportContacts([id])}
        onConvert={(id) => setConvertIds([id])}
        onAddToList={(id) => setListIds([id])}
        hasPrev={drawerIndex > 0}
        hasNext={drawerIndex >= 0 && drawerIndex < contacts.length - 1}
        onPrev={() => { if (drawerIndex > 0) setDrawerId(contacts[drawerIndex - 1].id); }}
        onNext={() => { if (drawerIndex >= 0 && drawerIndex < contacts.length - 1) setDrawerId(contacts[drawerIndex + 1].id); }}
      />

      <ConvertDialog
        open={Boolean(convertIds)}
        onOpenChange={(o) => { if (!o) setConvertIds(null); }}
        contactIds={convertIds ?? []}
        onDone={clear}
      />
      <AddToListDialog
        open={Boolean(listIds)}
        onOpenChange={(o) => { if (!o) setListIds(null); }}
        contactIds={listIds ?? []}
        onDone={clear}
      />
    </>
  );
}
