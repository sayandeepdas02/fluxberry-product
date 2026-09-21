import { Frame } from '../frame';
import { Divider } from '../divider';
import { AnnouncementPill } from '../bits';
import { MkButton } from '../mk-button';
import { PipelineMockup } from '../mockups';

export function Hero({ announcement }: { announcement?: { href: string; title: string } }) {
  return (
    <section className="relative">
      <Frame>
        <div className="flex flex-col items-center pt-14 text-center">
          {announcement && (
            <AnnouncementPill href={announcement.href} tag="New">
              {announcement.title}
            </AnnouncementPill>
          )}

          <h1 className="mt-4 whitespace-nowrap text-mk-hero text-berry-600">
            The #1 AI Native Hiring Platform
          </h1>

          <p className="mt-6 max-w-[480px] text-mk-lead text-ink-500">
            Fluxberry AI is an AI Native hiring tool that is fast, simple.
            <br />
            Built for founders &amp; hiring managers.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <MkButton href="/sign-up">Get started</MkButton>
            <MkButton href="#screening" variant="secondary">
              Watch Demo
            </MkButton>
          </div>
        </div>

        <div className="relative mt-16">
          <Divider />
          <figure className="m-0 px-0 pb-0 pt-8 sm:px-10 lg:px-20">
            {/* Corner marks straddle the panel's own edges, like cut marks on a
                drawing — so they wrap the mockup, not the padded column. */}
            <div className="mk-corners relative">
              <PipelineMockup />
              <span />
              <span />
              <span />
              <span />
            </div>
            {/* chanhdai.com's figure-caption convention: the rule above it ties
                the caption to the plate, and the number makes the page read as a
                document rather than a brochure. */}
            <figcaption className="mt-8 border-t border-ink-line px-4 py-3 text-center font-mono text-[11px] text-ink-400">
              <span className="mr-2 tracking-[0.08em] text-ink-300">FIG. 1</span>
              Senior Frontend Engineer, after screening has run.
            </figcaption>
          </figure>
        </div>
      </Frame>
    </section>
  );
}
