'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, PartyPopper, XCircle } from 'lucide-react';
import type { PublicOfferDto } from '@/lib/shared';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSpinner } from '@/components/ui/spinner';
import { publicConfig } from '@/lib/config';

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function OfferResponse() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicOfferDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineNote, setDeclineNote] = useState('');
  const [submitting, setSubmitting] = useState<'ACCEPT' | 'DECLINE' | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<PublicOfferDto>(`/api/v1/public/offers/${token}`, { public: true });
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Offer not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (decision: 'ACCEPT' | 'DECLINE') => {
    setSubmitting(decision);
    try {
      const d = await api.post<PublicOfferDto>(
        `/api/v1/public/offers/${token}/respond`,
        { decision, note: decision === 'DECLINE' ? declineNote.trim() || undefined : undefined },
        { public: true },
      );
      setData(d);
      setShowDecline(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your response');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <PageSpinner label="Loading your offer…" />;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <div className="mb-6 text-sm font-medium text-muted-foreground">{publicConfig.appName}</div>

      {error && !data ? (
        <EmptyState as="h1" title="Offer not found" description={error} />
      ) : !data ? null : data.status === 'ACCEPTED' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <PartyPopper className="size-10 text-success" />
            <h1 className="mt-4 text-page-title">Offer accepted</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Congratulations, and welcome to {data.companyName}! We&apos;ll be in touch shortly with next steps.
            </p>
          </CardContent>
        </Card>
      ) : data.status === 'DECLINED' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <XCircle className="size-10 text-muted-foreground" />
            <h1 className="mt-4 text-page-title">Offer declined</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Thanks for letting us know. We wish you all the best.
            </p>
          </CardContent>
        </Card>
      ) : data.status === 'EXPIRED' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Clock className="size-10 text-muted-foreground" />
            <h1 className="mt-4 text-page-title">This offer has expired</h1>
            <p className="mt-1 text-sm text-muted-foreground">Please reach out to your recruiter for a new offer.</p>
          </CardContent>
        </Card>
      ) : data.status !== 'SENT' ? (
        <EmptyState
          as="h1"
          title="This offer is no longer available"
          description="Please contact your recruiter if you have questions."
        />
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="text-page-title">Your offer from {data.companyName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hi {data.candidateName}, here are the details of your offer for the {data.jobTitle} role.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 py-6">
              <Row label="Role" value={data.jobTitle} />
              <Row label="Base salary" value={formatMoney(data.compensation.baseSalary, data.compensation.currency)} />
              {data.compensation.bonus != null && (
                <Row label="Bonus" value={formatMoney(data.compensation.bonus, data.compensation.currency)} />
              )}
              {data.compensation.equity && <Row label="Equity" value={data.compensation.equity} />}
              {data.compensation.employmentType && <Row label="Employment type" value={data.compensation.employmentType} />}
              <Row label="Start date" value={formatDate(data.compensation.startDate)} />
              {data.note && (
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-medium text-muted-foreground">Note from the team</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{data.note}</p>
                </div>
              )}
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                This offer expires on {formatDate(data.expiresAt)}.
              </p>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!showDecline ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" className="flex-1 gap-1.5" onClick={() => respond('ACCEPT')} loading={submitting === 'ACCEPT'} disabled={submitting !== null}>
                <CheckCircle2 className="size-4" /> Accept offer
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDecline(true)}
                disabled={submitting !== null}
              >
                Decline
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="space-y-3 py-5">
                <div className="text-sm font-medium">Let us know why you&apos;re declining (optional)</div>
                <Textarea
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  placeholder="Add a note for the team…"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowDecline(false)} disabled={submitting !== null}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => respond('DECLINE')}
                    loading={submitting === 'DECLINE'}
                    disabled={submitting !== null}
                  >
                    Confirm decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
