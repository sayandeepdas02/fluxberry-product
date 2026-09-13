'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { useCalendarConnectionStatus, useConnectCalendar, useDisconnectCalendar } from '@/hooks/use-calendar-integration';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: status, isLoading } = useCalendarConnectionStatus();
  const connect = useConnectCalendar();
  const disconnect = useDisconnectCalendar();

  useEffect(() => {
    const result = searchParams.get('calendar');
    if (!result) return;
    if (result === 'connected') toast.success('Google Calendar connected');
    if (result === 'error') toast.error('Could not connect Google Calendar');
    router.replace('/app/settings/integrations');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Calendar className="size-5" />
              </div>
              <div>
                <div className="font-medium">Google Calendar</div>
                <p className="text-sm text-muted-foreground">
                  {status?.connected ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-success" />
                      Connected{status.connectedEmail ? ` as ${status.connectedEmail}` : ''}
                    </span>
                  ) : (
                    'Sync scheduled interviews to Google Calendar with an auto-generated Meet link.'
                  )}
                </p>
              </div>
            </div>
            {status?.connected ? (
              <Button variant="outline" onClick={() => disconnect.mutate()} loading={disconnect.isPending}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => connect.mutate()} loading={connect.isPending}>
                Connect
              </Button>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Not connected? Scheduling an interview still works — it's recorded in Fluxberry with a shareable meeting
          link, and everyone gets emailed the details.
        </p>
      </CardContent>
    </Card>
  );
}
