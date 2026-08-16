'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Plus, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import type { CareersPageDto } from '@fluxberry/shared';
import { useCareers, useUpdateCareers, useSetCareersSlug, checkCareersSlug } from '@/hooks/use-careers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { publicConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';

export default function CareersBuilderPage() {
  const { data: careers, isLoading } = useCareers();
  const update = useUpdateCareers();
  const setSlug = useSetCareersSlug();

  const [config, setConfig] = useState<CareersPageDto | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (careers && !config) {
      setConfig(careers);
      setSlugInput(careers.slug ?? '');
    }
  }, [careers, config]);

  useEffect(() => {
    if (!config) return;
    const s = slugInput.trim().toLowerCase();
    if (!s) return setSlugStatus('idle');
    if (s === config.slug) return setSlugStatus('current');
    setSlugStatus('checking');
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const r = await checkCareersSlug(s);
        setSlugStatus(r.available ? 'available' : r.reason?.includes('reserved') || r.reason ? 'invalid' : 'taken');
      } catch {
        setSlugStatus('invalid');
      }
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [slugInput, config]);

  if (isLoading || !config) return <Skeleton className="h-96 w-full" />;

  const set = (patch: Partial<CareersPageDto>) => setConfig((c) => (c ? { ...c, ...patch } : c));
  const publicUrl = config.slug ? `${publicConfig.appUrl}/${config.slug}/careers` : null;
  const embedCode = config.slug
    ? `<iframe src="${publicConfig.appUrl}/${config.slug}/careers/embed" width="100%" height="640" style="border:0" title="Open roles"></iframe>`
    : '';

  const saveConfig = () => {
    update.mutate(
      {
        headline: config.headline,
        tagline: config.tagline,
        about: config.about,
        links: config.links,
        team: config.team,
        jobs: config.jobs,
      },
      { onSuccess: () => toast.success('Careers page saved') },
    );
  };

  const togglePublish = (v: boolean) => {
    set({ published: v });
    update.mutate({ published: v }, {
      onSuccess: () => toast.success(v ? 'Careers page published' : 'Careers page unpublished'),
      onError: () => set({ published: !v }),
    });
  };

  const claimSlug = () => {
    setSlug.mutate(slugInput.trim().toLowerCase(), {
      onSuccess: (r) => { set({ slug: r.slug }); setSlugStatus('current'); toast.success('Careers URL saved'); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save URL'),
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title">Careers page</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your public page listing all open roles.</p>
        </div>
        <div className="flex items-center gap-3">
          {publicUrl && config.published && (
            <Button variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> View live</a>
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            {config.published ? 'Published' : 'Draft'}
            <Switch checked={config.published} onCheckedChange={togglePublish} disabled={!config.slug} />
          </label>
        </div>
      </div>

      {!config.slug && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-[hsl(32_80%_35%)]">
          Choose a URL below, then publish to make your careers page live.
        </div>
      )}

      {/* URL */}
      <Card>
        <CardHeader><CardTitle>Public URL</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">{publicConfig.appUrl}/</span>
            <Input value={slugInput} onChange={(e) => setSlugInput(e.target.value)} placeholder="your-company" className="max-w-[220px]" />
            <span className="shrink-0 text-sm text-muted-foreground">/careers</span>
            <SlugState status={slugStatus} />
          </div>
          <Button
            size="sm"
            onClick={claimSlug}
            loading={setSlug.isPending}
            disabled={slugStatus !== 'available'}
          >
            Save URL
          </Button>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader><CardTitle>Header</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Headline"><Input value={config.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Join us" /></Field>
          <Field label="Tagline"><Input value={config.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="We're building something great." /></Field>
        </CardContent>
      </Card>

      <SectionCard title="About" enabled={config.about.enabled} onToggle={(v) => set({ about: { ...config.about, enabled: v } })}>
        <Textarea rows={4} value={config.about.content} onChange={(e) => set({ about: { ...config.about, content: e.target.value } })} placeholder="Tell candidates about your company." />
      </SectionCard>

      <SectionCard title="Links" enabled={config.links.enabled} onToggle={(v) => set({ links: { ...config.links, enabled: v } })}>
        <div className="space-y-2">
          {config.links.items.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Label" value={l.label} onChange={(e) => set({ links: { ...config.links, items: config.links.items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } })} className="max-w-[160px]" />
              <Input placeholder="https://…" value={l.url} onChange={(e) => set({ links: { ...config.links, items: config.links.items.map((x, j) => j === i ? { ...x, url: e.target.value } : x) } })} />
              <Button variant="ghost" size="icon" onClick={() => set({ links: { ...config.links, items: config.links.items.filter((_, j) => j !== i) } })}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => set({ links: { ...config.links, items: [...config.links.items, { label: '', url: '' }] } })}><Plus className="size-4" /> Add link</Button>
        </div>
      </SectionCard>

      <SectionCard title="Team" enabled={config.team.enabled} onToggle={(v) => set({ team: { ...config.team, enabled: v } })}>
        <div className="space-y-2">
          {config.team.members.map((m, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Name" value={m.name} onChange={(e) => set({ team: { ...config.team, members: config.team.members.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } })} className="max-w-[160px]" />
              <Input placeholder="Role" value={m.role ?? ''} onChange={(e) => set({ team: { ...config.team, members: config.team.members.map((x, j) => j === i ? { ...x, role: e.target.value } : x) } })} />
              <Button variant="ghost" size="icon" onClick={() => set({ team: { ...config.team, members: config.team.members.filter((_, j) => j !== i) } })}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => set({ team: { ...config.team, members: [...config.team.members, { name: '', role: '' }] } })}><Plus className="size-4" /> Add member</Button>
        </div>
      </SectionCard>

      <SectionCard title="Job openings" enabled={config.jobs.enabled} onToggle={(v) => set({ jobs: { ...config.jobs, enabled: v } })}>
        <Field label="Section heading"><Input value={config.jobs.heading} onChange={(e) => set({ jobs: { ...config.jobs, heading: e.target.value } })} /></Field>
        <p className="text-xs text-muted-foreground">Automatically lists all your published jobs.</p>
        {config.slug && (
          <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
            <div className="mb-1.5 text-xs font-medium">Embed just this section on your own site</div>
            <div className="flex items-start gap-2">
              <code className="flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-background p-2 text-xs text-muted-foreground">{embedCode}</code>
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Embed code copied'); }}><Copy className="size-4" /></Button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={saveConfig} loading={update.isPending}>Save changes</Button>
      </div>
    </div>
  );
}

function SlugState({ status }: { status: SlugStatus }) {
  if (status === 'checking') return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === 'available') return <span className="text-xs font-medium text-success">Available</span>;
  if (status === 'current') return <span className="text-xs text-muted-foreground">Current</span>;
  if (status === 'taken') return <span className="text-xs font-medium text-destructive">Taken</span>;
  if (status === 'invalid') return <span className="text-xs font-medium text-destructive">Unavailable</span>;
  return null;
}

function SectionCard({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {enabled ? 'Visible' : 'Hidden'}
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </label>
      </CardHeader>
      <CardContent className={cn(!enabled && 'opacity-50')}>{children}</CardContent>
    </Card>
  );
}
