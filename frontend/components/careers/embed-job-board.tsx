'use client';

import { useState, useMemo } from 'react';
import type { PublicCareersJob } from '@fluxberry/shared';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { formatSalary } from '@/lib/utils';

type Props = {
  company: { name: string; logoUrl?: string | null };
  openings: PublicCareersJob[];
  appUrl: string;
  accentColor?: string | null;
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function EmbedJobBoard({ company, openings, appUrl, accentColor }: Props) {
  const accent = accentColor || '#7c3aed';

  const departments = useMemo(() => [...new Set(openings.map((j) => j.department).filter(Boolean))] as string[], [openings]);
  const locations = useMemo(() => [...new Set(openings.map((j) => j.location).filter(Boolean))] as string[], [openings]);
  const workModes = useMemo(() => [...new Set(openings.map((j) => j.workMode))], [openings]);

  const [dept, setDept] = useState<string>('');
  const [loc, setLoc] = useState<string>('');
  const [mode, setMode] = useState<string>('');

  const filtered = useMemo(
    () =>
      openings.filter((j) => {
        if (dept && j.department !== dept) return false;
        if (loc && j.location !== loc) return false;
        if (mode && j.workMode !== mode) return false;
        return true;
      }),
    [openings, dept, loc, mode],
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

  const showFilters = departments.length > 1 || locations.length > 1 || workModes.length > 1;
  const hasDepartments = grouped.length > 1 || (grouped.length === 1 && grouped[0][0] !== 'Other');

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#111827',
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={company.name}
            style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', margin: '0 auto 12px' }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 18,
              fontWeight: 600,
              color: '#6b7280',
            }}
          >
            {initials(company.name)}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 700 }}>{company.name}</div>
      </div>

      {/* Open Positions heading */}
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>
        Open Positions ({openings.length})
      </h2>

      {/* Filters */}
      {showFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {departments.length > 1 && (
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              style={selectStyle}
            >
              <option value="">Department</option>
              {departments.sort().map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          {locations.length > 1 && (
            <select
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              style={selectStyle}
            >
              <option value="">Location</option>
              {locations.sort().map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
          {workModes.length > 1 && (
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={selectStyle}
            >
              <option value="">Location Type</option>
              {workModes.map((m) => (
                <option key={m} value={m}>{WORK_MODE_LABELS[m]}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Job listings */}
      {filtered.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: 14, padding: '32px 0', textAlign: 'center' }}>
          No open positions right now — check back soon.
        </p>
      ) : (
        <div>
          {grouped.map(([deptName, jobs]) => (
            <div key={deptName} style={{ marginBottom: 32 }}>
              {hasDepartments && (
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#111827' }}>
                  {deptName}
                </h3>
              )}
              <div>
                {jobs.map((job) => {
                  const salary = formatSalary(job.salary);
                  const meta = [
                    job.department,
                    job.location,
                    EMPLOYMENT_LABELS[job.employmentType],
                    WORK_MODE_LABELS[job.workMode],
                  ]
                    .filter(Boolean)
                    .join(' • ');

                  return (
                    <a
                      key={job.applyPath}
                      href={`${appUrl}${job.applyPath}?source=EMBED`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        padding: '16px 0',
                        borderBottom: '1px solid #e5e7eb',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, color: accent, marginBottom: 4 }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {meta}
                        {salary ? ` • ${salary}` : ''}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
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
          Fluxberry
        </a>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  padding: '8px 32px 8px 12px',
  fontSize: 14,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  backgroundColor: '#fff',
  color: '#374151',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  minWidth: 140,
};
