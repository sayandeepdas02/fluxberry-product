'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SkillsInput({
  value,
  onChange,
  placeholder = 'Add a skill and press Enter',
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const s = draft.trim();
    if (s && !value.some((v) => v.toLowerCase() === s.toLowerCase())) {
      onChange([...value, s]);
    }
    setDraft('');
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== skill))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${skill}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
      />
    </div>
  );
}
