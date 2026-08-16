import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { publicConfig } from '@/lib/config';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-sm font-medium text-muted-foreground">{publicConfig.appName}</div>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Hiring, made simple.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Create a job, share a link, and let AI screen every applicant — without the enterprise
        clutter. {publicConfig.appName} keeps hiring calm and fast.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
