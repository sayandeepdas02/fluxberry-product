import { Check, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/marketing/landing/motion';
import { Pill, SectionHeader, TYPE } from '@/components/marketing/landing/primitives';
import { COMPARE_CHECKED, ROWS, ZLIPTAL_CELLS, type Cell, type Competitor } from './data';
import { fill } from './fill';

function Mark({ status }: { status: Cell['s'] }) {
  const base = 'mt-[3px] size-4 shrink-0';
  if (status === 'yes') return <Check aria-label="Included" className={cn(base, 'text-lp-blue-500')} strokeWidth={2.75} />;
  if (status === 'no') return <X aria-label="Not included" className={cn(base, 'text-lp-gray-400')} strokeWidth={2.5} />;
  if (status === 'partial') return <Minus aria-label="Partly included" className={cn(base, 'text-lp-gray-500')} strokeWidth={2.75} />;
  return (
    <span aria-hidden className={cn(base, 'flex items-center justify-center')}>
      <span className="size-1.5 rounded-full bg-lp-gray-300" />
    </span>
  );
}

function CellView({ cell, side, highlight }: { cell: Cell; side: string; highlight?: boolean }) {
  return (
    <div className={cn('flex gap-2.5 px-[18px] py-[14px]', highlight && 'bg-lp-blue-50/60')}>
      <Mark status={cell.s} />
      <div className="min-w-0">
        {/* The column names only show on phones, where the columns stack. */}
        <p className={cn('mb-0.5 text-lp-gray-500 tablet:hidden', TYPE.pill)}>{side}</p>
        <p className={cn('text-pretty text-lp-gray-800', TYPE.body)}>{fill(cell.t)}</p>
      </div>
    </div>
  );
}

/**
 * The feature comparison: one row per capability, Zliptal in the highlighted middle column.
 * The columns stack on phones, each row becoming a small card with both sides labelled.
 */
export function ComparisonTable({ competitor }: { competitor: Competitor }) {
  const columns = 'tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1.35fr)]';
  return (
    <section
      id="comparison"
      className="scroll-mt-5 bg-lp-gray-50 px-5 py-[70px] tablet:scroll-mt-0 tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col items-center">
        <Reveal className="w-full">
          <SectionHeader
            pill="Comparison"
            title={`Zliptal vs ${competitor.name} compared`}
            lead={`What each product includes, based on public pricing and product pages checked in ${COMPARE_CHECKED}.`}
            titleClassName="max-w-[640px]"
            leadClassName="max-w-[540px]"
          />
        </Reveal>

        <div className="mt-[60px] w-full overflow-hidden rounded-[15px] bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.04)]">
          <div className={cn('hidden border-b border-lp-gray-150 tablet:grid', columns)}>
            <div className="px-[18px] py-4" />
            <div className="flex items-center gap-2.5 bg-lp-blue-50/60 px-[18px] py-4">
              <span className={cn('text-black', TYPE.title)}>Zliptal</span>
              <Pill className="px-2.5 py-[3px]">Recommended</Pill>
            </div>
            <div className="flex items-center px-[18px] py-4">
              <span className={cn('text-black', TYPE.title)}>{competitor.name}</span>
            </div>
          </div>

          {ROWS.map((row, index) => (
            <div key={row.key} className={cn('grid border-lp-gray-150', columns, index > 0 && 'border-t')}>
              <h3 className={cn('px-[18px] pt-[14px] text-black tablet:py-[14px]', TYPE.label)}>{row.label}</h3>
              <CellView cell={ZLIPTAL_CELLS[row.key]} side="Zliptal" highlight />
              <CellView cell={competitor.cells[row.key]} side={competitor.name} />
            </div>
          ))}
        </div>

        <p className={cn('mt-5 max-w-[640px] text-center text-lp-gray-500', TYPE.body)}>
          Plans and prices change often. Check {competitor.name}&rsquo;s own site before you decide.
        </p>
      </div>
    </section>
  );
}
