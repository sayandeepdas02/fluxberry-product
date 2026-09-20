import {
  Sparkles,
  CalendarClock,
  CheckCircle2,
  Circle,
  Mail,
  GitBranch,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Product mockups drawn in JSX rather than shipped as screenshots: the repo has no
 * image pipeline, and vector-ish markup stays crisp at any DPR and adapts to the
 * column width. They are decorative, so they are hidden from assistive tech.
 */

function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('mk-surface flex min-h-[320px] w-full flex-col justify-center gap-3 p-6', className)}
    >
      {children}
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border border-ink-200 bg-white shadow-[0_1px_6px_rgba(13,17,23,0.04)] retina:border-[0.5px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Score({ value, tone = 'good' }: { value: number; tone?: 'good' | 'mid' | 'low' }) {
  const tones = {
    good: 'border-berry-200 bg-berry-50 text-berry-700',
    mid: 'border-ink-200 bg-ink-50 text-ink-500',
    low: 'border-ink-200 bg-white text-ink-400',
  } as const;
  return (
    <span className={cn('shrink-0 border px-1.5 py-px font-mono text-[11px] tabular-nums', tones[tone])}>
      {value}
    </span>
  );
}

/* --------------------------------------------------------------- hero: pipeline */

const stages = [
  { name: 'Applied', count: 24, tone: 'low' as const },
  { name: 'Screened', count: 11, tone: 'mid' as const },
  { name: 'Interview', count: 4, tone: 'good' as const },
];

const candidates: Record<string, { name: string; role: string; score: number }[]> = {
  Applied: [
    { name: 'A. Rahman', role: 'Frontend', score: 61 },
    { name: 'J. Okafor', role: 'Frontend', score: 58 },
    { name: 'M. Lindqvist', role: 'Frontend', score: 44 },
  ],
  Screened: [
    { name: 'P. Nair', role: 'Frontend', score: 88 },
    { name: 'S. Mehta', role: 'Frontend', score: 82 },
  ],
  Interview: [{ name: 'D. Alvarez', role: 'Frontend', score: 94 }],
};

export function PipelineMockup() {
  return (
    <Surface className="min-h-[420px] justify-start gap-4 p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink">Senior Frontend Engineer</span>
          <span className="border border-ink-200 bg-white px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-ink-500">
            Open
          </span>
        </div>
        <span className="hidden font-mono text-[11px] text-ink-400 sm:block">39 candidates</span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        {stages.map(({ name, count, tone }) => (
          <div key={name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-ink-line pb-2">
              <span className="text-[12px] font-medium text-ink-600">{name}</span>
              <span className="font-mono text-[11px] text-ink-400">{count}</span>
            </div>
            {candidates[name].map(({ name: person, role, score }) => (
              <Panel key={person} className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[12px] font-medium text-ink">{person}</span>
                  <span className="truncate text-[11px] text-ink-400">{role}</span>
                </span>
                <Score value={score} tone={tone} />
              </Panel>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-ink-line pt-3 text-[11px] text-ink-500">
        <Sparkles className="size-3.5 text-berry-600" />
        Screening finished 39 of 39 applicants — ranked, summarised, no manual sifting.
      </div>
    </Surface>
  );
}

/* ------------------------------------------------------------- screening detail */

const signals = [
  { label: 'React, TypeScript, 6 yrs', match: true },
  { label: 'Design-system ownership', match: true },
  { label: 'Led a team of 4', match: true },
  { label: 'No Kubernetes experience', match: false },
];

export function ScreeningMockup() {
  return (
    <Surface>
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-ink">D. Alvarez</span>
            <span className="text-[11px] text-ink-400">Applied 2 hours ago · Referral</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[22px] leading-none text-berry-700">94</span>
            <span className="text-[10px] uppercase tracking-wide text-ink-400">match</span>
          </div>
        </div>

        <div className="mt-3 h-1 w-full bg-ink-100">
          <div className="h-1 w-[94%] bg-berry-500" />
        </div>

        <ul className="mt-4 flex list-none flex-col gap-2 p-0">
          {signals.map(({ label, match }) => (
            <li key={label} className="flex items-center gap-2 text-[12px] text-ink-600">
              {match ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-berry-600" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-ink-300" />
              )}
              {label}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex items-center gap-2 px-1 text-[11px] text-ink-500">
        <Sparkles className="size-3.5 shrink-0 text-berry-600" />
        Summary and score are suggestions — a human always makes the call.
      </div>
    </Surface>
  );
}

/* --------------------------------------------------------------------- workflows */

export function WorkflowMockup() {
  return (
    <Surface className="items-center">
      <div className="flex w-full max-w-[340px] flex-col items-stretch gap-0">
        <Panel className="flex items-center gap-2 px-3 py-2.5">
          <GitBranch className="size-4 shrink-0 text-berry-600" />
          <span className="text-[12px] text-ink">
            When stage becomes <span className="font-medium">Screened</span>
          </span>
        </Panel>
        <span className="mx-auto h-5 w-px bg-[repeating-linear-gradient(to_bottom,#c4c4c4_0_3px,transparent_3px_6px)]" />
        <Panel className="flex items-center gap-2 px-3 py-2.5">
          <Sparkles className="size-4 shrink-0 text-ink-400" />
          <span className="text-[12px] text-ink">
            If score <span className="font-mono">≥ 80</span>
          </span>
        </Panel>
        <span className="mx-auto h-5 w-px bg-[repeating-linear-gradient(to_bottom,#c4c4c4_0_3px,transparent_3px_6px)]" />
        <div className="flex flex-col gap-2">
          <Panel className="flex items-center gap-2 px-3 py-2.5">
            <Mail className="size-4 shrink-0 text-ink-400" />
            <span className="text-[12px] text-ink">Send assessment invite</span>
            <ArrowRight className="ml-auto size-3.5 text-ink-300" />
          </Panel>
          <Panel className="flex items-center gap-2 px-3 py-2.5">
            <CalendarClock className="size-4 shrink-0 text-ink-400" />
            <span className="text-[12px] text-ink">Move to Interview</span>
            <ArrowRight className="ml-auto size-3.5 text-ink-300" />
          </Panel>
        </div>
      </div>
    </Surface>
  );
}
