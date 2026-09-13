import Link from 'next/link';
import { Zap, Users, BarChart3, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicConfig } from '@/lib/config';

const features = [
  {
    icon: Zap,
    title: 'AI screening, out of the box',
    description: 'Every applicant is scored and summarised automatically — no manual sifting required.',
  },
  {
    icon: Users,
    title: 'Built for small teams',
    description: 'Collaborative pipelines, referral tracking, and role-based access without the enterprise bloat.',
  },
  {
    icon: GitBranch,
    title: 'Automated workflows',
    description: 'Trigger emails, move candidates, and run assessments based on pipeline stage — set it once.',
  },
  {
    icon: BarChart3,
    title: 'Hiring analytics',
    description: 'Source performance, funnel drop-off, and time-to-hire at a glance across every role.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">{publicConfig.appName}</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          AI-native applicant tracking
        </div>
        <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight">
          Hire faster with less noise
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          {publicConfig.appName} screens every applicant with AI, automates your pipeline, and keeps your whole team aligned — from first application to offer.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Start for free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-border bg-muted/30 p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {publicConfig.appName}</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
