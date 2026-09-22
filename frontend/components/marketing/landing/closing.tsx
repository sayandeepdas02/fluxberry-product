import Link from 'next/link';
import { Section } from '../frame';

export function ClosingSection() {
  return (
    <Section className="px-8 py-24 text-center">
        <div className="mx-auto max-w-[600px]">
          <h2 className="text-balance text-[clamp(34px,3.8vw,50px)] font-medium leading-[1.1] tracking-[-0.04em] text-ink">
            Streamline your hiring with{' '}
            <span className="text-berry-600">Fluxberry AI</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[460px] text-[17px] leading-[1.7] text-ink-500">
            Fluxberry AI is an AI Native hiring tool that is fast, simple.
            <br />
            Built for founders &amp; hiring managers.
          </p>
          <Link
            href="/sign-up"
            className="mt-10 inline-flex items-center gap-2 rounded-[12px] bg-berry-600 px-10 py-4 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Get started
            <span aria-hidden>→</span>
          </Link>
        </div>
      </Section>
  );
}
