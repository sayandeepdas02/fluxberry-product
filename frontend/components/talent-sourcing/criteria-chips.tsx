'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SourcingCriteria, SeniorityLevel } from '@/lib/shared';
import { SENIORITY_LEVELS } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** String-array facets of the criteria, in the order we render them. */
const STRING_FACETS: { key: StringFacetKey; label: string; placeholder: string }[] = [
  { key: 'titles', label: 'Titles', placeholder: 'Add a title' },
  { key: 'skills', label: 'Skills', placeholder: 'Add a skill' },
  { key: 'locations', label: 'Locations', placeholder: 'Add a location' },
  { key: 'countries', label: 'Countries', placeholder: 'Add a country' },
  { key: 'companies', label: 'Companies', placeholder: 'Add a company' },
  { key: 'excludeCompanies', label: 'Exclude companies', placeholder: 'Company to exclude' },
  { key: 'industries', label: 'Industries', placeholder: 'Add an industry' },
  { key: 'keywords', label: 'Keywords', placeholder: 'Add a keyword' },
];

type StringFacetKey =
  | 'titles' | 'skills' | 'locations' | 'countries'
  | 'companies' | 'excludeCompanies' | 'industries' | 'keywords';

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/**
 * The "Fluxberry set your filters — check them" moment. Renders the parsed
 * criteria as editable chips; every edit round-trips the same `SourcingCriteria`
 * shape, so re-running never re-calls the AI.
 */
export function CriteriaChips({
  criteria,
  onChange,
  disabled,
}: {
  criteria: SourcingCriteria;
  onChange: (next: SourcingCriteria) => void;
  disabled?: boolean;
}) {
  // Facets shown: any with values, plus any the user explicitly added this session.
  const [added, setAdded] = useState<Set<string>>(new Set());
  const yearsActive = criteria.minYears != null || criteria.maxYears != null || added.has('years');

  const activeStringFacets = useMemo(
    () => STRING_FACETS.filter((f) => criteria[f.key].length > 0 || added.has(f.key)),
    [criteria, added],
  );
  const seniorityActive = criteria.seniority.length > 0 || added.has('seniority');

  const inactiveFacets = [
    ...STRING_FACETS.filter((f) => !activeStringFacets.includes(f)).map((f) => ({ key: f.key, label: f.label })),
    ...(seniorityActive ? [] : [{ key: 'seniority', label: 'Seniority' }]),
    ...(yearsActive ? [] : [{ key: 'years', label: 'Years of experience' }]),
  ];

  const setFacet = (key: StringFacetKey, values: string[]) => onChange({ ...criteria, [key]: values });
  const addValue = (key: StringFacetKey, raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (criteria[key].some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setFacet(key, [...criteria[key], v]);
  };

  return (
    <div className="space-y-2.5">
      {activeStringFacets.map((f) => (
        <FacetRow key={f.key} label={f.label}>
          {criteria[f.key].map((val) => (
            <Chip key={val} onRemove={disabled ? undefined : () => setFacet(f.key, criteria[f.key].filter((x) => x !== val))}>
              {val}
            </Chip>
          ))}
          {!disabled && <ChipInput placeholder={f.placeholder} onCommit={(v) => addValue(f.key, v)} />}
        </FacetRow>
      ))}

      {seniorityActive && (
        <FacetRow label="Seniority">
          {criteria.seniority.map((s) => (
            <Chip key={s} onRemove={disabled ? undefined : () => onChange({ ...criteria, seniority: criteria.seniority.filter((x) => x !== s) })}>
              {titleCase(s)}
            </Chip>
          ))}
          {!disabled && (
            <SeniorityAdd
              selected={criteria.seniority}
              onAdd={(s) => onChange({ ...criteria, seniority: [...criteria.seniority, s] })}
            />
          )}
        </FacetRow>
      )}

      {yearsActive && (
        <FacetRow label="Experience">
          <YearInput
            value={criteria.minYears}
            placeholder="min"
            disabled={disabled}
            onChange={(n) => onChange({ ...criteria, minYears: n })}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <YearInput
            value={criteria.maxYears}
            placeholder="max"
            disabled={disabled}
            onChange={(n) => onChange({ ...criteria, maxYears: n })}
          />
          <span className="text-xs text-muted-foreground">years</span>
        </FacetRow>
      )}

      {!disabled && inactiveFacets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
              <Plus className="size-3.5" /> Add filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {inactiveFacets.map((f) => (
              <DropdownMenuItem key={f.key} onSelect={() => setAdded((prev) => new Set(prev).add(f.key))}>
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-32 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="rounded-full text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function ChipInput({ placeholder, onCommit }: { placeholder: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState('');
  const commit = () => { if (v.trim()) { onCommit(v); setV(''); } };
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
        else if (e.key === 'Backspace' && !v) { /* leave chip removal to the × */ }
      }}
      onBlur={commit}
      placeholder={placeholder}
      className="h-6 w-28 rounded-md border border-dashed border-input bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-ring"
    />
  );
}

function SeniorityAdd({ selected, onAdd }: { selected: string[]; onAdd: (s: SeniorityLevel) => void }) {
  const remaining = SENIORITY_LEVELS.filter((s) => !selected.includes(s));
  if (remaining.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full border border-dashed border-input px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">
          <Plus className="inline size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {remaining.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onAdd(s)}>{titleCase(s)}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function YearInput({
  value,
  placeholder,
  disabled,
  onChange,
}: {
  value?: number | null;
  placeholder: string;
  disabled?: boolean;
  onChange: (n: number | undefined) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={60}
      disabled={disabled}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => {
        const n = e.target.value === '' ? undefined : Math.max(0, Math.min(60, Number(e.target.value)));
        onChange(Number.isNaN(n as number) ? undefined : n);
      }}
      className={cn(
        'h-6 w-16 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-ring',
      )}
    />
  );
}
