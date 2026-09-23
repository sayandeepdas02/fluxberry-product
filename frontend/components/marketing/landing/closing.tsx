import { MkButton } from '../mk-button';

export function ClosingSection() {
  return (
    <section className="bg-primary py-10 text-center md:py-14">
      <div className="mx-auto max-w-[600px] px-6">
        <h2 className="whitespace-nowrap text-mk-h2 text-primary-foreground">
          Streamline your hiring with Fluxberry AI
        </h2>
        <p className="mx-auto mt-4 text-mk-body leading-relaxed text-primary-foreground/70">
          Fluxberry AI is an AI Native hiring tool that is fast, simple.
          <br />
          Built for founders &amp; hiring managers.
        </p>
        <div className="mt-8">
          <MkButton
            href="/sign-up"
            variant="secondary"
            className="border-white/20 bg-white text-primary hover:bg-white/90"
          >
            Get started
          </MkButton>
        </div>
      </div>
    </section>
  );
}
