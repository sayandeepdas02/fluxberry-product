'use client';

import { CheckCircle2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

/**
 * The real "moment" after a job's first publish (spec item 4.3) — replaces a
 * bare toast with a success state that surfaces the shareable apply link
 * inline, since publishing was previously the only action that didn't show it.
 */
export function PublishConfirmationDialog({
  open,
  onOpenChange,
  applyUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applyUrl: string;
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(applyUrl);
    toast.success('Application link copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-6" />
        </div>
        <DialogHeader className="items-center text-center">
          <DialogTitle>Job published</DialogTitle>
          <DialogDescription>Your job is live and accepting applications.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 pl-3">
          <span className="flex-1 truncate text-sm text-muted-foreground">{applyUrl}</span>
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="size-4" /> Copy link
          </Button>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
