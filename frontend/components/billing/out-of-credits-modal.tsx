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
  /** Credits the blocked action needed, and what the account has left (from the 402 details). */
  needed?: number;
  available?: number;
  /** Owners/admins can buy packs; everyone else is told to ask one. */
  canBuy?: boolean;
}

/**
 * Shown when a paid action fails with INSUFFICIENT_CREDITS. Mounted once by
 * CreditsProvider — trigger it via useCreditErrorHandler(), not directly.
 */
export function OutOfCreditsModal({ open, onOpenChange, needed, available, canBuy = true }: OutOfCreditsModalProps) {
  const shortBy = needed != null && available != null ? Math.max(0, needed - available) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="pt-2">Not enough AI credits</DialogTitle>
          <DialogDescription>
            {needed != null && available != null
              ? `This action needs ${needed.toLocaleString()} credits and your account has ${available.toLocaleString()}${shortBy ? ` (${shortBy.toLocaleString()} short)` : ''}. `
              : 'Your account doesn\u2019t have enough AI credits for this action. '}
            {canBuy
              ? 'Buy a top-up pack (credits never expire), or upgrade to Max for a larger monthly allowance.'
              : 'Ask a workspace owner or admin to buy a top-up pack.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canBuy ? 'Not now' : 'OK'}
          </Button>
          {canBuy && (
            <Button asChild>
              <Link href="/app/settings/billing" onClick={() => onOpenChange(false)}>
                Buy credits
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
