'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OutOfCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shown when a generative-AI action fails with INSUFFICIENT_CREDITS (see
 * getInsufficientCredits in lib/api-client.ts). Points the user to buy a top-up
 * pack or upgrade to Max for a larger monthly allowance.
 *
 *   onError: (err) => {
 *     if (getInsufficientCredits(err)) { setOutOfCreditsOpen(true); return; }
 *     toast.error(...);
 *   }
 */
export function OutOfCreditsModal({ open, onOpenChange }: OutOfCreditsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="pt-2">You&apos;re out of AI credits</DialogTitle>
          <DialogDescription>
            This action needs AI credits and your account&apos;s pool is empty. Buy a top-up pack, or upgrade to Max
            for a larger monthly allowance.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild>
            <Link href="/app/settings/billing" onClick={() => onOpenChange(false)}>
              Buy credits
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
