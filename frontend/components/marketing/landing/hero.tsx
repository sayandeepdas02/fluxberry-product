import { Frame } from '../frame';
import { MkButton } from '../mk-button';
import { PipelineMockup } from '../mockups';

export function Hero() {
  return (
    <section
      className="relative"
      style={{ backgroundImage: 'url(/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <Frame>
        <div className="flex flex-col items-center pt-14 text-center">
          <h1 className="mt-4 text-mk-hero text-berry-600 md:whitespace-nowrap">
            The #1 AI Native Hiring Platform
          </h1>

          <p className="mt-6 max-w-[480px] text-mk-lead text-ink-500">
            Fluxberry AI is an AI Native hiring tool that is fast, simple.
            <br />
            Built for founders &amp; hiring managers.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <MkButton href="/sign-up">Get started</MkButton>
            <MkButton href="#demo" variant="secondary">
              Watch Demo
            </MkButton>
          </div>
        </div>

        <div className="relative mt-16">
          <figure className="m-0 px-0 pb-0 sm:px-10 lg:px-20">
            <div className="mk-corners relative">
              <PipelineMockup />
              <span />
              <span />
              <span />
              <span />
            </div>
            <figcaption className="mt-8 border-t border-berry-100 px-4 py-3 text-center font-mono text-[11px] text-ink-400">
              <span className="mr-2 tracking-[0.08em] text-ink-300">FIG. 1</span>
              Senior Frontend Engineer, after screening has run.
            </figcaption>
          </figure>
        </div>
      </Frame>
    </section>
  );
}
