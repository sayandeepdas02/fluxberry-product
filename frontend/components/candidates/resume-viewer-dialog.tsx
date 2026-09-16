'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchResumeUrl } from '@/hooks/use-candidates';
import { toast } from '@/components/ui/sonner';

/** In-app preview of a candidate's resume PDF, with a separate download action. */
export function ResumeViewerDialog({
  candidateId,
  candidateName,
  open,
  onOpenChange,
}: {
  candidateId: string;
  candidateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrl(null);
      return;
    }
    setLoading(true);
    fetchResumeUrl(candidateId, 'inline')
      .then(setUrl)
      .catch(() => {
        toast.error('No resume available');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, candidateId, onOpenChange]);

  const download = async () => {
    try {
      const downloadUrl = await fetchResumeUrl(candidateId, 'attachment');
      window.open(downloadUrl, '_blank', 'noopener');
    } catch {
      toast.error('Could not download resume');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-3xl flex-col p-0">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" /> {candidateName}&apos;s resume
          </DialogTitle>
          <div className="mr-8 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="size-4" /> Download
            </Button>
            {url && (
              <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank', 'noopener')}>
                <ExternalLink className="size-4" /> Open in new tab
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted">
          {loading || !url ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading resume…
            </div>
          ) : (
            <iframe src={url} title={`${candidateName}'s resume`} className="h-full w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
