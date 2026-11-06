'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import {
  useCareers, useUpdateCareers, useSetCareersSlug, checkCareersSlug,
} from '@/hooks/use-careers';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { publicConfig } from '@/lib/config';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';

export default function CareersEmbedPage() {
  const { currentWorkspace } = useWorkspace();
  const { data: careers, isLoading } = useCareers();
  const update = useUpdateCareers();
  const setSlugMut = useSetCareersSlug();

  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [published, setPublished] = useState(false);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [tagline, setTagline] = useState('');
  const [aboutEnabled, setAboutEnabled] = useState(true);
  const [aboutContent, setAboutContent] = useState('');
  const [jobsHeading, setJobsHeading] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  useEffect(() => {
    if (careers && initializedFor !== currentWorkspace.id) {
      setSlug(careers.slug ?? '');
      setPublished(careers.published);
      setAccentColor(careers.accentColor);
      setHeadline(careers.headline);
      setTagline(careers.tagline);
      setAboutEnabled(careers.about.enabled);
      setAboutContent(careers.about.content);
      setJobsHeading(careers.jobs.heading);
      setInitializedFor(currentWorkspace.id);
    }
  }, [careers, initializedFor, currentWorkspace.id]);

  useEffect(() => {
    if (!initializedFor || !careers) return;
    const s = slug.trim().toLowerCase();
    if (!s) return setSlugStatus('idle');
    if (s === careers.slug) return setSlugStatus('current');
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
  }, [slug, initializedFor, careers]);

  if (isLoading || !careers) return <Skeleton className="h-96 w-full" />;

  const currentSlug = careers.slug;
  const publicUrl = currentSlug ? `${publicConfig.appUrl}/${currentSlug}/careers` : null;
  const embedCode = currentSlug
    ? `<iframe src="${publicConfig.appUrl}/${currentSlug}/careers/embed" width="100%" height="800" style="border:none" title="Job openings"></iframe>`
    : '';

  const claimSlug = () => {
    setSlugMut.mutate(slug.trim().toLowerCase(), {
      onSuccess: () => { setSlugStatus('current'); toast.success('URL saved'); },
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not save URL'),
    });
  };

  const togglePublish = (v: boolean) => {
    setPublished(v);
    update.mutate({ published: v }, {
      onSuccess: () => toast.success(v ? 'Embed is now live' : 'Embed is now hidden'),
      onError: () => { setPublished(!v); toast.error('Could not update'); },
    });
  };

  const saveContent = () => {
    if (headline.length > LIMITS.headline || tagline.length > LIMITS.tagline || aboutContent.length > LIMITS.about || jobsHeading.length > LIMITS.jobsHeading) {
      toast.error('Some fields are too long');
      return;
    }
    update.mutate(
      {
        headline: headline.trim(),
        tagline: tagline.trim(),
        about: { enabled: aboutEnabled, content: aboutContent.trim() },
        jobs: { heading: jobsHeading.trim() || 'Open Positions' },
      },
      {
        onSuccess: () => toast.success('Page content saved'),
        onError: () => toast.error('Could not save page content'),
      },
    );
  };

  const saveColor = () => {
    if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      toast.error('Use a valid hex color like #7c3aed');
      return;
    }
    update.mutate({ accentColor: accentColor || null }, {
      onSuccess: () => toast.success('Brand color saved'),
      onError: () => toast.error('Could not save color'),
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title">Careers page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize your hosted careers page and embed your open roles.
          </p>
        </div>
        <label className="flex flex-col items-end gap-1 text-sm font-medium">
          <span className="flex items-center gap-2">
            {published ? 'Live' : 'Hidden'}
            <Switch checked={published} onCheckedChange={togglePublish} disabled={!currentSlug} />
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {published ? 'Visible to candidates' : 'Not visible — enable to go live'}
          </span>
        </label>
      </div>

      {!currentSlug && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-[hsl(32_80%_35%)]">
          Set a URL below to generate your embed code.
        </div>
      )}

      {/* URL */}
      <Card>
        <CardHeader><CardTitle as="h2">Public URL</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">{publicConfig.appUrl}/</span>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="your-company" className="max-w-[220px]" />
            <span className="shrink-0 text-sm text-muted-foreground">/careers</span>
            <SlugIndicator status={slugStatus} />
          </div>
          <Button size="sm" onClick={claimSlug} loading={setSlugMut.isPending} disabled={slugStatus !== 'available'}>
            Save URL
          </Button>
        </CardContent>
      </Card>

      {/* Embed code */}
      {currentSlug && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle as="h2">Embed code</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={publicUrl!} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> Preview
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Paste this snippet into your website to show your open roles.
            </p>
            <div className="flex items-start gap-2">
              <code className="flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                {embedCode}
              </code>
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy embed code"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode)
                    .then(() => toast.success('Embed code copied'))
                    .catch(() => toast.error('Could not copy embed code'));
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page content */}
      <Card>
        <CardHeader><CardTitle as="h2">Page content</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Shown on your hosted careers page above your open roles. The embed shows jobs only.
          </p>
          <Field id="careers-tagline" label="Eyebrow" hint="Optional short line above the headline, e.g. “Careers”." value={tagline} max={LIMITS.tagline}>
            <Input id="careers-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Careers" />
          </Field>
          <Field id="careers-headline" label="Headline" value={headline} max={LIMITS.headline}>
            <Input
              id="careers-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Join a team that strives to do their best work every day."
            />
          </Field>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="careers-about-toggle">Description</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {aboutEnabled ? 'Shown' : 'Hidden'}
                <Switch id="careers-about-toggle" checked={aboutEnabled} onCheckedChange={setAboutEnabled} />
              </label>
            </div>
            <MarkdownEditor
              value={aboutContent}
              onChange={setAboutContent}
              ariaLabel="Careers page description"
              placeholder="Tell candidates who you are, where you're headed, and how you work…"
              minHeight={220}
            />
            <p className={`text-right text-xs ${aboutContent.length > LIMITS.about ? 'text-destructive' : 'text-muted-foreground'}`}>
              {aboutContent.length}/{LIMITS.about}
            </p>
          </div>
          <Field id="careers-jobs-heading" label="Jobs section heading" value={jobsHeading} max={LIMITS.jobsHeading}>
            <Input id="careers-jobs-heading" value={jobsHeading} onChange={(e) => setJobsHeading(e.target.value)} placeholder="Open Positions" />
          </Field>
          <Button size="sm" onClick={saveContent} loading={update.isPending}>
            Save content
          </Button>
        </CardContent>
      </Card>

      {/* Brand color */}
      <Card>
        <CardHeader><CardTitle as="h2">Brand color</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor ?? '#7c3aed'}
              onChange={(e) => setAccentColor(e.target.value)}
              aria-label="Brand color picker"
              className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <Input
              value={accentColor ?? ''}
              onChange={(e) => setAccentColor(e.target.value || null)}
              placeholder="#7c3aed"
              aria-label="Brand color hex value"
              className="max-w-[120px] font-mono text-sm"
            />
            {accentColor && (
              <Button variant="ghost" size="sm" onClick={() => setAccentColor(null)}>
                Reset
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Used for job title links in the embed. Defaults to purple if not set.
          </p>
          <Button size="sm" className="mt-3" onClick={saveColor} loading={update.isPending}>
            Save color
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const LIMITS = { headline: 120, tagline: 280, about: 4000, jobsHeading: 80 };

function Field({ id, label, hint, value, max, children }: { id: string; label: string; hint?: string; value: string; max: number; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className={`text-xs ${value.length > max ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}/{max}</span>
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SlugIndicator({ status }: { status: SlugStatus }) {
  if (status === 'checking') return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === 'available') return <span className="text-xs font-medium text-success">Available</span>;
  if (status === 'current') return <span className="text-xs text-muted-foreground">Current</span>;
  if (status === 'taken') return <span className="text-xs font-medium text-destructive">Taken</span>;
  if (status === 'invalid') return <span className="text-xs font-medium text-destructive">Unavailable</span>;
  return null;
}
