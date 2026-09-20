'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ExternalLink, Plus, Trash2, Copy, Loader2, Eye,
  ChevronUp, ChevronDown, GripVertical, ImagePlus, X,
} from 'lucide-react';
import { SECTION_KEYS } from '@fluxberry/shared';
import type { CareersPageDto, CareersLink, CareersTeamMember, CareersBenefit, SectionKey } from '@fluxberry/shared';
import {
  useCareers, useUpdateCareers, useSetCareersSlug,
  useGeneratePreviewToken, useUploadCoverImage, checkCareersSlug,
} from '@/hooks/use-careers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { EmojiPicker } from '@/components/careers/emoji-picker';
import { publicConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';

type IdLink = CareersLink & { _id: string };
type IdMember = CareersTeamMember & { _id: string };
type IdBenefit = CareersBenefit & { _id: string };

let _counter = 0;
function uid() { return `_${++_counter}_${Math.random().toString(36).slice(2, 8)}`; }
function withIds<T>(items: T[]): (T & { _id: string })[] { return items.map((it) => ({ ...it, _id: uid() })); }
function stripIds<T extends { _id: string }>(items: T[]): Omit<T, '_id'>[] { return items.map(({ _id, ...rest }) => rest as Omit<T, '_id'>); }

const SECTION_LABELS: Record<SectionKey, string> = {
  about: 'About',
  links: 'Links',
  team: 'Team',
  jobs: 'Job openings',
  benefits: 'Benefits & Perks',
};

export default function CareersBuilderPage() {
  const { data: careers, isLoading } = useCareers();
  const update = useUpdateCareers();
  const setSlugMut = useSetCareersSlug();
  const previewMut = useGeneratePreviewToken();
  const coverUpload = useUploadCoverImage();

  const [config, setConfig] = useState<CareersPageDto | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [links, setLinks] = useState<IdLink[]>([]);
  const [members, setMembers] = useState<IdMember[]>([]);
  const [benefits, setBenefits] = useState<IdBenefit[]>([]);

  const coverInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (careers && !config) {
      setConfig(careers);
      setSlugInput(careers.slug ?? '');
      setLinks(withIds(careers.links.items));
      setMembers(withIds(careers.team.members));
      setBenefits(withIds(careers.benefits.items));
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
    const color = config.accentColor;
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      toast.error('Brand color must be a valid hex code like #7c3aed');
      return;
    }
    update.mutate(
      {
        headline: config.headline,
        tagline: config.tagline,
        about: config.about,
        links: { enabled: config.links.enabled, items: stripIds(links) as CareersLink[] },
        team: { enabled: config.team.enabled, members: stripIds(members) as CareersTeamMember[] },
        jobs: config.jobs,
        benefits: { enabled: config.benefits.enabled, items: stripIds(benefits) as CareersBenefit[] },
        sectionOrder: config.sectionOrder,
        accentColor: color || null,
        coverImageUrl: config.coverImageUrl,
      },
      {
        onSuccess: () => toast.success('Your careers page changes are saved'),
        onError: () => toast.error('Could not save changes — please try again'),
      },
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
    setSlugMut.mutate(slugInput.trim().toLowerCase(), {
      onSuccess: (r) => { set({ slug: r.slug }); setSlugStatus('current'); toast.success('Careers URL saved'); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save URL'),
    });
  };

  const openPreview = () => {
    if (!publicUrl) return;
    previewMut.mutate(undefined, {
      onSuccess: ({ token }) => window.open(`${publicUrl}?preview=${token}`, '_blank'),
      onError: () => toast.error('Could not generate preview link'),
    });
  };

  // --- Section reordering ---
  const moveSection = (key: SectionKey, dir: -1 | 1) => {
    const order = [...config.sectionOrder];
    const idx = order.indexOf(key);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    set({ sectionOrder: order });
  };

  // --- DnD for links ---
  const onDragEndLinks = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLinks((prev) => {
      const from = prev.findIndex((l) => l._id === active.id);
      const to = prev.findIndex((l) => l._id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const onDragEndMembers = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setMembers((prev) => {
      const from = prev.findIndex((m) => m._id === active.id);
      const to = prev.findIndex((m) => m._id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const onDragEndBenefits = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBenefits((prev) => {
      const from = prev.findIndex((b) => b._id === active.id);
      const to = prev.findIndex((b) => b._id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  // --- Cover image upload ---
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Cover image must be under 2MB'); return; }
    coverUpload.mutate(file, {
      onSuccess: (page) => { set({ coverImageUrl: page.coverImageUrl }); toast.success('Cover image uploaded'); },
      onError: () => toast.error('Could not upload cover image'),
    });
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const removeCover = () => set({ coverImageUrl: null });

  // --- Ensure benefits key in sectionOrder when toggling on ---
  const toggleBenefits = (v: boolean) => {
    const order = [...config.sectionOrder];
    if (v && !order.includes('benefits')) order.push('benefits');
    set({ benefits: { ...config.benefits, enabled: v }, sectionOrder: order });
  };

  // --- Section renderers ---
  const sectionRenderers: Record<SectionKey, React.ReactNode> = {
    about: (
      <SectionCard
        key="about" title="About"
        enabled={config.about.enabled}
        onToggle={(v) => set({ about: { ...config.about, enabled: v } })}
        canMoveUp={config.sectionOrder.indexOf('about') > 0}
        canMoveDown={config.sectionOrder.indexOf('about') < config.sectionOrder.length - 1}
        onMoveUp={() => moveSection('about', -1)}
        onMoveDown={() => moveSection('about', 1)}
      >
        <Textarea rows={4} value={config.about.content} onChange={(e) => set({ about: { ...config.about, content: e.target.value } })} placeholder="Tell candidates about your company." />
      </SectionCard>
    ),

    links: (
      <SectionCard
        key="links" title="Links"
        enabled={config.links.enabled}
        onToggle={(v) => set({ links: { ...config.links, enabled: v } })}
        canMoveUp={config.sectionOrder.indexOf('links') > 0}
        canMoveDown={config.sectionOrder.indexOf('links') < config.sectionOrder.length - 1}
        onMoveUp={() => moveSection('links', -1)}
        onMoveDown={() => moveSection('links', 1)}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndLinks}>
          <SortableContext items={links.map((l) => l._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {links.map((l, i) => (
                <SortableRow key={l._id} id={l._id}>
                  <Input placeholder="Label" value={l.label} onChange={(e) => setLinks((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="max-w-[160px]" />
                  <Input placeholder="https://…" value={l.url} onChange={(e) => setLinks((prev) => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLinks((prev) => [...prev, { _id: uid(), label: '', url: '' }])}><Plus className="size-4" /> Add link</Button>
      </SectionCard>
    ),

    team: (
      <SectionCard
        key="team" title="Team"
        enabled={config.team.enabled}
        onToggle={(v) => set({ team: { ...config.team, enabled: v } })}
        canMoveUp={config.sectionOrder.indexOf('team') > 0}
        canMoveDown={config.sectionOrder.indexOf('team') < config.sectionOrder.length - 1}
        onMoveUp={() => moveSection('team', -1)}
        onMoveDown={() => moveSection('team', 1)}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndMembers}>
          <SortableContext items={members.map((m) => m._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {members.map((m, i) => (
                <SortableRow key={m._id} id={m._id}>
                  <Input placeholder="Name" value={m.name} onChange={(e) => setMembers((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="max-w-[160px]" />
                  <Input placeholder="Role" value={m.role ?? ''} onChange={(e) => setMembers((prev) => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setMembers((prev) => prev.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setMembers((prev) => [...prev, { _id: uid(), name: '', role: '' }])}><Plus className="size-4" /> Add member</Button>
      </SectionCard>
    ),

    jobs: (
      <SectionCard
        key="jobs" title="Job openings"
        enabled={config.jobs.enabled}
        onToggle={(v) => set({ jobs: { ...config.jobs, enabled: v } })}
        canMoveUp={config.sectionOrder.indexOf('jobs') > 0}
        canMoveDown={config.sectionOrder.indexOf('jobs') < config.sectionOrder.length - 1}
        onMoveUp={() => moveSection('jobs', -1)}
        onMoveDown={() => moveSection('jobs', 1)}
      >
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
    ),

    benefits: (
      <SectionCard
        key="benefits" title="Benefits & Perks"
        enabled={config.benefits.enabled}
        onToggle={toggleBenefits}
        canMoveUp={config.sectionOrder.indexOf('benefits') > 0}
        canMoveDown={config.sectionOrder.indexOf('benefits') < config.sectionOrder.length - 1}
        onMoveUp={() => moveSection('benefits', -1)}
        onMoveDown={() => moveSection('benefits', 1)}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndBenefits}>
          <SortableContext items={benefits.map((b) => b._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {benefits.map((b, i) => (
                <SortableRow key={b._id} id={b._id}>
                  <EmojiPicker value={b.emoji} onChange={(emoji) => setBenefits((prev) => prev.map((x, j) => j === i ? { ...x, emoji } : x))} />
                  <Input placeholder="Benefit name" value={b.label} onChange={(e) => setBenefits((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="max-w-[180px]" />
                  <Input placeholder="Short description (optional)" value={b.description ?? ''} onChange={(e) => setBenefits((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setBenefits((prev) => prev.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button
          variant="ghost" size="sm" className="mt-2"
          disabled={benefits.length >= 12}
          onClick={() => setBenefits((prev) => [...prev, { _id: uid(), emoji: '🎯', label: '', description: '' }])}
        >
          <Plus className="size-4" /> Add benefit
        </Button>
      </SectionCard>
    ),
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title">Careers page</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your public page listing all open roles.</p>
        </div>
        <div className="flex items-center gap-3">
          {publicUrl && (
            <Button variant="outline" size="sm" onClick={openPreview} loading={previewMut.isPending}>
              <Eye className="size-4" /> Preview
            </Button>
          )}
          {publicUrl && config.published && (
            <>
              <Button variant="outline" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> View live</a>
              </Button>
              <Button
                variant="outline" size="icon"
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('URL copied'); }}
              >
                <Copy className="size-4" />
              </Button>
            </>
          )}
          <label className="flex flex-col items-end gap-1 text-sm font-medium">
            <span className="flex items-center gap-2">
              {config.published ? 'Published' : 'Draft'}
              <Switch checked={config.published} onCheckedChange={togglePublish} disabled={!config.slug} />
            </span>
            <span className="text-xs font-normal text-muted-foreground">Visible to candidates at your public URL</span>
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
        <CardHeader><CardTitle as="h2">Public URL</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">{publicConfig.appUrl}/</span>
            <Input value={slugInput} onChange={(e) => setSlugInput(e.target.value)} placeholder="your-company" className="max-w-[220px]" />
            <span className="shrink-0 text-sm text-muted-foreground">/careers</span>
            <SlugState status={slugStatus} />
          </div>
          <Button size="sm" onClick={claimSlug} loading={setSlugMut.isPending} disabled={slugStatus !== 'available'}>
            Save URL
          </Button>
        </CardContent>
      </Card>

      {/* Cover image */}
      <Card>
        <CardHeader><CardTitle as="h2">Cover image</CardTitle></CardHeader>
        <CardContent>
          {config.coverImageUrl ? (
            <div className="relative overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.coverImageUrl} alt="Cover" className="h-36 w-full object-cover" />
              <Button
                variant="outline" size="icon"
                className="absolute right-2 top-2 bg-background/80"
                onClick={removeCover}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex h-28 w-full items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              {coverUpload.isPending ? <Loader2 className="size-5 animate-spin" /> : <><ImagePlus className="mr-2 size-5" /> Upload cover image</>}
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCoverUpload} />
          <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPEG, or WebP. Max 2MB. Displayed as a hero behind the page header.</p>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader><CardTitle as="h2">Header</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Headline"><Input value={config.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Join us" /></Field>
          <Field label="Tagline"><Input value={config.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="We're building something great." /></Field>
        </CardContent>
      </Card>

      {/* Brand color */}
      <Card>
        <CardHeader><CardTitle as="h2">Brand color</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.accentColor ?? '#7c3aed'}
              onChange={(e) => set({ accentColor: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <Input
              value={config.accentColor ?? ''}
              onChange={(e) => set({ accentColor: e.target.value || null })}
              placeholder="#7c3aed"
              className="max-w-[120px] font-mono text-sm"
            />
            {config.accentColor && (
              <Button variant="ghost" size="sm" onClick={() => set({ accentColor: null })}>
                Reset to default
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Used for CTAs, heading accents, and the cover overlay tint.</p>
        </CardContent>
      </Card>

      {/* Dynamic sections — render ordered keys, then any missing keys so new sections are always reachable */}
      {[...config.sectionOrder, ...SECTION_KEYS.filter((k) => !config.sectionOrder.includes(k))]
        .map((key) => sectionRenderers[key])}

      <div className="flex justify-end">
        <Button onClick={saveConfig} loading={update.isPending}>Save changes</Button>
      </div>
    </div>
  );
}

// --- Helper components ---

function SlugState({ status }: { status: SlugStatus }) {
  if (status === 'checking') return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === 'available') return <span className="text-xs font-medium text-success">Available</span>;
  if (status === 'current') return <span className="text-xs text-muted-foreground">Current</span>;
  if (status === 'taken') return <span className="text-xs font-medium text-destructive">Taken</span>;
  if (status === 'invalid') return <span className="text-xs font-medium text-destructive">Unavailable</span>;
  return null;
}

function SectionCard({
  title, enabled, onToggle, children,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
}: {
  title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
  canMoveUp?: boolean; canMoveDown?: boolean; onMoveUp?: () => void; onMoveDown?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button" disabled={!canMoveUp} onClick={onMoveUp}
              className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button" disabled={!canMoveDown} onClick={onMoveDown}
              className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
          <CardTitle as="h2">{title}</CardTitle>
        </div>
        <label className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            {enabled ? 'Visible' : 'Hidden'}
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </span>
          <span className="text-[11px]">Show this section on your public careers page</span>
        </label>
      </CardHeader>
      <CardContent className={cn(!enabled && 'opacity-50')}>{children}</CardContent>
    </Card>
  );
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex gap-2', isDragging && 'z-10 opacity-90')}
    >
      <button
        type="button" {...attributes} {...listeners}
        className="mt-2 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      {children}
    </div>
  );
}
