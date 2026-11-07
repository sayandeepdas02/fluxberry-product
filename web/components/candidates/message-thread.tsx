'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';
import { useMessages, useSendMessage } from '@/hooks/use-messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export function MessageThread({ applicationId }: { applicationId: string }) {
  const { data: messages, isLoading } = useMessages(applicationId);
  const sendMessage = useSendMessage(applicationId);
  const [body, setBody] = useState('');

  const send = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    sendMessage.mutate(
      { body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not send message'),
      },
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto">
        {(messages ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No messages yet. Send an email reply to the candidate.
          </p>
        ) : (
          messages!.map((m) => (
            <div
              key={m.id}
              className={cn('flex flex-col gap-0.5', m.direction === 'outbound' ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  m.direction === 'outbound'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {m.subject && <div className="mb-0.5 text-xs font-semibold opacity-80">{m.subject}</div>}
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
              <span className="px-1 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
          rows={2}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button size="icon" onClick={send} loading={sendMessage.isPending} disabled={!body.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
