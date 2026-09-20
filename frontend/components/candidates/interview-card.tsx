'use client';

import { useState } from 'react';
import { ChevronDown, Mic } from 'lucide-react';
import type { InterviewDto } from '@/lib/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  INVITED: 'Invited',
  STARTED: 'Started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value * 10)}%` }} />
      </div>
    </div>
  );
}

export function InterviewCard({ interviews }: { interviews: InterviewDto[] }) {
  const iv = interviews[0]; // most recent
  const [showTranscript, setShowTranscript] = useState(false);
  const evaln = iv.evaluation;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-4" /> AI Interview
        </CardTitle>
        <Badge variant={iv.status === 'COMPLETED' ? 'default' : 'outline'}>{STATUS_LABEL[iv.status] ?? iv.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {iv.status !== 'COMPLETED' || !evaln ? (
          <p className="text-sm text-muted-foreground">
            {iv.status === 'FAILED'
              ? 'The interview could not be completed.'
              : iv.status === 'COMPLETED'
                ? 'Processing the evaluation…'
                : 'Waiting for the candidate to complete the interview.'}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{evaln.overallScore}</span>
              <span className="text-sm text-muted-foreground">/10 overall</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ScoreBar label="Communication" value={evaln.communicationScore} />
              <ScoreBar label="Technical" value={evaln.technicalScore} />
              <ScoreBar label="Confidence" value={evaln.confidenceScore} />
              <ScoreBar label="Problem solving" value={evaln.problemSolvingScore} />
            </div>
            {evaln.summary && <p className="text-sm text-muted-foreground">{evaln.summary}</p>}
            {evaln.strengths.length > 0 && (
              <div>
                <div className="text-xs font-medium text-success">Strengths</div>
                <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                  {evaln.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {evaln.concerns.length > 0 && (
              <div>
                <div className="text-xs font-medium text-destructive">Concerns</div>
                <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                  {evaln.concerns.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {iv.transcript && (
              <div className="border-t border-border pt-3">
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={cn('size-4 transition-transform', showTranscript && 'rotate-180')} />
                  {showTranscript ? 'Hide' : 'Show'} transcript
                </button>
                {showTranscript && (
                  <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">{iv.transcript}</pre>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
