import { Play } from 'lucide-react';
import { Section, SectionIntro } from '../frame';

export function VideoSection() {
  return (
    <Section id="demo">
      <SectionIntro className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">Demo</span>
        <h2 className="mt-4 text-mk-h2 text-ink">
          See it in action.
        </h2>
        <p className="mt-4 max-w-[440px] text-mk-body text-ink-500">
          Watch how Fluxberry AI turns a flood of applications into a clear, ranked pipeline in minutes.
        </p>
      </SectionIntro>

      <div className="px-8 pb-16 sm:px-12 lg:px-20">
        <div className="mk-surface relative aspect-video w-full overflow-hidden rounded-[12px]">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-berry-600 text-white shadow-lg"
            >
              <Play className="size-7 translate-x-0.5" fill="currentColor" />
            </div>
            <span className="text-mk-meta text-ink-400">Product demo coming soon</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
