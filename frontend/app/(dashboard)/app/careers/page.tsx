'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import {
  useCareers, useUpdateCareers, useSetCareersSlug, checkCareersSlug,
} from '@/hooks/use-careers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { publicConfig } from '@/lib/config';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';

export default function CareersEmbedPage() {
  const { data: careers, isLoading } = useCareers();
  const update = useUpdateCareers();
  const setSlugMut = useSetCareersSlug();

  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [published, setPublished] = useState(false);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (careers && !initialized) {
      setSlug(careers.slug ?? '');
      setPublished(careers.published);
      setAccentColor(careers.accentColor);
      setInitialized(true);
    }
  }, [careers, initialized]);

  useEffect(() => {
    if (!initialized || !careers) return;
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
  }, [slug, initialized, careers]);

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
            Embed your open roles on your own website.
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
                onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Embed code copied'); }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand color */}
      <Card>
        <CardHeader><CardTitle as="h2">Brand color</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor ?? '#7c3aed'}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <Input
              value={accentColor ?? ''}
              onChange={(e) => setAccentColor(e.target.value || null)}
              placeholder="#7c3aed"
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

function SlugIndicator({ status }: { status: SlugStatus }) {
  if (status === 'checking') return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === 'available') return <span className="text-xs font-medium text-success">Available</span>;
  if (status === 'current') return <span className="text-xs text-muted-foreground">Current</span>;
  if (status === 'taken') return <span className="text-xs font-medium text-destructive">Taken</span>;
  if (status === 'invalid') return <span className="text-xs font-medium text-destructive">Unavailable</span>;
  return null;
}
