'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** A single-day month-grid popover, matching binary.so's date picker. */
export function DatePickerPopover({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(value));

  const days = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const leadingBlanks = getDay(start);
    const grid = eachDayOfInterval({ start, end });
    return { leadingBlanks, grid };
  }, [viewMonth]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="text-sm font-medium underline-offset-2 hover:underline">
          {format(value, 'EEEE, MMMM d')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))} className="rounded p-1 hover:bg-muted">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))} className="rounded p-1 hover:bg-muted">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: days.leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.grid.map((day) => {
            const selected = isSameDay(day, value);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  const next = new Date(day);
                  next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                  onChange(next);
                  setOpen(false);
                }}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-sm transition-colors',
                  selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  !isSameMonth(day, viewMonth) && 'text-muted-foreground/40',
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function timeOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const d = new Date(2000, 0, 1, h, m);
      opts.push({ value, label: format(d, 'h:mmaaa').toLowerCase() });
    }
  }
  return opts;
}
const TIME_OPTIONS = timeOptions();

/** A 15-minute-increment time combobox, matching binary.so's time picker. */
export function TimeSelect({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const current = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return (
    <Select
      value={current}
      onValueChange={(v) => {
        const [h, m] = v.split(':').map(Number);
        const next = new Date(value);
        next.setHours(h, m, 0, 0);
        onChange(next);
      }}
    >
      <SelectTrigger className="h-8 w-28 border-none bg-transparent px-1.5 text-sm font-medium underline-offset-2 shadow-none hover:underline focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
