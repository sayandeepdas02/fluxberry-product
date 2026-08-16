'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { toast } from '@/components/ui/sonner';

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { switchWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const ws = await api.post<WorkspaceDto>('/api/v1/workspaces', { name: name.trim() });
      await queryClient.refetchQueries({ queryKey: ['session'] });
      switchWorkspace(ws.id);
      toast.success('Workspace created');
      setName('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
        </DialogHeader>
        <Field label="Workspace name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} loading={submitting} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
