import { Section } from '../frame';
import { CrossMark } from '../pixel-icons';
import {
  ScreeningMockup,
  WorkflowMockup,
} from '../mockups';

/**
 * Alternating rows of mockup and copy, separated by dashed rules with crosshair
 * nodes at the intersections — the same drafting-table language as the dividers.
 */

const rows = [
  {
    id: 'screening',
    title: 'Screening finishes before you open the résumé',
    body: 'Every application is scored against the role and summarised the moment it lands, so you start from a shortlist instead of an inbox.',
    media: <ScreeningMockup />,
  },
  {
    id: 'workflows',
    title: 'The pipeline moves without you',
    body: 'Set the rules once: when a candidate reaches a stage, Fluxberry sends the email or advances them for you.',
    media: <WorkflowMockup />,
  },
];

export function FeatureRows() {
  return (
    <Section>
      {rows.map(({ id, title, body, media }, i) => (
        <div
          key={id}
          id={id}
          className="relative grid scroll-mt-20 grid-cols-1 lg:grid-cols-2"
        >
          <div className={i % 2 === 1 ? 'p-3 lg:order-2' : 'p-3'}>
            <div className="mk-reveal">{media}</div>
          </div>

          <div
            className={
              i % 2 === 1
                ? 'flex flex-col justify-center gap-4 px-6 py-8 lg:order-1 lg:px-10'
                : 'flex flex-col justify-center gap-4 px-6 py-8 lg:px-10'
            }
          >
            <h2 className="text-mk-h5 text-ink">{title}</h2>
            <p className="max-w-[460px] text-mk-body text-ink-600">{body}</p>
          </div>

          {/* Vertical dashed rule down the middle of the row. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-[repeating-linear-gradient(to_bottom,#c4c4c4_0_4px,transparent_4px_8px)] lg:block"
          />
          {/* Dashed rule between rows, with a node where it meets the centre line. */}
          {i < rows.length - 1 && (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[repeating-linear-gradient(to_right,#c4c4c4_0_4px,transparent_4px_8px)]"
              />
              <CrossMark
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 text-ink-300 lg:block"
              />
            </>
          )}
        </div>
      ))}
    </Section>
  );
}
