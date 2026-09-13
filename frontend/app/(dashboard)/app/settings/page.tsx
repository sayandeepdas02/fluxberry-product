'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import type { WorkspaceDto } from '@fluxberry/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function GeneralSettingsPage() {
  const { currentWorkspace, refreshSession } = useWorkspace();
  const queryClient = useQueryClient();
  const canEdit = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';

  const [name, setName] = useState(currentWorkspace.name);
  const [logoUrl, setLogoUrl] = useState(currentWorkspace.logoUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    refreshSession();
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch<WorkspaceDto>(`/api/v1/workspaces/${currentWorkspace.id}`, {
        name: name.trim(),
      });
      await refresh();
      toast.success('Workspace updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const onLogoFile = async (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPEG, or WEBP image');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo must be under 1MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.set('logo', file);
      const ws = await api.post<WorkspaceDto>(`/api/v1/workspaces/${currentWorkspace.id}/logo`, fd);
      setLogoUrl(ws.logoUrl ?? '');
      await refresh();
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Workspace name">
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </Field>
        <Field label="Logo" hint="Optional. Shown on your public application pages. PNG, JPEG, or WEBP, up to 1MB.">
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Workspace logo" className="size-11 rounded-md border object-contain" />
            )}
            {canEdit && (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                <Upload className="size-4" />
                <span>{uploadingLogo ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
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
