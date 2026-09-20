'use client';

import { useState, useRef, useEffect } from 'react';

const CURATED_EMOJIS = [
  '💰', '🏥', '🏠', '📚', '🎯', '🚀', '💻', '🌴', '🍕', '🧘',
  '👶', '🎓', '💪', '🎉', '🌍', '⏰', '🤝', '💡', '🏋️', '🎮',
  '📈', '☕', '🐕', '🎁', '🔧', '✈️', '🌱', '🎵', '🏆', '❤️',
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-lg hover:bg-muted"
      >
        {value || '🎯'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 grid w-[240px] grid-cols-6 gap-1 rounded-lg border border-border bg-card p-2 shadow-md">
          {CURATED_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false); }}
              className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
