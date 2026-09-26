'use client';

import { CREDIT_CATALOG, type CreditAction } from '@/lib/shared';
import { useCreditHistory } from '@/hooks/use-billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const REASON_LABELS: Record<string, string> = {
  GRANT: 'Monthly allowance',
  RESET: 'Allowance reset',
  PURCHASE: 'Top-up purchase',
  REFUND: 'Refund',
  CONSUME: 'Spent',
};

function labelFor(feature: string | null, reason: string): string {
  if (feature && feature in CREDIT_CATALOG) return CREDIT_CATALOG[feature as CreditAction].label;
  return REASON_LABELS[reason] ?? reason;
}

/** Recent credit activity for the account (owners/admins). */
export function CreditUsageCard() {
  const { data, isLoading } = useCreditHistory();
  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit activity</CardTitle>
        <CardDescription>The last 50 changes to your account&apos;s AI-credit balance.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      {t.reason === 'REFUND' ? `Refund · ${labelFor(t.feature, t.reason)}` : labelFor(t.feature, t.reason)}
                      {t.reason === 'CONSUME' && t.quantity != null && t.unit && (
                        <span className="text-muted-foreground"> · {t.quantity.toLocaleString()} {t.unit}{t.quantity === 1 ? '' : 's'}</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${t.delta < 0 ? 'text-foreground' : 'text-success'}`}>
                      {t.delta > 0 ? '+' : ''}
                      {t.delta.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{t.balanceAfter.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
