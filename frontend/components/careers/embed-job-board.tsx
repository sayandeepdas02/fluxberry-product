'use client';

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PublicCareersJob } from '@/lib/shared';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { formatSalary } from '@/lib/utils';

type Props = {
  company: { name: string; logoUrl?: string | null };
  openings: PublicCareersJob[];
  appUrl: string;
  accentColor?: string | null;
  /** Hosted-page intro (headline + description). Omitted in the iframe embed, which shows jobs only. */
  intro?: { headline: string; tagline: string; content: string } | null;
  jobsHeading?: string;
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

const uniqueSorted = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));

export function EmbedJobBoard({ company, openings, appUrl, accentColor, intro, jobsHeading }: Props) {
  const accent = accentColor || '#7c3aed';

  const departments = useMemo(() => uniqueSorted(openings.map((j) => j.department)), [openings]);
  const employmentTypes = useMemo(() => uniqueSorted(openings.map((j) => j.employmentType)), [openings]);
  const locations = useMemo(() => uniqueSorted(openings.map((j) => j.location)), [openings]);
  const workModes = useMemo(() => uniqueSorted(openings.map((j) => j.workMode)), [openings]);

  const [dept, setDept] = useState<string>('');
  const [empType, setEmpType] = useState<string>('');
  const [loc, setLoc] = useState<string>('');
  const [mode, setMode] = useState<string>('');

  const filtered = useMemo(
    () =>
      openings.filter((j) => {
        if (dept && j.department !== dept) return false;
        if (empType && j.employmentType !== empType) return false;
        if (loc && j.location !== loc) return false;
        if (mode && j.workMode !== mode) return false;
        return true;
      }),
    [openings, dept, empType, loc, mode],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, PublicCareersJob[]>();
    for (const job of filtered) {
      const key = job.department || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Other') return 1;
      if (b[0] === 'Other') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  const showFilters = openings.length > 1;
  const hasDepartments = grouped.length > 1 || (grouped.length === 1 && grouped[0][0] !== 'Other');
  const hasIntro = Boolean(intro && (intro.headline || intro.tagline || intro.content));

  return (
    <div className="fb-board" style={{ ['--fb-accent' as string]: accent }}>
      <style>{boardCss}</style>

      {/* Header */}
      {hasIntro ? (
        <header style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <Logo company={company} size={36} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>{company.name}</span>
          </div>
          {intro!.tagline && <div className="fb-eyebrow">{intro!.tagline}</div>}
          {intro!.headline && <h1 className="fb-headline">{intro!.headline}</h1>}
          {intro!.content && (
            <div className="fb-prose">
              <ReactMarkdown
                components={{
                  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
                }}
              >
                {intro!.content}
              </ReactMarkdown>
            </div>
          )}
        </header>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Logo company={company} size={56} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{company.name}</div>
        </div>
      )}

      {/* Open Positions heading */}
      <h2 className="fb-section-title">
        {jobsHeading || 'Open Positions'} ({filtered.length})
      </h2>

      {/* Filters */}
      {showFilters && (
        <div style={{ marginBottom: 32 }}>
          <div className="fb-filters-label">Filters:</div>
          <div className="fb-filters">
            {departments.length > 0 && (
              <FilterSelect label="Department" value={dept} onChange={setDept} options={departments.map((d) => [d, d])} />
            )}
            {employmentTypes.length > 0 && (
              <FilterSelect
                label="Employment Type"
                value={empType}
                onChange={setEmpType}
                options={employmentTypes.map((t) => [t, EMPLOYMENT_LABELS[t as PublicCareersJob['employmentType']] ?? t])}
              />
            )}
            {locations.length > 0 && (
              <FilterSelect label="Location" value={loc} onChange={setLoc} options={locations.map((l) => [l, l])} />
            )}
            {workModes.length > 0 && (
              <FilterSelect
                label="Location Type"
                value={mode}
                onChange={setMode}
                options={workModes.map((m) => [m, WORK_MODE_LABELS[m as PublicCareersJob['workMode']] ?? m])}
              />
            )}
          </div>
        </div>
      )}

      {/* Job listings */}
      {filtered.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: 14, padding: '32px 0', textAlign: 'center' }}>
          {openings.length === 0
            ? 'No open positions right now — check back soon.'
            : 'No positions match the selected filters.'}
        </p>
      ) : (
        <div>
          {grouped.map(([deptName, jobs]) => (
            <section key={deptName} style={{ marginBottom: 40 }}>
              {hasDepartments && <h3 className="fb-dept">{deptName}</h3>}
              <div>
                {jobs.map((job) => {
                  const salary = formatSalary(job.salary);
                  const meta = [
                    hasDepartments ? null : job.department,
                    job.location,
                    EMPLOYMENT_LABELS[job.employmentType],
                    WORK_MODE_LABELS[job.workMode],
                  ]
                    .filter(Boolean)
                    .join(' • ');

                  return (
                    <a
                      key={job.applyPath}
                      className="fb-job"
                      href={`${appUrl}${job.applyPath}?source=EMBED`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="fb-job-title">{job.title}</div>
                      {meta && <div className="fb-job-meta">{meta}</div>}
                      {salary && <div className="fb-job-salary">{salary}</div>}
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: 20,
          marginTop: 16,
          textAlign: 'center',
          fontSize: 12,
          color: '#9ca3af',
        }}
      >
        Powered by{' '}
        <a
          href="https://fluxberry.in"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#111827', fontWeight: 500, textDecoration: 'none' }}
        >
          Fluxberry AI
        </a>
      </div>
    </div>
  );
}

function Logo({ company, size }: { company: Props['company']; size: number }) {
  if (company.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={company.logoUrl}
        alt={company.name}
        style={{ width: size, height: size, borderRadius: size / 4.5, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 4.5,
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size / 3,
        fontWeight: 600,
        color: '#6b7280',
      }}
    >
      {initials(company.name)}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      className="fb-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Filter by ${label.toLowerCase()}`}
    >
      <option value="">{label}</option>
      {options.map(([v, text]) => (
        <option key={v} value={v}>{text}</option>
      ))}
    </select>
  );
}

// Plain CSS (not Tailwind) — this board is also served inside third-party iframes
// with no app stylesheet, so it must carry its own styles.
const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const boardCss = `
.fb-board{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827;max-width:880px;margin:0 auto;padding:48px 24px;box-sizing:border-box}
.fb-board *{box-sizing:border-box}
.fb-eyebrow{font-size:18px;font-weight:500;color:#111827;margin-bottom:12px}
.fb-headline{font-size:clamp(32px,6vw,60px);line-height:1.08;letter-spacing:-0.025em;font-weight:700;margin:0 0 40px}
.fb-prose{font-size:17px;line-height:1.7;color:#374151}
.fb-prose h1,.fb-prose h2{font-size:24px;font-weight:600;color:#111827;margin:40px 0 12px;line-height:1.3}
.fb-prose h3{font-size:19px;font-weight:600;color:#111827;margin:28px 0 8px}
.fb-prose>:first-child{margin-top:0}
.fb-prose p{margin:0 0 14px}
.fb-prose ul,.fb-prose ol{margin:0 0 16px;padding-left:24px}
.fb-prose li{margin:6px 0}
.fb-prose a{color:var(--fb-accent);text-decoration:underline;text-underline-offset:2px}
.fb-prose strong{color:#111827}
.fb-section-title{font-size:26px;font-weight:700;margin:0 0 20px;letter-spacing:-0.01em}
.fb-filters-label{font-size:14px;font-weight:600;color:#6b7280;margin-bottom:12px}
.fb-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media (max-width:560px){.fb-filters{grid-template-columns:1fr}.fb-board{padding:32px 16px}}
.fb-select{appearance:none;-webkit-appearance:none;width:100%;height:48px;padding:0 40px 0 16px;font-size:16px;font-family:inherit;border:1.5px solid #d1d5db;border-radius:12px;background:#fff ${chevron} no-repeat right 14px center;color:#111827;cursor:pointer}
.fb-select:focus{outline:none;border-color:var(--fb-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--fb-accent) 20%,transparent)}
.fb-dept{font-size:21px;font-weight:700;margin:0 0 8px;color:#111827}
.fb-job{display:block;padding:18px 16px;margin:0 -16px;border-radius:10px;text-decoration:none;color:inherit;transition:background-color .15s}
.fb-job:hover,.fb-job:focus-visible{background:#f4f4f5;outline:none}
.fb-job-title{font-size:18px;font-weight:600;color:var(--fb-accent);margin-bottom:6px}
.fb-job-meta{font-size:15px;color:#6b7280}
.fb-job-salary{font-size:14px;color:#6b7280;margin-top:4px}
`;
