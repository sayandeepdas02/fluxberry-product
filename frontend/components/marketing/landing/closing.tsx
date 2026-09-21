import { Section } from '../frame';
import { MkButton } from '../mk-button';

export function ClosingSection() {
  return (
    <Section className="mk-dots isolate grid min-h-[390px] place-items-center overflow-hidden bg-[#fffcfd] px-8 py-[88px] text-center">
      <div className="relative">
        <h2 className="text-balance text-[clamp(38px,4.2vw,56px)] font-medium leading-[1.08] tracking-[-0.045em] text-ink">
          Stop sifting.
          <br />
          Start hiring.
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <MkButton href="/blog" variant="secondary">
            Read the blog
          </MkButton>
          <MkButton href="/sign-up">Start for free</MkButton>
        </div>
      </div>
    </Section>
  );
}
