'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceDto } from '@fluxberry/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

export default function GeneralSettingsPage() {
  const { currentWorkspace, refreshSession } = useWorkspace();
  const queryClient = useQueryClient();
  const canEdit = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';

  const [name, setName] = useState(currentWorkspace.name);
  const [logoUrl, setLogoUrl] = useState(currentWorkspace.logoUrl ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch<WorkspaceDto>(`/api/v1/workspaces/${currentWorkspace.id}`, {
        name: name.trim(),
        logoUrl,
      });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      refreshSession();
      toast.success('Workspace updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Workspace name">
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Logo URL" hint="Optional. Shown on your public application pages.">
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            disabled={!canEdit}
          />
        </Field>
        <div className="flex items-center gap-3 pt-1 text-sm text-muted-foreground">
          <span>Plan:</span>
          <span className="font-medium capitalize text-foreground">
            {currentWorkspace.plan.toLowerCase()}
          </span>
        </div>
        {canEdit && (
          <div className="pt-2">
            <Button onClick={save} loading={saving} disabled={!name.trim()}>
              Save changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
