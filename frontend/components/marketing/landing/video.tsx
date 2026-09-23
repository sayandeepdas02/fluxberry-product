import { Play } from 'lucide-react';

export function VideoSection() {
  return (
    <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Demo</span>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          See it in action.
        </h2>
        <p className="mt-4 max-w-[440px] text-base text-muted-foreground">
          Watch how Fluxberry AI turns a flood of applications into a clear, ranked pipeline in minutes.
        </p>
      </div>

      <div className="mt-12 px-0 sm:px-4 lg:px-12">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            >
              <Play className="size-7 translate-x-0.5" fill="currentColor" />
            </div>
            <span className="text-sm text-muted-foreground">Product demo coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}
