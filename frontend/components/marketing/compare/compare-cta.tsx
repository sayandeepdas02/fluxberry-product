import { cn } from '@/lib/utils';
import { Reveal } from '@/components/marketing/landing/motion';
import { GRADIENT, GradientButton, TYPE } from '@/components/marketing/landing/primitives';
import { fill } from './fill';

/** The closing call to action: a blue panel with one button. */
export function CompareCta({ name }: { name: string }) {
  return (
    <section className="bg-white px-5 py-[70px] tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
      <Reveal className="mx-auto max-w-[1300px]">
        <div
          className={cn(
            'flex flex-col items-center gap-[30px] rounded-[27px] px-5 py-[60px] text-center text-white tablet:px-[50px] tablet:py-[80px]',
            GRADIENT,
          )}
        >
          <div className="flex flex-col items-center gap-5">
            <h2 className={cn('max-w-[640px] text-balance', TYPE.h2)}>{`Ready to switch from ${name}?`}</h2>
            <p className={cn('max-w-[480px] text-pretty text-white/85', TYPE.body)}>
              {fill('Create your Zliptal workspace and publish your first job today. Plans start at {pro}/month, with unlimited jobs, candidates and team members.')}
            </p>
          </div>
          <GradientButton href="/sign-up" tone="light">
            Get Started
          </GradientButton>
        </div>
      </Reveal>
    </section>
  );
}
