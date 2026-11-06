'use client';

import { Toaster as SonnerToaster } from 'sonner';

/** Toasts, used sparingly (spec §82). */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'rounded-lg border border-border bg-card text-card-foreground shadow-md text-sm',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
